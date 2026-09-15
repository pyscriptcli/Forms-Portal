import { ROLE_DEFINITIONS, UserAccessRecord, DEFAULT_USERS } from "./rbac";

export const DEFAULT_RBAC_LIST_ID = "901412841984";
const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export function getClickUpRbacConfig() {
  const token = process.env.CLICKUP_API_TOKEN || "";
  const listId =
    process.env.RBAC_LIST_ID ||
    process.env.CLICKUP_RBAC_LIST_ID ||
    DEFAULT_RBAC_LIST_ID;

  const isConfigured = Boolean(
    token && token !== "mock" && !token.startsWith("pk_your")
  );

  return { token, listId, isConfigured };
}

/**
 * Builds structured description with human-readable summary + embedded JSON payload for ClickUp
 */
export function buildUserTaskDescription(user: UserAccessRecord): string {
  const roleDef = ROLE_DEFINITIONS[user.role] || ROLE_DEFINITIONS.requestor;
  return `# PRIME Portal RBAC User Record

- **Name**: ${user.name}
- **Email**: ${user.email}
- **Department**: ${user.department}
- **Role**: ${roleDef.name} (\`${user.role}\`)
- **Status**: ${user.status}
- **Last Updated**: ${user.updatedAt || new Date().toISOString()}

### Permissions Matrix
${roleDef.permissions.map((p) => `- ${p}`).join("\n")}

---
### System Storage Payload (DO NOT DELETE)
\`\`\`json
${JSON.stringify(user, null, 2)}
\`\`\`
`;
}

/**
 * Parses ClickUp task into UserAccessRecord
 */
export function parseClickUpTaskToUser(task: any): UserAccessRecord | null {
  if (!task || !task.name) return null;

  const desc = task.markdown_description || task.description || "";

  // 1. Try parsing embedded JSON metadata block
  const jsonMatch = desc.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed.email && parsed.role) {
        return {
          id: parsed.id || task.id,
          name: parsed.name || task.name,
          email: parsed.email,
          department: parsed.department || "Operations",
          role: parsed.role,
          status: parsed.status === "inactive" ? "inactive" : "active",
          updatedAt:
            parsed.updatedAt ||
            new Date(Number(task.date_updated || task.date_created) || Date.now()).toISOString(),
          clickUpTaskId: task.id,
        };
      }
    } catch {
      // Fallback to text parsing
    }
  }

  // 2. Fallback: Parse markdown fields
  const emailMatch = desc.match(/\*\*Email\*\*:\s*([^\n\r]+)/i);
  const deptMatch = desc.match(/\*\*Department\*\*:\s*([^\n\r]+)/i);
  const roleMatch = desc.match(/\*\*Role\*\*:[^(]*\(?\`?([a-zA-Z0-9_-]+)\`?\)?/i);
  const statusMatch = desc.match(/\*\*Status\*\*:\s*([^\n\r]+)/i);

  const roleTags = (task.tags || []).map((t: any) => (t.name || "").toLowerCase());
  const taggedRole = roleTags.find((t: string) => t.startsWith("role:"));
  const parsedRole = taggedRole
    ? taggedRole.replace("role:", "")
    : roleMatch
    ? roleMatch[1].trim().toLowerCase()
    : "requestor";

  const validRoles = ["admin", "approver", "finance", "requestor"];
  const finalRole = validRoles.includes(parsedRole) ? parsedRole : "requestor";

  return {
    id: task.id,
    name: task.name.trim(),
    email: emailMatch ? emailMatch[1].trim() : "",
    department: deptMatch ? deptMatch[1].trim() : "Operations",
    role: finalRole as any,
    status:
      statusMatch && statusMatch[1].trim().toLowerCase() === "inactive"
        ? "inactive"
        : "active",
    updatedAt: new Date(Number(task.date_updated || task.date_created) || Date.now()).toISOString(),
    clickUpTaskId: task.id,
  };
}

/**
 * Fetches RBAC users from the ClickUp List DB.
 * If the list is empty and configured, seeds the initial DEFAULT_USERS automatically.
 */
export async function fetchRbacUsersFromClickUp(): Promise<{
  users: UserAccessRecord[];
  source: "clickup" | "fallback";
  listId: string;
}> {
  const { token, listId, isConfigured } = getClickUpRbacConfig();

  if (!isConfigured) {
    return { users: DEFAULT_USERS, source: "fallback", listId };
  }

  try {
    const url = `${CLICKUP_API_BASE}/list/${listId}/task?include_closed=true&subtasks=true&include_markdown_description=true`;
    const res = await fetch(url, {
      headers: { Authorization: token },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`Failed to fetch ClickUp RBAC tasks from list ${listId}: ${await res.text()}`);
      return { users: DEFAULT_USERS, source: "fallback", listId };
    }

    const data = await res.json();
    const tasks = data.tasks || [];

    // If list is brand new and empty, seed it with default users
    if (tasks.length === 0) {
      console.log(`ClickUp list ${listId} is empty. Seeding initial RBAC members...`);
      await seedDefaultRbacUsersToClickUp(token, listId);
      return { users: DEFAULT_USERS, source: "clickup", listId };
    }

    const parsedUsers: UserAccessRecord[] = [];
    for (const task of tasks) {
      const u = parseClickUpTaskToUser(task);
      if (u) parsedUsers.push(u);
    }

    return {
      users: parsedUsers.length > 0 ? parsedUsers : DEFAULT_USERS,
      source: "clickup",
      listId,
    };
  } catch (err) {
    console.error("Error fetching RBAC from ClickUp:", err);
    return { users: DEFAULT_USERS, source: "fallback", listId };
  }
}

/**
 * Seeds default users into ClickUp list
 */
async function seedDefaultRbacUsersToClickUp(token: string, listId: string) {
  for (const user of DEFAULT_USERS) {
    try {
      const body = {
        name: user.name,
        markdown_description: buildUserTaskDescription(user),
        tags: ["rbac", `role:${user.role}`, user.department.toLowerCase()],
        status: user.status === "active" ? "active" : "complete",
      };

      await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("Error seeding user:", user.name, err);
    }
  }
}

/**
 * Persists updated users list to ClickUp List DB
 */
export async function saveRbacUsersToClickUp(users: UserAccessRecord[]): Promise<{
  success: boolean;
  users: UserAccessRecord[];
  savedToClickUp: boolean;
  listId: string;
}> {
  const { token, listId, isConfigured } = getClickUpRbacConfig();

  if (!isConfigured) {
    return {
      success: true,
      users,
      savedToClickUp: false,
      listId,
    };
  }

  try {
    // 1. Fetch current tasks in the list to know existing task IDs
    const currentRes = await fetch(
      `${CLICKUP_API_BASE}/list/${listId}/task?include_closed=true&subtasks=true`,
      {
        headers: { Authorization: token },
        cache: "no-store",
      }
    );

    const existingTasks: any[] = currentRes.ok ? (await currentRes.json()).tasks || [] : [];
    const existingByEmail = new Map<string, any>();
    const existingById = new Map<string, any>();

    for (const t of existingTasks) {
      existingById.set(t.id, t);
      const parsed = parseClickUpTaskToUser(t);
      if (parsed?.email) {
        existingByEmail.set(parsed.email.toLowerCase(), t);
      }
    }

    const updatedUsers: UserAccessRecord[] = [];

    // 2. Create or update each user task
    for (const user of users) {
      const matchedTask =
        (user.clickUpTaskId && existingById.get(user.clickUpTaskId)) ||
        existingByEmail.get(user.email.toLowerCase());

      const payload = {
        name: user.name,
        markdown_description: buildUserTaskDescription(user),
        tags: ["rbac", `role:${user.role}`],
        status: user.status === "active" ? "active" : "complete",
      };

      if (matchedTask) {
        // Update existing task
        await fetch(`${CLICKUP_API_BASE}/task/${matchedTask.id}`, {
          method: "PUT",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        updatedUsers.push({
          ...user,
          clickUpTaskId: matchedTask.id,
        });
      } else {
        // Create new task
        const createRes = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
          method: "POST",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (createRes.ok) {
          const created = await createRes.json();
          updatedUsers.push({
            ...user,
            clickUpTaskId: created.id,
          });
        } else {
          updatedUsers.push(user);
        }
      }
    }

    return {
      success: true,
      users: updatedUsers,
      savedToClickUp: true,
      listId,
    };
  } catch (err) {
    console.error("Error saving users to ClickUp:", err);
    return {
      success: true,
      users,
      savedToClickUp: false,
      listId,
    };
  }
}

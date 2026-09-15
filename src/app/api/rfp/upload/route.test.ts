import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getServerAuthSession: vi.fn(),
  fetchClickUpUser: vi.fn(),
}));
vi.mock("@/lib/clickup", () => ({
  getClickUpTask: vi.fn(),
  uploadAttachmentToTask: vi.fn(),
}));

import { fetchClickUpUser, getServerAuthSession } from "@/lib/auth";
import { getClickUpTask, uploadAttachmentToTask } from "@/lib/clickup";

function request(file: File, taskId = "task-123") {
  const body = new FormData();
  body.append("taskId", taskId);
  body.append("file", file);
  return { headers: new Headers(), formData: async () => body } as any;
}

describe("request attachment endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerAuthSession).mockResolvedValue({ accessToken: "oauth-token", user: null });
    vi.mocked(fetchClickUpUser).mockResolvedValue({ id: "viewer-1", email: "owner@example.com", username: "Owner" });
    vi.mocked(getClickUpTask).mockResolvedValue({
      creator: { id: "viewer-1" },
      markdown_description: "| **Requested By Email** | owner@example.com |",
    });
    vi.mocked(uploadAttachmentToTask).mockResolvedValue({ success: true, id: "attachment-1" });
  });

  it("accepts an OAuth owner's PDF and relays it once to ClickUp", async () => {
    const file = new File(["pdf"], "form.pdf", { type: "application/pdf" });
    const response = await POST(request(file));
    expect(response.status).toBe(200);
    expect(uploadAttachmentToTask).toHaveBeenCalledWith("task-123", file, "form.pdf", "oauth-token");
  });

  it("does not permit uploading to another request", async () => {
    vi.mocked(getClickUpTask).mockResolvedValue({
      creator: { id: "other-user" },
      markdown_description: "| **Requested By Email** | another@example.com |",
    });
    const response = await POST(request(new File(["image"], "quote.png")));
    expect(response.status).toBe(403);
    expect(uploadAttachmentToTask).not.toHaveBeenCalled();
  });

  it("rejects oversized files before ClickUp lookup", async () => {
    const response = await POST(request(new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.pdf")));
    expect(response.status).toBe(413);
    expect(getClickUpTask).not.toHaveBeenCalled();
  });
});

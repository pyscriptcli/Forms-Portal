import { cookies } from "next/headers";

export interface ClickUpUser {
  id: string;
  username: string;
  email: string;
  color?: string;
  profilePicture?: string;
}

export interface AuthSession {
  user: ClickUpUser | null;
  accessToken: string | null;
}

export const SESSION_COOKIE_NAME = "clickup_auth_token";
export const USER_COOKIE_NAME = "clickup_auth_user";

export function getClickUpAuthUrl(redirectUri?: string): string {
  const clientId = process.env.CLICKUP_CLIENT_ID || process.env.NEXT_PUBLIC_CLICKUP_CLIENT_ID || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://forms-portal-prototype.vercel.app";
  const redirect = redirectUri || `${baseUrl}/api/auth/clickup/callback`;

  return `https://app.clickup.com/api?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}`;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.CLICKUP_CLIENT_ID || process.env.NEXT_PUBLIC_CLICKUP_CLIENT_ID || "";
  const clientSecret = process.env.CLICKUP_CLIENT_SECRET || "";

  const res = await fetch("https://api.clickup.com/api/v2/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.err || data.message || "Failed to exchange authorization code");
  }

  return data.access_token;
}

export async function fetchClickUpUser(accessToken: string): Promise<ClickUpUser> {
  const res = await fetch("https://api.clickup.com/api/v2/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await res.json();
  if (!res.ok || !data.user) {
    throw new Error(data.err || data.message || "Failed to fetch user from ClickUp");
  }

  return {
    id: String(data.user.id),
    username: data.user.username || data.user.email,
    email: data.user.email,
    color: data.user.color,
    profilePicture: data.user.profilePicture,
  };
}

export async function getServerAuthSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  const userStr = cookieStore.get(USER_COOKIE_NAME)?.value || null;

  let user: ClickUpUser | null = null;
  if (userStr) {
    try {
      user = JSON.parse(decodeURIComponent(userStr));
    } catch {
      user = null;
    }
  }

  return {
    user,
    accessToken: token,
  };
}

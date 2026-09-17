import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, USER_COOKIE_NAME, getServerAuthSession } from "@/lib/auth";
import { resolveUserAccess } from "@/lib/rbacServer";

export async function GET() {
  const session = await getServerAuthSession();
  const access = await resolveUserAccess(session.user);
  return NextResponse.json({
    ...session,
    user: session.user ? { ...session.user, role: access.role, permissions: access.permissions } : null,
  });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "logout" || action === "signout") {
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const response = NextResponse.redirect(`${protocol}://${host}/auth/signin`);

    response.cookies.delete(SESSION_COOKIE_NAME);
    response.cookies.delete(USER_COOKIE_NAME);
    return response;
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(USER_COOKIE_NAME);
  return response;
}

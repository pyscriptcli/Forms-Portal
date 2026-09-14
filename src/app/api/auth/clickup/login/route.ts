import { NextRequest, NextResponse } from "next/server";
import { getClickUpAuthUrl } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const redirectUri = `${protocol}://${host}/api/auth/clickup/callback`;

  const authUrl = getClickUpAuthUrl(redirectUri);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("clickup_callback_url", callbackUrl, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: "lax",
  });

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  fetchClickUpUser,
  SESSION_COOKIE_NAME,
  USER_COOKIE_NAME,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const defaultBase = `${protocol}://${host}`;

  const savedCallback = req.cookies.get("clickup_callback_url")?.value || "/";

  if (error || !code) {
    console.error("ClickUp OAuth error or missing code:", error);
    return NextResponse.redirect(`${defaultBase}/auth/signin?error=${encodeURIComponent(error || "Access denied")}`);
  }

  try {
    const accessToken = await exchangeCodeForToken(code);
    const user = await fetchClickUpUser(accessToken);

    const redirectResponse = NextResponse.redirect(`${defaultBase}${savedCallback}`);

    // Set secure HTTP cookies
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    redirectResponse.cookies.set(SESSION_COOKIE_NAME, accessToken, cookieOptions);
    redirectResponse.cookies.set(USER_COOKIE_NAME, encodeURIComponent(JSON.stringify(user)), {
      ...cookieOptions,
      httpOnly: false, // Accessible client-side for immediate session display
    });
    redirectResponse.cookies.delete("clickup_callback_url");

    return redirectResponse;
  } catch (err: any) {
    console.error("Failed to complete ClickUp OAuth:", err);
    return NextResponse.redirect(`${defaultBase}/auth/signin?error=${encodeURIComponent(err.message || "Authentication failed")}`);
  }
}

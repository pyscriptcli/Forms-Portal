import { NextRequest, NextResponse } from "next/server";
import { readPortalSettingsFromSupabase } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const role = new URL(req.url).searchParams.get("role");
  if (role !== "requestor" && role !== "approver") return NextResponse.json({ error: "Invalid demo role" }, { status: 400 });
  const settings = await readPortalSettingsFromSupabase();
  if (settings.demoModeEnabled !== true) return NextResponse.json({ error: "Demo mode is disabled" }, { status: 401 });
  return NextResponse.json({ enabled: true, role });
}

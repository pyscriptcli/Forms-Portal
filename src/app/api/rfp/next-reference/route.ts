import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getClickUpConfig, readNextRfpReferenceFromClickUp } from "@/lib/clickup";
import { readFormDestinationFromSupabase } from "@/lib/supabaseAdmin";

export const maxDuration = 60;

export async function GET() {
  try {
    const { accessToken } = await getServerAuthSession();
    if (!accessToken) return NextResponse.json({ success: false, message: "Sign in with ClickUp to get the next RFP number." }, { status: 401 });
    const destination = await readFormDestinationFromSupabase("rfp");
    if (!destination?.enabled || !destination.listId) throw new Error("No enabled ClickUp RFP destination List is configured.");
    const serverConfig = getClickUpConfig("rfp", undefined, destination.listId);
    if (!serverConfig.isConfigured) throw new Error("The server-side ClickUp API token is not configured for the RFP List.");
    const now = new Date();
    const month = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    const preview = await readNextRfpReferenceFromClickUp(month, serverConfig.token, destination.listId);
    return NextResponse.json({ success: true, ...preview, source: "clickup" });
  } catch (error: any) {
    console.error("Error reading next RFP reference:", error);
    return NextResponse.json({ success: false, message: error.message || "Could not read the next RFP number from ClickUp." }, { status: 500 });
  }
}

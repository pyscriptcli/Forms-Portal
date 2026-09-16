import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { readNextRfpReference } from "@/lib/supabaseAdmin";

export const maxDuration = 60;

export async function GET() {
  try {
    const { accessToken } = await getServerAuthSession();
    if (!accessToken) return NextResponse.json({ success: false, message: "Sign in with ClickUp to get the next RFP number." }, { status: 401 });
    const now = new Date();
    const month = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    const preview = await readNextRfpReference(month);
    return NextResponse.json({ success: true, ...preview, source: "finance-ledger" });
  } catch (error: any) {
    console.error("Error reading next RFP reference:", error);
    return NextResponse.json({ success: false, message: error.message || "Could not read the next RFP number from ClickUp." }, { status: 500 });
  }
}

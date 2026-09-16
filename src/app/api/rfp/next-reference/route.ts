import { NextResponse } from "next/server";
import { fetchClickUpUser, getServerAuthSession } from "@/lib/auth";
import { getListTasks } from "@/lib/clickup";
import { readFormDestinationFromSupabase } from "@/lib/supabaseAdmin";
import { formatRfpReference, highestRfpSequence } from "@/lib/rfpNaming";

export const maxDuration = 60;

export async function GET() {
  try {
    const { accessToken } = await getServerAuthSession();
    if (!accessToken) return NextResponse.json({ success: false, message: "Sign in with ClickUp to get the next RFP number." }, { status: 401 });
    await fetchClickUpUser(accessToken);
    const destination = await readFormDestinationFromSupabase("rfp");
    if (!destination?.enabled || !destination.listId) {
      throw new Error("No enabled ClickUp RFP destination List is configured.");
    }
    const tasks = await getListTasks(true, "rfp", accessToken, destination.listId);
    const taskText = tasks.flatMap((task) => [
      String(task?.name || ""),
      String(task?.description || ""),
      String(task?.markdown_description || ""),
    ]);
    const nextSequence = highestRfpSequence(taskText) + 1;
    if (nextSequence > 9999) throw new Error("Finance RFP sequence limit reached at 9999.");
    const now = new Date();
    const month = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    return NextResponse.json({ success: true, reference: formatRfpReference(month, nextSequence), lastSequence: nextSequence - 1, source: "clickup" });
  } catch (error: any) {
    console.error("Error reading next RFP reference:", error);
    return NextResponse.json({ success: false, message: error.message || "Could not read the next RFP number from ClickUp." }, { status: 500 });
  }
}

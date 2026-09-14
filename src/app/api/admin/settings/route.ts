import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ADMIN_TOKEN } from "@/lib/adminSettings";

const FLAGS_PATH = path.join(process.cwd(), "src", "lib", "featureFlags.json");

async function readFlags() {
  try {
    const raw = await fs.readFile(FLAGS_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return { portalGuideEnabled: true, rfpAutofillEnabled: true };
  }
}

async function writeFlags(flags: object) {
  await fs.writeFile(FLAGS_PATH, JSON.stringify(flags, null, 2), "utf8");
}

export async function GET() {
  const flags = await readFlags();
  return NextResponse.json(flags);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await readFlags();
  const updated = {
    ...current,
    ...(typeof body.portalGuideEnabled === "boolean"
      ? { portalGuideEnabled: body.portalGuideEnabled }
      : {}),
    ...(typeof body.rfpAutofillEnabled === "boolean"
      ? { rfpAutofillEnabled: body.rfpAutofillEnabled }
      : {}),
  };

  await writeFlags(updated);
  return NextResponse.json({ success: true, flags: updated });
}

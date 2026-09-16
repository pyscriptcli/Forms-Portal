import { NextRequest, NextResponse } from "next/server";
import { getClickUpConfig, getListCustomFields, createClickUpWebhook } from "@/lib/clickup";
import { resolveFieldIdMapping, validateFieldMapping } from "@/lib/clickupFields";
import { ADMIN_TOKEN } from "@/lib/adminSettings";
import { promises as fs } from "fs";
import path from "path";

const FLAGS_PATH = path.join(process.cwd(), "src", "lib", "featureFlags.json");

export async function GET(req: NextRequest) {
  try {
    const { token, listId, isConfigured } = getClickUpConfig("rfp");
    if (!isConfigured) {
      return NextResponse.json(
        { success: false, message: "ClickUp token or RFP list ID not configured in environment." },
        { status: 400 }
      );
    }

    const availableFields = await getListCustomFields(listId, token);
    const mapping = resolveFieldIdMapping(availableFields);
    const validation = validateFieldMapping(mapping);

    return NextResponse.json({
      success: true,
      listId,
      availableFields,
      mapping,
      validation,
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/clickup-fields:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body.action || "discover_and_save";

    const { token, listId, isConfigured } = getClickUpConfig("rfp");
    if (!isConfigured) {
      return NextResponse.json(
        { success: false, message: "ClickUp token or RFP list ID not configured." },
        { status: 400 }
      );
    }

    if (action === "create_webhook") {
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
      const webhookEndpoint = `${appUrl}/api/clickup/webhook`;

      const webhookResult = await createClickUpWebhook(listId, webhookEndpoint, token);
      return NextResponse.json({
        success: true,
        message: "ClickUp webhook registered successfully for taskStatusUpdated.",
        endpoint: webhookEndpoint,
        webhookId: webhookResult.id,
        secret: webhookResult.secret,
      });
    }

    // Default: discover fields and save to settings
    const availableFields = await getListCustomFields(listId, token);
    const mapping = resolveFieldIdMapping(availableFields);
    const validation = validateFieldMapping(mapping);

    // Persist to featureFlags.json
    try {
      const raw = await fs.readFile(FLAGS_PATH, "utf8");
      const flags = JSON.parse(raw);
      flags.clickupFieldMapping = {
        ...(flags.clickupFieldMapping || {}),
        ...mapping,
      };
      await fs.writeFile(FLAGS_PATH, JSON.stringify(flags, null, 2), "utf8");
    } catch {
      // Ignore if read-only
    }

    return NextResponse.json({
      success: true,
      message: `Discovered and saved ${validation.mappedCount} of ${validation.totalExpected} contract fields.`,
      mapping,
      validation,
    });
  } catch (err: any) {
    console.error("Error in POST /api/admin/clickup-fields:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

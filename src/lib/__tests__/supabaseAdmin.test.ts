import { afterEach, describe, expect, it, vi } from "vitest";
import { saveFormDestinationsToSupabase } from "../supabaseAdmin";

describe("saveFormDestinationsToSupabase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("upserts every destination row instead of patching only existing rows", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "service-role-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await saveFormDestinationsToSupabase({
      rfp: { listId: "rfp-list", workspaceId: "workspace", label: "PRIME RFP", enabled: true },
      rfb: { listId: "rfb-list", workspaceId: "workspace", label: "PRIME RFB", enabled: true },
    } as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.supabase.co/rest/v1/forms-portal-form_destinations?on_conflict=form_type");
    expect(options.method).toBe("POST");
    expect((options.headers as Record<string, string>).Prefer).toContain("resolution=merge-duplicates");
    expect(JSON.parse(String(options.body))).toEqual(expect.arrayContaining([
      expect.objectContaining({ form_type: "rfb", clickup_list_id: "rfb-list" }),
    ]));
  });
});

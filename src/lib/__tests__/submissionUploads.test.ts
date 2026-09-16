import { describe, expect, it } from "vitest";
import { assertSubmissionPayloadSize, getSubmissionPayloadSize, MAX_SUBMISSION_PAYLOAD_BYTES } from "@/lib/submissionUploads";

describe("submission payload limit", () => {
  it("counts form data and every file toward one 4 MB limit", () => {
    const files = [new File(["pdf"], "form.pdf"), new File(["quote"], "quote.pdf")];
    expect(getSubmissionPayloadSize("data", files)).toBe(4 + 3 + 5);
    expect(() => assertSubmissionPayloadSize("data", files)).not.toThrow();
  });

  it("rejects a combined payload above 4 MB", () => {
    const file = new File([new Uint8Array(MAX_SUBMISSION_PAYLOAD_BYTES)], "form.pdf");
    expect(() => assertSubmissionPayloadSize("x", [file])).toThrow("complete submission exceeds the 4 MB limit");
  });
});

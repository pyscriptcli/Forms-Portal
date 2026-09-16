# RFP workflow and naming implementation plan

## Authority and scope

This plan is the single source of truth for the RFP workflow and naming change. Where existing code, configuration, tests, or older handoff notes disagree, implement this plan and update those artifacts. Do not preserve old behavior just because it exists in code.

The change applies to RFP and GW-RFP through Option A (Hybrid) only. Option B (Manual) is out of scope for this implementation. Do not accidentally change PO, PCV, or Travel Budget numbering. Existing requests keep their original names, IDs, and ClickUp statuses; the new rules apply to requests created after rollout.

## Workflow: six portal stages, nine ClickUp statuses

Each milestone is an actual ClickUp status. The portal groups the statuses into six stages; ClickUp's **current status** is the milestone source of truth. There is no separate portal proof, evidence link, completion timestamp, folder link, or filing date requirement for advancing a milestone.

| Portal stage | ClickUp milestone statuses, in order | Next-stage trigger |
| --- | --- | --- |
| Submission | Requestor Form Submission | TL Review and Approval |
| TL Approval | TL Review and Approval | Finance Validation |
| Finance | Finance Validation → Finance Processing → Payment Preparation | CFO/CEO Review and Sign-off |
| Management Approval | CFO/CEO Review and Sign-off | Payment Release |
| Payment | Payment Release → Payment Documentation | Records Filing |
| Completed | Records Filing | Terminal status |

Configure these nine status values plus a revision status in the ClickUp destination List. Define one shared mapping from literal ClickUp status to portal stage and milestone position. Direct status changes in ClickUp are allowed and must appear in the portal on refresh or sync. If someone skips a status, show the current status accurately; do not infer that skipped milestones were completed. Finance or Admin may move a mistaken status backward. Revision pauses progress, keeps the current request, and resumes its appropriate stage after resubmission. Records Filing alone marks the request Completed.

TL controls TL Approval; Finance controls Finance, Payment, Records Filing, and number assignment; CFO/CEO controls Management Approval; Admin can correct any status. Enforce these roles in portal actions and configure equivalent ClickUp permissions for direct edits. Existing approval behavior must be updated to fit the new statuses. Historic tasks use a legacy display mapping without rewriting their ClickUp statuses or implying milestones they never reached.

Current implementation to replace: `src/app/requests/page.tsx` hard-codes a different six-stage display; `src/app/api/rfp/track/route.ts` derives progress from old statuses and five checklist boxes; `src/lib/adminSettings.ts` and `sql/forms_portal_schema.sql` define six configurable statuses. Update the UI, parser, Admin settings, and ClickUp List configuration together.

## Identity, Finance numbering, and intake

The canonical base reference is `RFP-MMYYYY-####`. `MMYYYY` is the month of **initial submission**, not due date. `####` is a four-digit Finance-assigned sequence that continues across months and entities for Option A; it never resets monthly. Finance clicks **Assign number** in the portal and the server atomically allocates the next number. Staff do not type a number. Once allocated, a number is never reused after rejection, cancellation, or downstream failure. A resubmission keeps the same base reference and ClickUp task. Revised submitted files gain `_R1`, `_R2`, and so on. The ClickUp task title keeps its base reference.

Persist a durable server-side intake and number register containing submission path, base reference, entity, payee, submission month, sequence, revision count, and ClickUp task ID. Allocation and task creation must be idempotent: retrying a failed ClickUp operation resumes the same intake/number and does not create duplicate tasks or attachments. Four digits permit at most 9999 numbers. At the ceiling, fail closed and require an explicit format change; never wrap, reset, or reuse a sequence.

**Option A:** requestor form submission creates a durable provisional intake and shows **Pending Finance number** in the portal. This is a portal intake state, not a ClickUp milestone. Finance assigns the number at intake, before TL review. The portal then generates the named RFP PDF, creates the final named ClickUp task, attaches separately named documents, and sets Requestor Form Submission. The requestor can see the intake while it awaits numbering.


Remove the browser `localStorage` seven-digit allocator in `src/app/form/page.tsx` and stop trusting `rfpCodeSuffix` from the client in `src/app/api/rfp/submit/route.ts`. The RFP sheet, PDF, submission modal, ClickUp description, tracker, and search must read the server-side reference. Leave legacy `RFP-0000001`-style requests unchanged and searchable through historical aliases.

## Naming conventions

Use one naming service for ClickUp titles, PDF generation/download, upload relay, scans, Finance outputs, and printable/manual guidance for Zoho and filing. The title is `[RFP-MMYYYY-####] ENTITY – Payee – Short Purpose`. Entity codes are `PRIME`, `GW`, `EDUCO`, and `PIM`. Purpose is at most six words. Urgency uses the ClickUp priority field or form checkbox, never `URGENT` in the title. Preserve the readable payee in the task title; use PascalCase without spaces or special characters in filename payee tokens. Underscores separate filename segments; hyphens occur only inside the RFP reference. The title's bracketed reference and every related file prefix match exactly.

| Artifact | Required format | Example |
| --- | --- | --- |
| ClickUp task | `[RFP-MMYYYY-####] ENTITY – Payee – Short Purpose` | `[RFP-092026-0142] GW – Meralco – August electricity billing` |
| Submitted PDF / scan | `RFP-MMYYYY-####_DOCTYPE_Payee[_Rn].pdf` | `RFP-092026-0142_INV_Meralco.pdf` |
| Repeated document type | `RFP-MMYYYY-####_DOCTYPE1_Payee.pdf`, then `DOCTYPE2` | `RFP-092026-0144_INV1_ABCSuppliesInc.pdf` |
| Finance output | `RFP-MMYYYY-####_DOCTYPE_Payee_YYYYMMDD.pdf` | `RFP-092026-0142_POP_Meralco_20260920.pdf` |
| Approved RFP PDF | `RFP-MMYYYY-####_RFP_Payee[_Rn]_FINAL.pdf` | `RFP-092026-0143_RFP_JuanDelaCruz_R1_FINAL.pdf` |
| Filing folder | `/Finance/MM/YYYY/RFP-MMYYYY-####_Payee` | `/Finance/09/2026/RFP-092026-0142_Meralco` |

Document codes: `RFP`, `INV`, `SOA`, `CON`, `PO`, `CE`, `LIQ`, `TS`, `APV`, `CV`, `POP`, `SUP`, `CSF`, `PF`, `RFB`. The uploader selects the type for each document. Multiple invoices remain separate PDFs, numbered `INV1`, `INV2`, etc. `_Rn` applies to revised submitted files only; `_FINAL` applies only to the approved RFP PDF, after any revision suffix. Supporting documents keep their original or revision suffix. Finance output suffixes use `YYYYMMDD`, based on the date of issuance or release. Human-visible dates use `MM-DD-YY`; compact reference, output suffix, and folder components follow their explicit formats above.

Submitted documents must be separate, legible PDFs, not one merged file containing unlike document types. Convert PNG/JPG uploads and scans to individual PDFs; reject DOC/DOCX with an actionable message. Validate forbidden filename characters and generate the canonical name rather than forwarding the source name. Update `src/components/SupportingDocuments.tsx`, PDF generation/download, direct upload, staged large-file upload, retry upload, and scan intake together; current routes forward original filenames and the submit route uses a different generated RFP PDF name.

For Finance outputs, Zoho entries, and manually scanned files, provide generated names and a printable/downloadable checklist for future operational use. Manual submission intake, direct Zoho integration, and enforcement outside the portal are out of scope.

## Implementation order

1. Add durable provisional intake records and the global, Finance-only atomic sequence allocator for Option A. Make intake, allocation, ClickUp task creation, and attachment retries idempotent. Preserve legacy requests unchanged.
2. Add shared workflow/status mapping and naming modules. Verify ID formatting, sequence concurrency/non-reuse, revision reuse, filename sanitization, date formats, skipped statuses, and backward corrections.
3. Configure nine milestone statuses plus revision in ClickUp; update Admin mappings, task creation/revision, approval behavior, and role permissions in portal and ClickUp.
4. Build the Option A pending-number and Finance assignment flow. Update RFP sheet/PDF, submission modal, tracker, search, and request detail UI to use canonical identity and status mapping.
5. Update document-type selection, PNG/JPG-to-PDF conversion, DOC/DOCX rejection, separate-file handling, naming, revision suffixes, and retry behavior. Add Finance-output naming and manual Zoho/filing guidance.
6. Roll out against test ClickUp/Supabase records, verify Option A end-to-end, then migrate production configuration. Check historic requests, rejection/resubmission, multiple invoices, direct ClickUp status changes, Finance output dates, and completion at Records Filing.

## Expected output after implementation

The finished deliverable is a working RFP flow in the Forms Portal and its configured ClickUp List, not only a redesigned timeline or a naming guide. A user should be able to complete the following journey without inventing an ID, renaming portal-uploaded files by hand, or losing a request after a retry:

1. An Option A requestor submits an RFP and sees a durable **Pending Finance number** intake in the portal. Finance sees that intake in an assignment queue and clicks **Assign number**. The request receives a permanent reference such as `RFP-092026-0142`; the portal creates one ClickUp task named like `[RFP-092026-0142] GW – Meralco – August electricity billing`, attaches the separately named PDFs, and shows the request in the tracker.
2. The request tracker shows only **Submission → TL Approval → Finance → Management Approval → Payment → Completed**. Within the active stage it shows the current ClickUp milestone status. Finance's three milestones and Payment's two milestones are visible within their grouped stages. A direct ClickUp status edit changes what the portal shows on refresh; selecting **Records Filing** marks the request Completed.
3. A revision stays on the same ClickUp task and base reference. The next submitted version receives `_R1`, then `_R2`; the approved RFP PDF alone receives `_FINAL`. A mistaken status can be corrected backward by Finance or Admin. Neither a revision nor a retry consumes another sequence number.
4. The form and upload flow produce separate, legible, correctly named PDFs by document type. PNG/JPG is converted to an individual PDF; DOC/DOCX is rejected with a clear message. Multiple invoices become `INV1`, `INV2`, etc. Staff receive generated names and a checklist for Finance outputs, Zoho entries, manual scans, and the filing folder.

The implementation deliverables are the Option A portal screens and API behavior, the durable number register, the status-to-stage mapping, the ClickUp List status/permission configuration, naming and PDF/upload handling, historic-request display mapping, and an operational checklist for Finance and Zoho/manual work. The final handoff should include the ClickUp/Supabase configuration changes required in the target environment and results from end-to-end verification of Option A, retries, revisions, and direct ClickUp status edits.

The expected boundary is explicit: Zoho and manual filing names are supplied by the portal, but staff apply them outside the portal. The portal does not require separate milestone evidence, a filing date, or a folder link to mark completion. Existing requests retain their original task names and statuses.

## Acceptance criteria

- The tracker shows exactly six named stages and reads the current ClickUp milestone status, including direct ClickUp edits. Records Filing is the only Completed status.
- Option A submission survives as Pending Finance number until assignment and then enters the ClickUp-backed tracker.
- Finance allocates a durable, four-digit global sequence; rejection and retries never reuse it. Resubmission retains the base reference and increments file revision.
- ClickUp titles, PDFs, scans, Finance outputs, generated Zoho names, and folders follow the canonical formats.
- Submitted documents are separate, legible PDFs with selected type codes and counters. PNG/JPG converts to PDF; DOC/DOCX is rejected clearly.
- Existing requests remain searchable, with names and ClickUp statuses unchanged and no false milestone completion.

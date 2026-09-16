# RFP approval workflow

## Purpose

Run Option A requests from requestor submission through records filing using one ClickUp task, one global Finance-assigned reference, and six portal stages grouped around nine ClickUp milestone statuses. Option B manual intake is out of scope.

## Trigger

A requestor submits an RFP through the Forms Portal. The submission creates a durable provisional intake with status `Pending Finance number` until Finance assigns the next sequence.

## Source of truth

After numbering and ClickUp task creation, the current ClickUp status is the milestone source of truth. The portal groups ClickUp statuses into six stages and displays the current status after refresh. Direct ClickUp status edits are allowed. No separate milestone proof or portal evidence is required.

## Milestones

1. `REQUESTOR FORM SUBMISSION` — Submission
2. `TL REVIEW AND APPROVAL` — TL Approval
3. `FINANCE VALIDATION` — Finance
4. `FINANCE PROCESSING` — Finance
5. `PAYMENT PREPARATION` — Finance
6. `CFO/CEO SIGN-OFF` — Management Approval
7. `PAYMENT RELEASE` — Payment
8. `PAYMENT DOCUMENTATION` — Payment
9. `RECORDS FILING` — Completed

`REVISION REQUESTED` is a non-progress status. It pauses the current milestone and returns to the appropriate stage after resubmission. Finance or Admin may correct a status backward. Records Filing is the only terminal Completed status.

## Numbering

Finance assigns a continuous, global four-digit sequence at intake across months, entities, and Option A requests. The reference is `RFP-MMYYYY-####`, using the initial submission month. The server allocates numbers atomically and never reuses them. A retry reuses the same allocation; a resubmission keeps the base reference and increments file suffix `_R1`, `_R2`, etc.

## Output

The portal creates one ClickUp task named `[RFP-MMYYYY-####] ENTITY – Payee – Short Purpose`, separately named PDF attachments, a tracker entry, and a generated naming checklist for Finance outputs, Zoho entries, scans, and filing.

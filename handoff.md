# HANDOFF GUIDE FOR CODEX (Forms-Portal)

> **ATTENTION CODEX**: Read this file first before touching any code. This document contains the complete architectural blueprint, current state, database configuration, critical constraints, and immediate next steps for the **PRIME Philippines Forms Portal**.

---

## 1. Project Overview & Tech Stack

- **Application**: PRIME Philippines Official Forms Portal & Request Tracker
- **Organization**: Property Interactive Marketing Enterprise Realty Corp. (PRIME Philippines)
- **Framework**: Next.js 16.3.4 (App Router, Turbopack, React 19, TypeScript)
- **Styling**: Tailwind CSS v4 + PRIME Corporate Design Tokens (`globals.css`)
- **Test Runner**: Vitest (`npm test` — **102/102 tests passing**)
- **Build Engine**: `next build` (`npm run build` — **Zero errors**)
- **Deployment**: Vercel Serverless

---

## 2. Core Integrations & IDs

### ClickUp Integration (Single Source of Truth)
ClickUp acts as the primary task management system, request record repository, workflow engine, and prototype database.
- **Base API**: `https://api.clickup.com/api/v2`
- **ClickUp API Token**: Stored in `CLICKUP_API_TOKEN` (Vercel environment variable).
- **ClickUp Webhook Secret**: Stored in `CLICKUP_WEBHOOK_SECRET` for HMAC-SHA256 signature verification.

### Key ClickUp List IDs
| Purpose | List ID | URL / Details |
|---|---|---|
| **RFP Submissions** | `901420772915` | Destination list for PRIME & GW RFP requests. Stores submitted RFPs with PDF + preview JPEG attachments and custom fields. |
| **RBAC Prototype DB** | `901412841984` | [ClickUp List 901412841984](https://app.clickup.com/9014981136/v/li/901412841984). Target list used as database for User Roles & Access. |
| **PO Submissions** | `PO_LIST_ID` | Future Purchase Order form submissions. |
| **PCV Submissions** | `PCV_LIST_ID` | Future Petty Cash Voucher form submissions. |

### AI Document Extraction (RFP Auto-Fill)
- **Cascade Strategy**:
  1. `DEEPSEEK_API` / `DEEPSEEK_API_KEY`: Primary LLM for quotation parsing (`src/app/api/rfp/extract/route.ts`).
  2. Local OCR / PDF-to-Image parser (`src/lib/pdfToImage.ts`).
  3. `GEMINI_API_KEY`: Google Gemini Vision fallback.

---

## 3. Current Implementation Status

### Form: PRIME RFP (Request for Payment)
- **Branding**: Official PRIME Philippines branding (`/prime-blue-logo.png`, `PROPERTY INTERACTIVE MARKETING ENTERPRISE REALTY CORP.`, Navy `#003366`, Ice Blue `#e6ecfe`). All legacy "GreatWork / GW" references have been purged from the PRIME RFP.
- **Typography**: Strictly locked to **Times New Roman** (`"Times New Roman", Times, Georgia, serif`) via `.rfp-sheet` in [`src/app/globals.css`](src/app/globals.css) and [`src/components/RfpSheet.tsx`](src/components/RfpSheet.tsx) to match the official scanned corporate paper template.
- **Sequencing**: Server-assigned continuous global reference formatted as `RFP-MMYYYY-####`; Finance sequence ledger is authoritative.
- **Date Inputs**: All 9 date fields use [`PrimeDatePicker.tsx`](src/components/PrimeDatePicker.tsx) which strictly standardizes outputs to `MM/DD/YYYY`.
- **Submission Time**: Defaults automatically to the user's current local time (e.g. `10:14 AM`) on form load, and remains editable by the requestor.
- **Dynamic Resizing**: Form fields and textareas use [`AutoResizeTextarea.tsx`](src/components/AutoResizeTextarea.tsx) to dynamically expand with content.
- **Itemized Table**: Calculates unit prices, quantities, and totals automatically. Supports dynamic row addition and deletion.
- **Dual Electronic Signatures**:
  - **Requestor Signature**: Interactive canvas signature pad (draw) or image file upload with real-time sheet preview.
  - **TL Signature over Printed Name**: Text input for printed name + signature pad (draw/upload) with real-time sheet preview.

### ClickUp Custom Fields Contract (22 Canonical Fields)
Implemented in [`src/lib/clickupFields.ts`](src/lib/clickupFields.ts):
1. **9 Core Metadata**: `RFP ID`, `RFP Entity`, `RFP Department`, `RFP Amount`, `RFP Purpose`, `RFP Requestor Name`, `RFP Requestor Email`, `RFP Approver Name`, `RFP Approver Email`.
2. **9 Milestone Timestamps**: `RFP TS - Requestor Form Submission`, `RFP TS - TL Review and Approval`, `RFP TS - Finance Validation`, `RFP TS - Finance Processing`, `RFP TS - Payment Preparation`, `RFP TS - CFO/CEO Sign-Off`, `RFP TS - Payment Release`, `RFP TS - Payment Documentation`, `RFP TS - Records Filing`.
3. **4 Audit & Idempotency**: `RFP Revision Reason`, `RFP Revision Requested By`, `RFP Last Status Event ID`, `RFP Process History`.

### Milestone Timestamps & Status Webhook
- **Webhook Endpoint**: [`src/app/api/clickup/webhook/route.ts`](src/app/api/clickup/webhook/route.ts)
- Signed with HMAC-SHA256 verification (`x-signature` header vs `CLICKUP_WEBHOOK_SECRET`).
- Listens for `taskStatusUpdated` events and extracts the authoritative event timestamp (`history_items[0].date`).
- Records the event timestamp into the matching milestone Date custom field via ClickUp REST API.
- Idempotency guard via `RFP Last Status Event ID` to prevent duplicate writes.
- Appends human-readable event audit logs to `RFP Process History`.
- **Never uses task-wide `date_updated` as milestone timestamp.**

### Redesigned Request Details Panel ([`src/app/requests/page.tsx`](src/app/requests/page.tsx))
- **Header**: Total amount is placed inline with the request title; removed legacy `RFP ID unavailable · RFP` metadata line.
- **Details Row**: Compact 4-column layout:
  - Department
  - Requestor (with email)
  - Approver (with email)
  - Purpose (2-line clamp with tooltip)
- **Milestone Timeline**:
  - Completed milestones: Blue circular check icon with exact localized timestamp (`Sep 16, 2026, 3:43 PM`, `en-PH` / `Asia/Manila`).
  - Active milestone: Gold ring indicator with `In progress` or event timestamp.
  - Unreached milestones: Slate circle with `Pending`.
  - Missing timestamp fallback: `Timestamp unavailable`.
- Internal ClickUp URLs, raw task tokens, and field IDs are strictly scrubbed from client responses.

### Admin Custom Fields Contract Panel ([`src/app/admin/page.tsx`](src/app/admin/page.tsx))
- Under the **Workflow** tab:
  - **Discover & Map Fields** button: Scans the destination ClickUp list, matches the 22 contract fields, and saves the field IDs to settings.
  - **Register Status Webhook** button: Provisions the ClickUp webhook for real-time milestone timestamps.
  - Synchronization Status Banner: Displays live mapped count (`21 / 22` or `22 / 22`) and completeness badges.
  - Categorized Field Table: Lists all 22 fields across Metadata, Milestone Timestamps, and Audit groups with their ClickUp field IDs and statuses.

### RBAC Prototype (ClickUp-backed)
- **Interface**: Located at `/admin` ([`src/app/admin/page.tsx`](src/app/admin/page.tsx)).
- **Database Engine**: RBAC is persisted through the local server-side store and is modeled for SQL in [`sql/forms_portal_schema.sql`](sql/forms_portal_schema.sql), table `forms-portal-RBAC`.
- **Structure**: Each user is represented as a ClickUp task containing a human-readable markdown profile and a structured JSON metadata block for lossless two-way sync.

### Document & PDF Capture Engine
- **Engine**: [`src/lib/pdfGenerator.ts`](src/lib/pdfGenerator.ts) captures `#rfp-printable-sheet` using `html-to-image` and `jsPDF`.
- **Optimization**: Captures use optimized JPEG compression (`quality: 0.92` for PDF, `0.85` for preview image).
- **Payload Ceiling Fix**: Payload was reduced from ~6 MB down to ~350 KB. This completely eliminated the Vercel 4.5 MB serverless limit crash (`Unexpected token 'R', "Request En"... is not valid JSON`).

---

## 4. Architecture & Key Files Map

```
Forms-Portal/
├── src/
│   ├── app/
│   │   ├── admin/             # Admin page, RBAC management, ClickUp contract panel
│   │   ├── api/
│   │   │   ├── admin/clickup-fields/ # Discovery & webhook registration endpoint
│   │   │   ├── admin/rbac/    # RBAC CRUD API (reads/writes to ClickUp List 901412841984)
│   │   │   ├── admin/settings/# Admin configurations & toggles
│   │   │   ├── clickup/webhook/ # HMAC status webhook for milestone timestamp recording
│   │   │   ├── rfp/approve/   # Team Leader endorsement -> sets approver fields & status
│   │   │   ├── rfp/extract/   # Quotation OCR / AI auto-fill parser
│   │   │   ├── rfp/submit/    # Multipart form submission -> ClickUp task + attachments
│   │   │   └── rfp/track/     # Search & track submitted requests
│   │   ├── form/              # Main interactive form page (RFP, Auto-Fill Dropzone)
│   │   ├── requests/          # Request tracking & timeline with exact milestone timestamps
│   │   ├── globals.css        # PRIME design tokens, .rfp-sheet Times New Roman rules
│   │   └── layout.tsx         # Root layout with brand typography & AppShell
│   ├── components/
│   │   ├── RfpSheet.tsx       # The printable 1:1 replica of the PRIME RFP document
│   │   ├── PrimeDatePicker.tsx# Unified MM/DD/YYYY date picker with native picker trigger
│   │   ├── AutoResizeTextarea.tsx # Self-adjusting textarea component
│   │   ├── PrimeCheckbox.tsx  # Accessible dark blue branded checkbox
│   │   ├── SignatureModal.tsx # E-Signature canvas modal (draw or upload)
│   │   ├── QuotationDropzone.tsx # Drag & drop invoice parser with HTTP 413 resilience
│   │   └── SupportingDocuments.tsx # File attachments list & validation
│   ├── lib/
│   │   ├── adminSettings.ts   # System flags, workflow statuses, and ClickUp field mapping
│   │   ├── clickup.ts         # Core ClickUp API client (task creation, custom field setter)
│   │   ├── clickupFields.ts   # Canonical 22-field contract, mapping resolver & validator
│   │   ├── rfpTrackerMapping.ts # Centralized task -> TrackedRfp mapper & timestamp formatter
│   │   ├── pdfGenerator.ts    # High-efficiency JPEG-based PDF & preview generator
│   │   └── quotationParser.ts # AI prompt engineering & quotation data extraction
│   └── types/
│       └── rfp.ts             # TypeScript interfaces for all forms, line items, and attachments
```

---

## 5. Critical Engineering Rules (DO NOT BREAK)

1. **ClickUp is the Single Source of Truth**:
   - Supabase is strictly restricted to RBAC and Admin configuration.
   - Do **NOT** store RFP records, milestone timestamps, or request statuses in Supabase.
2. **Never Use Task `date_updated` for Milestone Timestamps**:
   - `date_updated` is mutated on every task comment, assignment, or view.
   - Authoritative milestone timestamps come exclusively from custom fields written by the signed status webhook or submission timestamp.
3. **Typography Rule**:
   - The RFP printable sheet (`#rfp-printable-sheet`) must **STRICTLY** use `Times New Roman, Times, Georgia, serif`.
   - **NEVER** apply the Tailwind class `font-serif` to the RFP sheet. In this project's Tailwind config, `font-serif` points to `Cormorant Garamond` (italic, 300 weight), which distorts the corporate document. Use `.rfp-sheet` instead.
4. **Payload Size Limit (Vercel 4.5 MB Ceiling)**:
   - Vercel serverless function request bodies cannot exceed 4.5 MB.
   - Always use JPEG compression (`toJpeg` at `0.85–0.92` quality) in `pdfGenerator.ts`.
5. **Privacy & Security**:
   - Never expose raw ClickUp task objects, ClickUp task URLs (`https://app.clickup.com/t/...`), or internal auth tokens to the client frontend.
6. **Date Format Standard**:
   - All date inputs must accept and output `MM/DD/YYYY`.
   - All displayed milestone timestamps must be formatted in `Asia/Manila` (`en-PH`: `MMM d, yyyy, h:mm a`).
7. **Operating System Commands (Windows PowerShell)**:
   - Shell is PowerShell on Windows. Chaining commands with `&&` will fail. Use `;` instead.

---

## 6. Testing & Verification

Always verify changes before pushing:
```powershell
npm test
npm run build
```
- `npm test` runs all 23 Vitest suites (102 tests).
- `npm run build` runs Next.js Turbopack and TypeScript verification.

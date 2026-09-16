# HANDOFF GUIDE FOR CODEX (Forms-Portal)

> **ATTENTION CODEX**: Read this file first before touching any code. This document contains the complete architectural blueprint, current state, database configuration, critical constraints, and immediate next steps for the **PRIME Philippines Forms Portal**.

---

## 1. Project Overview & Tech Stack

- **Application**: PRIME Philippines Official Forms Portal & Request Tracker
- **Organization**: Property Interactive Marketing Enterprise Realty Corp. (PRIME Philippines)
- **Framework**: Next.js 16.3.4 (App Router, Turbopack, React 19, TypeScript)
- **Styling**: Tailwind CSS v4 + PRIME Corporate Design Tokens (`globals.css`)
- **Test Runner**: Vitest (`npm test` — **60/60 tests passing**)
- **Build Engine**: `next build` (`npm run build` — **Zero errors**)
- **Deployment**: Vercel Serverless

---

## 2. Core Integrations & IDs

### ClickUp Integration
ClickUp acts as the primary task management system and prototype database.
- **Base API**: `https://api.clickup.com/api/v2`
- **ClickUp API Token**: Stored in `CLICKUP_API_TOKEN` (Vercel environment variable).

### Key ClickUp List IDs
| Purpose | List ID | URL / Details |
|---|---|---|
| **RFP Submissions** | `901611126291` | Configured via `RFP_LIST_ID` or fallback `CLICKUP_LIST_ID`. Stores submitted RFPs with PDF + preview JPEG attachments. |
| **RBAC Prototype DB** | `901412841984` | [ClickUp List 901412841984](https://app.clickup.com/9014981136/v/li/901412841984). Target list used as database for User Roles & Access. |
| **PO Submissions** | `PO_LIST_ID` | Future Purchase Order form submissions. |
| **PCV_LIST_ID** | `PCV_LIST_ID` | Future Petty Cash Voucher form submissions. |

### AI Document Extraction (RFP Auto-Fill)
- **Cascade Strategy**:
  1. `DEEPSEEK_API` / `DEEPSEEK_API_KEY`: Primary LLM for quotation parsing (`src/app/api/rfp/extract/route.ts`).
  2. Local OCR / PDF-to-Image parser (`src/lib/pdfToImage.ts`).
  3. `GEMINI_API_KEY`: Google Gemini Vision fallback.

---

## 3. Current Implementation Status

### Form: PRIME RFP (Request for Payment)
- **Branding**: Official PRIME Philippines branding (`/prime-blue-logo.png`, `PROPERTY INTERACTIVE MARKETING ENTERPRISE REALTY CORP.`, Navy `#003366`, Ice Blue `#e6ecfe`). All legacy "GreatWork / GW" references have been purged.
- **Typography**: Strictly locked to **Times New Roman** (`"Times New Roman", Times, Georgia, serif`) via `.rfp-sheet` in [`src/app/globals.css`](src/app/globals.css) and [`src/components/RfpSheet.tsx`](src/components/RfpSheet.tsx) to match the official scanned corporate paper template.
- **Sequencing**: Server-assigned continuous global reference formatted as `RFP-MMYYYY-####`; the requestor cannot edit it.
- **Date Inputs**: All 9 date fields use [`PrimeDatePicker.tsx`](src/components/PrimeDatePicker.tsx) which strictly standardizes outputs to `MM/DD/YYYY`.
- **Submission Time**: Defaults automatically to the user's current local time (e.g. `10:14 AM`) on form load, and remains editable by the requestor.
- **Dynamic Resizing**: Form fields and textareas use [`AutoResizeTextarea.tsx`](src/components/AutoResizeTextarea.tsx) to dynamically expand with content.
- **Itemized Table**: Calculates unit prices, quantities, and totals automatically. Supports dynamic row addition and deletion.
- **Dual Electronic Signatures**:
  - **Requestor Signature**: Interactive canvas signature pad (draw) or image file upload with real-time sheet preview.
  - **TL Signature over Printed Name**: Text input for printed name + signature pad (draw/upload) with real-time sheet preview.

### RBAC Prototype (ClickUp-backed)
- **Interface**: Located at `/admin` ([`src/app/admin/page.tsx`](src/app/admin/page.tsx)).
- **Database Engine**: RBAC is persisted through the local server-side store and is modeled for SQL in [`sql/forms_portal_schema.sql`](sql/forms_portal_schema.sql), table `forms-portal-RBAC`.
- **Structure**: Each user is represented as a ClickUp task containing a human-readable markdown profile and a structured JSON metadata block for lossless two-way sync.
- **Auto-Seeding**: Automatically seeds default users if the ClickUp list is initially empty.
- **Fallback**: Gracefully falls back to local in-memory storage if ClickUp API is unreachable or tokens are unconfigured.

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
│   │   ├── admin/             # Admin page & RBAC management interface
│   │   ├── api/
│   │   │   ├── admin/rbac/    # RBAC CRUD API (reads/writes to ClickUp List 901412841984)
│   │   │   ├── admin/settings/# Admin configurations & toggles
│   │   │   ├── rfp/extract/   # Quotation OCR / AI auto-fill parser
│   │   │   ├── rfp/submit/    # Multipart form submission -> ClickUp task + attachments
│   │   │   └── rfp/track/     # Search & track submitted requests
│   │   ├── form/              # Main interactive form page (RFP, Auto-Fill Dropzone)
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
│   │   ├── clickup.ts         # Core ClickUp API client (task creation, markdown formatting)
│   │   ├── pdfGenerator.ts    # High-efficiency JPEG-based PDF & preview generator
│   │   └── quotationParser.ts # AI prompt engineering & quotation data extraction
│   └── types/
│       └── rfp.ts             # TypeScript interfaces for all forms, line items, and attachments
```

---

## 5. Critical Engineering Rules (DO NOT BREAK)

1. **Typography Rule**:
   - The RFP printable sheet (`#rfp-printable-sheet`) must **STRICTLY** use `Times New Roman, Times, Georgia, serif`.
   - **NEVER** apply the Tailwind class `font-serif` to the RFP sheet. In this project's Tailwind config, `font-serif` points to `Cormorant Garamond` (italic, 300 weight), which distorts the corporate document. Use `.rfp-sheet` instead.
2. **Payload Size Limit (Vercel 4.5 MB Ceiling)**:
   - Vercel serverless function request bodies cannot exceed 4.5 MB.
   - Always use JPEG compression (`toJpeg` at `0.85–0.92` quality) in `pdfGenerator.ts`.
   - Never serialize base64 file payloads into JSON strings inside `formData` when those files are already attached as binary FormData files.
3. **Safe API Response Parsing**:
   - Always read serverless responses with `await res.text()` before `JSON.parse()`. Wrap in `try...catch` and explicitly check for `res.status === 413` or text containing `"Request Entity Too Large"` to provide clean user errors instead of crashing with JSON syntax exceptions.
4. **Date Format Standard**:
   - All date fields must accept and output `MM/DD/YYYY`.
5. **Sequencing Prefix**:
   - RFP sequence uses the SSOT format `RFP-MMYYYY-####`; Finance allocation is authoritative.
6. **Operating System Commands (Windows PowerShell)**:
   - Shell is PowerShell on Windows. Chaining commands with `&&` will fail. Use `;` instead.

---

## 6. Pending Work & Next Steps

1. **New Forms Addition**:
   - The user previously cleared all legacy test templates (Purchase Order, Petty Cash Voucher) to focus on the PRIME RFP.
   - When the user provides the new form templates/scans, replicate them following the exact pattern established in `RfpSheet.tsx` (Times New Roman, dynamic textareas, `PrimeDatePicker`, dual signatures, and ClickUp task generation).
2. **Testing & Verification**:
   - Always verify changes with `npm test` (Vitest) and `npm run build` before pushing to `origin/main`.

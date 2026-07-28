# Automatic Quotation Management System — Development Instructions

> Read this file fully before writing any code. This is the functional specification (the "what
> and why"). Coding rules and conventions (the "how") live in `AGENTS.md` at the project root —
> read that too before starting.

---

## 1. Project Overview

A web application for creating service quotations (maintenance/contracting business — client
example: McDonald's outlets across Saudi Arabia, serviced by multiple "Stores"). The app:

1. Manages a list of **Stores** (service outlets) in Supabase.
2. Provides a **Quotation Entry form** with a **real-time preview panel** beside it, styled to
   match the company's existing Excel quotation template.
3. Reads/writes an existing **Excel workbook stored on OneDrive** ("Web app.xlsx") via
   **Microsoft Graph API** — this is the single external system of record the client already
   uses daily.
4. Generates a **PDF** of the quotation on demand, shows it in the app, allows download, and
   simultaneously logs a summary row into the workbook's `summry` tab.
5. Provides a separate **Transfer** action that pushes the quotation into the `financial` tab
   (the OPEX/CAPEX-style ledger), after the quotation itself has been created.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) + Tailwind CSS |
| Backend | Node.js + Express |
| App database | **Supabase (Postgres)** — stores, quotations, quotation_items, users |
| External workbook | **Microsoft Excel Online file on OneDrive**, accessed via **Microsoft Graph API** |
| Auth (Graph) | OAuth2 delegated flow (Authorization Code or Device Code) — required because the
OneDrive account is a **personal Microsoft account**, which does not support app-only
(client-credentials) Graph access for personal files. A real user sign-in/consent is required at
least once; the resulting refresh token is then stored server-side and auto-renewed. |
| Auth (App) | Supabase Auth (email/password), single admin user to start |
| PDF generation | Microsoft Graph's built-in **convert-to-PDF** endpoint (renders the Excel
`Quatation` tab directly as PDF — no separate PDF library needed) |
| Hosting | **[ASSUMPTION]** Vercel/Netlify (frontend) + a small Node server (Render/Railway) for
the backend, since it must run a persistent OAuth token refresh + Graph API calls. Confirm if a
specific host is required. |

---

## 3. UI/UX Guidelines

- Clean, professional, **white background**, one accent color (suggested `#1B4F8C`, matching the
  BMS brand blue).
- **Center-aligned layout**: main content constrained to a centered max-width container (e.g.
  `max-w-6xl mx-auto`), not stretched edge-to-edge on wide screens.
- Quotation Entry page: **two-column layout**, left = form, right = sticky live preview panel.
- Buttons, clearly labeled and visually distinct by purpose:
  - `+ Add Line` — adds a table row
  - `Generate PDF` — creates the PDF + logs to Summary
  - `Transfer to Financial` — pushes data to the financial ledger (separate, enabled only after
    the quotation has been saved/PDF generated)
- Simple sans-serif font (Inter), generous spacing, subtle borders/shadows — this is a business
  tool, not a marketing page.
- Every screen must clearly indicate background actions in progress (e.g. "Generating PDF…",
  "Summary created ✓", "Transferred to Financial ✓") since these depend on external API calls
  that take a moment.

---

## 4. The Excel Workbook — Structure & Exact Cell Mapping

File: **`Web app.xlsx`**, stored on OneDrive (personal account), 3 tabs:

### 4.1 Tab: `Quatation` (the working quotation template)

| Field | Cell |
|---|---|
| Date | `H9` |
| Job # | `H10` |
| QTN # | `H11` |
| Unit | `H12` |
| Branch | `H13` |
| Branch ID (BRN) | `H14` |
| Ms. | `B15` |
| Mr. | `B16` |
| Region | `C17` |
| Subject | `B18` |
| Intro line 1 (free text, admin types each time) | `A21` |
| Intro line 2 (free text, admin types each time) | `A22` |

**Line-item table** (starts row 26):

| Column | Field |
|---|---|
| A | S.No |
| B | Description |
| F | Qty |
| G | Unit Price |
| H | Total Price (= Qty × Unit Price) |

- First item row: **row 26**
- Max **12 item rows**: `26` through `37`
- **Row 38 = TOTAL row**, grand total value in **`H38`**
- **[CONFIRM]**: implemented on the assumption that rows 26–37 are line items and row 38 is the
  TOTAL row (12 items + 1 total = the "max 13 lines" you described). If instead item rows go all
  the way to row 38 and TOTAL is on a separate row 39, tell the agent to shift the range by one —
  do not guess further, ask the user to re-confirm by opening the sheet and checking directly.
- Static payment-terms text below the table already exists in the file — **do not overwrite that
  area**; the "+ Add Line" logic must insert rows above row 38 (pushing the TOTAL row and terms
  text down) rather than appending below the table.
- **Print Area is not set yet** — this must be configured (either manually in Excel, or via Graph
  API `definedNames`/`PageSetup`) before PDF export will look correct (i.e., only header + table +
  terms, no blank sheet space). Flag this to the user as a required one-time setup step; don't
  block development on it, but PDF output must be reviewed against it once set.

### 4.2 Tab: `summry` (Summary Log — append-only)

Header row (row 1): `A: SNO | B: QUOTATION REF | C: OUTLET NAME | D: AMOUNT | E: SCOPE OF WORK | F: JOB STATUS | G: HD NO | H: APPROVAL`

Data starts **row 2**, one new row appended per quotation:

| Column | Value on creation |
|---|---|
| SNO | auto row number |
| QUOTATION REF | QTN # |
| OUTLET NAME | Store Name + Store No. |
| AMOUNT | Grand Total (`H38` from Quatation tab) |
| SCOPE OF WORK | all line-item descriptions, each wrapped in parentheses |
| JOB STATUS | default `NOT DONE` |
| HD NO | left blank (manual, filled later) |
| APPROVAL | default `AWAITED` |

> Once a row exists, the app must never overwrite `JOB STATUS`, `HD NO`, or `APPROVAL` again —
> those are edited manually afterward.

### 4.3 Tab: `financial` (OPEX/CAPEX ledger — append-only)

Header row (row 1): `A: Specialist | B: Approval Status | C: QTN/NO | D: Store No. | E: Inv/Type | F: Job Report | G: Product Description | H: Region | I: QTY | J: Unit | K: Before Approval | L: After Approval`

Data starts **row 2**, one new row appended when **Transfer** is clicked:

| Column | Value on creation |
|---|---|
| Specialist | Store's contact ("Mr./Ms.") |
| Approval Status | default `Pending` |
| QTN/NO | QTN # |
| Store No. | Store No. |
| Inv/Type | `OPEX` if Grand Total < 2000, else `CAPEX` |
| Job Report | Job # |
| Product Description | same concatenated descriptions as Scope of Work |
| Region | Region |
| QTY | **[CONFIRM]** — implement as count of line items by default |
| Unit | left blank unless provided |
| Before Approval | Grand Total |
| After Approval | left blank (manual, filled only if price is renegotiated) |

> Same rule: never overwrite `Approval Status` or `After Approval` after row creation.

---

## 5. Feature Flow

### 5.1 Quotation Entry
1. User selects **Store No.** from a dropdown (populated from Supabase `stores` table) →
   Store Name, Branch, Branch ID, Mr./Ms., Region auto-fill (read-only).
2. User fills Date, Job #, QTN #, Unit, Subject, Intro line 1/2, and line items.
3. Live preview panel updates on every keystroke (debounced ~400ms before any external write).
4. **Save** writes the quotation to Supabase (source of truth) — this does *not* yet touch Excel.

### 5.2 Generate PDF
1. User clicks **Generate PDF**.
2. Backend writes all current field values into the `Quatation` tab via Graph API (exact cells
   from Section 4.1).
3. Backend calls Graph API's Excel-to-PDF conversion on that tab/range.
4. PDF is returned to the frontend — shown inline + downloadable.
5. Backend appends the corresponding row to the `summry` tab (Section 4.2).
6. Frontend shows a confirmation: "PDF generated ✓ · Summary logged ✓".

### 5.3 Transfer to Financial
1. Only enabled **after** a PDF has been generated for that quotation.
2. On click, backend appends the corresponding row to the `financial` tab (Section 4.3),
   applying the OPEX/CAPEX threshold rule.
3. Frontend confirms: "Transferred to Financial ✓".

---

## 6. Store Management Page (separate page, full CRUD)

Supabase table `stores`:

| Field | Notes |
|---|---|
| `store_no` | manual text entry, unique (e.g. `1830120`) |
| `store_name` | e.g. "Duwadmi" |
| `contact_name` | the Mr./Ms. field |
| `branch` | |
| `branch_id` | the "BRN" number |
| `region` | e.g. "North Region" |
| `client_name` | **[ASSUMPTION]** for future multi-client support |

---

## 7. Microsoft Graph API — Setup Status & Remaining Steps

**Already done by the user:**
- Azure App Registration created, account type: "Any Entra ID Tenant + Personal Microsoft
  accounts"
- `Application (client) ID`, `Directory (tenant) ID`, and `Client Secret` generated
- API permissions added: `Files.ReadWrite`, `Files.ReadWrite.All` (Delegated)

**Still required before Graph integration can be built:**
1. **Add a Redirect URI** on the App Registration (currently blank) — go to
   **Authentication → + Add a platform → Web**, and add:
   `http://localhost:3000/api/auth/callback` (adjust to match whatever the backend's actual auth
   callback route ends up being).
2. **One-time interactive consent**: because this is a personal Microsoft account, someone must
   sign in through a browser once (OAuth Authorization Code or Device Code flow) to grant the app
   access and produce the first **refresh token**. The agent should build a small one-time
   `/connect-onedrive` admin route for this — after that, the backend auto-refreshes the token
   with no further manual login needed (as long as `offline_access` scope was granted, which is
   included by default).
3. **File discovery**: don't hard-code a file path. On first run, the backend should call
   Graph's `/me/drive/root/search(q='Web app.xlsx')` to find the file's `driveItem` id, then cache
   that id (e.g. in an `.env` or a small config table) so future calls go straight to
   `/me/drive/items/{id}/workbook/...`.
4. **Print Area** on the `Quatation` tab (see Section 4.1) — set once the user is ready.

---

## 8. Supabase & Migration Policy

- All schema changes must go through versioned SQL files in `supabase/migrations/`.
- **The agent must never apply a migration silently.** Every new/changed migration must be:
  1. Written to `supabase/migrations/000X_description.sql`
  2. Shown to the user in full
  3. Only applied (via `supabase db push` or the SQL editor) after explicit user approval
- See `supabase/migrations/0001_init.sql` (already provided) for the initial schema.

---

## 9. Development Steps

1. Scaffold frontend (Vite+React+Tailwind, center-aligned layout) and backend (Express).
2. Apply `0001_init.sql` to Supabase (after user reviews it) and wire up Store CRUD — build and
   test this first since it has no external dependency.
3. Build Quotation Entry form + live preview, saving to Supabase only (no Excel yet) — test
   totals, add-line behavior, store auto-fill.
4. Implement Graph API auth (Section 7, steps 1–3) and confirm the backend can read/write a test
   cell in the real workbook.
5. Implement `Generate PDF` flow end-to-end (Section 5.2).
6. Implement `Transfer to Financial` flow end-to-end (Section 5.3).
7. Full walkthrough test: create store → create quotation → Generate PDF (check PDF content,
   check `summry` row) → Transfer (check `financial` row, check OPEX/CAPEX classification is
   correct at both sides of the 2000 threshold).
8. UI polish pass.

---

## 10. Open Items to Confirm With Client

1. Whether rows 26–37 (12 items) + row 38 (TOTAL) is correct, or the boundary is off by one —
   verify directly against the sheet before finalizing the range.
2. Exact meaning/desired value for `QTY` in the `financial` tab.
3. QTN # numbering convention, if any (currently manual entry).
4. Store No. — confirmed manual entry; flag if this should change later.
## 11. Upgrade Addendum (read after Sections 1–10 — this adds new features and fixes; nothing above is removed or replaced)

### 11.1 Bug fix required first: PDF generation error
- Users currently get an error when clicking "Generate PDF" (Section 5.2 flow). Before building 
  anything new below, the agent must investigate and fix this. Isolate the PDF generation code 
  path only — do not modify unrelated working code while fixing it. Confirm with a real 
  end-to-end test (actual PDF generated successfully) before moving to the next item.

### 11.2 New: Quotation Summary Preview + Copy (on the "New Quotation" page)
- Add a new small panel directly ABOVE the existing Excel-style live preview panel on the New 
  Quotation page.
- Show a single-row table with the exact same columns as the `summry` tab: SNO, QUOTATION REF, 
  OUTLET NAME, AMOUNT, SCOPE OF WORK, JOB STATUS, HD NO, APPROVAL — populated live from the 
  quotation currently being built (values computed exactly as already defined in Section 4.2).
- Include a "Copy" button that reuses the SAME copy-to-clipboard logic already implemented in the 
  existing Summary Worksheet / OneDrive overview screen (the one that copies the exact cell range 
  so it pastes cleanly into Excel/Google Sheets without breaking formatting) — reuse that 
  component/logic, do not reimplement it from scratch.
- This is a manual-copy convenience only. It does NOT replace the existing automatic 
  "Generate PDF → append to summry tab" flow from Section 5.2 — both features coexist.

### 11.3 New: "Records" page (new top-nav item)
Add a new page linked from the top navigation as "Records", with two clearly separated sections:

**Summary Records** — an editable table of all rows currently in the `summry` Excel tab (same 
columns as Section 4.2).

**Financial Records** — an editable table of all rows currently in the `financial` Excel tab 
(same columns as Section 4.3).

Both sections must support, per row:
- **Edit** — inline or modal edit of any field
- **Update** — save the edited row back to the exact corresponding row in the LIVE Excel workbook 
  via Graph API (not just the app's local Supabase copy)
- **Delete** — remove the row from the table and clear/delete the corresponding row in Excel

**Important distinction:** the "never silently overwrite manually-edited columns" rule in 
Sections 4.2/4.3 applies only to the automatic quotation-creation flow. It does NOT apply to this 
Records page — this page is an intentional, explicit editing interface, so writes here are 
expected and desired.

Reuse the existing "inspect before writing" safety pattern (the read-only cell-check step already 
built elsewhere in the app) as a model for validating these writes before sending them to the 
Graph API, so the sheet can't get corrupted.

### 11.4 General stability requirement
- Before marking 11.1–11.3 complete, do a full review pass over the affected code (PDF generation, 
  summary preview, Records CRUD) and add proper error handling so any failure (Graph API timeout, 
  bad cell value, etc.) shows a clear error message in the UI instead of crashing the app.
- Do not refactor or touch any other currently-working feature while doing this — scope strictly 
  to this section.

  ## 12. Second Upgrade Addendum — Simplification & Performance Fix
(read after Section 11 — this REMOVES some of Section 11's scope and fixes performance; 
Sections 1–10 remain fully unchanged)

### 12.1 REMOVE: "Records" page entirely (undo Section 11.3)
- Remove the "Records" top-nav item and its page completely (both the Summary Records and 
  Financial Records editable tables, and all their edit/update/delete-to-Excel logic).
- Also remove any "Financial" section that was added to the Overview/OneDrive page as a 
  counterpart to the existing "Summary Worksheet" section — only the Summary Worksheet 
  read-only copy panel (Section 12.3 below) should remain on that page.
- Reason: this manual-editing surface is not needed. The `financial` tab continues to work 
  exactly as originally specified in Section 4.3 — written to automatically (append-only) when 
  "Transfer to Financial" is clicked — with no separate UI for editing existing rows.

### 12.2 FIX: New Quotation page's Summary Preview panel is broken
- The current "Summary Preview — Copy-ready summry row" panel on the New Quotation page shows a 
  hardcoded/static empty table (placeholder cells, "0.00", no real data) — remove this entire 
  panel/component from the New Quotation page.
- Replace it with:
  1. While "Generate PDF" is processing, show a simple loading indicator (e.g. "Generating 
     summary…") — no table, no preview.
  2. Once Generate PDF completes successfully (PDF created + row appended to the `summry` tab, 
     per Section 5.2), show a single **"Copy"** button — no visible preview table needed.
  3. Clicking Copy must copy the actual real data of the row that was just written to the 
     `summry` tab (not placeholder values), using the exact same copy-to-clipboard logic/component 
     already built for the "Summary Worksheet — Select and copy workbook cells" panel on the 
     Overview page (Section 12.3) — reuse that logic directly, do not reimplement a second copy 
     mechanism.
- **Critical rule:** this Copy button is a read/copy convenience only. It must never append, 
  create, or write an additional new row to the `summry` tab. The only place a new `summry` row 
  gets created is the existing automatic step in Section 5.2 (one row per Generate PDF click). 
  The web app must not create a second/duplicate summary row from this panel.

### 12.3 Keep as-is: Overview page's "Summary Worksheet" panel
- The existing read-only panel that shows the full `summry` tab data and lets the user select 
  and copy the whole used range (already working, shown as "Summary Worksheet — Select and copy 
  workbook cells" on the Overview page) stays exactly as it is — no changes needed here, it is 
  the reference implementation that 12.2 should reuse.

### 12.4 PERFORMANCE FIX: Generate PDF is too slow
- Generate PDF currently takes significantly longer than acceptable. Target: bring this down to 
  **10–15 seconds total**, end-to-end (writing cells → formatting → PDF conversion → returning 
  the file).
- Investigate likely causes before optimizing blindly:
  - Are Graph API calls happening sequentially (one at a time, each waiting for the previous) when 
    some could be batched or run in parallel (e.g. writing multiple cell ranges in fewer requests)?
  - Is the per-row border/formatting logic (added in Section 11's formatting fix) looping through 
    all 12 possible rows individually via separate API calls, instead of one batched range 
    update?
  - Is there any unnecessary polling, retry delay, or redundant read-before-write check that could 
    be reduced without compromising the "inspect before writing" safety pattern?
- Fix only genuine bottlenecks — do not remove the safety/inspection checks, just make them more 
  efficient (e.g. batch them) where possible.
- Confirm the fix with a real timed test (start-to-finish Generate PDF click to PDF appearing) 
  and report the actual measured time before marking this done.
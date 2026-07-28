# AGENTS.md — Project Rules for Antigravity

Every agent working in this workspace must read this file before starting any task. This file
defines *how* to work. For *what* to build, read `instructions.md` at the project root first.

## Project Context
- Full-stack app: React (Vite) + Tailwind frontend, Node.js/Express backend, Supabase (Postgres)
  database, Microsoft Graph API integration with an Excel workbook on OneDrive.
- The Excel workbook (`Web app.xlsx`) is a real business document already in daily use by the
  client — treat its existing structure, tab names, and cell positions as fixed constraints, not
  suggestions. Never rename tabs or shift the layout without explicit user approval.

## Non-negotiable rules

1. **Never apply a Supabase migration automatically.** Always write the migration SQL to
   `supabase/migrations/000X_name.sql`, print/show the full SQL to the user, and wait for explicit
   approval before running it against the actual database.
2. **Never hardcode secrets.** All credentials (Supabase keys, Azure client ID/secret, tenant ID)
   must be read from environment variables, listed in `.env.example` with placeholder values only.
3. **Never guess an Excel cell address.** If a field's cell isn't explicitly listed in
   `instructions.md` Section 4, stop and ask the user rather than assuming.
4. **Never overwrite manually-edited columns** in the `summry` or `financial` tabs (Job Status,
   HD No, Approval, Approval Status, After Approval) after their initial row creation.
5. **Confirm before destructive actions** — deleting a store, overwriting a saved quotation, or
   any Graph API write that replaces existing workbook content requires a visible confirmation
   step in the UI, not silent execution.
6. **Explain, then act.** Before implementing any non-trivial feature, briefly state the plan
   (files to be touched, approach) and proceed — don't silently produce large diffs with no
   explanation the user can review.
7. **Test before declaring done.** Every feature must have at minimum a basic automated test
   (calculation logic, threshold logic, API route smoke tests) run and passing before it's marked
   complete. For anything touching the Excel workbook, do a real read/write test against the
   actual file (not a mock) at least once per feature, and report the result.

## Coding standards
- TypeScript preferred where practical; otherwise clear JSDoc types.
- One feature per file/module — no giant catch-all files.
- Tailwind utility classes only for styling; no inline styles.
- All API routes must return consistent JSON error shapes: `{ error: string }`.
- All currency/amount values stored and calculated as numeric (never as formatted strings) until
  the final display layer.

## UI standards
- White background, center-aligned main content (`max-w-6xl mx-auto` or similar), one accent
  color for buttons/headers.
- Every async action (PDF generation, Graph API writes, Supabase writes) must show a loading
  state and a clear success/failure confirmation — never a silent background action.

## Workflow
- After finishing each numbered step in `instructions.md` Section 9 ("Development Steps"), pause
  and summarize what was built and what was tested, before moving to the next step.
- If a client-provided detail turns out to be ambiguous or contradicts what's in
  `instructions.md`, stop and ask — do not silently pick an interpretation for anything involving
  money calculations (totals, OPEX/CAPEX threshold) or the Excel cell mapping.
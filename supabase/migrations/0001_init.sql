-- 0001_init.sql
-- Initial schema for the Automatic Quotation Management System
-- Review this SQL fully before applying it in Supabase (SQL Editor or `supabase db push`).

create extension if not exists "pgcrypto";

-- ============================================================
-- STORES
-- One row per service outlet/branch (e.g. a specific McDonald's branch)
-- ============================================================
create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  store_no text unique not null,       -- e.g. '1830120' (manual entry, matches client's own numbering)
  store_name text not null,            -- e.g. 'Duwadmi'
  contact_name text,                   -- the "Mr./Ms." field
  branch text,
  branch_id text,                      -- the "BRN" number
  region text,                         -- e.g. 'North Region'
  client_name text,                    -- e.g. 'McDonald''s' (kept for future multi-client support)
  created_at timestamptz default now()
);

-- ============================================================
-- QUOTATIONS (header)
-- ============================================================
create table if not exists quotations (
  id uuid primary key default gen_random_uuid(),
  qtn_no text unique not null,
  job_no text,
  quote_date date,
  unit text,
  store_id uuid references stores(id),
  subject text,
  intro_line_1 text,                   -- maps to Excel cell A21
  intro_line_2 text,                   -- maps to Excel cell A22
  grand_total numeric(12,2) default 0, -- maps to Excel cell H38
  status text default 'DRAFT',         -- DRAFT / PDF_GENERATED / TRANSFERRED
  pdf_generated_at timestamptz,
  transferred_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- QUOTATION LINE ITEMS
-- Max 12 rows per quotation (Excel rows 26-37; row 38 = TOTAL)
-- ============================================================
create table if not exists quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid references quotations(id) on delete cascade,
  line_no int not null,                 -- 1 to 12, maps to Excel row 25 + line_no
  description text,
  qty numeric(10,2),
  unit_price numeric(12,2),
  total_price numeric(12,2) generated always as (qty * unit_price) stored
);

-- Helpful index for fetching a quotation's items in order
create index if not exists idx_quotation_items_quotation_id
  on quotation_items(quotation_id, line_no);

-- ============================================================
-- ROW LEVEL SECURITY
-- No public policies are created. The Express backend accesses
-- these tables with the server-only Supabase service-role key.
-- ============================================================
alter table stores enable row level security;
alter table quotations enable row level security;
alter table quotation_items enable row level security;

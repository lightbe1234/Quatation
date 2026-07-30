-- Store admin-managed dropdown values for the New Quotation form.
-- The Express backend accesses this table with the server-only service-role key.

create table if not exists quotation_field_options (
  id uuid primary key default gen_random_uuid(),
  field_key text not null check (
    field_key in (
      'qtn_no',
      'job_no',
      'unit',
      'client_name',
      'region',
      'intro_line_1',
      'intro_line_2'
    )
  ),
  option_value text not null check (
    btrim(option_value) <> ''
    and char_length(btrim(option_value)) <= 500
  ),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_quotation_field_options_key_value
  on quotation_field_options (field_key, lower(btrim(option_value)));

create index if not exists idx_quotation_field_options_key_sort
  on quotation_field_options (field_key, sort_order, lower(option_value));

create or replace function set_quotation_field_options_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists quotation_field_options_set_updated_at
  on quotation_field_options;

create trigger quotation_field_options_set_updated_at
before update on quotation_field_options
for each row
execute function set_quotation_field_options_updated_at();

alter table quotation_field_options enable row level security;

-- Keep direct browser access blocked. Settings CRUD goes through Express.
revoke all on table quotation_field_options from anon, authenticated;

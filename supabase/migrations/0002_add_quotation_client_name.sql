-- Store the manually entered client name on each quotation.
-- This value maps to Excel cell Quatation!B15.
alter table quotations
  add column if not exists client_name text;

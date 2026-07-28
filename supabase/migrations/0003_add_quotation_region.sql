-- Store the manually entered region on each quotation.
alter table quotations
  add column if not exists region text;

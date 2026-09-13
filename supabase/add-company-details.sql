-- Adds UTR, Authentication Code, VAT Number, and Incorporation Date to
-- companies. Safe to run alongside your existing data — this only adds
-- columns, it doesn't touch anything else.
--
-- Run this once in the Supabase SQL Editor.

alter table companies add column if not exists utr text;
alter table companies add column if not exists authentication_code text;
alter table companies add column if not exists vat_number text;
alter table companies add column if not exists incorporation_date date;

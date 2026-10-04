-- TeamSpirits Supabase project: lock-down migration
-- Written 2026-10-04 after a read-only audit of the live database.
--
-- WHAT THIS FIXES
--   1. companies, people, company_directors, company_pscs, company_shareholders
--      had a "select_public" policy, so anyone holding the anon key (it is inside
--      the public JavaScript bundle) could read them, including companies.utr and
--      companies.vat_number. Reads now require a signed-in user. (make-private.sql
--      was evidently never applied to this project.)
--   2. All cis_* tables had "authenticated_full_access" (using true), so ANY signed-in
--      user, e.g. a client login for the register, could read and write CIS data
--      (UTRs, NI numbers, encrypted HMRC Gateway passwords). Access now needs a row
--      in cis_user_roles.
--   3. The cis-logos and cis-statements storage buckets had the same open policies.
--   4. set_contractor_hmrc_password() was SECURITY DEFINER with no authorisation
--      check and was executable by the anon role. It now checks access and is no
--      longer callable by anon.
--   5. is_admin(), admin_add_user_role() and admin_list_user_roles() were callable by
--      anon. Execute is now limited to signed-in users (they already check is_admin()
--      internally).
--
-- WHAT STAYS THE SAME
--   * Signed-in users can still read AND edit the IFK register tables (as designed).
--   * Authentication Code stays admin-only; UTR stays visible to signed-in users.
--   * get_contractor_hmrc_password() is untouched (already service_role only).
--   * Roger keeps full access to everything.
--
-- WHO LOSES ACCESS: any signed-in user with no row in cis_user_roles loses the CIS
-- tables and the CIS storage buckets. At the time of the audit that is only
-- nirmala.e@staywellsolutions.co.uk, who should not have had it.
--
-- To undo, run lockdown-teamspirits-rollback.sql.
-- Check the result with lockdown-teamspirits-verify.sql.

begin;

-- ---------------------------------------------------------------------------
-- Helper: does the signed-in user hold any CIS role?
-- (Any row counts, so a future non-admin CIS role will not be locked out.)
-- ---------------------------------------------------------------------------
create or replace function public.has_cis_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cis_user_roles where user_id = auth.uid()
  );
$$;

revoke all on function public.has_cis_access() from public, anon;
grant execute on function public.has_cis_access() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. IFK register tables: reads need a signed-in user
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'people', 'company_directors', 'company_pscs', 'company_shareholders'
  ] loop
    execute format('drop policy if exists select_public on public.%I', t);
    execute format('drop policy if exists select_authenticated on public.%I', t);
    execute format(
      'create policy select_authenticated on public.%I for select to authenticated using (true)',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2. CIS tables: only users with a CIS role
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'cis_contractors', 'cis_monthly_returns', 'cis_payments', 'cis_return_lines',
    'cis_statements', 'cis_subcontractors', 'cis_verification_requests'
  ] loop
    execute format('drop policy if exists authenticated_full_access on public.%I', t);
    execute format('drop policy if exists cis_access_only on public.%I', t);
    execute format(
      'create policy cis_access_only on public.%I for all to authenticated '
      'using (public.has_cis_access()) with check (public.has_cis_access())',
      t
    );
  end loop;
end $$;
-- cis_user_roles keeps its existing read_own_role policy, so the app can still
-- look up the signed-in user's own role.

-- ---------------------------------------------------------------------------
-- 3. CIS storage buckets (cis-logos, cis-statements)
-- ---------------------------------------------------------------------------
drop policy if exists authenticated_read_cis_logos on storage.objects;
drop policy if exists authenticated_update_cis_logos on storage.objects;
drop policy if exists authenticated_write_cis_logos on storage.objects;
drop policy if exists authenticated_read_cis_statements on storage.objects;
drop policy if exists authenticated_update_cis_statements on storage.objects;
drop policy if exists authenticated_write_cis_statements on storage.objects;
drop policy if exists cis_read_logos on storage.objects;
drop policy if exists cis_insert_logos on storage.objects;
drop policy if exists cis_update_logos on storage.objects;
drop policy if exists cis_read_statements on storage.objects;
drop policy if exists cis_insert_statements on storage.objects;
drop policy if exists cis_update_statements on storage.objects;

create policy cis_read_logos on storage.objects for select to authenticated
  using (bucket_id = 'cis-logos' and public.has_cis_access());
create policy cis_insert_logos on storage.objects for insert to authenticated
  with check (bucket_id = 'cis-logos' and public.has_cis_access());
create policy cis_update_logos on storage.objects for update to authenticated
  using (bucket_id = 'cis-logos' and public.has_cis_access())
  with check (bucket_id = 'cis-logos' and public.has_cis_access());

create policy cis_read_statements on storage.objects for select to authenticated
  using (bucket_id = 'cis-statements' and public.has_cis_access());
create policy cis_insert_statements on storage.objects for insert to authenticated
  with check (bucket_id = 'cis-statements' and public.has_cis_access());
create policy cis_update_statements on storage.objects for update to authenticated
  using (bucket_id = 'cis-statements' and public.has_cis_access())
  with check (bucket_id = 'cis-statements' and public.has_cis_access());

-- ---------------------------------------------------------------------------
-- 4. set_contractor_hmrc_password(): add the missing authorisation check.
--    Body is identical to the live function apart from the guard at the top.
--    service_role is allowed through so any server-side caller keeps working.
-- ---------------------------------------------------------------------------
create or replace function public.set_contractor_hmrc_password(p_contractor_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $function$
declare
  v_key text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.has_cis_access() then
    raise exception 'not authorised';
  end if;

  if p_contractor_id is null then
    raise exception 'contractor id is required';
  end if;

  if p_password is null or p_password = '' then
    update public.cis_contractors
    set hmrc_gateway_password_encrypted = null
    where id = p_contractor_id;
  else
    select decrypted_secret into v_key
    from vault.decrypted_secrets
    where name = 'cis_hmrc_password_key';

    if v_key is null then
      raise exception 'encryption key is not configured (expected a vault secret named cis_hmrc_password_key)';
    end if;

    update public.cis_contractors
    set hmrc_gateway_password_encrypted = encode(
      extensions.pgp_sym_encrypt(p_password, v_key),
      'base64'
    )
    where id = p_contractor_id;
  end if;

  if not found then
    raise exception 'contractor not found';
  end if;
end;
$function$;

revoke all on function public.set_contractor_hmrc_password(uuid, text) from public, anon;
grant execute on function public.set_contractor_hmrc_password(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Admin helper functions: no anonymous execute
-- ---------------------------------------------------------------------------
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

revoke all on function public.admin_add_user_role(text) from public, anon;
grant execute on function public.admin_add_user_role(text) to authenticated, service_role;

revoke all on function public.admin_list_user_roles() from public, anon;
grant execute on function public.admin_list_user_roles() to authenticated, service_role;

commit;

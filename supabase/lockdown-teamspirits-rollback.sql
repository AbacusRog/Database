-- Rollback for lockdown-teamspirits.sql
-- Restores the policies and grants exactly as they were at the 2026-10-04 audit.
-- This RE-OPENS the exposures the lock-down closed (public reads of the IFK
-- register tables, open CIS tables and buckets, anon-callable functions), so only
-- use it if the lock-down breaks something that cannot wait for a proper fix.
-- has_cis_access() is left in place; it is harmless on its own.

begin;

-- IFK register tables: back to public reads
do $$
declare
  t text;
begin
  foreach t in array array[
    'companies', 'people', 'company_directors', 'company_pscs', 'company_shareholders'
  ] loop
    execute format('drop policy if exists select_authenticated on public.%I', t);
    execute format('drop policy if exists select_public on public.%I', t);
    execute format('create policy select_public on public.%I for select using (true)', t);
  end loop;
end $$;

-- CIS tables: back to open for every signed-in user
do $$
declare
  t text;
begin
  foreach t in array array[
    'cis_contractors', 'cis_monthly_returns', 'cis_payments', 'cis_return_lines',
    'cis_statements', 'cis_subcontractors', 'cis_verification_requests'
  ] loop
    execute format('drop policy if exists cis_access_only on public.%I', t);
    execute format('drop policy if exists authenticated_full_access on public.%I', t);
    execute format(
      'create policy authenticated_full_access on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- Storage buckets: back to open for every signed-in user
drop policy if exists cis_read_logos on storage.objects;
drop policy if exists cis_insert_logos on storage.objects;
drop policy if exists cis_update_logos on storage.objects;
drop policy if exists cis_read_statements on storage.objects;
drop policy if exists cis_insert_statements on storage.objects;
drop policy if exists cis_update_statements on storage.objects;

create policy authenticated_read_cis_logos on storage.objects for select to authenticated
  using (bucket_id = 'cis-logos');
create policy authenticated_update_cis_logos on storage.objects for update to authenticated
  using (bucket_id = 'cis-logos');
create policy authenticated_write_cis_logos on storage.objects for insert to authenticated
  with check (bucket_id = 'cis-logos');
create policy authenticated_read_cis_statements on storage.objects for select to authenticated
  using (bucket_id = 'cis-statements');
create policy authenticated_update_cis_statements on storage.objects for update to authenticated
  using (bucket_id = 'cis-statements');
create policy authenticated_write_cis_statements on storage.objects for insert to authenticated
  with check (bucket_id = 'cis-statements');

-- set_contractor_hmrc_password(): original body, no guard, anon can execute again
create or replace function public.set_contractor_hmrc_password(p_contractor_id uuid, p_password text)
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions', 'vault'
as $function$
declare
  v_key text;
begin
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

grant execute on function public.set_contractor_hmrc_password(uuid, text) to public, anon, authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.admin_add_user_role(text) to public, anon, authenticated, service_role;
grant execute on function public.admin_list_user_roles() to public, anon, authenticated, service_role;

commit;

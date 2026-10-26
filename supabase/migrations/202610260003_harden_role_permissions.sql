-- Tighten database authorization to match the documented Admin/Founder model.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists founder_write on public.clients;
drop policy if exists founder_write on public.cameramen;
drop policy if exists founder_write on public.shoots;
drop policy if exists founder_write on public.expenses;
drop policy if exists founder_write on public.settings;
drop policy if exists founder_insert on public.clients;
drop policy if exists founder_update on public.clients;
drop policy if exists founder_insert on public.cameramen;
drop policy if exists founder_update on public.cameramen;
drop policy if exists founder_insert on public.shoots;
drop policy if exists founder_update on public.shoots;
drop policy if exists founder_insert on public.expenses;
drop policy if exists founder_update on public.expenses;
drop policy if exists founder_insert on public.settings;
drop policy if exists founder_update on public.settings;
drop policy if exists admin_operational_settings_update on public.settings;
drop policy if exists settings_operator_update on public.settings;
drop policy if exists requests_resubmit on public.change_requests;

create policy founder_insert on public.clients for insert to authenticated with check (public.is_founder());
create policy founder_update on public.clients for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_insert on public.cameramen for insert to authenticated with check (public.is_founder());
create policy founder_update on public.cameramen for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_insert on public.shoots for insert to authenticated with check (public.is_founder());
create policy founder_update on public.shoots for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_insert on public.expenses for insert to authenticated with check (public.is_founder());
create policy founder_update on public.expenses for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_insert on public.settings for insert to authenticated with check (public.is_founder());
create policy founder_update on public.settings for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy admin_operational_settings_update on public.settings
  for update to authenticated
  using (public.is_admin() and id <> 'businessProfile')
  with check (public.is_admin() and id <> 'businessProfile');

create or replace function public.resubmit_change_request(
  p_cr_id uuid,
  p_proposed_data jsonb,
  p_requested_by uuid,
  p_requested_at timestamptz,
  p_revision_count integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_request public.change_requests%rowtype;
begin
  if not public.is_admin() or p_requested_by <> auth.uid() then
    raise exception 'Not authorized to resubmit this request';
  end if;
  if p_proposed_data is null or jsonb_typeof(p_proposed_data) <> 'object' then
    raise exception 'Request data must be a JSON object';
  end if;

  select * into existing_request
  from public.change_requests
  where id = p_cr_id
  for update;

  if not found
    or existing_request.requested_by <> auth.uid()
    or existing_request.status not in ('pending', 'rejected')
    or p_revision_count <> existing_request.revision_count + 1 then
    raise exception 'Request cannot be resubmitted';
  end if;

  update public.change_requests
  set proposed_data = p_proposed_data,
      status = 'pending',
      requested_at = now(),
      reviewed_by = null,
      reviewed_at = null,
      review_note = '',
      revision_count = p_revision_count
  where id = p_cr_id;
end;
$$;

create or replace function public.delete_change_request(p_cr_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if not public.is_operator() then raise exception 'Not authorized to delete change requests'; end if;
  delete from public.change_requests
  where id = p_cr_id and (requested_by = auth.uid() or public.is_founder());
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Request not found or not authorized'; end if;
end;
$$;

create or replace function public.set_record_deleted(
  p_collection text,
  p_record_id uuid,
  p_deleted boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if not public.is_admin() then
    raise exception 'Only Admin can manage deleted records';
  end if;
  if p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then
    raise exception 'Invalid collection';
  end if;

  execute format(
    'update public.%I set deleted_at = case when $1 then now() else null end, deleted_by = case when $1 then auth.uid() else null end where id = $2',
    p_collection
  ) using p_deleted, p_record_id;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Record not found'; end if;
end;
$$;

create or replace function public.hard_delete_record(p_collection text, p_record_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if not public.is_admin() then
    raise exception 'Only Admin can permanently delete records';
  end if;
  if p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then
    raise exception 'Invalid collection';
  end if;

  if p_collection = 'clients' then
    delete from public.expenses where shoot_id in (select id from public.shoots where client_id = p_record_id);
    delete from public.shoots where client_id = p_record_id;
    delete from public.communication_logs where client_id = p_record_id;
  elsif p_collection = 'shoots' then
    delete from public.expenses where shoot_id = p_record_id;
  end if;

  delete from public.change_requests where target_doc_id = p_record_id;
  execute format('delete from public.%I where id = $1', p_collection) using p_record_id;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Record not found'; end if;
end;
$$;

create or replace function public.update_shoot_operational(p_shoot_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_assignments jsonb;
  proposed_assignments jsonb;
  assignment_index integer;
  affected integer;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if p_changes is null
    or jsonb_typeof(p_changes) <> 'object'
    or jsonb_object_length(p_changes - 'client_paid' - 'client_paid_at' - 'assignments') <> 0
    or p_changes = '{}'::jsonb then
    raise exception 'Only payment status and crew check-in fields can be updated directly';
  end if;
  if p_changes ? 'client_paid' and jsonb_typeof(p_changes -> 'client_paid') <> 'boolean' then
    raise exception 'Client payment status must be a boolean';
  end if;

  if p_changes ? 'assignments' then
    if jsonb_typeof(p_changes -> 'assignments') <> 'array' then
      raise exception 'Assignments must be an array';
    end if;

    select assignments into existing_assignments
    from public.shoots
    where id = p_shoot_id
    for update;
    if not found then raise exception 'Shoot not found'; end if;
    proposed_assignments := p_changes -> 'assignments';

    if jsonb_array_length(existing_assignments) <> jsonb_array_length(proposed_assignments) then
      raise exception 'Operational updates cannot add or remove crew assignments';
    end if;

    for assignment_index in 0..jsonb_array_length(existing_assignments) - 1 loop
      if jsonb_typeof(proposed_assignments -> assignment_index) <> 'object'
        or ((existing_assignments -> assignment_index) - 'paid' - 'paidAt' - 'checkedInAt') is distinct from
          ((proposed_assignments -> assignment_index) - 'paid' - 'paidAt' - 'checkedInAt') then
        raise exception 'Operational updates cannot change crew assignment details or payout rates';
      end if;
    end loop;
  end if;

  update public.shoots
  set client_paid = case when p_changes ? 'client_paid' then (p_changes ->> 'client_paid')::boolean else client_paid end,
      client_paid_at = case when p_changes ? 'client_paid_at' then (p_changes ->> 'client_paid_at')::timestamptz else client_paid_at end,
      assignments = case when p_changes ? 'assignments' then p_changes -> 'assignments' else assignments end
  where id = p_shoot_id;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Shoot not found'; end if;
end;
$$;

revoke all on function public.resubmit_change_request(uuid, jsonb, uuid, timestamptz, integer) from public, anon;
revoke all on function public.delete_change_request(uuid) from public, anon;
revoke all on function public.set_record_deleted(text, uuid, boolean) from public, anon;
revoke all on function public.hard_delete_record(text, uuid) from public, anon;
revoke all on function public.update_shoot_operational(uuid, jsonb) from public, anon;

grant execute on function public.resubmit_change_request(uuid, jsonb, uuid, timestamptz, integer) to authenticated;
grant execute on function public.delete_change_request(uuid) to authenticated;
grant execute on function public.set_record_deleted(text, uuid, boolean) to authenticated;
grant execute on function public.hard_delete_record(text, uuid) to authenticated;
grant execute on function public.update_shoot_operational(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

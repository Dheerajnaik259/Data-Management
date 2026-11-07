alter table public.profiles
  alter column role type text using role::text;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'founder', 'founder_ceo', 'founder_coo', 'social_media_manager'));

drop trigger if exists profiles_operator_limit on public.profiles;
drop function if exists public.enforce_operator_limit();

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_founder()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('founder', 'founder_ceo', 'founder_coo')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.can_submit_collection(p_collection text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'social_media_manager')
      and p_collection in ('clients', 'shoots')
    );
$$;

drop policy if exists business_read on public.clients;
drop policy if exists business_read on public.cameramen;
drop policy if exists business_read on public.shoots;
drop policy if exists business_read on public.expenses;
drop policy if exists business_read on public.settings;
drop policy if exists business_read on public.communication_logs;
create policy business_read on public.clients for select to authenticated using (public.is_operator());
create policy business_read on public.cameramen for select to authenticated using (public.is_operator());
create policy business_read on public.shoots for select to authenticated using (public.is_operator());
create policy business_read on public.expenses for select to authenticated using (public.is_admin() or public.is_founder());
create policy business_read on public.settings
  for select to authenticated
  using (public.is_operator() and (id <> 'businessProfile' or public.is_founder()));
create policy business_read on public.communication_logs for select to authenticated using (public.is_operator());

drop policy if exists requests_write on public.change_requests;
create policy requests_write on public.change_requests
  for insert to authenticated
  with check (
    public.can_submit_collection(target_collection)
    and requested_by = auth.uid()
    and status = 'pending'
  );

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
  if p_requested_by <> auth.uid() then
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
    or not public.can_submit_collection(existing_request.target_collection)
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
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'social_media_manager')
    and (p_changes ? 'client_paid' or p_changes ? 'client_paid_at') then
    raise exception 'Social Media Managers cannot update payment status';
  end if;
  if p_changes ? 'client_paid' and jsonb_typeof(p_changes -> 'client_paid') <> 'boolean' then
    raise exception 'Client payment status must be a boolean';
  end if;
  if p_changes ? 'assignments' then
    if jsonb_typeof(p_changes -> 'assignments') <> 'array' then
      raise exception 'Assignments must be an array';
    end if;
    select assignments into existing_assignments
    from public.shoots where id = p_shoot_id for update;
    if not found then raise exception 'Shoot not found'; end if;
    proposed_assignments := p_changes -> 'assignments';
    if jsonb_array_length(existing_assignments) <> jsonb_array_length(proposed_assignments) then
      raise exception 'Operational updates cannot add or remove crew assignments';
    end if;
    for assignment_index in 0..jsonb_array_length(existing_assignments) - 1 loop
      if jsonb_typeof(proposed_assignments -> assignment_index) <> 'object' then
        raise exception 'Assignments must contain objects';
      end if;
      if exists (select 1 from public.profiles where id = auth.uid() and role = 'social_media_manager') then
        if ((existing_assignments -> assignment_index) - 'checkedInAt') is distinct from
          ((proposed_assignments -> assignment_index) - 'checkedInAt') then
          raise exception 'Social Media Managers can only update crew check-in status';
        end if;
      elsif ((existing_assignments -> assignment_index) - 'paid' - 'paidAt' - 'checkedInAt') is distinct from
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

revoke all on function public.can_submit_collection(text) from public, anon;
grant execute on function public.can_submit_collection(text) to authenticated;

notify pgrst, 'reload schema';

-- Apply this migration only if an earlier version of supabase/schema.sql was already run.
-- New projects can use supabase/schema.sql directly.

alter table public.communication_logs add column if not exists logged_by_name text not null default '';

create or replace function public.enforce_operator_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.profiles) >= 2 then
    raise exception 'Only two SMM Ops operators are allowed';
  end if;
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

drop policy if exists requests_write on public.change_requests;
drop policy if exists notifications_own on public.notifications;
create policy requests_write on public.change_requests for insert to authenticated with check (public.is_admin() and requested_by = auth.uid() and status = 'pending');
create policy requests_resubmit on public.change_requests for update to authenticated using (public.is_admin() and requested_by = auth.uid()) with check (public.is_admin() and requested_by = auth.uid() and status = 'pending');
create policy settings_operator_update on public.settings for update to authenticated using (public.is_operator()) with check (public.is_operator());
create policy notifications_read_own on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated with check (public.is_operator());
create policy notifications_update_own on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create or replace function public.set_record_deleted(p_collection text, p_record_id uuid, p_deleted boolean)
returns void language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  if not public.is_admin() then raise exception 'Only the admin can manage deleted records'; end if;
  if p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then raise exception 'Invalid collection'; end if;
  execute format('update public.%I set deleted_at = case when $1 then now() else null end, deleted_by = case when $1 then auth.uid() else null end where id = $2', p_collection) using p_deleted, p_record_id;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Record not found'; end if;
end;
$$;

create or replace function public.hard_delete_record(p_collection text, p_record_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  if not public.is_admin() then raise exception 'Only the admin can permanently delete records'; end if;
  if p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then raise exception 'Invalid collection'; end if;
  execute format('delete from public.%I where id = $1', p_collection) using p_record_id;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Record not found'; end if;
end;
$$;

create or replace function public.update_shoot_operational(p_shoot_id uuid, p_changes jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if jsonb_object_length(p_changes - 'client_paid' - 'client_paid_at' - 'assignments') <> 0 then raise exception 'Only payment and crew check-in fields can be updated directly'; end if;
  update public.shoots
  set client_paid = case when p_changes ? 'client_paid' then coalesce((p_changes ->> 'client_paid')::boolean, client_paid) else client_paid end,
      client_paid_at = case when p_changes ? 'client_paid_at' then (p_changes ->> 'client_paid_at')::timestamptz else client_paid_at end,
      assignments = case when p_changes ? 'assignments' then p_changes -> 'assignments' else assignments end
  where id = p_shoot_id;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Shoot not found'; end if;
end;
$$;

create or replace function public.assign_invoice_number(p_type text, p_shoot_id uuid, p_assignment_index integer default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  shoot_record public.shoots%rowtype;
  next_value integer;
  document_number text;
  year_value integer := extract(year from current_date);
  assignment jsonb;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  select * into shoot_record from public.shoots where id = p_shoot_id for update;
  if not found then raise exception 'Shoot not found'; end if;
  if p_type = 'client' then
    if not shoot_record.client_paid then raise exception 'Mark the client payment as paid before generating an invoice'; end if;
    if shoot_record.client_invoice_number is not null then return shoot_record.client_invoice_number; end if;
    insert into public.counters(year) values (year_value) on conflict (year) do nothing;
    update public.counters set client_invoice_next = client_invoice_next + 1 where year = year_value returning client_invoice_next - 1 into next_value;
    document_number := format('INV-%s-%s', year_value, lpad(next_value::text, 4, '0'));
    update public.shoots set client_invoice_number = document_number where id = p_shoot_id;
    return document_number;
  end if;
  if p_type = 'payout' then
    if p_assignment_index is null or p_assignment_index < 0 then raise exception 'A valid cameraman assignment is required'; end if;
    assignment := shoot_record.assignments -> p_assignment_index;
    if assignment is null then raise exception 'Cameraman assignment not found'; end if;
    if coalesce((assignment ->> 'paid')::boolean, false) is false then raise exception 'Mark the payout as paid before generating a voucher'; end if;
    if assignment ? 'payoutVoucherNumber' and coalesce(assignment ->> 'payoutVoucherNumber', '') <> '' then return assignment ->> 'payoutVoucherNumber'; end if;
    insert into public.counters(year) values (year_value) on conflict (year) do nothing;
    update public.counters set payout_voucher_next = payout_voucher_next + 1 where year = year_value returning payout_voucher_next - 1 into next_value;
    document_number := format('RCP-%s-%s', year_value, lpad(next_value::text, 4, '0'));
    update public.shoots set assignments = jsonb_set(assignments, array['' || p_assignment_index::text, 'payoutVoucherNumber'], to_jsonb(document_number), true) where id = p_shoot_id;
    return document_number;
  end if;
  raise exception 'Unsupported document type';
end;
$$;

insert into public.settings (id, key, label, editable, options) values
  ('clientStatus', 'clientStatus', 'Client Status', true, '[{"value":"active","order":1,"archived":false},{"value":"inactive","order":2,"archived":false}]'::jsonb),
  ('shootStatus', 'shootStatus', 'Shoot Status', true, '[{"value":"scheduled","order":1,"archived":false},{"value":"done","order":2,"archived":false}]'::jsonb),
  ('deliverableTypes', 'deliverableTypes', 'Deliverable Types', true, '[{"value":"reel","order":1,"archived":false},{"value":"story","order":2,"archived":false},{"value":"photo set","order":3,"archived":false}]'::jsonb),
  ('expenseCategories', 'expenseCategories', 'Expense Categories', true, '[{"value":"travel","order":1,"archived":false},{"value":"equipment","order":2,"archived":false},{"value":"software","order":3,"archived":false},{"value":"other","order":4,"archived":false}]'::jsonb),
  ('businessProfile', 'businessProfile', 'Business Profile', true, '[]'::jsonb),
  ('operationalSettings', 'operationalSettings', 'Operational Defaults', true, '[]'::jsonb)
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.clients; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.cameramen; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.shoots; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.expenses; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.settings; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.communication_logs; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.change_requests; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
  end if;
end;
$$;

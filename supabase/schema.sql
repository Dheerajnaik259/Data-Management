create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'founder');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role public.app_role not null,
  created_at timestamptz not null default now()
);

create function public.enforce_operator_limit()
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

create trigger profiles_operator_limit
before insert on public.profiles
for each row execute function public.enforce_operator_limit();

create table public.clients (
  id uuid primary key default gen_random_uuid(), name text not null, phone text not null default '',
  email text not null default '', notes text not null default '', status text not null default 'active',
  contract_link text not null default '', created_at timestamptz not null default now(),
  deleted_at timestamptz, deleted_by uuid references public.profiles(id)
);

create table public.cameramen (
  id uuid primary key default gen_random_uuid(), name text not null, phone text not null default '',
  rate numeric not null default 0, notes text not null default '', contract_link text not null default '',
  unavailability jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  deleted_at timestamptz, deleted_by uuid references public.profiles(id)
);

create table public.shoots (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
  date date not null, call_time text not null default '', location text not null default '', status text not null,
  client_amount numeric not null default 0, client_paid boolean not null default false, client_paid_at timestamptz,
  client_invoice_number text, assigned_cameraman_ids uuid[] not null default '{}', assignments jsonb not null default '[]'::jsonb,
  deliverables jsonb not null default '[]'::jsonb, client_notified_at timestamptz,
  created_at timestamptz not null default now(), deleted_at timestamptz, deleted_by uuid references public.profiles(id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(), description text not null, amount numeric not null default 0,
  date date not null, shoot_id uuid references public.shoots(id), category text not null,
  created_at timestamptz not null default now(), deleted_at timestamptz, deleted_by uuid references public.profiles(id)
);

create table public.communication_logs (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id) on delete cascade,
  date date not null, note text not null, logged_by uuid references public.profiles(id), created_at timestamptz not null default now()
  , logged_by_name text not null default ''
);

create table public.settings (
  id text primary key, key text not null unique, label text not null, editable boolean not null default true,
  options jsonb not null default '[]'::jsonb
);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(), target_collection text not null,
  target_doc_id uuid, action text not null check (action in ('create', 'edit', 'delete')),
  proposed_data jsonb not null, requested_by uuid not null references public.profiles(id), requested_at timestamptz not null default now(),
  status text not null check (status in ('pending', 'approved', 'rejected')), reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz, review_note text not null default '', revision_count integer not null default 0
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id) on delete cascade,
  type text not null, related_change_request_id uuid references public.change_requests(id) on delete cascade,
  message text not null, read boolean not null default false, created_at timestamptz not null default now()
);

create table public.counters (
  year integer primary key, client_invoice_next integer not null default 1, payout_voucher_next integer not null default 1
);

create index shoots_date_idx on public.shoots(date desc);
create index expenses_date_idx on public.expenses(date desc);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create index change_requests_requested_idx on public.change_requests(requested_at desc);

create function public.is_operator()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid()); $$;

create function public.is_founder()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'founder'); $$;

create function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (public.is_operator());

-- Founders manage operational records directly. Admins read active records and use approvals.
-- Direct admin write restrictions should be enforced by approval RPCs before production cutover.

do $$
declare table_name text;
begin
  foreach table_name in array array['clients','cameramen','shoots','expenses','settings','change_requests','notifications','communication_logs','counters'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

create policy business_read on public.clients for select to authenticated using (public.is_operator());
create policy business_read on public.cameramen for select to authenticated using (public.is_operator());
create policy business_read on public.shoots for select to authenticated using (public.is_operator());
create policy business_read on public.expenses for select to authenticated using (public.is_operator());
create policy business_read on public.settings for select to authenticated using (public.is_operator());
create policy business_read on public.communication_logs for select to authenticated using (public.is_operator());
create policy founder_write on public.clients for all to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_write on public.cameramen for all to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_write on public.shoots for all to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_write on public.expenses for all to authenticated using (public.is_founder()) with check (public.is_founder());
create policy founder_write on public.settings for all to authenticated using (public.is_founder()) with check (public.is_founder());
create policy communication_write on public.communication_logs for insert to authenticated with check (public.is_operator());
create policy requests_read on public.change_requests for select to authenticated using (public.is_operator());
create policy requests_write on public.change_requests for insert to authenticated with check (public.is_admin() and requested_by = auth.uid() and status = 'pending');
create policy requests_review on public.change_requests for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy requests_resubmit on public.change_requests for update to authenticated using (public.is_admin() and requested_by = auth.uid()) with check (public.is_admin() and requested_by = auth.uid() and status = 'pending');
create policy settings_operator_update on public.settings for update to authenticated using (public.is_operator()) with check (public.is_operator());
create policy notifications_read_own on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy notifications_insert on public.notifications for insert to authenticated with check (public.is_operator());
create policy notifications_update_own on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

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
declare affected integer;
begin
  if not public.is_operator() then raise exception 'Only authorized operators can manage deleted records'; end if;
  if p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then raise exception 'Invalid collection'; end if;
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
declare affected integer;
begin
  if not public.is_operator() then raise exception 'Only authorized operators can permanently delete records'; end if;
  if p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then raise exception 'Invalid collection'; end if;

  if p_collection = 'clients' then
    delete from public.expenses where shoot_id in (select id from public.shoots where client_id = p_record_id);
    delete from public.shoots where client_id = p_record_id;
    delete from public.communication_logs where client_id = p_record_id;
  elsif p_collection = 'shoots' then
    delete from public.expenses where shoot_id = p_record_id;
  end if;

  delete from public.change_requests where target_doc_id = p_record_id;
  delete from public.change_requests where target_collection = p_collection and target_doc_id = p_record_id;

  execute format('delete from public.%I where id = $1', p_collection) using p_record_id;
  get diagnostics affected = row_count;
end;
$$;

create or replace function public.update_shoot_operational(p_shoot_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare affected integer;
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  if jsonb_object_length(p_changes - 'client_paid' - 'client_paid_at' - 'assignments') <> 0 then
    raise exception 'Only payment and crew check-in fields can be updated directly';
  end if;
  update public.shoots
  set client_paid = case when p_changes ? 'client_paid' then coalesce((p_changes ->> 'client_paid')::boolean, client_paid) else client_paid end,
      client_paid_at = case when p_changes ? 'client_paid_at' then (p_changes ->> 'client_paid_at')::timestamptz else client_paid_at end,
      assignments = case when p_changes ? 'assignments' then p_changes -> 'assignments' else assignments end
  where id = p_shoot_id;
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'Shoot not found'; end if;
end;
$$;

create or replace function public.assign_invoice_number(
  p_type text,
  p_shoot_id uuid,
  p_assignment_index integer default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
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

insert into storage.buckets (id, name, public) values ('smm-ops-files', 'smm-ops-files', false)
on conflict (id) do nothing;

create policy files_read on storage.objects for select to authenticated using (bucket_id = 'smm-ops-files' and public.is_operator());
create policy files_insert on storage.objects for insert to authenticated with check (bucket_id = 'smm-ops-files' and public.is_operator());
create policy files_delete on storage.objects for delete to authenticated using (bucket_id = 'smm-ops-files' and public.is_founder());

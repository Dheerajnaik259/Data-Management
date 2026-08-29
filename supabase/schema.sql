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
  if (select count(*) from public.profiles) >= 3 then
    raise exception 'Only three SMM Ops operators are allowed';
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
);

create table public.settings (
  id text primary key, key text not null unique, label text not null, editable boolean not null default true,
  options jsonb not null default '[]'::jsonb
);

create table public.change_requests (
  id uuid primary key default gen_random_uuid(), target_collection text not null,
  target_doc_id uuid, action text not null check (action in ('create', 'edit')),
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
create policy requests_write on public.change_requests for insert to authenticated with check (public.is_operator());
create policy requests_review on public.change_requests for update to authenticated using (public.is_founder()) with check (public.is_founder());
create policy notifications_own on public.notifications for all to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

insert into storage.buckets (id, name, public) values ('smm-ops-files', 'smm-ops-files', false)
on conflict (id) do nothing;

create policy files_read on storage.objects for select to authenticated using (bucket_id = 'smm-ops-files' and public.is_operator());
create policy files_insert on storage.objects for insert to authenticated with check (bucket_id = 'smm-ops-files' and public.is_operator());
create policy files_delete on storage.objects for delete to authenticated using (bucket_id = 'smm-ops-files' and public.is_founder());

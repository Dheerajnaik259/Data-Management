begin;

alter function public.is_operator() set search_path = '';
alter function public.is_founder() set search_path = '';
alter function public.is_admin() set search_path = '';
alter function public.can_submit_collection(text) set search_path = '';
alter function public.resubmit_change_request(uuid, jsonb, uuid, timestamptz, integer) set search_path = '';
alter function public.delete_change_request(uuid) set search_path = '';
alter function public.hard_delete_record(text, uuid) set search_path = '';
alter function public.update_shoot_operational(uuid, jsonb) set search_path = '';

revoke insert, update, delete on public.profiles from public, anon, authenticated;

create or replace function public.set_record_deleted(
  p_collection text,
  p_record_id uuid,
  p_deleted boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  if not public.is_admin() then
    raise exception 'Only Admin can manage deleted records' using errcode = '42501';
  end if;
  if p_collection is null or p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then
    raise exception 'Invalid collection';
  end if;

  execute format(
    'update public.%I set deleted_at = case when $1 then pg_catalog.now() else null end, deleted_by = case when $1 then auth.uid() else null end where id = $2',
    p_collection
  ) using p_deleted, p_record_id;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Record not found';
  end if;
end;
$$;

create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  founder_roles constant text[] := array['founder', 'founder_ceo', 'founder_coo'];
begin
  perform pg_catalog.pg_advisory_xact_lock(1718304742);

  if tg_op = 'DELETE' then
    if old.role::text = any(founder_roles)
      and not exists (
        select 1
        from public.profiles p
        where p.id <> old.id
          and p.role::text = any(founder_roles)
      ) then
      raise exception 'The last Founder cannot be removed' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.role::text = any(founder_roles) and not public.is_founder() then
      raise exception 'Only a Founder can create a Founder profile' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.role is distinct from old.role then
    if (new.role::text = any(founder_roles) or old.role::text = any(founder_roles))
      and not public.is_founder() then
      raise exception 'Only a Founder can change Founder roles' using errcode = '42501';
    end if;

    if old.role::text = any(founder_roles)
      and not (new.role::text = any(founder_roles))
      and not exists (
        select 1
        from public.profiles p
        where p.id <> old.id
          and p.role::text = any(founder_roles)
      ) then
      raise exception 'The last Founder cannot be demoted' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role_change on public.profiles;
create trigger profiles_guard_role_change
before insert or update of role or delete on public.profiles
for each row execute function public.guard_profile_role_change();

create or replace function public.hard_delete_record(p_collection text, p_record_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
  record_deleted_at timestamptz;
begin
  if auth.uid() is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'A Founder session with multi-factor authentication is required' using errcode = '42501';
  end if;
  if not public.is_founder() then
    raise exception 'Only a Founder can permanently delete records' using errcode = '42501';
  end if;
  if p_collection is null or p_collection not in ('clients', 'cameramen', 'shoots', 'expenses') then
    raise exception 'Invalid collection';
  end if;

  execute format('select deleted_at from public.%I where id = $1 for update', p_collection)
    into record_deleted_at using p_record_id;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Record not found';
  end if;
  if record_deleted_at is null then
    raise exception 'Only records in the Recycle Bin can be permanently deleted';
  end if;

  if p_collection = 'clients' then
    if exists (
      select 1
      from public.shoots s
      where s.client_id = p_record_id
        and s.deleted_at is null
    ) then
      raise exception 'Delete all related shoots before permanently deleting this client';
    end if;
    if exists (
      select 1
      from public.expenses e
      join public.shoots s on s.id = e.shoot_id
      where s.client_id = p_record_id
        and e.deleted_at is null
    ) then
      raise exception 'Delete all related expenses before permanently deleting this client';
    end if;
    delete from public.expenses e
    using public.shoots s
    where e.shoot_id = s.id and s.client_id = p_record_id;
    delete from public.shoots where client_id = p_record_id;
    delete from public.communication_logs where client_id = p_record_id;
  elsif p_collection = 'shoots' then
    if exists (select 1 from public.expenses where shoot_id = p_record_id and deleted_at is null) then
      raise exception 'Delete related expenses before permanently deleting this shoot';
    end if;
    delete from public.expenses where shoot_id = p_record_id;
  end if;

  delete from public.change_requests
  where target_collection = p_collection and target_doc_id = p_record_id;
  execute format('delete from public.%I where id = $1', p_collection) using p_record_id;
  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Record not found';
  end if;
end;
$$;

revoke all on function public.hard_delete_record(text, uuid) from public, anon;
grant execute on function public.hard_delete_record(text, uuid) to authenticated;

alter table public.change_requests
  add column if not exists requested_by_name text not null default '',
  add column if not exists requested_by_role text not null default '',
  add column if not exists reviewed_by_name text not null default '',
  add column if not exists reviewed_by_role text not null default '';

update public.change_requests cr
set requested_by_name = p.name,
    requested_by_role = p.role::text
from public.profiles p
where p.id = cr.requested_by
  and cr.requested_by_name = '';

update public.change_requests cr
set reviewed_by_name = p.name,
    reviewed_by_role = p.role::text
from public.profiles p
where p.id = cr.reviewed_by
  and cr.reviewed_by_name = '';

create or replace function public.stamp_change_request_people()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select p.name, p.role::text
    into new.requested_by_name, new.requested_by_role
    from public.profiles p
    where p.id = new.requested_by;
  else
    new.requested_by := old.requested_by;
    new.requested_by_name := old.requested_by_name;
    new.requested_by_role := old.requested_by_role;
  end if;

  if new.reviewed_by is null then
    new.reviewed_by_name := '';
    new.reviewed_by_role := '';
  elsif tg_op = 'INSERT' or new.reviewed_by is distinct from old.reviewed_by then
    select p.name, p.role::text
    into new.reviewed_by_name, new.reviewed_by_role
    from public.profiles p
    where p.id = new.reviewed_by;
  else
    new.reviewed_by_name := old.reviewed_by_name;
    new.reviewed_by_role := old.reviewed_by_role;
  end if;
  return new;
end;
$$;

drop trigger if exists change_requests_stamp_people on public.change_requests;
create trigger change_requests_stamp_people
before insert or update on public.change_requests
for each row execute function public.stamp_change_request_people();

revoke update on public.change_requests from public, anon, authenticated;

create or replace function public.review_change_request(
  p_cr_id uuid,
  p_approved boolean,
  p_review_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.change_requests%rowtype;
  reviewer public.profiles%rowtype;
  normalized_data jsonb;
  item record;
  column_name text;
  allowed_columns text[];
  columns_sql text;
  values_sql text;
  updates_sql text;
  affected integer;
  notification_message text;
begin
  if p_approved is null then
    raise exception 'A review decision is required';
  end if;
  if not public.is_founder() then
    raise exception 'Only a Founder can review change requests' using errcode = '42501';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception 'Multi-factor authentication is required to review change requests' using errcode = '42501';
  end if;

  select * into reviewer from public.profiles where id = auth.uid();
  select * into request_row from public.change_requests where id = p_cr_id for update;
  if not found or request_row.status <> 'pending' then
    raise exception 'Request not found or no longer pending';
  end if;

  if p_approved then
    if jsonb_typeof(request_row.proposed_data) <> 'object' then
      raise exception 'Request data must be a JSON object';
    end if;

    case request_row.target_collection
      when 'clients' then
        allowed_columns := array['name', 'phone', 'email', 'notes', 'status', 'contract_link'];
      when 'cameramen' then
        allowed_columns := array['name', 'phone', 'rate', 'notes', 'contract_link', 'unavailability'];
      when 'shoots' then
        allowed_columns := array[
          'client_id', 'date', 'call_time', 'location', 'status', 'client_amount',
          'client_paid', 'client_paid_at', 'assigned_cameraman_ids', 'assignments', 'deliverables'
        ];
      when 'expenses' then
        allowed_columns := array['description', 'amount', 'date', 'shoot_id', 'category'];
      else
        raise exception 'Unsupported request collection';
    end case;

    if request_row.action = 'delete' then
      if request_row.target_doc_id is null then
        raise exception 'A delete request must identify its target record';
      end if;
      execute format(
        'update public.%I set deleted_at = pg_catalog.now(), deleted_by = auth.uid() where id = $1 and deleted_at is null',
        request_row.target_collection
      ) using request_row.target_doc_id;
      get diagnostics affected = row_count;
      if affected = 0 then
        raise exception 'Target record not found or already deleted';
      end if;
    elsif request_row.action in ('create', 'edit') then
      normalized_data := request_row.proposed_data;
      for item in select key, value from jsonb_each(normalized_data) loop
        column_name := case item.key
          when 'clientId' then 'client_id'
          when 'callTime' then 'call_time'
          when 'clientAmount' then 'client_amount'
          when 'clientPaid' then 'client_paid'
          when 'clientPaidAt' then 'client_paid_at'
          when 'assignedCameramanIds' then 'assigned_cameraman_ids'
          when 'contractLink' then 'contract_link'
          when 'shootId' then 'shoot_id'
          else item.key
        end;

        if not (column_name = any(allowed_columns)) then
          raise exception 'Unsupported field in request: %', item.key;
        end if;
        if column_name <> item.key and normalized_data ? column_name then
          raise exception 'Duplicate field in request: %', column_name;
        end if;
        if column_name <> item.key then
          normalized_data := (normalized_data - item.key) || jsonb_build_object(column_name, item.value);
        end if;
      end loop;

      if request_row.action = 'create' then
        if request_row.target_doc_id is not null then
          raise exception 'A create request must not identify an existing record';
        end if;
        if jsonb_object_length(normalized_data) = 0 then
          raise exception 'Request data cannot be empty';
        end if;
        if request_row.target_collection = 'clients' and not (normalized_data ? 'name')
          or request_row.target_collection = 'cameramen' and not (normalized_data ? 'name')
          or request_row.target_collection = 'shoots'
            and not (normalized_data ? 'client_id' and normalized_data ? 'date' and normalized_data ? 'status')
          or request_row.target_collection = 'expenses'
            and not (normalized_data ? 'description' and normalized_data ? 'amount' and normalized_data ? 'date' and normalized_data ? 'category') then
          raise exception 'Request is missing required fields';
        end if;

        select string_agg(format('%I', key), ', ' order by key),
               string_agg(format('(input.row_data).%I', key), ', ' order by key)
        into columns_sql, values_sql
        from jsonb_object_keys(normalized_data) as keys(key);
        execute format(
          'insert into public.%I (%s) select %s from (select jsonb_populate_record(null::public.%I, $1) as row_data) input',
          request_row.target_collection,
          columns_sql,
          values_sql,
          request_row.target_collection
        ) using normalized_data;
      else
        if request_row.target_doc_id is null then
          raise exception 'An edit request must identify its target record';
        end if;
        if jsonb_object_length(normalized_data) = 0 then
          raise exception 'Request data cannot be empty';
        end if;
        select string_agg(format('%I = (input.row_data).%I', key, key), ', ' order by key)
        into updates_sql
        from jsonb_object_keys(normalized_data) as keys(key);
        execute format(
          'update public.%I as target set %s from (select jsonb_populate_record(null::public.%I, $1) as row_data) input where target.id = $2',
          request_row.target_collection,
          updates_sql,
          request_row.target_collection
        ) using normalized_data, request_row.target_doc_id;
        get diagnostics affected = row_count;
        if affected = 0 then
          raise exception 'Target record not found';
        end if;
      end if;
    else
      raise exception 'Unsupported request action';
    end if;
  end if;

  update public.change_requests
  set status = case when p_approved then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = pg_catalog.now(),
      review_note = coalesce(p_review_note, '')
  where id = p_cr_id;

  notification_message := format(
    'Your %s %s was %s by %s (%s).',
    request_row.target_collection,
    request_row.action,
    case when p_approved then 'approved' else 'rejected' end,
    reviewer.name,
    case reviewer.role::text
      when 'founder' then 'Founder'
      when 'founder_ceo' then 'Founder / CEO'
      when 'founder_coo' then 'Founder / COO'
      else reviewer.role::text
    end
  );
  insert into public.notifications (
    recipient_id, type, related_change_request_id, message, read
  ) values (
    request_row.requested_by,
    case when p_approved then 'approved' else 'rejected' end,
    request_row.id,
    notification_message,
    false
  );
end;
$$;

revoke all on function public.review_change_request(uuid, boolean, text) from public, anon;
grant execute on function public.review_change_request(uuid, boolean, text) to authenticated;

drop policy if exists founder_insert on public.settings;
create policy founder_insert on public.settings
  for insert to authenticated
  with check (
    public.is_founder()
    and (id <> 'businessProfile' or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
  );
drop policy if exists founder_update on public.settings;
create policy founder_update on public.settings
  for update to authenticated
  using (
    public.is_founder()
    and (id <> 'businessProfile' or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
  )
  with check (
    public.is_founder()
    and (id <> 'businessProfile' or coalesce(auth.jwt() ->> 'aal', '') = 'aal2')
  );

create or replace function public.assign_invoice_number(
  p_type text,
  p_shoot_id uuid,
  p_assignment_index integer default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  shoot_record public.shoots%rowtype;
  next_value integer;
  document_number text;
  year_value integer := extract(year from current_date);
  assignment jsonb;
begin
  if not public.is_admin() and not public.is_founder() then
    raise exception 'Not authorized to generate financial documents' using errcode = '42501';
  end if;
  select * into shoot_record from public.shoots where id = p_shoot_id for update;
  if not found then raise exception 'Shoot not found'; end if;

  if p_type = 'client' then
    if not shoot_record.client_paid then raise exception 'Mark the client payment as paid before generating an invoice'; end if;
    if shoot_record.client_invoice_number is not null then return shoot_record.client_invoice_number; end if;
    insert into public.counters(year) values (year_value) on conflict (year) do nothing;
    update public.counters
      set client_invoice_next = client_invoice_next + 1
      where year = year_value
      returning client_invoice_next - 1 into next_value;
    document_number := pg_catalog.format('INV-%s-%s', year_value, pg_catalog.lpad(next_value::text, 4, '0'));
    update public.shoots set client_invoice_number = document_number where id = p_shoot_id;
    return document_number;
  end if;

  if p_type = 'payout' then
    if p_assignment_index is null or p_assignment_index < 0 then
      raise exception 'A valid cameraman assignment is required';
    end if;
    assignment := shoot_record.assignments -> p_assignment_index;
    if assignment is null then raise exception 'Cameraman assignment not found'; end if;
    if coalesce((assignment ->> 'paid')::boolean, false) is false then
      raise exception 'Mark the payout as paid before generating a voucher';
    end if;
    if assignment ? 'payoutVoucherNumber'
      and coalesce(assignment ->> 'payoutVoucherNumber', '') <> '' then
      return assignment ->> 'payoutVoucherNumber';
    end if;
    insert into public.counters(year) values (year_value) on conflict (year) do nothing;
    update public.counters
      set payout_voucher_next = payout_voucher_next + 1
      where year = year_value
      returning payout_voucher_next - 1 into next_value;
    document_number := pg_catalog.format('RCP-%s-%s', year_value, pg_catalog.lpad(next_value::text, 4, '0'));
    update public.shoots
      set assignments = pg_catalog.jsonb_set(
        assignments,
        array['' || p_assignment_index::text, 'payoutVoucherNumber'],
        pg_catalog.to_jsonb(document_number),
        true
      )
      where id = p_shoot_id;
    return document_number;
  end if;

  raise exception 'Unsupported document type';
end;
$$;

alter function public.assign_invoice_number(text, uuid, integer) set search_path = '';

revoke all on function public.assign_invoice_number(text, uuid, integer) from public, anon;
grant execute on function public.assign_invoice_number(text, uuid, integer) to authenticated;

create or replace function public.valid_http_link(p_value text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_value is null
    or p_value = ''
    or (p_value = pg_catalog.btrim(p_value) and p_value ~* '^https://[^[:space:]]+$');
$$;

create or replace function public.valid_deliverable_links(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_typeof(p_value) = 'array'
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_value) as elements(value)
      where pg_catalog.jsonb_typeof(elements.value) <> 'object'
        or not public.valid_http_link(elements.value ->> 'fileLink')
    );
$$;

create or replace function public.valid_shoot_assignments(p_value jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.jsonb_typeof(p_value) = 'array'
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_value) as elements(value)
      where pg_catalog.jsonb_typeof(elements.value) <> 'object'
        or coalesce(elements.value ->> 'cameramanId', '') !~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or (
          elements.value ? 'amount'
          and elements.value -> 'amount' <> 'null'::jsonb
          and (
            pg_catalog.jsonb_typeof(elements.value -> 'amount') <> 'number'
            or (elements.value ->> 'amount')::numeric < 0
          )
        )
        or (
          elements.value ? 'paid'
          and pg_catalog.jsonb_typeof(elements.value -> 'paid') <> 'boolean'
        )
        or (
          coalesce(elements.value ->> 'paid', 'false') = 'true'
          and coalesce(nullif(elements.value ->> 'paidAt', ''), '') = ''
        )
    );
$$;

create or replace function public.sync_shoot_assigned_cameramen()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.assigned_cameraman_ids := coalesce(
    array(
      select (elements.value ->> 'cameramanId')::uuid
      from pg_catalog.jsonb_array_elements(coalesce(new.assignments, '[]'::jsonb))
        with ordinality as elements(value, position)
      order by elements.position
    ),
    '{}'::uuid[]
  );
  return new;
end;
$$;

update public.shoots
set assigned_cameraman_ids = array(
  select (elements.value ->> 'cameramanId')::uuid
  from pg_catalog.jsonb_array_elements(assignments) with ordinality as elements(value, position)
  order by elements.position
)
where pg_catalog.jsonb_typeof(assignments) = 'array'
  and pg_catalog.jsonb_array_length(assignments) > 0;

drop trigger if exists shoots_sync_assigned_cameramen on public.shoots;
create trigger shoots_sync_assigned_cameramen
before insert or update of assignments, assigned_cameraman_ids on public.shoots
for each row execute function public.sync_shoot_assigned_cameramen();

alter table public.clients
  add constraint clients_contract_link_https
  check (public.valid_http_link(contract_link)) not valid;
alter table public.cameramen
  add constraint cameramen_contract_link_https
  check (public.valid_http_link(contract_link)) not valid;
alter table public.shoots
  add constraint shoots_deliverable_links_https
  check (public.valid_deliverable_links(deliverables)) not valid;
alter table public.shoots
  add constraint shoots_client_amount_nonnegative
  check (client_amount >= 0) not valid;
alter table public.shoots
  add constraint shoots_paid_requires_timestamp
  check (not client_paid or client_paid_at is not null) not valid;
alter table public.shoots
  add constraint shoots_assignments_valid
  check (public.valid_shoot_assignments(assignments)) not valid;
alter table public.cameramen
  add constraint cameramen_rate_nonnegative
  check (rate >= 0) not valid;
alter table public.expenses
  add constraint expenses_amount_nonnegative
  check (amount >= 0) not valid;

create index if not exists shoots_active_date_idx
  on public.shoots (date) where deleted_at is null;
create index if not exists shoots_client_id_idx
  on public.shoots (client_id);
create index if not exists shoots_assigned_cameramen_gin_idx
  on public.shoots using gin (assigned_cameraman_ids);
create index if not exists expenses_active_date_idx
  on public.expenses (date) where deleted_at is null;
create index if not exists notifications_recipient_read_idx
  on public.notifications (recipient_id, read, created_at desc);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default pg_catalog.now(),
  actor uuid,
  table_name text not null,
  row_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb
);
alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists audit_founder_read on public.audit_log;
create policy audit_founder_read on public.audit_log
  for select to authenticated using (public.is_founder());

create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  row_data jsonb;
begin
  if tg_op <> 'INSERT' then old_row := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then new_row := to_jsonb(new); end if;
  row_data := coalesce(new_row, old_row);
  insert into public.audit_log (actor, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    nullif(row_data ->> 'id', '')::uuid,
    tg_op,
    old_row,
    new_row
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.log_change() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'clients', 'cameramen', 'shoots', 'expenses',
    'change_requests', 'settings', 'notifications', 'communication_logs'
  ] loop
    execute format('drop trigger if exists audit_%I on public.%I', table_name, table_name);
    execute format(
      'create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.log_change()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

do $$
declare
  signature text;
begin
  for signature in
    select p.oid::regprocedure::text
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
  loop
    execute pg_catalog.format('alter function %s set search_path = %L', signature, '');
    execute pg_catalog.format('revoke all on function %s from public, anon', signature);
  end loop;
end;
$$;

grant execute on function public.is_operator() to authenticated;
grant execute on function public.is_founder() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_submit_collection(text) to authenticated;
grant execute on function public.resubmit_change_request(uuid, jsonb, uuid, timestamptz, integer) to authenticated;
grant execute on function public.delete_change_request(uuid) to authenticated;
grant execute on function public.set_record_deleted(text, uuid, boolean) to authenticated;
grant execute on function public.hard_delete_record(text, uuid) to authenticated;
grant execute on function public.update_shoot_operational(uuid, jsonb) to authenticated;
grant execute on function public.assign_invoice_number(text, uuid, integer) to authenticated;
grant execute on function public.review_change_request(uuid, boolean, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'smm-ops-files',
  'smm-ops-files',
  false,
  104857600,
  array['application/pdf', 'image/jpeg', 'image/png', 'video/mp4']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists files_read on storage.objects;
drop policy if exists files_insert on storage.objects;
drop policy if exists files_delete on storage.objects;
create policy files_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'smm-ops-files'
    and public.is_operator()
    and split_part(name, '/', 1) in ('clients', 'cameramen', 'shoots', 'expenses')
    and (
      split_part(name, '/', 1) <> 'expenses'
      or public.is_admin()
      or public.is_founder()
    )
  );
create policy files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'smm-ops-files'
    and public.is_operator()
    and split_part(name, '/', 1) in ('clients', 'cameramen', 'shoots', 'expenses')
    and (
      split_part(name, '/', 1) <> 'expenses'
      or public.is_admin()
      or public.is_founder()
    )
  );
create policy files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'smm-ops-files'
    and public.is_founder()
  );

notify pgrst, 'reload schema';
commit;

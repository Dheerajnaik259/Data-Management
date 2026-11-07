begin;

create or replace function public.prevent_paid_status_reversal()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  assignment_index integer;
  old_assignment jsonb;
  new_assignment jsonb;
begin
  if old.client_paid and (
    not new.client_paid
    or new.client_paid_at is distinct from old.client_paid_at
  ) then
    raise exception 'A confirmed client payment is final and cannot be changed';
  end if;

  if jsonb_array_length(coalesce(old.assignments, '[]'::jsonb)) > 0 then
    for assignment_index in 0..jsonb_array_length(old.assignments) - 1 loop
      old_assignment := old.assignments -> assignment_index;
      if coalesce((old_assignment ->> 'paid')::boolean, false) then
        if jsonb_array_length(coalesce(new.assignments, '[]'::jsonb)) <= assignment_index then
          raise exception 'A confirmed crew payout is final and cannot be removed';
        end if;
        new_assignment := new.assignments -> assignment_index;
        if (new_assignment ->> 'cameramanId') is distinct from (old_assignment ->> 'cameramanId')
          or coalesce((new_assignment ->> 'paid')::boolean, false) is distinct from true
          or (new_assignment ->> 'paidAt') is distinct from (old_assignment ->> 'paidAt') then
          raise exception 'A confirmed crew payout is final and cannot be changed';
        end if;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists shoots_prevent_paid_status_reversal on public.shoots;
create trigger shoots_prevent_paid_status_reversal
before update on public.shoots
for each row execute function public.prevent_paid_status_reversal();

create or replace function public.update_shoot_operational(p_shoot_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  shoot_record public.shoots%rowtype;
  existing_assignments jsonb;
  proposed_assignments jsonb;
  assignment_index integer;
  existing_assignment jsonb;
  proposed_assignment jsonb;
begin
  if not public.is_operator() then
    raise exception 'Not authorized';
  end if;

  if p_changes is null
    or jsonb_typeof(p_changes) <> 'object'
    or jsonb_object_length(p_changes - 'client_paid' - 'client_paid_at' - 'assignments') <> 0
    or p_changes = '{}'::jsonb then
    raise exception 'Only payment status and crew check-in fields can be updated directly';
  end if;

  select * into shoot_record
  from public.shoots
  where id = p_shoot_id
  for update;
  if not found then
    raise exception 'Shoot not found';
  end if;

  if p_changes ? 'client_paid' and jsonb_typeof(p_changes -> 'client_paid') <> 'boolean' then
    raise exception 'Client payment status must be a boolean';
  end if;
  if shoot_record.client_paid
    and p_changes ? 'client_paid'
    and (p_changes ->> 'client_paid')::boolean is false then
    raise exception 'A confirmed client payment is final and cannot be changed';
  end if;
  if not shoot_record.client_paid
    and p_changes ? 'client_paid'
    and (p_changes ->> 'client_paid')::boolean
    and coalesce(nullif(p_changes ->> 'client_paid_at', '')::timestamptz, shoot_record.client_paid_at) is null then
    raise exception 'A paid client payment requires a payment timestamp';
  end if;

  if p_changes ? 'assignments' then
    if jsonb_typeof(p_changes -> 'assignments') <> 'array' then
      raise exception 'Assignments must be an array';
    end if;
    existing_assignments := coalesce(shoot_record.assignments, '[]'::jsonb);
    proposed_assignments := p_changes -> 'assignments';

    if jsonb_array_length(existing_assignments) <> jsonb_array_length(proposed_assignments) then
      raise exception 'Operational updates cannot add or remove crew assignments';
    end if;

    if jsonb_array_length(existing_assignments) > 0 then
      for assignment_index in 0..jsonb_array_length(existing_assignments) - 1 loop
        existing_assignment := existing_assignments -> assignment_index;
        proposed_assignment := proposed_assignments -> assignment_index;
        if jsonb_typeof(proposed_assignment) <> 'object'
          or (existing_assignment - 'paid' - 'paidAt' - 'checkedInAt')
            is distinct from (proposed_assignment - 'paid' - 'paidAt' - 'checkedInAt') then
          raise exception 'Operational updates cannot change crew assignment details or payout rates';
        end if;
        if coalesce((existing_assignment ->> 'paid')::boolean, false)
          and coalesce((proposed_assignment ->> 'paid')::boolean, false) is false then
          raise exception 'A confirmed crew payout is final and cannot be changed';
        end if;
        if not coalesce((existing_assignment ->> 'paid')::boolean, false)
          and coalesce((proposed_assignment ->> 'paid')::boolean, false)
          and nullif(proposed_assignment ->> 'paidAt', '') is null then
          raise exception 'A paid crew payout requires a payment timestamp';
        end if;
      end loop;
    end if;
  end if;

  update public.shoots
  set client_paid = case
        when p_changes ? 'client_paid' then (p_changes ->> 'client_paid')::boolean
        else client_paid
      end,
      client_paid_at = case
        when p_changes ? 'client_paid_at' then nullif(p_changes ->> 'client_paid_at', '')::timestamptz
        else client_paid_at
      end,
      assignments = case
        when p_changes ? 'assignments' then proposed_assignments
        else assignments
      end
  where id = p_shoot_id;
end;
$$;

revoke all on function public.update_shoot_operational(uuid, jsonb) from public, anon;
grant execute on function public.update_shoot_operational(uuid, jsonb) to authenticated;
revoke all on function public.prevent_paid_status_reversal() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;

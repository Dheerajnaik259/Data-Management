-- Fix RLS policy for change request resubmission and add RPC helper

drop policy if exists requests_resubmit on public.change_requests;
create policy requests_resubmit on public.change_requests for update to authenticated using (public.is_operator()) with check (public.is_operator());

create or replace function public.resubmit_change_request(
  p_cr_id uuid,
  p_proposed_data jsonb,
  p_requested_by uuid,
  p_requested_at timestamptz,
  p_revision_count integer
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_operator() then raise exception 'Not authorized'; end if;
  update public.change_requests
  set proposed_data = p_proposed_data,
      status = 'pending',
      requested_by = p_requested_by,
      requested_at = p_requested_at,
      reviewed_by = null,
      reviewed_at = null,
      review_note = '',
      revision_count = p_revision_count
  where id = p_cr_id;
end;
$$;

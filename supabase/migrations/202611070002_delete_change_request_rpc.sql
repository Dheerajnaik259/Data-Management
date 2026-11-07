create or replace function public.delete_change_request(p_cr_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if not public.is_operator() then
    raise exception 'Not authorized to delete change requests';
  end if;

  delete from public.change_requests
  where id = p_cr_id
    and (requested_by = auth.uid() or public.is_founder());

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Request not found or not authorized';
  end if;
end;
$$;

revoke all on function public.delete_change_request(uuid) from public, anon;
grant execute on function public.delete_change_request(uuid) to authenticated;

notify pgrst, 'reload schema';

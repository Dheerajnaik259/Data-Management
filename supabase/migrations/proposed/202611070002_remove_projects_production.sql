-- DESTRUCTIVE CLEANUP: permanently removes Projects and Content Production data,
-- related approval requests/notifications, and feature-specific database objects.
-- Back up any data that must be retained, then set confirmed := true below.

begin;

do $$
declare
  confirmed boolean := false;
begin
  if not confirmed then
    raise exception 'Cleanup stopped. Back up required data and explicitly set confirmed := true before running.';
  end if;
end;
$$;

delete from public.change_requests
where target_collection in ('projects', 'project_tasks', 'production_items');

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'production_items') then
      execute 'alter publication supabase_realtime drop table public.production_items';
    end if;
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_tasks') then
      execute 'alter publication supabase_realtime drop table public.project_tasks';
    end if;
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects') then
      execute 'alter publication supabase_realtime drop table public.projects';
    end if;
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'operations_activity') then
      execute 'alter publication supabase_realtime drop table public.operations_activity';
    end if;
  end if;
end;
$$;

drop table if exists public.production_items;
drop table if exists public.project_tasks;
drop table if exists public.projects;
drop table if exists public.operations_activity;

alter table public.shoots drop constraint if exists shoots_id_client_id_key;

drop function if exists public.submit_operations_change(text, uuid, text, jsonb);
drop function if exists public.approve_operations_change(uuid, text);
drop function if exists public.record_operations_activity();
drop function if exists public.touch_operations_updated_at();
drop function if exists public.validate_project_assignees();
drop function if exists public.validate_project_completion();
drop function if exists public.validate_production_publication();

commit;

create extension if not exists pg_cron;

create or replace function public.cleanup_old_user_notifications(
  dismissed_after_days integer default 30,
  max_age_days         integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  with d as (
    delete from public.user_notifications
    where (dismissed = true and created_at < now() - make_interval(days => dismissed_after_days))
       or (created_at < now() - make_interval(days => max_age_days))
    returning 1
  )
  select count(*) into deleted_count from d;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_old_user_notifications(integer, integer) from public, anon, authenticated;
grant execute on function public.cleanup_old_user_notifications(integer, integer) to service_role;
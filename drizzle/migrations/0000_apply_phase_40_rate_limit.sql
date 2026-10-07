create or replace function public.check_rate_limit(p_user_id uuid, p_action text, p_max integer)
returns boolean language plpgsql security definer set search_path = public
as $function$
declare
  v_window timestamptz := date_trunc('minute', now());
  v_count integer;
begin
  if p_user_id is null or p_action is null or length(trim(p_action)) = 0 or p_max < 1 then
    raise exception 'invalid rate limit arguments' using errcode = '22023';
  end if;
  insert into public.rate_limits(user_id, action, window_start, count)
  values (p_user_id, p_action, v_window, 1)
  on conflict (user_id, action, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;
  return v_count <= p_max;
end;
$function$;
revoke all on function public.check_rate_limit(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(uuid, text, integer) to service_role;
-- Limit the distributed rate-limit RPC to trusted server callers.
-- All application call sites use getAdminClient() (service_role).
-- This does not change rate_limit_hits rows or its existing RLS policy.
begin;

grant select, insert, update, delete on table public.rate_limit_hits to service_role;

create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_count integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_key is null or pg_catalog.length(p_key) not between 1 and 256 then
    raise exception 'Rate-limit key is invalid.';
  end if;
  if p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'Rate-limit window is invalid.';
  end if;

  delete from public.rate_limit_hits
  where key = p_key and expires_at < v_now;

  insert into public.rate_limit_hits (key, count, expires_at)
  values (p_key, 1, v_now + pg_catalog.make_interval(secs => p_window_seconds))
  on conflict (key) do update
  set count = public.rate_limit_hits.count + 1
  returning count into v_count;

  return v_count;
end;
$function$;

revoke all on function public.hit_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer) to service_role;

commit;

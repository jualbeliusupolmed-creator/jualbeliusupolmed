begin;

revoke all on function public.get_linusku_setting(text, jsonb)
  from public, anon, authenticated;

grant execute on function public.get_linusku_setting(text, jsonb)
  to service_role;

commit;

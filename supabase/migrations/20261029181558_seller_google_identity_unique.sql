do $$
begin
  if exists (
    select 1
    from public.seller_profiles
    where email_google is not null
      and btrim(email_google) <> ''
    group by lower(btrim(email_google))
    having count(*) > 1
  ) then
    raise exception 'Duplicate seller_profiles.email_google values must be resolved before enabling identity linking';
  end if;
end;
$$;

create unique index if not exists seller_profiles_email_google_unique
  on public.seller_profiles (lower(btrim(email_google)))
  where email_google is not null and btrim(email_google) <> '';
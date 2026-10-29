create table if not exists public.seller_profile_aliases (
  alias_wa text primary key,
  canonical_wa text not null references public.seller_profiles (wa) on delete cascade,
  created_at timestamptz not null default now(),
  constraint seller_profile_aliases_not_self check (alias_wa <> canonical_wa)
);

create index if not exists seller_profile_aliases_canonical_idx
  on public.seller_profile_aliases (canonical_wa);

alter table public.seller_profile_aliases enable row level security;
revoke all on table public.seller_profile_aliases from public, anon, authenticated;
grant all on table public.seller_profile_aliases to service_role;

create or replace function public.merge_seller_profiles(
  p_source_wa text,
  p_canonical_wa text,
  p_source_teman_id text,
  p_canonical_teman_id text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_source public.seller_profiles%rowtype;
  v_canonical public.seller_profiles%rowtype;
  v_source_teman_exists boolean;
  v_canonical_teman_exists boolean;
begin
  if p_source_wa is null or p_canonical_wa is null
     or p_source_wa = p_canonical_wa
     or p_canonical_wa !~ '^08[0-9]{8,11}$' then
    raise exception using errcode = '22023', message = 'Identitas akun tidak valid.';
  end if;

  select * into v_source
  from public.seller_profiles
  where wa = p_source_wa
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Profil sumber tidak ditemukan.';
  end if;

  select * into v_canonical
  from public.seller_profiles
  where wa = p_canonical_wa
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Profil WhatsApp utama tidak ditemukan.';
  end if;

  if v_source.phone_wa is not null and v_source.phone_wa <> p_canonical_wa then
    raise exception using errcode = '23505', message = 'Profil sumber sudah tertaut ke nomor WhatsApp lain.';
  end if;
  if v_canonical.phone_wa is not null and v_canonical.phone_wa <> p_canonical_wa then
    raise exception using errcode = '23505', message = 'Profil WhatsApp utama sudah tertaut ke nomor lain.';
  end if;
  if v_source.pin is not null and v_canonical.pin is not null and v_source.pin <> v_canonical.pin then
    raise exception using errcode = '23514', message = 'Kedua profil memiliki PIN berbeda. Samakan PIN sebelum menggabungkan akun.';
  end if;

  select exists (
    select 1 from public.teman_profiles where user_id = p_source_teman_id
  ) into v_source_teman_exists;
  select exists (
    select 1 from public.teman_profiles where user_id = p_canonical_teman_id
  ) into v_canonical_teman_exists;
  if v_source_teman_exists and v_canonical_teman_exists then
    raise exception using errcode = '23514', message = 'Kedua profil memiliki data Cari Teman. Hubungi bantuan agar riwayat kecocokan tetap utuh.';
  end if;

  update public.listings set seller_wa = p_canonical_wa where seller_wa = p_source_wa;
  update public.seller_ratings set seller_wa = p_canonical_wa where seller_wa = p_source_wa;
  update public.price_offers set buyer_wa = p_canonical_wa where buyer_wa = p_source_wa;
  update public.wanted_listings set buyer_wa = p_canonical_wa where buyer_wa = p_source_wa;
  update public.category_subscriptions set buyer_wa = p_canonical_wa where buyer_wa = p_source_wa;
  update public.distributor_categories set seller_wa = p_canonical_wa where seller_wa = p_source_wa;
  update public.profile_change_requests set seller_wa = p_canonical_wa where seller_wa = p_source_wa;
  update public.group_posts set sender_wa = p_canonical_wa where sender_wa = p_source_wa;
  update public.wa_conversations set wa = p_canonical_wa where wa = p_source_wa;
  update public.wa_listing_drafts set wa = p_canonical_wa where wa = p_source_wa;
  update public.referrals set referrer_wa = p_canonical_wa where referrer_wa = p_source_wa;
  update public.referrals set referred_wa = p_canonical_wa where referred_wa = p_source_wa;

  update public.open_po_products set seller_wa = p_canonical_wa where seller_wa = p_source_wa;
  update public.open_po_batches set seller_wa = p_canonical_wa where seller_wa = p_source_wa;
  update public.open_po_orders set buyer_wa = p_canonical_wa where buyer_wa = p_source_wa;

  update public.chat_rooms set user1_id = p_canonical_wa where user1_id = p_source_wa;
  update public.chat_rooms set user2_id = p_canonical_wa where user2_id = p_source_wa;
  update public.chat_messages set sender_id = p_canonical_wa where sender_id = p_source_wa;

  if v_source_teman_exists then
    update public.teman_profiles
    set user_id = p_canonical_teman_id,
        whatsapp = p_canonical_wa
    where user_id = p_source_teman_id;
  end if;
  update public.chat_rooms set user1_id = p_canonical_teman_id where user1_id = p_source_teman_id;
  update public.chat_rooms set user2_id = p_canonical_teman_id where user2_id = p_source_teman_id;
  update public.chat_messages set sender_id = p_canonical_teman_id where sender_id = p_source_teman_id;

  if exists (select 1 from public.chat_identity_wa where user_hash = p_source_teman_id)
     and not exists (select 1 from public.chat_identity_wa where user_hash = p_canonical_teman_id) then
    update public.chat_identity_wa
    set user_hash = p_canonical_teman_id, wa = p_canonical_wa, updated_at = now()
    where user_hash = p_source_teman_id;
  else
    delete from public.chat_identity_wa where user_hash = p_source_teman_id;
  end if;

  update public.seller_profiles
  set phone_wa = p_canonical_wa,
      wa_verified = true,
      email = coalesce(nullif(btrim(email), ''), nullif(btrim(v_source.email), '')),
      email_google = coalesce(nullif(btrim(email_google), ''), nullif(btrim(v_source.email_google), '')),
      pin = coalesce(pin, v_source.pin),
      name = coalesce(nullif(btrim(name), ''), nullif(btrim(v_source.name), '')),
      bio = coalesce(nullif(btrim(bio), ''), nullif(btrim(v_source.bio), '')),
      campus = coalesce(nullif(btrim(campus), ''), nullif(btrim(v_source.campus), '')),
      faculty = coalesce(nullif(btrim(faculty), ''), nullif(btrim(v_source.faculty), '')),
      avatar_url = coalesce(nullif(btrim(avatar_url), ''), nullif(btrim(v_source.avatar_url), '')),
      auth_provider = case
        when coalesce(
          nullif(btrim(v_canonical.email_google), ''),
          nullif(btrim(v_source.email_google), ''),
          nullif(btrim(v_canonical.email), ''),
          nullif(btrim(v_source.email), '')
        ) is not null then 'wa_google'
        else auth_provider
      end
  where wa = p_canonical_wa;

  insert into public.seller_profile_aliases (alias_wa, canonical_wa)
  values (p_source_wa, p_canonical_wa)
  on conflict (alias_wa) do update set canonical_wa = excluded.canonical_wa;

  delete from public.seller_profiles where wa = p_source_wa;
end;
$$;

revoke all on function public.merge_seller_profiles(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.merge_seller_profiles(text, text, text, text)
  to service_role;
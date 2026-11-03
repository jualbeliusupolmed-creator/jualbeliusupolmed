-- ==============================================================================
-- Migrasi: 20261103120000_national_identity_lebur_and_legacy_backfill.sql
-- Tujuan: 
-- 1. Peleburan Akun & Identitas Kanonikal (Merge Profile, user_id, dan semua aset)
-- 2. Backfill 100% Listing, WTB, dan Seller Profiles Lawas ke USU dan POLMED
-- ==============================================================================

-- 1. Pembaruan Fungsi merge_seller_profiles (Peleburan Akun Bersih & Menyeluruh)
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
  v_merged_user_id uuid;
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

  -- Tentukan user_id terpadu (prioritas canonical, fallback ke source)
  v_merged_user_id := coalesce(v_canonical.user_id, v_source.user_id);

  -- Pindahkan relasi data produk dan transaksi ke canonical
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

  -- Cari Teman integration
  select exists (
    select 1 from public.teman_profiles where user_id = p_source_teman_id
  ) into v_source_teman_exists;
  select exists (
    select 1 from public.teman_profiles where user_id = p_canonical_teman_id
  ) into v_canonical_teman_exists;

  if v_source_teman_exists and not v_canonical_teman_exists then
    update public.teman_profiles
    set user_id = p_canonical_teman_id,
        whatsapp = p_canonical_wa
    where user_id = p_source_teman_id;
  elsif v_source_teman_exists and v_canonical_teman_exists then
    -- Jika kedua profil punya data teman, pertahankan data canonical dan bersihkan data source
    delete from public.teman_profiles where user_id = p_source_teman_id;
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

  -- Kosongkan kolom unik pada profil sumber sebelum memindahkannya ke profil utama
  update public.seller_profiles
  set email = null,
      email_google = null,
      user_id = null
  where wa = p_source_wa;

  -- Leburkan data profil ke canonical
  update public.seller_profiles
  set phone_wa = p_canonical_wa,
      wa_verified = true,
      user_id = v_merged_user_id,
      home_university_id = coalesce(v_canonical.home_university_id, v_source.home_university_id),
      home_unit_id = coalesce(v_canonical.home_unit_id, v_source.home_unit_id),
      affiliation_status = case
        when v_canonical.affiliation_status in ('verified_student', 'faculty_staff', 'alumni') then v_canonical.affiliation_status
        when v_source.affiliation_status in ('verified_student', 'faculty_staff', 'alumni') then v_source.affiliation_status
        else coalesce(v_canonical.affiliation_status, v_source.affiliation_status, 'self_selected')
      end,
      verified_university_id = coalesce(v_canonical.verified_university_id, v_source.verified_university_id),
      email = coalesce(nullif(btrim(email), ''), nullif(btrim(v_source.email), '')),
      email_google = coalesce(nullif(btrim(email_google), ''), nullif(btrim(v_source.email_google), '')),
      pin = coalesce(v_canonical.pin, v_source.pin),
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

  -- Sinkronkan user_id ke seluruh tabel anak milik profil kanonikal
  if v_merged_user_id is not null then
    update public.listings
    set user_id = v_merged_user_id
    where seller_wa = p_canonical_wa and user_id is null;

    update public.wanted_listings
    set user_id = v_merged_user_id
    where buyer_wa = p_canonical_wa and user_id is null;

    update public.open_po_products
    set user_id = v_merged_user_id
    where seller_wa = p_canonical_wa and user_id is null;

    update public.open_po_orders
    set user_id = v_merged_user_id
    where buyer_wa = p_canonical_wa and user_id is null;

    update public.ig_seller_links
    set user_id = v_merged_user_id
    where (wa = p_canonical_wa or wa = p_source_wa) and user_id is null;
  end if;

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


-- 2. Backfill 100% Listing, WTB, dan Profil Lama ke USU dan POLMED
-- 2a. Backfill listings
update public.listings
set university_id = case
  when lower(coalesce(campus, '')) ~ 'polmed' then 'polmed'
  else 'usu'
end
where university_id is null;

-- 2b. Backfill wanted_listings (WTB)
update public.wanted_listings
set university_id = case
  when lower(coalesce(campus, '')) ~ 'polmed' then 'polmed'
  else 'usu'
end
where university_id is null;

-- 2c. Backfill seller_profiles home_university_id
update public.seller_profiles
set home_university_id = case
  when lower(coalesce(campus, '')) ~ 'polmed' then 'polmed'
  else 'usu'
end
where home_university_id is null;


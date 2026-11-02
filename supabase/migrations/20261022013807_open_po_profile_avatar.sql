-- Add seller photos and request-level idempotency without changing StudentPlace tables.
alter table public.po_sellers
  add column if not exists avatar_path text
  check (avatar_path is null or avatar_path = user_id::text || '/avatar');

alter table public.po_orders
  add column if not exists client_request_id uuid;

create unique index if not exists po_orders_buyer_request_idx
  on public.po_orders (buyer_id, client_request_id)
  where client_request_id is not null;

grant select (user_id, display_name, faculty, avatar_path)
  on public.po_sellers to anon, authenticated;

create or replace function public.po_get_my_seller_profile()
returns table (display_name text, faculty text, whatsapp text, avatar_path text)
language sql
stable
security definer
set search_path = public
as $$
  select s.display_name, s.faculty, s.whatsapp, s.avatar_path
  from public.po_sellers s
  where s.user_id = (select auth.uid());
$$;

revoke all on function public.po_get_my_seller_profile() from public, anon;
grant execute on function public.po_get_my_seller_profile() to authenticated;

create or replace function public.po_get_order_seller_contact(p_order_id uuid)
returns table (seller_name text, whatsapp text)
language sql
stable
security definer
set search_path = public
as $$
  select s.display_name, s.whatsapp
  from public.po_orders o
  join public.po_batches b on b.id = o.batch_id
  join public.po_products p on p.id = b.product_id
  join public.po_sellers s on s.user_id = p.seller_id
  where o.id = p_order_id
    and o.buyer_id = (select auth.uid());
$$;

revoke all on function public.po_get_order_seller_contact(uuid) from public, anon;
grant execute on function public.po_get_order_seller_contact(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'po-seller-avatars',
  'po-seller-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "po_seller_avatars_owner_select" on storage.objects;
create policy "po_seller_avatars_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'po-seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "po_seller_avatars_owner_insert" on storage.objects;
create policy "po_seller_avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'po-seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "po_seller_avatars_owner_update" on storage.objects;
create policy "po_seller_avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'po-seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'po-seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "po_seller_avatars_owner_delete" on storage.objects;
create policy "po_seller_avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'po-seller-avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

revoke all on function public.po_place_order(uuid, integer, text, text, text)
  from public, anon;

create function public.po_place_order(
  p_batch_id uuid,
  p_quantity integer,
  p_buyer_name text,
  p_buyer_faculty text,
  p_buyer_whatsapp text,
  p_client_request_id uuid
)
returns table (id uuid, order_code text, total_price_idr bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_batch public.po_batches%rowtype;
  v_price integer;
  v_order public.po_orders%rowtype;
  v_existing public.po_orders%rowtype;
begin
  if v_user_id is null then raise exception 'Silakan masuk sebelum memesan.'; end if;
  if p_client_request_id is null then raise exception 'Permintaan pesanan tidak valid.'; end if;
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then
    raise exception 'Jumlah pesanan harus antara 1 dan 100.';
  end if;
  if char_length(trim(coalesce(p_buyer_name, ''))) not between 2 and 80
    or char_length(trim(coalesce(p_buyer_faculty, ''))) not between 2 and 120
    or char_length(trim(coalesce(p_buyer_whatsapp, ''))) not between 8 and 24 then
    raise exception 'Lengkapi nama, fakultas, dan nomor WhatsApp.';
  end if;

  select * into v_batch from public.po_batches where id = p_batch_id for update;
  if not found then raise exception 'Batch PO tidak ditemukan.'; end if;

  select * into v_existing from public.po_orders
  where buyer_id = v_user_id and client_request_id = p_client_request_id;
  if found then
    if v_existing.batch_id <> p_batch_id
      or v_existing.quantity <> p_quantity
      or v_existing.buyer_name <> trim(p_buyer_name)
      or v_existing.buyer_faculty <> trim(p_buyer_faculty)
      or v_existing.buyer_whatsapp <> trim(p_buyer_whatsapp) then
      raise exception 'Permintaan ini sudah dipakai untuk pesanan lain. Muat ulang halaman lalu coba lagi.';
    end if;
    return query select v_existing.id, v_existing.order_code, v_existing.total_price_idr;
    return;
  end if;

  if v_batch.status <> 'open' or v_batch.closes_at <= now() then
    raise exception 'PO ini sudah ditutup.';
  end if;
  if v_batch.reserved_quantity + p_quantity > v_batch.quota then
    raise exception 'Kuota tidak cukup untuk jumlah tersebut.';
  end if;

  select price_idr into v_price from public.po_products
  where id = v_batch.product_id and active = true;
  if not found then raise exception 'Produk ini sedang tidak tersedia.'; end if;

  insert into public.po_orders (
    order_code, batch_id, buyer_id, buyer_name, buyer_faculty,
    buyer_whatsapp, quantity, unit_price_idr, client_request_id
  ) values (
    'PO-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8)),
    v_batch.id, v_user_id, trim(p_buyer_name), trim(p_buyer_faculty),
    trim(p_buyer_whatsapp), p_quantity, v_price, p_client_request_id
  ) returning * into v_order;

  update public.po_batches
  set reserved_quantity = reserved_quantity + p_quantity,
      status = case when reserved_quantity + p_quantity >= quota then 'closed' else status end,
      updated_at = now()
  where id = v_batch.id;

  return query select v_order.id, v_order.order_code, v_order.total_price_idr;
end;
$$;

revoke all on function public.po_place_order(uuid, integer, text, text, text, uuid)
  from public, anon;
grant execute on function public.po_place_order(uuid, integer, text, text, text, uuid)
  to authenticated;

-- Keep already-open clients working while the new app version rolls out.
create or replace function public.po_place_order(
  p_batch_id uuid,
  p_quantity integer,
  p_buyer_name text,
  p_buyer_faculty text,
  p_buyer_whatsapp text
)
returns table (id uuid, order_code text, total_price_idr bigint)
language sql
security definer
set search_path = public
as $$
  select * from public.po_place_order(
    p_batch_id, p_quantity, p_buyer_name, p_buyer_faculty,
    p_buyer_whatsapp, gen_random_uuid()
  );
$$;

revoke all on function public.po_place_order(uuid, integer, text, text, text)
  from public, anon;
grant execute on function public.po_place_order(uuid, integer, text, text, text)
  to authenticated;;

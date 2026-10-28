-- Owner workspace authorization and a fresh Open PO database in this project.
-- Existing Open PO data stays in the separate Open PO project.

create table if not exists public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  status text not null default 'active' check (status in ('active', 'suspended')),
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists admin_memberships_created_by_idx on public.admin_memberships(created_by);

create table if not exists public.admin_scope_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_memberships(user_id) on delete cascade,
  scope_type text not null check (scope_type in ('province', 'campus')),
  scope_id text not null check (length(trim(scope_id)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (user_id, scope_type, scope_id)
);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_events_created_idx on public.admin_audit_events(created_at desc);
create index if not exists admin_audit_events_actor_idx on public.admin_audit_events(actor_id, created_at desc);

create table if not exists public.open_po_products (
  id uuid primary key default gen_random_uuid(),
  seller_wa text not null check (seller_wa ~ '^[0-9]{8,16}$'),
  name text not null check (length(trim(name)) between 2 and 100),
  description text not null default '' check (length(description) <= 2000),
  category text not null default 'Lainnya' check (length(trim(category)) between 1 and 40),
  unit text not null default 'pcs' check (length(trim(unit)) between 1 and 30),
  image_url text,
  campus text not null check (length(trim(campus)) between 1 and 80),
  seller_contact_consent boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists open_po_products_seller_idx on public.open_po_products(seller_wa, created_at desc);
create index if not exists open_po_products_campus_idx on public.open_po_products(campus, active);

create table if not exists public.open_po_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.open_po_products(id) on delete restrict,
  seller_wa text not null check (seller_wa ~ '^[0-9]{8,16}$'),
  title text not null check (length(trim(title)) between 2 and 120),
  price_idr integer not null check (price_idr between 0 and 100000000),
  quota integer not null check (quota between 1 and 100000),
  reserved_count integer not null default 0 check (reserved_count >= 0 and reserved_count <= quota),
  closes_at timestamptz not null,
  pickup_point text not null check (length(trim(pickup_point)) between 2 and 180),
  pickup_note text not null default '' check (length(pickup_note) <= 500),
  status text not null default 'open' check (status in ('draft', 'open', 'closed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > created_at)
);

create index if not exists open_po_batches_public_idx on public.open_po_batches(status, closes_at, created_at desc);
create index if not exists open_po_batches_seller_idx on public.open_po_batches(seller_wa, created_at desc);
create index if not exists open_po_batches_product_idx on public.open_po_batches(product_id);

create table if not exists public.open_po_orders (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.open_po_batches(id) on delete restrict,
  buyer_wa text not null check (buyer_wa ~ '^[0-9]{8,16}$'),
  buyer_name text not null check (length(trim(buyer_name)) between 2 and 80),
  quantity integer not null check (quantity between 1 and 1000),
  unit_price_idr integer not null check (unit_price_idr between 0 and 100000000),
  total_idr bigint not null check (total_idr between 0 and 100000000000),
  buyer_contact_consent boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'fulfilled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists open_po_orders_buyer_idx on public.open_po_orders(buyer_wa, created_at desc);
create index if not exists open_po_orders_batch_idx on public.open_po_orders(batch_id, created_at desc);

create or replace view public.open_po_batch_order_summary as
select
  batch_id,
  count(*)::integer as total,
  count(*) filter (where status = 'pending')::integer as pending,
  count(*) filter (where status = 'confirmed')::integer as confirmed,
  count(*) filter (where status = 'fulfilled')::integer as fulfilled,
  count(*) filter (where status = 'cancelled')::integer as cancelled
from public.open_po_orders
group by batch_id;

create or replace function public.create_open_po_batch(
  p_seller_wa text,
  p_name text,
  p_description text,
  p_category text,
  p_unit text,
  p_image_url text,
  p_campus text,
  p_title text,
  p_price_idr integer,
  p_quota integer,
  p_closes_at timestamptz,
  p_pickup_point text,
  p_pickup_note text,
  p_seller_contact_consent boolean
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_product_id uuid;
  v_batch_id uuid;
begin
  if p_seller_wa !~ '^[0-9]{8,16}$' then raise exception 'Identitas penjual tidak valid'; end if;
  if length(trim(coalesce(p_name, ''))) not between 2 and 100 then raise exception 'Nama produk tidak valid'; end if;
  if length(trim(coalesce(p_title, ''))) not between 2 and 120 then raise exception 'Judul batch tidak valid'; end if;
  if p_price_idr < 0 or p_price_idr > 100000000 then raise exception 'Harga di luar batas'; end if;
  if p_quota < 1 or p_quota > 100000 then raise exception 'Kuota di luar batas'; end if;
  if p_closes_at <= now() or p_closes_at > now() + interval '180 days' then raise exception 'Waktu tutup tidak valid'; end if;

  insert into public.open_po_products (seller_wa, name, description, category, unit, image_url, campus, seller_contact_consent)
  values (p_seller_wa, trim(p_name), coalesce(p_description, ''), coalesce(nullif(trim(p_category), ''), 'Lainnya'), coalesce(nullif(trim(p_unit), ''), 'pcs'), nullif(trim(coalesce(p_image_url, '')), ''), trim(p_campus), coalesce(p_seller_contact_consent, false))
  returning id into v_product_id;

  insert into public.open_po_batches (product_id, seller_wa, title, price_idr, quota, closes_at, pickup_point, pickup_note)
  values (v_product_id, p_seller_wa, trim(p_title), p_price_idr, p_quota, p_closes_at, trim(p_pickup_point), coalesce(p_pickup_note, ''))
  returning id into v_batch_id;

  return v_batch_id;
end;
$$;

create or replace function public.reserve_open_po_order(
  p_batch_id uuid,
  p_buyer_wa text,
  p_buyer_name text,
  p_quantity integer,
  p_buyer_contact_consent boolean
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_batch public.open_po_batches%rowtype;
  v_order public.open_po_orders%rowtype;
begin
  if p_buyer_wa !~ '^[0-9]{8,16}$' then raise exception 'Identitas pembeli tidak valid'; end if;
  if length(trim(coalesce(p_buyer_name, ''))) not between 2 and 80 then raise exception 'Nama pembeli tidak valid'; end if;
  if p_quantity < 1 or p_quantity > 1000 then raise exception 'Jumlah tidak valid'; end if;

  select * into v_batch from public.open_po_batches where id = p_batch_id for update;
  if not found or v_batch.status <> 'open' or v_batch.closes_at <= now() then raise exception 'Batch sudah tidak menerima pesanan'; end if;
  if v_batch.seller_wa = p_buyer_wa then raise exception 'Penjual tidak dapat memesan batch sendiri'; end if;
  if v_batch.reserved_count + p_quantity > v_batch.quota then raise exception 'Kuota tidak mencukupi'; end if;

  insert into public.open_po_orders (batch_id, buyer_wa, buyer_name, quantity, unit_price_idr, total_idr, buyer_contact_consent)
  values (v_batch.id, p_buyer_wa, trim(p_buyer_name), p_quantity, v_batch.price_idr, v_batch.price_idr::bigint * p_quantity, coalesce(p_buyer_contact_consent, false))
  returning * into v_order;

  update public.open_po_batches set reserved_count = reserved_count + p_quantity, updated_at = now() where id = v_batch.id;
  return jsonb_build_object('id', v_order.id, 'batch_id', v_order.batch_id, 'quantity', v_order.quantity, 'total_idr', v_order.total_idr, 'status', v_order.status);
end;
$$;

create or replace function public.replace_admin_membership(
  p_user_id uuid,
  p_display_name text,
  p_permissions jsonb,
  p_scopes jsonb,
  p_actor_id uuid
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_scope jsonb;
begin
  if p_user_id is null or length(trim(coalesce(p_display_name, ''))) not between 1 and 80 then
    raise exception 'Data owner tidak valid';
  end if;
  if jsonb_typeof(p_permissions) <> 'object' or jsonb_typeof(p_scopes) <> 'array' then
    raise exception 'Izin owner tidak valid';
  end if;

  insert into public.admin_memberships (user_id, display_name, status, permissions, created_by, updated_at)
  values (p_user_id, trim(p_display_name), 'active', p_permissions, p_actor_id, now())
  on conflict (user_id) do update set display_name = excluded.display_name, status = 'active', permissions = excluded.permissions, updated_at = now();

  delete from public.admin_scope_grants where user_id = p_user_id;
  for v_scope in select value from jsonb_array_elements(p_scopes) loop
    if v_scope->>'scope_type' not in ('province', 'campus') or length(trim(coalesce(v_scope->>'scope_id', ''))) not between 1 and 120 then
      raise exception 'Cakupan owner tidak valid';
    end if;
    insert into public.admin_scope_grants (user_id, scope_type, scope_id)
    values (p_user_id, v_scope->>'scope_type', lower(trim(v_scope->>'scope_id')));
  end loop;
  if not exists (select 1 from public.admin_scope_grants where user_id = p_user_id) then
    raise exception 'Owner harus memiliki cakupan kerja';
  end if;
  insert into public.admin_audit_events (actor_id, action, target_id, metadata)
  values (p_actor_id, 'owner_access_saved', p_user_id::text, jsonb_build_object('permissions', p_permissions, 'scopes', p_scopes));
  return true;
end;
$$;

create or replace function public.update_open_po_order_status(
  p_order_id uuid,
  p_actor_wa text,
  p_status text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_order public.open_po_orders%rowtype;
  v_batch public.open_po_batches%rowtype;
  v_is_seller boolean;
begin
  if p_actor_wa !~ '^[0-9]{8,16}$' then raise exception 'Identitas akun tidak valid'; end if;
  if p_status not in ('confirmed', 'cancelled', 'fulfilled') then raise exception 'Status tidak valid'; end if;

  select * into v_order from public.open_po_orders where id = p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  select * into v_batch from public.open_po_batches where id = v_order.batch_id for update;
  v_is_seller := v_batch.seller_wa = p_actor_wa;
  if not v_is_seller and v_order.buyer_wa <> p_actor_wa then raise exception 'Pesanan bukan milik akun ini'; end if;

  if p_status = 'confirmed' and (not v_is_seller or v_order.status <> 'pending') then raise exception 'Perubahan status tidak diizinkan'; end if;
  if p_status = 'fulfilled' and (not v_is_seller or v_order.status <> 'confirmed') then raise exception 'Perubahan status tidak diizinkan'; end if;
  if p_status = 'cancelled' and (v_order.status not in ('pending', 'confirmed') or (not v_is_seller and v_order.buyer_wa <> p_actor_wa)) then raise exception 'Perubahan status tidak diizinkan'; end if;

  if p_status = 'cancelled' then
    update public.open_po_batches set reserved_count = greatest(0, reserved_count - v_order.quantity), updated_at = now() where id = v_batch.id;
  end if;
  update public.open_po_orders set status = p_status, updated_at = now() where id = v_order.id returning * into v_order;
  return jsonb_build_object('id', v_order.id, 'status', v_order.status, 'batch_id', v_order.batch_id, 'quantity', v_order.quantity);
end;
$$;

alter table public.admin_memberships enable row level security;
alter table public.admin_scope_grants enable row level security;
alter table public.admin_audit_events enable row level security;
alter table public.open_po_products enable row level security;
alter table public.open_po_batches enable row level security;
alter table public.open_po_orders enable row level security;

-- These records are accessed only by authenticated server routes using service_role.
-- No browser role receives direct access or broad client-facing policies.

revoke all on table public.admin_memberships, public.admin_scope_grants, public.admin_audit_events,
  public.open_po_products, public.open_po_batches, public.open_po_orders from public, anon, authenticated;
grant select, insert, update, delete on table public.admin_memberships, public.admin_scope_grants,
  public.admin_audit_events, public.open_po_products, public.open_po_batches, public.open_po_orders to service_role;
revoke all on table public.open_po_batch_order_summary from public, anon, authenticated;
grant select on table public.open_po_batch_order_summary to service_role;

revoke all on function public.create_open_po_batch(text,text,text,text,text,text,text,text,integer,integer,timestamptz,text,text,boolean) from public, anon, authenticated;
revoke all on function public.reserve_open_po_order(uuid,text,text,integer,boolean) from public, anon, authenticated;
revoke all on function public.update_open_po_order_status(uuid,text,text) from public, anon, authenticated;
revoke all on function public.replace_admin_membership(uuid,text,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.create_open_po_batch(text,text,text,text,text,text,text,text,integer,integer,timestamptz,text,text,boolean) to service_role;
grant execute on function public.reserve_open_po_order(uuid,text,text,integer,boolean) to service_role;
grant execute on function public.update_open_po_order_status(uuid,text,text) to service_role;
grant execute on function public.replace_admin_membership(uuid,text,jsonb,jsonb,uuid) to service_role;

comment on table public.admin_memberships is 'Server-managed admin and owner membership; client roles never confer privileges.';
comment on table public.admin_scope_grants is 'Explicit province and campus grants assigned per owner.';
comment on table public.open_po_products is 'Fresh Open PO product records for the main JB project.';
comment on table public.open_po_batches is 'Fresh Open PO batches; old Open PO data remains in its original project.';
comment on table public.open_po_orders is 'Reservations and fulfillment status for fresh Open PO batches.';

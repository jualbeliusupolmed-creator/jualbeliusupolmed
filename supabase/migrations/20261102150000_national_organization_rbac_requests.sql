-- National organization catalog, scoped admin assignments, approval requests,
-- and social-account registry. Existing settings and textual campus columns
-- remain available for compatibility while application routes migrate.

create table if not exists public.provinces (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 2 and 100),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.universities (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  code text not null unique check (length(trim(code)) between 2 and 32),
  province_id text not null references public.provinces(id) on update cascade on delete restrict,
  name text not null check (length(trim(name)) between 2 and 160),
  email_domains text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.universities add column if not exists email_domains text[] not null default '{}';
create index if not exists universities_province_status_idx on public.universities(province_id, status, name);

create table if not exists public.university_units (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  university_id text not null references public.universities(id) on update cascade on delete restrict,
  code text not null check (length(trim(code)) between 1 and 40),
  name text not null check (length(trim(name)) between 2 and 160),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, code)
);
create index if not exists university_units_university_status_idx on public.university_units(university_id, status, name);

-- A person can hold multiple admin roles and scopes. `admin_memberships` and
-- its JSON module permissions remain the compatibility/account-level layer.
create table if not exists public.admin_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_code text not null check (role_code in ('province_admin', 'university_admin')),
  province_id text references public.provinces(id) on update cascade on delete restrict,
  university_id text references public.universities(id) on update cascade on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended')),
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (role_code = 'province_admin' and province_id is not null and university_id is null)
    or (role_code = 'university_admin' and university_id is not null and province_id is null)
  )
);
create unique index if not exists admin_role_assignments_unique_scope_idx
  on public.admin_role_assignments(user_id, role_code, coalesce(province_id, ''), coalesce(university_id, ''));
create index if not exists admin_role_assignments_user_status_idx on public.admin_role_assignments(user_id, status);
create index if not exists admin_role_assignments_province_idx on public.admin_role_assignments(province_id, status) where province_id is not null;
create index if not exists admin_role_assignments_university_idx on public.admin_role_assignments(university_id, status) where university_id is not null;

create table if not exists public.university_admin_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  province_id text not null references public.provinces(id) on update cascade on delete restrict,
  university_id text not null references public.universities(id) on update cascade on delete restrict,
  requested_email text not null check (length(trim(requested_email)) between 5 and 254),
  requested_name text not null check (length(trim(requested_name)) between 2 and 100),
  note text not null default '' check (length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '' check (length(review_note) <= 1000),
  invitation_sent_at timestamptz,
  invitation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((reviewed_by is null and reviewed_at is null) or (reviewed_by is not null and reviewed_at is not null))
);
create unique index if not exists university_admin_requests_one_pending_idx
  on public.university_admin_requests(university_id) where status = 'pending';
create index if not exists university_admin_requests_province_status_idx
  on public.university_admin_requests(province_id, status, created_at desc);
create index if not exists university_admin_requests_requested_by_idx
  on public.university_admin_requests(requested_by, created_at desc);

-- Credentials are deliberately excluded. Store OAuth tokens only in an
-- approved secret manager; this table records identity, scope, and health.
create table if not exists public.organization_social_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('instagram', 'whatsapp_channel', 'whatsapp_business')),
  province_id text references public.provinces(id) on update cascade on delete restrict,
  university_id text references public.universities(id) on update cascade on delete restrict,
  scope_type text generated always as (case when province_id is not null then 'province' else 'university' end) stored,
  scope_id text generated always as (coalesce(province_id, university_id)) stored,
  handle text not null check (length(trim(handle)) between 1 and 200),
  external_account_id text,
  status text not null default 'not_connected' check (status in ('not_connected', 'pending', 'connected', 'error', 'inactive')),
  last_checked_at timestamptz,
  last_error_code text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((province_id is not null and university_id is null) or (province_id is null and university_id is not null)),
  check (external_account_id is null or length(trim(external_account_id)) between 1 and 160)
);
create unique index if not exists organization_social_accounts_scope_handle_idx
  on public.organization_social_accounts(provider, scope_type, scope_id, handle);
create unique index if not exists organization_social_accounts_external_idx
  on public.organization_social_accounts(provider, external_account_id) where external_account_id is not null;
create index if not exists organization_social_accounts_province_idx
  on public.organization_social_accounts(province_id, provider, status) where province_id is not null;
create index if not exists organization_social_accounts_university_idx
  on public.organization_social_accounts(university_id, provider, status) where university_id is not null;

-- Import the current JSON catalog. Entries with parentCampusId are branches,
-- not separate universities; preserve them as units under their parent.
create temporary table legacy_campus_roots (
  campus_id text primary key,
  university_id text not null
) on commit drop;

do $$
declare
  v_provinces jsonb;
  v_campuses jsonb;
  v_item jsonb;
  v_province_id text;
  v_university_id text;
  v_code text;
begin
  select value into v_provinces from public.settings where key = 'provinces' limit 1;
  select value into v_campuses from public.settings where key = 'campuses' limit 1;

  if jsonb_typeof(v_provinces) = 'array' then
    for v_item in select value from jsonb_array_elements(v_provinces) loop
      v_province_id := lower(trim(coalesce(v_item->>'id', '')));
      if v_province_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(trim(coalesce(v_item->>'name', ''))) between 2 and 100 then
        insert into public.provinces(id, name, status)
        values (v_province_id, trim(v_item->>'name'), case when lower(coalesce(v_item->>'active', 'true')) in ('false','0','no','off') then 'inactive' else 'active' end)
        on conflict (id) do update set name = excluded.name, status = excluded.status, updated_at = now();
      end if;
    end loop;
  end if;

  if jsonb_typeof(v_campuses) = 'array' then
    for v_item in select value from jsonb_array_elements(v_campuses) loop
      v_province_id := lower(trim(coalesce(v_item->>'provinceId', v_item->>'province_id', '')));
      if v_province_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then continue; end if;
      insert into public.provinces(id, name, status)
      values (
        v_province_id,
        initcap(replace(v_province_id, '-', ' ')),
        case when lower(coalesce(v_item->>'active', 'true')) in ('false','0','no','off') then 'inactive' else 'active' end
      ) on conflict (id) do nothing;
    end loop;

    for v_item in select value from jsonb_array_elements(v_campuses) loop
      if nullif(trim(coalesce(v_item->>'parentCampusId', v_item->>'parent_campus_id', '')), '') is not null then continue; end if;
      v_university_id := lower(trim(coalesce(v_item->>'id', '')));
      v_code := upper(trim(coalesce(v_item->>'shortName', '')));
      v_province_id := lower(trim(coalesce(v_item->>'provinceId', v_item->>'province_id', '')));
      if v_university_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or v_code = '' or v_province_id = '' then continue; end if;
      insert into public.universities(id, code, province_id, name, email_domains, status)
      values (
        v_university_id,
        left(v_code, 32),
        v_province_id,
        coalesce(nullif(trim(v_item->>'name'), ''), v_code),
        coalesce(array(select lower(trim(domain)) from jsonb_array_elements_text(case when jsonb_typeof(v_item->'emailDomains') = 'array' then v_item->'emailDomains' else '[]'::jsonb end) as domains(domain) where length(trim(domain)) between 1 and 253), '{}'),
        case when lower(coalesce(v_item->>'active', 'true')) in ('false','0','no','off') then 'inactive' else 'active' end
      ) on conflict (id) do update set
        code = excluded.code,
        province_id = excluded.province_id,
        name = excluded.name,
        email_domains = excluded.email_domains,
        status = excluded.status,
        updated_at = now();
    end loop;

    insert into legacy_campus_roots(campus_id, university_id)
    with recursive legacy_entries as (
      select lower(trim(coalesce(value->>'id', ''))) as campus_id,
        nullif(lower(trim(coalesce(value->>'parentCampusId', value->>'parent_campus_id', ''))), '') as parent_id
      from jsonb_array_elements(v_campuses) entry(value)
      where lower(trim(coalesce(value->>'id', ''))) ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ), campus_tree(campus_id, university_id, visited, depth) as (
      select campus_id, campus_id, array[campus_id], 0
      from legacy_entries e
      where parent_id is null and exists (select 1 from public.universities u where u.id = e.campus_id)
      union all
      select child.campus_id, tree.university_id, tree.visited || child.campus_id, tree.depth + 1
      from campus_tree tree
      join legacy_entries child on child.parent_id = tree.campus_id
      where not child.campus_id = any(tree.visited) and tree.depth < 20
    )
    select distinct on (campus_id) campus_id, university_id
    from campus_tree order by campus_id, depth desc;

    -- Nested legacy units remain units. Legacy branch campuses also become
    -- units linked to their parent university, with their old IDs preserved.
    insert into public.university_units(id, university_id, code, name, status)
    select lower(trim(unit.value->>'id')), lower(trim(coalesce(root.value->>'id', ''))),
      upper(trim(coalesce(unit.value->>'shortName', unit.value->>'code', unit.value->>'id'))),
      trim(coalesce(unit.value->>'name', unit.value->>'shortName', unit.value->>'id')),
      case when lower(coalesce(unit.value->>'active', 'true')) in ('false','0','no','off') then 'inactive' else 'active' end
    from jsonb_array_elements(v_campuses) root(value)
    cross join lateral jsonb_array_elements(case when jsonb_typeof(root.value->'units') = 'array' then root.value->'units' else '[]'::jsonb end) unit(value)
    join public.universities u on u.id = lower(trim(coalesce(root.value->>'id', '')))
    where nullif(trim(coalesce(root.value->>'parentCampusId', root.value->>'parent_campus_id', '')), '') is null
      and lower(trim(coalesce(unit.value->>'id', ''))) ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and length(trim(coalesce(unit.value->>'name', unit.value->>'shortName', unit.value->>'id', ''))) between 2 and 160
      and length(trim(coalesce(unit.value->>'shortName', unit.value->>'code', unit.value->>'id', ''))) between 1 and 40
    on conflict (id) do nothing;

    insert into public.university_units(id, university_id, code, name, status)
    select lower(trim(branch.value->>'id')), u.id,
      upper(trim(coalesce(branch.value->>'shortName', branch.value->>'id'))),
      trim(coalesce(branch.value->>'name', branch.value->>'shortName', branch.value->>'id')),
      case when lower(coalesce(branch.value->>'active', 'true')) in ('false','0','no','off') then 'inactive' else 'active' end
    from jsonb_array_elements(v_campuses) branch(value)
    join legacy_campus_roots roots on roots.campus_id = lower(trim(branch.value->>'id'))
    join public.universities u on u.id = roots.university_id
    where nullif(trim(coalesce(branch.value->>'parentCampusId', branch.value->>'parent_campus_id', '')), '') is not null
      and roots.campus_id <> roots.university_id
      and lower(trim(coalesce(branch.value->>'id', ''))) ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and length(trim(coalesce(branch.value->>'name', branch.value->>'shortName', branch.value->>'id', ''))) between 2 and 160
      and length(trim(coalesce(branch.value->>'shortName', branch.value->>'id', ''))) between 1 and 40
    on conflict (id) do nothing;
  end if;
end $$;

-- Preserve legacy organization handles as unconnected records; never infer or
-- copy credentials from application settings into this catalog. Branch entries
-- are excluded because social accounts are currently scoped to university.
insert into public.organization_social_accounts(provider, university_id, handle, status)
select 'instagram', u.id, lower(trim(c.value->>'instagramHandle')), 'not_connected'
from public.settings s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) c(value)
join public.universities u on lower(u.id) = lower(coalesce(c.value->>'id', ''))
where s.key = 'campuses'
  and nullif(trim(coalesce(c.value->>'parentCampusId', c.value->>'parent_campus_id', '')), '') is null
  and length(trim(coalesce(c.value->>'instagramHandle', ''))) between 1 and 30
on conflict (provider, scope_type, scope_id, handle) do nothing;

insert into public.organization_social_accounts(provider, university_id, handle, status)
select 'whatsapp_channel', u.id, trim(c.value->>'whatsappChannel'), 'not_connected'
from public.settings s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) c(value)
join public.universities u on lower(u.id) = lower(coalesce(c.value->>'id', ''))
where s.key = 'campuses'
  and nullif(trim(coalesce(c.value->>'parentCampusId', c.value->>'parent_campus_id', '')), '') is null
  and length(trim(coalesce(c.value->>'whatsappChannel', ''))) between 1 and 200
on conflict (provider, scope_type, scope_id, handle) do nothing;

insert into public.organization_social_accounts(provider, province_id, handle, status)
select 'instagram', p.id, lower(trim(v.value->>'instagramHandle')), 'not_connected'
from public.settings s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) v(value)
join public.provinces p on lower(p.id) = lower(coalesce(v.value->>'id', ''))
where s.key = 'provinces'
  and length(trim(coalesce(v.value->>'instagramHandle', ''))) between 1 and 30
on conflict (provider, scope_type, scope_id, handle) do nothing;

insert into public.organization_social_accounts(provider, province_id, handle, status)
select 'whatsapp_channel', p.id, trim(v.value->>'whatsappChannel'), 'not_connected'
from public.settings s
cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) v(value)
join public.provinces p on lower(p.id) = lower(coalesce(v.value->>'id', ''))
where s.key = 'provinces'
  and length(trim(coalesce(v.value->>'whatsappChannel', ''))) between 1 and 200
on conflict (provider, scope_type, scope_id, handle) do nothing;

-- Map legacy root, branch, and nested-unit labels only when they uniquely
-- identify one university. This keeps existing campus ownership intact.
create temporary table legacy_campus_university_label_map on commit drop as
with labels as (
  select u.id as university_id, lower(trim(value.label)) as label
  from public.universities u
  cross join lateral (values (u.id), (u.code), (u.name)) value(label)
  union all
  select u.id, lower(trim(value.label))
  from public.settings s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) entry(value)
  join legacy_campus_roots roots on roots.campus_id = lower(trim(coalesce(entry.value->>'id', '')))
  join public.universities u on u.id = roots.university_id
  cross join lateral (values (entry.value->>'id'), (entry.value->>'shortName'), (entry.value->>'name')) value(label)
  where s.key = 'campuses' and nullif(trim(coalesce(value.label, '')), '') is not null
  union all
  select u.id, lower(trim(value.label))
  from public.settings s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) root(value)
  join public.universities u on u.id = lower(trim(coalesce(root.value->>'id', '')))
  cross join lateral jsonb_array_elements(case when jsonb_typeof(root.value->'units') = 'array' then root.value->'units' else '[]'::jsonb end) unit(value)
  cross join lateral (values (unit.value->>'id'), (unit.value->>'shortName'), (unit.value->>'code'), (unit.value->>'name')) value(label)
  where s.key = 'campuses' and nullif(trim(coalesce(value.label, '')), '') is not null
), unambiguous as (
  select label, min(university_id) as university_id
  from labels where nullif(label, '') is not null
  group by label having count(distinct university_id) = 1
)
select label, university_id from unambiguous;
create unique index on legacy_campus_university_label_map(label);

-- Link existing operational records where the stored campus label maps
-- unambiguously to the imported university code, id, or name. Leave general
-- listings such as "Semua" unlinked instead of guessing their ownership.
alter table public.listings add column if not exists university_id text;
alter table public.listings add constraint listings_university_id_fkey
  foreign key (university_id) references public.universities(id) on update cascade on delete set null;
create index if not exists listings_university_status_created_idx
  on public.listings(university_id, status, created_at desc) where university_id is not null;
update public.listings l set university_id = m.university_id
from legacy_campus_university_label_map m
where l.university_id is null
  and lower(trim(coalesce(l.campus, ''))) = m.label;

alter table public.wanted_listings add column if not exists university_id text;
alter table public.wanted_listings add constraint wanted_listings_university_id_fkey
  foreign key (university_id) references public.universities(id) on update cascade on delete set null;
create index if not exists wanted_listings_university_status_created_idx
  on public.wanted_listings(university_id, status, created_at desc) where university_id is not null;
update public.wanted_listings w set university_id = m.university_id
from legacy_campus_university_label_map m
where w.university_id is null
  and lower(trim(coalesce(w.campus, ''))) = m.label;

alter table public.open_po_products add column if not exists university_id text;
alter table public.open_po_products add constraint open_po_products_university_id_fkey
  foreign key (university_id) references public.universities(id) on update cascade on delete set null;
create index if not exists open_po_products_university_active_idx
  on public.open_po_products(university_id, active) where university_id is not null;
update public.open_po_products p set university_id = m.university_id
from legacy_campus_university_label_map m
where p.university_id is null
  and lower(trim(coalesce(p.campus, ''))) = m.label;

create or replace function public.replace_national_organization(
  p_provinces jsonb,
  p_universities jsonb,
  p_units jsonb,
  p_accounts jsonb,
  p_legacy_campuses jsonb,
  p_actor_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if jsonb_typeof(p_provinces) <> 'array' or jsonb_typeof(p_universities) <> 'array'
     or jsonb_typeof(p_units) <> 'array' or jsonb_typeof(p_accounts) <> 'array'
     or jsonb_typeof(p_legacy_campuses) <> 'array' then
    raise exception 'Katalog organisasi tidak valid';
  end if;
  if jsonb_array_length(p_provinces) > 100 or jsonb_array_length(p_universities) not between 1 and 10000
     or jsonb_array_length(p_units) > 20000 or jsonb_array_length(p_accounts) > 20200 then
    raise exception 'Jumlah data organisasi melewati batas';
  end if;
  if exists (
    select 1 from public.provinces p
    where not exists (select 1 from jsonb_to_recordset(p_provinces) as incoming(id text) where incoming.id = p.id)
  ) then raise exception 'Provinsi tersimpan tidak dapat dihapus'; end if;
  if exists (
    select 1 from public.universities u
    where not exists (select 1 from jsonb_to_recordset(p_universities) as incoming(id text) where incoming.id = u.id)
  ) then raise exception 'Universitas tersimpan tidak dapat dihapus'; end if;
  if exists (
    select 1 from public.university_units unit_row
    where not exists (select 1 from jsonb_to_recordset(p_units) as incoming(id text) where incoming.id = unit_row.id)
  ) then raise exception 'Unit kampus tersimpan tidak dapat dihapus'; end if;

  insert into public.provinces(id, name, status, updated_at)
  select id, trim(name), case when active then 'active' else 'inactive' end, now()
  from jsonb_to_recordset(p_provinces) as province_rows(id text, name text, active boolean)
  on conflict (id) do update set name = excluded.name, status = excluded.status, updated_at = now();

  insert into public.universities(id, code, province_id, name, email_domains, status, updated_at)
  select id, upper(trim(code)), province_id, trim(name), coalesce(email_domains, '{}'), case when active then 'active' else 'inactive' end, now()
  from jsonb_to_recordset(p_universities) as university_rows(id text, code text, province_id text, name text, active boolean, email_domains text[])
  on conflict (id) do update set
    code = excluded.code, province_id = excluded.province_id, name = excluded.name, email_domains = excluded.email_domains,
    status = excluded.status, updated_at = now();

  insert into public.university_units(id, university_id, code, name, status, updated_at)
  select id, university_id, upper(trim(code)), trim(name), case when active then 'active' else 'inactive' end, now()
  from jsonb_to_recordset(p_units) as unit_rows(id text, university_id text, code text, name text, active boolean)
  on conflict (id) do update set
    university_id = excluded.university_id, code = excluded.code, name = excluded.name,
    status = excluded.status, updated_at = now();

  update public.organization_social_accounts account_row set status = 'inactive', updated_at = now()
  where account_row.status <> 'inactive'
    and not exists (
      select 1 from jsonb_to_recordset(p_accounts) as incoming(provider text, scope_type text, scope_id text, handle text)
      where incoming.provider = account_row.provider and incoming.scope_type = account_row.scope_type
        and incoming.scope_id = account_row.scope_id and incoming.handle = account_row.handle
    );
  insert into public.organization_social_accounts(provider, province_id, university_id, handle, status, created_by)
  select provider,
    case when scope_type = 'province' then scope_id else null end,
    case when scope_type = 'university' then scope_id else null end,
    trim(handle), 'not_connected', p_actor_id
  from jsonb_to_recordset(p_accounts) as account_rows(provider text, scope_type text, scope_id text, handle text)
  on conflict (provider, scope_type, scope_id, handle) do update set
    status = case when organization_social_accounts.status = 'connected' then 'connected' else 'not_connected' end,
    updated_at = now();

  insert into public.settings(key, value, updated_at)
  values ('provinces', p_provinces, now()), ('campuses', p_legacy_campuses, now())
  on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  return true;
end;
$$;

-- Backfill explicit role assignments from the existing scope grants.
insert into public.admin_role_assignments(user_id, role_code, province_id, university_id, status)
select g.user_id, 'province_admin', p.id, null, m.status
from public.admin_scope_grants g
join public.admin_memberships m on m.user_id = g.user_id
join public.provinces p on lower(p.id) = lower(g.scope_id)
where g.scope_type = 'province'
on conflict do nothing;

insert into public.admin_role_assignments(user_id, role_code, province_id, university_id, status)
select g.user_id, 'university_admin', null, u.id, m.status
from public.admin_scope_grants g
join public.admin_memberships m on m.user_id = g.user_id
join legacy_campus_university_label_map legacy on legacy.label = lower(trim(g.scope_id))
join public.universities u on u.id = legacy.university_id
where g.scope_type = 'campus'
on conflict do nothing;

-- Keep the existing owner editor compatible while ensuring each text scope
-- also creates a typed, foreign-key-backed role assignment.
-- SECURITY INVOKER is intentional: application RPC calls use service_role,
-- which already has narrowly granted table rights. This keeps the function
-- from inheriting its owner's privileges or bypassing RLS.
create or replace function public.replace_admin_membership(
  p_user_id uuid,
  p_display_name text,
  p_permissions jsonb,
  p_scopes jsonb,
  p_actor_id uuid
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_scope jsonb;
  v_type text;
  v_scope_id text;
  v_university_id text;
begin
  if p_user_id is null or length(trim(coalesce(p_display_name, ''))) not between 1 and 80
     or jsonb_typeof(p_permissions) <> 'object' or jsonb_typeof(p_scopes) <> 'array' then
    raise exception 'Data owner tidak valid';
  end if;
  if jsonb_array_length(p_scopes) < 1 or jsonb_array_length(p_scopes) > 40 then raise exception 'Cakupan owner tidak valid'; end if;

  insert into public.admin_memberships (user_id, display_name, status, permissions, created_by, updated_at)
  values (p_user_id, trim(p_display_name), 'active', p_permissions, p_actor_id, now())
  on conflict (user_id) do update set display_name = excluded.display_name, status = 'active', permissions = excluded.permissions, updated_at = now();

  delete from public.admin_scope_grants where user_id = p_user_id;
  delete from public.admin_role_assignments where user_id = p_user_id;
  for v_scope in select value from jsonb_array_elements(p_scopes) loop
    v_type := v_scope->>'scope_type';
    v_scope_id := lower(trim(coalesce(v_scope->>'scope_id', '')));
    if v_type = 'province' then
      if not exists (select 1 from public.provinces where id = v_scope_id and status = 'active') then raise exception 'Provinsi tidak ditemukan'; end if;
      insert into public.admin_scope_grants(user_id, scope_type, scope_id) values (p_user_id, 'province', v_scope_id);
      insert into public.admin_role_assignments(user_id, role_code, province_id, assigned_by)
      values (p_user_id, 'province_admin', v_scope_id, p_actor_id);
    elsif v_type in ('campus', 'university') then
      select id into v_university_id from public.universities
      where lower(id) = v_scope_id or lower(code) = v_scope_id limit 1;
      if v_university_id is null then raise exception 'Universitas tidak ditemukan'; end if;
      insert into public.admin_scope_grants(user_id, scope_type, scope_id) values (p_user_id, 'campus', v_university_id);
      insert into public.admin_role_assignments(user_id, role_code, university_id, assigned_by)
      values (p_user_id, 'university_admin', v_university_id, p_actor_id);
    else
      raise exception 'Jenis cakupan tidak valid';
    end if;
  end loop;

  insert into public.admin_audit_events(actor_id, action, target_id, metadata)
  values (p_actor_id, 'owner_access_saved', p_user_id::text, jsonb_build_object('permissions', p_permissions, 'scopes', p_scopes));
  return true;
end;
$$;

create or replace function public.decide_university_admin_request(
  p_request_id uuid,
  p_reviewer_id uuid,
  p_decision text,
  p_auth_user_id uuid default null,
  p_display_name text default null,
  p_invitation_sent boolean default false,
  p_review_note text default ''
) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request public.university_admin_requests%rowtype;
  v_permissions jsonb := '{"overview":["read"],"marketplace":["read","review"],"users":["read"],"reports":["read","manage"],"analytics":["read"],"content":["read","review"]}'::jsonb;
  v_existing_status text;
begin
  if p_decision not in ('approved', 'rejected') or p_reviewer_id is null then raise exception 'Keputusan tidak valid'; end if;
  select * into v_request from public.university_admin_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending' then raise exception 'Permintaan tidak tersedia untuk diputuskan'; end if;
  if v_request.requested_by = p_reviewer_id then raise exception 'Pemohon tidak dapat menyetujui permintaannya sendiri'; end if;
  if length(trim(coalesce(p_review_note, ''))) > 1000 then raise exception 'Catatan keputusan terlalu panjang'; end if;

  if p_decision = 'approved' then
    if p_auth_user_id is null or length(trim(coalesce(p_display_name, ''))) not between 2 and 100 then raise exception 'Akun undangan tidak valid'; end if;
    select status into v_existing_status from public.admin_memberships where user_id = p_auth_user_id;
    if v_existing_status = 'suspended' then raise exception 'Akun admin yang ditangguhkan tidak dapat diaktifkan lewat permintaan ini'; end if;
    insert into public.admin_memberships(user_id, display_name, status, permissions, created_by, updated_at)
    values (p_auth_user_id, trim(p_display_name), 'active', v_permissions, p_reviewer_id, now())
    on conflict (user_id) do update set
      display_name = case when trim(public.admin_memberships.display_name) = '' then excluded.display_name else public.admin_memberships.display_name end,
      updated_at = now();
    insert into public.admin_scope_grants(user_id, scope_type, scope_id)
    values (p_auth_user_id, 'campus', v_request.university_id)
    on conflict (user_id, scope_type, scope_id) do nothing;
    insert into public.admin_role_assignments(user_id, role_code, university_id, assigned_by)
    values (p_auth_user_id, 'university_admin', v_request.university_id, p_reviewer_id)
    on conflict do nothing;
  end if;

  update public.university_admin_requests set
    status = p_decision,
    reviewed_by = p_reviewer_id,
    reviewed_at = now(),
    review_note = trim(coalesce(p_review_note, '')),
    invitation_sent_at = case when p_decision = 'approved' and p_invitation_sent then now() else invitation_sent_at end,
    invitation_expires_at = null,
    updated_at = now()
  where id = p_request_id;
  insert into public.admin_audit_events(actor_id, action, target_id, metadata)
  values (p_reviewer_id, 'university_admin_request_' || p_decision, p_request_id::text,
    jsonb_build_object('university_id', v_request.university_id, 'province_id', v_request.province_id, 'requested_email', v_request.requested_email));
  return true;
end;
$$;

create or replace function public.create_university_admin_request(
  p_requester_id uuid,
  p_province_id text,
  p_university_id text,
  p_requested_email text,
  p_requested_name text,
  p_note text default ''
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request public.university_admin_requests%rowtype;
begin
  if p_requester_id is null or length(trim(coalesce(p_requested_email, ''))) not between 5 and 254
     or length(trim(coalesce(p_requested_name, ''))) not between 2 and 100
     or length(coalesce(p_note, '')) > 1000 then
    raise exception 'Data permintaan Admin Universitas tidak valid';
  end if;
  if not exists (
    select 1 from public.universities u join public.provinces p on p.id = u.province_id
    where u.id = p_university_id and u.province_id = p_province_id and u.status = 'active' and p.status = 'active'
  ) then raise exception 'Universitas tidak aktif atau tidak berada di provinsi yang dipilih'; end if;

  insert into public.university_admin_requests(requested_by, province_id, university_id, requested_email, requested_name, note)
  values (p_requester_id, p_province_id, p_university_id, lower(trim(p_requested_email)), trim(p_requested_name), trim(coalesce(p_note, '')))
  returning * into v_request;
  insert into public.admin_audit_events(actor_id, action, target_id, metadata)
  values (p_requester_id, 'university_admin_request_created', v_request.id::text,
    jsonb_build_object('province_id', p_province_id, 'university_id', p_university_id));
  return jsonb_build_object('id', v_request.id, 'status', v_request.status, 'created_at', v_request.created_at);
end;
$$;

create or replace function public.cancel_university_admin_request(p_request_id uuid, p_requester_id uuid) returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request public.university_admin_requests%rowtype;
begin
  select * into v_request from public.university_admin_requests
  where id = p_request_id and requested_by = p_requester_id and status = 'pending' for update;
  if not found then raise exception 'Permintaan tidak ditemukan atau sudah diproses'; end if;
  update public.university_admin_requests set status = 'cancelled', updated_at = now() where id = p_request_id;
  insert into public.admin_audit_events(actor_id, action, target_id, metadata)
  values (p_requester_id, 'university_admin_request_cancelled', p_request_id::text, '{}'::jsonb);
  return true;
end;
$$;

create or replace function public.expire_university_admin_requests(p_cutoff timestamptz, p_actor_id uuid, p_province_ids text[] default null) returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_request_id uuid;
  v_count integer := 0;
begin
  if p_cutoff is null or p_actor_id is null then raise exception 'Parameter kedaluwarsa tidak valid'; end if;
  for v_request_id in
    update public.university_admin_requests set status = 'expired', updated_at = now()
    where status = 'pending' and created_at < p_cutoff
      and (p_province_ids is null or province_id = any(p_province_ids))
    returning id
  loop
    insert into public.admin_audit_events(actor_id, action, target_id, metadata)
    values (p_actor_id, 'university_admin_request_expired', v_request_id::text, '{}'::jsonb);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

alter table public.provinces enable row level security;
alter table public.universities enable row level security;
alter table public.university_units enable row level security;
alter table public.admin_role_assignments enable row level security;
alter table public.university_admin_requests enable row level security;
alter table public.organization_social_accounts enable row level security;

revoke all on table public.provinces, public.universities, public.university_units,
  public.admin_role_assignments, public.university_admin_requests, public.organization_social_accounts
  from public, anon, authenticated;
grant select, insert, update, delete on table public.provinces, public.universities, public.university_units,
  public.admin_role_assignments, public.university_admin_requests, public.organization_social_accounts to service_role;
revoke all on function public.replace_national_organization(jsonb,jsonb,jsonb,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.replace_national_organization(jsonb,jsonb,jsonb,jsonb,jsonb,uuid) to service_role;
revoke all on function public.replace_admin_membership(uuid,text,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.replace_admin_membership(uuid,text,jsonb,jsonb,uuid) to service_role;
revoke all on function public.decide_university_admin_request(uuid,uuid,text,uuid,text,boolean,text) from public, anon, authenticated;
grant execute on function public.decide_university_admin_request(uuid,uuid,text,uuid,text,boolean,text) to service_role;
revoke all on function public.create_university_admin_request(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_university_admin_request(uuid,text,text,text,text,text) to service_role;
revoke all on function public.cancel_university_admin_request(uuid,uuid) from public, anon, authenticated;
grant execute on function public.cancel_university_admin_request(uuid,uuid) to service_role;
revoke all on function public.expire_university_admin_requests(timestamptz,uuid,text[]) from public, anon, authenticated;
grant execute on function public.expire_university_admin_requests(timestamptz,uuid,text[]) to service_role;

comment on table public.provinces is 'Canonical province catalog for national organization and scoped operations.';
comment on table public.universities is 'Canonical university entities; each belongs to exactly one province.';
comment on table public.university_units is 'Optional campus branches and units that do not duplicate a university entity.';
comment on table public.admin_role_assignments is 'Multiple province/university admin roles per Auth user, separate from module grants.';
comment on table public.university_admin_requests is 'Province-submitted requests for central approval of university administrators.';
comment on table public.organization_social_accounts is 'Scoped social account identity and health only; never store OAuth tokens here.';

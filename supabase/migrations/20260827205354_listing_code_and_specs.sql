alter table public.listings
  add column if not exists specs jsonb not null default '{}'::jsonb;

alter table public.listings
  alter column listing_code set not null;

create unique index if not exists idx_listings_listing_code_unique
  on public.listings (listing_code);

create index if not exists idx_listings_specs_gin
  on public.listings using gin (specs);

comment on column public.listings.listing_code is
  'Kode iklan pendek berbasis sequence untuk rujukan cepat di WA dan URL /c/{code}.';

comment on column public.listings.specs is
  'Spesifikasi terstruktur per kategori listing dalam bentuk JSONB.';

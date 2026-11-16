# Database Schema & Migrations

## Overview

- **Database**: PostgreSQL 15+ (Supabase)
- **ORM**: Direct SQL + PostgREST (no Prisma/TypeORM)
- **Migrations**: Raw SQL files in `supabase/` and `supabase/migrations/`
- **RLS**: Enabled on all tables — see `supabase/migration_rls.sql`

---

## Table Catalog

| Table | Purpose | RLS Policy |
|-------|---------|------------|
| `listings` | Core marketplace listings | Public read `active`/`sold` |
| `seller_profiles` | Seller public profiles | Public read all |
| `payments` | Payment transactions (QRIS, sold_fee, bump, featured) | **No anon access** |
| `price_offers` | Buyer price negotiations | **No anon access** |
| `seller_ratings` | Ratings & reviews | Public read all |
| `reports` | User reports on listings/users | **No anon access** |
| `blacklist` | Blocked WA numbers | **No anon access** |
| `settings` | System configuration (JSONB) | **No anon access** |
| `blogs` | Admin blog articles | Public read all |
| `categories` | Listing categories | Public read all |
| `wanted_listings` | "Wanted" posts (buyer requests) | Public read `active` |
| `group_posts` | WA group messages indexed by bot | **No anon access** |
| `scheduled_broadcasts` | Scheduled WA broadcasts | **No anon access** |
| `category_subscriptions` | Keyword/category notifications | **No anon access** |
| `otps` | Web password recovery codes | **No anon access** |
| `referrals` | Referral tracking | **No anon access** |
| `profile_change_requests` | Seller name change requests | **No anon access** |
| `search_logs` | Search analytics | **No anon access** |
| `admin_logs` | Admin action audit trail | **No anon access** |
| `error_logs` | Application error logging | **No anon access** |
| `admin_role_assignments` | Admin RBAC assignments | **No anon access** |
| `admin_memberships` | Admin workspace membership | **No anon access** |
| `admin_scope_grants` | Admin scope (province/campus) | **No anon access** |
| `admin_audit_events` | Admin action logging | **No anon access** |
| `wa_outbox` | WA message queue (bot picks up) | **No anon access** |
| `push_subscriptions` | Web Push API subscriptions | **No anon access** |
| `pwa_installs` | PWA install tracking | **No anon access** |
| `universities` | Campus reference data | Public read `active` |
| `provinces` | Province reference data | Public read `active` |

---

## Key Table Schemas

### `listings` (Core)
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  university_id TEXT NOT NULL,
  seller_university_id TEXT,
  seller_province_id TEXT,
  seller_name TEXT NOT NULL,
  seller_wa TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL DEFAULT 0,
  distributor_fee BIGINT,
  stock INT NOT NULL DEFAULT 1,
  category TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'barang', -- barang, jasa, sewa, poster
  rental_period TEXT, -- harian, mingguan, bulanan
  image_url TEXT,
  images JSONB, -- gallery array
  status TEXT NOT NULL DEFAULT 'pending', -- active, pending, sold, expired, rejected, suspended
  moderation_reason TEXT,
  risk_score NUMERIC DEFAULT 0,
  campus TEXT,
  area TEXT,
  condition TEXT DEFAULT 'used', -- new, used
  specs JSONB,
  bumped_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_listings_status_campus ON listings(status, campus);
CREATE INDEX idx_listings_seller_wa ON listings(seller_wa);
CREATE INDEX idx_listings_university_id ON listings(university_id);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
```

### `seller_profiles`
```sql
CREATE TABLE seller_profiles (
  wa TEXT PRIMARY KEY,
  phone_wa TEXT,
  name TEXT,
  slug TEXT UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  home_university_id TEXT,
  verified_university_id TEXT,
  affiliation_status TEXT, -- verified_student, unverified, alumni
  student_verified BOOLEAN DEFAULT false,
  campus TEXT,
  fyp_province_id TEXT,
  marketplace_province_id TEXT,
  distributor BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free', -- free, pro
  subscription_expires_at TIMESTAMPTZ,
  avatar_url TEXT,
  bio TEXT,
  rating_avg NUMERIC DEFAULT 0,
  rating_count INT DEFAULT 0,
  total_sales INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  midtrans_order_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- iklan, bump, featured, auto_bump, renew, sold_fee, unlock_wanted
  amount BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, failed, expired, refunded
  meta JSONB, -- { final_amount, fee_breakdown, receipt_hash, ... }
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_listing ON payments(listing_id);
CREATE INDEX idx_payments_midtrans ON payments(midtrans_order_id);
CREATE INDEX idx_payments_status_type ON payments(status, type);
```

### `settings` (System Config - JSONB)
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Keys: 'pricing', 'distributor', 'categories', 'campuses', 'moderation', 'features', 'branding', 'instagram'
```

### `admin_role_assignments` (RBAC)
```sql
CREATE TABLE admin_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_code TEXT NOT NULL, -- superadmin, province_admin, university_admin
  province_id TEXT,
  university_id TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, revoked
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE(user_id, role_code, province_id, university_id)
);
```

---

## Migration System

### File Organization
```
supabase/
├── schema.sql                          # Base schema (run once)
├── migration_semua_sekali_jalan.sql    # MASTER: all migrations combined (idempotent)
├── migration_rls.sql                   # Base RLS policies
├── migration_rls_kunci_publik.sql      # Hardened RLS (no anon on sensitive tables)
├── migration_*.sql                     # Feature-specific incremental migrations
└── migrations/                         # Timestamped Supabase CLI migrations
    └── 2026XXXXXX_name.sql
```

### Running Migrations

**Production (one-time setup):**
```bash
# In Supabase SQL Editor, run in order:
1. supabase/schema.sql
2. supabase/migration_semua_sekali_jalan.sql
3. supabase/migration_rls_kunci_publik.sql
```

**Development (Supabase CLI):**
```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db reset

# Create new migration
supabase migration new my_feature
# Edit supabase/migrations/XXXXXX_my_feature.sql
supabase db reset  # Test
```

### Migration Best Practices

1. **Always idempotent**: Use `IF NOT EXISTS`, `ON CONFLICT`, `DO NOTHING`
2. **RLS first**: Enable RLS before creating policies
3. **Test locally**: `supabase db reset` before pushing
4. **One master file**: `migration_semua_sekali_jalan.sql` for production bootstrap
5. **No destructive changes**: Never `DROP COLUMN` in production — add new, deprecate old

---

## RLS Policy Reference

### Public Read Policies (Anon Key)
```sql
-- Listings: only active/sold visible
CREATE POLICY "anon_read_active_listings"
  ON listings FOR SELECT TO anon
  USING (status IN ('active', 'sold'));

-- Seller profiles: all public
CREATE POLICY "anon_read_seller_profiles"
  ON seller_profiles FOR SELECT TO anon USING (true);

-- Categories, blogs, ratings, wanted: all public
```

### No Anon Access (Sensitive Tables)
```sql
-- These tables have RLS enabled but NO policies for anon/authenticated
-- Access ONLY via Service Role (server API routes)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
-- ... etc
```

### Service Role Bypass
- Service Role key **automatically bypasses all RLS** in Supabase
- Used in `src/lib/supabaseAdmin.js` → `getAdminClient()`
- **Never** expose Service Role to client (browser)

---

## Seeding

### Dummy Data (Development Only)
```bash
# 20 sample listings
psql -f supabase/seed_dummy_20.sql
```

### Admin User Setup
```bash
# Create superadmin in Supabase Auth, then run:
psql -f supabase/seed_up_admin.sql
```

---

## Common Queries

### Get Active Listings with Seller Info
```sql
SELECT l.*, sp.name as seller_name, sp.avatar_url, sp.rating_avg
FROM listings l
JOIN seller_profiles sp ON l.seller_wa = sp.wa
WHERE l.status = 'active'
  AND l.university_id = 'usu'
ORDER BY l.bumped_at DESC
LIMIT 20;
```

### Seller Dashboard Stats
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'active') as active,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'sold') as sold,
  COUNT(*) FILTER (WHERE status = 'expired') as expired,
  COALESCE(SUM(price) FILTER (WHERE status = 'sold'), 0) as total_gmv
FROM listings
WHERE seller_wa = '081234567890';
```

### Payment Reconciliation
```sql
SELECT p.*, l.title, l.seller_wa
FROM payments p
JOIN listings l ON p.listing_id = l.id
WHERE p.status = 'paid'
  AND p.type = 'iklan'
  AND p.paid_at > NOW() - INTERVAL '30 days'
ORDER BY p.paid_at DESC;
```

---

## Backup & Recovery

- **Automated**: Supabase daily backups (point-in-time recovery 7 days)
- **Manual**: `supabase db dump --data-only > backup.sql`
- **RLS Policies**: Included in schema dump

---

## Performance Tuning

| Table | Index Strategy |
|-------|----------------|
| `listings` | Composite: `(status, university_id, bumped_at)` |
| `payments` | `(listing_id, status)`, `(midtrans_order_id)` |
| `seller_profiles` | PK on `wa`, index on `user_id` |
| `search_logs` | Partition by month (pg_partman) |
| `admin_audit_events` | Index on `(actor_id, created_at)` |

---

*Last updated: 2024-11-16*
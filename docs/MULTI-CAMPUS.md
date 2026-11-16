# Multi-Campus Forking Guide

This guide explains how to fork Kampus Kita for another campus/community.

---

## The Problem (Before)

Campus-specific values were hardcoded in 50+ files:

```javascript
// ❌ Scattered across codebase
"USU", "POLMED", "jualbeliusupolmed", "@usupolmedkatalog"
"kampuskita.my.id", "Sumatera Utara", "sumatera-utara"
"120363422379479724@g.us"  // WhatsApp group JID
```

Forking required massive `grep`/`replace` and high risk of missing references.

---

## The Solution (After)

**All campus configuration centralized in one file:**

```
src/config/campus.ts  ← ONLY FILE TO CHANGE
```

---

## Quick Fork (5 Minutes)

### 1. Fork the Repository

```bash
# On GitHub: Fork jualbeliusupolmed-creator/jualbeliusupolmed
# Clone your fork
git clone https://github.com/YOUR_USERNAME/jualbeliusupolmed.git
cd jualbeliusupolmed
```

### 2. Edit Campus Config

```bash
# Open the single config file
code src/config/campus.ts
```

Change these sections:

```typescript
// 1. Core identity
name: 'My Campus Marketplace',
domain: 'mycampus.edu',                    // Your domain
defaultCampus: 'myuni',                    // Primary campus ID
provinceDefault: 'your-province',          // e.g., 'dki-jakarta'

// 2. Campuses served
campuses: [
  {
    id: 'myuni',
    name: 'My University',
    shortName: 'MYUNI',
    provinceId: 'your-province',
    emailDomains: ['myuni.ac.id', 'student.myuni.ac.id'],
    instagramHandle: '@myunikatalog',
    whatsappGroupId: 'YOUR_GROUP_JID@g.us',
    whatsappGroupLink: 'https://chat.whatsapp.com/YOUR_LINK',
  },
  // Add more campuses if needed
],

// 3. Fees (local currency)
fees: {
  listing: 5000,        // IDR 5.000
  bump: 3000,
  featuredPerDay: 8000,
  autoBump7Days: 20000,
  renew: 3000,
  distributorDefaultRules: [...],
},

// 4. Branding
branding: {
  siteName: 'My Campus Marketplace',
  siteShortName: 'MyCampus',
  description: 'Marketplace mahasiswa Kampus Saya',
  themeColor: '#1e40af',      // Your brand color
  primaryColor: '#3b82f6',
  secondaryColor: '#06b6d4',
},

// 5. WhatsApp
whatsapp: {
  marketplaceNumber: '628xxxxxxxxxx',
  publicNumber: '628xxxxxxxxxx',
  mainGroupId: 'YOUR_GROUP_JID@g.us',
  broadcastGroups: ['GROUP1@g.us', 'GROUP2@g.us'],
  groupLink: 'https://chat.whatsapp.com/YOUR_LINK',
},

// 6. Instagram
instagram: {
  menfessAccountId: 'IG_USER_ID',
  katalogAccountId: 'IG_USER_ID',
  menfessHandle: '@myunimenfess',
  katalogHandle: '@katalogmyuni',
},
```

### 3. Update Environment Variables

Copy `.env.example` → `.env.local` and update:

```bash
# Core
NEXT_PUBLIC_BASE_URL=https://mycampus.edu
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# WhatsApp
FONNTE_WA_GROUP_ID=YOUR_GROUP_JID@g.us
NEXT_PUBLIC_WA_GROUP_LINK=https://chat.whatsapp.com/YOUR_LINK
BAILEYS_API_URL=https://bot.mycampus.edu
BAILEYS_API_TOKEN=shared-secret

# Instagram
META_KATALOG_IG_USER_ID=...
META_KATALOG_IG_ACCESS_TOKEN=...

# Admin
SUPERADMIN_AUTH_USER_ID=...
ADMIN_SESSION_SECRET=...
SESSION_SECRET=...
```

### 4. Supabase Setup

```sql
-- 1. Run migrations (in Supabase SQL Editor):
--    supabase/schema.sql
--    supabase/migration_semua_sekali_jalan.sql
--    supabase/migration_rls_kunci_publik.sql

-- 2. Update universities table with your campus:
INSERT INTO universities (id, code, name, province_id, email_domains, status)
VALUES ('myuni', 'MYUNI', 'My University', 'your-province', ARRAY['myuni.ac.id'], 'active');

-- 3. Create admin user in Supabase Auth, then:
--    UPDATE auth.users SET raw_user_meta_data = jsonb_set(...) WHERE id = '...';
--    Or run supabase/seed_up_admin.sql with your UUID
```

### 5. Deploy

**Vercel (Web):**
1. Import forked repo
2. Add all env vars from `.env.local`
3. Deploy

**VPS (Bot):**
1. Clone fork on VPS
2. `cd bot-wa && npm ci`
3. Create `.env` with bot env vars
4. `pm2 start index.js --name wa-bot-myuni`
4. Nginx + SSL for `bot.mycampus.edu`

---

## What Changes Automatically

After updating `src/config/campus.ts`, these update automatically:

| Feature | Uses Config |
|---------|-------------|
| Site name / meta tags | `campusConfig.branding.siteName` |
| Fee calculations | `campusConfig.fees` |
| Campus dropdown in forms | `campusConfig.campuses` |
| WhatsApp group links | `campusConfig.whatsapp` |
| Instagram handles | `campusConfig.instagram` |
| Email domain verification | `campusConfig.campuses[].emailDomains` |
| Default campus selection | `campusConfig.defaultCampus` |
| Province mapping | `campusConfig.campuses[].provinceId` |
| Feature flags | `campusConfig.features` |

---

## Files That Reference Campus Config

```typescript
// Import pattern used throughout codebase:
import { campusConfig, getCampusById, getDefaultCampus } from '@/config/campus'

// Examples of usage:
campusConfig.name                    // Site title
campusConfig.campuses                // Dropdown options
getCampusById('usu')                 // Campus details
getDefaultCampus()                   // Fallback campus
campusConfig.fees.listing            // Fee amounts
campusConfig.whatsapp.mainGroupId    // WA group JID
campusConfig.instagram.katalogHandle // IG handle
isFeatureEnabled('freeMode')         // Feature flags
```

**No other files need modification** for a basic fork.

---

## Advanced: Per-Campus Fee Overrides

Fees can be customized per-campus in Supabase `settings` table:

```sql
-- Override fees for specific campus
INSERT INTO settings (key, value)
VALUES ('fees_myuni', '{
  "listing": 3000,
  "bump": 2000,
  "featuredPerDay": 6000
}');
```

The code checks campus-specific settings first, falls back to `campusConfig.fees`.

---

## Checklist for New Campus

- [ ] Fork repo
- [ ] Edit `src/config/campus.ts`
- [ ] Update `.env.local` / `.env` with new values
- [ ] Create Supabase project
- [ ] Run 3 migration files in order
- [ ] Insert campus into `universities` table
- [ ] Create admin user in Supabase Auth
- [ ] Deploy web to Vercel
- [ ] Deploy bot to VPS
- [ ] Configure custom domains
- [ ] Test: create listing → verify appears → test WA notification
- [ ] Update README.md with new campus info

---

## Common Pitfalls

| Issue | Cause | Fix |
|-------|-------|-----|
| "Invalid campus" error | Campus ID not in `universities` table | Insert into `universities` |
| WA broadcast fails | `FONNTE_WA_GROUP_ID` wrong | Check JID format: `120363...@g.us` |
| Instagram auto-publish fails | `META_KATALOG_IG_USER_ID` empty | Add Instagram Business account ID |
| Fee shows wrong amount | Campus-specific override in DB | Check `settings` table for `fees_<campus>` |
| Default campus not working | `defaultCampus` not in `campuses` array | Ensure ID matches exactly |

---

## Migration from Old Hardcoded Version

If you have a customized fork with hardcoded values:

1. **Audit**: `grep -r "USU\|POLMED\|jualbeliusupolmed" --include="*.ts" --include="*.tsx" src/`
2. **Replace**: Each occurrence with `campusConfig.xxx` import
3. **Test**: Run full test suite `npm run test`
4. **Verify**: Check all campus references resolved

---

*Last updated: 2024-11-16*
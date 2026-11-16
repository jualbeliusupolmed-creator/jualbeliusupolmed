# Self-Hosting Guide

Complete guide to running Kampus Kita on your own infrastructure.

---

## Architecture Options

| Component | Recommended | Alternative |
|-----------|-------------|-------------|
| **Web App** | Vercel (free tier) | Docker + VPS, Railway, Render |
| **Database** | Supabase Cloud (free tier) | Self-hosted PostgreSQL + PostgREST |
| **WhatsApp Bot** | VPS (Ubuntu) | Docker on same VPS, separate VPS |
| **File Storage** | Supabase Storage | Cloudflare R2, AWS S3, MinIO |
| **AI Moderation** | Google Gemini API | Self-hosted LLM (Ollama + Llama) |

---

## Option A: Vercel + Supabase + VPS (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free)
- Supabase account (free tier: 500MB DB, 1GB storage)
- VPS: Ubuntu 22.04+, 2GB RAM, 1 vCPU (~$5/mo)
- Domain name (optional, for custom domain)

### 1. Supabase Setup

```bash
# 1. Create project at https://supabase.com
# 2. Note down from Project Settings → API:
#    - Project URL → NEXT_PUBLIC_SUPABASE_URL
#    - anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - service_role → SUPABASE_SERVICE_ROLE_KEY

# 3. Run migrations in SQL Editor (in order):
#    a) supabase/schema.sql
#    b) supabase/migration_semua_sekali_jalan.sql
#    c) supabase/migration_rls_kunci_publik.sql

# 4. Create admin user:
#    - Supabase Auth → Add user (email/password)
#    - Copy User UUID → SUPERADMIN_AUTH_USER_ID
#    - Run supabase/seed_up_admin.sql with that UUID
```

### 2. Web App Deploy (Vercel)

```bash
# 1. Push repo to GitHub
git push origin main

# 2. Import in Vercel: https://vercel.com/new
#    - Select GitHub repo
#    - Framework: Next.js (auto-detected)
#    - Root Directory: ./

# 3. Add Environment Variables (Project Settings → Environment Variables):
#    Copy ALL from .env.example, fill in:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPERADMIN_AUTH_USER_ID=
ADMIN_SESSION_SECRET=          # openssl rand -base64 32
ADMIN_PASSWORD=                # min 16 chars, fallback only
SESSION_SECRET=                # openssl rand -base64 32, separate from admin
# ... all other vars from .env.example

# 4. Deploy → Automatic on push to main
```

### 3. WhatsApp Bot Deploy (VPS)

```bash
# On your VPS (SSH in):

# 1. Install dependencies
sudo apt update && sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx git
# Verify Node 22+: node --version

# 2. Install PM2 globally
sudo npm i -g pm2

# 3. Clone repo
git clone https://github.com/YOUR_USERNAME/jualbeliusupolmed.git
cd jualbeliusupolmed/bot-wa

# 4. Install bot dependencies
npm ci

# 5. Create .env
cp .env.example .env
# Edit with production values:
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BAILEYS_API_TOKEN=           # Same as web app's BAILEYS_API_TOKEN
FONNTE_TOKEN=
ADMIN_WA=628xxxxxxxxxx

# 6. Start bot
pm2 start index.js --name wa-bot-usu

# 7. Configure PM2 persistence
pm2 save
pm2 startup systemd
# Run the command it outputs

# 8. Nginx + SSL
sudo tee /etc/nginx/sites-available/wa-bot <<'EOF'
server {
    listen 80;
    server_name bot.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
server {
    listen 443 ssl http2;
    server_name bot.yourdomain.com;
    ssl_certificate /etc/letsencrypt/live/bot.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bot.yourdomain.com/privkey.pem;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/wa-bot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 9. SSL
sudo certbot --nginx -d bot.yourdomain.com
```

### 4. Connect Web ↔ Bot

In Vercel env vars, set:
```
BAILEYS_API_URL=https://bot.yourdomain.com
BAILEYS_API_TOKEN=<same as bot's BAILEYS_API_TOKEN>
```

In bot `.env`, ensure:
```
BAILEYS_API_TOKEN=<same value>
```

### 5. Custom Domain (Optional)

Vercel: Project Settings → Domains → Add `kampuskita.my.id`
DNS: Add CNAME `www` → `cname.vercel-dns.com`, A `@` → `76.76.21.21`

---

## Option B: Fully Self-Hosted (Docker)

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: kampuskita
      POSTGRES_USER: kampuskita
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./supabase/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
      - ./supabase/migration_semua_sekali_jalan.sql:/docker-entrypoint-initdb.d/02_migrations.sql
      - ./supabase/migration_rls_kunci_publik.sql:/docker-entrypoint-initdb.d/03_rls.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kampuskita"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgrest:
    image: postgrest/postgrest:v12
    environment:
      PGRST_DB_URI: postgres://kampuskita:${POSTGRES_PASSWORD}@postgres:5432/kampuskita
      PGRST_DB_SCHEMA: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${SUPABASE_JWT_SECRET}
    ports:
      - "3001:3000"
    depends_on:
      postgres:
        condition: service_healthy

  gotrue:
    image: supabase/gotrue:v2
    environment:
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://kampuskita:${POSTGRES_PASSWORD}@postgres:5432/kampuskita
      GOTRUE_SITE_URL: http://localhost:3000
      GOTRUE_JWT_SECRET: ${SUPABASE_JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
    ports:
      - "9999:9999"
    depends_on:
      postgres:
        condition: service_healthy

  storage:
    image: supabase/storage-api:v1
    environment:
      ANON_KEY: ${SUPABASE_ANON_KEY}
      SERVICE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      POSTGREST_URL: http://postgrest:3000
      STORAGE_BACKEND: file
      FILE_SIZE_LIMIT: 52428800
      TENANT_ID: kampuskita
      REGION: local
    volumes:
      - storage_data:/var/lib/storage
    ports:
      - "5000:5000"
    depends_on:
      - postgrest

  realtime:
    image: supabase/realtime:v2
    environment:
      PORT: 4000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: kampuskita
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: kampuskita
      DB_AFTER_CONNECT_QUERY: "SET search_path TO _realtime, public;"
      SECURE_CHANNELS: "true"
      SECRET_KEY_BASE: ${SECRET_KEY_BASE}
    ports:
      - "4000:4000"
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=http://localhost:3001
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPERADMIN_AUTH_USER_ID=
      - ADMIN_SESSION_SECRET=${ADMIN_SESSION_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - BAILEYS_API_URL=http://bot:3000
      - BAILEYS_API_TOKEN=${BAILEYS_API_TOKEN}
      # ... all other env vars
    ports:
      - "3000:3000"
    depends_on:
      - postgrest
      - gotrue
      - storage
      - realtime

  bot:
    build:
      context: ./bot-wa
      dockerfile: Dockerfile
    environment:
      - SUPABASE_URL=http://postgrest:3000
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - BAILEYS_API_TOKEN=${BAILEYS_API_TOKEN}
      - FONNTE_TOKEN=${FONNTE_TOKEN}
      - ADMIN_WA=${ADMIN_WA}
      - NODE_ENV=production
    volumes:
      - bot_auth:/app/auth_info_baileys
    depends_on:
      - postgrest
    restart: unless-stopped

volumes:
  postgres_data:
  storage_data:
  bot_auth:

networks:
  default:
    name: kampuskita-network
```

### Dockerfile (Web)

```dockerfile
# Dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

### next.config.mjs (Add for Docker)

```javascript
// Add to next.config.mjs
output: 'standalone',
```

### Dockerfile (Bot)

```dockerfile
# bot-wa/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
VOLUME ["/app/auth_info_baileys"]
EXPOSE 3000
CMD ["node", "index.js"]
```

### Deploy with Docker Compose

```bash
# 1. Create .env with ALL required variables
cp .env.example .env
# Edit .env with secure passwords

# 2. Generate secrets
openssl rand -base64 32  # for ADMIN_SESSION_SECRET, SESSION_SECRET, SUPABASE_JWT_SECRET, SECRET_KEY_BASE

# 3. Start
docker compose up -d

# 3. Run migrations (first time only)
docker compose exec postgres psql -U kampuskita -d kampuskita -f /docker-entrypoint-initdb.d/01_schema.sql
docker compose exec postgres psql -U kampuskita -d kampuskita -f /docker-entrypoint-initdb.d/02_migrations.sql
docker compose exec postgres psql -U kampuskita -d kampuskita -f /docker-entrypoint-initdb.d/03_rls.sql

# 4. Create admin user
# Use gotrue API or Supabase CLI

# 5. Check logs
docker compose logs -f web
docker compose logs -f bot
```

---

## Option C: Hybrid (Supabase Cloud + Self-Hosted Web + Bot)

Use Supabase Cloud for DB/Auth/Storage/Realtime, self-host only Next.js and Bot.

```bash
# Web: Docker on VPS/Railway/Render
# Bot: Docker on same or separate VPS
# Supabase: Cloud (managed)
```

---

## Environment Variables Reference

See `.env.example` for complete list. Critical ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Client-side key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only, full access |
| `SUPERADMIN_AUTH_USER_ID` | ✅ | Admin user UUID |
| `ADMIN_SESSION_SECRET` | ✅ | `openssl rand -base64 32` |
| `SESSION_SECRET` | ✅ | `openssl rand -base64 32` (separate!) |
| `BAILEYS_API_URL` | ✅ | Bot HTTP endpoint |
| `BAILEYS_API_TOKEN` | ✅ | Shared secret web↔bot |
| `FONNTE_TOKEN` | ✅ | WA gateway API |
| `GEMINI_API_KEY` | ✅ | AI moderation |
| `MIDTRANS_SERVER_KEY` | ⚠️ | QRIS payments |
| `CRON_SECRET` | ✅ | Cron endpoint auth |
| `VAPID_*` | ⚠️ | Push notifications |

---

## Post-Deployment Verification

```bash
# 1. Web health
curl https://yourdomain.com/api/health

# 2. Bot health
curl https://bot.yourdomain.com/health

# 3. Test listing creation
# - Go to /jual, fill form, submit
# - Verify appears on /jual-beli

# 4. Test WA bot
# - Send "!stats" from admin WA
# - Should receive system stats

# 5. Check admin panel
# - Login at /admin/login with Supabase Auth account
# - Verify all sections accessible
```

---

## Maintenance

### Bot Session Backup
```bash
# Manual backup
cd /path/to/bot-wa
./cadangkan-sesi.sh
# Creates: auth_info_baileys_YYYYMMDD_HHMMSS.tar.gz

# Restore
tar -xzf auth_info_baileys_20241116_020000.tar.gz
pm2 restart wa-bot-usu
```

### Database Backup
- Supabase Cloud: Automatic daily (7-day PITR)
- Self-hosted: `pg_dump -U kampuskita kampuskita > backup_$(date +%F).sql`

### Log Rotation
```bash
# PM2 logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### Updates
```bash
# Web (Vercel): Auto on push to main
# Web (Docker): docker compose pull && docker compose up -d
# Bot: git pull && npm ci && pm2 restart wa-bot-usu
```

---

## Troubleshooting

| Issue | Check |
|-------|-------|
| Web 500 | `vercel logs` or `docker compose logs web` |
| Bot not connecting | `docker compose logs bot` — check Supabase URL/token |
| RLS errors | Verify Service Role key in web env |
| WA QR not showing | Bot logs, check `auth_info_baileys/` permissions |
| Payments failing | Midtrans webhook URL accessible? Check `vercel.json` crons |
| Images not loading | Supabase Storage bucket public? Check CORS |

---

*Last updated: 2024-11-16*
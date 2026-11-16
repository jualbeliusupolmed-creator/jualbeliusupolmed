# WhatsApp Bot Architecture & Operations

## Overview

The WhatsApp bot is a separate Node.js process running on a VPS, independent of the Next.js web app. It uses **Baileys** (multi-device WhatsApp Web API) for communication.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        VPS (Ubuntu 22.04+)                      │
│  ┌──────────────┐    ┌──────────────────────────────────────┐  │
│  │   Nginx      │───▶│  PM2 Process Manager                   │  │
│  │  (SSL Term)  │    │  ┌────────────────────────────────┐   │  │
│  └──────────────┘    │  │  Baileys Bot (index.js)         │   │  │
│                      │  │  - Express HTTP API (/send,     │   │  │
│                      │  │    /health, /qr)                │   │  │
│                      │  │  - Event handlers:              │   │  │
│                      │  │    * messages.upsert            │   │  │
│                      │  │    * connection.update          │   │  │
│                      │  │    * creds.update               │   │  │
│                      │  │  - Supabase Realtime listeners  │   │  │
│                      │  │  - Polling workers:             │   │  │
│                      │  │    * wa_outbox → WA send        │   │  │
│                      │  │    * Health monitoring          │   │  │
│                      │  └────────────────────────────────┘   │  │
│                      └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │  Supabase     │   │ WhatsApp      │
            │  (PostgreSQL, │   │  Servers      │
            │   Realtime)   │   │  (Multi-dev)  │
            └───────────────┘   └───────────────┘
```

## Key Files

| File | Purpose |
|------|---------|
| `bot-wa/index.js` | Main entry point (167KB+) — all logic inlined |
| `bot-wa/package.json` | Dependencies: `@whiskeysockets/baileys`, `@supabase/supabase-js`, `express`, `pino` |
| `bot-wa/auth_info_baileys/` | Session persistence (creds, keys, pre-keys) — **gitignored** |
| `bot-wa/cadangkan-sesi.sh` | Backup session script |
| `bot-wa/penjaga-bot.sh` | Watchdog: restarts bot on crash |

## Environment Variables (VPS)

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
BAILEYS_API_TOKEN=xxx          # Must match web app's BAILEYS_API_TOKEN
FONNTE_TOKEN=xxx               # For group broadcasts via Fonnte API
ADMIN_WA=628xxxxxxxxxx         # Superadmin WA for alerts

# Optional
NODE_ENV=production
PORT=3000
```

## HTTP API Endpoints (Express)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/send` | POST | Bearer `BAILEYS_API_TOKEN` | Send WA message (text, image, document) |
| `/health` | GET | None | Health check for PM2/Nginx |
| `/qr` | GET | None | Returns QR code for pairing (if not paired) |
| `/status` | GET | Bearer | Connection status, uptime, memory |

## Core Functions

### 1. Broadcast Queue (`wa_outbox`)

**Web writes** → **Bot reads & sends**

```javascript
// Web (src/lib/fonnte.js)
await supa.from('wa_outbox').insert({
  target_type: 'group',        // 'group' | 'contact' | 'broadcast'
  target_id: '120363...@g.us', // JID
  message: { text: '📦 Iklan baru...' },
  media_url: 'https://...',    // optional
  priority: 1,                 // 1=high, 5=low
  retry_count: 0,
  status: 'pending'
});

// Bot (polling every 5s)
const { data: queue } = await supa.from('wa_outbox')
  .select('*').eq('status', 'pending').lte('retry_count', 3)
  .order('priority').order('created_at').limit(10);

for (const msg of queue) {
  await sock.sendMessage(msg.target_id, msg.message);
  await supa.from('wa_outbox')
    .update({ status: 'sent', sent_at: new Date() })
    .eq('id', msg.id);
}
```

### 2. Realtime Sync (Supabase → Bot)

Bot subscribes to table changes for instant notifications:

```javascript
// Payment notifications
supa.channel('payments_changes')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'payments',
    filter: 'type=eq.iklan'
  }, payload => {
    notifySeller(payload.new.seller_wa, `💰 Pembayaran diterima: ${payload.new.amount}`);
  })
  .subscribe();

// Listing status changes
supa.channel('listing_status')
  .on('postgres_changes', {
    event: 'UPDATE', schema: 'public', table: 'listings',
    filter: 'status=in.(active,sold,rejected)'
  }, payload => {
    notifyOwner(payload.new.seller_wa, `📢 Iklan "${payload.new.title}" sekarang ${payload.new.status}`);
  })
  .subscribe();
```

### 3. Admin Commands via WA

Admins control bot via WA messages (prefix `!`):

| Command | Description | Example |
|---------|-------------|---------|
| `!stats` | System statistics | `!stats` |
| `!broadcast <msg>` | Send to all groups | `!broadcast Maintenance 2AM` |
| `!ban <wa> [reason]` | Blacklist WA number | `!ban 628123456789 Spam` |
| `!unban <wa>` | Remove from blacklist | `!unban 628123456789` |
| `!pause` | Pause bot processing | `!pause` |
| `!resume` | Resume bot processing | `!resume` |
| `!setmode <free|paid>` | Toggle free mode | `!setmode free` |

```javascript
// Simplified handler
const adminCommands = {
  stats: async () => { /* query counts */ },
  broadcast: async (msg, args) => {
    const text = args.join(' ');
    await supa.from('wa_outbox').insert({
      target_type: 'broadcast',
      message: { text },
      priority: 1,
      status: 'pending'
    });
  },
  ban: async (msg, args) => {
    const wa = formatWa(args[0]);
    await supa.from('blacklist').insert({ wa, reason: args.slice(1).join(' ') });
  },
};
```

### 4. Health Monitoring

```javascript
setInterval(async () => {
  // 1. Update bot status in DB
  await supa.from('bot_status').upsert({
    id: 'main_bot',
    status: 'online',
    last_seen: new Date(),
    memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    uptime_sec: Math.round(process.uptime()),
  });

  // 2. Check Supabase connectivity
  try { await supa.from('bot_status').select('id').limit(1); }
  catch { await alertAdmin('🚨 Bot cannot reach Supabase!'); }

  // 3. Alert on high memory (>500MB)
  if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
    await alertAdmin(`⚠️ High memory: ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);
  }
}, 60000);
```

## Deployment Checklist

### Prerequisites
- [ ] Ubuntu 22.04+ / Debian 12
- [ ] Node.js 22+ (LTS)
- [ ] PM2 global (`npm i -g pm2`)
- [ ] Nginx + Certbot (SSL)
- [ ] Git + SSH key access to repo

### Environment Setup
```bash
# 1. Clone
git clone https://github.com/jualbeliusupolmed-creator/jualbeliusupolmed.git
cd jualbeliusupolmed/bot-wa

# 2. Install
npm ci

# 3. Create .env from example
cp .env.example .env
# Edit with production values

# 4. Start with PM2
pm2 start index.js --name wa-bot-usu

# 5. Save PM2 config for reboot persistence
pm2 save
pm2 startup systemd
```

### Nginx Config (`/etc/nginx/sites-available/wa-bot`)
```nginx
server {
    listen 80;
    server_name bot.kampuskita.my.id;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bot.kampuskita.my.id;

    ssl_certificate /etc/letsencrypt/live/bot.kampuskita.my.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bot.kampuskita.my.id/privkey.pem;

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
        
        # Rate limit for webhook endpoints
        limit_req zone=api burst=20 nodelay;
    }
}
```

### SSL (Certbot)
```bash
sudo certbot --nginx -d bot.kampuskita.my.id
# Auto-renewal: systemctl enable certbot.timer
```

## Session Management

- **Auth state**: Stored in `bot-wa/auth_info_baileys/` (creds.json, pre-keys, signedPreKey)
- **Backup**: `cadangkan-sesi.sh` creates timestamped tarball
- **Restore**: Extract tarball to `auth_info_baileys/`, restart bot
- **Multi-session**: Supported — run multiple bot instances with separate `auth_info_baileys_N/` directories

## Troubleshooting

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| Bot won't start | `pm2 logs wa-bot-usu` | Check env vars, Supabase connectivity |
| QR code not showing | `curl https://bot.domain/qr` | Ensure Nginx passes `/qr`, check Baileys state |
| Messages not sending | Check `wa_outbox` status=pending | Verify `BAILEYS_API_TOKEN` matches web, check Fonnte quota |
| High memory | `pm2 monit` | Restart: `pm2 restart wa-bot-usu` |
| Supabase disconnect | Logs show "connection lost" | Check VPS firewall, Supabase IP allowlist |

## Scaling (Future)

| Approach | Description |
|----------|-------------|
| **Multiple bots** | Run 2+ bot instances with different `auth_info_baileys_N/`, share `wa_outbox` queue |
| **Redis queue** | Replace DB polling with Redis BullMQ for higher throughput |
| **Webhook mode** | Configure Baileys to receive messages via HTTP webhook instead of long-poll |

---

*Last updated: 2024-11-16*
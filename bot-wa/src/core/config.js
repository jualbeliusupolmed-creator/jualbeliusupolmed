// bot-wa/src/core/config.js
require('dotenv').config();
const path = require('path');

const BOT_PREFIX = process.env.BOT_PREFIX || '.';
const BOT_SESSION_MS = Number(process.env.BOT_SESSION_MINUTES || 15) * 60 * 1000;
const BOT_END_WORDS = new Set(['admin', 'stop', 'selesai']);
const ADMIN_CALL_WORDS = new Set(
    (process.env.ADMIN_CALL_WORDS || 'min,mimin')
        .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
);
const ADMIN_CALL_COOLDOWN_MS = Number(process.env.ADMIN_CALL_COOLDOWN_SECONDS || 60) * 1000;
const PLAIN_COMMAND_WORDS = new Set(['jual', 'cari', 'menu', 'perpanjang', 'upgrade', 'saya', 'beli']);

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://www.jualbeliusupolmed.web.id/api/wa/baileys';
const API_TOKEN = process.env.API_TOKEN;
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '.'; 
const AUTH_DIR = process.env.AUTH_DIR || path.join(DATA_DIR, 'auth_info_baileys');
const MARKETPLACE_GROUP_JID = process.env.GROUP_JID || '';

const CONNECT_TIMEOUT_MS = Number(process.env.CONNECT_TIMEOUT_MS || 90000);
const QR_WAIT_TIMEOUT_MS = Number(process.env.QR_WAIT_TIMEOUT_MS || 600000);

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WA_SESSION_ID = process.env.WA_SESSION_ID || 'default';

const LOGOUT_STRIKES = Number(process.env.LOGOUT_STRIKES || 3);
const KUNCI_SESI = String(process.env.KUNCI_SESI ?? 'true') !== 'false';
const KUNCI_RETRY_MIN_MS = Number(process.env.KUNCI_RETRY_MIN_MINUTES || 10) * 60 * 1000;
const KUNCI_RETRY_MAX_MS = Number(process.env.KUNCI_RETRY_MINUTES || 60) * 60 * 1000;

const PINDAI_MAKS_SIKLUS = Number(process.env.PINDAI_MAKS_SIKLUS || 5);
const PINDAI_RETRY_MS = Number(process.env.PINDAI_RETRY_MINUTES || 30) * 60 * 1000;

const OFFLINE_ALERT_MS = Number(process.env.OFFLINE_ALERT_MINUTES || 5) * 60 * 1000;
const OWNER_NUMBER = process.env.OWNER_JID || '';
const OFFLINE_RESTART_MS = Number(process.env.OFFLINE_RESTART_MINUTES || 8) * 60 * 1000;
const OFFLINE_RESTART_MAX_MS = Number(process.env.OFFLINE_RESTART_MAX_MINUTES || 60) * 60 * 1000;
const ESCALATION_RESET_MS = Number(process.env.ESCALATION_RESET_MINUTES || 5) * 60 * 1000;

const MAX_SEND_ATTEMPTS = 3;
const REPLY_DELAY_MS = Number(process.env.REPLY_DELAY_MS || 2000);
const GAP_SAME_MIN_MS = Number(process.env.GAP_SAME_MIN_MS || 500);
const GAP_SAME_RAND_MS = Number(process.env.GAP_SAME_RAND_MS || 500);
const GAP_OTHER_MIN_MS = Number(process.env.GAP_OTHER_MIN_MS || 1500);
const GAP_OTHER_RAND_MS = Number(process.env.GAP_OTHER_RAND_MS || 2500);

const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const OUTBOX_TTL_MS = Number(process.env.OUTBOX_TTL_HOURS || 72) * 60 * 60 * 1000;
const OUTBOX_MAX = Number(process.env.OUTBOX_MAX || 500);

const DIBUANG_FILE = path.join(DATA_DIR, 'outbox-dibuang.json');
const DIBUANG_MAX = Number(process.env.DIBUANG_MAX || 200);
const DIBUANG_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const PANEL_PASSWORD = (process.env.PANEL_PASSWORD || '').trim();

module.exports = {
    BOT_PREFIX, BOT_SESSION_MS, BOT_END_WORDS, ADMIN_CALL_WORDS, ADMIN_CALL_COOLDOWN_MS,
    PLAIN_COMMAND_WORDS, WEBHOOK_URL, API_TOKEN, PORT, DATA_DIR, AUTH_DIR, MARKETPLACE_GROUP_JID,
    CONNECT_TIMEOUT_MS, QR_WAIT_TIMEOUT_MS, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WA_SESSION_ID,
    LOGOUT_STRIKES, KUNCI_SESI, KUNCI_RETRY_MIN_MS, KUNCI_RETRY_MAX_MS,
    PINDAI_MAKS_SIKLUS, PINDAI_RETRY_MS, OFFLINE_ALERT_MS, OWNER_NUMBER, OFFLINE_RESTART_MS,
    OFFLINE_RESTART_MAX_MS, ESCALATION_RESET_MS, MAX_SEND_ATTEMPTS, REPLY_DELAY_MS,
    GAP_SAME_MIN_MS, GAP_SAME_RAND_MS, GAP_OTHER_MIN_MS, GAP_OTHER_RAND_MS,
    OUTBOX_FILE, OUTBOX_TTL_MS, OUTBOX_MAX, DIBUANG_FILE, DIBUANG_MAX, DIBUANG_TTL_MS,
    PANEL_PASSWORD
};

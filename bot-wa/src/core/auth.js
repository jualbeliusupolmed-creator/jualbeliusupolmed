// bot-wa/src/core/auth.js
const crypto = require('crypto');

function createAuthManager(config, state) {
    const { API_TOKEN, PANEL_PASSWORD } = config;
    const AUTH_FAIL_MAX = Number(process.env.AUTH_FAIL_MAX || 10);
    const AUTH_FAIL_WINDOW_MS = Number(process.env.AUTH_FAIL_WINDOW_MINUTES || 5) * 60 * 1000;
    const authFails = state.authFails || new Map();
    state.authFails = authFails;

    setInterval(() => {
        const now = Date.now();
        for (const [ip, rec] of authFails) {
            if (now - rec.first > AUTH_FAIL_WINDOW_MS) authFails.delete(ip);
        }
    }, 60000).unref();

    function authBlocked(ip) {
        const rec = authFails.get(ip);
        if (!rec) return false;
        if (Date.now() - rec.first > AUTH_FAIL_WINDOW_MS) {
            authFails.delete(ip);
            return false;
        }
        return rec.count >= AUTH_FAIL_MAX;
    }

    function noteAuthFail(ip) {
        const rec = authFails.get(ip);
        if (!rec || Date.now() - rec.first > AUTH_FAIL_WINDOW_MS) {
            authFails.set(ip, { count: 1, first: Date.now() });
        } else {
            rec.count++;
            if (rec.count === AUTH_FAIL_MAX) {
                console.warn(`[auth] ${ip} diblokir sementara setelah ${rec.count} token/sandi salah.`);
            }
        }
    }

    function tokenMatches(given) {
        const a = Buffer.from(String(given || ''));
        const b = Buffer.from(String(API_TOKEN));
        if (a.length !== b.length) return false;
        return crypto.timingSafeEqual(a, b);
    }

    const cap = (v) => crypto.createHash('sha256').update(String(v ?? '')).digest();

    function passwordMatches(given) {
        if (!PANEL_PASSWORD) return false;
        return crypto.timingSafeEqual(cap(given), cap(PANEL_PASSWORD));
    }

    const KUKI_NAMA = 'panel_sesi';

    function kukiSah() {
        return crypto.createHmac('sha256', String(API_TOKEN))
            .update('panel-v1:' + PANEL_PASSWORD).digest('hex');
    }

    function kukiDari(req) {
        const mentah = req.headers.cookie || '';
        for (const bagian of mentah.split(';')) {
            const [k, ...v] = bagian.trim().split('=');
            if (k === KUKI_NAMA) return decodeURIComponent(v.join('='));
        }
        return '';
    }

    function sesiSah(req) {
        if (!PANEL_PASSWORD) return false;
        const punya = kukiDari(req);
        if (!punya) return false;
        try {
            return crypto.timingSafeEqual(cap(punya), cap(kukiSah()));
        } catch {
            return false;
        }
    }

    function bolehMasuk(req) {
        if (sesiSah(req)) return true;
        const h = req.headers.authorization;
        const q = req.query ? req.query.token : undefined;
        return tokenMatches(h) || tokenMatches(q) || passwordMatches(h) || passwordMatches(q);
    }

    function requireAuth(req, res, next) {
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        if (authBlocked(ip)) {
            return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
        }
        if (!bolehMasuk(req)) {
            noteAuthFail(ip);
            return res.status(401).json({ error: 'Unauthorized' });
        }
        next();
    }

    function requireAuthPage(req, res, next) {
        if (bolehMasuk(req)) return next();
        return res.redirect(302, `/masuk?next=${encodeURIComponent(req.originalUrl || req.url || '/')}`);
    }

    function requireRelink(req, res, next) {
        if (process.env.ALLOW_RELINK === 'true') return next();
        return res.status(403).json({ error: 'Endpoint terkunci demi keamanan. Set ALLOW_RELINK=true di server bila memang mau re-link/reset.' });
    }

    function requirePemulihan(req, res, next) {
        if (process.env.ALLOW_RELINK === 'true') return next();
        if (state.sesiTerkunci || state.sessionLostAt || (!state.connectedPhone)) return next();
        return res.status(403).json({ error: 'Terkunci demi keamanan: sesi bot masih hidup. Set ALLOW_RELINK=true di server bila memang mau.' });
    }

    return {
        tokenMatches,
        passwordMatches,
        kukiSah,
        sesiSah,
        bolehMasuk,
        authBlocked,
        noteAuthFail,
        requireAuth,
        requireAuthPage,
        requireRelink,
        requirePemulihan
    };
}

module.exports = createAuthManager;

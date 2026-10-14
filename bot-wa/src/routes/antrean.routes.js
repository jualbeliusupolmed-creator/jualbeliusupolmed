/*
 * Antrean kirim milik bot ini
 *
 * Dua antrean berbeda, dan bedanya penting: /antrean/data dan
 * /antrean/kirim adalah PROXY ke situs (pemilik antreannya tabel wa_outbox di
 * Supabase, dan VPS ini sengaja tidak punya kredensialnya), sedangkan
 * /antrean/lokal adalah antrean kirim milik proses ini sendiri.
 *
 * `K` itu konteks bersama yang dipegang index.js: konstanta, fungsi pembantu,
 * dan — yang paling penting — state bot yang terus berubah, dibaca lewat
 * getter. Ditulis `K.waSocket`, bukan disalin ke variabel lokal, karena
 * soketnya diganti tiap kali bot menyambung ulang; salinan yang diambil saat
 * modul dimuat akan menunjuk ke soket yang sudah mati.
 */
module.exports = function pasangRuteAntrean(app, K) {
    const { requireAuth, requireAuthPage, requireRelink, requirePemulihan } = K;
    // Yang stabil diambil sekali di sini; yang berubah sepanjang bot hidup
    // TIDAK — itu dibaca lewat K.<nama> supaya selalu nilai terbaru.
    const {
        DIBUANG_TTL_MS, OUTBOX_MAX, OUTBOX_TTL_MS, SITUS_OUTBOX,
        TTL_BALASAN_MS, botSiap, idTugas, kickQueue,
        messageQueue, simpanDibuang, simpanOutbox, socketAlive,
        terusanOutbox,
    } = K;

    app.get('/antrean/data', requireAuth, (req, res) => {
        const status = encodeURIComponent(String(req.query.status || 'tertunda'));
        return terusanOutbox(req, res, { url: `${SITUS_OUTBOX}?status=${status}&limit=200`, method: 'GET' });
    });

    app.post('/antrean/kirim', requireAuth, (req, res) => {
        return terusanOutbox(req, res, {
            url: SITUS_OUTBOX,
            method: 'POST',
            body: JSON.stringify(req.body || {}),
        });
    });

    app.get('/antrean/lokal', requireAuth, async (req, res) => {
        const sekarang = Date.now();
        const items = messageQueue.map((t) => ({
            id: idTugas(t),
            jid: t.jid,
            message: t.poll ? `[poll] ${t.poll.name || ''}` : (t.message || ''),
            url: t.url || null,
            ts: t.ts || null,
            kedaluwarsa: (t.ts || sekarang) + (t.ttl || TTL_BALASAN_MS),
            percobaan: t.attempts || 0,
            grup: String(t.jid || '').includes('@g.us'),
            jenis: 'user',
        }));

        const bQueue = K.broadcastQueue || [];
        const broadcastItems = bQueue.map((t) => ({
            id: idTugas(t),
            jid: t.jid,
            message: t.message || '',
            url: t.url || null,
            ts: t.ts || null,
            delayMs: t.delayMs || 5000,
            bcId: t.bcId || null,
            percobaan: t.attempts || 0,
            grup: String(t.jid || '').includes('@g.us'),
            jenis: 'broadcast',
        }));

        simpanOutbox();
        // Buang catatan yang sudah lewat 14 hari sebelum menjawab
        const batasCatatan = Date.now() - DIBUANG_TTL_MS;
        if (K.dibuangList.some((d) => (d.dibuangAt || 0) < batasCatatan)) {
            K.dibuangList = K.dibuangList.filter((d) => (d.dibuangAt || 0) >= batasCatatan);
            simpanDibuang();
        }
        const b1Siap = botSiap();
        const b2Siap = await K.bot2Siap();
        const siap = b1Siap || b2Siap;
        res.json({
            ok: true,
            siap,
            tersambung: socketAlive(),
            menungguPindai: K.menungguPindai,
            terkunci: K.sesiTerkunci,
            perangkatAktif: b1Siap ? 'utama' : (b2Siap ? 'cadangan' : 'none'),
            sebab: b1Siap ? null
                : b2Siap ? 'Menggunakan Perangkat 2 (Bot Cadangan) — Perangkat 1 (Bot Utama) belum tersambung.'
                : K.sesiTerkunci ? 'Sesi WhatsApp terkunci — perlu dibuka dari dashboard.'
                : K.menungguPindai ? 'Perangkat belum tertaut — QR/pairing menunggu dipindai.'
                : 'WhatsApp belum tersambung.',
            tertunda: items.length,
            items,
            broadcastTertunda: broadcastItems.length,
            broadcastItems,
            broadcastAktif: !!(K.bcStateAktif && K.bcStateAktif()),
            totalTertunda: items.length + broadcastItems.length,
            dibuang: K.dibuangList.slice(0, 50),
            dibuangTotal: K.dibuangList.length,
        });
    });

    app.post('/antrean/lokal', requireAuth, (req, res) => {
        const b = req.body || {};
        const bQueue = K.broadcastQueue || [];

        // Hapus per item (cek di antrean user maupun broadcast)
        if (b.hapus) {
            const targetId = String(b.hapus);
            const sebelumUser = messageQueue.length;
            const sisaUser = messageQueue.filter((t) => idTugas(t) !== targetId);
            messageQueue.length = 0;
            messageQueue.push(...sisaUser);
            simpanOutbox();

            const sebelumBc = bQueue.length;
            const sisaBc = bQueue.filter((t) => idTugas(t) !== targetId);
            bQueue.length = 0;
            bQueue.push(...sisaBc);

            const terhapus = (sebelumUser - messageQueue.length) + (sebelumBc - bQueue.length);
            return res.json({ ok: true, dihapus: terhapus, sisa: messageQueue.length + bQueue.length });
        }

        // Hapus antrean user saja
        if (b.hapus_user) {
            const dihapus = messageQueue.length;
            messageQueue.length = 0;
            simpanOutbox();
            return res.json({ ok: true, dihapus, sisaUser: 0 });
        }

        // Hapus/batalkan antrean broadcast saja
        if (b.hapus_broadcast || b.batal_broadcast) {
            const dihapus = bQueue.length;
            bQueue.length = 0;
            if (K.batalBroadcastAktif) K.batalBroadcastAktif();
            return res.json({ ok: true, dihapus, sisaBroadcast: 0 });
        }

        // Hapus SEMUA (User + Broadcast + Batalkan Broadcast State permanen)
        if (b.hapus_semua) {
            const dihapusUser = messageQueue.length;
            messageQueue.length = 0;
            simpanOutbox();

            const dihapusBc = bQueue.length;
            bQueue.length = 0;
            if (K.batalBroadcastAktif) K.batalBroadcastAktif();

            return res.json({
                ok: true,
                dihapus: dihapusUser + dihapusBc,
                dihapusUser,
                dihapusBroadcast: dihapusBc,
                sisa: 0,
            });
        }

        // Kirim ulang pesan yang dibuang
        if (b.ulang) {
            const c = K.dibuangList.find((d) => d.id === String(b.ulang));
            if (!c) return res.status(404).json({ error: 'Catatan tidak ditemukan.' });
            if (messageQueue.length >= OUTBOX_MAX) {
                return res.status(503).json({ error: 'Antrean penuh — coba lagi setelah antrean berkurang.' });
            }
            messageQueue.push({ jid: c.jid, message: c.message, url: c.url || undefined, ts: Date.now(), ttl: OUTBOX_TTL_MS });
            K.dibuangList = K.dibuangList.filter((d) => d.id !== c.id);
            simpanOutbox();
            simpanDibuang();
            kickQueue();
            return res.json({ ok: true, diantrekan: 1, sisa: messageQueue.length, siap: botSiap() });
        }

        if (b.hapus_catatan) {
            const sebelum = K.dibuangList.length;
            K.dibuangList = K.dibuangList.filter((d) => d.id !== String(b.hapus_catatan));
            simpanDibuang();
            return res.json({ ok: true, dihapusCatatan: sebelum - K.dibuangList.length });
        }

        if (b.bersihkan_catatan) {
            const dihapusCatatan = K.dibuangList.length;
            K.dibuangList = [];
            simpanDibuang();
            return res.json({ ok: true, dihapusCatatan });
        }

        if (b.kirim) {
            if (!botSiap()) {
                return res.status(409).json({
                    error: 'WhatsApp belum tersambung — antrean tetap disimpan dan berangkat sendiri begitu tersambung.',
                });
            }
            kickQueue();
            return res.json({ ok: true, dibangunkan: true, sisa: messageQueue.length + bQueue.length });
        }

        return res.status(400).json({ error: 'Aksi tidak dikenal. Pilih hapus, hapus_user, hapus_broadcast, hapus_semua, kirim, ulang, hapus_catatan, atau bersihkan_catatan.' });
    });
};

// bot-wa/src/utils/lock.js
const fs = require('fs');

function prosesHidup(pid) {
    if (!pid || pid <= 0) return false;
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return e.code === 'EPERM';
    }
}

function ambilKunciProses(lockFile) {
    const pidSekarang = process.pid;
    if (fs.existsSync(lockFile)) {
        try {
            const isi = fs.readFileSync(lockFile, 'utf8').trim();
            const pidLama = parseInt(isi, 10);
            if (pidLama && pidLama !== pidSekarang && prosesHidup(pidLama)) {
                console.error(`[kunci] Proses bot lain (PID ${pidLama}) sedang berjalan. Menolak start ganda.`);
                return false;
            }
            if (pidLama && pidLama !== pidSekarang) {
                console.warn(`[kunci] Kunci lama milik PID ${pidLama} yang sudah mati — diambil alih.`);
            }
        } catch (_) {}
    }
    try {
        fs.writeFileSync(lockFile, String(pidSekarang), { flag: 'w' });
        return true;
    } catch (e) {
        console.error('[kunci] Gagal menulis berkas kunci:', e.message);
        return false;
    }
}

function lepasKunciProses(lockFile) {
    try {
        if (!fs.existsSync(lockFile)) return;
        const isi = fs.readFileSync(lockFile, 'utf8').trim();
        if (parseInt(isi, 10) === process.pid) {
            fs.unlinkSync(lockFile);
        }
    } catch (_) {}
}

module.exports = {
    prosesHidup,
    ambilKunciProses,
    lepasKunciProses
};

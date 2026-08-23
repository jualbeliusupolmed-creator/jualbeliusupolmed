// bot-wa/src/utils/format.js

const INVISIBLE_RE = /[\u200B-\u200D\uFEFF\u00A0\u200E\u200F\u202A-\u202E]/g;

function stripInvisible(str) {
    return String(str || '').replace(INVISIBLE_RE, '');
}

function stripBotPrefix(text, prefix = '.') {
    const clean = stripInvisible(text).trim();
    if (clean.startsWith(prefix)) return clean.slice(prefix.length).trim();
    return clean;
}

function toJid(target) {
    let clean = String(target || '').replace(/[^0-9@.a-zA-Z_-]/g, '');
    if (clean.includes('@')) return clean;
    if (clean.startsWith('0')) clean = '62' + clean.slice(1);
    return `${clean}@s.whatsapp.net`;
}

function normalisasiNomor(v) {
    const digit = String(v ?? '').replace(/\D/g, '');
    if (!digit) return ''; // '' = kosongkan, sah
    const nomor = digit.startsWith('0') ? '62' + digit.slice(1) : digit;
    return (nomor.length >= 9 && nomor.length <= 15) ? nomor : null; // null = tidak sah
}

function dgnBatas(promise, ms, label = 'Operasi') {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} melebihi batas waktu ${Math.round(ms / 1000)} detik`)), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

module.exports = {
    INVISIBLE_RE,
    stripInvisible,
    stripBotPrefix,
    toJid,
    normalisasiNomor,
    dgnBatas
};

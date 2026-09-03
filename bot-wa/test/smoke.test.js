const test = require('node:test');
const assert = require('node:assert/strict');

const {
    stripInvisible,
    stripBotPrefix,
    toJid,
    isAdminCall,
    plainCommandWord,
    teksPesan
} = require('../src/lib/utils');

test('smoke test: utils handles command recognition and invisible characters', () => {
    // Invisibles & prefixes
    assert.equal(stripInvisible('\u200E\u200Fhalo\u202A'), 'halo');
    assert.equal(stripBotPrefix('.stats'), 'stats');
    assert.equal(stripBotPrefix('.jual hp'), 'jual hp');
    assert.equal(stripBotPrefix('jual'), 'jual');

    // JID conversions
    assert.equal(toJid('081234567890'), '6281234567890@s.whatsapp.net');
    assert.equal(toJid('6281234567890'), '6281234567890@s.whatsapp.net');
    assert.equal(toJid('123456-7890@g.us'), '123456-7890@g.us');

    // Admin calling
    assert.equal(isAdminCall('min'), true);
    assert.equal(isAdminCall('mimin?'), true);
    assert.equal(isAdminCall('mau beli buku'), false);

    // Command words
    assert.equal(plainCommandWord('menu utama'), 'menu');
    assert.equal(plainCommandWord('jual laptop'), 'jual');
    assert.equal(plainCommandWord('halo bro'), 'halo');
    assert.equal(plainCommandWord('selamat malam'), '');
});

test('smoke test: teksPesan extracts text cleanly from message variations', () => {
    assert.equal(teksPesan({ conversation: 'Halo bot' }), 'Halo bot');
    assert.equal(teksPesan({ extendedTextMessage: { text: 'Pesan panjang' } }), 'Pesan panjang');
    assert.equal(teksPesan({ imageMessage: { caption: 'Foto barang' } }), 'Foto barang');
    assert.equal(teksPesan(null), '');
});

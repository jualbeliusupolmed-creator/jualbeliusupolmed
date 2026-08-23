const test = require('node:test');
const assert = require('node:assert/strict');

const {
    stripInvisible,
    stripBotPrefix,
    toJid,
    normalisasiNomor,
    dgnBatas
} = require('../src/utils/format');

test('format helpers normalize WhatsApp input without accepting invalid numbers', () => {
    assert.equal(stripInvisible('ha\u200Blo'), 'halo');
    assert.equal(stripBotPrefix(' . jual '), 'jual');
    assert.equal(stripBotPrefix('jual'), 'jual');
    assert.equal(toJid('0812 3456 789'), '628123456789@s.whatsapp.net');
    assert.equal(toJid('group@g.us'), 'group@g.us');
    assert.equal(normalisasiNomor('0812-3456-789'), '628123456789');
    assert.equal(normalisasiNomor('123'), null);
    assert.equal(normalisasiNomor(''), '');
});

test('dgnBatas resolves successful work and rejects work exceeding its timeout', async () => {
    await assert.doesNotReject(dgnBatas(Promise.resolve('ok'), 50));
    await assert.rejects(
        dgnBatas(new Promise(() => {}), 10, 'Tes'),
        /Tes melebihi batas waktu/
    );
});

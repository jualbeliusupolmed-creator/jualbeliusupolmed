const test = require('node:test');
const assert = require('node:assert/strict');

const createAuthManager = require('../src/core/auth');

function request({ authorization = '', cookie = '', query = {} } = {}) {
    return {
        headers: { authorization, cookie },
        query,
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        originalUrl: '/private'
    };
}

test('auth manager accepts valid credentials and rejects invalid credentials safely', () => {
    const state = {};
    const auth = createAuthManager({ API_TOKEN: 'test-token', PANEL_PASSWORD: 'panel-password' }, state);

    assert.equal(auth.tokenMatches('test-token'), true);
    assert.equal(auth.tokenMatches('wrong'), false);
    assert.equal(auth.passwordMatches('panel-password'), true);
    assert.equal(auth.passwordMatches('wrong'), false);
    assert.equal(auth.bolehMasuk(request({ authorization: 'test-token' })), true);
    assert.equal(auth.bolehMasuk(request({ authorization: 'wrong' })), false);
});

test('auth manager accepts a signed panel cookie and blocks repeated failures', () => {
    const state = {};
    const auth = createAuthManager({ API_TOKEN: 'test-token', PANEL_PASSWORD: 'panel-password' }, state);
    const cookie = `panel_sesi=${encodeURIComponent(auth.kukiSah())}`;
    assert.equal(auth.sesiSah(request({ cookie })), true);

    for (let attempt = 0; attempt < 10; attempt += 1) auth.noteAuthFail('127.0.0.1');
    assert.equal(auth.authBlocked('127.0.0.1'), true);
});

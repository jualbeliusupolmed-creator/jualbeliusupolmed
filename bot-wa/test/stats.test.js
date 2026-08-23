const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const createStatsManager = require('../src/core/stats');

test('stats manager persists counters and retains only configured daily history', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-bot-stats-'));
    try {
        const stats = createStatsManager(directory, 2);
        stats.bump('sent', 2);
        stats.flushStats();
        assert.equal(stats.getStats().total.sent, 2);

        const today = stats.statsDay();
        assert.equal(stats.getStats().daily[today].sent, 2);
        assert.ok(fs.existsSync(path.join(directory, 'stats.json')));

        const restored = createStatsManager(directory, 2);
        assert.equal(restored.getStats().total.sent, 2);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});

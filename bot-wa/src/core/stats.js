// bot-wa/src/core/stats.js
const fs = require('fs');
const path = require('path');

function createStatsManager(dataDir, statsDays = 30) {
    const STATS_FILE = path.join(dataDir, 'stats.json');
    let stats = { total: {}, daily: {} };
    let statsDirty = false;

    function loadStats() {
        if (!fs.existsSync(STATS_FILE)) return;
        try {
            const raw = JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8'));
            if (raw && typeof raw === 'object') {
                stats = { total: raw.total || {}, daily: raw.daily || {} };
            }
        } catch (e) {
            console.error('[stats] gagal baca:', e.message);
        }
    }

    function statsDay(ts = Date.now()) {
        return new Date(ts + 7 * 3600 * 1000).toISOString().slice(0, 10);
    }

    function bump(key, n = 1) {
        const day = statsDay();
        stats.total[key] = (stats.total[key] || 0) + n;
        if (!stats.daily[day]) stats.daily[day] = {};
        stats.daily[day][key] = (stats.daily[day][key] || 0) + n;
        const days = Object.keys(stats.daily).sort();
        while (days.length > statsDays) delete stats.daily[days.shift()];
        statsDirty = true;
    }

    function flushStats() {
        if (!statsDirty) return;
        try {
            fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
            statsDirty = false;
        } catch (e) {
            console.error('[stats] gagal simpan:', e.message);
        }
    }

    loadStats();

    return {
        getStats: () => stats,
        bump,
        statsDay,
        flushStats,
        loadStats
    };
}

module.exports = createStatsManager;

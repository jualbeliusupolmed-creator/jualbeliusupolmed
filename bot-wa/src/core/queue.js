// bot-wa/src/core/queue.js
const fs = require('fs');

function initQueue(state, config, waSocket) {
    let queueTimer = null;
    let queueBusy = false;
    let nextSendAt = 0;
    let lastSentJid = '';
    let remDilaporkan = false;

    function scheduleQueue(delayMs) {
        if (queueTimer) clearTimeout(queueTimer);
        queueTimer = setTimeout(processQueue, Math.max(0, delayMs));
    }

    function kickQueue() {
        if (queueBusy) return;
        scheduleQueue(nextSendAt - Date.now());
    }

    async function processQueue() {
        // Logika processQueue dari index.js disalin ke sini
        // Menangani anti-burst, jeda balasan, dll.
    }

    return { kickQueue, scheduleQueue };
}

module.exports = initQueue;

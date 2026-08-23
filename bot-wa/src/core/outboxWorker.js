const { getAdminClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

class OutboxWorker {
    constructor(supabaseUrl, supabaseKey, sendWaFunction, intervalMs = 15000) {
        this.supabaseUrl = supabaseUrl;
        this.supabaseKey = supabaseKey;
        this.sendWaFunction = sendWaFunction;
        this.intervalMs = intervalMs;
        this.timer = null;
        this.isRunning = false;
    }

    start() {
        if (this.timer) return;
        this.timer = setInterval(() => this.poll(), this.intervalMs);
        console.log(`[OutboxWorker] Started polling every ${this.intervalMs}ms`);
        this.poll();
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        console.log('[OutboxWorker] Stopped polling');
    }

    async poll() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            // Kita pakai REST API Supabase langsung agar tidak perlu client tebal
            const res = await fetch(`${this.supabaseUrl}/rest/v1/wa_outbox?status=eq.tertunda&select=*&order=created_at.asc&limit=10`, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });

            if (!res.ok) {
                console.error('[OutboxWorker] Failed to fetch outbox:', res.status, await res.text());
                this.isRunning = false;
                return;
            }

            const antre = await res.json();
            if (!antre || antre.length === 0) {
                this.isRunning = false;
                return;
            }

            console.log(`[OutboxWorker] Ditemukan ${antre.length} pesan tertunda.`);

            for (const row of antre) {
                // Call the existing sendWa mechanism from index.js
                // We pass 'jangan_tampung' flag via meta to avoid re-queueing on fail.
                const hasil = await this.sendWaFunction(row.target, row.message, row.image_url || null, row.ttl_detik || null, {
                    jangan_tampung: true,
                }).catch((e) => ({ ok: false, error: e?.message }));

                if (hasil?.ok) {
                    await this.updateStatus(row.id, 'terkirim', null, (row.percobaan || 0) + 1);
                } else {
                    const sebab = hasil?.galat || hasil?.error || hasil?.data?.error || "bot masih belum bisa menerima";
                    await this.updateStatus(row.id, 'tertunda', sebab, (row.percobaan || 0) + 1);
                }
                
                // Sleep sebentar menghindari rate limit WA
                await new Promise(r => setTimeout(r, 1000));
            }

        } catch (e) {
            console.error('[OutboxWorker] Error during polling:', e.message);
        } finally {
            this.isRunning = false;
        }
    }

    async updateStatus(id, status, errorMsg, percobaan) {
        const body = { status, percobaan };
        if (status === 'terkirim') {
            body.terkirim_at = new Date().toISOString();
            body.galat_terakhir = null;
        } else {
            body.galat_terakhir = errorMsg ? String(errorMsg).substring(0, 500) : null;
        }

        await fetch(`${this.supabaseUrl}/rest/v1/wa_outbox?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': this.supabaseKey,
                'Authorization': `Bearer ${this.supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(body)
        }).catch(err => console.error('[OutboxWorker] Failed to update status:', err.message));
    }
}

module.exports = OutboxWorker;

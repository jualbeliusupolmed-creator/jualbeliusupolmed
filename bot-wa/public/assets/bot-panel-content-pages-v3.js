(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);

  async function auditFindings() {
    const status = $('status-temuan');
    const output = $('isi-temuan');
    status.textContent = 'Memuat temuan…';
    output.hidden = true;
    try {
      const response = await fetch('/progres-claude/temuan', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 404 ? 'Catatan audit belum tersedia di server ini.' : `Gagal memuat catatan (${response.status}).`);
      output.textContent = await response.text();
      output.hidden = false;
      status.textContent = 'Catatan audit dimuat.';
    } catch (error) { status.textContent = error.message || 'Tidak dapat memuat catatan audit.'; }
  }

  function entryText(entry) {
    if (typeof entry === 'string') return entry;
    const candidates = [entry?.judul, entry?.message, entry?.subject, entry?.title, entry?.summary, entry?.commit?.message, entry?.sha];
    return candidates.find((value) => typeof value === 'string' && value.trim()) || 'Perubahan tercatat';
  }
  function entryDate(entry) {
    const value = entry?.tanggal || entry?.date || entry?.created_at || entry?.commit?.author?.date || entry?.timestamp;
    if (!value) return 'Tanggal tidak tersedia';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  function renderHistory(groups, selected) {
    const target = $('daftar-riwayat');
    const chosen = groups.filter(([source]) => selected === 'semua' || source === selected);
    const records = chosen.flatMap(([source, rows]) => (Array.isArray(rows) ? rows : []).map((row) => ({ source, row })));
    if (!records.length) { target.innerHTML = '<p class="empty-state">Belum ada catatan untuk pilihan ini.</p>'; return; }
    target.innerHTML = records.map(({ source, row }) => `<article class="history-entry"><div class="history-meta"><span class="tag">${source === 'bot' ? 'Bot WhatsApp' : 'Situs'}</span><time>${escapeHtml(entryDate(row))}</time></div><p>${escapeHtml(entryText(row))}</p></article>`).join('');
  }
  async function loadHistory(selected = 'semua') {
    const status = $('status-riwayat');
    const target = $('daftar-riwayat');
    status.textContent = 'Memuat riwayat…';
    target.replaceChildren();
    try {
      const response = await fetch('/riwayat', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(response.status === 401 ? 'Sesi panel berakhir. Masuk kembali untuk melihat riwayat.' : `Gagal memuat riwayat (${response.status}).`);
      const data = await response.json();
      const groups = [['bot', data.bot], ['situs', data.situs]];
      renderHistory(groups, selected);
      status.textContent = data.galatSitus ? 'Riwayat bot dimuat; sumber riwayat situs sedang tidak tersedia.' : `Diperbarui ${entryDate({ date: data.diambil })}.`;
    } catch (error) { status.textContent = error.message || 'Tidak dapat memuat riwayat.'; }
  }

  if (document.body.dataset.contentPage === 'audit-findings') {
    $('muat-temuan')?.addEventListener('click', auditFindings);
    auditFindings();
  }
  if (document.body.dataset.contentPage === 'history') {
    let filter = 'semua';
    $('muat-riwayat')?.addEventListener('click', () => loadHistory(filter));
    document.querySelectorAll('[data-riwayat-filter]').forEach((button) => button.addEventListener('click', () => {
      filter = button.dataset.riwayatFilter;
      document.querySelectorAll('[data-riwayat-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      loadHistory(filter);
    }));
    loadHistory();
  }
})();

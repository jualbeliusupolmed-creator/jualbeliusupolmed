(() => {
  'use strict';

  const TOKEN_KEY = 'bot_api_token';
  const PAGE_SIZE = 60;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = {
    token: '', tab: 'groups', groups: [], groupLoaded: false, groupJid: '', members: [],
    selectedMembers: new Set(), memberSearch: '', memberPage: 0, max: 1500,
    xlsxRows: null, xlsxPreview: null, broadcast: null, queue: null, status: null,
    catalogDistribution: null, catalogGroupsTouched: false,
    toastTimer: 0, poller: 0,
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function number(value) { return (Number(value) || 0).toLocaleString('id-ID'); }
  function dateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function maskJid(jid) {
    const value = String(jid || '').replace(/@[^@]+$/, '');
    return value.length > 8 ? `${value.slice(0, 4)}••••${value.slice(-4)}` : value || '—';
  }
  function snippet(value, max = 100) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }
  function formatDuration(seconds) {
    const value = Math.max(0, Number(seconds) || 0);
    if (value < 60) return `${value} detik`;
    if (value < 3600) return `${Math.ceil(value / 60)} menit`;
    const hours = Math.floor(value / 3600);
    const minutes = Math.ceil((value % 3600) / 60);
    return `${hours} jam${minutes ? ` ${minutes} menit` : ''}`;
  }
  function tokenFromStorage() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', state.token);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...options, headers, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = `/masuk?next=${encodeURIComponent('/broadcast_grup')}`;
      throw new Error('Sesi berakhir. Silakan masuk kembali.');
    }
    if (!response.ok) throw new Error(body.error || `Permintaan gagal (${response.status}).`);
    return body;
  }
  function toast(message, error = false) {
    const region = $('#toast-region');
    const node = document.createElement('div');
    node.className = `toast${error ? ' error' : ''}`;
    node.setAttribute('role', error ? 'alert' : 'status');
    node.textContent = message;
    region.replaceChildren(node);
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => node.remove(), 4200);
  }
  function setConnection(status) {
    const pill = $('#connection-pill');
    const dot = $('#sidebar-dot');
    const label = $('#sidebar-status-text');
    const connected = !!status?.connected;
    const warning = !connected && !!(status?.sesiTerkunci || status?.menungguPindai || status?.hasQR);
    pill.className = `connection-pill ${connected ? 'is-online' : warning ? 'is-warning' : 'is-offline'}`;
    $('.status-dot', pill).className = `status-dot ${connected ? 'online' : warning ? 'warning' : 'offline'}`;
    $('span:last-child', pill).textContent = connected ? 'WhatsApp tersambung' : warning ? 'Perlu tindakan' : 'WhatsApp terputus';
    dot.className = `status-dot ${connected ? 'online' : warning ? 'warning' : 'offline'}`;
    label.textContent = connected ? 'Bot online' : warning ? 'Perlu ditinjau' : 'Bot offline';
  }
  async function refreshQuickStatus() {
    try {
      const [status, broadcast] = await Promise.all([api('/status?panel=1'), api('/broadcast/status')]);
      state.status = status;
      state.broadcast = broadcast;
      setConnection(status);
      updateActiveBanner();
      if (state.tab === 'progress') await loadProgress(false);
      return status;
    } catch (error) {
      setConnection({ connected: false });
      if (state.tab === 'progress') $('#broadcast-view').innerHTML = emptyState('Status tidak tersedia', error.message);
      return null;
    }
  }
  function pageHeading(title, description, action = '') {
    return `<header class="page-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>${action ? `<div class="heading-actions">${action}</div>` : ''}</header>`;
  }
  function emptyState(title, description = '') {
    return `<div class="broadcast-empty"><strong>${escapeHtml(title)}</strong>${description ? `<br>${escapeHtml(description)}` : ''}</div>`;
  }
  function tabsMarkup() {
    const tabs = [
      ['groups', 'Kirim ke grup'], ['manual', 'Kirim ke nomor'], ['catalog', 'Katalog otomatis'], ['progress', 'Antrean & progres'], ['history', 'Riwayat'], ['devices', 'Perangkat'],
    ];
    return `<nav class="broadcast-tabs" aria-label="Bagian broadcast" role="tablist">${tabs.map(([id, label]) => `<button type="button" class="broadcast-tab${state.tab === id ? ' active' : ''}" role="tab" aria-selected="${state.tab === id}" data-tab="${id}">${label}</button>`).join('')}</nav><section id="broadcast-view" aria-live="polite"></section>`;
  }
  function renderShell() {
    $('#page-content').innerHTML = `${pageHeading('Pusat broadcast', 'Pilih anggota grup atau impor daftar nomor. Setiap pesan masuk ke antrean WhatsApp dengan jeda yang kamu tentukan.')}<div id="active-broadcast"></div>${tabsMarkup()}`;
    updateActiveBanner();
    renderActiveTab();
  }
  function updateActiveBanner() {
    const root = $('#active-broadcast');
    if (!root) return;
    const broadcast = state.broadcast;
    if (!broadcast?.id || broadcast.selesai || broadcast.dibatalkan) { root.innerHTML = ''; return; }
    root.innerHTML = `<section class="status-hero broadcast-hero"><div class="status-main"><span class="status-symbol" aria-hidden="true">↗</span><div><h2>Broadcast sedang berjalan</h2><p>${number(broadcast.terkirim)} dari ${number(broadcast.total)} terkirim · ${number(broadcast.tertunda)} menunggu.</p><div class="inline-actions"><button class="button" type="button" data-tab="progress">Lihat antrean dan progres</button></div></div></div><div class="status-side"><span>Perkiraan penerima yang tersisa</span><strong>${formatDuration(Math.ceil((broadcast.tertunda || 0) * (broadcast.delayMs || 5000) / 1000))}</strong><small>Broadcast baru akan menggantikan yang masih berjalan.</small></div></section>`;
  }
  function renderActiveTab() {
    $$('.broadcast-tab').forEach((button) => {
      const active = button.dataset.tab === state.tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    if (state.tab === 'groups') renderGroupsView();
    else if (state.tab === 'manual') renderManualView();
    else if (state.tab === 'catalog') { renderCatalogFrame(); loadCatalogDistribution(); }
    else if (state.tab === 'progress') { renderProgressFrame(); loadProgress(); }
    else if (state.tab === 'history') { renderHistoryFrame(); loadHistory(); }
    else if (state.tab === 'devices') { renderDevicesFrame(); loadDevices(); }
  }
  function switchTab(tab) {
    if (!['groups', 'manual', 'catalog', 'progress', 'history', 'devices'].includes(tab)) return;
    state.tab = tab;
    renderActiveTab();
  }
  function renderCatalogFrame() {
    const current = state.catalogDistribution;
    const channels = current?.channels || [];
    const catalogGroups = current?.groups || [];
    const groupChoices = state.groups.map((group) => `<option value="${escapeHtml(group.jid)}">${escapeHtml(group.name || group.jid)} · ${number(group.participants)} anggota</option>`).join('');
    const groupRows = catalogGroups.map((group) => `<li class="catalog-destination"><span><strong>${escapeHtml(group.name || group.jid)}</strong><small>${escapeHtml(group.jid)}</small></span><button class="button button-quiet button-small" type="button" data-action="remove-catalog-group" data-jid="${escapeHtml(group.jid)}" aria-label="Hapus ${escapeHtml(group.name || group.jid)}">Hapus</button></li>`).join('');
    $('#broadcast-view').innerHTML = `<section class="surface broadcast-card"><div class="surface-head"><div><h3>Ke mana katalog dikirim?</h3><p>Atur grup dan saluran untuk pengumuman barang yang berhasil tayang.</p></div><span class="badge ${current?.enabled ? 'good' : 'warn'}">${current ? current.enabled ? 'Aktif' : 'Dijeda' : 'Memuat'}</span></div><div class="surface-body"><label class="plain-check"><input id="catalog-enabled" type="checkbox" ${current?.enabled === false ? '' : 'checked'}> Kirim katalog otomatis</label><p class="field-help">Pesan berisi nama barang, harga, kategori, dan tautan produk. Pengaturan grup situs yang lama tetap berlaku sampai daftar grup di sini disimpan.</p><div class="catalog-destination-section"><div><h4>Grup WhatsApp</h4><p class="field-help">Pilih grup yang sudah diikuti bot. Grup tersimpan akan menerima pengumuman listing otomatis.</p></div><div class="inline-actions"><select class="field" id="catalog-group-select"><option value="">${state.groups.length ? 'Pilih grup WhatsApp' : 'Memuat daftar grup…'}</option>${groupChoices}</select><button class="button button-small" type="button" data-action="add-catalog-group" ${state.groups.length ? '' : 'disabled'}>Tambahkan</button></div><ul class="catalog-destination-list">${groupRows || '<li class="catalog-destination-empty">Belum ada grup tujuan tersimpan.</li>'}</ul><p class="field-help">${current?.groupsConfigured ? `${number(catalogGroups.length)} grup tersimpan di panel bot.` : 'Daftar grup situs yang sudah ada tetap dipakai sampai kamu menambah atau menghapus grup di sini lalu menyimpan.'}</p></div><div class="catalog-destination-section"><div><h4>Saluran WhatsApp</h4><p class="field-help">Masukkan satu tautan undangan atau JID saluran per baris.</p></div><label class="field-label" for="catalog-channels">Tautan undangan atau JID saluran</label><textarea class="textarea-field" id="catalog-channels" rows="4" placeholder="https://whatsapp.com/channel/…&#10;atau: 120363…@newsletter">${escapeHtml(channels.map((item) => item.name ? `${item.name} | ${item.jid}` : item.jid).join('\n'))}</textarea><p class="field-help">Bot akan memeriksa tautan undangan sebelum menyimpannya.</p><div class="member-count"><span class="count-chip">${number(channels.length)} saluran tersimpan</span>${channels.length ? `<span>${channels.map((item) => escapeHtml(item.name || item.jid)).join(' · ')}</span>` : '<span>Belum ada saluran tujuan.</span>'}</div></div><div id="catalog-result" aria-live="polite"></div><div class="broadcast-sendbar"><p>Simpan setelah selesai mengubah grup atau saluran.</p><button class="button button-primary" type="button" data-action="save-catalog" ${current ? '' : 'disabled'}>Simpan pengaturan</button></div></div></section><div class="warning-note">Bot harus terhubung saat tautan saluran diperiksa. Pengiriman otomatis berjalan setelah listing berhasil diaktifkan.</div>`;
  }
  async function loadCatalogDistribution() {
    try {
      state.catalogDistribution = await api('/settings/catalog-distribution');
      if (state.tab === 'catalog') renderCatalogFrame();
    } catch (error) {
      $('#broadcast-view').innerHTML = emptyState('Pengaturan saluran tidak dapat dimuat', error.message);
    }
  }
  function selectedGroup() { return state.groups.find((group) => group.jid === state.groupJid); }
  function renderGroupsView() {
    const group = selectedGroup();
    const selectedCount = state.selectedMembers.size;
    const eta = Math.ceil(selectedCount * delaySeconds('group-delay'));
    const groupOptions = state.groups.map((item) => `<option value="${escapeHtml(item.jid)}"${item.jid === state.groupJid ? ' selected' : ''}>${escapeHtml(item.name || item.jid)} · ${number(item.participants)} anggota</option>`).join('');
    $('#broadcast-view').innerHTML = `<div class="broadcast-grid">
      <div class="broadcast-stack">
        <section class="surface broadcast-card"><div class="surface-head"><div><h3>Tentukan grup</h3><p>Pesan dikirim pribadi ke anggota yang kamu pilih.</p></div><button class="button button-small" type="button" data-action="refresh-groups">Muat ulang</button></div><div class="surface-body"><div class="form-field"><label class="field-label" for="group-select">Grup WhatsApp</label><select class="field" id="group-select"><option value="">${state.groupLoaded ? 'Pilih grup' : 'Memuat daftar grup…'}</option>${groupOptions}</select><p class="field-help">${state.groupsStale ? 'Daftar grup dari cache bot karena koneksi sedang terbatas.' : `${number(state.groups.length)} grup tersedia.`}</p></div></div></section>
        <section class="surface broadcast-card"><div class="surface-head"><div><h3>Pilih penerima</h3><p id="member-description">${group ? `${escapeHtml(group.name || group.jid)} · ${number(state.members.length)} anggota` : 'Pilih grup untuk memuat anggotanya.'}</p></div><span class="count-chip" id="member-selected-count">${number(selectedCount)} dipilih</span></div><div class="surface-body"><div class="broadcast-toolbar"><input class="field" type="search" id="member-search" value="${escapeHtml(state.memberSearch)}" placeholder="Cari nomor atau ID WhatsApp" aria-label="Cari anggota grup"><div class="heading-actions"><button class="button button-small" type="button" data-action="select-all-members" ${state.members.length ? '' : 'disabled'}>Pilih semua</button><button class="button button-quiet button-small" type="button" data-action="clear-members" ${selectedCount ? '' : 'disabled'}>Kosongkan</button></div></div><div class="member-list" id="member-list">${state.groupJid ? emptyState('Memuat anggota…') : emptyState('Pilih grup dahulu')}</div><div class="member-pagination" id="member-pagination"></div><div class="member-count"><span class="count-chip">Batas per gelombang: ${number(state.max)}</span><span>Jumlah dipilih: <strong id="member-count-text">${number(selectedCount)}</strong></span><span id="member-eta">${selectedCount ? `Estimasi ${formatDuration(eta)}` : ''}</span></div><div id="group-result" aria-live="polite"></div></div></section>
      </div>
      <div class="broadcast-stack">
        <section class="surface broadcast-card"><div class="surface-head"><div><h3>Tulis pesan</h3><p>Gunakan satu pesan untuk seluruh anggota terpilih.</p></div></div><div class="surface-body"><label class="field-label" for="group-message">Isi pesan</label><textarea class="textarea-field" id="group-message" maxlength="4000" placeholder="Tulis pesan broadcast grup…"></textarea><div class="message-counter"><span>Hingga 4.000 karakter</span><span id="group-message-count">0 / 4.000</span></div><div class="form-grid" style="margin-top:15px"><div class="form-field"><label class="field-label" for="group-delay">Jeda antar pesan</label><div class="inline-actions"><input class="field" id="group-delay" type="number" min="1" max="300" value="5" style="max-width:120px"><span class="field-help">detik</span></div><p class="field-help">Rentang yang diizinkan server: 1–300 detik.</p></div><div class="form-field"><label class="field-label">Ringkasan</label><div class="broadcast-estimate" id="group-estimate">Pilih anggota untuk melihat perkiraan waktu.</div></div></div><div class="broadcast-sendbar"><p>Broadcast baru akan menghentikan sisa dari broadcast sebelumnya.</p><button class="button button-primary" type="button" id="group-send" data-action="send-group" ${selectedCount && state.groupJid ? '' : 'disabled'}>Tinjau dan antrekan</button></div></div></section>
        <div class="warning-note">Gunakan siaran hanya kepada orang yang memang mengharapkan pesan ini. Pilihan “Pilih semua” mencakup seluruh anggota grup yang dimuat.</div>
      </div>
    </div>`;
    renderMembers();
  }
  function renderMembers() {
    const box = $('#member-list');
    const pager = $('#member-pagination');
    if (!box || !pager) return;
    if (!state.groupJid) { box.innerHTML = emptyState('Pilih grup dahulu'); pager.textContent = ''; return; }
    if (!state.members.length) { box.innerHTML = emptyState('Tidak ada anggota', 'Bot tidak menemukan anggota pada grup ini.'); pager.textContent = ''; return; }
    const query = state.memberSearch.toLowerCase().replace(/\s/g, '');
    const filtered = state.members.filter((member) => !query || member.jid.toLowerCase().includes(query));
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    state.memberPage = Math.min(state.memberPage, pageCount - 1);
    const start = state.memberPage * PAGE_SIZE;
    const page = filtered.slice(start, start + PAGE_SIZE);
    box.innerHTML = page.map((member) => {
      const digits = member.jid.replace(/@[^@]+$/, '');
      const isLid = member.jid.endsWith('@lid');
      const role = member.admin === 'superadmin' ? 'Admin utama' : member.admin === 'admin' ? 'Admin grup' : '';
      return `<label class="member-row"><input type="checkbox" data-member-jid="${escapeHtml(member.jid)}"${state.selectedMembers.has(member.jid) ? ' checked' : ''}><span class="member-info"><strong>${escapeHtml(isLid ? `ID anggota ${maskJid(member.jid)}` : `+${digits}`)}</strong><small>${escapeHtml(member.jid)}</small></span>${role ? `<span class="member-role">${role}</span>` : ''}</label>`;
    }).join('');
    pager.innerHTML = `<span>${filtered.length ? `${number(start + 1)}–${number(Math.min(start + PAGE_SIZE, filtered.length))} dari ${number(filtered.length)}` : 'Tidak ada hasil'}</span><div class="heading-actions"><button class="button button-small" type="button" data-action="member-prev" ${state.memberPage === 0 ? 'disabled' : ''}>Sebelumnya</button><button class="button button-small" type="button" data-action="member-next" ${state.memberPage >= pageCount - 1 ? 'disabled' : ''}>Berikutnya</button></div>`;
    updateGroupEstimate();
  }
  function updateGroupEstimate() {
    const count = state.selectedMembers.size;
    const delay = delaySeconds('group-delay');
    const estimate = $('#group-estimate');
    if (estimate) estimate.textContent = count ? `${number(Math.min(count, state.max))} penerima pada batch ini · jeda ${delay} detik · sekitar ${formatDuration(Math.ceil(Math.min(count, state.max) * delay))}${count > state.max ? ` · ${number(count - state.max)} tetap dipilih untuk batch berikutnya` : ''}.` : 'Pilih anggota untuk melihat perkiraan waktu.';
    const countText = $('#member-count-text');
    if (countText) countText.textContent = number(count);
    const selectedCount = $('#member-selected-count');
    if (selectedCount) selectedCount.textContent = `${number(count)} dipilih`;
    const etaText = $('#member-eta');
    if (etaText) etaText.textContent = count ? `Estimasi ${formatDuration(Math.ceil(Math.min(count, state.max) * delay))}` : '';
    const sendButton = $('#group-send');
    if (sendButton) sendButton.disabled = !state.groupJid || !count;
  }
  function delaySeconds(id) {
    const input = $(`#${id}`);
    return Math.min(300, Math.max(1, Number(input?.value) || 5));
  }
  async function loadGroups() {
    try {
      const data = await api('/groups');
      state.groups = (data.groups || []).map((group) => ({ ...group, participants: Number(group.participants) || 0 })).sort((a, b) => b.participants - a.participants);
      state.groupsStale = !!data.stale;
      state.groupLoaded = true;
      const targets = await api('/broadcast/targets').catch(() => null);
      if (targets?.max) state.max = Number(targets.max);
      if (state.tab === 'groups') renderGroupsView();
    } catch (error) {
      state.groupLoaded = true;
      const root = $('#broadcast-view');
      if (root && state.tab === 'groups') root.innerHTML = `${emptyState('Daftar grup gagal dimuat', error.message)}<div class="heading-actions" style="justify-content:center"><button class="button" type="button" data-action="refresh-groups">Coba lagi</button></div>`;
    }
  }
  async function loadMembers(jid) {
    state.groupJid = jid;
    state.members = [];
    state.selectedMembers.clear();
    state.memberSearch = '';
    state.memberPage = 0;
    renderGroupsView();
    if (!jid) return;
    try {
      const data = await api(`/groups/${encodeURIComponent(jid)}`);
      state.members = [...new Map((data.participants || []).filter((p) => p?.id).map((participant) => [participant.id, { jid: participant.id, admin: participant.admin || null }])).values()];
      if (state.tab === 'groups') renderGroupsView();
    } catch (error) {
      const box = $('#member-list');
      if (box && state.tab === 'groups' && state.groupJid === jid) box.innerHTML = emptyState('Anggota tidak dapat dimuat', error.message);
    }
  }
  function parseManualNumbers() {
    const raw = $('#manual-numbers')?.value || '';
    const values = raw.split(/[\n,;\t]+/).map((value) => value.trim()).filter(Boolean);
    const unique = new Set();
    const numbers = [];
    let invalid = 0;
    let duplicate = 0;
    for (const value of values) {
      const phone = window.JBPhoneXlsx?.normalizePhone(value) || '';
      if (!phone) { invalid++; continue; }
      if (unique.has(phone)) { duplicate++; continue; }
      unique.add(phone);
      numbers.push(phone);
    }
    return { numbers, invalid, duplicate, inputCount: values.length };
  }
  function renderManualView() {
    $('#broadcast-view').innerHTML = `<section class="surface broadcast-card"><div class="surface-head"><div><h3>Kirim ke nomor WhatsApp</h3><p>Masukkan nomor sendiri atau ambil dari spreadsheet Excel.</p></div><span class="import-badge">Maks. ${number(state.max)} nomor per gelombang</span></div><div class="surface-body"><label class="field-label" for="manual-numbers">Daftar nomor</label><textarea class="textarea-field" id="manual-numbers" placeholder="08123456789&#10;08987654321&#10;62811223344"></textarea><p class="field-help">Pisahkan nomor dengan baris baru, koma, atau titik koma. Nomor lokal akan disesuaikan ke format 62.</p><div class="import-panel"><div class="surface-head" style="padding:0;border:0;margin-bottom:10px"><div><h3>Impor dari Excel</h3><p>File dibaca di browser dan tidak diunggah.</p></div><span class="import-badge">.xlsx · maks. 20 MB</span></div><div class="form-grid"><div class="form-field"><label class="field-label" for="manual-xlsx">Pilih file</label><input class="field" id="manual-xlsx" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div><div class="form-field"><label class="field-label" for="manual-xlsx-column">Kolom nomor</label><select class="field" id="manual-xlsx-column" disabled><option>Pilih file terlebih dahulu</option></select></div><div class="form-field full"><label class="plain-check"><input id="manual-xlsx-header" type="checkbox"> Baris pertama adalah judul kolom</label><p class="field-help">Lembar pertama yang dibaca. Kamu bisa mengganti kolom setelah melihat pratinjau.</p></div><div class="form-field full"><div class="import-summary" id="manual-xlsx-summary" aria-live="polite">Belum ada file yang dipilih.</div><button class="button button-small" type="button" id="manual-xlsx-import" disabled>Tambahkan nomor ke daftar</button></div></div></div><div class="member-count" id="manual-count"><span class="count-chip">0 nomor valid</span></div><div class="broadcast-grid" style="margin-top:16px"><div class="form-field"><label class="field-label" for="manual-message">Isi pesan</label><textarea class="textarea-field" id="manual-message" maxlength="4000" placeholder="Tulis pesan untuk penerima…"></textarea><div class="message-counter"><span>Hingga 4.000 karakter</span><span id="manual-message-count">0 / 4.000</span></div></div><div class="broadcast-stack"><div class="form-field"><label class="field-label" for="manual-delay">Jeda antar pesan</label><div class="inline-actions"><input class="field" id="manual-delay" type="number" min="1" max="300" value="5" style="max-width:120px"><span class="field-help">detik</span></div></div><div class="broadcast-estimate" id="manual-estimate">Tambahkan nomor untuk melihat ringkasan batch.</div></div></div><div id="manual-result" aria-live="polite"></div><div class="broadcast-sendbar"><p>Nomor yang melebihi batas tetap di daftar untuk batch berikutnya.</p><button class="button button-primary" type="button" data-action="send-manual" id="manual-send" disabled>Tinjau dan antrekan</button></div></div></section>`;
    $('#manual-numbers').addEventListener('input', updateManualSummary);
    $('#manual-message').addEventListener('input', () => $('#manual-message-count').textContent = `${$('#manual-message').value.length} / 4.000`);
    $('#manual-delay').addEventListener('input', updateManualSummary);
    $('#manual-xlsx').addEventListener('change', loadManualXlsx);
    $('#manual-xlsx-column').addEventListener('change', updateManualXlsxPreview);
    $('#manual-xlsx-header').addEventListener('change', updateManualXlsxPreview);
    $('#manual-xlsx-import').addEventListener('click', importManualXlsx);
    updateManualSummary();
  }
  async function loadManualXlsx(event) {
    const file = event.target.files?.[0];
    const select = $('#manual-xlsx-column');
    const summary = $('#manual-xlsx-summary');
    const button = $('#manual-xlsx-import');
    state.xlsxRows = null;
    state.xlsxPreview = null;
    button.disabled = true;
    if (!file) { summary.textContent = 'Belum ada file yang dipilih.'; return; }
    summary.textContent = 'Membaca lembar pertama…';
    try {
      if (!window.JBPhoneXlsx) throw new Error('Pembaca Excel belum tersedia. Muat ulang halaman dan coba lagi.');
      const parsed = await window.JBPhoneXlsx.readRows(file);
      state.xlsxRows = parsed.rows;
      const width = Math.max(1, ...parsed.rows.map((row) => row.length));
      const guess = window.JBPhoneXlsx.detectPhoneColumn(parsed.headers);
      select.replaceChildren();
      for (let index = 0; index < width; index++) {
        const option = document.createElement('option');
        option.value = String(index);
        const column = window.JBPhoneXlsx.columnLetters(index);
        const heading = String(parsed.headers[index] || '').trim();
        option.textContent = heading ? `Kolom ${column} · ${heading}` : `Kolom ${column}`;
        select.appendChild(option);
      }
      select.disabled = false;
      select.value = String(guess >= 0 ? guess : 0);
      $('#manual-xlsx-header').checked = guess >= 0;
      button.disabled = false;
      summary.textContent = `File “${file.name}” dibaca dari lembar “${parsed.sheetName}”.`;
      updateManualXlsxPreview();
    } catch (error) {
      summary.textContent = error.message;
      select.disabled = true;
    }
  }
  function updateManualXlsxPreview() {
    if (!state.xlsxRows || !window.JBPhoneXlsx) return;
    state.xlsxPreview = window.JBPhoneXlsx.extractPhones(state.xlsxRows, Number($('#manual-xlsx-column').value), $('#manual-xlsx-header').checked);
    $('#manual-xlsx-summary').textContent = `${number(state.xlsxPreview.numbers.length)} valid · ${number(state.xlsxPreview.duplicate)} duplikat · ${number(state.xlsxPreview.invalid)} baris tidak dikenali. File tetap di browser.`;
  }
  function importManualXlsx() {
    const phones = state.xlsxPreview?.numbers || [];
    if (!phones.length) return;
    const current = parseManualNumbers().numbers;
    const merged = [...new Set([...current, ...phones])];
    $('#manual-numbers').value = merged.join('\n');
    updateManualSummary();
    $('#manual-xlsx-summary').textContent = `${number(merged.length - current.length)} nomor baru ditambahkan. Nomor yang sudah ada dilewati.`;
  }
  function updateManualSummary() {
    const parsed = parseManualNumbers();
    const count = $('#manual-count');
    const estimate = $('#manual-estimate');
    const button = $('#manual-send');
    if (!count || !estimate || !button) return;
    count.innerHTML = `<span class="count-chip">${number(parsed.numbers.length)} valid</span><span>${number(parsed.duplicate)} duplikat dilewati</span><span>${number(parsed.invalid)} tidak dikenali</span>`;
    const batch = Math.min(parsed.numbers.length, state.max);
    const eta = Math.ceil(batch * delaySeconds('manual-delay'));
    estimate.textContent = batch ? `${number(batch)} nomor pada batch ini · sekitar ${formatDuration(eta)}${parsed.numbers.length > state.max ? ` · ${number(parsed.numbers.length - state.max)} menunggu batch berikutnya` : ''}.` : 'Tambahkan nomor untuk melihat ringkasan batch.';
    button.disabled = !batch;
  }
  function renderProgressFrame() {
    $('#broadcast-view').innerHTML = `<div class="surface broadcast-card broadcast-progress-card"><div class="surface-head"><div><h3>Progres broadcast</h3><p>Angka diperbarui langsung dari antrean bot.</p></div><button class="button button-small" type="button" data-action="refresh-progress">Muat ulang</button></div><div class="surface-body" id="progress-root">Memuat status…</div></div><div class="surface broadcast-card"><div class="surface-head"><div><h3>Antrean pengiriman</h3><p>Pesan pribadi dan siaran menunggu ditampilkan terpisah.</p></div><button class="button button-danger button-small" type="button" data-action="clear-broadcast-queue">Batalkan antrean broadcast</button></div><div class="surface-body" id="queue-root">Memuat antrean…</div></div>`;
  }
  async function loadProgress(showToast = false) {
    const root = $('#progress-root');
    const queueRoot = $('#queue-root');
    if (!root || !queueRoot) return;
    try {
      const [broadcast, queue] = await Promise.all([api('/broadcast/status'), api('/antrean/lokal')]);
      state.broadcast = broadcast;
      state.queue = queue;
      root.innerHTML = renderBroadcastProgress(broadcast, queue);
      queueRoot.innerHTML = renderQueues(queue);
    } catch (error) {
      root.innerHTML = emptyState('Progres belum tersedia', error.message);
      queueRoot.innerHTML = emptyState('Antrean belum tersedia');
      if (showToast) toast(error.message, true);
    }
  }
  function renderBroadcastProgress(data, queue) {
    if (!data?.id) return `<div class="broadcast-empty">Belum ada broadcast yang tercatat.</div><div class="progress-summary"><div><span>Status bot</span><strong>${queue?.siap ? 'Siap' : 'Offline'}</strong></div><div><span>Pesan menunggu</span><strong>${number(queue?.broadcastTertunda)}</strong></div><div><span>Pesan pribadi menunggu</span><strong>${number(queue?.tertunda)}</strong></div><div><span>Pesan dibuang</span><strong>${number(queue?.dibuangTotal)}</strong></div></div>`;
    const status = data.dibatalkan ? 'Dibatalkan' : data.selesai ? 'Selesai' : 'Berjalan';
    const statusClass = data.dibatalkan ? 'warn' : data.selesai ? 'good' : 'blue';
    return `<div class="progress-block"><div class="module-row"><span><strong>Broadcast ${escapeHtml(data.id)}</strong><small>${escapeHtml(snippet(data.pesan, 130) || 'Tanpa pesan')}</small></span><span class="badge ${statusClass}">${status}</span></div><div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, Number(data.pct) || 0))}%"></div></div><div class="progress-summary"><div><span>Terkirim</span><strong>${number(data.terkirim)}</strong></div><div><span>Menunggu</span><strong>${number(data.tertunda)}</strong></div><div><span>Gagal</span><strong>${number(data.gagal)}</strong></div><div><span>Total</span><strong>${number(data.total)}</strong></div></div><div class="inline-status"><span>Mulai ${escapeHtml(dateTime(data.mulaiAt))}</span><span>·</span><span>${number(data.pct)}% selesai</span>${!data.selesai ? '<button class="button button-danger button-small" type="button" data-action="cancel-broadcast" style="margin-left:auto">Batalkan sisa</button>' : ''}</div>${data.gagalTotal ? `<p class="field-help">${number(data.gagalTotal)} pesan gagal; tujuan ditampilkan tersamarkan pada catatan antrean.</p>` : ''}</div>`;
  }
  function renderQueues(data) {
    const items = data.items || [];
    const broadcasts = data.broadcastItems || [];
    const discarded = data.dibuang || [];
    const table = (rows, allowDelete) => rows.length ? `<div class="table-scroll"><table class="broadcast-table"><thead><tr><th>Tujuan</th><th>Pesan</th><th>Masuk</th><th></th></tr></thead><tbody>${rows.slice(0, 100).map((item) => `<tr><td><strong>${escapeHtml(maskJid(item.jid))}</strong><small>${item.grup ? 'Grup' : item.jenis === 'broadcast' ? 'Broadcast' : 'Chat'}</small></td><td>${escapeHtml(snippet(item.message, 90) || '—')}</td><td>${escapeHtml(dateTime(item.ts))}</td><td>${allowDelete ? `<button class="button button-danger button-small" data-action="delete-queue-item" data-id="${escapeHtml(item.id)}">Hapus</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : emptyState('Tidak ada pesan di bagian ini.');
    return `<div class="broadcast-stack"><div><div class="surface-head" style="padding:0 0 10px"><h3>Pesan pribadi menunggu · ${number(items.length)}</h3></div>${table(items, true)}</div><div><div class="surface-head" style="padding:0 0 10px"><h3>Broadcast menunggu · ${number(broadcasts.length)}</h3></div>${table(broadcasts, false)}</div><div><div class="surface-head" style="padding:0 0 10px"><div><h3>Gagal / dibuang · ${number(data.dibuangTotal)}</h3><p>Catatan ini tidak terkirim otomatis. Tinjau sebelum mengulang.</p></div>${discarded.length ? '<button class="button button-small" data-action="clear-discarded">Bersihkan catatan</button>' : ''}</div>${discarded.length ? `<div class="table-scroll"><table class="broadcast-table"><thead><tr><th>Tujuan</th><th>Pesan</th><th>Alasan</th><th></th></tr></thead><tbody>${discarded.slice(0, 50).map((item) => `<tr><td><strong>${escapeHtml(maskJid(item.jid))}</strong><small>${escapeHtml(dateTime(item.dibuangAt || item.ts))}</small></td><td>${escapeHtml(snippet(item.message, 75) || '—')}</td><td>${escapeHtml(snippet(item.sebab || item.reason, 80) || '—')}</td><td><div class="heading-actions"><button class="button button-small" data-action="retry-discarded" data-id="${escapeHtml(item.id)}">Antrekan lagi</button><button class="button button-danger button-small" data-action="delete-discarded" data-id="${escapeHtml(item.id)}">Hapus</button></div></td></tr>`).join('')}</tbody></table></div>` : emptyState('Tidak ada pesan dibuang.')}</div></div>`;
  }
  function renderHistoryFrame() {
    $('#broadcast-view').innerHTML = `<section class="surface broadcast-card"><div class="surface-head"><div><h3>Riwayat broadcast</h3><p>Rekam status broadcast terakhir yang disimpan bot.</p></div><button class="button button-small" type="button" data-action="refresh-history">Muat ulang</button></div><div class="surface-body" id="history-root">Memuat riwayat…</div></section>`;
  }
  async function loadHistory() {
    const root = $('#history-root');
    if (!root) return;
    try {
      const data = await api('/broadcast/riwayat-lengkap');
      const items = data.riwayat || [];
      root.innerHTML = items.length ? `<div class="table-scroll"><table class="broadcast-table"><thead><tr><th>Waktu</th><th>Pesan</th><th>Progres</th><th>Status</th></tr></thead><tbody>${items.map((item) => `<tr><td><strong>${escapeHtml(dateTime(item.createdAt))}</strong><small>${escapeHtml(item.id)}</small></td><td>${escapeHtml(snippet(item.pesan, 110))}</td><td>${number(item.terkirim)}/${number(item.total)} terkirim · ${number(item.gagal)} gagal</td><td><span class="badge ${item.status === 'Selesai' ? 'good' : item.status === 'Berjalan' ? 'blue' : 'warn'}">${escapeHtml(item.status)}</span></td></tr>`).join('')}</tbody></table></div>` : emptyState('Belum ada riwayat broadcast.');
    } catch (error) { root.innerHTML = emptyState('Riwayat belum dapat dimuat', error.message); }
  }
  function renderDevicesFrame() {
    $('#broadcast-view').innerHTML = `${pageHeading('Status perangkat', 'Periksa koneksi bot dan tampilkan QR hanya saat kamu siap menautkan WhatsApp.')}<div class="qr-panel"><section class="surface broadcast-card"><div class="surface-head"><div><h3>Perangkat utama</h3><p id="primary-device-label">Memeriksa status…</p></div><span class="badge" id="primary-device-badge">Memuat</span></div><div class="surface-body"><div class="qr-preview" id="primary-qr"><p>QR tidak dimuat otomatis. Tekan tombol untuk memeriksa.</p></div><button class="button button-primary" type="button" data-action="load-primary-qr">Tampilkan QR utama</button></div></section><section class="surface broadcast-card"><div class="surface-head"><div><h3>Perangkat cadangan</h3><p id="secondary-device-label">Memeriksa status…</p></div><span class="badge" id="secondary-device-badge">Memuat</span></div><div class="surface-body"><div class="qr-preview" id="secondary-qr"><p>QR tidak dimuat otomatis. Tekan tombol untuk memeriksa.</p></div><button class="button" type="button" data-action="load-secondary-qr">Tampilkan QR cadangan</button></div></section></div>`;
  }
  async function loadDevices() {
    try {
      const [primary, secondary] = await Promise.all([
        api('/status?panel=1'),
        api('/perangkat2/status?panel=1').catch((error) => ({ error: error.message, adaBot2: false })),
      ]);
      state.status = primary;
      setConnection(primary);
      $('#primary-device-label').textContent = primary.connected ? `Tersambung · ${maskJid(primary.phone)}` : primary.sesiTerkunci ? 'Sesi WhatsApp terkunci' : primary.menungguPindai ? 'Menunggu pemindaian QR' : 'Belum tersambung';
      $('#primary-device-badge').className = `badge ${primary.connected ? 'good' : primary.sesiTerkunci ? 'bad' : 'warn'}`;
      $('#primary-device-badge').textContent = primary.connected ? 'Online' : primary.sesiTerkunci ? 'Terkunci' : 'Offline';
      $('#secondary-device-label').textContent = secondary.adaBot2 ? secondary.connected ? `Tersambung · ${maskJid(secondary.phone)}` : 'Bot cadangan tersedia, belum tersambung' : secondary.error || 'Bot cadangan belum dikonfigurasi';
      $('#secondary-device-badge').className = `badge ${secondary.connected ? 'good' : secondary.adaBot2 ? 'warn' : ''}`;
      $('#secondary-device-badge').textContent = secondary.connected ? 'Online' : secondary.adaBot2 ? 'Offline' : 'Tidak tersedia';
    } catch (error) { toast(error.message, true); }
  }
  async function showQr(device) {
    const box = $(`#${device === 2 ? 'secondary' : 'primary'}-qr`);
    box.innerHTML = '<p>Memeriksa QR…</p>';
    try {
      const data = await api(device === 2 ? '/perangkat2/qr' : '/qr');
      if (data.qr && String(data.qr).startsWith('data:image/')) {
        box.innerHTML = `<img alt="QR tautan WhatsApp perangkat ${device}" src="${escapeHtml(data.qr)}"><p>QR berlaku terbatas. Jangan bagikan kepada siapa pun.</p>`;
        window.setTimeout(() => { if (box.querySelector('img')) box.innerHTML = '<p>QR disembunyikan setelah satu menit. Muat ulang bila masih diperlukan.</p>'; }, 60000);
      } else box.innerHTML = `<p>${escapeHtml(data.connected ? 'Perangkat sudah tersambung.' : data.menyiapkan ? 'Bot sedang menyiapkan QR. Coba lagi beberapa detik.' : data.message || data.status || 'QR belum tersedia.')}</p>`;
    } catch (error) { box.innerHTML = `<p>${escapeHtml(error.message)}</p>`; }
  }
  async function sendBroadcast(jids, message, delay, resultId, kind) {
    if (!jids.length) return toast('Pilih minimal satu penerima.', true);
    if (!message.trim()) return toast('Isi pesan broadcast terlebih dahulu.', true);
    const batch = jids.slice(0, state.max);
    const remaining = jids.length - batch.length;
    const replaces = state.broadcast?.id && !state.broadcast.selesai;
    const confirmText = `Antrekan pesan ke ${number(batch.length)} penerima?\nJeda: ${delay} detik per pesan.\nPerkiraan: ${formatDuration(Math.ceil(batch.length * delay))}.${remaining ? `\n${number(remaining)} nomor/anggota tetap dipilih untuk batch berikutnya.` : ''}${replaces ? '\n\nSisa broadcast yang sedang berjalan akan digantikan.' : ''}`;
    if (!window.confirm(confirmText)) return;
    const button = $(`#${kind === 'group' ? 'group-send' : 'manual-send'}`);
    if (button) button.disabled = true;
    try {
      const result = await api('/broadcast', { method: 'POST', body: JSON.stringify({ jids: batch, message: message.trim(), delayMs: delay * 1000 }) });
      if (kind === 'group') batch.forEach((jid) => state.selectedMembers.delete(jid));
      else {
        const sentNumbers = new Set(batch.map((jid) => jid.replace('@s.whatsapp.net', '')));
        const after = parseManualNumbers().numbers.filter((phone) => !sentNumbers.has(phone));
        const textarea = $('#manual-numbers');
        if (textarea) textarea.value = after.join('\n');
      }
      const resultNode = $(`#${resultId}`);
      if (resultNode) {
        resultNode.className = 'broadcast-result';
        resultNode.textContent = `${number(result.queued || batch.length)} pesan masuk antrean.${result.rejected?.length ? ` ${number(result.rejected.length)} tujuan tidak valid dilewati.` : ''}`;
      }
      if (kind === 'group') $('#group-message').value = '';
      else $('#manual-message').value = '';
      if (kind === 'manual') $('#manual-message-count').textContent = '0 / 4.000';
      state.broadcast = { ...(state.broadcast || {}), id: result.bcId, selesai: false, total: result.queued || batch.length, terkirim: 0, tertunda: result.queued || batch.length, delayMs: result.delayMs || delay * 1000 };
      updateActiveBanner();
      if (kind === 'group') {
        batch.forEach((jid) => { const checkbox = $(`[data-member-jid="${CSS.escape(jid)}"]`); if (checkbox) checkbox.checked = false; });
        updateGroupEstimate();
      } else updateManualSummary();
      toast(`${number(result.queued || batch.length)} pesan berhasil diantrekan.`);
    } catch (error) {
      const resultNode = $(`#${resultId}`);
      if (resultNode) { resultNode.className = 'broadcast-result error'; resultNode.textContent = error.message; }
      else toast(error.message, true);
    } finally { if (button?.isConnected) button.disabled = false; }
  }
  async function handleAction(action, element) {
    if (action === 'add-catalog-group') {
      const jid = $('#catalog-group-select')?.value || '';
      const group = state.groups.find((item) => item.jid === jid);
      if (!group) return toast('Pilih grup yang tersedia terlebih dahulu.', true);
      const current = state.catalogDistribution || {};
      const groups = current.groups || [];
      if (groups.some((item) => item.jid === jid)) return toast('Grup itu sudah ada di daftar tujuan.', true);
      state.catalogGroupsTouched = true;
      state.catalogDistribution = { ...current, groupsConfigured: true, groups: [...groups, { jid, name: group.name || jid }] };
      renderCatalogFrame();
      return;
    }
    if (action === 'remove-catalog-group') {
      const current = state.catalogDistribution || {};
      state.catalogGroupsTouched = true;
      state.catalogDistribution = { ...current, groupsConfigured: true, groups: (current.groups || []).filter((item) => item.jid !== element.dataset.jid) };
      renderCatalogFrame();
      return;
    }
    if (action === 'refresh-groups') { await loadGroups(); return; }
    if (action === 'select-all-members') { state.members.forEach((member) => state.selectedMembers.add(member.jid)); renderGroupsView(); return; }
    if (action === 'clear-members') { state.selectedMembers.clear(); renderGroupsView(); return; }
    if (action === 'member-prev') { state.memberPage = Math.max(0, state.memberPage - 1); renderMembers(); return; }
    if (action === 'member-next') { state.memberPage += 1; renderMembers(); return; }
    if (action === 'send-group') {
      const jids = state.members.filter((member) => state.selectedMembers.has(member.jid)).map((member) => member.jid);
      await sendBroadcast(jids, $('#group-message')?.value || '', delaySeconds('group-delay'), 'group-result', 'group');
      return;
    }
    if (action === 'send-manual') {
      const phones = parseManualNumbers().numbers;
      const jids = phones.map((phone) => `${phone}@s.whatsapp.net`);
      await sendBroadcast(jids, $('#manual-message')?.value || '', delaySeconds('manual-delay'), 'manual-result', 'manual');
      return;
    }
    if (action === 'refresh-progress') { await loadProgress(true); return; }
    if (action === 'cancel-broadcast') {
      if (!window.confirm('Batalkan sisa broadcast yang masih menunggu? Pesan yang sudah terkirim tidak dapat ditarik.')) return;
      const result = await api('/broadcast/batal', { method: 'POST', body: '{}' });
      toast(result.pesan || 'Broadcast dibatalkan.');
      await loadProgress();
      return;
    }
    if (action === 'clear-broadcast-queue') {
      if (!window.confirm('Batalkan seluruh pesan broadcast yang masih menunggu? Pesan yang sudah terkirim tetap diterima.')) return;
      const result = await api('/antrean/lokal', { method: 'POST', body: JSON.stringify({ hapus_broadcast: true }) });
      toast(`${number(result.dihapus)} pesan broadcast dibatalkan.`);
      await loadProgress();
      return;
    }
    if (action === 'delete-queue-item') {
      if (!window.confirm('Hapus pesan ini dari antrean?')) return;
      await api('/antrean/lokal', { method: 'POST', body: JSON.stringify({ hapus: element.dataset.id }) });
      toast('Pesan dihapus dari antrean.');
      await loadProgress();
      return;
    }
    if (action === 'retry-discarded') {
      if (!window.confirm('Masukkan pesan gagal ini ke antrean untuk dikirim ulang?')) return;
      await api('/antrean/lokal', { method: 'POST', body: JSON.stringify({ ulang: element.dataset.id }) });
      toast('Pesan dimasukkan kembali ke antrean.');
      await loadProgress();
      return;
    }
    if (action === 'delete-discarded') {
      if (!window.confirm('Hapus catatan pesan gagal ini?')) return;
      await api('/antrean/lokal', { method: 'POST', body: JSON.stringify({ hapus_catatan: element.dataset.id }) });
      await loadProgress();
      return;
    }
    if (action === 'clear-discarded') {
      if (!window.confirm('Bersihkan semua catatan pesan gagal?')) return;
      await api('/antrean/lokal', { method: 'POST', body: JSON.stringify({ bersihkan_catatan: true }) });
      await loadProgress();
      return;
    }
    if (action === 'refresh-history') { await loadHistory(); return; }
    if (action === 'refresh-devices') { await loadDevices(); return; }
    if (action === 'save-catalog') {
      const result = $('#catalog-result');
      const channels = $('#catalog-channels').value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.includes(' | ') ? line.split(' | ').slice(-1)[0].trim() : line);
      element.disabled = true;
      if (result) { result.className = 'broadcast-result'; result.textContent = 'Memeriksa saluran dan menyimpan…'; }
      try {
        const current = state.catalogDistribution || {};
        const groupsConfigured = state.catalogGroupsTouched || current.groupsConfigured === true;
        state.catalogDistribution = await api('/settings/catalog-distribution', { method: 'POST', body: JSON.stringify({ enabled: $('#catalog-enabled').checked, channels, groups: (current.groups || []).map((item) => item.jid), groupsConfigured }) });
        state.catalogGroupsTouched = false;
        renderCatalogFrame();
        const saved = $('#catalog-result');
        if (saved) { saved.className = 'broadcast-result'; saved.textContent = `Pengaturan tersimpan. ${number(state.catalogDistribution.channels.length)} saluran siap menjadi tujuan katalog otomatis.`; }
      } catch (error) {
        if (result) { result.className = 'broadcast-result error'; result.textContent = error.message; }
        toast(error.message, true);
        element.disabled = false;
      }
      return;
    }
    if (action === 'load-primary-qr') { await showQr(1); return; }
    if (action === 'load-secondary-qr') { await showQr(2); }
  }
  function attachEvents() {
    $('#page-content').addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]');
      if (tab) { switchTab(tab.dataset.tab); return; }
      const action = event.target.closest('[data-action]');
      if (action) handleAction(action.dataset.action, action).catch((error) => toast(error.message, true));
    });
    $('#page-content').addEventListener('change', (event) => {
      if (event.target.id === 'group-select') loadMembers(event.target.value);
      if (event.target.matches('[data-member-jid]')) {
        const jid = event.target.dataset.memberJid;
        if (event.target.checked) state.selectedMembers.add(jid); else state.selectedMembers.delete(jid);
        updateGroupEstimate();
      }
    });
    $('#page-content').addEventListener('input', (event) => {
      if (event.target.id === 'member-search') { state.memberSearch = event.target.value; state.memberPage = 0; renderMembers(); }
      if (event.target.id === 'group-delay') updateGroupEstimate();
    });
  }
  async function initialize() {
    state.token = tokenFromStorage();
    attachEvents();
    renderShell();
    await Promise.all([refreshQuickStatus(), loadGroups()]);
    state.poller = window.setInterval(() => {
      if (state.tab === 'progress') loadProgress();
      else refreshQuickStatus();
    }, 8000);
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();

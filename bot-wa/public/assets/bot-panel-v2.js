(() => {
  'use strict';

  const TOKEN_KEY = 'bot_api_token';
  const TITLES = {
    overview: 'Ringkasan', inbox: 'Inbox', queue: 'Antrean', broadcast: 'Broadcast',
    devices: 'Perangkat', settings: 'Pengaturan', tools: 'Alat bot', activity: 'Aktivitas',
  };
  const state = {
    token: '', view: 'overview', status: null, stats: null, chats: [], activeJid: '', activeName: '',
    queue: null, targets: [], serverTargets: [], importedTargets: [], targetsMax: 50,
    xlsxRows: null, xlsxPreview: null, tool: 'blocklist', toolData: {}, modules: {}, moduleDefaults: {},
    intervals: [], selectedGroup: '',
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
  }
  function number(value) { return new Intl.NumberFormat('id-ID').format(Number(value) || 0); }
  function dateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  function shortTime(value) {
    if (!value) return '—';
    const date = typeof value === 'number' ? new Date(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(date);
  }
  function uptime(value) {
    let seconds = Math.max(0, Number(value) || 0);
    const days = Math.floor(seconds / 86400); seconds %= 86400;
    const hours = Math.floor(seconds / 3600); seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    return [days && `${days}h`, hours && `${hours}j`, minutes && `${minutes}m`].filter(Boolean).join(' ') || '<1m';
  }
  function phoneDigits(jid) { return String(jid || '').split('@')[0].replace(/\D/g, ''); }
  function maskJid(jid) {
    const raw = phoneDigits(jid);
    if (!raw) return String(jid || '—');
    return `+${raw.slice(0, 2)}${'•'.repeat(Math.max(3, raw.length - 6))}${raw.slice(-4)}`;
  }
  function redact(text) {
    return String(text ?? '')
      .replace(/\b(?:\+?62|0)\d[\d\s().-]{7,}\d\b/g, (match) => maskJid(match.replace(/\D/g, '')))
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
      .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi, '$1[disamarkan]')
      .replace(/\b(?:sk|pk|ghp|gho|github_pat)_[A-Za-z0-9_-]{12,}\b/g, '[secret]');
  }
  function toast(message, isError = false) {
    const node = document.createElement('div');
    node.className = `toast${isError ? ' error' : ''}`;
    node.textContent = String(message || (isError ? 'Permintaan gagal.' : 'Selesai.'));
    $('#toast-region').append(node);
    window.setTimeout(() => node.remove(), 4200);
  }
  function setConnection(connected, warning = false, label) {
    const pill = $('#connection-pill');
    const dot = $('.status-dot', pill);
    const text = $('span:last-child', pill);
    pill.classList.remove('is-checking', 'is-online', 'is-offline', 'is-warning');
    dot.classList.remove('online', 'offline', 'warning');
    if (warning) {
      pill.classList.add('is-warning'); dot.classList.add('warning'); text.textContent = label || 'Perlu tindakan';
    } else if (connected) {
      pill.classList.add('is-online'); dot.classList.add('online'); text.textContent = label || 'WhatsApp tersambung';
    } else {
      pill.classList.add('is-offline'); dot.classList.add('offline'); text.textContent = label || 'WhatsApp terputus';
    }
    $('#sidebar-dot').className = `status-dot ${warning ? 'warning' : connected ? 'online' : 'offline'}`;
    $('#sidebar-status-text').textContent = label || (connected ? 'Bot tersambung' : warning ? 'Perlu tindakan' : 'Bot terputus');
  }
  function showLogin(error = '') {
    state.token = '';
    sessionStorage.removeItem(TOKEN_KEY);
    $('#session-check').hidden = true;
    $('#app-shell').hidden = true;
    $('#login-screen').hidden = false;
    const errorNode = $('#login-error');
    errorNode.textContent = error;
    errorNode.hidden = !error;
    $('#panel-password').value = '';
  }
  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', state.token);
    headers.set('Accept', 'application/json');
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, {
      ...options, headers, cache: 'no-store', credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      showLogin('Sesi panel berakhir. Masuk kembali untuk melanjutkan.');
      throw new Error('Sesi panel berakhir.');
    }
    if (!response.ok) throw new Error(data.error || `Permintaan gagal (HTTP ${response.status}).`);
    return data;
  }
  const get = (path) => request(path);
  const send = (path, body = {}, method = 'POST') => request(path, { method, body });
  function pageFrame(title, description, actions = '') {
    return `<div class="page-heading"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
  }
  function emptyState(title, copy) {
    return `<div class="empty-state"><strong>${esc(title)}</strong>${esc(copy)}</div>`;
  }
  function card(title, body, extra = '') {
    return `<section class="surface ${extra}"><div class="surface-head"><h3>${esc(title)}</h3></div><div class="surface-body">${body}</div></section>`;
  }
  function setView(view) {
    state.view = view in TITLES ? view : 'overview';
    $$('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === state.view));
    $('#page-title').textContent = TITLES[state.view];
    closeMobileNav();
    clearIntervals();
    renderView().catch((error) => toast(error.message, true));
    $('#page-content').focus({ preventScroll: true });
  }
  function requestedView() {
    const view = new URLSearchParams(window.location.search).get('view');
    return Object.prototype.hasOwnProperty.call(TITLES, view) ? view : 'overview';
  }
  function clearIntervals() {
    state.intervals.forEach(window.clearInterval);
    state.intervals = [];
  }
  function closeMobileNav() {
    $('#sidebar').classList.remove('open');
    $('#mobile-scrim').hidden = true;
    $('#mobile-menu').setAttribute('aria-expanded', 'false');
  }
  async function renderView() {
    const root = $('#page-content');
    root.innerHTML = `<div class="surface"><div class="empty-state">Memuat data panel…</div></div>`;
    if (state.view === 'overview') return loadOverview();
    if (state.view === 'inbox') return loadInbox();
    if (state.view === 'queue') return loadQueue();
    if (state.view === 'broadcast') return loadBroadcast();
    if (state.view === 'devices') return loadDevices();
    if (state.view === 'settings') return loadSettings();
    if (state.view === 'tools') return renderTools();
    if (state.view === 'activity') return loadActivity();
  }
  async function refreshStatus(quiet = false) {
    try {
      state.status = await get('/status?panel=1');
      const s = state.status;
      const needsScan = !!(s.menungguPindai || s.hasQR || s.sesiTerkunci);
      setConnection(!!s.connected, !s.connected && needsScan, s.connected ? 'WhatsApp tersambung' : s.sesiTerkunci ? 'Sesi terkunci' : s.menungguPindai ? 'Menunggu scan QR' : 'WhatsApp terputus');
      if (!quiet && state.view === 'overview') renderOverviewContent();
      return s;
    } catch (error) {
      if (state.token) setConnection(false, false, 'Status belum tersedia');
      if (!quiet) toast(error.message, true);
      return null;
    }
  }
  async function loadOverview() {
    await refreshStatus(true);
    try { state.stats = await get('/stats'); } catch { state.stats = null; }
    renderOverviewContent();
    state.intervals.push(window.setInterval(() => refreshStatus(true).then(() => renderOverviewContent()), 15000));
  }
  function renderOverviewContent() {
    if (state.view !== 'overview') return;
    const s = state.status || {};
    const today = s.today || {};
    const connected = !!s.connected;
    const warning = !connected && !!(s.sesiTerkunci || s.menungguPindai || s.hasQR);
    const heroClass = warning ? 'is-warning' : connected ? '' : 'is-offline';
    const heroTitle = connected ? 'Bot siap menerima pesan' : s.sesiTerkunci ? 'Sesi WhatsApp terkunci' : s.menungguPindai ? 'Perangkat menunggu ditautkan' : 'Bot belum tersambung';
    const heroText = connected ? 'Koneksi aktif. Pesan masuk dan antrean diproses oleh bot.' : s.sesiTerkunci ? 'Sesi perlu dipulihkan. Lihat petunjuk di halaman Perangkat sebelum mengambil tindakan.' : s.menungguPindai ? 'Bot sedang menunggu scan QR. Buka halaman Perangkat untuk menautkan nomor.' : 'Bot sedang mencoba menyambung kembali. Periksa status perangkat dan riwayat gangguan.';
    const uptimeText = uptime(s.uptime);
    const phone = s.phone ? maskJid(s.phone) : 'Belum terhubung';
    const action = !connected ? `<button class="button ${s.sesiTerkunci ? 'button-danger' : 'button-primary'}" data-action="open-devices">${s.sesiTerkunci ? 'Lihat pemulihan sesi' : 'Buka perangkat'}</button>` : `<button class="button" data-action="open-inbox">Lihat inbox</button>`;
    const recent = (state.stats?.daily && Object.entries(state.stats.daily).slice(-7)) || [];
    const week = recent.reduce((total, [, day]) => total + Number(day?.masuk || 0), 0);
    $('#page-content').innerHTML = `${pageFrame('Operasional WhatsApp', 'Status, beban pesan, dan perangkat dalam satu tempat.', `<button class="button" data-action="refresh-overview">Muat ulang</button>`)}
      <section class="status-hero ${heroClass}"><div class="status-main"><span class="status-symbol" aria-hidden="true">${connected ? '✓' : warning ? '!' : '×'}</span><div><h2>${esc(heroTitle)}</h2><p>${esc(heroText)}</p><div class="inline-actions">${action}<button class="button button-quiet" data-action="open-queue">Lihat antrean</button></div></div></div><div class="status-side"><span>Nomor utama</span><strong>${esc(phone)}</strong><small>${connected ? `Terhubung sejak ${dateTime(s.connectedAt)}` : `Pengecekan terakhir ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}</small></div></section>
      <div class="metric-row"><div class="metric"><div class="metric-label">Pesan masuk hari ini</div><div class="metric-value">${number(today.masuk)}</div><div class="metric-note">${number(week)} pesan dalam 7 hari terakhir</div></div><div class="metric"><div class="metric-label">Pesan keluar hari ini</div><div class="metric-value">${number(today.keluar)}</div><div class="metric-note">Termasuk balasan bot dan admin</div></div><div class="metric"><div class="metric-label">Antrean lokal</div><div class="metric-value">${number(s.queueLength)}</div><div class="metric-note">Pesan menunggu di proses ini</div></div><div class="metric"><div class="metric-label">Percakapan tersimpan</div><div class="metric-value">${number(s.chatCount)}</div><div class="metric-note">Arsip ${number(s.archiveCount)} pesan</div></div></div>
      <div class="content-grid"><div class="stack">${card('Ringkasan koneksi', `<div class="kv-list"><div class="kv-row"><span>Status perangkat</span><strong>${connected ? '<span class="badge good">Tersambung</span>' : warning ? '<span class="badge warn">Perlu tindakan</span>' : '<span class="badge bad">Terputus</span>'}</strong></div><div class="kv-row"><span>Lama proses hidup</span><strong>${esc(uptimeText)}</strong></div><div class="kv-row"><span>Putus koneksi sejak start</span><strong>${number(s.outageCount)}</strong></div><div class="kv-row"><span>Percobaan sambung ulang</span><strong>${number(s.reconnectAttempts)}</strong></div><div class="kv-row"><span>Gangguan terakhir</span><strong>${esc(s.lastOutage ? dateTime(s.lastOutage) : 'Belum ada')}</strong></div></div>`)}${card('Layanan pesan', `<div class="kv-list"><div class="kv-row"><span>Webhook</span><strong>${s.webhookUrl ? 'Terkonfigurasi' : 'Belum tersedia'}</strong></div><div class="kv-row"><span>Antrean pesan singkat</span><strong>${number(s.queueLength)}</strong></div><div class="kv-row"><span>Arsip percakapan</span><strong>${number(s.archiveCount)} / ${number(state.stats?.archive?.cap)}</strong></div><div class="kv-row"><span>Sapaan</span><strong>${s.greetingCustom ? 'Kustom' : 'Bawaan'}</strong></div></div>`)} </div><div class="stack">${card('Pemulihan dan pemindaian', `<p class="form-hint">Keadaan perangkat menentukan langkah berikutnya. Membuka kunci atau meminta pairing dapat memutus sesi yang sedang aktif.</p><div class="inline-actions"><button class="button button-primary" data-action="open-devices">Kelola perangkat</button></div>${s.sesiTerkunci ? `<div class="warning-note" style="margin-top:14px">Sesi terkunci. Jangan restart berulang; tinjau keadaan dan tautan perangkat terlebih dahulu.</div>` : ''}`)}${card('Akses cepat', `<div class="kv-list"><button class="nav-item" data-action="open-inbox"><span class="nav-icon">◷</span>Buka percakapan</button><button class="nav-item" data-action="open-broadcast"><span class="nav-icon">↗</span>Kelola broadcast</button><button class="nav-item" data-action="open-settings"><span class="nav-icon">⚙</span>Atur sapaan dan modul</button></div>`)}</div></div>`;
  }

  async function loadInbox() {
    $('#page-content').innerHTML = `${pageFrame('Inbox', 'Baca arsip percakapan dan kirim balasan manual melalui antrean bot. Nomor ditampilkan tersamarkan.')}
      <section class="surface chat-layout"><div><div class="toolbar"><input class="field" id="chat-search" type="search" placeholder="Cari nama atau nomor" aria-label="Cari percakapan"><button class="button button-small" data-action="refresh-chats">Muat ulang</button></div><div class="chat-list" id="chat-list"><div class="empty-state">Memuat percakapan…</div></div></div><div class="chat-pane"><div class="chat-pane-head" id="thread-heading"><strong>Pilih percakapan</strong><span>Isi pesan hanya dimuat saat percakapan dibuka.</span></div><div class="message-thread" id="message-thread"><div class="empty-state">Pilih nama di sisi kiri untuk membaca arsip.</div></div><form class="composer" id="reply-form"><textarea id="reply-message" maxlength="4000" placeholder="Tulis balasan…" aria-label="Isi balasan" disabled></textarea><button class="button button-primary" id="reply-send" type="submit" disabled>Kirim</button></form></div></section>`;
    try { const data = await get('/chats'); state.chats = data.chats || []; renderChatList(); }
    catch (error) { $('#chat-list').innerHTML = emptyState('Percakapan belum dapat dimuat', error.message); }
    $('#chat-search').addEventListener('input', renderChatList);
  }
  function renderChatList() {
    const q = ($('#chat-search')?.value || '').trim().toLowerCase();
    const chats = state.chats.filter((chat) => !q || String(chat.name || '').toLowerCase().includes(q) || phoneDigits(chat.jid).includes(q.replace(/\D/g, '')));
    const container = $('#chat-list'); if (!container) return;
    $('#chat-count-badge').hidden = !state.chats.length;
    $('#chat-count-badge').textContent = state.chats.length > 99 ? '99+' : String(state.chats.length);
    if (!chats.length) { container.innerHTML = emptyState('Belum ada percakapan', 'Percakapan akan tampil setelah bot menerima pesan.'); return; }
    container.innerHTML = chats.slice(0, 200).map((chat) => `<button type="button" class="chat-row ${chat.jid === state.activeJid ? 'active' : ''}" data-action="select-chat" data-jid="${esc(chat.jid)}" data-name="${esc(chat.name || '')}"><strong>${esc(chat.name || maskJid(chat.jid))}</strong><span>${esc(redact(chat.preview || 'Belum ada ringkasan pesan'))}</span><span>${esc(shortTime(chat.lastTime))} · ${esc(maskJid(chat.jid))}</span></button>`).join('');
  }
  async function loadThread(jid, name = '') {
    state.activeJid = jid; state.activeName = name || maskJid(jid);
    $('#thread-heading').innerHTML = `<strong>${esc(state.activeName)}</strong><span>${esc(maskJid(jid))} · arsip percakapan</span>`;
    $('#reply-message').disabled = false; $('#reply-send').disabled = false;
    renderChatList(); $('#message-thread').innerHTML = `<div class="empty-state">Memuat arsip…</div>`;
    try {
      const data = await get(`/messages?jid=${encodeURIComponent(jid)}&limit=200`);
      const messages = data.messages || [];
      $('#message-thread').innerHTML = messages.length ? messages.map((message) => `<div class="message ${message.fromMe ? 'out' : ''}">${esc(redact(message.text || '[media]'))}<span class="message-meta">${esc(shortTime(message.time))}${message.type && message.type !== 'text' ? ` · ${esc(message.type)}` : ''}</span></div>`).join('') : emptyState('Belum ada arsip', 'Pesan lama sebelum arsip aktif mungkin tidak tersedia.');
      $('#message-thread').scrollTop = $('#message-thread').scrollHeight;
    } catch (error) { $('#message-thread').innerHTML = emptyState('Arsip gagal dimuat', error.message); }
  }

  async function loadQueue() {
    $('#page-content').innerHTML = `${pageFrame('Antrean pesan', 'Tinjau pesan lokal dan broadcast yang masih menunggu. Hapus hanya setelah memastikan pesan tidak perlu dikirim.')}
      <div id="queue-summary" class="metric-row"><div class="metric"><div class="metric-label">Status layanan</div><div class="metric-value">Memuat</div></div></div>
      <section class="surface"><div class="surface-head"><h3>Pesan menunggu</h3><div class="heading-actions"><button class="button button-small" data-action="refresh-queue">Muat ulang</button><button class="button button-danger button-small" data-action="clear-user-queue">Hapus antrean lokal</button></div></div><div class="table-wrap" id="queue-table"></div></section>
      <section class="surface" style="margin-top:16px"><div class="surface-head"><h3>Broadcast menunggu</h3><button class="button button-danger button-small" data-action="clear-broadcast-queue">Batalkan broadcast menunggu</button></div><div class="table-wrap" id="broadcast-queue-table"></div></section>`;
    await loadQueueData();
  }
  async function loadQueueData() {
    try {
      state.queue = await get('/antrean/lokal');
      const q = state.queue;
      $('#queue-summary').innerHTML = `<div class="metric"><div class="metric-label">Status pengiriman</div><div class="metric-value" style="font-size:15px">${q.siap ? 'Siap' : 'Belum siap'}</div><div class="metric-note">Perangkat aktif: ${esc(q.perangkatAktif || '—')}</div></div><div class="metric"><div class="metric-label">Pesan pribadi menunggu</div><div class="metric-value">${number(q.tertunda)}</div><div class="metric-note">Antrean proses ini</div></div><div class="metric"><div class="metric-label">Broadcast menunggu</div><div class="metric-value">${number(q.broadcastTertunda)}</div><div class="metric-note">Antrean terpisah</div></div><div class="metric"><div class="metric-label">Pesan dibuang</div><div class="metric-value">${number(q.dibuangTotal)}</div><div class="metric-note">Catatan 14 hari</div></div>`;
      $('#queue-table').innerHTML = renderQueueTable(q.items || [], true);
      $('#broadcast-queue-table').innerHTML = renderQueueTable(q.broadcastItems || [], false);
    } catch (error) { $('#queue-table').innerHTML = emptyState('Antrean belum dapat dimuat', error.message); }
  }
  function renderQueueTable(items, allowDelete) {
    if (!items.length) return emptyState('Antrean kosong', 'Tidak ada pesan yang menunggu di bagian ini.');
    return `<table><thead><tr><th>Tujuan</th><th>Pesan</th><th>Waktu masuk</th><th>Jenis</th><th></th></tr></thead><tbody>${items.map((item) => `<tr><td><strong>${esc(maskJid(item.jid))}</strong><span class="subtext">${item.grup ? 'Grup' : 'Percakapan'}</span></td><td>${esc(redact((item.message || '').slice(0, 110)))}${item.message?.length > 110 ? '…' : ''}</td><td>${esc(dateTime(item.ts))}</td><td><span class="badge ${item.jenis === 'broadcast' ? 'blue' : ''}">${item.jenis === 'broadcast' ? 'Broadcast' : 'Pesan'}</span></td><td>${allowDelete ? `<button class="button button-danger button-small" data-action="delete-queue-item" data-id="${esc(item.id)}">Hapus</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
  }

  async function loadBroadcast() {
    $('#page-content').innerHTML = `${pageFrame('Broadcast', 'Pilih penerima dari chat atau impor nomor dari Excel. Batas penerima per kirim mengikuti aturan server.')}
      <section class="surface xlsx-import-card"><div class="surface-head"><div><h3>Impor nomor dari Excel</h3><p>File diproses di browser dan tidak diunggah ke server.</p></div><span class="badge">.xlsx · maks. 20 MB</span></div><div class="surface-body"><div class="form-grid"><div class="form-field"><label class="field-label" for="broadcast-xlsx">Pilih file Excel (.xlsx)</label><input class="field" id="broadcast-xlsx" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div><div class="form-field"><label class="field-label" for="broadcast-xlsx-column">Kolom nomor WhatsApp</label><select class="field" id="broadcast-xlsx-column" disabled><option>Pilih file terlebih dahulu</option></select></div><div class="form-field full"><label class="plain-check"><input id="broadcast-xlsx-header" type="checkbox"> Baris pertama adalah judul kolom</label><p class="form-hint">Lembar pertama yang dibaca. Nomor dari kolom terpilih akan diperiksa dan duplikat dibuang.</p></div><div class="form-field full"><div id="broadcast-xlsx-summary" class="form-hint" aria-live="polite">Belum ada file yang dipilih.</div><button class="button button-primary" id="broadcast-xlsx-import" type="button" data-action="import-xlsx" disabled>Tambahkan nomor ke penerima</button></div></div></div></section>
      <div class="content-grid" style="margin-top:16px"><div class="stack"><section class="surface"><div class="surface-head"><div><h3>Daftar penerima</h3><p id="target-count">Memuat penerima…</p></div><button class="button button-small" data-action="refresh-targets">Segarkan daftar</button></div><div class="surface-body"><div class="toolbar" style="padding:0 0 12px;border:0"><input id="target-search" class="field" type="search" placeholder="Cari nama atau nomor"><div class="heading-actions"><button class="button button-small" data-action="select-all-targets">Pilih sampai batas kirim</button><button class="button button-quiet button-small" data-action="clear-targets">Kosongkan pilihan</button></div></div><div id="target-list" class="kv-list"></div><p class="form-hint" id="selected-count">0 dipilih</p></div></section></div><div class="stack"><section class="surface"><div class="surface-head"><h3>Isi broadcast</h3></div><form id="broadcast-form" class="surface-body form-grid"><div class="form-field full"><label class="field-label" for="broadcast-message">Pesan</label><textarea class="textarea-field" id="broadcast-message" maxlength="4000" required placeholder="Tulis pesan yang akan diterima setiap kontak."></textarea></div><div class="form-field"><label class="field-label" for="broadcast-delay">Jeda per pesan (detik)</label><input class="field" id="broadcast-delay" type="number" min="1" max="300" value="5"><p class="form-hint">Server membatasi jeda 1–300 detik.</p></div><div class="form-field"><label class="field-label">Ringkasan kirim</label><div class="warning-note" id="broadcast-estimate">Pilih penerima untuk menghitung estimasi.</div></div><div class="form-field full"><button class="button button-primary" id="broadcast-submit" type="submit">Tinjau dan mulai broadcast</button><p class="form-hint">Jika daftar lebih panjang dari batas server, kirim per beberapa gelombang. Nomor yang belum dipilih tetap ada di daftar sementara.</p></div></form></section></div></div><section class="surface" style="margin-top:18px"><div class="surface-head"><div><h3>Progres pengiriman</h3><p>Progres dibaca dari antrean bot.</p></div><button class="button button-small" data-action="refresh-broadcast-status">Muat ulang</button></div><div class="surface-body" id="broadcast-progress">Belum dimuat.</div></section>`;
    $('#target-search').addEventListener('input', renderTargets);
    $('#broadcast-xlsx').addEventListener('change', loadBroadcastXlsx);
    $('#broadcast-xlsx-column').addEventListener('change', updateBroadcastXlsxPreview);
    $('#broadcast-xlsx-header').addEventListener('change', updateBroadcastXlsxPreview);
    $('#broadcast-delay').addEventListener('input', updateBroadcastEstimate);
    await loadTargets(); await loadBroadcastStatus();
    state.intervals.push(window.setInterval(loadBroadcastStatus, 5000));
  }
  async function loadBroadcastXlsx(event) {
    const file = event.target.files?.[0];
    const summary = $('#broadcast-xlsx-summary');
    const column = $('#broadcast-xlsx-column');
    const importButton = $('#broadcast-xlsx-import');
    state.xlsxRows = null; state.xlsxPreview = null; importButton.disabled = true;
    if (!file) { summary.textContent = 'Belum ada file yang dipilih.'; return; }
    summary.textContent = 'Membaca lembar pertama…';
    try {
      if (!window.JBPhoneXlsx) throw new Error('Pembaca XLSX belum termuat. Muat ulang panel dan coba lagi.');
      const parsed = await window.JBPhoneXlsx.readRows(file);
      state.xlsxRows = parsed.rows;
      const width = Math.max(1, ...parsed.rows.map((row) => row.length));
      const guessedColumn = window.JBPhoneXlsx.detectPhoneColumn(parsed.headers);
      column.innerHTML = Array.from({ length: width }, (_, index) => {
        const heading = String(parsed.headers[index] ?? '').trim();
        const label = heading ? `Kolom ${columnLetters(index)} · ${heading}` : `Kolom ${columnLetters(index)}`;
        return `<option value="${index}">${esc(label)}</option>`;
      }).join('');
      column.disabled = false;
      if (guessedColumn >= 0) { column.value = String(guessedColumn); $('#broadcast-xlsx-header').checked = true; }
      else { column.value = '0'; $('#broadcast-xlsx-header').checked = false; }
      summary.textContent = `File “${file.name}” dibaca dari lembar “${parsed.sheetName}”. Pilih kolom nomor untuk melihat hasilnya.`;
      importButton.disabled = false;
      updateBroadcastXlsxPreview();
    } catch (error) {
      summary.textContent = error.message;
      column.disabled = true;
    }
  }
  function columnLetters(index) {
    let value = index + 1, label = '';
    while (value) { value -= 1; label = String.fromCharCode(65 + value % 26) + label; value = Math.floor(value / 26); }
    return label;
  }
  function updateBroadcastXlsxPreview() {
    if (!state.xlsxRows || !window.JBPhoneXlsx) return;
    const column = Number($('#broadcast-xlsx-column').value);
    const result = window.JBPhoneXlsx.extractPhones(state.xlsxRows, column, $('#broadcast-xlsx-header').checked);
    state.xlsxPreview = result;
    const limit = state.targetsMax || 50;
    const sample = result.numbers.slice(0, 3).map((phone) => esc(maskJid(`${phone}@s.whatsapp.net`))).join(', ');
    $('#broadcast-xlsx-summary').textContent = `${number(result.numbers.length)} nomor valid · ${number(result.duplicate)} duplikat dibuang · ${number(result.invalid)} baris tidak dikenali${result.numbers.length > limit ? ` · pilih maksimal ${number(limit)} per pengiriman` : ''}${sample ? ` · contoh tersamarkan: ${sample}` : ''}`;
  }
  function mergeBroadcastTargets() {
    const merged = new Map();
    for (const item of state.serverTargets) merged.set(item.jid, item);
    for (const item of state.importedTargets) {
      const existing = merged.get(item.jid);
      merged.set(item.jid, existing ? { ...existing, imported: true } : item);
    }
    state.targets = Array.from(merged.values());
    const importedCount = state.importedTargets.length;
    $('#target-count').textContent = `${number(state.serverTargets.length)} kontak chat${importedCount ? ` · ${number(importedCount)} dari Excel` : ''} · batas ${number(state.targetsMax)} per kirim`;
    renderTargets();
  }
  async function loadTargets() {
    try {
      const data = await get('/broadcast/targets');
      state.serverTargets = data.targets || []; state.targetsMax = Number(data.max) || 50;
      mergeBroadcastTargets();
      if (state.xlsxRows) updateBroadcastXlsxPreview();
    } catch (error) { $('#target-list').innerHTML = emptyState('Daftar penerima gagal dimuat', error.message); }
  }
  function renderTargets() {
    const targetList = $('#target-list'); if (!targetList) return;
    const query = ($('#target-search').value || '').toLowerCase();
    const items = state.targets.filter((item) => !query || String(item.name || '').toLowerCase().includes(query) || phoneDigits(item.jid).includes(query.replace(/\D/g, '')));
    if (!items.length) { targetList.innerHTML = emptyState('Belum ada penerima', 'Muat kontak yang pernah chat atau impor nomor dari file Excel.'); return; }
    targetList.innerHTML = items.map((item) => `<label class="module-row"><span><strong>${esc(item.name || maskJid(item.jid))}</strong><small>${esc(item.imported ? 'Kontak dari file Excel' : `Terakhir aktif ${shortTime(item.lastTime)}`)} · ${esc(maskJid(item.jid))}</small></span><input type="checkbox" data-target-jid="${esc(item.jid)}" aria-label="Pilih ${esc(item.name || maskJid(item.jid))}"></label>`).join('');
    updateBroadcastEstimate();
  }
  function selectedTargets() { return $$('[data-target-jid]:checked').map((item) => item.dataset.targetJid).slice(0, state.targetsMax); }
  function updateBroadcastEstimate() {
    const rawSelected = $$('[data-target-jid]:checked').length;
    const selected = selectedTargets();
    $('#selected-count').textContent = `${number(selected.length)} dari ${number(state.targetsMax)} dipilih${rawSelected > state.targetsMax ? ` · ${number(rawSelected - state.targetsMax)} di luar batas, tidak akan ikut` : ''}`;
    const delay = Math.min(300, Math.max(1, Number($('#broadcast-delay')?.value) || 5));
    const minutes = Math.ceil(selected.length * delay / 60);
    $('#broadcast-estimate').textContent = selected.length ? `${number(selected.length)} penerima · jeda ${delay} detik · estimasi sekitar ${minutes} menit.` : 'Pilih penerima untuk menghitung estimasi.';
  }

  async function loadBroadcastStatus() {
    if (state.view !== 'broadcast') return;
    try {
      const data = await get('/broadcast/status');
      const root = $('#broadcast-progress'); if (!root) return;
      if (!data.aktif && !data.selesai) { root.innerHTML = emptyState('Belum ada broadcast', 'Broadcast aktif dan terakhir akan muncul di sini.'); return; }
      const status = data.aktif ? 'Berjalan' : data.dibatalkan ? 'Dibatalkan' : 'Selesai';
      root.innerHTML = `<div class="kv-list"><div class="kv-row"><span>Status</span><strong><span class="badge ${data.aktif ? 'blue' : data.dibatalkan ? 'warn' : 'good'}">${status}</span></strong></div><div class="kv-row"><span>Progres</span><strong>${number(data.terkirim)} terkirim · ${number(data.gagal)} gagal · ${number(data.tertunda)} menunggu</strong></div><div class="kv-row"><span>Tujuan</span><strong>${number(data.total)}</strong></div><div class="kv-row"><span>Mulai</span><strong>${esc(dateTime(data.mulaiAt))}</strong></div></div><div style="margin:14px 0 8px" class="progress-track"><div class="progress-fill" style="width:${Math.max(0,Math.min(100,Number(data.pct)||0))}%"></div></div><div class="inline-actions">${data.aktif ? '<button class="button button-danger button-small" data-action="cancel-broadcast">Batalkan sisa pesan</button>' : ''}</div>${data.gagalTotal ? `<p class="form-hint" style="margin-top:12px">${number(data.gagalTotal)} pesan gagal; rincian tujuan disamarkan pada daftar.</p>` : ''}`;
    } catch (error) { $('#broadcast-progress').innerHTML = emptyState('Progres tidak tersedia', error.message); }
  }

  async function loadDevices() {
    await refreshStatus(true);
    const s = state.status || {};
    $('#page-content').innerHTML = `${pageFrame('Perangkat WhatsApp', 'Kelola tautan perangkat utama dan cadangan. Scan QR hanya saat kamu siap menggunakan ponsel yang dituju.')}
      <div class="content-grid"><div class="stack"><section class="surface"><div class="surface-head"><div><h3>Perangkat utama</h3><p>${s.connected ? `Aktif · ${esc(maskJid(s.phone))}` : 'Belum terhubung'}</p></div><span class="badge ${s.connected ? 'good' : s.sesiTerkunci ? 'bad' : 'warn'}">${s.connected ? 'Online' : s.sesiTerkunci ? 'Terkunci' : 'Offline'}</span></div><div class="surface-body qr-layout"><div class="qr-box" id="primary-qr"><p>Tekan “Tampilkan QR” untuk memeriksa keadaan tautan.</p></div><div><p class="form-hint">QR bersifat rahasia. Jangan kirim tangkapan layar atau bagikan kode ke orang lain. QR hanya ditampilkan di panel terautentikasi.</p><div class="inline-actions"><button class="button button-primary" data-action="load-primary-qr">Tampilkan QR</button></div><form id="pair-primary-form" class="form-field" style="margin-top:20px"><label class="field-label" for="pair-phone">Pairing code perangkat utama</label><input class="field" id="pair-phone" inputmode="numeric" placeholder="Nomor WhatsApp, contoh 62812…" required><button class="button" type="submit">Minta pairing code</button><div id="pair-code-result" class="badge" hidden></div></form></div></div></section><section class="surface"><div class="surface-head"><h3>Perbaikan sesi</h3></div><div class="surface-body"><p class="warning-note">Restart tidak memperbaiki sesi yang terkunci. Membuka kunci atau menghapus sesi akan meminta tautan QR baru.</p><div class="inline-actions"><button class="button button-danger" data-action="unlock-session" ${s.sesiTerkunci ? '' : 'disabled'}>Buka kunci dan minta tautan baru</button><button class="button button-quiet" data-action="restart-bot">Restart bot</button><button class="button button-danger button-small" data-action="reset-session">Hapus sesi WhatsApp</button></div></div></section></div><div class="stack"><section class="surface"><div class="surface-head"><div><h3>Perangkat cadangan</h3><p id="secondary-label">Memeriksa ketersediaan…</p></div><button class="button button-small" data-action="load-secondary">Segarkan</button></div><div class="surface-body"><div class="qr-box" id="secondary-qr"><p>Status perangkat cadangan belum dimuat.</p></div><div class="inline-actions"><button class="button button-small" data-action="load-secondary-qr">Tampilkan QR cadangan</button></div><div class="kv-list" id="secondary-status" style="margin-top:14px"></div><form id="pair-secondary-form" class="form-field" style="margin-top:16px"><label class="field-label" for="pair-secondary-phone">Minta pairing code cadangan</label><input class="field" id="pair-secondary-phone" inputmode="numeric" placeholder="Nomor WhatsApp, contoh 62812…" required><button class="button" type="submit">Minta pairing code</button><div id="pair-secondary-result" class="badge" hidden></div></form></div></section><section class="surface"><div class="surface-head"><h3>Keadaan proses</h3></div><div class="surface-body"><div class="kv-list"><div class="kv-row"><span>Uptime</span><strong>${esc(uptime(s.uptime))}</strong></div><div class="kv-row"><span>Pemindaian berikutnya</span><strong>${number(s.pindaiRetryMenit)} menit</strong></div><div class="kv-row"><span>Escalation offline</span><strong>${number(s.offlineEscalations)} / ${number(s.escalationThresholdMinutes)} menit</strong></div><div class="kv-row"><span>Sesi terakhir hilang</span><strong>${esc(dateTime(s.sessionLostAt))}</strong></div></div></div></section></div></div>`;
    loadSecondary();
  }
  async function loadPrimaryQr() {
    const target = $('#primary-qr'); if (!target) return;
    target.innerHTML = '<p>Memeriksa QR…</p>';
    try {
      const data = await get('/qr');
      if (data.qr) target.innerHTML = `<img alt="QR tautan WhatsApp utama" src="${data.qr.startsWith('data:image/png;base64,') ? data.qr : ''}">`;
      else target.innerHTML = `<p>${data.connected ? 'Perangkat sudah terhubung.' : data.menyiapkan ? 'Bot sedang menyiapkan sesi. Muat ulang beberapa detik lagi.' : 'QR belum tersedia.'}</p>`;
    } catch (error) { target.innerHTML = `<p>${esc(error.message)}</p>`; }
  }
  async function loadSecondary() {
    const target = $('#secondary-status'); if (!target) return;
    try {
      const s = await get('/perangkat2/status?panel=1');
      $('#secondary-label').textContent = s.adaBot2 ? 'Proses bot cadangan ditemukan' : 'Bot cadangan belum dikonfigurasi';
      target.innerHTML = `<div class="kv-row"><span>Status</span><strong>${s.connected ? 'Tersambung' : s.adaBot2 ? 'Belum tersambung' : 'Tidak tersedia'}</strong></div><div class="kv-row"><span>Nomor</span><strong>${esc(s.phone ? maskJid(s.phone) : '—')}</strong></div>`;
      if (s.adaBot2 && !s.connected) {
        const qr = await get('/perangkat2/qr');
        if (qr.qr && qr.qr.startsWith('data:image/png;base64,')) $('#secondary-qr').innerHTML = `<img alt="QR perangkat cadangan" src="${qr.qr}">`;
        else $('#secondary-qr').innerHTML = `<p>${qr.menyiapkan ? 'Bot cadangan menyiapkan QR…' : 'QR perangkat cadangan belum tersedia.'}</p>`;
      } else $('#secondary-qr').innerHTML = `<p>${s.connected ? 'Perangkat cadangan sudah tertaut.' : 'Tidak ada QR yang perlu dipindai.'}</p>`;
    } catch (error) { $('#secondary-label').textContent = 'Status tidak tersedia'; target.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; }
  }

  const MODULE_INFO = {
    panggilan: {
      title: 'Panggilan WhatsApp',
      description: 'Tentukan cara bot merespons panggilan suara atau video.',
      fields: {
        tolak: ['Tolak panggilan otomatis', 'Bot langsung menolak panggilan masuk.'],
        balas: ['Kirim balasan setelah menolak', 'Jelaskan bahwa nomor ini dijalankan oleh bot.'],
        pesan: ['Isi balasan panggilan', 'Teks yang dikirim setelah panggilan ditolak.'],
      },
    },
    antiban: {
      title: 'Perilaku pengiriman',
      description: 'Atur jeda pengiriman dan indikator mengetik untuk menghindari pola kirim yang terlalu cepat.',
      fields: {
        sinyalMengetik: ['Tampilkan “sedang mengetik”', 'Tampilkan indikator sebelum bot membalas.'],
        jedaAcak: ['Gunakan jeda acak', 'Acak waktu tunggu antar pesan agar pengiriman tidak seragam.'],
        jedaMin: ['Jeda minimum (milidetik)', 'Batas bawah jeda acak.'],
        jedaMax: ['Jeda maksimum (milidetik)', 'Batas atas jeda acak.'],
        batasJam: ['Batas pesan per jam', 'Isi 0 untuk tanpa batas tambahan.'],
      },
    },
    forensik: {
      title: 'Riwayat pesan yang berubah',
      description: 'Fitur ini menyimpan salinan pesan yang ditarik atau diedit. Gunakan tujuan notifikasi hanya jika diperlukan.',
      fields: {
        antiHapus: ['Catat pesan yang ditarik', 'Simpan isi pesan sebelum ditarik pengirim.'],
        antiEdit: ['Catat isi pesan sebelum diedit', 'Simpan teks asli saat pengirim mengedit pesan.'],
        tujuanNotif: ['Tujuan notifikasi (opsional)', 'Nomor atau JID grup penerima catatan.'],
      },
    },
  };
  const MODULE_FIELD_LABELS = Object.fromEntries(Object.entries(MODULE_INFO).flatMap(([moduleName, group]) =>
    Object.entries(group.fields).map(([fieldName, metadata]) => [`${moduleName}.${fieldName}`, metadata])
  ));

  async function loadSettings() {
    $('#page-content').innerHTML = `${pageFrame('Pengaturan bot', 'Semua pengaturan yang bisa diubah ada di halaman ini. Buka bagian yang ingin kamu atur.')}
      <nav class="settings-jump" aria-label="Pintasan pengaturan"><a href="#setting-profile">Profil</a><a href="#setting-greeting">Sapaan</a><a href="#setting-behavior">Perilaku bot</a><a href="#setting-privacy">Privasi</a><a href="#setting-contact">Kontak</a><a href="#setting-server">Server</a></nav>
      <div class="settings-layout">
        <section id="setting-profile" class="surface settings-section"><div class="surface-head"><div><h3>Profil WhatsApp</h3><p>Nama dan status yang terlihat oleh kontak.</p></div></div><form id="profile-form" class="surface-body form-grid"><div class="form-field"><label class="field-label" for="profile-name">Nama profil bot</label><input class="field" id="profile-name" maxlength="25" placeholder="Nama bot"></div><div class="form-field"><label class="field-label" for="profile-status">Status WhatsApp</label><input class="field" id="profile-status" maxlength="139" placeholder="Isi hanya jika ingin mengganti status"></div><div class="form-field full"><label class="plain-check"><input id="clear-profile-status" type="checkbox"> Hapus status WhatsApp saat ini</label><p class="form-hint">Status saat ini tidak dapat dibaca dari WhatsApp. Biarkan kosong jika tidak ingin mengubahnya.</p><button class="button button-primary" type="submit">Simpan profil</button></div></form></section>
        <section id="setting-greeting" class="surface settings-section"><div class="surface-head"><div><h3>Sapaan otomatis</h3><p>Pesan pertama yang dikirim bot saat menyapa pengguna.</p></div></div><form id="greeting-form" class="surface-body form-grid"><div class="form-field full"><label class="field-label" for="greeting-text">Isi sapaan</label><textarea class="textarea-field" id="greeting-text" maxlength="3000" required></textarea><p class="form-hint" id="greeting-help"></p></div><div class="form-field full"><div class="heading-actions"><button class="button button-primary" type="submit">Simpan sapaan</button><button class="button button-quiet" type="button" data-action="reset-greeting">Pakai sapaan bawaan</button></div></div></form></section>
        <section id="setting-behavior" class="surface settings-section"><div class="surface-head"><div><h3>Perilaku bot</h3><p>Atur panggilan, pola jeda pesan, dan pencatatan pesan yang diubah.</p></div></div><div class="surface-body" id="module-settings">Memuat pengaturan…</div></section>
        <section id="setting-privacy" class="surface settings-section"><div class="surface-head"><div><h3>Privasi WhatsApp</h3><p>Perubahan dikirim langsung ke pengaturan akun WhatsApp bot.</p></div></div><form id="privacy-form" class="surface-body form-grid"><p class="form-hint form-field full">Panel dapat mengubah privasi, tetapi backend tidak menyediakan pembacaan nilai saat ini. Pilih “Jangan ubah” untuk membiarkan pengaturan terkait tetap seperti sekarang.</p>${[['privacy-last-seen','Terakhir dilihat'],['privacy-photo','Foto profil'],['privacy-status','Info status']].map(([id,label])=>`<div class="form-field"><label class="field-label" for="${id}">${label}</label><select class="field" id="${id}"><option value="">Jangan ubah</option><option value="all">Semua orang</option><option value="contacts">Kontak saya</option><option value="contact_blacklist">Kontak saya, kecuali…</option><option value="none">Tidak ada</option></select></div>`).join('')}<div class="form-field"><label class="field-label" for="privacy-receipts">Laporan dibaca</label><select class="field" id="privacy-receipts"><option value="">Jangan ubah</option><option value="on">Aktif</option><option value="off">Nonaktif</option></select></div><div class="form-field full"><button class="button button-primary" type="submit">Simpan privasi</button></div></form></section>
        <section id="setting-contact" class="surface settings-section"><div class="surface-head"><div><h3>Kontak operasional</h3><p>Nomor yang dipakai untuk pemberitahuan dan bantuan.</p></div></div><form id="numbers-form" class="surface-body form-grid"><div class="form-field"><label class="field-label" for="owner-phone">Nomor alarm</label><input id="owner-phone" class="field" inputmode="tel" placeholder="08… atau 62…"><p class="form-hint">Dihubungi saat bot mengalami gangguan.</p></div><div class="form-field"><label class="field-label" for="backup-phone">Nomor bantuan/cadangan</label><input id="backup-phone" class="field" inputmode="tel" placeholder="08… atau 62…"><p class="form-hint">Ditampilkan pada halaman bantuan.</p></div><div class="form-field full"><button class="button button-primary" type="submit">Simpan nomor</button></div></form></section>
        <section id="setting-server" class="surface settings-section"><div class="surface-head"><div><h3>Konfigurasi server</h3><p>Informasi ini dikelola di server, bukan diubah dari panel.</p></div></div><div class="surface-body"><div class="kv-list"><div class="kv-row"><span>Prefix perintah bot</span><strong id="bot-prefix-value">—</strong></div><div class="kv-row"><span>Koneksi webhook</span><strong id="webhook-value">—</strong></div></div><p class="form-hint" style="margin-top:10px">Token akses, alamat webhook, jadwal proses, dan setelan layanan lain dikelola oleh pemilik server agar tidak berubah tanpa sengaja.</p></div></section>
      </div>`;
    try {
      const [settings, modules, profile] = await Promise.all([get('/settings'), get('/modul'), get('/profile')]);
      $('#greeting-text').value = settings.greeting || '';
      $('#greeting-help').textContent = `Maksimal ${number(settings.max)} karakter. Kata panggil admin: ${(settings.adminCallWords || []).join(', ') || 'min'}.`;
      $('#owner-phone').value = settings.ownerNumber || '';
      $('#backup-phone').value = settings.backupAdmin || '';
      $('#profile-name').value = profile.name || '';
      $('#clear-profile-status').checked = false;
      $('#bot-prefix-value').textContent = settings.botPrefix || 'Tidak disetel';
      $('#webhook-value').textContent = state.status?.webhookUrl ? 'Terkonfigurasi' : 'Tidak tersedia';
      state.modules = modules.modul || {};
      state.moduleDefaults = modules.bawaan || {};
      renderModules();
    } catch (error) { $('#module-settings').innerHTML = emptyState('Pengaturan belum dapat dimuat', error.message); }
  }
  function renderModules() {
    const root = $('#module-settings'); if (!root) return;
    const groups = Object.entries(state.modules);
    if (!groups.length) { root.innerHTML = emptyState('Belum ada pengaturan modul', 'Backend bot belum mengembalikan daftar modul.'); return; }
    root.innerHTML = groups.map(([name, value]) => {
      const info = MODULE_INFO[name] || { title: name.replace(/[_-]/g, ' '), description: 'Pengaturan modul bot.' };
      return `<details class="module-group"><summary><span><strong>${esc(info.title)}</strong><small>${esc(info.description)}</small></span><span class="details-chevron" aria-hidden="true">⌄</span></summary><div class="module-list">${moduleInputs(name, value, [])}</div><div class="module-footer"><button class="button button-quiet button-small" data-action="reset-module" data-module="${esc(name)}">Kembalikan bawaan</button><button class="button button-small button-primary" data-action="save-module" data-module="${esc(name)}">Simpan bagian ini</button></div></details>`;
    }).join('');
  }
  function moduleInputs(name, value, path) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return Object.entries(value).map(([key, child]) => moduleInputs(name, child, [...path, key])).join('');
    if (Array.isArray(value)) return '';
    const key = JSON.stringify([name, ...path]);
    const fieldKey = `${name}.${path.join('.')}`;
    const [label, description] = MODULE_FIELD_LABELS[fieldKey] || [path.join(' · ').replace(/[_-]/g, ' '), ''];
    if (typeof value === 'boolean') return `<label class="module-row"><span><strong>${esc(label)}</strong>${description ? `<small>${esc(description)}</small>` : ''}</span><span class="switch"><input type="checkbox" data-module-field="${esc(key)}" ${value ? 'checked' : ''} aria-label="${esc(label)}"><span></span></span></label>`;
    if (typeof value === 'number') {
      const suffix = fieldKey === 'antiban.jedaMin' || fieldKey === 'antiban.jedaMax' ? ' ms' : '';
      return `<label class="module-row"><span><strong>${esc(label)}</strong>${description ? `<small>${esc(description)}</small>` : ''}</span><input class="field module-value" type="number" min="0" data-module-field="${esc(key)}" data-value-type="number" value="${esc(value)}"><small class="module-suffix">${suffix}</small></label>`;
    }
    if (typeof value === 'string') {
      const multiline = fieldKey === 'panggilan.pesan';
      const input = multiline ? `<textarea class="textarea-field module-text" data-module-field="${esc(key)}" data-value-type="string">${esc(value)}</textarea>` : `<input class="field module-value" data-module-field="${esc(key)}" data-value-type="string" value="${esc(value)}">`;
      return `<label class="module-row"><span><strong>${esc(label)}</strong>${description ? `<small>${esc(description)}</small>` : ''}</span>${input}</label>`;
    }
    return '';
  }

  const TOOL_TABS = [
    ['blocklist', 'Blokir'], ['status', 'Status & polling'],
    ['groups', 'Grup'], ['channels', 'Saluran'], ['privacy', 'Data & privasi'],
  ];
  async function renderTools() {
    $('#page-content').innerHTML = `${pageFrame('Alat bot', 'Kelola blokir, status, grup, saluran, dan data percakapan.')}
      <section class="surface"><div class="toolbar">${TOOL_TABS.map(([key, label]) => `<button class="button button-small ${state.tool === key ? 'button-primary' : ''}" data-tool="${key}">${label}</button>`).join('')}</div><div class="surface-body" id="tool-content">Memuat alat…</div></section>`;
    await loadTool(state.tool);
  }
  async function loadTool(tool) {
    state.tool = TOOL_TABS.some(([key]) => key === tool) ? tool : 'blocklist';
    $$('.button[data-tool]').forEach((button) => button.classList.toggle('button-primary', button.dataset.tool === state.tool));
    const root = $('#tool-content'); if (!root) return;
    root.innerHTML = '<div class="empty-state">Memuat…</div>';
    if (state.tool === 'blocklist') {
      try { const data = await get('/blocklist'); root.innerHTML = `<div class="content-grid"><div><h3>Nomor diblokir</h3><div class="table-wrap">${(data.blocklist || []).length ? `<table><thead><tr><th>Nomor</th><th></th></tr></thead><tbody>${data.blocklist.map((jid) => `<tr><td>${esc(maskJid(jid))}</td><td class="table-actions"><button class="button button-small" data-action="unblock" data-jid="${esc(jid)}">Buka blokir</button></td></tr>`).join('')}</tbody></table>` : emptyState('Tidak ada blokir', 'Daftar blokir WhatsApp sedang kosong.')}</div></div><form id="block-form" class="form-field"><h3>Blokir nomor</h3><label class="field-label" for="block-phone">Nomor WhatsApp</label><input id="block-phone" class="field" inputmode="tel" required placeholder="08… atau 62…"><p class="form-hint">Pemblokiran berlaku langsung pada akun WhatsApp bot.</p><button class="button button-danger" type="submit">Blokir nomor</button></form></div>`; }
      catch (error) { root.innerHTML = emptyState('Daftar blokir tidak tersedia', error.message); }
      return;
    }
    if (state.tool === 'profile') {
      try { const profile = await get('/profile'); root.innerHTML = `<div class="content-grid"><div class="kv-list"><div class="kv-row"><span>Nama bot</span><strong>${esc(profile.name || '—')}</strong></div><div class="kv-row"><span>Nomor</span><strong>${esc(profile.phone ? maskJid(profile.phone) : '—')}</strong></div></div><form id="profile-form" class="form-grid"><div class="form-field"><label class="field-label" for="profile-name">Nama profil</label><input class="field" id="profile-name" value="${esc(profile.name || '')}" maxlength="25"></div><div class="form-field"><label class="field-label" for="profile-status">Status profil</label><input class="field" id="profile-status" maxlength="139" placeholder="Status WhatsApp"></div><div class="form-field full"><button class="button button-primary" type="submit">Simpan profil</button></div></form></div>`; }
      catch (error) { root.innerHTML = emptyState('Profil tidak tersedia', error.message); }
      return;
    }
    if (state.tool === 'status') {
      try { const data = await get('/story'); root.innerHTML = `<div class="content-grid"><form id="story-form" class="form-grid"><h3 class="form-field full">Pasang status WhatsApp</h3><div class="form-field full"><label class="field-label" for="story-text">Teks status</label><textarea class="textarea-field" id="story-text" maxlength="700" required></textarea></div><div class="form-field full"><p class="form-hint">Panel baru hanya memasang status teks. Pengiriman gambar menunggu pembatasan aman untuk pengambilan media oleh server.</p></div><div class="form-field full"><button class="button button-primary" type="submit">Tinjau dan pasang status</button></div></form><form id="poll-form" class="form-grid"><h3 class="form-field full">Kirim polling</h3><div class="form-field full"><label class="field-label" for="poll-target">Tujuan nomor atau JID grup</label><input class="field" id="poll-target" required placeholder="Nomor 62… atau JID grup"></div><div class="form-field full"><label class="field-label" for="poll-name">Pertanyaan</label><input class="field" id="poll-name" required maxlength="250"></div><div class="form-field full"><label class="field-label" for="poll-options">Pilihan jawaban (satu per baris)</label><textarea class="textarea-field" id="poll-options" required placeholder="Pilihan A\nPilihan B"></textarea></div><div class="form-field full"><button class="button button-primary" type="submit">Antrekan polling</button></div></form></div><div style="margin-top:22px"><h3>Status tersimpan</h3>${(data.statuses || []).length ? `<div class="table-wrap"><table><thead><tr><th>Jenis</th><th>Konten</th><th>Diposting</th></tr></thead><tbody>${data.statuses.slice(-20).reverse().map((status) => `<tr><td>${esc(status.type || 'teks')}</td><td>${esc(redact((status.text || '').slice(0,100)) || '[gambar]')}</td><td>${esc(dateTime(status.timestamp))}</td></tr>`).join('')}</tbody></table></div>` : emptyState('Belum ada status', 'Status yang dipasang bot akan tercatat di sini.')}</div>`; }
      catch (error) { root.innerHTML = emptyState('Data status tidak tersedia', error.message); }
      return;
    }
    if (state.tool === 'groups') {
      try { const data = await get('/groups'); root.innerHTML = `<div class="content-grid"><div><div class="heading-actions" style="justify-content:space-between"><h3>Grup bot</h3><button class="button button-small" data-action="refresh-groups">Muat ulang</button></div>${(data.groups || []).length ? `<div class="table-wrap"><table><thead><tr><th>Nama grup</th><th>Anggota</th><th></th></tr></thead><tbody>${data.groups.map((group) => `<tr><td><strong>${esc(group.name || 'Tanpa nama')}</strong><span class="subtext">${group.isAdmin ? 'Admin' : group.isCommunity ? 'Komunitas' : 'Anggota'}</span></td><td>${number(group.participants)}</td><td class="table-actions"><button class="button button-small" data-action="group-invite" data-jid="${esc(group.jid)}">Tautan</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('Daftar grup kosong', 'Bot belum bergabung ke grup atau daftar belum tersedia.')}</div><form id="group-form" class="form-grid"><h3 class="form-field full">Buat grup baru</h3><div class="form-field full"><label class="field-label" for="group-name">Nama grup</label><input class="field" id="group-name" required maxlength="100"></div><div class="form-field full"><label class="field-label" for="group-members">Nomor anggota (satu per baris)</label><textarea class="textarea-field" id="group-members" required placeholder="62812…"></textarea></div><div class="form-field full"><button class="button button-primary" type="submit">Buat grup</button></div></form></div>`; }
      catch (error) { root.innerHTML = emptyState('Daftar grup tidak tersedia', error.message); }
      return;
    }
    if (state.tool === 'channels') {
      try { const data = await get('/newsletters'); root.innerHTML = `<div class="content-grid"><div>${(data.newsletters || []).length ? `<div class="table-wrap"><table><thead><tr><th>Nama saluran</th><th>Pengikut</th><th>ID</th></tr></thead><tbody>${data.newsletters.map((item) => `<tr><td><strong>${esc(item.name || 'Tanpa nama')}</strong><span class="subtext">${esc((item.description || '').slice(0,100))}</span></td><td>${number(item.subscribers)}</td><td>${esc(item.jid)}</td></tr>`).join('')}</tbody></table></div>` : emptyState('Belum ada saluran', 'Tambahkan tautan undangan saluran untuk mengelolanya.')}</div><div class="stack"><form id="newsletter-form" class="form-field"><h3>Tambahkan saluran</h3><label class="field-label" for="newsletter-invite">Tautan undangan</label><input class="field" id="newsletter-invite" type="url" required placeholder="https://whatsapp.com/channel/…"><button class="button button-primary" type="submit">Tambahkan</button></form><form id="channel-send-form" class="form-grid"><h3 class="form-field full">Kirim pembaruan</h3><div class="form-field full"><label class="field-label" for="channel-jid">JID saluran</label><input class="field" id="channel-jid" required placeholder="…@newsletter"></div><div class="form-field full"><label class="field-label" for="channel-message">Pesan</label><textarea class="textarea-field" id="channel-message" required maxlength="4000"></textarea></div><div class="form-field full"><button class="button button-primary" type="submit">Tinjau dan kirim</button></div></form></div></div>`; }
      catch (error) { root.innerHTML = emptyState('Data saluran tidak tersedia', error.message); }
      return;
    }
    if (state.tool === 'privacy') {
      try {
        const [context, lid] = await Promise.all([get('/context'), get('/lid-map')]);
        const entries = context.entries || []; const lids = lid.entries || [];
        root.innerHTML = `<div class="warning-note">Bagian ini menyimpan metadata percakapan dan pemetaan identitas WhatsApp. Nomor disamarkan; hapus data hanya jika memang perlu.</div><div class="content-grid" style="margin-top:16px"><div><div class="heading-actions" style="justify-content:space-between"><h3>Konteks percakapan · ${number(entries.length)}</h3><button class="button button-danger button-small" data-action="clear-context">Hapus semua konteks</button></div>${entries.length ? `<div class="table-wrap"><table><thead><tr><th>Kontak</th><th>Pesan konteks</th><th>Terakhir aktif</th><th></th></tr></thead><tbody>${entries.slice(0,100).map((item) => `<tr><td>${esc(maskJid(item.jid))}</td><td>${number(item.messages)}</td><td>${esc(dateTime(item.lastTime))}</td><td><button class="button button-small" data-action="delete-context" data-jid="${esc(item.jid)}">Hapus</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('Konteks kosong', 'Tidak ada data konteks percakapan.')}</div><div><div class="heading-actions" style="justify-content:space-between"><h3>Pemetaan LID · ${number(lids.length)}</h3></div>${lids.length ? `<div class="table-wrap"><table><thead><tr><th>Identitas LID</th><th>Nomor</th><th></th></tr></thead><tbody>${lids.slice(0,100).map((item) => `<tr><td>${esc(maskJid(item.lid))}</td><td>${esc(maskJid(item.phone))}</td><td><button class="button button-small" data-action="delete-lid" data-lid="${esc(item.lid)}">Hapus</button></td></tr>`).join('')}</tbody></table></div>` : emptyState('Pemetaan kosong', 'Belum ada pemetaan LID tersimpan.')}</div></div>`;
      } catch (error) { root.innerHTML = emptyState('Data privasi belum dapat dimuat', error.message); }
    }
  }

  async function loadActivity() {
    $('#page-content').innerHTML = `${pageFrame('Aktivitas dan statistik', 'Pantau tren pesan dan kejadian operasional. Data percakapan tidak disimpan di browser.')}
      <section class="surface"><div class="surface-head"><div><h3>Pesan masuk · 14 hari</h3><p>Nilai harian dari pencatatan proses bot.</p></div><button class="button button-small" data-action="refresh-activity">Muat ulang</button></div><div class="surface-body" id="activity-chart">Memuat…</div></section>
      <div class="content-grid" style="margin-top:18px"><section class="surface"><div class="surface-head"><h3>Ringkasan kejadian</h3></div><div class="table-wrap" id="activity-stats"></div></section><section class="surface"><div class="surface-head"><h3>Log sistem terbaru</h3><span class="badge">Disamarkan</span></div><div class="surface-body" id="system-logs">Memuat…</div></section></div>`;
    try {
      const [stats, logs] = await Promise.all([get('/stats'), get('/logs')]);
      state.stats = stats; renderStats(stats); renderLogs(logs.logs || []);
    } catch (error) { $('#activity-chart').innerHTML = emptyState('Aktivitas gagal dimuat', error.message); }
  }
  function renderStats(stats) {
    const labels = { masuk: 'Pesan masuk', keluar: 'Pesan keluar', sapaan: 'Sapaan terkirim', panggil_min: 'Panggilan admin', didiamkan: 'Chat admin yang didiamkan', sesi_bot: 'Sesi bot dibuka', balas_manual: 'Balasan manual', broadcast: 'Pesan broadcast', webhook_ok: 'Webhook berhasil', webhook_gagal: 'Webhook gagal', kirim_gagal: 'Pesan gagal', putus_koneksi: 'Gangguan koneksi' };
    const keys = Object.keys(labels).filter((key) => stats.total?.[key] !== undefined);
    $('#activity-stats').innerHTML = `<table><thead><tr><th>Peristiwa</th><th>Jumlah sejak awal</th></tr></thead><tbody>${keys.map((key) => `<tr><td>${labels[key]}</td><td><strong>${number(stats.total[key])}</strong></td></tr>`).join('') || '<tr><td colspan="2">Belum ada statistik.</td></tr>'}</tbody></table>`;
    const dayKeys = Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      const pad = (value) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    });
    const values = dayKeys.map((key) => Number(stats.daily?.[key]?.masuk || 0));
    const max = Math.max(1, ...values);
    $('#activity-chart').innerHTML = `<div class="chart">${values.map((value, index) => `<div class="chart-col" title="${esc(dayKeys[index])}: ${number(value)} pesan"><small>${value ? number(value) : ''}</small><div class="chart-bar" style="height:${Math.max(2,Math.round(value/max*100))}%"></div></div>`).join('')}</div><div class="chart-labels">${dayKeys.map((key) => `<span>${key.slice(8)}</span>`).join('')}</div><p class="form-hint" style="margin-top:12px">Arsip menyimpan ${number(stats.archive?.messages)} dari batas ${number(stats.archive?.cap)} pesan · data sejak ${esc(stats.since || '—')}.</p>`;
  }
  function renderLogs(logs) {
    const root = $('#system-logs');
    if (!Array.isArray(logs) || !logs.length) { root.innerHTML = emptyState('Belum ada log', 'Log sistem akan tampil saat proses bot mencatat kejadian.'); return; }
    root.innerHTML = `<div class="kv-list">${logs.slice(-50).reverse().map((item) => {
      const text = typeof item === 'string' ? item : item.message || item.text || JSON.stringify(item);
      const time = typeof item === 'object' ? item.time || item.timestamp : '';
      return `<div class="kv-row"><span>${esc(dateTime(time))}</span><strong style="max-width:72%;font-weight:600;text-align:left">${esc(redact(text).slice(0,240))}</strong></div>`;
    }).join('')}</div>`;
  }

  async function handleAction(action, element) {
    if (action === 'refresh-overview') { await refreshStatus(); state.stats = await get('/stats').catch(() => null); renderOverviewContent(); }
    if (action === 'open-devices') setView('devices');
    if (action === 'open-inbox') setView('inbox');
    if (action === 'open-queue') setView('queue');
    if (action === 'open-broadcast') setView('broadcast');
    if (action === 'open-settings') setView('settings');
    if (action === 'refresh-chats') await loadInbox();
    if (action === 'refresh-queue') await loadQueueData();
    if (action === 'refresh-targets') await loadTargets();
    if (action === 'import-xlsx') {
      const parsed = state.xlsxPreview;
      if (!parsed?.numbers?.length) return toast('Belum ada nomor valid dari file Excel.', true);
      state.importedTargets = parsed.numbers.map((phone) => ({ jid: `${phone}@s.whatsapp.net`, name: '', lastTime: 0, imported: true }));
      mergeBroadcastTargets();
      toast(`${number(parsed.numbers.length)} nomor dari Excel ditambahkan ke daftar penerima.`);
    }
    if (action === 'refresh-broadcast-status') await loadBroadcastStatus();
    if (action === 'refresh-activity') await loadActivity();
    if (action === 'load-primary-qr') await loadPrimaryQr();
    if (action === 'load-secondary') await loadSecondary();
    if (action === 'load-secondary-qr') {
      try {
        const data = await get('/perangkat2/qr');
        const target = $('#secondary-qr');
        target.innerHTML = data.qr && data.qr.startsWith('data:image/png;base64,') ? `<img alt="QR perangkat cadangan" src="${data.qr}">` : `<p>${data.menyiapkan ? 'Bot cadangan sedang menyiapkan QR.' : 'QR cadangan belum tersedia.'}</p>`;
      } catch (error) { $('#secondary-qr').innerHTML = `<p>${esc(error.message)}</p>`; }
    }
    if (action === 'refresh-groups') await loadTool('groups');
    if (action === 'select-chat') await loadThread(element.dataset.jid, element.dataset.name);
    if (action === 'select-all-targets') {
      const checkboxes = $$('[data-target-jid]');
      checkboxes.forEach((checkbox, index) => { checkbox.checked = index < state.targetsMax; });
      updateBroadcastEstimate();
    }
    if (action === 'clear-targets') { $$('[data-target-jid]').forEach((checkbox) => { checkbox.checked = false; }); updateBroadcastEstimate(); }
    if (action === 'delete-queue-item') {
      if (!window.confirm('Hapus pesan ini dari antrean? Pesan yang sudah terkirim tidak bisa ditarik.')) return;
      try { await send('/antrean/lokal', { hapus: element.dataset.id }); toast('Pesan dihapus dari antrean.'); await loadQueueData(); } catch (error) { toast(error.message, true); }
    }
    if (action === 'clear-user-queue') {
      if (!window.confirm('Hapus semua pesan pribadi yang masih menunggu?')) return;
      try { await send('/antrean/lokal', { hapus_user: true }); toast('Antrean lokal dikosongkan.'); await loadQueueData(); } catch (error) { toast(error.message, true); }
    }
    if (action === 'clear-broadcast-queue') {
      if (!window.confirm('Batalkan seluruh pesan broadcast yang masih menunggu? Pesan yang sudah terkirim tidak dapat ditarik.')) return;
      try { await send('/antrean/lokal', { hapus_broadcast: true }); toast('Sisa broadcast dibatalkan.'); await loadQueueData(); } catch (error) { toast(error.message, true); }
    }
    if (action === 'cancel-broadcast') {
      if (!window.confirm('Batalkan sisa broadcast aktif? Pesan yang sudah terkirim tetap diterima.')) return;
      try { await send('/broadcast/batal', {}); toast('Broadcast dibatalkan.'); await loadBroadcastStatus(); } catch (error) { toast(error.message, true); }
    }
    if (action === 'unlock-session') {
      if (!window.confirm('Buka kunci dan cadangkan sesi WhatsApp sekarang? Bot akan restart dan meminta QR baru. Lanjutkan hanya jika perangkat memang sudah dilepas di ponsel.')) return;
      try { await send('/sesi/buka-kunci', {}); toast('Permintaan pemulihan dikirim. Periksa status perangkat.'); } catch (error) { toast(error.message, true); }
    }
    if (action === 'restart-bot') {
      if (!window.confirm('Restart proses bot? Ini dapat membuat layanan terputus sementara.')) return;
      try { await send('/restart', {}); toast('Permintaan restart dikirim.'); } catch (error) { toast(error.message, true); }
    }
    if (action === 'reset-session') {
      const typed = window.prompt('Aksi ini menghapus sesi WhatsApp dan meminta scan QR baru. Ketik HAPUS SESI untuk lanjut.');
      if (typed !== 'HAPUS SESI') return;
      try { await send('/reset', {}); toast('Permintaan penghapusan sesi dikirim.'); } catch (error) { toast(error.message, true); }
    }
    if (action === 'unblock') {
      if (!window.confirm(`Buka blokir untuk ${maskJid(element.dataset.jid)}?`)) return;
      try { await send('/blocklist/unblock', { jid: element.dataset.jid }); toast('Blokir dibuka.'); await loadTool('blocklist'); } catch (error) { toast(error.message, true); }
    }
    if (action === 'reset-greeting') {
      if (!window.confirm('Kembalikan sapaan ke teks bawaan?')) return;
      try { await send('/settings/greeting/reset', {}); toast('Sapaan dikembalikan.'); await loadSettings(); } catch (error) { toast(error.message, true); }
    }
    if (action === 'save-module') await saveModule(element.dataset.module);
    if (action === 'reset-module') {
      const name = element.dataset.module;
      if (!state.moduleDefaults[name]) return toast('Nilai bawaan modul tidak tersedia.', true);
      if (!window.confirm(`Kembalikan “${MODULE_INFO[name]?.title || name}” ke pengaturan bawaan?`)) return;
      try {
        await send('/modul', { [name]: JSON.parse(JSON.stringify(state.moduleDefaults[name])) });
        toast('Pengaturan modul dikembalikan ke bawaan.');
        await loadSettings();
      } catch (error) { toast(error.message, true); }
    }
    if (action === 'tool-tab') await loadTool(element.dataset.tool);
    if (action === 'group-invite') {
      try { const data = await get(`/groups/${encodeURIComponent(element.dataset.jid)}/invite`); window.prompt('Tautan undangan grup', data.link || ''); } catch (error) { toast(error.message, true); }
    }
    if (action === 'delete-context') {
      if (!window.confirm('Hapus konteks percakapan tersimpan untuk kontak ini?')) return;
      try { await send('/context', { jid: element.dataset.jid }, 'DELETE'); toast('Konteks dihapus.'); await loadTool('privacy'); } catch (error) { toast(error.message, true); }
    }
    if (action === 'clear-context') {
      if (!window.confirm('Hapus SEMUA konteks percakapan tersimpan? Tindakan ini tidak dapat dibatalkan.')) return;
      try { await send('/context', {}, 'DELETE'); toast('Semua konteks dihapus.'); await loadTool('privacy'); } catch (error) { toast(error.message, true); }
    }
    if (action === 'delete-lid') {
      if (!window.confirm('Hapus pemetaan LID ini?')) return;
      try { await send('/lid-map', { lid: element.dataset.lid }, 'DELETE'); toast('Pemetaan dihapus.'); await loadTool('privacy'); } catch (error) { toast(error.message, true); }
    }
  }
  async function saveModule(name) {
    const original = JSON.parse(JSON.stringify(state.modules[name] || {}));
    $$('[data-module-field]').forEach((input) => {
      const path = JSON.parse(input.dataset.moduleField);
      if (path[0] !== name) return;
      let value = input.type === 'checkbox' ? input.checked : input.value;
      if (input.dataset.valueType === 'number') value = Number(value);
      setPath(original, path.slice(1), value);
    });
    try { await send('/modul', { [name]: original }); toast(`Modul ${name} disimpan.`); const data = await get('/modul'); state.modules = data.modul || {}; renderModules(); }
    catch (error) { toast(error.message, true); }
  }

  async function onSubmit(event) {
    const form = event.target;
    if (!form.id) return;
    event.preventDefault();
    const value = (id) => $(`#${id}`)?.value?.trim() || '';
    try {
      if (form.id === 'reply-form') {
        const message = value('reply-message'); if (!state.activeJid || !message) return;
        $('#reply-send').disabled = true;
        await send('/send', { target: state.activeJid, message });
        $('#reply-message').value = ''; toast('Balasan masuk antrean.');
        window.setTimeout(() => { if (state.view === 'inbox' && state.activeJid) loadThread(state.activeJid, state.activeName); }, 1400);
      }
      if (form.id === 'broadcast-form') {
        const jids = selectedTargets(); const message = value('broadcast-message');
        if (!jids.length || !message) return toast('Pilih penerima dan isi pesan.', true);
        const delayMs = Math.min(300, Math.max(1, Number(value('broadcast-delay')) || 5)) * 1000;
        const estimate = Math.ceil(jids.length * delayMs / 60000);
        if (!window.confirm(`Mulai broadcast ke ${jids.length} penerima?\nJeda per pesan: ${delayMs / 1000} detik.\nEstimasi: sekitar ${estimate} menit.`)) return;
        $('#broadcast-submit').disabled = true;
        const data = await send('/broadcast', { jids, message, delayMs });
        const sent = new Set(jids);
        $$('[data-target-jid]').forEach((checkbox) => { if (sent.has(checkbox.dataset.targetJid)) checkbox.checked = false; });
        updateBroadcastEstimate();
        toast(`${number(data.queued)} pesan masuk antrean broadcast.`);
        await loadBroadcastStatus();
      }
      if (form.id === 'greeting-form') {
        await send('/settings/greeting', { text: value('greeting-text') }); toast('Sapaan disimpan.');
      }
      if (form.id === 'numbers-form') {
        await send('/settings/nomor', { owner: value('owner-phone'), cadangan: value('backup-phone') }); toast('Nomor operasional disimpan.');
      }
      if (form.id === 'privacy-form') {
        const body = {};
        const lastSeen = value('privacy-last-seen'), profilePhoto = value('privacy-photo'), status = value('privacy-status'), receipts = value('privacy-receipts');
        if (lastSeen) body.lastSeen = lastSeen;
        if (profilePhoto) body.profilePhoto = profilePhoto;
        if (status) body.status = status;
        if (receipts) body.readReceipts = receipts === 'on';
        if (!Object.keys(body).length) return toast('Pilih setelan privasi yang ingin diubah.', true);
        if (!window.confirm('Terapkan perubahan privasi ini ke akun WhatsApp bot?')) return;
        await send('/set-privacy', body); toast('Privasi WhatsApp diperbarui.');
        form.reset();
      }
      if (form.id === 'pair-primary-form') {
        const data = await send('/pairing-code', { phone: value('pair-phone') });
        $('#pair-code-result').hidden = false; $('#pair-code-result').textContent = `Kode: ${data.code || '—'}`;
      }
      if (form.id === 'pair-secondary-form') {
        const data = await send('/perangkat2/pairing-code', { phone: value('pair-secondary-phone') });
        $('#pair-secondary-result').hidden = false; $('#pair-secondary-result').textContent = `Kode: ${data.code || '—'}`;
      }
      if (form.id === 'block-form') {
        if (!window.confirm(`Blokir nomor ${maskJid(value('block-phone'))} dari akun WhatsApp bot?`)) return;
        const digits = value('block-phone').replace(/\D/g, '').replace(/^0/, '62');
        await send('/blocklist/block', { jid: `${digits}@s.whatsapp.net` }); toast('Nomor diblokir.'); await loadTool('blocklist');
      }
      if (form.id === 'profile-form') {
        const name = value('profile-name'), status = value('profile-status');
        const clearStatus = $('#clear-profile-status').checked;
        if (!name && !status && !clearStatus) return toast('Isi nama atau status yang ingin diubah.', true);
        if (name) await send('/profile/name', { name });
        if (status || clearStatus) await send('/profile/status', { status: clearStatus ? '' : status });
        toast('Profil bot diperbarui.'); await loadSettings();
      }
      if (form.id === 'story-form') {
        if (!window.confirm('Pasang status ini agar dapat dilihat kontak WhatsApp bot selama 24 jam?')) return;
        await send('/story', { text: value('story-text') }); toast('Status ditambahkan.'); await loadTool('status');
      }
      if (form.id === 'poll-form') {
        const options = value('poll-options').split('\n').map((item) => item.trim()).filter(Boolean);
        if (options.length < 2 || options.length > 12) return toast('Polling perlu 2–12 pilihan.', true);
        if (!window.confirm(`Antrekan polling “${value('poll-name')}” ke ${maskJid(value('poll-target'))}?`)) return;
        await send('/send-poll', { target: value('poll-target'), name: value('poll-name'), options }); toast('Polling masuk antrean.');
      }
      if (form.id === 'group-form') {
        const participants = value('group-members').split('\n').map((item) => item.trim()).filter(Boolean);
        if (!window.confirm(`Buat grup “${value('group-name')}” dengan ${participants.length} anggota? WhatsApp akan mengirim undangan grup.`)) return;
        const data = await send('/groups/create', { name: value('group-name'), participants }); toast(`Grup dibuat${data.jid ? `: ${data.jid}` : ''}.`); await loadTool('groups');
      }
      if (form.id === 'newsletter-form') {
        const data = await send('/newsletters/add', { invite: value('newsletter-invite') }); toast(`Saluran ${data.data?.name || ''} ditambahkan.`); await loadTool('channels');
      }
      if (form.id === 'channel-send-form') {
        if (!window.confirm(`Kirim pembaruan ke saluran ${value('channel-jid')}?`)) return;
        await send('/channel/send', { jid: value('channel-jid'), message: value('channel-message') }); toast('Pembaruan dikirim ke saluran.');
      }
    } catch (error) { toast(error.message, true); }
    finally {
      const button = $('button[type="submit"]', form); if (button) button.disabled = false;
      if (form.id === 'reply-form' && $('#reply-send')) $('#reply-send').disabled = !state.activeJid;
    }
  }

  async function bootstrap() {
    $('#login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const candidate = $('#panel-password').value.trim();
      if (!candidate) return;
      $('#login-button').disabled = true;
      $('#login-error').hidden = true;
      try {
        const response = await fetch('/status?panel=1', { headers: { Authorization: candidate, Accept: 'application/json' }, cache: 'no-store' });
        if (response.status === 401 || !response.ok) throw new Error(response.status === 429 ? 'Terlalu banyak percobaan. Tunggu sebentar.' : 'Sandi panel tidak valid atau layanan belum siap.');
        state.token = candidate;
        sessionStorage.setItem(TOKEN_KEY, candidate);
        state.status = await response.json();
        $('#session-check').hidden = true;
        $('#login-screen').hidden = true; $('#app-shell').hidden = false;
        setConnection(!!state.status.connected, !state.status.connected && !!(state.status.sesiTerkunci || state.status.menungguPindai), state.status.connected ? 'WhatsApp tersambung' : state.status.sesiTerkunci ? 'Sesi terkunci' : state.status.menungguPindai ? 'Menunggu scan QR' : 'WhatsApp terputus');
        setView(requestedView());
      } catch (error) { $('#login-error').textContent = error.message; $('#login-error').hidden = false; }
      finally { $('#login-button').disabled = false; }
    });
    $('#logout-button').addEventListener('click', () => { clearIntervals(); showLogin(); });
    $('#mobile-menu').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-scrim').hidden = false; $('#mobile-menu').setAttribute('aria-expanded', 'true'); });
    $('#mobile-close').addEventListener('click', closeMobileNav);
    $('#mobile-scrim').addEventListener('click', closeMobileNav);
    $$('.nav-item[data-view]').forEach((button) => button.addEventListener('click', () => setView(button.dataset.view)));
    $('#page-content').addEventListener('click', (event) => {
      const toolTab = event.target.closest('[data-tool]');
      if (toolTab) { loadTool(toolTab.dataset.tool).catch((error) => toast(error.message, true)); return; }
      const element = event.target.closest('[data-action]');
      if (element) handleAction(element.dataset.action, element).catch((error) => toast(error.message, true));
    });
    $('#page-content').addEventListener('submit', onSubmit);
    $('#page-content').addEventListener('input', (event) => {
      if (event.target.id === 'broadcast-delay') updateBroadcastEstimate();
    });
    $('#page-content').addEventListener('change', (event) => {
      if (event.target.matches('[data-target-jid]')) updateBroadcastEstimate();
    });

    state.token = sessionStorage.getItem(TOKEN_KEY) || '';
    try {
      state.status = await get('/status?panel=1');
      $('#session-check').hidden = true;
      $('#login-screen').hidden = true; $('#app-shell').hidden = false;
      setConnection(!!state.status.connected, !state.status.connected && !!(state.status.sesiTerkunci || state.status.menungguPindai), state.status.connected ? 'WhatsApp tersambung' : state.status.sesiTerkunci ? 'Sesi terkunci' : state.status.menungguPindai ? 'Menunggu scan QR' : 'WhatsApp terputus');
      setView(requestedView());
    } catch { showLogin(); }
  }
  document.addEventListener('DOMContentLoaded', bootstrap);
})();

(() => {
  'use strict';
  const TOKEN_KEY = 'bot_api_token';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { token: '', view: 'site', siteFilter: 'tertunda', site: null, local: null, timer: 0, toastTimer: 0 };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function num(value) { return (Number(value) || 0).toLocaleString('id-ID'); }
  function when(value) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function mask(value) {
    const raw = String(value || '');
    const digits = raw.replace(/@[^@]+$/, '').replace(/\D/g, '');
    if (raw.includes('@g.us')) return `${digits.slice(0, 6) || 'Grup'}…@g.us`;
    return digits.length > 7 ? `+${digits.slice(0, 3)}••••${digits.slice(-3)}` : digits || '—';
  }
  function phone(value) {
    const digits = String(value || '').replace(/@[^@]+$/, '').replace(/\D/g, '');
    return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  }
  function tokenFromStorage() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }
  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', state.token);
    headers.set('Accept', 'application/json');
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...options, headers, cache: 'no-store', credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      window.location.href = `/?view=queue`;
      throw new Error('Sesi panel berakhir. Masuk kembali untuk melanjutkan.');
    }
    if (!response.ok) throw new Error(data.error || `Permintaan gagal (${response.status}).`);
    return data;
  }
  function toast(message, error = false) {
    const region = $('#toast-region');
    const node = document.createElement('div');
    node.className = `toast${error ? ' error' : ''}`;
    node.setAttribute('role', error ? 'alert' : 'status');
    node.textContent = message;
    region.replaceChildren(node);
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.remove(), 4200);
  }
  function setConnection(local) {
    const ready = !!local?.siap;
    const pill = $('#connection-pill');
    pill.className = `connection-pill ${ready ? 'is-online' : 'is-offline'}`;
    $('.status-dot', pill).className = `status-dot ${ready ? 'online' : 'offline'}`;
    $('span:last-child', pill).textContent = ready ? 'WhatsApp siap' : 'WhatsApp belum siap';
    $('#sidebar-dot').className = `status-dot ${ready ? 'online' : 'offline'}`;
    $('#sidebar-status-text').textContent = ready ? 'WhatsApp siap' : 'WhatsApp belum siap';
  }
  function empty(title, copy = '') {
    return `<div class="queue-empty"><strong>${esc(title)}</strong>${copy ? esc(copy) : ''}</div>`;
  }
  function badge(text, type = '') { return `<span class="queue-badge ${type}">${esc(text)}</span>`; }
  function statusMessage(text, error = false) {
    const node = $('#queue-status');
    if (!node) return;
    node.hidden = !text;
    node.className = `queue-status${error ? ' error' : ''}`;
    node.textContent = text || '';
  }
  function switchView(view) {
    if (!['site', 'local', 'discarded'].includes(view)) return;
    state.view = view;
    $$('.queue-tab').forEach((tab) => {
      const active = tab.dataset.view === view;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    renderView();
  }
  function renderView() {
    const root = $('#queue-panel');
    statusMessage('');
    if (state.view === 'site') root.innerHTML = renderSite();
    else if (state.view === 'local') root.innerHTML = renderLocal();
    else root.innerHTML = renderDiscarded();
  }
  function renderSite() {
    const data = state.site;
    if (!data) return `<div class="surface"><div class="queue-empty">Memuat antrean situs…</div></div>`;
    const items = data.items || [];
    const count = data.tertunda !== undefined ? Number(data.tertunda) || 0 : items.length;
    const status = data.status || state.siteFilter;
    return `<div class="queue-panel-stack">
      <div class="queue-summary"><div class="queue-summary-card"><span>Status filter</span><strong>${esc(status)}</strong></div><div class="queue-summary-card"><span>Hasil dimuat</span><strong>${num(items.length)}</strong></div><div class="queue-summary-card"><span>Tertunda</span><strong>${num(count)}</strong></div><div class="queue-summary-card"><span>Limit per muat</span><strong>200</strong></div></div>
      <div id="queue-status" class="queue-status" hidden></div>
      <section class="surface"><div class="queue-section-title"><div><h3>Notifikasi dari situs</h3><p>Pesan dititipkan situs ke antrean bot.</p></div><div class="heading-actions"><button class="button button-small" data-action="refresh-site">Muat ulang</button></div></div>
      <div class="queue-toolbar"><label class="field-label" for="site-filter">Tampilkan status</label><select class="field queue-filter" id="site-filter"><option value="tertunda"${state.siteFilter === 'tertunda' ? ' selected' : ''}>Tertunda</option><option value="terkirim"${state.siteFilter === 'terkirim' ? ' selected' : ''}>Sudah terkirim</option><option value="dibatalkan"${state.siteFilter === 'dibatalkan' ? ' selected' : ''}>Dibatalkan</option><option value="semua"${state.siteFilter === 'semua' ? ' selected' : ''}>Semua</option></select><div class="heading-actions"><button class="button button-primary button-small" data-action="send-all-site" ${items.length ? '' : 'disabled'}>Kirim semua tertunda</button><button class="button button-danger button-small" data-action="cancel-all-site">Batalkan semua tertunda</button></div></div>
      <div class="queue-list">${items.length ? items.map((item) => renderSiteItem(item)).join('') : empty('Antrean situs kosong', 'Tidak ada notifikasi pada status ini.')}</div></section>
    </div>`;
  }
  function renderSiteItem(item) {
    const pending = item.status === 'tertunda';
    const wa = pending && phone(item.target).length >= 8 ? `https://wa.me/${phone(item.target)}?text=${encodeURIComponent(item.message || '')}` : '';
    const stateType = item.status === 'terkirim' ? 'good' : item.status === 'gagal' ? 'bad' : 'warn';
    return `<article class="queue-item"><div class="queue-item-top"><strong class="queue-target">${esc(mask(item.target))}</strong>${item.jenis ? badge(item.jenis, 'blue') : ''}${badge(item.status || '—', stateType)}${item.percobaan ? badge(`${num(item.percobaan)}× dicoba`, 'warn') : ''}<span class="queue-time">${esc(when(item.created_at))}</span></div><p class="queue-message">${esc(item.message || '—')}</p>${item.galat_terakhir ? `<p class="queue-error">${esc(item.galat_terakhir)}</p>` : ''}<div class="queue-item-actions">${pending && wa ? `<a class="button button-small" href="${esc(wa)}" target="_blank" rel="noreferrer">Chat WhatsApp manual ↗</a>` : ''}${pending ? `<button class="button button-small" data-action="site-manual" data-id="${esc(item.id)}">Tandai terkirim</button><button class="button button-primary button-small" data-action="site-send" data-id="${esc(item.id)}">Kirim bot</button><button class="button button-danger button-small" data-action="site-cancel" data-id="${esc(item.id)}">Batalkan</button>` : ''}</div></article>`;
  }
  function renderLocal() {
    const data = state.local;
    if (!data) return `<div class="surface"><div class="queue-empty">Memuat antrean bot…</div></div>`;
    const userItems = data.items || [];
    const bcItems = data.broadcastItems || [];
    const total = Number(data.totalTertunda) || userItems.length + bcItems.length;
    const warning = data.siap ? (total ? 'WhatsApp siap; antrean bot diproses sesuai urutan layanan.' : '') : (data.sebab || 'WhatsApp belum tersambung; antrean tersimpan menunggu koneksi.');
    return `<div class="queue-panel-stack">
      <div class="queue-summary"><div class="queue-summary-card"><span>Status WhatsApp</span><strong>${data.siap ? 'Siap' : 'Belum siap'}</strong></div><div class="queue-summary-card"><span>Pesan pribadi</span><strong>${num(data.tertunda)}</strong></div><div class="queue-summary-card"><span>Broadcast</span><strong>${num(data.broadcastTertunda)}</strong></div><div class="queue-summary-card"><span>Pesan dibuang</span><strong>${num(data.dibuangTotal)}</strong></div></div>
      <div id="queue-status" class="queue-status"${warning ? '' : ' hidden'}>${esc(warning)}</div>
      <div class="queue-toolbar"><p>Perangkat aktif: <strong>${esc(data.perangkatAktif || '—')}</strong></p><div class="heading-actions"><button class="button button-small" data-action="refresh-local">Muat ulang</button><button class="button button-primary button-small" data-action="wake-queue"${!total || !data.siap ? ' disabled' : ''}>Proses antrean</button><button class="button button-danger button-small" data-action="clear-all-local"${!total ? ' disabled' : ''}>Hapus semua antrean</button></div></div>
      <div class="queue-grid"><section class="surface"><div class="queue-section-title"><div><h3>Pesan pribadi menunggu</h3><p>${num(userItems.length)} pesan lokal</p></div><button class="button button-danger button-small" data-action="clear-user">Kosongkan</button></div><div class="queue-list">${userItems.length ? userItems.map((item) => renderLocalItem(item, false)).join('') : empty('Tidak ada pesan pribadi menunggu.')}</div></section>
      <section class="surface"><div class="queue-section-title"><div><h3>Broadcast menunggu</h3><p>${num(bcItems.length)} pesan broadcast</p></div><button class="button button-danger button-small" data-action="clear-broadcast">Batalkan</button></div><div class="queue-list">${bcItems.length ? bcItems.map((item) => renderLocalItem(item, true)).join('') : empty('Tidak ada broadcast menunggu.')}</div></section></div>
      <div class="queue-warning">Mengosongkan antrean akan membatalkan pesan yang belum terkirim. Pesan yang sudah dikirim tidak dapat ditarik kembali.</div>
    </div>`;
  }
  function renderLocalItem(item, isBroadcast) {
    const waPhone = !item.grup ? phone(item.jid) : '';
    const chatLink = waPhone.length >= 8 ? `https://wa.me/${waPhone}?text=${encodeURIComponent(item.message || '')}` : '';
    const expiry = item.kedaluwarsa ? ` · ${esc(expiryText(item.kedaluwarsa))}` : '';
    return `<article class="queue-item"><div class="queue-item-top"><strong class="queue-target">${esc(mask(item.jid))}</strong>${badge(isBroadcast ? 'broadcast' : item.grup ? 'grup' : 'pribadi', isBroadcast ? 'blue' : '')}${item.url ? badge('bergambar') : ''}${item.percobaan ? badge(`${num(item.percobaan)}× dicoba`, 'warn') : ''}<span class="queue-time">${esc(when(item.ts))}${expiry}</span></div><p class="queue-message">${esc(item.message || '—')}</p><div class="queue-item-actions">${chatLink ? `<a class="button button-small" href="${esc(chatLink)}" target="_blank" rel="noreferrer">Chat WhatsApp manual ↗</a>` : ''}<button class="button button-danger button-small" data-action="delete-local" data-id="${esc(item.id)}">Hapus pesan</button></div></article>`;
  }
  function expiryText(value) {
    const ms = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return 'kedaluwarsa';
    const hours = Math.floor(ms / 3600000);
    return hours >= 24 ? `sisa ${Math.floor(hours / 24)} hari` : hours >= 1 ? `sisa ${hours} jam` : `sisa ${Math.max(1, Math.round(ms / 60000))} menit`;
  }
  function renderDiscarded() {
    const data = state.local;
    if (!data) return `<div class="surface"><div class="queue-empty">Memuat catatan pesan gagal…</div></div>`;
    const items = data.dibuang || [];
    return `<div class="queue-panel-stack"><div class="queue-summary"><div class="queue-summary-card"><span>Total catatan</span><strong>${num(data.dibuangTotal)}</strong></div><div class="queue-summary-card"><span>Ditampilkan</span><strong>${num(items.length)}</strong></div><div class="queue-summary-card"><span>Retensi</span><strong>14 hari</strong></div><div class="queue-summary-card"><span>WhatsApp</span><strong>${data.siap ? 'Siap' : 'Belum siap'}</strong></div></div><div id="queue-status" class="queue-status" hidden></div><section class="surface"><div class="queue-section-title"><div><h3>Pesan gagal atau dibuang</h3><p>Tinjau pesan sebelum mengantrekannya kembali.</p></div><div class="heading-actions"><button class="button button-small" data-action="refresh-local">Muat ulang</button>${items.length ? '<button class="button button-danger button-small" data-action="clear-discarded">Hapus semua catatan</button>' : ''}</div></div><div class="queue-list">${items.length ? items.map((item) => `<article class="queue-item"><div class="queue-item-top"><strong class="queue-target">${esc(mask(item.jid))}</strong>${badge('dibuang', 'bad')}<span class="queue-time">${esc(when(item.dibuangAt || item.ts))}</span></div><p class="queue-message">${esc(item.message || '—')}</p><p class="queue-error">${esc(item.sebab || item.reason || 'Alasan tidak tersedia')}</p><div class="queue-item-actions"><button class="button button-primary button-small" data-action="retry-discarded" data-id="${esc(item.id)}">Antrekan lagi</button><button class="button button-quiet button-small" data-action="delete-discarded" data-id="${esc(item.id)}">Lupakan catatan</button></div></article>`).join('') : empty('Tidak ada pesan dibuang.')}</div></section></div>`;
  }
  async function loadSite() {
    $('#queue-panel').innerHTML = `<div class="surface">${empty('Memuat antrean situs…')}</div>`;
    try {
      state.site = await api(`/antrean/data?status=${encodeURIComponent(state.siteFilter)}`);
      if (state.view === 'site') renderView();
    } catch (error) {
      if (state.view === 'site') $('#queue-panel').innerHTML = `<div class="surface">${empty('Antrean situs tidak dapat dimuat', error.message)}</div>`;
    }
  }
  async function loadLocal() {
    try {
      state.local = await api('/antrean/lokal');
      setConnection(state.local);
      if (state.view === 'local' || state.view === 'discarded') renderView();
    } catch (error) {
      if (state.view !== 'site') $('#queue-panel').innerHTML = `<div class="surface">${empty('Antrean bot tidak dapat dimuat', error.message)}</div>`;
      else toast(error.message, true);
    }
  }
  async function loadCurrent() {
    if (state.view === 'site') await loadSite();
    else await loadLocal();
  }
  async function postSite(body, confirmText, button) {
    if (confirmText && !window.confirm(confirmText)) return;
    const old = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Memproses…'; }
    try {
      const result = await api('/antrean/kirim', { method: 'POST', body: JSON.stringify(body) });
      const message = result.dibatalkan ? ['Pesan dibatalkan.', false]
        : result.manual ? ['Pesan ditandai sudah terkirim manual.', false]
          : result.gagal ? [`${num(result.terkirim)} terkirim, ${num(result.gagal)} masih gagal${result.alasan?.length ? ` — ${result.alasan.join('; ')}` : '.'}`, true]
            : result.terkirim ? [`${num(result.terkirim)} terkirim. Sisa ${num(result.sisa)} tertunda.`, false]
              : ['Permintaan antrean diterima.', false];
      await Promise.all([loadSite(), loadLocal()]);
      statusMessage(message[0], message[1]);
    } catch (error) { statusMessage(error.message, true); }
    finally { if (button?.isConnected) { button.disabled = false; button.textContent = old; } }
  }
  async function postLocal(body, confirmText, button) {
    if (confirmText && !window.confirm(confirmText)) return;
    const old = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Memproses…'; }
    try {
      const result = await api('/antrean/lokal', { method: 'POST', body: JSON.stringify(body) });
      const message = result.dibangunkan ? `Antrean diproses. ${num(result.sisa)} pesan masih menunggu.`
        : result.diantrekan ? 'Pesan dimasukkan kembali ke antrean.'
          : result.dihapusCatatan !== undefined ? `${num(result.dihapusCatatan)} catatan dihapus.`
            : result.dihapusBroadcast !== undefined ? `${num(result.dihapusBroadcast)} pesan broadcast dibatalkan.`
              : result.dihapusUser !== undefined ? `${num(result.dihapusUser)} pesan pribadi dihapus.`
                : result.dihapus !== undefined ? `${num(result.dihapus)} pesan dihapus.` : 'Perubahan disimpan.';
      await loadLocal();
      statusMessage(message);
    } catch (error) { statusMessage(error.message, true); }
    finally { if (button?.isConnected) { button.disabled = false; button.textContent = old; } }
  }
  async function handleAction(action, button) {
    const id = button.dataset.id;
    if (action === 'refresh-all') { await Promise.all([loadSite(), loadLocal()]); return; }
    if (action === 'refresh-site') { await loadSite(); return; }
    if (action === 'refresh-local') { await loadLocal(); return; }
    if (action === 'send-all-site') return postSite({ semua: true }, `Kirim semua ${num(state.site?.items?.length)} notifikasi tertunda ke bot?`, button);
    if (action === 'cancel-all-site') return postSite({ batal_semua: true }, 'Batalkan semua notifikasi situs yang masih tertunda?', button);
    if (action === 'site-send') return postSite({ id }, 'Kirim notifikasi ini ke antrean bot?', button);
    if (action === 'site-manual') return postSite({ manual: id }, 'Tandai notifikasi ini sudah terkirim secara manual?', button);
    if (action === 'site-cancel') return postSite({ batal: id }, 'Batalkan notifikasi ini?', button);
    if (action === 'wake-queue') return postLocal({ kirim: true }, null, button);
    if (action === 'clear-user') return postLocal({ hapus_user: true }, 'Kosongkan semua pesan pribadi yang masih menunggu?', button);
    if (action === 'clear-broadcast') return postLocal({ hapus_broadcast: true }, 'Batalkan semua broadcast yang masih menunggu?', button);
    if (action === 'clear-all-local') return postLocal({ hapus_semua: true }, 'Hapus seluruh antrean lokal dan batalkan broadcast tertunda?', button);
    if (action === 'delete-local') return postLocal({ hapus: id }, 'Hapus pesan ini dari antrean bot?', button);
    if (action === 'retry-discarded') return postLocal({ ulang: id }, 'Masukkan pesan gagal ini kembali ke antrean?', button);
    if (action === 'delete-discarded') return postLocal({ hapus_catatan: id }, 'Hapus catatan gagal ini?', button);
    if (action === 'clear-discarded') return postLocal({ bersihkan_catatan: true }, 'Hapus semua catatan pesan gagal?', button);
  }
  function attachEvents() {
    $('#queue-panel').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (button) handleAction(button.dataset.action, button).catch((error) => toast(error.message, true));
    });
    document.querySelector('.page-content').addEventListener('click', (event) => {
      const tab = event.target.closest('[data-view]');
      if (tab) switchView(tab.dataset.view);
    });
    document.querySelector('.page-content').addEventListener('change', (event) => {
      if (event.target.id === 'site-filter') { state.siteFilter = event.target.value; loadSite(); }
    });
    $('#mobile-menu').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-scrim').hidden = false; $('#mobile-menu').setAttribute('aria-expanded', 'true'); });
    $('#mobile-close').addEventListener('click', closeMobile);
    $('#mobile-scrim').addEventListener('click', closeMobile);
  }
  function closeMobile() {
    $('#sidebar').classList.remove('open');
    $('#mobile-scrim').hidden = true;
    $('#mobile-menu').setAttribute('aria-expanded', 'false');
  }
  async function initialize() {
    state.token = tokenFromStorage();
    attachEvents();
    switchView('site');
    await Promise.all([loadSite(), loadLocal()]);
    state.timer = window.setInterval(() => {
      if (state.view === 'site') loadSite();
      else loadLocal();
    }, 20000);
  }
  document.addEventListener('DOMContentLoaded', initialize);
})();

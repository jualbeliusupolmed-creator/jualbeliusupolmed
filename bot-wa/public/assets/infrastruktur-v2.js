(() => {
  'use strict';
  const TOKEN_KEY = 'bot_api_token';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const maskPhone = (value) => {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length > 7 ? `+${digits.slice(0, 3)}••••${digits.slice(-3)}` : 'Tidak tersedia';
  };
  const number = (value) => (Number(value) || 0).toLocaleString('id-ID');
  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  }
  async function api(path) {
    const response = await fetch(path, { headers: { Authorization: getToken(), Accept: 'application/json' }, cache: 'no-store', credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) { window.location.href = '/'; throw new Error('Sesi panel berakhir.'); }
    if (!response.ok) throw new Error(data.error || `Permintaan gagal (${response.status}).`);
    return data;
  }
  function statusText(data) {
    if (data.connected) return ['Online', 'good'];
    if (data.sesiTerkunci) return ['Sesi terkunci', 'bad'];
    if (data.menungguPindai || data.hasQR) return ['Menunggu tindakan', 'warn'];
    return ['Offline', 'bad'];
  }
  function renderCard(title, description, data, primary = false) {
    if (data?.error) return `<article class="surface service-card"><div class="service-head"><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div><span class="badge">Tidak tersedia</span></div><div class="service-error">${esc(data.error)}</div></article>`;
    const [label, kind] = statusText(data || {});
    const details = [
      ['Nomor tertaut', maskPhone(data?.phone)],
      ['Perangkat', data?.connected ? 'Terhubung ke WhatsApp' : data?.menungguPindai ? 'Menunggu pemindaian' : 'Tidak terhubung'],
      ['Sesi', data?.sesiTerkunci ? 'Perlu pemulihan' : 'Tidak terkunci'],
    ];
    if (!primary && data?.adaBot2 === false) details[0] = ['Ketersediaan', 'Belum dikonfigurasi'];
    if (data?.uptime !== undefined) details.push(['Waktu aktif', `${number(Math.floor(Number(data.uptime) / 60))} menit`]);
    return `<article class="surface service-card"><div class="service-head"><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div><span class="badge ${kind}">${label}</span></div><div class="service-body"><div class="service-state"><span class="status-dot ${data?.connected ? 'online' : data?.sesiTerkunci || data?.menungguPindai ? 'warning' : 'offline'}"></span>${data?.connected ? 'Koneksi WhatsApp aktif' : data?.sesiTerkunci ? 'Perlu membuka sesi' : data?.menungguPindai ? 'Menunggu tautan perangkat' : 'Belum tersambung'}</div><div class="service-details">${details.map(([name, value]) => `<div class="service-detail"><span>${esc(name)}</span><strong>${esc(value)}</strong></div>`).join('')}</div></div></article>`;
  }
  async function refresh() {
    const root = $('#service-status');
    root.innerHTML = '<div class="surface service-card"><div class="empty-state">Memeriksa layanan…</div></div>';
    try {
      const [primary, secondary] = await Promise.all([
        api('/status?panel=1'),
        api('/perangkat2/status?panel=1').catch((error) => ({ error: error.message, adaBot2: false })),
      ]);
      root.innerHTML = renderCard('WhatsApp utama', 'Perangkat yang menangani pesan rutin.', primary, true)
        + renderCard('WhatsApp cadangan', 'Perangkat cadangan jika bot utama tidak tersedia.', secondary);
      const online = !!primary.connected;
      const warning = !online && !!(primary.sesiTerkunci || primary.menungguPindai || primary.hasQR);
      const pill = $('#connection-pill');
      pill.className = `connection-pill ${online ? 'is-online' : warning ? 'is-warning' : 'is-offline'}`;
      $('.status-dot', pill).className = `status-dot ${online ? 'online' : warning ? 'warning' : 'offline'}`;
      $('span:last-child', pill).textContent = online ? 'WhatsApp tersambung' : warning ? 'Perlu tindakan' : 'WhatsApp terputus';
      $('#sidebar-dot').className = `status-dot ${online ? 'online' : warning ? 'warning' : 'offline'}`;
      $('#sidebar-status-text').textContent = online ? 'Bot online' : warning ? 'Perlu ditinjau' : 'Bot offline';
    } catch (error) {
      root.innerHTML = `<div class="surface service-card"><div class="service-error">${esc(error.message)}</div></div>`;
    }
  }
  function init() {
    $('#mobile-menu').addEventListener('click', () => { $('#sidebar').classList.add('open'); $('#mobile-scrim').hidden = false; $('#mobile-menu').setAttribute('aria-expanded', 'true'); });
    const close = () => { $('#sidebar').classList.remove('open'); $('#mobile-scrim').hidden = true; $('#mobile-menu').setAttribute('aria-expanded', 'false'); };
    $('#mobile-close').addEventListener('click', close);
    $('#mobile-scrim').addEventListener('click', close);
    $('#refresh-status').addEventListener('click', refresh);
    refresh();
    window.setInterval(refresh, 30000);
  }
  document.addEventListener('DOMContentLoaded', init);
})();

(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const token = sessionStorage.getItem('bot_api_token') || '';
  const content = new Map();
  function url(path) { return `${path}${path.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`; }
  function toast(message, error = false) {
    const region = $('#toast-region');
    const node = document.createElement('div');
    node.className = `toast${error ? ' error' : ''}`;
    node.textContent = message;
    region.replaceChildren(node);
    window.setTimeout(() => node.remove(), 4000);
  }
  async function load(which, button) {
    const path = which === 'main' ? '/migrasi.sql' : '/migrasi-keamanan.sql';
    const box = $(`#${which}-sql`);
    const size = $(`#${which}-size`);
    const status = $(`#${which}-message`);
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Memuat…';
    status.className = 'migration-message';
    status.textContent = '';
    try {
      const response = await fetch(url(path), { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) throw new Error(response.status === 401 ? 'Sesi tidak diterima. Masuk kembali ke panel lalu buka ulang halaman ini.' : `Server membalas ${response.status}.`);
      const sql = await response.text();
      content.set(which, sql);
      box.value = sql;
      size.textContent = `${sql.split('\n').length.toLocaleString('id-ID')} baris · ${Math.round(new Blob([sql]).size / 1024).toLocaleString('id-ID')} KB`;
      $(`[data-copy="${which}"]`).disabled = !sql;
      status.textContent = 'File berhasil dimuat dari server. Tinjau tujuan dan isinya sebelum menjalankan.';
    } catch (error) {
      box.value = '';
      size.textContent = 'Gagal dimuat';
      status.className = 'migration-message error';
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }
  async function copy(which, button) {
    const sql = content.get(which);
    if (!sql) return toast('Muat file SQL terlebih dahulu.', true);
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(sql);
      toast('SQL disalin ke clipboard.');
    } catch {
      const box = $(`#${which}-sql`);
      box.focus(); box.select();
      toast('Clipboard tidak tersedia; teks SQL sudah dipilih untuk disalin.');
    }
    button.textContent = 'Tersalin';
    setTimeout(() => { if (button.isConnected) button.textContent = original; }, 1800);
  }
  function bindShell() {
    const sidebar = $('#sidebar');
    const scrim = $('#mobile-scrim');
    const toggle = $('#mobile-menu');
    const close = () => { sidebar.classList.remove('open'); scrim.hidden = true; toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => { sidebar.classList.add('open'); scrim.hidden = false; toggle.setAttribute('aria-expanded', 'true'); });
    $('#mobile-close').addEventListener('click', close);
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
  }
  document.addEventListener('DOMContentLoaded', () => {
    bindShell();
    document.querySelectorAll('[data-load]').forEach((button) => button.addEventListener('click', () => load(button.dataset.load, button)));
    document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', () => copy(button.dataset.copy, button)));
    document.querySelectorAll('[data-download]').forEach((link) => { link.href = url(link.dataset.download); });
  });
})();

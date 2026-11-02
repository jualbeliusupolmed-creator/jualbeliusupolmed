(() => {
  'use strict';

  const protectedLinks = [
    ['/','Ringkasan','⌂'],
    ['/antrean','Antrean situs','≡'],
    ['/broadcast_grup','Broadcast grup','↗'],
    ['/laporan/penuh','Laporan penuh','▧'],
    ['/infrastruktur','Infrastruktur','⌁'],
    ['/jalankan','Jalankan','⌘'],
    ['/update','Catatan perubahan','▤'],
    ['/future','Peta kerja','◇'],
    ['/projek','Catatan proyek','◷'],
  ];

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);

  function pageTitle() {
    return document.title.replace(/\s*[|·—-]\s*(Kampus Kita|Jual Beli USU POLMED|Bot USU Polmed|bot\.kampuskita\.my\.id).*$/i, '').trim() || 'Dokumentasi';
  }

  function contentRoot() {
    return [...document.body.children].find((node) => !['SCRIPT','STYLE'].includes(node.tagName)) || null;
  }

  function mountAdminShell(content) {
    const path = location.pathname.replace(/\/$/, '') || '/';
    const shell = document.createElement('div');
    shell.className = 'content-shell content-shell-admin';
    shell.innerHTML = `<div class="content-scrim" data-content-close hidden></div>
      <aside class="content-sidebar" id="content-sidebar" aria-label="Navigasi panel">
        <a class="content-brand" href="/" aria-label="Panel bot Kampus Kita"><span class="content-brand-mark">KK</span><span><strong>Kampus Kita</strong><small>BOT CONSOLE</small></span></a>
        <nav class="content-nav" aria-label="Menu panel">${protectedLinks.map(([href,label,icon]) => `<a class="content-nav-link${path === href ? ' is-current' : ''}" href="${href}"${path === href ? ' aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${escapeHtml(label)}</a>`).join('')}</nav>
        <a class="content-logout" href="/keluar">Keluar <span aria-hidden="true">↗</span></a>
      </aside>
      <main class="content-main"><header class="content-topbar"><button class="content-menu" type="button" data-content-open aria-controls="content-sidebar" aria-expanded="false" aria-label="Buka menu">☰</button><div><p class="content-kicker">Kampus Kita / Bot</p><h1>${escapeHtml(pageTitle())}</h1></div><a class="content-home" href="/">Panel utama <span aria-hidden="true">↗</span></a></header><div class="content-body"></div></main>`;
    shell.querySelector('.content-body').append(content);
    document.body.append(shell);
    document.body.classList.add('content-mode-admin');
  }

  function mountPublicShell(content) {
    const shell = document.createElement('div');
    shell.className = 'content-shell content-shell-public';
    shell.innerHTML = `<header class="public-topbar"><a class="content-brand" href="/lomba"><span class="content-brand-mark">KK</span><span><strong>Kampus Kita</strong><small>JUAL BELI USU POLMED</small></span></a><nav aria-label="Tautan publik"><a href="/demo">Panduan</a><a href="/lomba">Presentasi</a><a href="https://www.kampuskita.my.id" rel="noreferrer">Situs utama ↗</a></nav></header><main class="public-content"></main>`;
    shell.querySelector('.public-content').append(content);
    document.body.append(shell);
    document.body.classList.add('content-mode-public');
  }

  const content = contentRoot();
  if (!content || document.body.dataset.contentShell === 'mounted') return;
  document.body.dataset.contentShell = 'mounted';
  if (document.body.dataset.panelShell === 'true') mountAdminShell(content);
  else mountPublicShell(content);

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-content-open]')) {
      document.body.classList.add('content-menu-open');
      document.querySelector('[data-content-open]')?.setAttribute('aria-expanded', 'true');
      document.querySelector('[data-content-close]')?.removeAttribute('hidden');
    }
    if (event.target.closest('[data-content-close]') || event.target.closest('.content-nav-link')) {
      document.body.classList.remove('content-menu-open');
      document.querySelector('[data-content-open]')?.setAttribute('aria-expanded', 'false');
      document.querySelector('[data-content-close]')?.setAttribute('hidden', '');
    }
  });
})();

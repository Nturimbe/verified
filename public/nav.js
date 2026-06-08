(function () {
  // ── Styles ─────────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .nav-hamburger {
      position: absolute;
      top: 50%;
      right: 18px;
      transform: translateY(-50%);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 5px;
      padding: 6px;
      z-index: 1000;
    }
    .nav-hamburger span {
      display: block;
      width: 24px;
      height: 2.5px;
      background: #E8A020;
      border-radius: 2px;
      transition: all 0.3s;
    }
    .nav-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1001;
    }
    .nav-overlay.open { display: block; }
    .nav-drawer {
      position: fixed;
      top: 0;
      right: -300px;
      width: 280px;
      height: 100%;
      background: #1B5C3A;
      z-index: 1002;
      transition: right 0.3s ease;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
    }
    .nav-drawer.open { right: 0; }
    .nav-drawer-header {
      background: #145230;
      padding: 20px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nav-drawer-header h2 { color: #E8A020; font-size: 18px; font-family: Arial; }
    .nav-close {
      color: #A8C5B0;
      font-size: 22px;
      cursor: pointer;
      background: none;
      border: none;
      line-height: 1;
    }
    .nav-section-label {
      font-family: Arial;
      font-size: 11px;
      color: #A8C5B0;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 18px 18px 6px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 13px 18px;
      color: white;
      text-decoration: none;
      font-family: Arial;
      font-size: 14px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      transition: background 0.2s;
    }
    .nav-link:active, .nav-link:hover { background: rgba(255,255,255,0.08); }
    .nav-link .icon { font-size: 18px; width: 24px; text-align: center; }
    .nav-link .label { flex: 1; }
    .nav-link .arrow { color: #A8C5B0; font-size: 16px; }
    .nav-divider { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0; }
    .nav-footer {
      margin-top: auto;
      padding: 16px 18px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .nav-footer a {
      font-family: Arial;
      font-size: 11px;
      color: #A8C5B0;
      text-decoration: none;
    }
    /* Make header position relative so hamburger can anchor to it */
    .verified-header { position: relative !important; }
  `;
  document.head.appendChild(style);

  // ── Determine page context ─────────────────────────────────────────────────
  const path = window.location.pathname;
  const isSeller = path.includes('create') ||
                   path.includes('dispatch') ||
                   path.includes('my-transactions');
  const isBuyer  = path.includes('pay') ||
                   path.includes('confirm') ||
                   path.includes('my-order');

  // ── Build nav links ────────────────────────────────────────────────────────
  const sellerLinks = [
    { icon: '🔗', label: 'Create Payment Link',   href: '/create.html' },
    { icon: '📦', label: 'My Transactions',        href: '/my-transactions.html' },
  ];
  const buyerLinks = [
    { icon: '📍', label: 'Track My Order',         href: '/my-order.html' },
  ];
  const generalLinks = [
    { icon: '📄', label: 'Dispute Policy',         href: '/dispute-policy.html' },
    { icon: '🔒', label: 'Privacy Policy',         href: '/privacy.html' },
    { icon: '📋', label: 'Terms of Service',       href: '/terms.html' },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  function buildLinks(links) {
    return links.map(l => `
      <a class="nav-link" href="${l.href}">
        <span class="icon">${l.icon}</span>
        <span class="label">${l.label}</span>
        <span class="arrow">›</span>
      </a>`).join('');
  }

  let sections = '';

  if (isSeller) {
    sections += `
      <div class="nav-section-label">Seller</div>
      ${buildLinks(sellerLinks)}`;
  }
  if (isBuyer) {
    sections += `
      <div class="nav-section-label">Buyer</div>
      ${buildLinks(buyerLinks)}`;
  }
  if (!isSeller && !isBuyer) {
    sections += `
      <div class="nav-section-label">Menu</div>
      ${buildLinks([...sellerLinks, ...buyerLinks])}`;
  }

  sections += `<hr class="nav-divider">`;
  sections += buildLinks(generalLinks);

  const drawerHtml = `
    <div class="nav-overlay" id="navOverlay"></div>
    <div class="nav-drawer" id="navDrawer">
      <div class="nav-drawer-header">
        <h2>✓ Verified</h2>
        <button class="nav-close" id="navClose">✕</button>
      </div>
      ${sections}
      <div class="nav-footer">
        <a href="/terms.html">Terms</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/dispute-policy.html">Disputes</a>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', drawerHtml);

  // ── Add hamburger to header ─────────────────────────────────────────────────
  const header = document.querySelector('.header');
  if (header) {
    header.classList.add('verified-header');
    header.insertAdjacentHTML('beforeend', `
      <div class="nav-hamburger" id="navToggle">
        <span></span><span></span><span></span>
      </div>`);
  }

  // ── Toggle logic ───────────────────────────────────────────────────────────
  function openNav() {
    document.getElementById('navDrawer').classList.add('open');
    document.getElementById('navOverlay').classList.add('open');
  }
  function closeNav() {
    document.getElementById('navDrawer').classList.remove('open');
    document.getElementById('navOverlay').classList.remove('open');
  }

  document.getElementById('navToggle').addEventListener('click', openNav);
  document.getElementById('navClose').addEventListener('click', closeNav);
  document.getElementById('navOverlay').addEventListener('click', closeNav);
})();
(function () {
  const nav = document.querySelector('.site-nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const actions = document.getElementById('navActions');

  window.addEventListener('scroll', () => {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 8);
  });

  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  const path = window.location.pathname === '/index.html' ? '/' : window.location.pathname;
  document.querySelectorAll('.nav-links a, .dash-sidebar a').forEach((a) => {
    const href = a.getAttribute('href');
    if (href && (href === path || (href === '/' && path === '/'))) a.classList.add('active');
  });

  function initials(name) {
    return (name || 'U').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  }

  async function renderAuthState() {
    if (!actions) return;
    await LG.ready;
    if (!LG.session) {
      actions.innerHTML = `
        <a href="/login.html" class="btn btn-ghost">Log in</a>
        <a href="/signup.html" class="btn btn-primary"><span class="label">Get Started</span></a>`;
      return;
    }
    let profile = null;
    try {
      profile = await LG.api('/api/profile/me');
    } catch (e) {
      profile = null;
    }
    const isAdmin = profile?.role === 'admin';
    actions.innerHTML = `
      ${isAdmin ? '<a href="/admin/index.html" class="btn btn-ghost"><span class="label">Admin</span></a>' : ''}
      <a href="/dashboard.html" class="avatar-pill">
        <span class="dot">${initials(profile?.display_name)}</span>
        <span class="label">${profile?.display_name || 'Dashboard'}</span>
      </a>
      <button id="navSignOut" class="btn btn-ghost" type="button"><span class="label">Sign out</span></button>`;
    document.getElementById('navSignOut')?.addEventListener('click', () => LG.signOut());
  }

  renderAuthState();
  document.addEventListener('lg:auth-change', renderAuthState);

  let revealObserver = null;
  function observeReveals(scope) {
    const targets = (scope || document).querySelectorAll('.reveal:not(.in-view), .reveal-stagger:not(.in-view)');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('in-view'));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
    }
    targets.forEach((el) => revealObserver.observe(el));
  }

  window.LG = window.LG || {};
  LG.observeReveals = observeReveals;
  observeReveals();
})();

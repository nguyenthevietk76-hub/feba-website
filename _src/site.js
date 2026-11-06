/* FEBA — shared page behaviour: header, menu, scroll reveals, counters, image effects */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header: scroll progress, hide-on-scroll when a product sub-nav exists, mobile menu */
  const prog = $('#prog'), body = document.body;
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.style.transform = `scaleX(${max > 0 ? (scrollY / max).toFixed(4) : 0})`;
    body.classList.toggle('scrolled', scrollY > 80);
    fx();
  }
  const menuBtn = $('.menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const open = body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('.navlinks a').forEach(a => a.addEventListener('click', () => body.classList.remove('menu-open')));

  /* reveal on scroll + number counters */
  const countUp = el => {
    const to = +el.dataset.count;
    if (reduce) { el.textContent = to.toLocaleString('vi-VN'); return; }
    const t0 = performance.now(), dur = 1500;
    const step = now => { const k = clamp((now - t0) / dur, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4))).toLocaleString('vi-VN'); if (k < 1) requestAnimationFrame(step); };
    el.textContent = '0'; requestAnimationFrame(step);
  };
  const targets = $$('.rv, .rv-mask, .rv-line, .rv-rule');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).concat(e.target.dataset.count ? [e.target] : []).forEach(countUp);
      io.unobserve(e.target);
    }), { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(el => io.observe(el));
  } else targets.forEach(el => el.classList.add('in'));

  /* scroll-linked image effects */
  const photos = $$('.photo'), parallax = $$('[data-parallax]');
  function fx() {
    const vh = innerHeight;
    photos.forEach(ph => {
      const r = ph.getBoundingClientRect();
      const k = clamp((vh - r.top) / (vh * 0.9), 0, 1), e = 1 - Math.pow(1 - k, 3);
      ph.style.setProperty('--ci', (8 * (1 - e)).toFixed(2) + '%');
      ph.style.setProperty('--cr', (32 * (1 - e)).toFixed(1) + 'px');
      ph.style.setProperty('--sc', (1.16 - 0.16 * e).toFixed(4));
    });
    parallax.forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      const k = clamp((vh - r.top) / (vh + r.height), 0, 1);
      img.style.setProperty('--py', (-k * r.height * 0.16).toFixed(1) + 'px');
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', fx);
  onScroll();

  /* masthead letters rise in once the page is painted */
  const heroEl = $('.t-hero');
  if (heroEl) requestAnimationFrame(() => setTimeout(() => heroEl.classList.add('on'), 120));

  /* intro film: load + play only while on screen (muted, loops) */
  $$('[data-film]').forEach(box => {
    const v = $('video', box), btn = $('.play', box);
    let wanted = true;
    const load = () => { if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); } };
    v.addEventListener('error', () => box.classList.add('missing'));
    if (btn) btn.addEventListener('click', () => { load(); if (v.paused) { wanted = true; v.play().catch(() => {}); } else { wanted = false; v.pause(); } });
    v.addEventListener('play', () => box.classList.add('playing'));
    v.addEventListener('pause', () => box.classList.remove('playing'));
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { load(); if (wanted && !reduce) v.play().catch(() => {}); } else v.pause();
    }), { threshold: 0.35 }).observe(box);
  });

  /* inertial smooth scrolling for mouse wheels (touch & keyboard stay native) */
  const html = document.documentElement;
  const maxY = () => html.scrollHeight - innerHeight;
  let sTarget = scrollY, sCur = scrollY, sRun = false, sLast = 0;
  function sStep(now) {
    const dt = Math.min(0.05, (now - sLast) / 1000 || 0.016); sLast = now;
    sCur += (sTarget - sCur) * (1 - Math.exp(-dt * 8.5));
    if (Math.abs(sTarget - sCur) < 0.35) { sCur = sTarget; sRun = false; }
    window.scrollTo(0, sCur);
    if (sRun) requestAnimationFrame(sStep);
  }
  function sStart() { if (!sRun) { sRun = true; sLast = performance.now(); requestAnimationFrame(sStep); } }
  window.__smoothTo = y => {
    if (reduce) { window.scrollTo(0, y); return; }
    if (!sRun) sCur = scrollY;
    sTarget = clamp(y, 0, maxY()); sStart();
  };
  const finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer && !reduce) {
    addEventListener('wheel', e => {
      if (e.ctrlKey || e.defaultPrevented) return;
      const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
      if (!sRun) sCur = sTarget = scrollY;
      sTarget = clamp(sTarget + d, 0, maxY());
      e.preventDefault(); sStart();
    }, { passive: false });
  }
  addEventListener('scroll', () => { if (!sRun) sTarget = sCur = scrollY; }, { passive: true });

  /* same-page anchors glide; links to other pages fade out first */
  const navOffset = () => (body.classList.contains('has-subnav') ? 52 : 56) + 8;
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    if (a.hasAttribute('data-go')) return;                      // handled by the 3D story
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      const el = href.length > 1 && document.getElementById(href.slice(1));
      if (!el) return;
      e.preventDefault();
      window.__smoothTo(el.getBoundingClientRect().top + scrollY - navOffset());
      history.replaceState(null, '', href);
    } else if (/\.html(#.*)?$/.test(href) && location.protocol !== 'data:') {
      e.preventDefault();
      body.classList.add('leaving');
      setTimeout(() => { location.href = href; }, reduce ? 0 : 380);
    }
  });
  addEventListener('pageshow', () => body.classList.remove('leaving'));

  /* preview helper: ?to=<id> | ?y=<px> | ?p=<story progress> jumps there with reveals shown (used for screenshots) */
  const Q = new URLSearchParams(location.search);
  if (Q.has('to') || Q.has('y') || Q.has('p')) {
    document.documentElement.classList.add('shot');
    addEventListener('load', () => setTimeout(() => {
      let y = +Q.get('y') || 0;
      const el = Q.get('to') && document.getElementById(Q.get('to'));
      if (el) y = el.getBoundingClientRect().top + scrollY;
      const st = $('.story');
      if (Q.has('p') && st) y = st.offsetTop + (+Q.get('p')) * (st.offsetHeight - innerHeight);
      scrollTo(0, y); onScroll();
    }, 60));
  }
})();

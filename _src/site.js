/* FEBA · hiệu ứng chung: hiện dần khi cuộn, số đếm, nét vẽ, thị sai, ngày tháng theo hôm nay, tương tác nhỏ */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const Q = new URLSearchParams(location.search);
  const SHOT = Q.has('to') || Q.has('y') || Q.has('p');
  if (SHOT) document.documentElement.classList.add('shot');

  /* ---------- menu ---------- */
  const menuBtn = $('.menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const open = body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  const closeMenu = () => { body.classList.remove('menu-open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); };
  $$('.navlinks a').forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- number counters ---------- */
  const fmt = n => n.toLocaleString('vi-VN');
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = '1';
    const to = +el.dataset.count;
    if (reduce || SHOT) { el.textContent = fmt(to); return; }
    const delay = +(el.dataset.delay || 250), dur = +(el.dataset.dur || 1800);
    el.textContent = '0';
    setTimeout(() => {
      const t0 = performance.now();
      const step = now => {
        const k = clamp((now - t0) / dur, 0, 1);
        el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - k, 4))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
  }

  /* ---------- reveal: .rv and [data-in] get .in when they enter the screen ---------- */
  function enter(el) {
    el.classList.add('in');
    $$('[data-count]', el).concat(el.dataset.count !== undefined ? [el] : []).forEach(countUp);
  }
  const targets = $$('.rv, [data-in]');
  if (SHOT || reduce || !('IntersectionObserver' in window)) targets.forEach(enter);
  else {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      enter(e.target); io.unobserve(e.target);
    }), { threshold: 0.16, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(el => { if (!el.hasAttribute('data-hero')) io.observe(el); });
  }
  // hero blocks play on load, not on scroll
  $$('[data-hero]').forEach(h => requestAnimationFrame(() => setTimeout(() => enter(h), 80)));

  /* ---------- scroll: progress bar + parallax ---------- */
  const prog = $('#prog'), pars = $$('[data-par]');
  let ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (prog) prog.style.transform = `scaleX(${max > 0 ? (scrollY / max).toFixed(4) : 0})`;
      if (!reduce) pars.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        el.style.translate = `0 ${(-scrollY * +el.dataset.par).toFixed(1)}px`;
      });
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- dates: everything that depends on "today" ---------- */
  const day = 864e5, now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const START = new Date(2026, 9, 1).getTime(), END = new Date(2026, 11, 5).getTime();
  const parse = s => { const [d, m, y] = s.split('/').map(Number); return new Date(y || 2026, m - 1, d).getTime(); };
  const elapsed = clamp((today - START) / (END - START), 0, 1);
  const left = Math.max(0, Math.round((END - today) / day));
  $$('[data-days-left]').forEach(el => { el.dataset.count = left; if (el.closest('.in') || SHOT) countUp(el); else el.textContent = '0'; });
  $$('[data-elapsed]').forEach(el => { el.textContent = Math.round(elapsed * 100) + '%'; });
  $$('[data-ring]').forEach(el => el.style.setProperty('--off', (502.7 * (1 - elapsed)).toFixed(1)));
  $$('[data-today]').forEach(el => el.style.setProperty('--today', (elapsed * 100).toFixed(2) + '%'));
  $$('.mile[data-date]').forEach(el => {
    const t = parse(el.dataset.date);
    el.style.left = ((t - START) / (END - START) * 100).toFixed(2) + '%';
    el.classList.toggle('past', t <= today);
  });
  // roadmap stops: done / now, fill line, current phase name
  const stops = $$('.stop[data-from]');
  if (stops.length) {
    let cur = 0, frac = 0;
    stops.forEach((s, i) => {
      const a = parse(s.dataset.from), b = parse(s.dataset.to);
      if (today > b) s.classList.add('done');
      else if (today >= a) { s.classList.add('now'); }
      if (today >= a) { cur = i; frac = clamp((today - a) / (b - a + day), 0, 1); }
    });
    if (today < parse(stops[0].dataset.from)) frac = 0;
    $$('[data-road]').forEach(el => el.style.setProperty('--fill', ((cur + frac) / stops.length * 100).toFixed(2) + '%'));
    const name = $('strong', stops[cur]);
    $$('[data-phase-name]').forEach(el => { el.textContent = name ? name.textContent : ''; });
  }

  /* ---------- radar charts (skills): built from data-v ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  $$('svg[data-radar]').forEach(svg => {
    const v = svg.dataset.radar.split(',').map(Number), cx = 140, cy = 125, R = 80;
    const ang = [-90, -30, 30, 90, 150, 210].map(a => a * Math.PI / 180);
    const pts = vals => vals.map((x, i) => (cx + Math.cos(ang[i]) * R * x).toFixed(1) + ',' + (cy + Math.sin(ang[i]) * R * x).toFixed(1)).join(' ');
    const add = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
    [1, .75, .5, .25].forEach((k, i) => add('polygon', { points: pts([k, k, k, k, k, k]), fill: i ? 'none' : '#f3f1ec', stroke: '#dedad1' }));
    ang.forEach(a => add('line', { x1: cx, y1: cy, x2: (cx + Math.cos(a) * R).toFixed(1), y2: (cy + Math.sin(a) * R).toFixed(1), stroke: '#dedad1' }));
    const g = add('g', { class: 'poly' });
    const p = document.createElementNS(NS, 'polygon');
    p.setAttribute('points', pts(v.map(x => x / 10))); p.setAttribute('fill', 'rgba(31,59,255,.16)'); p.setAttribute('stroke', '#1f3bff'); p.setAttribute('stroke-width', '2.4'); p.setAttribute('stroke-linejoin', 'round');
    g.appendChild(p);
    const top = Math.max(...v), box = svg.parentElement;
    $$('.lb', box).forEach((lb, i) => {
      lb.style.left = (cx + Math.cos(ang[i]) * (R + 26)).toFixed(0) + 'px';
      lb.style.top = (cy + Math.sin(ang[i]) * (R + 16)).toFixed(0) + 'px';
      lb.classList.toggle('top', v[i] === top);
    });
  });

  /* ---------- product: water jet modes ---------- */
  $$('[data-jet]').forEach(sec => {
    const btns = $$('[data-m]', sec).filter(b => b.tagName === 'BUTTON'), lab = $('[data-mode-name]', sec);
    btns.forEach(b => b.addEventListener('click', () => {
      sec.dataset.m = b.dataset.m;
      btns.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      if (lab) lab.textContent = b.textContent;
    }));
  });

  /* ---------- campaign: personas ---------- */
  $$('[data-personas]').forEach(box => {
    const btns = $$('.persona', box), out = k => $('[data-p-' + k + ']', box);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      ['need', 'msg', 'fmt'].forEach(k => { const o = out(k); if (o) o.textContent = b.dataset[k]; });
    }));
  });

  /* ---------- intro film: load + play only while on screen ---------- */
  $$('[data-film]').forEach(box => {
    const v = $('video', box), btn = $('.play', box);
    let wanted = true;
    const load = () => { if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); } };
    if (btn) btn.addEventListener('click', () => { load(); if (v.paused) { wanted = true; v.play().catch(() => {}); } else { wanted = false; v.pause(); } });
    v.addEventListener('play', () => box.classList.add('playing'));
    v.addEventListener('pause', () => box.classList.remove('playing'));
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { load(); if (wanted && !reduce) v.play().catch(() => {}); } else v.pause();
    }), { threshold: 0.35 }).observe(box);
  });

  /* ---------- inertial smooth scrolling for mouse wheels (touch & keyboard stay native) ---------- */
  const html = document.documentElement;
  const maxY = () => html.scrollHeight - innerHeight;
  let sTarget = scrollY, sCur = scrollY, sRun = false, sLast = 0;
  function sStep(t) {
    const dt = Math.min(0.05, (t - sLast) / 1000 || 0.016); sLast = t;
    sCur += (sTarget - sCur) * (1 - Math.exp(-dt * 8.5));
    if (Math.abs(sTarget - sCur) < 0.35) { sCur = sTarget; sRun = false; }
    window.scrollTo(0, sCur);
    if (sRun) requestAnimationFrame(sStep);
  }
  function sStart() { if (!sRun) { sRun = true; sLast = performance.now(); requestAnimationFrame(sStep); } }
  window.__smoothTo = y => { if (reduce) { window.scrollTo(0, y); return; } if (!sRun) sCur = scrollY; sTarget = clamp(y, 0, maxY()); sStart(); };
  if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
    addEventListener('wheel', e => {
      if (e.ctrlKey || e.defaultPrevented) return;
      const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
      if (!sRun) sCur = sTarget = scrollY;
      sTarget = clamp(sTarget + d, 0, maxY());
      e.preventDefault(); sStart();
    }, { passive: false });
  }
  addEventListener('scroll', () => { if (!sRun) sTarget = sCur = scrollY; }, { passive: true });

  /* ---------- anchors glide; other pages fade out first ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target || a.hasAttribute('download')) return;
    if (a.hasAttribute('data-go')) return;
    const href = a.getAttribute('href');
    if (href.startsWith('#')) {
      const el = href.length > 1 && document.getElementById(href.slice(1));
      if (!el) return;
      e.preventDefault();
      window.__smoothTo(el.getBoundingClientRect().top + scrollY - 64);
      history.replaceState(null, '', href);
    } else if (a.origin === location.origin && !/\.(mp4|jpe?g|png|webp|pdf)$/i.test(a.pathname)) {
      if (a.pathname === location.pathname) {          // same page, e.g. "/#doi-ngu" while on "/"
        const el = a.hash && document.getElementById(a.hash.slice(1));
        if (!el) return;
        e.preventDefault();
        window.__smoothTo(el.getBoundingClientRect().top + scrollY - 64);
        history.replaceState(null, '', a.hash);
        return;
      }
      e.preventDefault();                               // another page: fade out first
      body.classList.add('leaving');
      setTimeout(() => { location.href = a.href; }, reduce ? 0 : 360);
    }
  });
  addEventListener('pageshow', () => body.classList.remove('leaving'));

  /* ================= KỂ CHUYỆN ================= */
  /* ---------- mục lục chương: dựng từ section[data-chap], đánh dấu chương đang đọc ---------- */
  const chaps = $$('[data-chap]');
  if (chaps.length > 1) {
    const toc = document.createElement('nav'), pill = document.createElement('div');
    toc.className = 'toc'; toc.setAttribute('aria-label', 'Các chương');
    pill.className = 'chip-now'; pill.setAttribute('aria-hidden', 'true');
    chaps.forEach((s, i) => {
      if (!s.id) s.id = 'chuong-' + s.dataset.chap;
      const a = document.createElement('a');
      a.href = '#' + s.id;
      a.innerHTML = '<i></i><span>' + s.dataset.chap + ' · ' + s.dataset.chapName + '</span>';
      toc.appendChild(a);
    });
    body.appendChild(toc); body.appendChild(pill);
    const links = $$('a', toc);
    const mark = () => {
      const mid = innerHeight * 0.45;
      let cur = -1;
      chaps.forEach((s, i) => { if (s.getBoundingClientRect().top <= mid) cur = i; });
      const last = chaps[chaps.length - 1].getBoundingClientRect();
      const on = cur >= 0 && last.bottom > mid * 0.6;
      toc.classList.toggle('on', on); pill.classList.toggle('on', on);
      links.forEach((a, i) => a.classList.toggle('on', i === cur));
      if (cur >= 0) {
        const s = chaps[cur];
        toc.classList.toggle('dk', s.classList.contains('dark') || s.classList.contains('blue'));
        pill.innerHTML = '<b>' + s.dataset.chap + '</b>' + s.dataset.chapName;
      }
    };
    addEventListener('scroll', mark, { passive: true }); addEventListener('resize', mark); mark();
  }

  /* ---------- khối cuộn kể chuyện: bước nào ở giữa màn hình thì bước đó sáng ---------- */
  $$('[data-scrolly]').forEach(root => {
    const steps = $$('.sstep', root);
    const set = i => {
      if (root.dataset.step === String(i)) return;
      root.dataset.step = i;
      steps.forEach((s, k) => s.classList.toggle('on', k === i));
      root.dispatchEvent(new CustomEvent('step', { detail: { i, el: steps[i] } }));
    };
    const pick = () => {
      const mid = innerHeight * 0.55;
      let i = 0;
      steps.forEach((s, k) => { if (s.getBoundingClientRect().top < mid) i = k; });
      set(i);
    };
    addEventListener('scroll', pick, { passive: true }); addEventListener('resize', pick);
    requestAnimationFrame(pick);
  });
  /* Chương 01 trang chủ: gạch từng thứ giống nhau */
  $$('[data-same]').forEach(vis => {
    const root = vis.closest('[data-scrolly]'), rows = $$('.row', vis);
    root.addEventListener('step', e => {
      const i = e.detail.i;
      vis.dataset.step = i;
      rows.forEach((r, k) => r.classList.toggle('x', k <= i));
    });
  });
  /* kịch bản video: lời thoại, mốc giây, thanh tiến độ trên điện thoại */
  $$('[data-board]').forEach(root => {
    const sub = $('[data-sub]', root), tc = $('[data-tc]', root), see = $('[data-see]', root), bar = $('.vbar', root);
    root.addEventListener('step', e => {
      const s = e.detail.el;
      if (sub) { sub.classList.add('fade'); setTimeout(() => { sub.textContent = s.dataset.say; sub.classList.remove('fade'); }, 180); }
      if (tc) tc.textContent = s.dataset.tc;
      if (see) see.textContent = s.dataset.see || '';
      if (bar) bar.style.setProperty('--p', (+s.dataset.end || 0) / (+root.dataset.len || 60));
    });
  });

  /* ---------- nhật ký thí nghiệm: mốc đã qua sáng lên, mốc gần nhất nhấp nháy ---------- */
  const logs = $$('.log-i[data-date]');
  logs.forEach(el => el.classList.toggle('done', parse(el.dataset.date) <= today));
  const lastDone = logs.filter(el => el.classList.contains('done')).pop();
  if (lastDone) lastDone.className = 'log-i now';

  /* ---------- biểu đồ chấm điểm có trọng số: tự cộng điểm từ bảng tiêu chí ---------- */
  const PAL = ['#1f3bff', '#4f66ff', '#7f8fff', '#a9b4ff', '#111111', '#8a867e'];
  $$('[data-score]').forEach(box => {
    const crit = JSON.parse(box.dataset.crit);           // [[tên, trọng số %], ...]
    const legend = $('.score-crit', box), tip = $('.score-tip', box), rows = $$('.srow', box);
    const dec = n => n.toFixed(2).replace('.', ',');
    legend.innerHTML = crit.map((c, i) => '<button type="button" aria-pressed="false" data-i="' + i + '" style="--c:' + PAL[i] + '"><i></i>' + c[0] + ' <small>' + c[1] + '%</small></button>').join('');
    let best = -1, bestRow = null;
    rows.forEach(r => {
      const sc = r.dataset.s.split(',').map(Number);
      let tot = 0;
      $('.sbar', r).innerHTML = sc.map((s, i) => { tot += crit[i][1] / 100 * s; return '<i data-i="' + i + '" style="--w:' + (crit[i][1] * s / 5) + '%;--c:' + PAL[i] + ';--k:' + i + '" title="' + crit[i][0] + ': ' + s + '/5"></i>'; }).join('');
      $('.tot', r).textContent = dec(tot);
      r.dataset.tot = tot;
      if (tot > best) { best = tot; bestRow = r; }
    });
    if (bestRow) bestRow.classList.add('win');
    const pick = i => {
      const btns = $$('button', legend), same = i !== null && btns[i].getAttribute('aria-pressed') === 'true';
      btns.forEach((b, k) => b.setAttribute('aria-pressed', !same && k === i ? 'true' : 'false'));
      box.classList.toggle('hl', i !== null && !same);
      $$('.sbar i', box).forEach(seg => seg.classList.toggle('on', +seg.dataset.i === i));
      if (i === null || same) { tip.innerHTML = tip.dataset.def; return; }
      tip.innerHTML = '<b>' + crit[i][0] + '</b> (trọng số ' + crit[i][1] + '%): ' + rows.map(r => $('.nm', r).firstChild.textContent.trim() + ' ' + r.dataset.s.split(',')[i] + '/5').join(' · ');
    };
    tip.dataset.def = tip.innerHTML;
    legend.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pick(+b.dataset.i); });
  });

  /* ---------- phễu tính ngược: mục tiêu sản phẩm, tỷ lệ bấm, tỷ lệ mua ---------- */
  $$('[data-funnel]').forEach(box => {
    const inp = k => $('[data-f="' + k + '"]', box), out = k => $('[data-o="' + k + '"]', box);
    const pct = v => (+v).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%';
    const calc = () => {
      const goal = +inp('goal').value, ctr = +inp('ctr').value / 100, cvr = +inp('cvr').value / 100, vids = +box.dataset.videos || 60;
      const clicks = goal / cvr, views = clicks / ctr;
      out('goal').textContent = fmt(goal); out('ctr').textContent = pct(ctr * 100); out('cvr').textContent = pct(cvr * 100);
      out('views').textContent = fmt(Math.round(views)); out('clicks').textContent = fmt(Math.round(clicks)); out('orders').textContent = fmt(goal);
      out('per').textContent = fmt(Math.round(views / vids));
      const w = v => Math.max(34, Math.min(100, 34 + 66 * Math.log10(v) / Math.log10(views))) + '%';
      $$('.fstep', box).forEach((s, i) => s.style.setProperty('--w', ['100%', w(clicks), w(goal)][i]));
    };
    $$('input', box).forEach(i => i.addEventListener('input', calc));
    calc();
  });

  /* ---------- ngân hàng câu mở đầu: đổi câu mỗi vài giây ---------- */
  $$('[data-hooks]').forEach(box => {
    const q = $('q', box), list = JSON.parse(box.dataset.hooks);
    let i = 0;
    if (reduce || SHOT) return;
    setInterval(() => {
      if (box.getBoundingClientRect().bottom < 0 || box.getBoundingClientRect().top > innerHeight) return;
      q.classList.add('out');
      setTimeout(() => { i = (i + 1) % list.length; q.textContent = list[i]; q.classList.remove('out'); }, 400);
    }, 3800);
  });

  /* ---------- preview helper (?to=id | ?y=px | ?p=story progress) for screenshots ---------- */
  if (SHOT) addEventListener('load', () => setTimeout(() => {
    let y = +Q.get('y') || 0;
    const el = Q.get('to') && document.getElementById(Q.get('to'));
    if (el) y = el.getBoundingClientRect().top + scrollY - 64;
    const st = $('.story');
    if (Q.has('p') && st) y = st.offsetTop + (+Q.get('p')) * (st.offsetHeight - innerHeight);
    scrollTo(0, y); onScroll();
  }, 60));
})();

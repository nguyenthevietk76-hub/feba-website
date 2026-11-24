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

  /* ================= BẢNG SỐ LIỆU: đọc từ <script id="feba-data"> (dựng từ _src/data.json) ================= */
  const DATA = (() => { try { return JSON.parse($('#feba-data').textContent); } catch (e) { return null; } })();
  const pick = p => p.split('.').reduce((v, k) => v == null ? v : v[k], DATA);
  const vn = (n, d) => (+n).toLocaleString('vi-VN', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d });
  const PAL2 = ['#1f3bff', '#111111', '#a9b4ff', '#6a7dff', '#c9c4b8', '#3d55ff'];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* tab chuyển bảng */
  $$('[data-dtabs]').forEach(box => {
    const btns = $$('[role=tab]', box), panels = $$('[role=tabpanel]', box);
    const show = b => {
      btns.forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      panels.forEach(p => { p.hidden = p.id !== b.getAttribute('aria-controls'); if (!p.hidden) p.querySelectorAll('.dz').forEach(z => { z.classList.remove('in'); void z.offsetWidth; z.classList.add('in'); }); });
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => show(b));
      b.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); const n = btns[(i + d + btns.length) % btns.length]; show(n); n.focus(); } });
    });
  });

  if (DATA) {
    /* thanh ngang: data-hbars="đường dẫn", data-l / data-v / data-s = vị trí cột nhãn, giá trị, chú thích */
    $$('[data-hbars]').forEach(box => {
      const rows = pick(box.dataset.hbars) || [], L = +box.dataset.l || 0, V = +(box.dataset.v || 1), S = box.dataset.s;
      const unit = box.dataset.unit || '', sunit = box.dataset.sunit || '', max = Math.max(...rows.map(r => r[V]));
      const tot = rows.reduce((a, r) => a + r[V], 0);
      box.innerHTML = rows.map((r, i) => '<div class="hb' + (i === 0 ? ' hl' : '') + '"><span class="hb-l">' + esc(r[L]) + (S !== undefined ? '<small>' + vn(r[+S], 0) + sunit + '</small>' : '') + '</span>' +
        '<span class="hb-bar"><i style="--w:' + (r[V] / max * 100).toFixed(1) + '%;--k:' + i + '"></i></span><b>' + vn(r[V], 1) + unit + '</b><small class="hb-p">' + vn(r[V] / tot * 100, 0) + '%</small></div>').join('');
    });

    /* biểu đồ vòng: data-donut="đường dẫn" các phần [nhãn, giá trị] */
    $$('[data-donut]').forEach(box => {
      const parts = pick(box.dataset.donut) || [], tot = parts.reduce((a, p) => a + p[1], 0), unit = box.dataset.unit || '';
      let acc = 0;
      const stops = parts.map((p, i) => { const a = acc; acc += p[1] / tot * 100; return PAL2[i] + ' ' + a.toFixed(2) + '% ' + acc.toFixed(2) + '%'; }).join(',');
      box.innerHTML = '<div class="dn-ring" style="background:conic-gradient(' + stops + ')"><span><b>' + vn(tot, 1) + unit + '</b>tổng chi phí</span></div>' +
        '<ul class="dn-leg">' + parts.map((p, i) => '<li><i style="background:' + PAL2[i] + '"></i><span>' + esc(p[0]) + '</span><b>' + vn(p[1], 1) + unit + '</b><small>' + vn(p[1] / tot * 100, 0) + '%</small></li>').join('') + '</ul>';
    });

    /* mục tiêu theo giai đoạn: chọn chỉ số để so ba giai đoạn */
    $$('[data-phases]').forEach(box => {
      const ph = pick('ke_hoach.giai_doan'), keys = [['sp', 'Sản phẩm', ''], ['gmv', 'GMV', ' tr'], ['video', 'Video', '']];
      const sel = $('.ph-sel', box), out = $('.ph-cols', box), note = $('.ph-note', box);
      sel.innerHTML = keys.map((k, i) => '<button type="button" aria-pressed="' + (i ? 'false' : 'true') + '" data-k="' + k[0] + '">' + k[1] + '</button>').join('');
      const draw = k => {
        const meta = keys.find(x => x[0] === k), max = Math.max(...ph.map(p => p[k]));
        out.innerHTML = ph.map((p, i) => '<div class="ph"><div class="ph-bar"><b>' + vn(p[k]) + meta[2] + '</b><i style="--h:' + (p[k] / max * 100).toFixed(1) + '%;--k:' + i + '"></i></div><strong>' + esc(p.ten) + '</strong><span>' + esc(p.thoi_gian) + '</span></div>').join('');
        $$('button', sel).forEach(b => b.setAttribute('aria-pressed', b.dataset.k === k));
        note.textContent = ph.map(p => p.ten + ': ' + p.trong_tam).join(' · ');
      };
      sel.addEventListener('click', e => { const b = e.target.closest('button'); if (b) draw(b.dataset.k); });
      draw('sp');
    });

    /* video mẫu của kênh, xếp theo trụ cột nội dung (chỉ tên và đường dẫn, không kèm số liệu) */
    $$('[data-vlist]').forEach(box => {
      const url = pick('kenh.url'), vids = pick('kenh.video_mau') || [];
      box.innerHTML = vids.map(v => '<a href="' + url + '/video/' + v.id + '" target="_blank" rel="noopener"><span class="vt">' + esc(v.nhom) + '</span><span>' + esc(v.tieu_de) + '</span><b>Xem ↗</b></a>').join('');
    });

    /* ba kịch bản tài chính */
    $$('[data-scen]').forEach(box => {
      const sc = pick('ke_hoach.kich_ban'), max = Math.max(...sc.map(s => s.gmv));
      box.innerHTML = sc.map((s, i) => '<div class="sc' + (s.ten === 'Cơ sở' ? ' hl' : '') + '"><strong>' + esc(s.ten) + '</strong>' +
        '<div class="sc-bar"><i style="--w:' + (s.gmv / max * 100).toFixed(1) + '%;--k:' + i + '"></i><span>GMV ' + vn(s.gmv, 1) + ' tr</span></div>' +
        '<dl><dt>Hoa hồng</dt><dd>' + vn(s.hoa_hong, 1) + ' tr</dd><dt>Chi phí</dt><dd>' + vn(s.chi_phi, 1) + ' tr</dd><dt>Lợi nhuận</dt><dd>' + vn(s.loi_nhuan, 2) + ' tr</dd><dt>ROI</dt><dd>' + s.roi + '%</dd></dl></div>').join('');
    });

    /* GMV hoà vốn theo tỷ lệ hoa hồng, so với mục tiêu */
    $$('[data-breakeven]').forEach(box => {
      const be = pick('ke_hoach.hoa_von'), goal = pick('ke_hoach.muc_tieu.gmv'), top = Math.max(goal, ...be.map(b => b[1])) * 1.1;
      box.innerHTML = '<div class="be-plot"><span class="be-goal" style="bottom:calc(30px + (100% - 50px) * ' + (goal / top).toFixed(4) + ')"><b>Mục tiêu ' + vn(goal, 1) + ' tr</b></span>' +
        be.map((b, i) => '<div class="be' + (b[0] === 12 ? ' hl' : '') + '" style="--h:' + (b[1] / top * 100).toFixed(1) + '%;--k:' + i + '"><i></i><b>' + vn(b[1], 1) + ' tr</b><span>Hoa hồng ' + b[0] + '%</span></div>').join('') + '</div>';
    });
  }

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

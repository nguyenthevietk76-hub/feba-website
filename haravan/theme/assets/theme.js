/* FEBA · giao diện Haravan
   Mục lục: 1 tiện ích · 2 đo lường + nguồn đơn · 3 hiệu ứng · 4 đầu trang, menu · 5 tìm kiếm nhanh
            6 giỏ hàng · 7 xem nhanh · 8 trang sản phẩm · 9 nhóm sản phẩm · 10 trang chủ, vừa xem · 11 trang giỏ hàng · 12 khác */
(function () {
  'use strict';

  /* ================= 1. TIỆN ÍCH ================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CFG = window.FEBA || {};
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FMT = CFG.moneyFormat || '{{amount_no_decimals_with_comma_separator}}₫';
  var XHR = { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' };

  /* Haravan tính tiền theo đơn vị x100. Dấu phân cách theo money_format của cửa hàng. */
  function money(cents) {
    var n = Math.round((+cents || 0) / 100);
    return FMT.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      var sep = /period/.test(k) ? '.' : (/space/.test(k) ? ' ' : ',');
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    }).replace(/<[^>]+>/g, '');
  }
  /* Ảnh Haravan: chèn cỡ ảnh vào trước đuôi file (abc_small.jpg) */
  var SIZES = 'pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|master';
  function img(src, size) {
    if (!src) return '';
    src = typeof src === 'string' ? src : (src.src || '');
    if (!/hstatic\.net/.test(src)) return src;
    var clean = src.replace(new RegExp('_(' + SIZES + ')(?=\\.[a-z]+(\\?|$))', 'i'), '');
    return size && size !== 'master' ? clean.replace(/(\.[a-z]+)(\?.*)?$/i, '_' + size + '$1$2') : clean;
  }
  function baseSrc(s) { return img(s || '', 'master').replace(/^https?:/, '').split('?')[0]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var DIA = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g'), DD = new RegExp(String.fromCharCode(0x111), 'g');
  function fold(s) { return String(s || '').toLowerCase().replace(DD, 'd').normalize('NFD').replace(DIA, ''); }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  function icon(name) {
    var P = { plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', trash: '<path d="M4.5 7h15M10 7V5h4v2M6.5 7l1 13h9l1-13"/>',
      check: '<path d="M5 12l5 5 9-10"/>', alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5v.01"/>', bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>' };
    return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  function post(url, body) {
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded' }, XHR), body: body })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || (j && j.status >= 400)) throw j; return j; }); });
  }
  function getJSON(url) { return fetch(url, { credentials: 'same-origin', headers: XHR }).then(function (r) { if (!r.ok) throw r; return r.json(); }); }

  /* màu cho nút chọn màu: tên tiếng Việt -> mã màu */
  var COLORS = [['xanh duong', '#2c5fd1'], ['xanh la', '#4f9a5a'], ['xanh ngoc', '#2ab3a6'], ['xanh reu', '#6b7a3a'], ['navy', '#1f2a5a'], ['xanh', '#4a7fc1'],
    ['hong', '#f2a7b9'], ['vang', '#efc75e'], ['trang', '#ffffff'], ['den', '#151515'], ['xam', '#9b9b9b'], ['bac', '#c9c9c9'], ['nau', '#8b5e3c'],
    ['do', '#d64545'], ['cam', '#f08c2e'], ['tim', '#8e6ccf'], ['kem', '#efe6d2'], ['be', '#e2d3b5'], ['ghi', '#8a8a8a']];
  function colorOf(name) { var f = fold(name); for (var i = 0; i < COLORS.length; i++) if (f.indexOf(COLORS[i][0]) >= 0) return COLORS[i][1]; return null; }
  function paintDots(root) { $$('[data-color]', root).forEach(function (d) { var c = colorOf(d.dataset.color); if (c) d.style.background = c; else d.classList.add('txt'); }); }

  /* thông báo nhỏ góc màn hình */
  function toast(msg, type, link) {
    var box = $('#toasts'); if (!box) return;
    var t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.innerHTML = icon(type === 'err' ? 'alert' : 'check') + '<span>' + msg + '</span>' + (link ? '<a href="' + esc(link.href) + '">' + esc(link.text) + '</a>' : '');
    box.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('on'); });
    setTimeout(function () { t.classList.remove('on'); setTimeout(function () { t.remove(); }, 400); }, type === 'err' ? 5000 : 3200);
  }

  /* hộp thoại: khoá cuộn, giữ phím Tab trong hộp, Esc để đóng, trả focus khi đóng */
  var openStack = [];
  function lock(on) { document.documentElement.classList.toggle('lock', on || openStack.length > 0); }
  function openDialog(el, focusEl, onClose) {
    openStack.push({ el: el, back: document.activeElement, onClose: onClose });
    lock(true);
    setTimeout(function () { var f = focusEl || $('button, a, input', el); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function releaseDialog(el) {
    for (var i = openStack.length - 1; i >= 0; i--) if (openStack[i].el === el) {
      var d = openStack.splice(i, 1)[0];
      if (d.back && d.back.focus && document.contains(d.back)) d.back.focus({ preventScroll: true });
    }
    lock(false);
  }
  document.addEventListener('keydown', function (e) {
    var top = openStack[openStack.length - 1]; if (!top) return;
    if (e.key === 'Escape') { e.preventDefault(); if (top.onClose) top.onClose(); return; }
    if (e.key !== 'Tab') return;
    var f = $$('a[href], button:not([disabled]), input:not([type=hidden]), select, textarea, [tabindex="0"]', top.el).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  /* ================= 2. ĐO LƯỜNG + NGUỒN ĐƠN ================= */
  var EV = {
    view_item: { tt: 'ViewContent', fb: 'ViewContent' }, add_to_cart: { tt: 'AddToCart', fb: 'AddToCart' },
    begin_checkout: { tt: 'InitiateCheckout', fb: 'InitiateCheckout' }, search: { tt: 'Search', fb: 'Search' }, view_cart: {}
  };
  /* item: {id, sku, name, price (x100), qty} */
  function track(name, item, extra) {
    var value = item ? Math.round(item.price / 100) * (item.qty || 1) : undefined;
    var ga = Object.assign({ currency: 'VND', value: value }, extra || {});
    if (item) ga.items = [{ item_id: item.sku || String(item.id), item_name: item.name, price: Math.round(item.price / 100), quantity: item.qty || 1 }];
    try {
      window.dataLayer = window.dataLayer || []; window.dataLayer.push(Object.assign({ event: name }, ga));
      if (window.gtag) window.gtag('event', name, ga);
      var m = EV[name] || {};
      if (window.ttq && m.tt) window.ttq.track(m.tt, item ? { content_id: String(item.sku || item.id), content_type: 'product', content_name: item.name, quantity: item.qty || 1, price: Math.round(item.price / 100), value: value, currency: 'VND' } : (extra || {}));
      if (window.fbq && m.fb) window.fbq('track', m.fb, item ? { content_ids: [String(item.id)], content_type: 'product', content_name: item.name, value: value, currency: 'VND' } : (extra || {}));
    } catch (e) {}
  }
  CFG.track = track;

  /* Ghi lại khách đến từ đâu (link TikTok gắn utm_ hoặc ?ref=), lưu thành Thuộc tính đơn hàng trên Haravan */
  var SRC_KEY = 'feba_src';
  (function captureSource() {
    if (!CFG.trackSource) return;
    var q = new URLSearchParams(location.search), now = new Date();
    var touch = {
      s: q.get('utm_source') || q.get('ref') || q.get('aff') || '', m: q.get('utm_medium') || '', c: q.get('utm_campaign') || '',
      n: q.get('utm_content') || q.get('utm_term') || '', l: location.pathname, t: now.toISOString().slice(0, 16).replace('T', ' ')
    };
    var saved = store.get(SRC_KEY, null);
    if (!touch.s) {
      var ref = document.referrer && document.referrer.indexOf(location.host) < 0 ? document.referrer : '';
      if (ref && !saved) { try { touch.s = new URL(ref).hostname.replace(/^www\./, ''); touch.m = 'gioi-thieu'; } catch (e) {} }
      else if (!saved) { touch.s = 'truc-tiep'; }
      else return;
    }
    store.set(SRC_KEY, { first: (saved && saved.first) || touch, last: touch, synced: false });
  })();
  function syncSource(force) {
    var s = store.get(SRC_KEY, null);
    if (!CFG.trackSource || !s || (s.synced && !force)) return Promise.resolve();
    var L = s.last, F = s.first, a = {
      'Nguồn': L.s, 'Kênh': L.m, 'Chiến dịch': L.c, 'Nội dung': L.n, 'Trang vào': L.l,
      'Nguồn đầu tiên': F === L || (F.s === L.s && F.c === L.c) ? '' : [F.s, F.c, F.t].filter(Boolean).join(' · ')
    };
    var body = Object.keys(a).filter(function (k) { return a[k]; }).map(function (k) { return 'attributes[' + encodeURIComponent(k) + ']=' + encodeURIComponent(a[k]); }).join('&');
    if (!body) return Promise.resolve();
    return post('/cart/update.js', body).then(function () { s.synced = true; store.set(SRC_KEY, s); }).catch(function () {});
  }

  /* ================= 3. HIỆU ỨNG KHI CUỘN ================= */
  function count(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    var to = +el.dataset.count; if (!to || reduce) { el.textContent = to; return; }
    var t0 = 0;
    function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 1600); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(step); }
    el.textContent = '0'; requestAnimationFrame(step);
  }
  function enter(el) { el.classList.add('in'); $$('[data-count]', el).concat(el.dataset.count ? [el] : []).forEach(count); }
  var io = null;
  function reveal(root) {
    var t = $$('.rv:not(.in), [data-in]:not(.in)', root);
    if (reduce || !('IntersectionObserver' in window)) return t.forEach(enter);
    if (!io) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { enter(e.target); io.unobserve(e.target); } }); }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    t.forEach(function (el) { io.observe(el); });
  }
  reveal();
  /* ảnh hiện dần khi tải xong, nền nhấp nháy trong lúc chờ */
  function imgReady(root) {
    $$('.card-img img, .g-slide img', root).forEach(function (i) {
      var done = function () { i.classList.add('ld'); i.parentNode.classList.add('ok'); };
      if (i.complete && i.naturalWidth) done();
      else { i.addEventListener('load', done); i.addEventListener('error', done); }
    });
  }
  imgReady();
  paintDots();
  /* % giảm giá: Liquid của Haravan chia ra số lẻ, làm tròn lại */
  function roundBadges(root) { $$('.badge-sale', root).forEach(function (b) { b.textContent = b.textContent.replace(/(\d+(?:\.\d+)?)%/, function (_, n) { return Math.round(+n) + '%'; }); }); }
  roundBadges();

  /* ================= 4. ĐẦU TRANG, MENU ================= */
  var hdr = $('#hdr'), prog = $('#prog'), totop = $('[data-totop]'), lastY = scrollY, ticking = false;
  var stickHooks = [];
  addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
      if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? y / max : 0).toFixed(4) + ')';
      if (hdr) {
        hdr.classList.toggle('scrolled', y > 8);
        if (y > 320 && y > lastY + 4 && !openStack.length && !hdr.contains(document.activeElement)) hdr.classList.add('hide');
        else if (y < lastY - 4 || y < 320) hdr.classList.remove('hide');
      }
      if (totop) totop.classList.toggle('on', y > innerHeight * 1.5);
      lastY = y;
      stickHooks.forEach(function (f) { f(); });
    });
  }, { passive: true });
  if (totop) totop.addEventListener('click', function () { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* thanh thông báo: nhiều câu cách nhau bằng | thì tự chuyển */
  var notes = $$('.announce-i');
  if (notes.length > 1 && !reduce) { var ni = 0; setInterval(function () { notes[ni].classList.remove('on'); ni = (ni + 1) % notes.length; notes[ni].classList.add('on'); }, 4500); }

  /* menu điện thoại */
  var mbtn = $('.menu-btn'), mnav = $('#mnav');
  function mnavToggle(open) {
    if (!mnav) return;
    if (open) { mnav.hidden = false; requestAnimationFrame(function () { mnav.classList.add('on'); }); mbtn.setAttribute('aria-expanded', 'true'); openDialog(mnav, null, function () { mnavToggle(false); }); }
    else if (!mnav.hidden) {
      mnav.classList.remove('on'); mbtn.setAttribute('aria-expanded', 'false');
      setTimeout(function () { mnav.hidden = true; }, 320);
      releaseDialog(mnav);
    }
  }
  if (mbtn) mbtn.addEventListener('click', function () { mnavToggle(mnav.hidden); });
  $$('[data-mnav-close]').forEach(function (b) { b.addEventListener('click', function () { mnavToggle(false); }); });

  /* menu thả xuống trên máy tính: mở bằng bàn phím */
  $$('.nav-dd').forEach(function (dd) {
    var top = $('.nav-top', dd);
    top.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); dd.classList.add('open'); var f = $('.dd a', dd); if (f) f.focus(); } });
    dd.addEventListener('focusout', function () { setTimeout(function () { if (!dd.contains(document.activeElement)) dd.classList.remove('open'); }, 0); });
  });

  /* ================= 5. TÌM KIẾM NHANH ================= */
  var srch = $('#srch'), sq = $('#srch-q'), sres = $('#srch-res'), stags = $('[data-srch-tags]'), sctrl = null, sterm = '', tracked = {};
  function srchOpen() {
    if (!srch) { location.href = '/search'; return; }
    srch.hidden = false; requestAnimationFrame(function () { srch.classList.add('on'); });
    openDialog(srch, sq, srchClose);
  }
  function srchClose() {
    if (!srch || srch.hidden) return;
    srch.classList.remove('on'); setTimeout(function () { srch.hidden = true; }, 250);
    releaseDialog(srch);
  }
  function suggest(q) {
    sterm = q;
    if (sctrl && sctrl.abort) sctrl.abort();
    if (q.length < 2) { sres.innerHTML = ''; if (stags) stags.hidden = false; return; }
    sctrl = window.AbortController ? new AbortController() : null;
    sres.classList.add('busy');
    fetch('/search?type=product&view=suggest&q=' + encodeURIComponent(q), { credentials: 'same-origin', signal: sctrl && sctrl.signal })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        if (q !== sterm) return;
        sres.classList.remove('busy');
        if (/<html|<body/i.test(html)) html = '<a class="sg-all" href="/search?type=product&q=' + encodeURIComponent(q) + '">Nhấn Enter để xem kết quả cho "' + esc(q) + '"</a>';
        sres.innerHTML = html; if (stags) stags.hidden = true;
        if (!tracked[q]) { tracked[q] = 1; track('search', null, { search_term: q, query: q }); }
      }).catch(function () { sres.classList.remove('busy'); });
  }
  if (srch) {
    $$('[data-srch-open]').forEach(function (b) { b.addEventListener('click', srchOpen); });
    $$('[data-srch-close]', srch).forEach(function (b) { b.addEventListener('click', srchClose); });
    sq.addEventListener('input', debounce(function () { suggest(sq.value.trim()); }, 200));
    sq.addEventListener('keydown', function (e) {
      var opts = $$('[data-sg], .sg-all', sres); if (!opts.length || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return;
      e.preventDefault();
      var i = opts.indexOf(document.activeElement); i = e.key === 'ArrowDown' ? Math.min(opts.length - 1, i + 1) : i - 1;
      if (i < 0) sq.focus(); else opts[i].focus();
    });
    sres.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      var opts = $$('[data-sg], .sg-all', sres), i = opts.indexOf(document.activeElement); e.preventDefault();
      i = e.key === 'ArrowDown' ? Math.min(opts.length - 1, i + 1) : i - 1;
      if (i < 0) sq.focus(); else opts[i].focus();
    });
    $$('[data-srch-word]', srch).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); sq.value = a.dataset.srchWord; suggest(sq.value); sq.focus(); }); });
    addEventListener('keydown', function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '') || (document.activeElement || {}).isContentEditable;
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); srchOpen(); }
    });
  }

  /* sắp xếp nhóm sản phẩm (Haravan xử lý qua ?sort_by=) */
  var sort = $('[data-sort]');
  if (sort) {
    var cur = (location.search.match(/sort_by=([^&]+)/) || [])[1];
    if (cur) sort.value = cur;
    sort.addEventListener('change', function () { var u = new URL(location.href); u.searchParams.set('sort_by', sort.value); u.searchParams.delete('page'); location.href = u.toString(); });
  }

  /* ================= 6. GIỎ HÀNG ================= */
  var drawer = $('#cart-drawer'), CART = null, isCartPage = document.body.classList.contains('tpl-cart');
  function getCart() { return getJSON('/cart.js').then(function (c) { CART = c; return c; }); }
  function setCount(n, bump) {
    $$('[data-cart-count]').forEach(function (e) { e.textContent = n; e.classList.toggle('zero', !n); });
    var b = $('.cart-btn'); if (b) { b.setAttribute('aria-label', 'Giỏ hàng, ' + n + ' sản phẩm'); if (bump) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } }
  }
  function freeShip(cart) {
    $$('[data-fship]').forEach(function (box) {
      var T = +box.dataset.fship * 100, total = cart ? cart.total_price : 0, txt = $('[data-fship-text] span', box), bar = $('[data-fship-bar]', box);
      if (!T) { bar.style.transform = 'scaleX(1)'; box.classList.add('done'); return; }
      var left = T - total, k = Math.max(0, Math.min(1, total / T));
      bar.style.transform = 'scaleX(' + k.toFixed(3) + ')';
      box.classList.toggle('done', left <= 0);
      txt.innerHTML = left <= 0 ? 'Đơn của bạn được <b>miễn phí giao hàng</b>.' : (total ? 'Mua thêm <b>' + money(left) + '</b> để được miễn phí giao hàng.' : 'Miễn phí giao hàng cho đơn từ <b>' + money(T) + '</b>.');
    });
  }
  function upsell(cart) {
    $$('[data-upsell]').forEach(function (u) {
      var inCart = (cart.items || []).map(function (i) { return String(i.product_id); }), shown = 0;
      $$('[data-upsell-item]', u).forEach(function (it) { var ok = inCart.indexOf(it.dataset.upsellItem) < 0 && shown < 3; it.hidden = !ok; if (ok) shown++; });
      u.hidden = !shown || !cart.item_count;
    });
  }
  function lineHTML(it, i) {
    var v = it.variant_title || ((it.variant_options && it.variant_options.join) ? it.variant_options.join(' / ') : '');
    if (/Default/.test(v)) v = '';
    return '<div class="d-line" data-dline="' + (i + 1) + '">' +
      '<a href="' + esc(it.url) + '" class="d-img"><img src="' + esc(img(it.image, 'small')) + '" alt="" width="72" height="72"></a>' +
      '<div class="d-bd"><a href="' + esc(it.url) + '" class="d-t">' + esc(it.product_title || it.title) + '</a>' + (v ? '<small>' + esc(v) + '</small>' : '') +
      '<span class="d-p">' + money(it.price) + '</span>' +
      '<div class="d-row"><div class="qty xs"><button type="button" data-line="' + (i + 1) + '" data-q="' + (it.quantity - 1) + '" aria-label="Giảm">' + icon('minus') + '</button><span>' + it.quantity + '</span>' +
      '<button type="button" data-line="' + (i + 1) + '" data-q="' + (it.quantity + 1) + '" aria-label="Tăng">' + icon('plus') + '</button></div>' +
      '<button type="button" class="d-rm" data-line="' + (i + 1) + '" data-q="0" aria-label="Xoá ' + esc(it.product_title || it.title) + '">' + icon('trash') + '</button></div></div>' +
      '<b class="d-total">' + money(it.line_price || it.price * it.quantity) + '</b></div>';
  }
  function render(cart) {
    CART = cart;
    setCount(cart.item_count);
    $$('[data-cart-total]').forEach(function (e) { e.textContent = money(cart.total_price); });
    freeShip(cart); upsell(cart);
    var box = $('[data-cart-items]'); if (!box) return;
    var ft = $('[data-cart-ft]');
    if (!cart.items || !cart.items.length) {
      box.innerHTML = '<div class="drawer-empty"><span class="empty-ic">' + icon('bag') + '</span><p>Giỏ hàng đang trống.</p><a class="btn btn-line" href="/collections/all">Xem sản phẩm</a></div>';
      if (ft) ft.hidden = true; return;
    }
    if (ft) ft.hidden = false;
    box.innerHTML = cart.items.map(lineHTML).join('');
  }
  function openDrawer() {
    if (!drawer || isCartPage) { location.href = '/cart'; return; }
    drawer.classList.add('on'); drawer.setAttribute('aria-hidden', 'false');
    openDialog(drawer, $('[data-cart-close].icon-btn', drawer), closeDrawer);
    (CART ? Promise.resolve(CART) : getCart()).then(render).catch(function () {});
    getCart().then(function (c) { render(c); track('view_cart', null, { value: Math.round(c.total_price / 100) }); }).catch(function () {});
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('on')) return;
    drawer.classList.remove('on'); drawer.setAttribute('aria-hidden', 'true');
    releaseDialog(drawer);
  }
  function changeLine(line, qty, busyEl) {
    var row = busyEl && busyEl.closest('.d-line'); if (row) row.classList.add('busy');
    return post('/cart/change.js', 'line=' + line + '&quantity=' + Math.max(0, qty))
      .then(function (c) { render(c); return c; })
      .catch(function (err) { if (row) row.classList.remove('busy'); toast(esc((err && (err.description || err.message)) || 'Không cập nhật được giỏ hàng.'), 'err'); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-cart-open]') && !isCartPage) { e.preventDefault(); openDrawer(); return; }
    if (t.closest('[data-cart-close]')) { closeDrawer(); return; }
    var q = t.closest('[data-line]');
    if (q && drawer && drawer.contains(q)) { changeLine(q.dataset.line, +q.dataset.q, q); return; }
    if (t.closest('[data-checkout]')) {
      track('begin_checkout', null, { value: CART ? Math.round(CART.total_price / 100) : undefined });
      if (CFG.trackSource && t.closest('a[data-checkout]')) {
        var a = t.closest('a'); e.preventDefault(); syncSource(true).then(function () { location.href = a.href; });
      }
    }
  });

  /* hiệu ứng: ảnh sản phẩm bay vào giỏ */
  function fly(fromEl) {
    var cartBtn = $('.cart-btn'); if (!fromEl || !cartBtn || reduce || !fromEl.animate) return;
    var a = fromEl.getBoundingClientRect(), b = cartBtn.getBoundingClientRect(); if (!a.width) return;
    var c = fromEl.cloneNode(); c.className = 'flyer'; c.removeAttribute('loading');
    var s = Math.min(a.width, 160);
    Object.assign(c.style, { left: (a.left + a.width / 2 - s / 2) + 'px', top: (a.top + a.height / 2 - s / 2) + 'px', width: s + 'px', height: s + 'px' });
    document.body.appendChild(c);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    c.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx * .5 + 'px,' + (dy * .5 - 80) + 'px) scale(.6)', opacity: .9 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.12)', opacity: .2 }],
      { duration: 750, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = function () { c.remove(); };
  }
  function busy(btn, on) { if (!btn) return; btn.disabled = on; btn.classList.toggle('loading', on); }
  /* thêm 1 phân loại vào giỏ. opts: {qty, btn, imgEl, then: 'drawer'|'checkout'|'none'} */
  function addVariant(id, opts) {
    opts = opts || {};
    busy(opts.btn, true);
    return post('/cart/add.js', 'id=' + encodeURIComponent(id) + '&quantity=' + (opts.qty || 1))
      .then(function (item) {
        busy(opts.btn, false);
        track('add_to_cart', { id: item.variant_id || id, sku: item.sku, name: item.product_title || item.title, price: item.price, qty: opts.qty || 1 });
        if (opts.then === 'checkout') { track('begin_checkout', null, {}); return syncSource(true).then(function () { location.href = '/checkout'; }); }
        fly(opts.imgEl);
        return getCart().then(function (c) {
          setCount(c.item_count, true); render(c); syncSource();
          if (isCartPage) { location.reload(); return; }
          if (opts.then === 'none') toast('Đã thêm <b>' + esc(item.product_title || item.title) + '</b> vào giỏ.', '', { href: '/cart', text: 'Xem giỏ' });
          else setTimeout(openDrawer, reduce ? 0 : 380);
        });
      })
      .catch(function (err) { busy(opts.btn, false); toast(esc((err && (err.description || err.message)) || 'Không thêm được vào giỏ, vui lòng thử lại.'), 'err'); });
  }
  CFG.addVariant = addVariant;

  /* nút "Thêm vào giỏ" trên thẻ sản phẩm, gợi ý mua kèm, sản phẩm chủ lực */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-quick-add]'); if (!b) return;
    e.preventDefault();
    var card = b.closest('[data-card], .ups-i, .spot-in, .rail-i');
    var im = card ? $('.card-img img, .ups-img img, .spot-img img, img', card) : null;
    addVariant(b.dataset.quickAdd, { btn: b, imgEl: im, then: drawer && drawer.contains(b) ? 'none' : 'drawer' });
  });

  /* ================= 7. XEM NHANH + CHỌN PHÂN LOẠI ================= */
  function optName(o) { return typeof o === 'string' ? o : (o && o.name) || ''; }
  function isColor(name) { return /\bmau\b|colou?r/.test(fold(name)); }
  /* Bộ chọn phân loại dùng chung cho trang sản phẩm và khung xem nhanh */
  function Picker(root, P, onChange) {
    var vars = P.variants || [], names = (P.options || []).map(optName);
    function opts(v) { return [v.option1, v.option2, v.option3].filter(function (x) { return x != null && x !== ''; }); }
    var first = vars.filter(function (v) { return v.available; })[0] || vars[0];
    var pre = +(new URLSearchParams(location.search).get('variant') || 0);
    var preV = vars.filter(function (v) { return v.id === pre; })[0];
    var chosen = opts(preV || first || {});
    function find() { return vars.filter(function (v) { var o = opts(v); return chosen.every(function (c, i) { return o[i] === c; }); })[0]; }
    function draw() {
      $$('.opt', root).forEach(function (fs) {
        var i = +fs.dataset.opt, vals = [], box = $('.opt-vals', fs), color = isColor(names[i] || fs.dataset.optName || '');
        vars.forEach(function (x) { var o = opts(x)[i]; if (o != null && vals.indexOf(o) < 0) vals.push(o); });
        if (!box.children.length) {
          box.innerHTML = vals.map(function (val) {
            var c = color ? colorOf(val) : null;
            return '<button type="button" role="radio" data-val="' + esc(val) + '"' + (c ? ' class="sw"' : '') + '>' + (c ? '<i style="background:' + c + '"></i>' : '') + '<span>' + esc(val) + '</span></button>';
          }).join('');
        }
        $$('button', box).forEach(function (b) {
          var val = b.dataset.val, test = chosen.slice(); test[i] = val;
          var ok = vars.some(function (x) { var o = opts(x); return x.available && test.every(function (c, k) { return o[k] === c; }); });
          b.setAttribute('aria-checked', chosen[i] === val ? 'true' : 'false');
          b.classList.toggle('na', !ok);
          b.title = ok ? val : val + ' (hết hàng)';
        });
        var lab = $('[data-opt-val]', fs); if (lab) lab.textContent = chosen[i] || '';
      });
      onChange(find());
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('.opt-vals button'); if (!b || !root.contains(b)) return;
      chosen[+b.closest('.opt').dataset.opt] = b.dataset.val; draw();
    });
    draw();
    return { variant: find };
  }
  /* trạng thái kho: chỉ hiện "Chỉ còn" khi Haravan có quản lý tồn kho */
  function stockInfo(v) {
    if (!v) return { cls: 's-no', text: 'Không có lựa chọn này', low: '' };
    if (!v.available) return { cls: 's-no', text: 'Hết hàng', low: '' };
    var q = v.inventory_quantity, managed = v.inventory_management && v.inventory_management !== 'null';
    if (managed && typeof q === 'number' && q > 0 && CFG.lowStock && q <= CFG.lowStock) return { cls: 's-low', text: 'Sắp hết hàng', low: 'Chỉ còn <b>' + q + '</b> sản phẩm, đặt sớm để giữ hàng.' };
    return { cls: 's-ok', text: 'Còn hàng', low: '' };
  }

  var qv = $('#qv');
  function qvOpen(handle, btn) {
    if (!qv) { location.href = '/products/' + handle; return; }
    var body = $('[data-qv-body]', qv);
    body.innerHTML = '<div class="qv-load"><span class="spin"></span></div>';
    qv.hidden = false; requestAnimationFrame(function () { qv.classList.add('on'); });
    openDialog(qv, $('.qv-x', qv), qvClose);
    busy(btn, true);
    getJSON('/products/' + handle + '.js').then(function (P) {
      busy(btn, false);
      var imgs = (P.images || []).map(function (i) { return typeof i === 'string' ? i : i.src; });
      var url = P.url || '/products/' + handle;
      body.innerHTML = '<div class="qv-in"></div>';
      body = $('.qv-in', body);
      body.innerHTML =
        '<div class="qv-gal"><div class="qv-main"><img data-qv-img src="' + esc(img(imgs[0] || P.featured_image, 'large')) + '" alt=""></div>' +
        (imgs.length > 1 ? '<div class="qv-th">' + imgs.slice(0, 5).map(function (s, i) { return '<button type="button" data-qv-th="' + esc(img(s, 'large')) + '"' + (i ? '' : ' class="on"') + ' aria-label="Ảnh ' + (i + 1) + '"><img src="' + esc(img(s, 'small')) + '" alt=""></button>'; }).join('') + '</div>' : '') + '</div>' +
        '<div class="qv-info"><span class="kicker">' + esc(P.type || P.product_type || P.vendor || '') + '</span><h2 id="qv-title" class="qv-t">' + esc(P.title) + '</h2>' +
        '<div class="price big" data-qv-price></div><p class="stock" data-qv-stock></p>' +
        (P.variants.length > 1 || !/Default/.test(P.variants[0].title) ? (P.options || []).map(function (o, i) { return '<fieldset class="opt" data-opt="' + i + '" data-opt-name="' + esc(optName(o)) + '"><legend>' + esc(optName(o)) + ': <b data-opt-val></b></legend><div class="opt-vals"></div></fieldset>'; }).join('') : '') +
        '<p class="low" data-qv-low hidden></p>' +
        '<div class="qty-row"><div class="qty"><button type="button" data-qvq="-1" aria-label="Giảm">' + icon('minus') + '</button><input type="number" value="1" min="1" inputmode="numeric" aria-label="Số lượng" data-qv-qty><button type="button" data-qvq="1" aria-label="Tăng">' + icon('plus') + '</button></div>' +
        '<button type="button" class="btn btn-blue grow" data-qv-add>Thêm vào giỏ</button></div>' +
        '<a class="ulink" href="' + esc(url) + '">Xem chi tiết sản phẩm</a></div>';
      var add = $('[data-qv-add]', body), mainI = $('[data-qv-img]', body);
      var pk = Picker(body, P, function (v) {
        $('[data-qv-price]', body).innerHTML = v ? '<b>' + money(v.price) + '</b>' + (v.compare_at_price > v.price ? '<del>' + money(v.compare_at_price) + '</del>' : '') : '';
        var s = stockInfo(v), st = $('[data-qv-stock]', body), lw = $('[data-qv-low]', body);
        st.innerHTML = '<i class="' + s.cls + '"></i>' + s.text; lw.innerHTML = s.low; lw.hidden = !s.low;
        add.disabled = !(v && v.available); add.textContent = v && v.available ? 'Thêm vào giỏ' : (v ? 'Hết hàng' : 'Chọn phân loại khác');
        if (v && v.featured_image && v.featured_image.src) mainI.src = img(v.featured_image.src, 'large');
      });
      body.addEventListener('click', function (e) {
        var th = e.target.closest('[data-qv-th]'); if (th) { mainI.src = th.dataset.qvTh; $$('[data-qv-th]', body).forEach(function (x) { x.classList.toggle('on', x === th); }); }
        var qb = e.target.closest('[data-qvq]'); if (qb) { var inp = $('[data-qv-qty]', body); inp.value = Math.max(1, (+inp.value || 1) + +qb.dataset.qvq); }
      });
      add.addEventListener('click', function () {
        var v = pk.variant(); if (!v) return;
        addVariant(v.id, { qty: Math.max(1, +$('[data-qv-qty]', body).value || 1), btn: add, imgEl: mainI }).then(function () { qvClose(); });
      });
      track('view_item', { id: P.id, sku: (P.variants[0] || {}).sku, name: P.title, price: P.price });
    }).catch(function () { busy(btn, false); qvClose(); location.href = '/products/' + handle; });
  }
  function qvClose() {
    if (!qv || qv.hidden) return;
    qv.classList.remove('on'); setTimeout(function () { qv.hidden = true; }, 250);
    releaseDialog(qv);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-quick-view]'); if (b) { e.preventDefault(); if (drawer && drawer.contains(b)) closeDrawer(); qvOpen(b.dataset.quickView, b); }
    if (e.target.closest('[data-qv-close]')) qvClose();
  });

  /* ================= 8. TRANG SẢN PHẨM ================= */
  var P = window.FEBA_PRODUCT, form = $('#buy-form');
  /* thư viện ảnh: vuốt, mũi tên, ảnh nhỏ, phóng to khi rê chuột, xem toàn màn hình */
  var gal = $('[data-gallery]'), track_ = gal && $('[data-track]', gal), slides = track_ ? $$('.g-slide', track_) : [], gi = 0;
  function gGo(i, smooth) {
    if (!track_ || !slides.length) return;
    gi = (i + slides.length) % slides.length;
    track_.scrollTo({ left: gi * track_.clientWidth, behavior: smooth === false || reduce ? 'auto' : 'smooth' });
    gMark();
  }
  function gMark() {
    $$('[data-thumb]', gal).forEach(function (t) { var on = +t.dataset.thumb === gi; t.classList.toggle('on', on); if (on && t.scrollIntoView && t.parentNode.scrollWidth > t.parentNode.clientWidth) t.parentNode.scrollTo({ left: t.offsetLeft - 40, behavior: 'smooth' }); });
    var c = $('[data-g-count]', gal); if (c) c.textContent = (gi + 1) + ' / ' + slides.length;
  }
  if (track_) {
    track_.addEventListener('scroll', debounce(function () { var i = Math.round(track_.scrollLeft / track_.clientWidth); if (i !== gi) { gi = i; gMark(); } }, 60), { passive: true });
    $$('[data-g-step]', gal).forEach(function (b) { b.addEventListener('click', function () { gGo(gi + +b.dataset.gStep); }); });
    $$('[data-thumb]', gal).forEach(function (t) { t.addEventListener('click', function () { gGo(+t.dataset.thumb); }); });
    track_.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); gGo(gi + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); gGo(gi - 1); } });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) slides.forEach(function (s) {
      var im = $('img', s);
      s.addEventListener('mousemove', function (e) { var r = s.getBoundingClientRect(); im.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%'; s.classList.add('zoom'); });
      s.addEventListener('mouseleave', function () { s.classList.remove('zoom'); });
    });
    slides.forEach(function (s, i) { s.addEventListener('click', function () { lbOpen(i); }); });
    var zb = $('[data-g-zoom]', gal); if (zb) zb.addEventListener('click', function () { lbOpen(gi); });
    addEventListener('resize', debounce(function () { gGo(gi, false); }, 150));
  }
  /* xem ảnh toàn màn hình */
  var lb = $('#lb'), lbI = lb && $('[data-lb-img]', lb), li = 0, tx = 0;
  function lbShow() { lbI.src = slides[li].dataset.src; $('[data-lb-n]', lb).textContent = (li + 1) + ' / ' + slides.length; }
  function lbOpen(i) { if (!lb || !slides.length) return; li = i; lbShow(); lb.hidden = false; requestAnimationFrame(function () { lb.classList.add('on'); }); openDialog(lb, $('.lb-x', lb), lbClose); }
  function lbClose() { if (!lb || lb.hidden) return; lb.classList.remove('on'); setTimeout(function () { lb.hidden = true; }, 200); releaseDialog(lb); gGo(li, false); }
  if (lb) {
    $('[data-lb-close]', lb).addEventListener('click', lbClose);
    $$('[data-lb-step]', lb).forEach(function (b) { b.addEventListener('click', function () { li = (li + +b.dataset.lbStep + slides.length) % slides.length; lbShow(); }); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { li = (li + (e.key === 'ArrowRight' ? 1 : -1) + slides.length) % slides.length; lbShow(); } });
    lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 50) { li = (li + (d < 0 ? 1 : -1) + slides.length) % slides.length; lbShow(); } });
    if (slides.length < 2) $$('.lb-nav', lb).forEach(function (b) { b.hidden = true; });
  }

  if (P && form) {
    var sel = $('#variant-id'), addBtn = $('[data-add]'), addLab = $('[data-add-label]'), buyBtn = $('[data-buy-now]'), stickBtn = $('[data-stick-add]');
    var priceBox = $('[data-price]'), saveBox = $('[data-save]'), stickPrice = $('[data-stick-price]'), stickVar = $('[data-stick-var]'), skuBox = $('[data-sku]'), sale = $('[data-sale]'), stockBox = $('[data-stock]'), lowBox = $('[data-low]');
    var qtyIn = $('input[name=quantity]', form), firstImg = $('.g-slide img');
    var drawn = 0;
    var picker = Picker(form, P, function (v) {
      var s = stockInfo(v);
      if (stockBox) stockBox.innerHTML = '<i class="' + s.cls + '"></i>' + s.text;
      if (lowBox) { lowBox.innerHTML = s.low; lowBox.hidden = !s.low; }
      [addBtn, buyBtn, stickBtn].forEach(function (b) { if (b) b.disabled = !(v && v.available); });
      if (addLab) addLab.textContent = v && v.available ? 'Thêm vào giỏ' : (v ? 'Hết hàng' : 'Chọn phân loại khác');
      if (!v) return;
      sel.value = v.id;
      var onSale = v.compare_at_price > v.price;
      if (priceBox) priceBox.innerHTML = '<b>' + money(v.price) + '</b>' + (onSale ? '<del>' + money(v.compare_at_price) + '</del>' : '');
      if (saveBox) saveBox.textContent = onSale ? 'Tiết kiệm ' + money(v.compare_at_price - v.price) + ' so với giá niêm yết' : '';
      if (stickPrice) stickPrice.textContent = money(v.price);
      if (stickVar) stickVar.textContent = /Default/.test(v.title) ? '' : v.title;
      if (sale) { sale.hidden = !onSale; if (onSale) sale.textContent = '-' + Math.round((v.compare_at_price - v.price) * 100 / v.compare_at_price) + '%'; }
      if (skuBox) skuBox.textContent = v.sku ? 'Mã: ' + v.sku : '';
      if (v.featured_image && v.featured_image.src) { var want = baseSrc(v.featured_image.src); slides.forEach(function (s, i) { if (baseSrc(s.dataset.src) === want) gGo(i); }); }
      if (history.replaceState && P.variants.length > 1 && drawn++) { var u = new URL(location.href); u.searchParams.set('variant', v.id); history.replaceState(null, '', u); }
    });
    $$('[data-qty]', form).forEach(function (b) { b.addEventListener('click', function () { qtyIn.value = Math.max(1, (+qtyIn.value || 1) + +b.dataset.qty); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); var v = picker.variant(); if (!v) return;
      addVariant(v.id, { qty: Math.max(1, +qtyIn.value || 1), btn: addBtn, imgEl: slides[gi] ? $('img', slides[gi]) : firstImg });
    });
    if (buyBtn) buyBtn.addEventListener('click', function () { var v = picker.variant(); if (v) addVariant(v.id, { qty: Math.max(1, +qtyIn.value || 1), btn: buyBtn, then: 'checkout' }); });
    if (stickBtn) stickBtn.addEventListener('click', function () { var v = picker.variant(); if (v) addVariant(v.id, { qty: Math.max(1, +qtyIn.value || 1), btn: stickBtn, imgEl: $('.stick-img') }); });

    /* thanh mua dính đáy khi đã cuộn qua nút mua */
    var stick = $('[data-stick]');
    if (stick) stickHooks.push(function () { var r = form.getBoundingClientRect(); stick.classList.toggle('on', r.bottom < 0 && !document.documentElement.classList.contains('lock')); document.body.classList.toggle('has-stick', stick.classList.contains('on')); });

    /* ngày nhận dự kiến, giờ chốt đơn */
    var DOW = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    function day(n) { var d = new Date(); d.setDate(d.getDate() + n); return DOW[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1); }
    var eta = $('[data-eta] span'), sd = CFG.shipDays || [];
    if (eta && sd[1]) eta.innerHTML = 'Dự kiến nhận hàng <b>' + day(sd[0] || sd[1]) + (sd[0] && sd[0] !== sd[1] ? ' đến ' + day(sd[1]) : '') + '</b>';
    var cut = $('[data-cutoff]');
    if (cut && CFG.cutoffHour) {
      var tick = function () {
        var n = new Date(), end = new Date(); end.setHours(CFG.cutoffHour, 0, 0, 0);
        var m = Math.floor((end - n) / 60000);
        cut.hidden = m <= 0 || n.getDay() === 0;
        if (m > 0) $('span', cut).innerHTML = 'Đặt trong <b>' + (m >= 60 ? Math.floor(m / 60) + ' giờ ' : '') + (m % 60) + ' phút</b> nữa để được gửi đi hôm nay';
      };
      tick(); setInterval(tick, 30000);
    }

    /* lưu "vừa xem" và báo sự kiện xem sản phẩm */
    var fi = P.featured_image || (P.images && P.images[0]);
    var rv = store.get('feba_recent', []).filter(function (x) { return x.h !== P.handle; });
    rv.unshift({ h: P.handle, t: P.title, u: '/products/' + P.handle, i: img(fi, 'medium'), p: P.price, c: P.compare_at_price, a: P.available ? 1 : 0 });
    store.set('feba_recent', rv.slice(0, 10));
    track('view_item', { id: P.id, sku: (P.variants[0] || {}).sku, name: P.title, price: P.price });
  }
  /* chia sẻ: điện thoại mở bảng chia sẻ, máy tính chép link */
  var share = $('[data-share]');
  if (share) share.addEventListener('click', function () {
    var data = { title: document.title, url: location.href.split('?')[0] };
    if (navigator.share) navigator.share(data).catch(function () {});
    else if (navigator.clipboard) navigator.clipboard.writeText(data.url).then(function () { toast('Đã chép link sản phẩm.'); });
  });
  /* tab thông tin sản phẩm */
  $$('[data-ptabs]').forEach(function (box) {
    var tabs = $$('[role=tab]', box);
    function pick(t) { tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; $('#' + x.getAttribute('aria-controls')).hidden = !on; }); }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(t); });
      t.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; pick(n); n.focus(); } });
    });
  });

  /* ================= 9. NHÓM SẢN PHẨM: LỌC NGAY TRÊN TRANG ================= */
  var col = $('[data-collection]');
  if (col) (function () {
    var grid = $('[data-grid]', col), cards = grid ? $$('[data-card]', grid) : [], panel = $('[data-filters]', col), chips = $('[data-chips]', col);
    var st = { type: [], price: [], avail: false }, buckets = [];
    if (!cards.length) { var fb = $('[data-filter-open]', col); if (fb) fb.hidden = true; return; }
    /* loại sản phẩm */
    var types = {}; cards.forEach(function (c) { var t = c.dataset.type; if (t) types[t] = (types[t] || 0) + 1; });
    var tk = Object.keys(types);
    if (tk.length > 1) {
      var g = $('[data-fgroup=type]', col); g.hidden = false;
      $('.fopts', g).innerHTML = tk.map(function (t) { return '<label class="fchk"><input type="checkbox" data-f-type value="' + esc(t) + '"> <span>' + esc(t) + '</span><small>' + types[t] + '</small></label>'; }).join('');
    }
    /* mức giá: tự chia 3 khoảng theo giá đang có, làm tròn 50.000 */
    var prices = cards.map(function (c) { return +c.dataset.price; }).sort(function (a, b) { return a - b; });
    var uniq = prices.filter(function (p, i) { return prices.indexOf(p) === i; });
    if (uniq.length >= 3) {
      var r = function (x) { return Math.round(x / 50000) * 50000; };
      var a = r(prices[Math.floor(prices.length / 3)]), b = r(prices[Math.floor(prices.length * 2 / 3)]);
      if (b <= a) b = a + 50000;
      var M = function (v) { return money(v * 100); };
      buckets = [{ k: 'p0', l: 'Dưới ' + M(a), f: function (p) { return p < a; } }, { k: 'p1', l: 'Từ ' + M(a) + ' đến ' + M(b), f: function (p) { return p >= a && p < b; } }, { k: 'p2', l: 'Từ ' + M(b), f: function (p) { return p >= b; } }];
      buckets = buckets.filter(function (bk) { return prices.some(bk.f); });
      var pg = $('[data-fgroup=price]', col); pg.hidden = false;
      $('.fopts', pg).innerHTML = buckets.map(function (bk) { return '<label class="fchk"><input type="checkbox" data-f-price value="' + bk.k + '"> <span>' + bk.l + '</span><small>' + prices.filter(bk.f).length + '</small></label>'; }).join('');
    }
    function apply() {
      var n = 0;
      cards.forEach(function (c) {
        var p = +c.dataset.price, ok = (!st.type.length || st.type.indexOf(c.dataset.type) >= 0) &&
          (!st.price.length || buckets.some(function (bk) { return st.price.indexOf(bk.k) >= 0 && bk.f(p); })) && (!st.avail || c.dataset.avail === '1');
        c.hidden = !ok; if (ok) n++;
      });
      $$('[data-count-shown]', col).forEach(function (e) { e.textContent = n; });
      var fe = $('[data-filter-empty]', col); if (fe) fe.hidden = n > 0;
      var act = st.type.map(function (t) { return { g: 'type', v: t, l: t }; })
        .concat(st.price.map(function (k) { return { g: 'price', v: k, l: (buckets.filter(function (b) { return b.k === k; })[0] || {}).l }; }))
        .concat(st.avail ? [{ g: 'avail', v: '1', l: 'Còn hàng' }] : []);
      chips.hidden = !act.length;
      chips.innerHTML = act.map(function (x) { return '<button type="button" class="pill on" data-chip="' + x.g + '|' + esc(x.v) + '">' + esc(x.l) + ' <span aria-hidden="true">×</span><span class="vh">Bỏ lọc</span></button>'; }).join('') + (act.length ? '<button type="button" class="btn-txt" data-filter-clear>Xoá tất cả</button>' : '');
      var fn = $('[data-filter-n]', col); fn.hidden = !act.length; fn.textContent = act.length;
      try { sessionStorage.setItem('feba_f' + location.pathname, JSON.stringify(st)); } catch (e) {}
    }
    function sync() {
      $$('[data-f-type]', col).forEach(function (i) { i.checked = st.type.indexOf(i.value) >= 0; });
      $$('[data-f-price]', col).forEach(function (i) { i.checked = st.price.indexOf(i.value) >= 0; });
      $('[data-f-avail]', col).checked = st.avail;
    }
    col.addEventListener('change', function (e) {
      var i = e.target;
      if (i.matches('[data-f-type]')) st.type = $$('[data-f-type]:checked', col).map(function (x) { return x.value; });
      if (i.matches('[data-f-price]')) st.price = $$('[data-f-price]:checked', col).map(function (x) { return x.value; });
      if (i.matches('[data-f-avail]')) st.avail = i.checked;
      apply();
    });
    col.addEventListener('click', function (e) {
      var c = e.target.closest('[data-chip]');
      if (c) { var p = c.dataset.chip.split('|'); if (p[0] === 'avail') st.avail = false; else st[p[0]] = st[p[0]].filter(function (v) { return v !== p[1]; }); sync(); apply(); }
      if (e.target.closest('[data-filter-clear]')) { st = { type: [], price: [], avail: false }; sync(); apply(); }
      if (e.target.closest('[data-filter-open]')) { panel.classList.add('on'); $('[data-filter-open]', col).setAttribute('aria-expanded', 'true'); openDialog(panel, null, closeF); }
      if (e.target.closest('[data-filter-close]')) closeF();
    });
    document.addEventListener('click', function (e) { if (panel.classList.contains('on') && !panel.contains(e.target) && !e.target.closest('[data-filter-open]')) closeF(); });
    function closeF() { if (!panel.classList.contains('on')) return; panel.classList.remove('on'); $('[data-filter-open]', col).setAttribute('aria-expanded', 'false'); releaseDialog(panel); }
    try { var saved = JSON.parse(sessionStorage.getItem('feba_f' + location.pathname) || 'null'); if (saved) { st = saved; sync(); } } catch (e) {}
    apply();
  })();

  /* ================= 10. TRANG CHỦ: TAB NHÓM · VỪA XEM ================= */
  $$('[data-tabs-grid]').forEach(function (sec) {
    var cards = $$('[data-card]', sec);
    $$('[data-tab]', sec).forEach(function (t, _, all) {
      t.addEventListener('click', function () {
        all.forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
        var h = t.dataset.tab, n = 0;
        cards.forEach(function (c) { var ok = !h || (' ' + c.dataset.cols + ' ').indexOf(' ' + h + ' ') >= 0; ok = ok && (h || n < 8); c.hidden = !ok; if (ok) { n++; c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); } });
      });
    });
    var first = $('[data-tab]', sec); if (first) first.click();
  });
  (function recent() {
    var box = $('[data-recent]'); if (!box) return;
    var cur = P ? P.handle : '', items = store.get('feba_recent', []).filter(function (x) { return x.h !== cur; }).slice(0, 8);
    if (!items.length) return;
    $('[data-recent-list]', box).innerHTML = items.map(function (x) {
      return '<a class="rail-i" href="' + esc(x.u) + '"><span class="rail-img">' + (x.i ? '<img src="' + esc(x.i) + '" alt="" loading="lazy">' : '') + '</span><span class="rail-t">' + esc(x.t) + '</span>' +
        '<span class="price"><b>' + money(x.p) + '</b>' + (x.c > x.p ? '<del>' + money(x.c) + '</del>' : '') + '</span></a>';
    }).join('');
    box.hidden = false;
  })();

  /* ================= 11. TRANG GIỎ HÀNG ================= */
  var cp = $('[data-cart-page]');
  if (cp) {
    var renumber = function () { $$('[data-line-row]', cp).forEach(function (r, i) { r.dataset.lineRow = i + 1; }); };
    var setLine = function (row, qty) {
      var line = +row.dataset.lineRow; row.classList.add('busy');
      post('/cart/change.js', 'line=' + line + '&quantity=' + Math.max(0, qty)).then(function (c) {
        if (!c.item_count) { location.reload(); return; }
        if (qty <= 0) { row.classList.add('gone'); setTimeout(function () { row.remove(); renumber(); }, 300); }
        else {
          var it = c.items[line - 1]; row.classList.remove('busy');
          $('[data-cq-input]', row).value = it.quantity; $('[data-line-total]', row).textContent = money(it.line_price);
        }
        render(c); var h = $('.h1-n'); if (h) h.textContent = c.item_count + ' sản phẩm';
      }).catch(function (err) { row.classList.remove('busy'); toast(esc((err && err.description) || 'Không cập nhật được giỏ hàng.'), 'err'); getCart().then(function (c) { var it = c.items[line - 1]; if (it) $('[data-cq-input]', row).value = it.quantity; }); });
    };
    cp.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cq]'), rm = e.target.closest('[data-cq-rm]');
      if (b) { var row = b.closest('[data-line-row]'), inp = $('[data-cq-input]', row); setLine(row, (+inp.value || 0) + +b.dataset.cq); }
      if (rm) { e.preventDefault(); setLine(rm.closest('[data-line-row]'), 0); }
    });
    cp.addEventListener('change', function (e) { if (e.target.matches('[data-cq-input]')) setLine(e.target.closest('[data-line-row]'), +e.target.value || 0); });
    var note = $('#note', cp);
    if (note) note.addEventListener('change', function () { post('/cart/update.js', 'note=' + encodeURIComponent(note.value)).then(function () { toast('Đã lưu ghi chú đơn hàng.'); }).catch(function () {}); });
    cp.addEventListener('submit', function (e) { if (e.submitter && e.submitter.name === 'checkout' && CFG.trackSource) { e.preventDefault(); var s = e.submitter; syncSource(true).then(function () { var h = document.createElement('input'); h.type = 'hidden'; h.name = 'checkout'; h.value = '1'; cp.appendChild(h); cp.submit(); }); s.classList.add('loading'); } });
  }

  /* ================= 12. KHÁC ================= */
  /* lấy giỏ hàng một lần khi tải trang: số trên biểu tượng, thanh miễn phí giao, gợi ý mua kèm */
  if (drawer || cp) getCart().then(function (c) { render(c); if (c.item_count) syncSource(); }).catch(function () {});

  /* chép mã giảm giá */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var code = b.dataset.copy, lab = $('[data-copy-label]', b);
    var done = function () { if (lab) { lab.textContent = 'Đã chép'; setTimeout(function () { lab.textContent = 'Chép mã'; }, 1800); } toast('Đã chép mã <b>' + esc(code) + '</b>, dán ở bước thanh toán.'); };
    if (navigator.clipboard) navigator.clipboard.writeText(code).then(done).catch(done); else done();
  });

  /* nút liên hệ nổi */
  var cf = $('[data-cfloat]');
  if (cf) {
    var cfb = $('.cfloat-btn', cf), cfl = $('#cfloat-list');
    cfb.addEventListener('click', function () { var open = cfl.hidden; cfl.hidden = !open; cf.classList.toggle('on', open); cfb.setAttribute('aria-expanded', open); });
    document.addEventListener('click', function (e) { if (!cf.contains(e.target) && !cfl.hidden) { cfl.hidden = true; cf.classList.remove('on'); cfb.setAttribute('aria-expanded', 'false'); } });
  }

  /* B-02 PRO: bấm chế độ để xem tia nước thay đổi */
  $$('[data-jet]').forEach(function (sec) {
    var lab = $('[data-mode-name]', sec);
    $$('[data-mode]', sec).forEach(function (b, _, all) {
      b.addEventListener('click', function () {
        sec.dataset.m = b.dataset.mode;
        all.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (lab) lab.textContent = b.textContent;
      });
    });
  });
})();

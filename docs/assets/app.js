/* FEBA — scroll-driven 3D product story (Three.js r149)
 * Mô hình tăm nước B-02 PRO dựng hoàn toàn bằng code: thân bình gân sọc trong suốt,
 * sống lưng trắng có nút bấm & đèn báo, nắp có mỏ rót, vòi trong suốt, linh kiện bên trong.
 */
(function () {
  'use strict';
  const T = window.THREE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= DOM: scroll progress & story overlays ================= */
  const story = $('.story'), stage = $('#stage');
  if (!story) return;
  const HAS_SUB = document.body.classList.contains('has-subnav');
  const MODE = story.dataset.mode || 'story';          // 'story' (product page) | 'hero' (home page)
  const panels = $$('.panel', story).map(el => ({ el, a: +el.dataset.a, b: +el.dataset.b }));
  const heroFoot = $('#heroFoot'), rail = $('#rail'), railBtns = $$('#rail button');
  const subLinks = $$('.subnav [data-ch]');
  const stepBtns = $$('[data-at]', story), storyBar = $('[data-story-bar]', story), storyHead = $('.story-head', story);
  const mlEl = $('#ml'), mlBar = $('#mlBar'), modes = $$('#modes .mode');
  let pTarget = 0, pSmooth = 0;

  function storyProgress() {
    const span = story.offsetHeight - innerHeight;
    if (span <= 0) return 0;
    return clamp(-story.getBoundingClientRect().top / span, 0, 1);
  }
  function goTo(p) {
    const top = story.offsetTop + p * Math.max(0, story.offsetHeight - innerHeight);
    if (window.__smoothTo) window.__smoothTo(top); else window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  }
  $$('[data-go]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); goTo(+el.dataset.go); }));
  addEventListener('scroll', () => { pTarget = storyProgress(); }, { passive: true });
  pTarget = pSmooth = storyProgress();

  /* ================= WebGL bootstrap ================= */
  let R;
  try {
    if (!T) throw new Error('three missing');
    R = new T.WebGLRenderer({ canvas: $('#gl'), antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: /[?&]debug/.test(location.search) });
  } catch (err) {
    document.documentElement.classList.add('no-gl');
    const ld = $('#loader'); if (ld) ld.classList.add('done');
    console.warn('[FEBA] WebGL unavailable', err);
    return;
  }
  R.outputEncoding = T.sRGBEncoding;
  R.toneMapping = T.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.0;
  R.shadowMap.enabled = true;
  R.shadowMap.type = T.VSMShadowMap;

  const scene = new T.Scene();
  const BG_LIGHT = new T.Color('#f3f1ec'), BG_DARK = new T.Color('#1f3bff');
  scene.background = BG_LIGHT.clone();
  const cam = new T.PerspectiveCamera(26, 1, 0.1, 120);

  /* ---------- studio environment (for reflections) ---------- */
  (function buildEnv() {
    const env = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(24, 16, 24), new T.MeshBasicMaterial({ color: new T.Color(0.5, 0.52, 0.54), side: T.BackSide }));
    room.position.y = 4; env.add(room);
    const panel = (w, h, pos, k, tint) => {
      const c = new T.Color(tint || 0xffffff).multiplyScalar(k);
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 1.5, 0); env.add(m);
    };
    panel(14, 5, [0, 11, 2], 3.4);            // top softbox
    panel(2.2, 12, [-10, 3, 3], 2.6);         // left strip
    panel(2.2, 12, [10, 3, -1], 2.0);         // right strip
    panel(9, 6, [1, 3, 11], 1.25);            // front fill
    panel(3, 10, [-4, 4, -10], 2.2, 0xe8f3ff); // back rim
    panel(3, 10, [6, 4, -9], 1.4);
    const floor = new T.Mesh(new T.PlaneGeometry(24, 24), new T.MeshBasicMaterial({ color: new T.Color(0.42, 0.43, 0.44) }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1; env.add(floor);
    const pm = new T.PMREMGenerator(R);
    scene.environment = pm.fromScene(env, 0.035).texture;
    pm.dispose();
  })();

  /* ---------- lights (rig follows camera azimuth: consistent studio look) ---------- */
  const rig = new T.Group(); scene.add(rig);
  const hemi = new T.HemisphereLight(0xffffff, 0xc9d1d6, 0.22); scene.add(hemi);
  const key = new T.DirectionalLight(0xffffff, 1.7);
  key.position.set(-3.6, 12, 5.2); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 6, bottom: -3, near: 1, far: 30 });
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; key.shadow.radius = 14; key.shadow.blurSamples = 20;
  const keyT = new T.Object3D(); keyT.position.set(0, 1.6, 0); scene.add(keyT); key.target = keyT;
  const fill = new T.DirectionalLight(0xeef5ff, 0.3); fill.position.set(7, 3, 4);
  const rim = new T.DirectionalLight(0xffffff, 0.75); rim.position.set(3, 6, -8);
  const rim2 = new T.DirectionalLight(0x9fdcff, 0.0); rim2.position.set(-6, 3, -6);
  rig.add(key, fill, rim, rim2);

  /* ---------- floor: soft shadow + contact occlusion ---------- */
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.ShadowMaterial({ opacity: 0.11 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const textTextures = [];
  const canvasTex = (w, h, draw, srgb) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding;
    t.anisotropy = Math.min(8, R.capabilities.getMaxAnisotropy());
    t.userData.draw = () => { g.clearRect(0, 0, w, h); draw(g, w, h); t.needsUpdate = true; };
    textTextures.push(t);
    return t;
  };
  const aoTex = canvasTex(256, 256, (g) => {
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(18,26,32,.55)'); r.addColorStop(0.32, 'rgba(18,26,32,.22)');
    r.addColorStop(0.62, 'rgba(18,26,32,.06)'); r.addColorStop(1, 'rgba(18,26,32,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  });
  const ao = new T.Mesh(new T.PlaneGeometry(2.6, 2.4), new T.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, opacity: 0.85 }));
  ao.rotation.x = -Math.PI / 2; ao.position.y = 0.002; ao.renderOrder = -1; scene.add(ao);

  /* ================= Product geometry ================= */
  const A = 0.66, B = 0.60, NSE = 2.6;          // superellipse half-width (x), half-depth (z), exponent
  const HB = 2.70, HC = 0.58, RB = 0.22, RHO = 0.11, PHI = 0.9, ROUT = 0.006;
  const BX = -0.08, BZ = -0.07;                  // nozzle boss position on cap
  const Rse = th => { const c = Math.abs(Math.cos(th)) / B, s = Math.abs(Math.sin(th)) / A; return Math.pow(Math.pow(c, NSE) + Math.pow(s, NSE), -1 / NSE); };
  const rib = th => 0.019 * (Math.pow(Math.abs(Math.cos(th * 36)), 0.5) - 1);

  // Generic parametric surface: columns over angle, rows over profile samples.
  function surface({ th0, th1, nu, wrap, rows, fn, uv }) {
    const cols = wrap ? nu : nu + 1, pos = [], uvs = [], idx = [];
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < cols; i++) {
      const th = th0 + (th1 - th0) * i / nu, p = fn(th, rows[j]);
      pos.push(p[0], p[1], p[2]);
      const u = uv ? uv(i / nu, j / (rows.length - 1), p, th) : [i / nu, j / (rows.length - 1)];
      uvs.push(u[0], u[1]);
    }
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < nu; i++) {
      const i1 = wrap ? (i + 1) % cols : i + 1;
      const a = j * cols + i, b = j * cols + i1, c = (j + 1) * cols + i1, d = (j + 1) * cols + i;
      idx.push(a, b, c, a, c, d);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  // Body profile (bottom center → rounded corner → wall)
  const BODY = [];
  for (let k = 0; k <= 6; k++) BODY.push({ a: k / 6, b: -RB * k / 6, y: 0, w: 0 });
  for (let i = 1; i <= 12; i++) { const f = i / 12 * Math.PI / 2; BODY.push({ a: 1, b: -RB + RB * Math.sin(f), y: RB - RB * Math.cos(f), w: Math.pow(Math.sin(f), 3) }); }
  for (let i = 1; i <= 12; i++) BODY.push({ a: 1, b: 0, y: RB + (HB - RB) * i / 12, w: 1 });

  const T0 = -(Math.PI - PHI) - 0.03, T1 = (Math.PI - PHI) + 0.03;
  const tankFn = (th, s) => {
    const fade = sstep(0, 0.05, Math.min(th - T0, T1 - th));
    const r = s.a * Rse(th) + s.b + s.w * (rib(th) - 0.035 * (1 - fade));
    return [r * Math.sin(th), s.y, r * Math.cos(th)];
  };
  const spineFn = (th, s, extra) => {
    const d = Math.min(th - (Math.PI - PHI), (Math.PI + PHI) - th);
    const edge = 0.032 * Math.pow(1 - sstep(0, 0.12, d), 2);
    const r = s.a * (Rse(th) + ROUT - edge + (extra || 0)) + s.b;
    return [r * Math.sin(th), s.y, r * Math.cos(th)];
  };

  // Cap profile: bottom disc → bevel → side → rounded top edge → domed top
  const CAP = [];
  for (let k = 0; k <= 5; k++) CAP.push({ a: k / 5, b: -0.015 * k / 5, y: HB + 0.003 });
  for (let i = 1; i <= 4; i++) { const f = i / 4 * Math.PI / 2; CAP.push({ a: 1, b: -0.015 + 0.015 * Math.sin(f), y: HB + 0.018 - 0.015 * Math.cos(f) }); }
  for (let i = 1; i <= 10; i++) CAP.push({ a: 1, b: 0, y: HB + 0.018 + (HC - RHO - 0.018) * i / 10 });
  for (let i = 1; i <= 12; i++) { const f = i / 12 * Math.PI / 2; CAP.push({ a: 1, b: -RHO + RHO * Math.cos(f), y: HB + HC - RHO + RHO * Math.sin(f) }); }
  for (let i = 1; i <= 18; i++) { const q = i / 18; CAP.push({ a: 1 - q, b: -RHO * (1 - q), y: HB + HC, q }); }

  const domeAt = (x, z, q) => {
    const sq = q * q * (3 - 2 * q), g = Math.exp(-((x - BX) ** 2 + (z - BZ) ** 2) / 0.07);
    return 0.05 * sq + 0.135 * g * sq;
  };
  const capFn = (th, s, extra) => {
    const Rt = Rse(th) + ROUT;
    let r = s.a * (Rt + (extra || 0)) + s.b;
    let x = r * Math.sin(th), z = r * Math.cos(th), y = s.y;
    if (s.q !== undefined) y += domeAt(x, z, s.q);
    // spout / lip toward +x
    const w = Math.pow(Math.max(0, Math.sin(th)), 6);
    const sl = sstep(HB + 0.04, HB + HC, s.y);
    const k = w * sl;
    x *= 1 + 0.2 * k; z *= 1 + 0.04 * k;
    y += 0.07 * k * Math.min(1, r / Rt);
    return [x, y, z];
  };
  const capTopY = (x, z) => {
    const th = Math.atan2(x, z), r = Math.hypot(x, z), q = clamp(1 - r / (Rse(th) + ROUT - RHO), 0, 1);
    return HB + HC + domeAt(x, z, q);
  };

  /* ---------- textures ---------- */
  const tankTransTex = canvasTex(4, 512, (g) => {     // transmission factor along height (red channel)
    const gr = g.createLinearGradient(0, 512, 0, 0);
    gr.addColorStop(0, '#000'); gr.addColorStop(0.07, '#0d0d0d'); gr.addColorStop(0.22, '#5a5a5a');
    gr.addColorStop(0.45, '#c8c8c8'); gr.addColorStop(0.7, '#ededed'); gr.addColorStop(1, '#f4f4f4');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  });
  tankTransTex.anisotropy = 1;

  /* ---------- materials ---------- */
  const mats = [];
  const M = (Cls, o, envK) => { const m = new Cls(o); m.userData.env = envK == null ? (o.envMapIntensity || 1) : envK; mats.push(m); return m; };
  const mWhite = M(T.MeshPhysicalMaterial, { color: 0xf4f5f5, roughness: 0.42, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.3, envMapIntensity: 0.8 });
  const mWhiteDS = mWhite.clone(); mWhiteDS.side = T.DoubleSide; mWhiteDS.userData.env = 0.95; mats.push(mWhiteDS);
  const mTank = M(T.MeshPhysicalMaterial, {
    color: 0xfbfcfc, roughness: 0.13, metalness: 0, transmission: 1, transmissionMap: tankTransTex,
    thickness: 0.32, ior: 1.46, specularIntensity: 0.8, clearcoat: 0.45, clearcoatRoughness: 0.1,
    attenuationColor: new T.Color(0xf1f6f8), attenuationDistance: 3, envMapIntensity: 1.15
  });
  const mInner = M(T.MeshStandardMaterial, { color: 0xd9e0e4, roughness: 0.65, side: T.DoubleSide, envMapIntensity: 0.6 });
  const mWater = M(T.MeshPhysicalMaterial, { color: 0x8ccbe6, roughness: 0.12, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.05, envMapIntensity: 1.2 });
  const mSilicone = M(T.MeshStandardMaterial, { color: 0xe4eaee, roughness: 0.48, envMapIntensity: 0.8 });
  const mGasket = M(T.MeshStandardMaterial, { color: 0xb8c4ca, roughness: 0.62, envMapIntensity: 0.6 });
  const mDark = M(T.MeshStandardMaterial, { color: 0x1d2327, roughness: 0.55, envMapIntensity: 0.5 });
  const mMetal = M(T.MeshStandardMaterial, { color: 0xd0d5d9, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 });
  const mCopper = M(T.MeshStandardMaterial, { color: 0xc98552, metalness: 1, roughness: 0.34, envMapIntensity: 1.1 });
  const mPlastic = M(T.MeshPhysicalMaterial, { color: 0xdfe4e7, roughness: 0.45, clearcoat: 0.2, envMapIntensity: 0.9 });
  const mClear = M(T.MeshPhysicalMaterial, {
    color: 0xf7fcff, roughness: 0.06, metalness: 0, transmission: 1, thickness: 0.08, ior: 1.49,
    specularIntensity: 1, attenuationColor: new T.Color(0xa9c8d4), attenuationDistance: 0.12, envMapIntensity: 1.8
  });
  const mFrost = M(T.MeshPhysicalMaterial, {
    color: 0xf8fbfc, roughness: 0.34, metalness: 0, transmission: 0.85, thickness: 0.12, ior: 1.49,
    attenuationColor: new T.Color(0xd9e7ec), attenuationDistance: 0.5, envMapIntensity: 1.2
  });
  const mBore = M(T.MeshStandardMaterial, { color: 0x9db7c2, roughness: 0.2, envMapIntensity: 0.9 });

  const product = new T.Group(); scene.add(product);
  const part = (name) => { const g = new T.Group(); g.name = name; product.add(g); return g; };
  const add = (grp, geo, mat, cast) => { const m = new T.Mesh(geo, mat); m.castShadow = cast !== false; grp.add(m); return m; };

  /* ---------- tank (translucent ribbed front) ---------- */
  const gTank = part('tank');
  const tankGeo = surface({ th0: T0, th1: T1, nu: 560, rows: BODY, fn: tankFn, uv: (u, v, p) => [u, p[1] / HB] });
  add(gTank, tankGeo, mTank);

  // water (opaque inner volume — seen refracted & frosted through the tank)
  const zPlane = -Rse(Math.PI - PHI) * Math.cos(PHI);
  const waterShape = new T.Shape();
  for (let i = 0; i <= 120; i++) {
    const th = -(Math.PI - PHI) + 2 * (Math.PI - PHI) * i / 120;
    const r = Rse(th) * 0.95 - 0.02;
    let x = r * Math.sin(th), z = Math.max(r * Math.cos(th), zPlane + 0.03);
    i ? waterShape.lineTo(x, -z) : waterShape.moveTo(x, -z);
  }
  const waterGeo = new T.ExtrudeGeometry(waterShape, { depth: 1, bevelEnabled: false, curveSegments: 4 });
  waterGeo.rotateX(-Math.PI / 2);
  const water = add(gTank, waterGeo, mWater, false);
  water.position.y = 0.14;
  const WATER_MAX = 2.38 - 0.14;

  // inner rear wall of the tank cavity (spine face)
  const innerRows = BODY.slice(1);
  const innerGeo = (() => {
    const pos = [], idx = [], n = 10;
    innerRows.forEach((s, j) => {
      const a = spineFn(Math.PI - PHI + 0.015, s, -0.03), b = spineFn(Math.PI + PHI - 0.015, s, -0.03);
      for (let i = 0; i <= n; i++) { const t = i / n; pos.push(lerp(a[0], b[0], t), s.y, lerp(a[2], b[2], t) + 0.01); }
    });
    for (let j = 0; j < innerRows.length - 1; j++) for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 2, d = a + n + 1; idx.push(a, b, c, a, c, d);
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  add(gTank, innerGeo, mInner, false);

  // tank top ring (visible when the cap lifts)
  const ringShape = new T.Shape(), ringHole = new T.Path();
  for (let i = 0; i <= 120; i++) {
    const th = -(Math.PI - PHI) + 2 * (Math.PI - PHI) * i / 120;
    const r = Rse(th), x = r * Math.sin(th), z = Math.max(r * Math.cos(th), zPlane);
    i ? ringShape.lineTo(x, -z) : ringShape.moveTo(x, -z);
    const r2 = r - 0.06, x2 = r2 * Math.sin(th), z2 = Math.max(r2 * Math.cos(th), zPlane + 0.06);
    i ? ringHole.lineTo(x2, -z2) : ringHole.moveTo(x2, -z2);
  }
  ringShape.holes.push(ringHole);
  const ringGeo = new T.ExtrudeGeometry(ringShape, { depth: 0.03, bevelEnabled: false });
  ringGeo.rotateX(-Math.PI / 2);
  const ring = add(gTank, ringGeo, mWhite, false); ring.position.y = HB - 0.03;

  // suction hose + weighted filter
  const hoseCurve = new T.CatmullRomCurve3([
    new T.Vector3(0.05, HB - 0.02, -0.24), new T.Vector3(0.07, 2.0, -0.22), new T.Vector3(0.12, 1.05, -0.12),
    new T.Vector3(0.2, 0.42, 0.02), new T.Vector3(0.24, 0.24, 0.1)
  ]);
  add(gTank, new T.TubeGeometry(hoseCurve, 80, 0.026, 16, false), mSilicone, false);
  const filt = add(gTank, new T.CylinderGeometry(0.055, 0.06, 0.13, 32), mMetal, false);
  filt.position.set(0.245, 0.2, 0.11); filt.rotation.z = -0.2;

  /* ---------- measurement marks decal ---------- */
  const marksTex = canvasTex(256, 1024, (g, w, h) => {
    const y0 = 1.05, y1 = 2.6, Y = y => (1 - (y - y0) / (y1 - y0)) * h;
    g.strokeStyle = 'rgba(92,104,112,.92)'; g.fillStyle = 'rgba(92,104,112,.92)';
    g.lineWidth = 3; g.font = '500 30px "Open Sans", sans-serif'; g.textBaseline = 'middle';
    [[2.38, '200'], [2.15, '180'], [1.8, '150'], [1.25, '100']].forEach(([y, s]) => {
      g.beginPath(); g.moveTo(54, Y(y)); g.lineTo(104, Y(y)); g.stroke(); g.fillText(s, 116, Y(y));
    });
    g.lineWidth = 2; g.globalAlpha = 0.6;
    for (let y = 1.25; y <= 2.38; y += (2.38 - 1.25) / 10) { g.beginPath(); g.moveTo(54, Y(y)); g.lineTo(78, Y(y)); g.stroke(); }
    g.globalAlpha = 1; g.font = '600 22px "Open Sans", sans-serif'; g.fillText('ml', 116, Y(2.38) - 34);
  }, true);
  const MK0 = -0.5, MK1 = -0.05, MY0 = 1.05, MY1 = 2.6;
  const marksRows = []; for (let i = 0; i <= 24; i++) marksRows.push({ a: 1, b: 0.0025, y: MY0 + (MY1 - MY0) * i / 24, w: 1 });
  const marksGeo = surface({ th0: MK0, th1: MK1, nu: 120, rows: marksRows, fn: (th, s) => { const r = Rse(th) + 0.003; return [r * Math.sin(th), s.y, r * Math.cos(th)]; } });
  const mMarks = new T.MeshStandardMaterial({ map: marksTex, transparent: true, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const marks = add(gTank, marksGeo, mMarks, false); marks.renderOrder = 5;

  /* ---------- spine (white back shell with controls) ---------- */
  const gSpine = part('spine');
  add(gSpine, surface({ th0: Math.PI - PHI, th1: Math.PI + PHI, nu: 180, rows: BODY, fn: spineFn }), mWhite);
  // spine top plate
  const spTop = new T.Shape();
  for (let i = 0; i <= 60; i++) {
    const th = Math.PI - PHI + 2 * PHI * i / 60, r = Rse(th) + ROUT - 0.002;
    const x = r * Math.sin(th), z = r * Math.cos(th);
    i ? spTop.lineTo(x, -z) : spTop.moveTo(x, -z);
  }
  const spTopGeo = new T.ShapeGeometry(spTop, 4); spTopGeo.rotateX(-Math.PI / 2);
  const spTopM = add(gSpine, spTopGeo, mWhiteDS, false); spTopM.position.y = HB - 0.002;

  const zBack = -(Rse(Math.PI) + ROUT);
  function roundedRect(w, h, r) {
    const s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function backPlate(w, h, depth, bevel, mat, y, zOff) {
    const g = new T.ExtrudeGeometry(roundedRect(w, h, Math.min(w, h) / 2 - 0.001), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
    g.rotateY(Math.PI);
    const m = add(gSpine, g, mat, false); m.position.set(0, y, zBack + 0.008 + (zOff || 0)); return m;
  }
  const mGroove = M(T.MeshStandardMaterial, { color: 0xc5cdd2, roughness: 0.5, envMapIntensity: 0.6 });
  const mStrip = M(T.MeshPhysicalMaterial, { color: 0xf3f5f6, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.1 });
  backPlate(0.232, 1.06, 0.004, 0.004, mGroove, 1.82, 0.002);
  const strip = backPlate(0.214, 1.04, 0.008, 0.005, mStrip, 1.82, 0);
  const zStrip = zBack + 0.008 - 0.008 - 0.005; // front face of strip

  const iconTex = (draw) => canvasTex(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = '#7b868d'; g.fillStyle = '#7b868d'; g.lineWidth = 12; g.lineCap = 'round'; draw(g); }, true);
  const powerTex = iconTex(g => { g.beginPath(); g.arc(128, 136, 62, -Math.PI / 2 + 0.75, -Math.PI / 2 - 0.75 + Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(128, 58); g.lineTo(128, 132); g.stroke(); });
  const modeTex = iconTex(g => { g.font = '600 64px "Open Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MODE', 128, 132); });
  const btnProfile = [[0.062, -0.012], [0.061, 0.002], [0.057, 0.009], [0.048, 0.0125], [0, 0.013]].map(p => new T.Vector2(p[0], p[1]));
  function button(y, tex, grp, z) {
    const g = new T.LatheGeometry(btnProfile, 64); g.rotateX(-Math.PI / 2);
    const b = add(grp || gSpine, g, mStrip, false); b.position.set(0, y, z == null ? zStrip : z);
    const ic = new T.Mesh(new T.CircleGeometry(0.046, 48), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    ic.rotation.y = Math.PI; ic.position.set(0, y, (z == null ? zStrip : z) - 0.0135); (grp || gSpine).add(ic);
    return b;
  }
  const btnPower = button(2.16, powerTex);
  button(1.9, modeTex);
  const powerRing = new T.Mesh(new T.TorusGeometry(0.066, 0.0035, 8, 64), new T.MeshStandardMaterial({ color: 0x9fdcff, emissive: 0x3cc3ff, emissiveIntensity: 0, roughness: 0.4 }));
  powerRing.position.set(0, 2.16, zStrip - 0.002); gSpine.add(powerRing);
  const glowTex = canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.18, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  const leds = [1.66, 1.6, 1.54].map(y => {
    const m = new T.Mesh(new T.CylinderGeometry(0.0135, 0.0135, 0.006, 24).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: 0x3a4248, emissive: 0x1e9bff, emissiveIntensity: 0, roughness: 0.3 }));
    m.position.set(0, y, zStrip - 0.003); gSpine.add(m);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: 0x1f8fff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
    glow.scale.set(0.065, 0.065, 1); glow.position.set(0, y, zStrip - 0.012); gSpine.add(glow); m.userData.glow = glow;
    return m;
  });
  const ledNumTex = canvasTex(64, 256, (g) => { g.fillStyle = '#8b959b'; g.font = '600 26px "Open Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; ['1', '2', '3'].forEach((s, i) => g.fillText(s, 32, 64 + i * 64)); }, true);
  const ledNums = new T.Mesh(new T.PlaneGeometry(0.06, 0.24), new T.MeshBasicMaterial({ map: ledNumTex, transparent: true, depthWrite: false }));
  ledNums.rotation.y = Math.PI; ledNums.position.set(0.045, 1.6, zStrip - 0.001); gSpine.add(ledNums);
  // USB-C rubber cover
  backPlate(0.13, 0.27, 0.003, 0.003, mGroove, 0.45, 0.002);
  backPlate(0.116, 0.255, 0.006, 0.004, mWhite, 0.45, 0);
  const usbTex = iconTex(g => {
    g.lineWidth = 10; g.beginPath(); g.moveTo(128, 210); g.lineTo(128, 60); g.stroke();
    g.beginPath(); g.moveTo(128, 40); g.lineTo(108, 72); g.lineTo(148, 72); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(128, 150); g.lineTo(86, 118); g.lineTo(86, 96); g.stroke();
    g.beginPath(); g.moveTo(128, 170); g.lineTo(170, 138); g.lineTo(170, 118); g.stroke();
    g.fillRect(74, 82, 24, 24); g.beginPath(); g.arc(170, 108, 13, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(128, 214, 16, 0, Math.PI * 2); g.fill();
  });
  const usbIcon = new T.Mesh(new T.PlaneGeometry(0.06, 0.06), new T.MeshBasicMaterial({ map: usbTex, transparent: true, depthWrite: false, opacity: 0.8 }));
  usbIcon.rotation.y = Math.PI; usbIcon.position.set(0, 0.46, zBack + 0.008 - 0.006 - 0.004 - 0.001); gSpine.add(usbIcon);

  /* ================= Detailed internal components (exploded view) =================
   * Pump module: simplified housing.
   * → valve head with inlet/outlet barbs. Electronics: main PCB with SMD parts, keypad membrane,
   * USB-C charging board, Li-ion cell with nickel strips and JST leads. Everything is built from
   * primitives / lathes / extruded shapes so it stays crisp at close range.
   */
  const mBrass = M(T.MeshStandardMaterial, { color: 0xd6ab55, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
  const mSteel = M(T.MeshStandardMaterial, { color: 0xc7ccd1, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 });
  const brushedTex = canvasTex(512, 64, (g, w, h) => {
    g.fillStyle = '#8a8a8a'; g.fillRect(0, 0, w, h);
    let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) { const y = rnd() * h, c = 100 + rnd() * 90 | 0; g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(0, y, w, 0.6 + rnd()); }
  });
  brushedTex.wrapS = brushedTex.wrapT = T.RepeatWrapping;
  const mCan = M(T.MeshStandardMaterial, { color: 0xd3d7db, metalness: 1, roughness: 0.32, roughnessMap: brushedTex, envMapIntensity: 1.25 });
  const mBlack = M(T.MeshStandardMaterial, { color: 0x15191c, roughness: 0.48, envMapIntensity: 0.7 });
  const mPom = M(T.MeshPhysicalMaterial, { color: 0xf2f0ea, roughness: 0.38, clearcoat: 0.25, envMapIntensity: 0.9 });
  const mGrey = M(T.MeshPhysicalMaterial, { color: 0xc9cfd3, roughness: 0.42, clearcoat: 0.15, envMapIntensity: 0.9 });
  const mHousing = M(T.MeshPhysicalMaterial, { color: 0x0d1114, roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 1.0 });
  const mClearPart = M(T.MeshPhysicalMaterial, { color: 0xf7fbfd, roughness: 0.05, transmission: 1, thickness: 0.06, ior: 1.49, attenuationColor: new T.Color(0xcfe3ea), attenuationDistance: 0.4, specularIntensity: 1, envMapIntensity: 1.5 });
  const mSil = M(T.MeshPhysicalMaterial, { color: 0xdfe8ec, roughness: 0.55, transmission: 0.55, thickness: 0.05, ior: 1.42, envMapIntensity: 0.9 });
  const mRubber = M(T.MeshStandardMaterial, { color: 0x23292d, roughness: 0.75, envMapIntensity: 0.5 });
  const mRed = M(T.MeshPhysicalMaterial, { color: 0xc4352b, roughness: 0.4, clearcoat: 0.6, envMapIntensity: 0.9 });
  const mWire = M(T.MeshPhysicalMaterial, { color: 0x1b1f22, roughness: 0.4, clearcoat: 0.6, envMapIntensity: 0.9 });
  const mNickel = M(T.MeshStandardMaterial, { color: 0xbfc4c7, metalness: 1, roughness: 0.38, envMapIntensity: 1.1 });
  const mGold = M(T.MeshStandardMaterial, { color: 0xd9b45a, metalness: 1, roughness: 0.25, envMapIntensity: 1.2 });
  const mCeramic = M(T.MeshStandardMaterial, { color: 0xb08a5f, roughness: 0.5 });
  const mJst = M(T.MeshStandardMaterial, { color: 0xf1ede2, roughness: 0.55 });
  const mLedPkg = M(T.MeshStandardMaterial, { color: 0xf4f4f0, roughness: 0.4 });

  const V = (x, y, z) => new T.Vector3(x, y, z);
  const mesh = (grp, geo, mat, x, y, z, rx, ry, rz) => {
    const m = new T.Mesh(geo, mat); m.castShadow = true; m.position.set(x || 0, y || 0, z || 0);
    m.rotation.set(rx || 0, ry || 0, rz || 0); grp.add(m); return m;
  };
  const cyl = (r1, r2, h, seg) => new T.CylinderGeometry(r1, r2, h, seg || 40);
  const lathe = (pts, seg) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg || 48);
  const tube = (pts, r, seg) => new T.TubeGeometry(new T.CatmullRomCurve3(pts), seg || 60, r, 10, false);
  function rbox(w, h, d, r) {                       // rounded box centred at origin
    const g = new T.ExtrudeGeometry(roundedRect(w - 2 * r, h - 2 * r, Math.min(w, h) * 0.18), { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 10 });
    g.translate(0, 0, -(d - 2 * r) / 2); return g;
  }
  function gearGeo(n, ro, rr, t, hole, lighten) {   // spur gear, axis along X
    const s = new T.Shape();
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, da = Math.PI * 2 / n;
      [[rr, 0], [ro, 0.2], [ro, 0.46], [rr, 0.66]].forEach(([r, f], k) => {
        const x = Math.cos(a + da * f) * r, y = Math.sin(a + da * f) * r;
        i === 0 && k === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
      });
    }
    s.closePath();
    if (hole) { const p = new T.Path(); p.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(p); }
    if (lighten) for (let k = 0; k < 4; k++) { const p = new T.Path(), a = k * Math.PI / 2 + Math.PI / 4; p.absarc(Math.cos(a) * rr * 0.55, Math.sin(a) * rr * 0.55, rr * 0.2, 0, Math.PI * 2, true); s.holes.push(p); }
    const g = new T.ExtrudeGeometry(s, { depth: t, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.0015, bevelSegments: 1, curveSegments: 16 });
    g.translate(0, 0, -t / 2); g.rotateY(Math.PI / 2); return g;
  }
  function screw(grp, x, y, z, axis) {               // pan-head Phillips screw, head facing +axis
    const g = new T.Group(); grp.add(g); g.position.set(x, y, z);
    mesh(g, lathe([[0, 0], [0.019, 0], [0.02, 0.004], [0.017, 0.009], [0.009, 0.0115], [0, 0.0115]], 28), mSteel);
    mesh(g, new T.BoxGeometry(0.022, 0.0035, 0.004), mBlack, 0, 0.0105, 0);
    mesh(g, new T.BoxGeometry(0.004, 0.0035, 0.022), mBlack, 0, 0.0105, 0);
    if (axis === 'x') g.rotation.z = -Math.PI / 2; else if (axis === '-z') g.rotation.x = -Math.PI / 2; else if (axis === '-x') g.rotation.z = Math.PI / 2;
    return g;
  }
  function jst(grp, x, y, z, ry) {                  // white 2-pin connector housing
    const g = new T.Group(); grp.add(g); g.position.set(x, y, z); g.rotation.y = ry || 0;
    mesh(g, rbox(0.05, 0.03, 0.035, 0.003), mJst);
    mesh(g, new T.BoxGeometry(0.04, 0.012, 0.004), mJst, 0, 0.018, 0.012);
    return g;
  }

  /* ---------- PUMP MODULE (simplified: one housing, clear cylinder, outlet tube) ---------- */
  const gPump = part('pump');
  const YC = HB + 0.15, ZC = -0.05, XG = 0.165;
  mesh(gPump, rbox(0.62, 0.26, 0.44, 0.03), mHousing, -0.05, HB + 0.15, 0);
  mesh(gPump, lathe([[0.042, 0], [0.052, 0], [0.052, 0.16], [0.042, 0.16]], 40), mClearPart, XG + 0.03, HB + 0.28, ZC);
  mesh(gPump, rbox(0.15, 0.06, 0.15, 0.012), mHousing, XG + 0.03, HB + 0.47, ZC, Math.PI / 2, 0, 0);
  const outTube = mesh(gPump, tube([V(XG + 0.03, HB + 0.5, ZC), V(XG + 0.01, HB + 0.56, ZC - 0.01), V(BX + 0.04, HB + 0.63, BZ), V(BX, HB + 0.66, BZ)], 0.017), mSil);
  outTube.castShadow = false;

  /* ---------- ELECTRONICS ---------- */
  const gPcb = part('pcb'), gBat = part('battery'), gKey = part('keypad'), gUsb = part('usb');
  const PZ = -0.545, PCY = 1.86, PW = 0.32, PH = 1.02;
  const pcbTex = canvasTex(512, 1632, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0f4a39'); gr.addColorStop(1, '#0b3a2d');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    let s = 21; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    // copper traces under solder mask (45° routing)
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = `rgba(70,150,110,${0.35 + rnd() * 0.3})`; g.lineWidth = 2 + (rnd() < 0.2 ? 5 : 0);
      let x = 30 + rnd() * (w - 60), y = 30 + rnd() * (h - 60); g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { const d = 30 + rnd() * 140, m = rnd(); if (m < 0.4) y += d * (rnd() < 0.5 ? -1 : 1); else if (m < 0.7) x += d * (rnd() < 0.5 ? -1 : 1) * 0.6; else { x += d * 0.5 * (rnd() < 0.5 ? -1 : 1); y += d * 0.5; } x = Math.max(20, Math.min(w - 20, x)); y = Math.max(20, Math.min(h - 20, y)); g.lineTo(x, y); }
      g.stroke();
    }
    // vias
    for (let i = 0; i < 140; i++) { const x = 20 + rnd() * (w - 40), y = 20 + rnd() * (h - 40); g.fillStyle = '#c9a54e'; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill(); g.fillStyle = '#0a2a21'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
    // mounting holes
    [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]].forEach(([x, y]) => { g.fillStyle = '#d4b05a'; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); g.fillStyle = '#05140f'; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); });
    // silkscreen
    g.fillStyle = 'rgba(255,255,255,.82)'; g.font = '600 26px "Open Sans", sans-serif'; g.textAlign = 'center';
    g.fillText('MAIN BOARD', w / 2, h - 90); g.font = '500 20px "Open Sans", sans-serif'; g.fillText('B-02  REV 1.2', w / 2, h - 60);
    g.font = '500 16px "Open Sans", sans-serif';
    [['SW1', 330], ['SW2', 560], ['D1 D2 D3', 760], ['U1', 1080], ['C4', 1290], ['Q1', 1220]].forEach(([t, y]) => g.fillText(t, w / 2 + 120, y));
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
    g.strokeRect(w / 2 - 80, 240, 160, 160); g.strokeRect(w / 2 - 80, 470, 160, 160); g.strokeRect(w / 2 - 70, 1010, 140, 140);
    g.strokeRect(14, 14, w - 28, h - 28);
  }, true);
  const mPcbTop = M(T.MeshStandardMaterial, { map: pcbTex, roughness: 0.38, metalness: 0.05, envMapIntensity: 1 });
  const mFr4 = M(T.MeshStandardMaterial, { color: 0x0d3a2c, roughness: 0.6 });
  const pcb = add(gPcb, new T.BoxGeometry(PW, PH, 0.016), [mFr4, mFr4, mFr4, mFr4, mFr4, mPcbTop]);
  pcb.position.set(0, PCY, PZ);                                // textured (−z) face is the component side
  const FZ = PZ - 0.008;                                       // component-side surface
  const smd = (w, h, d, x, y, mat) => mesh(gPcb, new T.BoxGeometry(w, h, d), mat || mBlack, x, y, FZ - d / 2);
  // tactile switches under POWER / MODE
  [2.16, 1.9].forEach(y => {
    smd(0.07, 0.07, 0.022, 0, y, mSteel);
    mesh(gPcb, cyl(0.022, 0.022, 0.012, 28), mBlack, 0, y, FZ - 0.028, Math.PI / 2, 0, 0);
    [[-0.04, -0.028], [0.04, -0.028], [-0.04, 0.028], [0.04, 0.028]].forEach(([dx, dy]) => smd(0.012, 0.008, 0.004, dx, y + dy, mSteel));
  });
  // indicator LEDs
  [1.66, 1.6, 1.54].forEach(y => { smd(0.03, 0.018, 0.01, 0, y, mLedPkg); mesh(gPcb, new T.SphereGeometry(0.008, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mClearPart, 0, y, FZ - 0.01, -Math.PI / 2, 0, 0); });
  // MCU (QFN) with pins
  smd(0.1, 0.1, 0.014, 0, 1.44);
  for (let i = 0; i < 8; i++) { const o = -0.04 + i * 0.0115; smd(0.006, 0.01, 0.003, o, 1.44 + 0.053, mNickel); smd(0.006, 0.01, 0.003, o, 1.44 - 0.053, mNickel); smd(0.01, 0.006, 0.003, 0.053, 1.44 + o, mNickel); smd(0.01, 0.006, 0.003, -0.053, 1.44 + o, mNickel); }
  mesh(gPcb, cyl(0.006, 0.006, 0.001, 12), mDark, -0.032, 1.472, FZ - 0.0145, Math.PI / 2, 0, 0);
  // passives
  const passive = (x, y, rot, body) => { const g = new T.Group(); gPcb.add(g); g.position.set(x, y, FZ - 0.006); g.rotation.z = rot || 0; mesh(g, new T.BoxGeometry(0.028, 0.014, 0.011), body || mCeramic); mesh(g, new T.BoxGeometry(0.006, 0.0145, 0.0115), mNickel, 0.012, 0, 0); mesh(g, new T.BoxGeometry(0.006, 0.0145, 0.0115), mNickel, -0.012, 0, 0); };
  [[-0.1, 2.3, 0], [0.1, 2.3, 0], [-0.1, 2.02, 1.57], [0.1, 2.02, 1.57], [-0.1, 1.75, 0], [0.1, 1.75, 0], [-0.1, 1.55, 1.57], [0.1, 1.55, 1.57], [-0.11, 1.36, 0], [0.11, 1.36, 0]].forEach(([x, y, r], i) => passive(x, y, r, i % 3 === 0 ? mBlack : mCeramic));
  // MOSFET (SOT-23), inductor, electrolytic capacitor
  smd(0.03, 0.022, 0.01, 0.1, 1.67); [-0.008, 0.008].forEach(d => smd(0.004, 0.01, 0.003, 0.1 + d, 1.67 - 0.015, mNickel)); smd(0.004, 0.01, 0.003, 0.1, 1.67 + 0.015, mNickel);
  mesh(gPcb, rbox(0.05, 0.05, 0.026, 0.006), mBlack, -0.095, 1.68, FZ - 0.013);
  const ecap = new T.Group(); gPcb.add(ecap); ecap.position.set(0.085, 1.475, FZ); ecap.rotation.x = -Math.PI / 2;
  mesh(ecap, cyl(0.026, 0.026, 0.05, 32), mBlack, 0, 0.03, 0); mesh(ecap, cyl(0.024, 0.026, 0.006, 32), mSteel, 0, 0.056, 0);
  mesh(ecap, new T.BoxGeometry(0.03, 0.002, 0.003), mDark, 0, 0.0595, 0); mesh(ecap, new T.BoxGeometry(0.003, 0.002, 0.03), mDark, 0, 0.0595, 0);
  // board-to-wire pads + leads at the bottom edge
  [-0.05, 0.05].forEach((x, i) => { smd(0.03, 0.02, 0.003, x, 1.38, mGold); const w = mesh(gPcb, tube([V(x, 1.38, FZ - 0.006), V(x, 1.34, FZ - 0.02), V(x * 1.4, 1.3, FZ - 0.03)], 0.007, 20), i ? mWire : mRed); w.castShadow = false; });
  [[-0.12, 2.33], [0.12, 2.33], [-0.12, 1.39], [0.12, 1.39]].forEach(([x, y]) => screw(gPcb, x, y, FZ, '-z'));

  // silicone keypad membrane with light pipes (sits between PCB and back shell)
  const KZ = -0.575;
  mesh(gKey, rbox(0.2, 1.02, 0.012, 0.005), mSil, 0, 1.82, KZ);
  [2.16, 1.9].forEach(y => { mesh(gKey, cyl(0.05, 0.054, 0.02, 40), mSil, 0, y, KZ - 0.014, Math.PI / 2, 0, 0); mesh(gKey, cyl(0.02, 0.02, 0.012, 24), mBlack, 0, y, KZ + 0.01, Math.PI / 2, 0, 0); });
  [1.66, 1.6, 1.54].forEach(y => mesh(gKey, cyl(0.011, 0.011, 0.03, 20), mClearPart, 0, y, KZ - 0.004, Math.PI / 2, 0, 0));

  // USB-C charging board
  const UZ = -0.56, UY = 0.44;
  mesh(gUsb, new T.BoxGeometry(0.22, 0.2, 0.014), mFr4, 0, UY, UZ);
  mesh(gUsb, new T.BoxGeometry(0.2, 0.18, 0.001), mPcbTop, 0, UY, UZ - 0.0075);
  const usbShell = new T.Shape(); usbShell.absarc(-0.022, 0, 0.012, Math.PI / 2, Math.PI * 1.5, false); usbShell.absarc(0.022, 0, 0.012, -Math.PI / 2, Math.PI / 2, false);
  const usbHole = new T.Path(); usbHole.absarc(0.022, 0, 0.009, Math.PI / 2, -Math.PI / 2, true); usbHole.absarc(-0.022, 0, 0.009, -Math.PI / 2, -Math.PI * 1.5, true); usbShell.holes.push(usbHole);
  const usbGeo = new T.ExtrudeGeometry(usbShell, { depth: 0.07, bevelEnabled: false, curveSegments: 16 }); usbGeo.translate(0, 0, -0.035);
  mesh(gUsb, usbGeo, mSteel, 0, UY - 0.02, UZ - 0.03, Math.PI / 2, 0, 0);
  mesh(gUsb, new T.BoxGeometry(0.03, 0.006, 0.06), mBlack, 0, UY - 0.02, UZ - 0.03);
  mesh(gUsb, rbox(0.04, 0.04, 0.012, 0.004), mBlack, -0.06, UY + 0.05, UZ - 0.013);
  passive(0.06, UY + 0.06); passive(0.06, UY + 0.03);
  [-0.04, 0.04].forEach((x, i) => { const w = mesh(gUsb, tube([V(x, UY + 0.09, UZ - 0.01), V(x, UY + 0.14, UZ - 0.03), V(x * 1.5, UY + 0.18, UZ - 0.04)], 0.007, 20), i ? mWire : mRed); w.castShadow = false; });

  // Li-ion cell: heat-shrink wrap, positive cap, insulator ring, nickel strips, leads + JST plug
  const BZ0 = -0.49, BY0 = 0.86, BH = 0.66, BR = 0.085;
  const mBat = M(T.MeshPhysicalMaterial, { map: null, color: 0x0b6fa4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 });
  const batTex = canvasTex(1024, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d6898'); gr.addColorStop(1, '#0a527a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save(); g.translate(w * 0.5, h * 0.5); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,.95)'; g.font = '700 64px "Open Sans", sans-serif'; g.fillText('1500mAh', 0, -10);
    g.font = '600 30px "Open Sans", sans-serif'; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('Li-ion  3.7V', 0, 50);
    g.font = '500 20px "Open Sans", sans-serif'; g.fillStyle = 'rgba(255,255,255,.55)'; g.fillText('RECHARGEABLE', 0, -70); g.restore();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0, 36, w, 4); g.fillRect(0, h - 40, w, 4);
  }, true);
  mBat.map = batTex; mBat.color.set(0xffffff);
  mesh(gBat, lathe([[0.072, -BH / 2 - 0.004], [BR - 0.006, -BH / 2], [BR, -BH / 2 + 0.008], [BR, BH / 2 - 0.008], [BR - 0.006, BH / 2], [0.07, BH / 2 + 0.004]], 72), mBat, 0, BY0, BZ0, 0, Math.PI, 0);
  mesh(gBat, lathe([[0, BH / 2], [0.072, BH / 2], [0.072, BH / 2 + 0.003], [0, BH / 2 + 0.003]], 48), mJst, 0, BY0, BZ0);          // insulator ring
  mesh(gBat, lathe([[0, 0], [0.03, 0], [0.032, 0.006], [0.028, 0.014], [0, 0.015]], 40), mSteel, 0, BY0 + BH / 2 + 0.003, BZ0);
  mesh(gBat, cyl(0.072, 0.072, 0.004, 48), mSteel, 0, BY0 - BH / 2 - 0.004, BZ0);
  const nickelStrip = (y, len, dir) => {
    mesh(gBat, new T.BoxGeometry(0.03, 0.003, len), mNickel, 0, y, BZ0 + dir * len / 2);
    [-0.008, 0.008].forEach(dx => mesh(gBat, cyl(0.004, 0.004, 0.002, 10), mSteel, dx, y + 0.002 * Math.sign(y - BY0), BZ0));
  };
  nickelStrip(BY0 + BH / 2 + 0.02, 0.09, -1); nickelStrip(BY0 - BH / 2 - 0.008, 0.09, -1);
  const lead1 = mesh(gBat, tube([V(0, BY0 + BH / 2 + 0.02, BZ0 - 0.09), V(0.03, BY0 + BH / 2 + 0.07, BZ0 - 0.1), V(0.07, BY0 + BH / 2 + 0.12, BZ0 - 0.07)], 0.007, 20), mRed); lead1.castShadow = false;
  const lead2 = mesh(gBat, tube([V(0, BY0 - BH / 2 - 0.008, BZ0 - 0.09), V(0.07, BY0 - 0.2, BZ0 - 0.1), V(0.1, BY0 + 0.2, BZ0 - 0.09), V(0.085, BY0 + BH / 2 + 0.12, BZ0 - 0.07)], 0.007, 40), mWire); lead2.castShadow = false;
  jst(gBat, 0.078, BY0 + BH / 2 + 0.14, BZ0 - 0.07);

  /* ---------- gasket (IPX7 seal): flat silicone ring with a sealing lip ---------- */
  const gGasket = part('gasket');
  const gpts = []; for (let i = 0; i < 180; i++) { const th = i / 180 * Math.PI * 2, r = Rse(th) + ROUT - 0.014; gpts.push(new T.Vector3(r * Math.sin(th), HB + 0.006, r * Math.cos(th))); }
  const gk = add(gGasket, new T.TubeGeometry(new T.CatmullRomCurve3(gpts, true), 300, 0.016, 12, true), mSil, false);
  gk.scale.y = 0.62; gk.position.y = HB * 0.38;
  const gpts2 = gpts.map(p => p.clone().setY(HB + 0.02).multiply(new T.Vector3(0.985, 1, 0.985)));
  add(gGasket, new T.TubeGeometry(new T.CatmullRomCurve3(gpts2, true), 300, 0.006, 8, true), mSil, false);

  function animatePump() { }   // mechanism removed to keep the page light


  /* ---------- cap ---------- */
  const gCap = part('cap');
  add(gCap, surface({ th0: 0, th1: Math.PI * 2, nu: 220, wrap: true, rows: CAP, fn: capFn }), mWhite);
  // logo decal
  const logoTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#7f898f'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
    const word = 'MAGIC', sp = 22; g.font = '700 98px "Open Sans", sans-serif';
    const ws = word.split('').map(c => g.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + sp * (word.length - 1);
    let x = (w - tot) / 2; g.textAlign = 'left'; word.split('').forEach((c, i) => { g.fillText(c, x, 150); x += ws[i] + sp; });
    g.font = '500 34px "Open Sans", sans-serif'; g.fillStyle = '#9aa3a8';
    const sub = 'B-02  PRO'; g.textAlign = 'center'; g.fillText(sub.split('').join(String.fromCharCode(8202)), w / 2, 214);
    g.font = '600 24px "Open Sans", sans-serif'; g.fillStyle = '#7f898f'; g.fillText('®', (w + tot) / 2 + 18, 82);
  }, true);
  const LG0 = -0.42, LG1 = 0.42, LY0 = HB + 0.16, LY1 = HB + 0.4;
  const logoRows = []; for (let i = 0; i <= 8; i++) logoRows.push({ a: 1, b: 0.0016, y: LY0 + (LY1 - LY0) * i / 8 });
  const logo = add(gCap, surface({ th0: LG0, th1: LG1, nu: 80, rows: logoRows, fn: capFn }), new T.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.45, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), false);
  logo.renderOrder = 4;
  // nozzle boss
  const bossY = capTopY(BX, BZ);
  const bossProf = [[0.17, -0.07], [0.15, -0.02], [0.12, 0.02], [0.098, 0.055], [0.092, 0.075], [0.085, 0.085], [0.06, 0.09], [0.045, 0.088], [0, 0.088]].map(p => new T.Vector2(p[0], p[1]));
  const boss = add(gCap, new T.LatheGeometry(bossProf, 64), mWhiteDS); boss.position.set(BX, bossY - 0.02, BZ);
  const socket = add(gCap, new T.TorusGeometry(0.052, 0.006, 10, 48), mGroove, false); socket.rotation.x = Math.PI / 2; socket.position.set(BX, bossY + 0.068, BZ);
  // release button on the left side of cap
  const relGeo = new T.LatheGeometry([[0.042, -0.01], [0.041, 0.002], [0.036, 0.008], [0, 0.009]].map(p => new T.Vector2(p[0], p[1])), 48); relGeo.rotateZ(Math.PI / 2);
  const rel = add(gCap, relGeo, mStrip, false); rel.position.set(-(Rse(-Math.PI / 2) + ROUT) + 0.004, HB + 0.29, 0.0);

  /* ---------- nozzle tips (product nozzle + 4 accessory heads) ---------- */
  function makeTip(type, ringColor) {
    const g = new T.Group();
    const conn = [[0.0, 0], [0.05, 0], [0.058, 0.012]];
    for (let i = 0; i < 6; i++) { const y = 0.03 + i * 0.024; conn.push([0.058, y], [0.0535, y + 0.012]); }
    conn.push([0.056, 0.18], [0.046, 0.205], [0.036, 0.235], [0.033, 0.27], [0, 0.27]);
    const cg = new T.LatheGeometry(conn.map(p => new T.Vector2(p[0], p[1])), 48);
    const cm = new T.Mesh(cg, mFrost); cm.castShadow = true; g.add(cm);
    if (ringColor) {
      const rm = new T.Mesh(new T.CylinderGeometry(0.0545, 0.0545, 0.03, 48), new T.MeshPhysicalMaterial({ color: ringColor, roughness: 0.35, clearcoat: 0.6, envMapIntensity: 1 }));
      rm.position.y = 0.17; g.add(rm);
    }
    const L = type === 'perio' ? 0.98 : 1.02, rb = 0.17, al = type === 'tongue' ? 0.28 : 0.62;
    const pts = []; for (let i = 0; i <= 10; i++) pts.push(new T.Vector3(0, 0.25 + (L - 0.25) * i / 10, 0));
    for (let i = 1; i <= 14; i++) { const a = al * i / 14; pts.push(new T.Vector3(-rb + rb * Math.cos(a), L + rb * Math.sin(a), 0)); }
    const dir = new T.Vector3(-Math.sin(al), Math.cos(al), 0);
    const end0 = pts[pts.length - 1].clone();
    const tipLen = type === 'perio' ? 0.06 : 0.11;
    for (let i = 1; i <= 4; i++) pts.push(end0.clone().addScaledVector(dir, tipLen * i / 4));
    const curve = new T.CatmullRomCurve3(pts);
    const tube = new T.Mesh(new T.TubeGeometry(curve, 160, 0.03, 28, false), mClear); tube.castShadow = true; g.add(tube);
    g.add(new T.Mesh(new T.TubeGeometry(curve, 160, 0.0065, 10, false), mBore));
    const end = pts[pts.length - 1].clone();
    const taper = new T.Mesh(new T.CylinderGeometry(0.017, 0.03, 0.055, 28), mClear);
    taper.position.copy(end).addScaledVector(dir, 0.0275); taper.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); g.add(taper);
    let tip = end.clone().addScaledVector(dir, 0.055);
    if (type === 'perio') {
      const soft = new T.Mesh(new T.CylinderGeometry(0.008, 0.017, 0.11, 24), new T.MeshPhysicalMaterial({ color: 0xf3f4f1, roughness: 0.55, sheen: 0.4 }));
      soft.position.copy(tip).addScaledVector(dir, 0.055); soft.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); g.add(soft);
      tip = tip.clone().addScaledVector(dir, 0.11);
    } else if (type === 'ortho') {
      const bm = new T.MeshStandardMaterial({ color: 0xe9f4fa, roughness: 0.5 });
      const bg = new T.CylinderGeometry(0.0032, 0.0032, 0.075, 6); bg.translate(0, 0.0375, 0);
      const side = new T.Vector3(0, 0, 1), up2 = new T.Vector3().crossVectors(dir, side).normalize();
      for (let i = 0; i < 46; i++) {
        const a = i / 46 * Math.PI * 2, rr = 0.012 + (i % 3) * 0.006;
        const b = new T.Mesh(bg, bm);
        const off = side.clone().multiplyScalar(Math.cos(a) * rr).addScaledVector(up2, Math.sin(a) * rr);
        b.position.copy(tip).add(off);
        const d2 = dir.clone().addScaledVector(off, 9).normalize(); b.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d2); g.add(b);
      }
    } else if (type === 'tongue') {
      const loop = new T.Mesh(new T.TorusGeometry(0.085, 0.011, 14, 72), mClear);
      loop.position.copy(tip).addScaledVector(dir, 0.08); loop.rotation.z = Math.atan2(-dir.x, dir.y) * 0 + 0; g.add(loop);
      loop.lookAt(loop.position.clone().add(new T.Vector3(0, 0, 1))); loop.rotateZ(-al);
      loop.scale.set(1, 1.08, 1);
      tip = tip.clone().addScaledVector(dir, 0.165);
    }
    return { group: g, tip, dir };
  }
  const gNozzle = part('nozzle');
  const noz = makeTip('std', null);
  noz.group.position.set(BX, bossY + 0.055, BZ); // tip bends toward −x, away from the lip (as on the real unit)
  gNozzle.add(noz.group);

  /* ---------- water jet (stream + spray) ---------- */
  const JL = 2.3;
  const jetGeo = new T.CylinderGeometry(0.02, 0.011, JL, 20, 160, true); jetGeo.translate(0, JL / 2, 0);
  const jetMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
    uniforms: { uAmt: { value: 0 }, uLen: { value: 0 }, uTime: { value: 0 } },
    vertexShader: `varying float vS; varying vec3 vN; varying vec3 vV; uniform float uTime;
      void main(){ vS = position.y / ${JL.toFixed(2)}; vec3 p = position; float wob = sin(vS*38.0 - uTime*22.0)*0.004*vS; p.x += wob; p.z += wob*0.6;
        vec4 mv = modelViewMatrix * vec4(p,1.0); vV = -mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vS; varying vec3 vN; varying vec3 vV; uniform float uAmt, uLen, uTime;
      void main(){ if (vS > uLen) discard; float fr = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float pulse = 0.62 + 0.38 * sin(vS*46.0 - uTime*30.0);
        float a = uAmt * smoothstep(0.0, 0.015, vS) * (1.0 - smoothstep(uLen*0.72, uLen, vS)) * (0.28 + 0.72*fr) * pulse;
        vec3 c = mix(vec3(0.55,0.84,1.0), vec3(1.0), fr*0.8);
        gl_FragColor = vec4(c * a, a); }`
  });
  const jet = new T.Mesh(jetGeo, jetMat); jet.frustumCulled = false; jet.renderOrder = 8; scene.add(jet);
  const SPRAY = 260;
  const spray = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }), SPRAY);
  spray.frustumCulled = false; spray.renderOrder = 9; scene.add(spray);
  const sprayRnd = Array.from({ length: SPRAY }, () => [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()]);

  /* ---------- droplets (IPX7) ---------- */
  const DROPS = 620;
  const dropGeo = new T.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const mDrop = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.0, metalness: 0, transmission: 1, thickness: 0.06, ior: 1.33, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 3.2 });
  const drops = new T.InstancedMesh(dropGeo, mDrop, DROPS); drops.renderOrder = 6; product.add(drops);
  const dropData = [];
  (function placeDrops() {
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const P = new T.Vector3(), Pa = new T.Vector3(), Pb = new T.Vector3(), n = new T.Vector3(), up = new T.Vector3(0, 1, 0);
    const surfAt = (th, y) => {
      if (y < HB) {
        const s0 = { a: 1, b: 0, y, w: 1 };
        const inSpine = Math.cos(th) < -Math.cos(PHI);
        return inSpine ? spineFn(((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), s0) : tankFn(Math.atan2(Math.sin(th), Math.cos(th)), s0);
      }
      return capFn(th, { a: 1, b: 0, y });
    };
    for (let i = 0; i < DROPS; i++) {
      const th = rnd() * Math.PI * 2, y = 0.3 + rnd() * (HB + HC - RHO - 0.3);
      const e = 0.002;
      P.fromArray(surfAt(th, y)); Pa.fromArray(surfAt(th + e, y)).sub(P); Pb.fromArray(surfAt(th, y + e)).sub(P);
      n.crossVectors(Pa, Pb).normalize();
      if (n.dot(new T.Vector3(P.x, 0, P.z)) < 0) n.negate();
      const big = rnd(), size = 0.016 + Math.pow(big, 2.6) * 0.055;
      const q = new T.Quaternion().setFromUnitVectors(up, n);
      dropData.push({ p: P.clone().addScaledVector(n, -0.002), q, size, t: rnd(), stretch: 1 + rnd() * 0.5 });
    }
  })();
  const dm = new T.Matrix4(), dsV = new T.Vector3();
  function updateDrops(k) {
    for (let i = 0; i < DROPS; i++) {
      const d = dropData[i], g = sstep(d.t * 0.75, d.t * 0.75 + 0.25, k), s = d.size * g;
      dsV.set(s, s * 0.42, s * d.stretch);
      dm.compose(d.p, d.q, dsV); drops.setMatrixAt(i, dm);
    }
    drops.instanceMatrix.needsUpdate = true; drops.visible = k > 0.001;
  }
  updateDrops(0);

  /* ---------- accessory heads ---------- */
  const heads = [['std', 0x4aa8d8], ['perio', 0x6cc79a], ['ortho', 0xf09ab4], ['tongue', 0xb3a2e0]].map(([t, c], i) => {
    const h = makeTip(t, c); scene.add(h.group); h.group.visible = false; h.baseX = 1.4 + i * 1.0; return h;
  });

  /* ---------- part bookkeeping (explode offsets) ---------- */
  const parts = {
    nozzle: { g: gNozzle, off: new T.Vector3(0, 1.75, 0), off2: new T.Vector3(0, 1.7, 0) },
    cap: { g: gCap, off: new T.Vector3(0, 1.3, 0), off2: new T.Vector3(0, 1.7, 0) },
    pump: { g: gPump, off: new T.Vector3(0, 0.72, 0.1), off2: new T.Vector3(0, 0, 0) },
    gasket: { g: gGasket, off: new T.Vector3(0, 0.3, 0), off2: new T.Vector3(0, -0.1, 0) },
    tank: { g: gTank, off: new T.Vector3(0, 0, 0.45), off2: new T.Vector3(0.55, 0, 0.75) },
    battery: { g: gBat, off: new T.Vector3(0, 0, -0.55), off2: new T.Vector3(0, 0, 0) },
    usb: { g: gUsb, off: new T.Vector3(0, -0.05, -0.85), off2: new T.Vector3(0, 0, 0) },
    pcb: { g: gPcb, off: new T.Vector3(0, 0.08, -1.0), off2: new T.Vector3(0, 0, 0) },
    keypad: { g: gKey, off: new T.Vector3(-0.4, 0.08, -1.25), off2: new T.Vector3(-0.25, 0, -0.15) },
    spine: { g: gSpine, off: new T.Vector3(-0.85, 0, -1.6), off2: new T.Vector3(-0.8, 0, -0.7) },
  };
  // Hide internals when assembled (they're invisible anyway; saves draw calls)
  const internals = [gPump, gBat, gPcb, gKey, gUsb];

  /* ================= Scroll choreography ================= */
  // az: camera azimuth (0 = front), el: elevation, d: distance, ty/tx: look target, sx/sy: screen shift,
  // e: explode, w: water, j: jet, dr: drops, hd: heads, led: LED sequence, dk: dark stage, co: callouts
  const KEYS = [
    // 01 assembled, turning slowly
    { p: 0.00, az: 0.42, el: 0.07, d: 12.6, ty: 2.25, tx: 0, tz: 0, sx: 0.2, sy: 0.02, sp: 0, e: 0, w: 0.55, j: 0, dr: 0, hd: 0, led: 0, dk: 0, co: 0 },
    { p: 0.12, az: 1.15, el: 0.1, d: 12.8 },
    // 02 exploded, labels on
    { p: 0.30, az: 2.08, el: 0.2, d: 21.5, ty: 3.05, tz: -0.55, sx: 0, sy: 0.1, e: 1, co: 0 },
    { p: 0.36, co: 1 },
    { p: 0.52, az: 1.88, d: 21.0, co: 1 },
    { p: 0.57, co: 0 },
    // 03 electronics close-up
    { p: 0.68, az: 2.33, el: 0.12, d: 5.9, tx: -0.05, ty: 1.4, tz: -1.3, sx: -0.16, sy: 0, sp: 1 },
    { p: 0.78, az: 2.46, el: 0.16, d: 5.6 },
    // 04 back together, tank fills
    { p: 0.92, az: 0.33, el: 0.1, d: 13.4, tx: 0, ty: 2.3, tz: 0, sx: 0.2, sy: 0, sp: 0, e: 0, w: 1 },
    { p: 1.00, az: 0.18, w: 1 },
  ];
  if (MODE === 'hero') {
    KEYS.length = 0;
    KEYS.push({ p: 0, az: 0.42, el: 0.07, d: 12.6, ty: 2.25, tx: 0, tz: 0, sp: 0, sx: 0.2, sy: 0.02, e: 0, w: 0.55, j: 0, dr: 0, hd: 0, led: 0, dk: 0, co: 0 }, { p: 1 });
  }
  // fill missing fields by carrying previous values forward
  for (let i = 1; i < KEYS.length; i++) for (const k in KEYS[0]) if (KEYS[i][k] === undefined) KEYS[i][k] = KEYS[i - 1][k];
  const S = {};
  function sample(p) {
    let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i], b = KEYS[i + 1], t = ease(clamp((p - a.p) / (b.p - a.p), 0, 1));
    for (const k in a) S[k] = lerp(a[k], b[k], t);
    return S;
  }

  /* ================= Overlay helpers ================= */
  const coEls = [0, 1, 2, 3, 4, 5].map(i => { const el = $('#co' + i); return el ? { el, dot: $('.dot', el), ln: $('.ln', el), lb: $('.lb', el) } : null; });
  const v3 = (x, y, z) => new T.Vector3(x, y, z);
  const anchors = [
    [gNozzle, () => v3(0, 0, 0)], // set below once world matrices exist
    [gPump, () => v3(XG, YC, ZC)],
    [gGasket, () => v3(0, HB + 0.006, Rse(0) + ROUT - 0.012)],
    [gTank, () => v3(0.25, 1.35, Rse(0.4))],
    [gSpine, () => v3(0, 2.16, zStrip)],
    [gBat, () => v3(0, 0.95, -0.49 - 0.085)],
  ].map(([g, f]) => ({ g, local: f() }));
  // nozzle anchor computed once nozzle world matrices are ready
  product.updateMatrixWorld(true);
  anchors[0].local = gNozzle.worldToLocal(noz.group.localToWorld(noz.tip.clone()));
  const hlEls = [0, 1, 2, 3].map(i => $('#hl' + i));
  const tmpV = new T.Vector3();

  let W = 1, H = 1, narrow = false;
  function resize() {
    W = stage.clientWidth; H = stage.clientHeight; narrow = W < 900;
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, W > 1600 ? 1.5 : 1.75));
    R.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  /* ---------- pointer: drag to rotate + subtle parallax ---------- */
  let drag = false, lastX = 0, yawUser = 0, yawVel = 0, px = 0, py = 0, pxs = 0, pys = 0;
  const canvas = R.domElement;
  canvas.addEventListener('pointerdown', e => { drag = true; lastX = e.clientX; stage.classList.add('grabbing'); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    px = e.clientX / W - 0.5; py = e.clientY / H - 0.5;
    if (drag) { const dx = e.clientX - lastX; lastX = e.clientX; yawVel = dx * 0.0085; yawUser += yawVel; }
  });
  const endDrag = () => { drag = false; stage.classList.remove('grabbing'); };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { px = py = 0; });
  stage.classList.add('grab');

  /* ---------- visibility: render only when the stage is on screen ---------- */
  let stageVisible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { stageVisible = es[0].isIntersecting; }).observe(story);

  /* ================= Frame loop ================= */
  const camPos = new T.Vector3(), target = new T.Vector3(), tipW = new T.Vector3(), dirW = new T.Vector3(), q0 = new T.Quaternion(), yAxis = new T.Vector3(0, 1, 0);
  const bg = new T.Color();
  const tStart = performance.now();
  let last = tStart, time = 0, darkOn = false, lastActive = -1;
  const sm = new T.Matrix4(), sp = new T.Vector3(), sq = new T.Quaternion(), ss = new T.Vector3();

  function frame(now) { requestAnimationFrame(frame); tick(now); }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    pSmooth += (pTarget - pSmooth) * (1 - Math.exp(-dt * (reduce ? 30 : 7.5)));
    if (Math.abs(pTarget - pSmooth) < 1e-5) pSmooth = pTarget;
    const p = pSmooth;
    if (!stageVisible) return;

    const s = sample(p);
    const intro = reduce ? 1 : ease(clamp((now - tStart - 250) / 2300, 0, 1));

    /* --- product parts --- */
    const ex = Math.max(ease(clamp(s.e, 0, 1)), (1 - intro) * 0.75);
    const spr = ease(clamp(s.sp, 0, 1));
    for (const k in parts) { const pt = parts[k]; pt.g.position.copy(pt.off).multiplyScalar(ex).addScaledVector(pt.off2, spr); }
    internals.forEach(g => { g.visible = ex > 0.01; });
    if (ex > 0.01) animatePump(reduce ? 0 : time);
    gTank.position.y += 0;
    water.visible = s.w > 0.005; water.scale.y = Math.max(0.001, s.w * WATER_MAX);
    updateDrops(s.dr);

    // LEDs & power ring
    const ledSeq = s.led + (s.j > 0.02 ? 2.2 : 0);
    leds.forEach((m, i) => { const k = clamp(ledSeq - i, 0, 1) * (s.j > 0.02 ? (i === 1 ? 1 : 0.15) : 1); m.material.emissiveIntensity = 3.2 * k; m.userData.glow.material.opacity = 0.75 * k; });
    powerRing.material.emissiveIntensity = 1.6 * clamp(Math.max(s.led, s.j * 3), 0, 1);
    const modeIdx = s.led > 0.35 ? Math.min(2, Math.floor(s.led - 0.35 + 0.0001 + 1) - 1) : -1;
    modes.forEach((m, i) => m.classList.toggle('on', i <= modeIdx && i >= modeIdx));

    /* --- camera --- */
    yawVel *= Math.pow(0.0025, dt); if (!drag) yawUser += yawVel * 0.0;
    if (!drag) yawUser *= Math.pow(0.35, dt);              // spring back to choreography
    pxs += (px - pxs) * (1 - Math.exp(-dt * 3)); pys += (py - pys) * (1 - Math.exp(-dt * 3));
    const sway = reduce ? 0 : (MODE === 'hero' ? time * 0.16 : Math.sin(time * 0.35) * 0.05 * (1 - s.co));
    const az = s.az + yawUser + sway + pxs * 0.16 + (1 - intro) * 0.9;
    const el = s.el + pys * 0.05;
    let d = s.d * (1 + (1 - intro) * 0.12) * (HAS_SUB ? 1.08 : 1);   // product page: leave room for the sub-nav
    const aspect = W / H;
    if (aspect < 1.25) d *= lerp(Math.min(1.8, Math.pow(1.25 / aspect, 0.9)), 1.32, ease(clamp(s.e, 0, 1)));
    target.set(s.tx, s.ty, s.tz);
    camPos.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(d).add(target);
    cam.position.copy(camPos); cam.lookAt(target);
    const sx = narrow ? 0 : s.sx, sy = narrow ? (s.sy > 0.05 ? s.sy * 0.95 : -0.16) : s.sy + (HAS_SUB ? 0.045 : 0);
    cam.setViewOffset(W, H, -sx * W, -sy * H, W, H);
    rig.rotation.y = az;

    /* --- stage colour / dark mode --- */
    const dk = s.dk;
    bg.copy(BG_LIGHT).lerp(BG_DARK, dk); scene.background.copy(bg);
    floor.material.opacity = 0.11 * (1 - dk * 0.7);
    ao.material.opacity = 0.85 * (1 - dk * 0.55);
    key.intensity = 1.7 - dk * 0.6; fill.intensity = 0.3 - dk * 0.16; hemi.intensity = 0.22 - dk * 0.12;
    rim.intensity = 0.75 + dk * 0.9; rim2.intensity = dk * 1.4;
    for (const m of mats) m.envMapIntensity = m.userData.env * (1 - dk * 0.42);
    R.toneMappingExposure = 1.08 + dk * 0.02;
    const wantDark = dk > 0.5;
    if (wantDark !== darkOn) { darkOn = wantDark; document.body.classList.toggle('is-dark', darkOn); }

    /* --- water jet --- */
    product.updateMatrixWorld();
    tipW.copy(noz.tip); noz.group.localToWorld(tipW);
    dirW.copy(noz.dir).transformDirection(noz.group.matrixWorld);
    const jAmt = clamp(s.j * 1.6, 0, 1), jLen = sstep(0.0, 0.75, s.j);
    jet.visible = s.j > 0.003;
    if (jet.visible) {
      jet.position.copy(tipW); jet.quaternion.setFromUnitVectors(yAxis, dirW);
      jetMat.uniforms.uAmt.value = jAmt * (0.85 + 0.15 * Math.sin(time * 9)); jetMat.uniforms.uLen.value = jLen; jetMat.uniforms.uTime.value = time;
    }
    spray.visible = jet.visible;
    if (spray.visible) {
      for (let i = 0; i < SPRAY; i++) {
        const r = sprayRnd[i], ph = (time * (0.55 + r[0] * 0.5) + r[1]) % 1;
        const along = JL * jLen * (0.25 + 0.75 * r[2]);
        sp.copy(tipW).addScaledVector(dirW, along + ph * 0.7);
        sp.x += (r[3] - 0.5) * ph * 0.55; sp.z += (r[4] - 0.5) * ph * 0.55; sp.y -= ph * ph * 0.9;
        const sc = (0.004 + 0.012 * r[3] * r[3]) * (1 - ph) * jAmt * (along < JL * jLen * 0.95 ? 1 : 0);
        ss.set(sc, sc, sc); sm.compose(sp, sq, ss); spray.setMatrixAt(i, sm);
      }
      spray.instanceMatrix.needsUpdate = true;
    }

    /* --- accessory heads --- */
    heads.forEach((h, i) => {
      const k = sstep(i * 0.16, i * 0.16 + 0.52, s.hd);
      h.group.visible = k > 0.001;
      if (!h.group.visible) return;
      const kk = ease(k);
      h.group.position.set(h.baseX, (1 - kk) * 0.9, 0.55);
      h.group.rotation.set(0, Math.PI + 0.35 - i * 0.05 + (1 - kk) * 1.6 + (reduce ? 0 : Math.sin(time * 0.6 + i) * 0.05), 0);
      h.group.scale.setScalar(0.94 + 0.06 * kk);
    });

    R.render(scene, cam);
    if (shotName) { const n = shotName; shotName = null; fetch('/shot?name=' + n, { method: 'POST', body: R.domElement.toDataURL('image/png') }); }

    /* --- HTML overlays --- */
    panels.forEach(pn => {
      const fin = sstep(pn.a, pn.a + 0.022, p), fout = 1 - sstep(pn.b - 0.022, pn.b, p);
      const o = Math.min(fin, fout) * (pn.a < 0 ? intro : 1);
      const ty = (1 - fin) * 26 - (1 - fout) * 26;
      pn.el.style.opacity = o.toFixed(3);
      pn.el.style.visibility = o > 0.002 ? 'visible' : 'hidden';
      const base = pn.el.classList.contains('left') || pn.el.classList.contains('right') ? (narrow ? '' : 'translateY(-50%) ') : '';
      pn.el.style.transform = `${base}translate3d(0,${ty.toFixed(1)}px,0)`;
    });
    const hf = Math.min(1 - sstep(0.03, 0.06, p), intro);
    if (heroFoot) { heroFoot.style.opacity = hf.toFixed(3); heroFoot.style.visibility = hf > 0.01 ? 'visible' : 'hidden'; }
    if (rail) rail.style.opacity = sstep(0.06, 0.1, p) + '';
    let act = 0; stepBtns.forEach((b, i) => { if (p >= +b.dataset.at) act = i; });
    if (act !== lastActive) { stepBtns.forEach((b, i) => b.classList.toggle('on', i === act)); lastActive = act; }
    if (storyBar) storyBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (storyHead) storyHead.style.opacity = (1 - (narrow ? 0 : s.co)).toFixed(3);
    if (mlEl) { const ml = Math.round(clamp((s.w - 0.02) / 0.98, 0, 1) * 200); mlEl.textContent = ml; mlBar.style.transform = `scaleX(${(ml / 200).toFixed(3)})`; }

    // callouts
    const coA = narrow || !coEls[0] ? 0 : s.co;
    if (coA > 0.002) {
      const pts = anchors.map(a => { tmpV.copy(a.local); a.g.localToWorld(tmpV); tmpV.project(cam); return { x: (tmpV.x + 1) / 2 * W, y: (1 - tmpV.y) / 2 * H }; });
      const cx = W / 2;
      const left = [], right = [];
      pts.forEach((pt, i) => (pt.x < cx ? left : right).push({ i, pt, y: pt.y }));
      [left, right].forEach(list => {
        list.sort((a, b) => a.y - b.y);
        if (list.length) list[0].y = Math.max(list[0].y, H * 0.3);
        for (let k = 1; k < list.length; k++) if (list[k].y - list[k - 1].y < 70) list[k].y = list[k - 1].y + 70;
        list.forEach(item => {
          const e = coEls[item.i], isL = left.includes(item);
          const colX = isL ? Math.min(item.pt.x - 60, cx - 260) : Math.max(item.pt.x + 60, cx + 260);
          e.el.classList.toggle('l', isL);
          e.el.style.opacity = coA.toFixed(3);
          e.dot.style.transform = `translate(${item.pt.x.toFixed(1)}px,${item.pt.y.toFixed(1)}px)`;
          const x0 = item.pt.x, y0 = item.pt.y, x1 = colX, y1 = item.y;
          const len = Math.hypot(x1 - x0, y1 - y0), ang = Math.atan2(y1 - y0, x1 - x0);
          e.ln.style.width = (len * coA).toFixed(1) + 'px';
          e.ln.style.transform = `translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) rotate(${ang}rad)`;
          e.lb.style.transform = `translate(${(isL ? x1 - 262 : x1 + 12).toFixed(1)}px,${y1.toFixed(1)}px)`;
        });
      });
    } else coEls.forEach(e => { if (e) e.el.style.opacity = '0'; });

    // head labels
    heads.forEach((h, i) => {
      const k = sstep(i * 0.16 + 0.3, i * 0.16 + 0.6, s.hd);
      const el = hlEls[i]; if (!el) return; el.style.opacity = k.toFixed(3);
      if (k > 0.002) { tmpV.set(h.group.position.x, -0.04, h.group.position.z); tmpV.project(cam); el.style.transform = `translate(${((tmpV.x + 1) / 2 * W).toFixed(1)}px,${((1 - tmpV.y) / 2 * H + 14).toFixed(1)}px)`; }
    });
  }

  /* ---------- dev hook (?debug): jump to a progress value and capture the canvas ---------- */
  let shotName = null;
  if (/[?&]debug\b/.test(location.search)) window.__feba = { go(p) { pTarget = pSmooth = p; }, shot(name) { shotName = name; tick(performance.now()); } };

  /* ---------- start after fonts are ready (logo & labels are drawn with web fonts) ---------- */
  const fontsReady = (document.fonts && document.fonts.load)
    ? Promise.all(['400 30px "Open Sans"', '500 30px "Open Sans"', '600 30px "Open Sans"', '700 30px "Open Sans"'].map(f => document.fonts.load(f))).catch(() => { })
    : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 1500))]).then(() => {
    [logoTex, marksTex, modeTex, ledNumTex, batTex].forEach(t => t.userData.draw()); // redraw with web fonts
    R.compile(scene, cam);
    requestAnimationFrame(frame);
    setTimeout(() => { const ld = $('#loader'); if (ld) ld.classList.add('done'); }, 120);
  });
})();

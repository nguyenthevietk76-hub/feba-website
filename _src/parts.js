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

/* FEBA — 20 s intro film (Editorial Swiss: paper / ink / Klein blue)
 * 0.0–3.5 s  masthead: grid draws, FEBA letters rise, rotating badge
 * 3.5–11.5 s four members, one every 2 s
 * 11.5–16.5 s product: B-02 PRO + specs
 * 16.5–20 s  TIỆN LAB + end card
 * One component serves both 16:9 and 9:16 — layout reads width/height.
 */
import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill, Img, Sequence, continueRender, delayRender, interpolate, spring,
  staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';

export const FPS = 30;
export const DURATION = 600;

const C = { paper: '#f3f1ec', paper2: '#e9e6df', ink: '#111111', mute: '#6f6b63', klein: '#1f3bff', kleinLight: '#9fb0ff' };
const FONT = "'Open Sans', 'Helvetica Neue', Arial, sans-serif";
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const io = Easing.bezier(0.65, 0, 0.35, 1);
const clampOpt = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ramp = (f, a, b, from = 0, to = 1, e = ease) => interpolate(f, [a, b], [from, to], { ...clampOpt, easing: e });

const MEMBERS = [
  { no: '01', name: 'Đỗ Quốc Việt', chip: 'Trưởng nhóm', role: 'Tài chính & dữ liệu', img: 'team-do-quoc-viet.jpg', lines: ['Giải Nhì Nghiên cứu khoa học cấp khoa', 'Giải Triển vọng · Top 5 DBIC'] },
  { no: '02', name: 'Bùi Việt Anh', chip: 'Vận hành', role: 'Affiliate & đối soát', img: 'team-bui-viet-anh.jpg', lines: ['Phó Bí thư khoa Kinh tế số', '9 chương trình trong Ban tổ chức'] },
  { no: '03', name: 'Lê Ninh', chip: 'Chiến lược', role: 'Sản phẩm & khách hàng', img: 'team-le-ninh.jpg', lines: ['Giải Nhất khởi nghiệp cấp Học viện', 'Giải Khuyến khích cấp Quốc gia'] },
  { no: '04', name: 'Nguyễn Thế Việt', chip: 'Nội dung', role: 'TikTok & kịch bản', img: 'team-nguyen-the-viet.jpg', lines: ['Đại sứ Google · OPPO · Anessa', 'Giải Nhì NCKH về TikTok Shop'] },
];

/* ---------- fonts (local Open Sans, Vietnamese subset included) ---------- */
const FontFaces = () => {
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all(['400', '600', '700', '800'].map(w => document.fonts.load(`${w} 40px "Open Sans"`, 'Tiếng Việt ĐỘI')))
      .then(() => continueRender(handle)).catch(() => continueRender(handle));
  }, [handle]);
  const face = (file, range) => `@font-face{font-family:'Open Sans';font-weight:300 800;font-display:block;src:url(${staticFile('fonts/' + file)}) format('woff2');unicode-range:${range}}`;
  return (
    <style>{
      face('OpenSans-vietnamese.woff2', 'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB') +
      face('OpenSans-latin-ext.woff2', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C4,U+2113,U+2C60-2C7F,U+A720-A7FF') +
      face('OpenSans-latin.woff2', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD')
    }</style>
  );
};

const Label = ({ children, color = C.ink, size = 18, style }) => (
  <div style={{ fontFamily: FONT, fontSize: size, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color, ...style }}>{children}</div>
);

const Grid = ({ color = 'rgba(17,17,17,.07)', grow = 1, pad }) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ padding: `0 ${pad}px`, display: 'grid', gridTemplateColumns: 'repeat(12,1fr)' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ borderLeft: `1px solid ${color}`, borderRight: i === 11 ? `1px solid ${color}` : 0, transformOrigin: '0 0', transform: `scaleY(${Math.min(1, Math.max(0, grow * 1.6 - i * 0.05))})` }} />
      ))}
    </AbsoluteFill>
  );
};

/* ---------- Scene 1: masthead ---------- */
const Masthead = () => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const v = height > width, pad = v ? 64 : 96;
  const mega = v ? 400 : 560;
  const exit = ramp(f, 92, 105, 0, 1, io);
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: FONT, color: C.ink }}>
      <Grid grow={ramp(f, 0, 26)} pad={pad} />
      <div style={{ position: 'absolute', left: pad, right: pad, top: v ? 120 : 70 }}>
        <div style={{ height: 3, background: C.ink, transformOrigin: '0 50%', transform: `scaleX(${ramp(f, 4, 30)})` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 0', opacity: ramp(f, 14, 30) }}>
          <Label size={v ? 20 : 18}>Số 01 — Ấn bản 2026</Label>
          {!v && <Label size={18}>Học viện Chính sách và Phát triển</Label>}
          <Label size={v ? 20 : 18}>Kinh doanh số 2026</Label>
        </div>
        <div style={{ height: 1, background: 'rgba(17,17,17,.3)', transformOrigin: '0 50%', transform: `scaleX(${ramp(f, 8, 34)})` }} />
      </div>
      <div style={{ position: 'absolute', left: pad - mega * 0.04, top: v ? 420 : 200, display: 'flex', overflow: 'hidden', paddingBottom: 10, paddingRight: mega * 0.1 }}>
        {'FEBA'.split('').map((ch, i) => {
          const s = spring({ frame: f - 10 - i * 4, fps, config: { damping: 200, mass: 0.9 } });
          return <span key={i} style={{ display: 'inline-block', fontSize: mega, fontWeight: 800, letterSpacing: '-0.065em', lineHeight: 0.82, transform: `translateY(${(1 - s) * 105}%)` }}>{ch}</span>;
        })}
      </div>
      <Badge x={v ? width - pad - 220 : width - pad - 250} y={v ? 220 : 150} size={v ? 220 : 250} f={f} />
      <div style={{ position: 'absolute', left: pad, bottom: v ? 620 : 96, opacity: ramp(f, 44, 66), transform: `translateY(${ramp(f, 44, 70, 40, 0)}px)` }}>
        <div style={{ fontSize: v ? 76 : 84, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.0 }}>Bán bằng nội dung.</div>
        <div style={{ fontSize: v ? 76 : 84, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.05, color: C.klein }}>Quyết bằng dữ liệu.</div>
      </div>
      <AbsoluteFill style={{ background: C.klein, transform: `translateY(${(1 - exit) * 100}%)` }} />
    </AbsoluteFill>
  );
};

const Badge = ({ x, y, size, f }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, opacity: ramp(f, 20, 40), transform: `scale(${ramp(f, 20, 44, 0.6, 1)})` }}>
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: `rotate(${f * 1.1}deg)` }}>
      <defs><path id="c" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
      <text fontFamily={FONT} fontSize="15.5" fontWeight="700" letterSpacing="3.2" fill={C.klein}><textPath href="#c">ĐỘI THI · KINH DOANH SỐ · 2026 · TIỆN LAB ·</textPath></text>
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: size * 0.24, color: C.klein, letterSpacing: '-0.04em' }}>04</div>
  </div>
);

/* ---------- Scene 2: one member card (60 frames) ---------- */
const Member = ({ m }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const v = height > width, pad = v ? 64 : 96;
  const wipe = ramp(f, 0, 14, 0, 1, io);
  const zoom = interpolate(f, [0, 60], [1.14, 1.0], clampOpt);
  const txt = (d) => ({ opacity: ramp(f, 8 + d, 22 + d), transform: `translateY(${ramp(f, 8 + d, 26 + d, 36, 0)}px)` });
  const enter = ramp(f, 0, 12, 0, 1, io);          // Klein panel slides away to the right
  const exit = ramp(f, 51, 60, 0, 1, io);          // next Klein panel covers from the left
  const photoBox = v
    ? { left: 0, top: 0, width, height: height * 0.56 }
    : { left: 0, top: 0, width: width * 0.42, height };
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: FONT, color: C.ink }}>
      <Grid pad={pad} />
      <div style={{ position: 'absolute', ...photoBox, overflow: 'hidden', clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)` }}>
        <Img src={staticFile(m.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 30%', transform: `scale(${zoom})` }} />
      </div>
      <div style={v
        ? { position: 'absolute', left: pad, right: pad, top: height * 0.56 + 56 }
        : { position: 'absolute', left: width * 0.42 + 110, right: pad, top: 150 }}>
        <div style={{ ...txt(0), fontSize: v ? 150 : 210, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 0.85, color: C.klein }}>{m.no}</div>
        <div style={{ ...txt(3), display: 'flex', gap: 16, alignItems: 'center', marginTop: v ? 30 : 48 }}>
          <span style={{ background: m.no === '01' ? C.klein : C.ink, color: '#fff', padding: '8px 14px' }}><Label color="#fff" size={v ? 22 : 20}>{m.chip}</Label></span>
          <Label size={v ? 22 : 20}>{m.role}</Label>
        </div>
        <div style={{ ...txt(6), fontSize: v ? 104 : 118, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 0.98, marginTop: 26 }}>{m.name}</div>
        <div style={{ ...txt(10), marginTop: v ? 36 : 48, borderTop: `2px solid ${C.ink}` }}>
          {m.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 22, padding: '18px 0', borderBottom: '1px solid rgba(17,17,17,.18)', fontSize: v ? 36 : 36, fontWeight: 600, letterSpacing: '-0.01em' }}>
              <span style={{ color: C.klein, fontWeight: 700, fontSize: 20, paddingTop: 10, letterSpacing: '0.06em' }}>0{i + 1}</span>{l}
            </div>
          ))}
        </div>
      </div>
      <AbsoluteFill style={{ background: C.klein, transform: `translateX(${enter * 100}%)` }} />
      <AbsoluteFill style={{ background: C.klein, transform: `translateX(${(exit - 1) * 100}%)` }} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 3: product ---------- */
const SPECS = [{ v: 200, t: '200', u: 'ml', k: 'Bình nước' }, { t: '30–120', u: 'psi', k: 'Áp lực tia nước' }, { t: 'IPX7', u: '', k: 'Chống nước' }, { v: 1500, t: '1.500', u: 'mAh', k: 'Pin' }];
const Product = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const v = height > width, pad = v ? 64 : 96;
  const card = ramp(f, 4, 34);
  const fmt = n => Math.round(n).toLocaleString('vi-VN');
  return (
    <AbsoluteFill style={{ background: C.klein, fontFamily: FONT, color: '#fff' }}>
      <Grid color="rgba(255,255,255,.12)" pad={pad} />
      <div style={{ position: 'absolute', left: pad, top: v ? 130 : 120, width: v ? width - 2 * pad : width * 0.48 }}>
        <Label color="#fff" size={v ? 22 : 20} style={{ opacity: ramp(f, 0, 14) }}>Sản phẩm đội đang bán</Label>
        <div style={{ fontSize: v ? 150 : 170, fontWeight: 800, letterSpacing: '-0.055em', lineHeight: 0.9, marginTop: 30, opacity: ramp(f, 4, 20), transform: `translateY(${ramp(f, 4, 26, 60, 0)}px)` }}>Tăm nước<br />B-02 PRO.</div>
      </div>
      <div style={{
        position: 'absolute', overflow: 'hidden', background: '#fff',
        ...(v ? { left: pad, right: pad, top: 640, height: 640 } : { right: pad, top: 120, width: width * 0.36, height: height - 380 }),
        clipPath: `inset(${(1 - card) * 100}% 0 0 0)`,
      }}>
        <Img src={staticFile('product-white.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 60%', transform: `scale(${interpolate(f, [0, 150], [1.18, 1.0], clampOpt)})` }} />
      </div>
      <div style={{ position: 'absolute', left: pad, right: pad, bottom: v ? 120 : 80, display: 'grid', gridTemplateColumns: v ? '1fr 1fr' : 'repeat(4,1fr)', borderTop: '2px solid #fff' }}>
        {SPECS.map((s, i) => {
          const k = ramp(f, 30 + i * 8, 70 + i * 8);
          const val = s.v ? fmt(s.v * k) : s.t;
          return (
            <div key={i} style={{ padding: '22px 22px 6px 0', opacity: ramp(f, 26 + i * 8, 40 + i * 8) }}>
              <div style={{ fontSize: v ? 96 : 96, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, whiteSpace: 'nowrap' }}>{val}<span style={{ fontSize: 30, fontWeight: 700, marginLeft: 8, color: C.kleinLight, letterSpacing: 0 }}>{s.u}</span></div>
              <Label color="rgba(255,255,255,.8)" size={18} style={{ marginTop: 12 }}>{s.k}</Label>
            </div>
          );
        })}
      </div>
      <AbsoluteFill style={{ background: C.ink, transform: `translateY(${(1 - ramp(f, 138, 150, 0, 1, io)) * 100}%)` }} />
    </AbsoluteFill>
  );
};

/* ---------- Scene 4: TIỆN LAB + end card ---------- */
const Outro = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const v = height > width, pad = v ? 64 : 96;
  const end = ramp(f, 54, 70, 0, 1, io);
  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: FONT, color: C.paper }}>
      <Grid color="rgba(243,241,236,.08)" pad={pad} />
      <div style={{ position: 'absolute', left: pad, top: v ? 560 : 170, opacity: 1 - end }}>
        <Label color={C.kleinLight} size={20} style={{ opacity: ramp(f, 0, 12) }}>Kênh TikTok Shop Affiliate</Label>
        <div style={{ display: 'flex', fontSize: v ? 250 : 330, fontWeight: 800, letterSpacing: '-0.06em', lineHeight: 1.05, marginTop: 20, overflow: 'hidden' }}>
          <span style={{ transform: `translateY(${ramp(f, 2, 22, 100, 0)}%)` }}>TIỆN</span>
          <span style={{ color: C.klein, transform: `translateY(${ramp(f, 7, 27, 100, 0)}%)` }}>LAB</span>
        </div>
        <div style={{ fontSize: v ? 62 : 68, fontWeight: 800, letterSpacing: '-0.04em', marginTop: 24, opacity: ramp(f, 20, 36) }}>Test thật. Dùng tiện. <span style={{ color: C.klein }}>Giá sinh viên.</span></div>
      </div>
      <AbsoluteFill style={{ background: C.paper, color: C.ink, clipPath: `inset(${(1 - end) * 100}% 0 0 0)` }}>
        <Grid pad={pad} />
        <div style={{ position: 'absolute', left: pad - (v ? 16 : 22), top: v ? 520 : 150, fontSize: v ? 400 : 560, fontWeight: 800, letterSpacing: '-0.065em', lineHeight: 0.82 }}>FEBA</div>
        <div style={{ position: 'absolute', left: pad, right: pad, bottom: v ? 200 : 90, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 30, borderTop: `3px solid ${C.ink}`, paddingTop: 26 }}>
          <div style={{ fontSize: v ? 58 : 54, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}>Bán bằng nội dung.<br /><span style={{ color: C.klein }}>Quyết bằng dữ liệu.</span></div>
          <div style={{ textAlign: v ? 'left' : 'right' }}>
            <Label size={20}>Cuộc thi Sinh viên Kinh doanh số 2026</Label>
            <Label size={20} color={C.mute} style={{ marginTop: 10 }}>01/10 – 05/12/2026 · Học viện Chính sách và Phát triển</Label>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Intro = () => (
  <AbsoluteFill style={{ background: C.paper }}>
    <FontFaces />
    <Sequence from={0} durationInFrames={105}><Masthead /></Sequence>
    {MEMBERS.map((m, i) => (
      <Sequence key={m.no} from={105 + i * 60} durationInFrames={60}><Member m={m} /></Sequence>
    ))}
    <Sequence from={345} durationInFrames={150}><Product /></Sequence>
    <Sequence from={495} durationInFrames={105}><Outro /></Sequence>
  </AbsoluteFill>
);

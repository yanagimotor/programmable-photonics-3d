// The zoom-out of tab 3's in situ story (apps/insitu.js): the camera draws back to a large system, a grid of 15 chips
// linked by fibres, and the fire and the snow (drawn larger) walk through it - the requirements keep changing:
//   conv: conventional chips (etched, fixed): each chip they reach flickers out and gets a red cross, its fibres go
//         dark; when most have failed, the whole system stops ("System down");
//   many: the same grid with chips written by light: each chip they reach dims, a gold packet runs up to its own
//         projector, a gold flash there, a new pattern, and it glows again; the fibres stay lit ("System working").
// All of it is pictures: nothing here is computed (the real correction is the close-up's, programs/wdmlab.js).
//
//   const grid = createGrid(ctx, { walk, downAt })   walk: { conv: { t0, v, lag }, many: { t0, v, lag } } - when the
//                                fire starts walking (s), its speed (units/s), how much later the snow follows (so that
//                                the chips they reach take turns); downAt: conventional chips failed when the system stops
//   grid.group                   the grid (hidden until the zoom-out)
//   grid.reset()                 conventional chips, all working (the start of conv)
//   grid.begin(part)             'conv': reset; 'many': the wave to chips written by light, and the walk again
//   grid.update(raw, t, camera, pointScale, o)   every frame; o (one object, reused by the caller): { part - 'conv',
//                                'many', or 'back' (the camera flying back: the walk over, the chips as they are) -, partT
//                                (the part's clock), manyK (0..1: how far the camera has drawn back), near (the close-up's
//                                set-up still shown: the grid's middle cell, where the bench stands, waits for it to go),
//                                tw (the pictograms' clock: slower when less motion is asked for) }
//   grid.failed, grid.down, grid.cycling   conventional chips failed; the system stopped; chips of ours correcting
//   grid.hide()                  everything of the zoom-out hidden (leaving the scene)
//   canvasTex(w, h, draw)        a canvas texture (the close-up's heat and frost use it too)
import * as THREE from 'three';
import { streakField, patternOf } from '../programs/freeform.js';
import { COLOURS } from '../programs/wdm.js';
import { css } from '../kit/colour.js';
import { createFire, createSnow, crossTexture } from './weather.js';

// the grid: cells (17 x 14 apart); the fire and the snow walk along these paths (x from the bench, z)
const COLS = [-2, -1, 0, 1, 2], ROWS = [-1, 0, 1], DX = 17, DZ = 14;
const FIRE_PATH = [[-40, 14], [-34, 14], [-17, 14], [-17, 0], [0, 0], [17, 0], [24, 3]];
const SNOW_PATH = [[40, -14], [34, -14], [17, -14], [0, -14], [-17, -14], [-34, -14], [-41, -11]];
const NODE = { w: 9.6, d: 8.6, h: 0.55, py: 6.4 };          // our chips: the slate; the projector's height above it
const CONVN = { w: 7.4, d: 5.6, h: 0.5 };                     // the conventional chips

const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function radial(stops, size = 256) {
  return canvasTex(size, size, (g) => {
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  });
}

// the etched circuits of the conventional chips (fixed at fabrication): pale ridges, and the coloured light in them
const CIRCUITS = [
  // a splitter tree: one input of all colours, four outputs of one colour each
  (g, W, H, light) => {
    const lane = [0.2, 0.4, 0.6, 0.8].map(f => f * H), mid = H * 0.5, ab = [H * 0.3, H * 0.7];
    const seg = (pts, rgb, w) => { g.strokeStyle = light ? css(rgb) : '#e3d9f0'; g.lineWidth = w; g.beginPath(); g.moveTo(...pts[0]); if (pts.length === 4) g.bezierCurveTo(...pts[1], ...pts[2], ...pts[3]); else g.lineTo(...pts[1]); g.stroke(); };
    const sb = (xa, ya, xb, yb, rgb, w) => seg([[xa, ya], [(xa + xb) / 2, ya], [(xa + xb) / 2, yb], [xb, yb]], rgb, w);
    const all = [1, 0.9, 0.75], w = light ? 7 : 11;
    seg([[0, mid], [W * 0.3, mid]], all, w);
    sb(W * 0.3, mid, W * 0.5, ab[0], [0.75, 0.8, 1], w); sb(W * 0.3, mid, W * 0.5, ab[1], [1, 0.62, 0.4], w);
    sb(W * 0.5, ab[0], W * 0.72, lane[0], COLOURS[0], w); sb(W * 0.5, ab[0], W * 0.72, lane[1], COLOURS[1], w);
    sb(W * 0.5, ab[1], W * 0.72, lane[2], COLOURS[2], w); sb(W * 0.5, ab[1], W * 0.72, lane[3], COLOURS[3], w);
    for (let i = 0; i < 4; i++) seg([[W * 0.72, lane[i]], [W, lane[i]]], COLOURS[i], w);
  },
  // four lanes with couplers between them
  (g, W, H, light) => {
    const y = [0.2, 0.4, 0.6, 0.8].map(f => f * H), w = light ? 7 : 11;
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = light ? css(COLOURS[(i + 1) % 4]) : '#e3d9f0'; g.lineWidth = w;
      g.beginPath(); g.moveTo(0, y[i]);
      const pull = i % 2 ? -1 : 1;
      for (const xc of [0.3, 0.68]) { const x = xc * W; g.lineTo(x - 50, y[i]); g.bezierCurveTo(x - 25, y[i], x - 25, y[i] + pull * H * 0.07, x, y[i] + pull * H * 0.07); g.bezierCurveTo(x + 25, y[i] + pull * H * 0.07, x + 25, y[i], x + 50, y[i]); }
      g.lineTo(W, y[i]); g.stroke();
    }
  },
  // a ring next to a bus, and a second line
  (g, W, H, light) => {
    const w = light ? 7 : 11;
    g.lineWidth = w;
    g.strokeStyle = light ? css(COLOURS[3]) : '#e3d9f0';
    g.beginPath(); g.moveTo(0, H * 0.3); g.lineTo(W, H * 0.3); g.stroke();
    g.beginPath(); g.arc(W * 0.5, H * 0.3 + H * 0.2 + 9, H * 0.2, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = light ? css(COLOURS[2]) : '#e3d9f0';
    g.beginPath(); g.moveTo(0, H * 0.8); g.lineTo(W, H * 0.8); g.stroke();
    g.strokeStyle = light ? css(COLOURS[1]) : '#e3d9f0';
    g.beginPath(); g.moveTo(W * 0.15, H * 0.92); g.bezierCurveTo(W * 0.4, H * 0.92, W * 0.45, H * 0.72, W * 0.85, H * 0.72); g.stroke();
  },
];

export function createGrid(ctx, { walk, downAt }) {
  const { kit, chipAt } = ctx;
  const g = kit.group;
  const many = new THREE.Group(); many.visible = false; g.add(many);
  // (the random pictures - the patterns of our chips, the fibres' pulses, the far snow - come from the scene's seeded
  // kit, in the order the error-correction entry made them, so that they look as they did there)
  const patTex = [0, 1, 2].map(() => {
    const dev = { nz: 100, nx: 256, wx: 0.8, pw: 0.3 };
    const p = patternOf(streakField(100, 128, () => kit.rand()), dev);
    const d = new Uint8Array(100 * 256 * 4);
    for (let s = 0; s < 100; s++) for (let j = 0; j < 256; j++) { const v = Math.round(255 * Math.pow(p[s * 256 + j], 1.4)), o = (j * 100 + s) * 4; d[o] = 0.15 * v; d[o + 1] = v; d[o + 2] = 0.35 * v; d[o + 3] = 255; }
    const t = new THREE.DataTexture(d, 100, 256, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
    return t;
  });
  const ridgeTex = CIRCUITS.map(f => canvasTex(512, 388, (gg, W, H) => { gg.lineCap = 'round'; f(gg, W, H, false); }));
  const lightTex = CIRCUITS.map(f => canvasTex(512, 388, (gg, W, H) => {
    gg.fillStyle = '#000'; gg.fillRect(0, 0, W, H); gg.lineCap = 'round';
    gg.save(); gg.filter = 'blur(6px)'; f(gg, W, H, true); gg.restore();
    f(gg, W, H, true);
  }));
  const haloTex = radial([[0, 'rgba(255,255,255,0)'], [0.62, 'rgba(255,255,255,0)'], [0.74, 'rgba(255,255,255,0.75)'], [1, 'rgba(255,255,255,0)']]);
  const goldTex = radial([[0, 'rgba(255,240,190,1)'], [0.3, 'rgba(255,205,80,0.6)'], [1, 'rgba(255,180,40,0)']], 128);
  const coldTex = radial([[0, 'rgba(170,215,255,0.75)'], [0.5, 'rgba(140,195,255,0.3)'], [1, 'rgba(120,180,255,0)']], 128);
  const cross = crossTexture();
  const geo = {
    slate: new THREE.BoxGeometry(NODE.w, NODE.h, NODE.d), conv: new THREE.BoxGeometry(CONVN.w, CONVN.h, CONVN.d),
    convTop: new THREE.PlaneGeometry(CONVN.w - 0.3, CONVN.d - 0.3).rotateX(-Math.PI / 2),
    pat: new THREE.PlaneGeometry(8.2, 5.6).rotateX(-Math.PI / 2), halo: new THREE.PlaneGeometry(NODE.w + 5, NODE.d + 5).rotateX(-Math.PI / 2),
    body: new THREE.BoxGeometry(1.8, 0.9, 1.5), lens: new THREE.CircleGeometry(0.42, 20).rotateX(Math.PI / 2),
    cone: new THREE.CylinderGeometry(0.45 * Math.SQRT2, 4.4 * Math.SQRT2, NODE.py - 0.45, 4, 1, true).rotateY(Math.PI / 4),
  };
  const mat = {
    convSide: new THREE.MeshStandardMaterial({ color: 0x5d5370, roughness: 0.6, metalness: 0.2 }),
    convTop: new THREE.MeshStandardMaterial({ color: 0x8e7ea6, roughness: 0.5, metalness: 0.05 }),
    slate: new THREE.MeshStandardMaterial({ color: 0xc3cad2, roughness: 0.5, metalness: 0.05 }),
    body: new THREE.MeshStandardMaterial({ color: 0x59636e, roughness: 0.45, metalness: 0.35 }),
    lens: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 1.4, 0.5) }),
  };
  const convTop = mat.convTop.color.clone();
  const nodes = [];
  for (const r of ROWS) for (const c of COLS) {
    const n = new THREE.Group(), x = chipAt.x + c * DX, z = r * DZ, v = (r + 2 * c + 9) % 3;
    n.position.set(x, ctx.y, z);
    // conventional: a lavender chip with its etched circuit; the light in it; a red cross when it has failed
    const conv = new THREE.Group(); n.add(conv);
    const top = mat.convTop.clone();
    const body = new THREE.Mesh(geo.conv, [mat.convSide, mat.convSide, top, mat.convSide, mat.convSide, mat.convSide]);
    body.position.y = CONVN.h / 2; body.castShadow = true; body.receiveShadow = true; conv.add(body);
    const ridge = new THREE.Mesh(geo.convTop, new THREE.MeshBasicMaterial({ map: ridgeTex[v], transparent: true, opacity: 0.8, depthWrite: false }));
    ridge.position.y = CONVN.h + 0.012; ridge.renderOrder = 1; conv.add(ridge);
    const light = new THREE.Mesh(geo.convTop, new THREE.MeshBasicMaterial({ map: lightTex[v], transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    light.position.y = CONVN.h + 0.024; light.renderOrder = 2; conv.add(light);
    const x_ = new THREE.Sprite(new THREE.SpriteMaterial({ map: cross, transparent: true, opacity: 0, depthWrite: false }));
    x_.position.set(0, 3.2, 0); x_.scale.setScalar(0.01); x_.renderOrder = 9; conv.add(x_);
    // ours: the light-grey slate, the green pattern, a small projector with its green light, the health halo, the
    // feedback (a gold packet up to the projector, a gold flash there)
    const ours = new THREE.Group(); n.add(ours);
    const slateM = mat.slate.clone();
    const slate = new THREE.Mesh(geo.slate, slateM); slate.position.y = NODE.h / 2; slate.castShadow = true; slate.receiveShadow = true; ours.add(slate);
    const pat = new THREE.Mesh(geo.pat, new THREE.MeshBasicMaterial({ map: patTex[v], transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    pat.position.y = NODE.h + 0.02; pat.renderOrder = 2; ours.add(pat);
    const proj = new THREE.Mesh(geo.body, mat.body); proj.position.y = NODE.h + NODE.py + 0.45; ours.add(proj);
    const lens = new THREE.Mesh(geo.lens, mat.lens); lens.position.y = NODE.h + NODE.py - 0.01; ours.add(lens);
    const cone = new THREE.Mesh(geo.cone, new THREE.MeshBasicMaterial({ color: 0x2bff5a, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = NODE.h + (NODE.py - 0.45) / 2; cone.renderOrder = 3; ours.add(cone);
    const halo = new THREE.Mesh(geo.halo, new THREE.MeshBasicMaterial({ map: haloTex, color: new THREE.Color(0.55, 1, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.position.y = 0.04; halo.renderOrder = 1; ours.add(halo);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    flash.position.y = NODE.h + NODE.py + 0.45; flash.scale.setScalar(5); flash.renderOrder = 5; ours.add(flash);
    const packet = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    packet.scale.setScalar(2.8); packet.renderOrder = 5; ours.add(packet);
    many.add(n);
    nodes.push({ n, x, z, c, r, d: Math.hypot(c, r), v, conv, top, ridge, light, cross: x_, ours, slateM, pat, cone, halo, flash, packet,
      rise: 0, failed: false, failT: 0, lit: 1, b: 0, bt0: 0, h: 1, ph: 'ok', pt: 0, hit: [false, false] });
  }
  const mid = nodes.find(nd => !nd.c && !nd.r);     // (where our bench stands: shown only once the bench is hidden)

  // the fibres between neighbours: trains of pulses on cables on the table (centre to centre, under the chips)
  const P = kit.P, fib = kit.pulses({ width: 0.3, spacing: 2.2, length: 0.28, speed: 7, y: 0.07, gain: 1.6 });
  const fibres = [];
  const idx = (c, r) => nodes.findIndex(nd => nd.c === c && nd.r === r);
  for (const r of ROWS) for (const c of COLS) {
    const x0 = chipAt.x + c * DX, z0 = r * DZ;
    if (c < 2) fibres.push({ k: fib.add(P.line(x0, z0 + 1.2, x0 + DX, z0 + 1.2), { s0: kit.rand() * 5 }), a: idx(c, r), b: idx(c + 1, r), x: x0 + DX / 2, z: z0 + 1.2, len: DX, along: 'x', pow: 0, shown: -1 });
    if (r < 1) fibres.push({ k: fib.add(P.line(x0 + 2.2, z0, x0 + 2.2, z0 + DZ), { s0: kit.rand() * 5 }), a: idx(c, r), b: idx(c, r + 1), x: x0 + 2.2, z: z0 + DZ / 2, len: DZ, along: 'z', pow: 0, shown: -1 });
  }
  fib.build();
  fib.net.mesh.visible = false;
  const cables = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.06, 0.2), new THREE.MeshStandardMaterial({ color: 0x4a5664, roughness: 0.5, metalness: 0.2 }), fibres.length);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  fibres.forEach((f, i) => {
    pv.set(f.x, ctx.y + 0.03, f.z);
    sv.set(f.along === 'x' ? f.len : 1, 1, 1);
    q4.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.along === 'x' ? 0 : Math.PI / 2);
    cables.setMatrixAt(i, m4.compose(pv, q4, sv));
  });
  cables.instanceMatrix.needsUpdate = true; cables.receiveShadow = true;
  many.add(cables);
  const setFibre = (f, p) => { if (Math.abs(p - f.shown) > 0.01) { f.shown = p; fib.white(f.k, p, { seed: f.k * 7, data: 0.5 }); } };

  // the fire and the snow of the zoom-out (drawn larger), walking through the grid
  const farFire = createFire({ height: 8.2, ground: 5.5 });
  farFire.order(9); g.add(farFire.group); farFire.set(0);
  const farSnow = createSnow({ fall: 9.7, rx: 3.0, rz: 2.1, count: 64, flake: 1.2, cloud: 10, speed: 0.3, rand: () => kit.rand() });
  farSnow.order(10); g.add(farSnow.group); farSnow.set(0);
  const coldPool = new THREE.Mesh(new THREE.PlaneGeometry(13, 13).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: coldTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  coldPool.renderOrder = 8; coldPool.visible = false; g.add(coldPool);
  const route = pts => {
    const p = pts.map(([x, z]) => [chipAt.x + x, z]), L = [0];
    for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    const len = L[L.length - 1], out = [0, 0];
    return { len, at(s) {
      s = Math.max(0, Math.min(len, s));
      let i = 1; while (i < p.length - 1 && L[i] < s) i++;
      const f = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
      out[0] = p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f; out[1] = p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f;
      return out;
    } };
  };
  const icons = [{ route: route(FIRE_PATH), s: 0, on: 0, x: 0, z: 0 }, { route: route(SNOW_PATH), s: 0, on: 0, x: 0, z: 0 }];

  // labels of the zoom-out: whether the system works, and what the chips are.  The state labels are made first:
  // table.js's cullLabels keeps the first label it places, and on a phone, where the two meet, the state is the point
  // (the chips' kind is in the caption: "Conventional chips ...", "Chips written by light ...")
  const lDown = ctx.label('lbl.sysDown', 'callout'), lOk = ctx.label('lbl.sysOk', 'callout');
  const lConv = ctx.label('lbl.conv', 'callout'), lOurs = ctx.label('lbl.ours', 'callout program');
  const style = (l, { border, color, bg, accent, big }) => {
    const sp = l.el.querySelector('span');
    if (border) sp.style.borderColor = border;
    if (color) sp.style.color = color;
    if (bg) sp.style.background = bg;
    if (big) { sp.style.fontSize = 'calc(17px * var(--s, 1))'; sp.style.fontWeight = '700'; sp.style.padding = '5px 14px'; }
    if (accent) l.el.style.setProperty('--accent', accent);
  };
  style(lConv, { border: 'rgba(200, 182, 236, 0.85)', color: '#efe8fb', accent: '#c8b6ec' });
  style(lDown, { border: '#ff5a4a', color: '#ffe2de', bg: 'rgba(72, 12, 10, 0.92)', accent: '#ff5a4a', big: true });
  style(lOk, { border: 'rgba(255, 255, 255, 0.7)', color: '#ffffff', accent: '#e8f4ff', big: true });
  // (in the empty band of table in front of the grid: clear of the chips and of the fire and snow walking over them)
  lConv.at(chipAt.x - 13, ctx.y + 0.1, DZ + 9); lOurs.at(chipAt.x - 13, ctx.y + 0.1, DZ + 9);
  lDown.at(chipAt.x + 13, ctx.y + 0.1, DZ + 9); lOk.at(chipAt.x + 13, ctx.y + 0.1, DZ + 9);
  const farLabels = [lDown, lOk, lConv, lOurs];
  for (const l of farLabels) l.show(false);

  // the grid's state: conventional chips failed, the system stopped (and since when)
  const st = { failed: 0, down: false, downT: 0 };
  // the grid, back to its start: conventional chips, all working
  const resetGrid = () => {
    st.failed = 0; st.down = false; st.downT = 0;
    for (const nd of nodes) {
      nd.failed = false; nd.failT = 0; nd.lit = 1; nd.b = 0; nd.h = 1; nd.ph = 'ok'; nd.pt = 0; nd.hit[0] = nd.hit[1] = false; nd.rise = 0;
      nd.top.color.copy(convTop); nd.cross.material.opacity = 0; nd.cross.scale.setScalar(0.01);
    }
    for (const f of fibres) { f.pow = 0; setFibre(f, 0); }
    for (const ic of icons) { ic.s = 0; ic.on = 0; }
  };
  // the walk of the fire and the snow: where they are, how visible; the chips they reach
  const walkIcons = (raw, part, T) => {
    const W = walk[part];
    for (let i = 0; i < 2; i++) {
      const ic = icons[i], t0 = W.t0 + (i ? W.lag : 0);
      if (T >= t0) ic.s += raw * W.v;
      const end = ic.route.len;
      ic.on = T < t0 ? 0 : Math.min(1, ic.s / 5, (end - ic.s) / 5);
      const p = ic.route.at(ic.s); ic.x = p[0]; ic.z = p[1];
      if (ic.on > 0.5) for (const nd of nodes) {
        if (nd.hit[i] || Math.hypot(ic.x - nd.x, ic.z - nd.z) > 4.6) continue;
        nd.hit[i] = true;
        if (part === 'conv') { if (!nd.failed) { nd.failed = true; nd.failT = 0; st.failed++; } }
        else if (nd.ph === 'ok') { nd.ph = 'drop'; nd.pt = 0; }
      }
    }
  };

  return {
    group: many,
    reset: resetGrid,
    begin(part) {
      if (part === 'conv') resetGrid();
      else if (part === 'many') {
        for (const nd of nodes) { nd.bt0 = 0.15 + 0.14 * (nd.c + 2) + 0.07 * (nd.r + 1); nd.hit[0] = nd.hit[1] = false; nd.h = 1; nd.ph = 'ok'; }
        for (const ic of icons) { ic.s = 0; ic.on = 0; }
      }
    },
    get failed() { return st.failed; },
    get down() { return st.down; },
    get cycling() { let n = 0; for (const nd of nodes) if (nd.ph !== 'ok') n++; return n; },
    hide() {
      many.visible = false; fib.net.mesh.visible = false; farFire.set(0); farSnow.set(0); coldPool.visible = false;
      for (const l of farLabels) l.show(false);
    },
    update(raw, t, camera, pointScale, { part, partT, manyK, near, tw }) {
      many.visible = manyK > 0.01;
      fib.net.mesh.visible = many.visible;
      if (part === 'conv' || part === 'many') walkIcons(raw, part, partT);
      else for (const ic of icons) ic.on = Math.max(0, ic.on - raw * 3);
      // the fire and the snow of the zoom-out
      const fk = many.visible ? icons[0].on : 0, sk = many.visible ? icons[1].on : 0;
      farFire.set(fk); farFire.group.position.set(icons[0].x, ctx.y + 0.62, icons[0].z); farFire.tick(tw, camera);
      farSnow.set(sk); farSnow.group.position.set(icons[1].x, ctx.y + 10.3, icons[1].z); farSnow.tick(tw, camera, pointScale);
      coldPool.visible = sk > 0.01; coldPool.material.opacity = 0.8 * sk; coldPool.position.set(icons[1].x, ctx.y + 0.64, icons[1].z);
      // the system stops when most conventional chips have failed
      if (part === 'conv' && !st.down && st.failed >= downAt) { st.down = true; st.downT = 0; }
      if (st.down) st.downT += raw;
      const ourK = part === 'many' || part === 'back';
      lDown.show(part === 'conv' && st.down && st.downT > 0.5);
      lOk.show(part === 'many' && partT > 2.0);
      lConv.show(part === 'conv' && manyK > 0.8);
      lOurs.show(part === 'many' && partT > 1.0);
      if (!many.visible) return;
      for (const nd of nodes) {
        // they rise into view, nearest first (the middle one once the bench is hidden)
        const kr = nd === mid && near ? 0 : clamp01(manyK * 2.2 - nd.d * 0.35);
        nd.rise += (kr - nd.rise) * Math.min(1, raw * 7);
        nd.n.visible = nd.rise > 0.02;
        nd.n.scale.setScalar(0.001 + 0.999 * ease(nd.rise));
        // conventional -> ours: a wave across the grid when many begins
        if (part === 'many') nd.b = clamp01((partT - nd.bt0) / 0.6);
        else if (!ourK) nd.b = 0;
        const kc = 1 - ease(Math.min(1, nd.b * 2)), ko = ease(Math.max(0, nd.b * 2 - 1));
        nd.conv.visible = kc > 0.001; nd.conv.scale.setScalar(Math.max(0.001, kc));
        nd.ours.visible = ko > 0.001; nd.ours.scale.setScalar(Math.max(0.001, ko));
        // a conventional chip that has failed: its light flickers out (fades out, when less motion is asked for: no
        // flicker), a red cross; with the system down, the others go dark too (no signal reaches them)
        if (nd.failed) nd.failT += raw;
        const want = nd.failed ? 0 : st.down ? 0.12 : 1;
        if (nd.failed && nd.failT < 0.5) nd.lit = (1 - nd.failT / 0.5) * (kit.reduced ? 1 : 0.55 + 0.45 * Math.sin(nd.failT * 70));
        else nd.lit += (want - nd.lit) * Math.min(1, raw * 3);
        nd.light.material.opacity = Math.max(0, nd.lit);
        const dk = nd.failed ? 0.45 : st.down ? 0.7 : 1;
        nd.top.color.copy(convTop).multiplyScalar(dk);
        const cs = nd.failed ? ease(clamp01((nd.failT - 0.2) / 0.25)) * (1 + 0.25 * Math.sin(Math.PI * clamp01((nd.failT - 0.2) / 0.5))) : 0;
        nd.cross.material.opacity = Math.min(1, cs); nd.cross.scale.setScalar(Math.max(0.01, 4.6 * cs));
        // ours: each keeps correcting itself - it dims, the error goes up to its projector (a gold packet), a
        // flash there, a new pattern, it glows again
        if (ko > 0.001) {
          nd.pt += raw;
          let fl = 0, pk = -1;
          if (nd.ph === 'drop') { nd.h = Math.max(0.1, nd.h - raw * 1.8); if (nd.pt > 1.0) { nd.ph = 'feed'; nd.pt = 0; } }
          else if (nd.ph === 'feed') { pk = nd.pt / 0.5; if (nd.pt > 0.5) { nd.ph = 'fix'; nd.pt = 0; nd.v = (nd.v + 1) % 3; nd.pat.material.map = patTex[nd.v]; } }
          else if (nd.ph === 'fix') { nd.h = Math.min(1, nd.h + raw * 0.75); fl = Math.max(0, 1 - nd.pt / 0.8); if (nd.h >= 1) { nd.ph = 'ok'; nd.pt = 0; } }
          nd.flash.material.opacity = fl;
          nd.packet.material.opacity = pk >= 0 ? 1 : 0;
          if (pk >= 0) nd.packet.position.set(3.6 * (1 - pk), NODE.h + 0.3 + (NODE.py + 0.15) * ease(pk), 0);
          const hh = nd.h * nd.h, written = Math.max(0, 1 - (partT - nd.bt0 - 0.3) / 0.9);
          nd.halo.material.opacity = 0.3 * hh * ko;
          const sh = 0.24 + 0.56 * hh;
          nd.slateM.color.setRGB(0.765 * sh, 0.792 * sh, 0.824 * sh);
          nd.pat.material.opacity = 0.14 + 0.46 * hh;
          nd.cone.material.opacity = 0.02 + 0.05 * hh + 0.12 * fl + (part === 'many' ? 0.14 * clamp01(written) : 0);
        }
      }
      // the fibres: dark where a chip has failed or the system is down (conventional); lit between our chips
      cables.visible = manyK > 0.55;
      for (const f of fibres) {
        const A = nodes[f.a], B = nodes[f.b];
        let want;
        if (A.rise < 0.6 || B.rise < 0.6 || !cables.visible) want = 0;
        else if (ourK) want = A.b >= 0.5 && B.b >= 0.5 ? 0.9 : 0;
        else want = !st.down && !A.failed && !B.failed ? 0.9 : 0;
        f.pow += (want - f.pow) * Math.min(1, raw * (want > f.pow ? 2.5 : 5));
        setFibre(f, f.pow);
      }
    },
  };
}

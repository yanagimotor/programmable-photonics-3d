// The set-up around the colour router (programs/wdm.js) for tab 3's in situ story (apps/insitu.js):
// a light source with four colours (left), four detectors at the outputs (right, each with a light showing what
// arrives), a board, and the feedback cable from the detectors up to the projector's side, along which the error
// travels at every step (a gold packet; when it arrives, the pattern changes).
// The board (the router's job as arrows): "Target", the function we want - one input carrying the
// four colours, an arrow of each colour to its output (outputs top to bottom as on the chip seen from the camera);
// "Now", what the chip does - a ribbon from the input to each output, as thick as the light arriving there, striped
// with its colours, a tick or a cross per output; the match, big, green at the goal; the match over the steps.
//
//   const rig = createRig(ctx, { boardAt, goal })   ctx: the scene's context (apps/index.js); goal: the match at
//                                       which the board turns green
//   rig.prog()                          the bench's colour router (null while another program is on the chip)
//   rig.st                              { target, step, hist } (what the board shows)
//   rig.restart({ target, fade, draw }) a dark pattern again (no illumination), and the light through it; the
//                                       target's arrows draw themselves on the board when the target is new (draw:
//                                       true, always)
//   rig.correct(raw, { tf, ts })        call every frame while the chip corrects itself: the outputs are measured,
//                                       the error leaves the detectors, reaches the projector after tf seconds, the
//                                       pattern changes (one step of in situ inverse design), and after ts seconds
//                                       the next; returns true on the frame of a step
//   rig.idle()                          no packet on the cable
//   rig.blank()                         the board drawn blank at once (nothing measured yet), e.g. on entering again
//   rig.layout(tall)                    the board beside the detectors, or (tall: a portrait screen) above the set-up,
//                                       as wide as it; rig.boxTall is the view's box then
//   rig.labels(on)                      the labels Input / Output / Feedback
//   rig.show(on)                        the whole set-up (source, detectors, board, cable, labels) shown or hidden
//                                       (zoom-outs)
//   rig.box                             the set-up's box for a view, [[x0, y0, z0], [x1, y1, z1]] (world): from the
//                                       source to the board, from below the table to the projector's top (y about
//                                       12.2), as deep as the projector - seen from the front at 25-35 degrees the
//                                       chip's slate projects inside it, and no empty far corner widens the view
//   rig.tick(t)                         every frame: the detectors' lights, the cable, the board
//   (also rig.Y, srcX, detX, board, curve, purity(P, q, c))
import { COLOURS, WARM, FAR, meta as WDM } from '../programs/wdm.js';
import { lin, css } from '../kit/colour.js';

const PROJ_Y = 10.6;                     // the projector body's height on the bench (bench.js)
const GOLD = [1.0, 0.8, 0.3];
const MUTED = [0.62, 0.68, 0.74], GREEN = [0.4, 1, 0.6], AMBER = [0.98, 0.8, 0.36], RED = [1, 0.42, 0.36];
const WARM_L = lin(WARM), LCOL = COLOURS.map(lin);
const BW = 8.4, BH = 6.4;                // the board (world units)
const EMPTY = 0.037;                     // an output that gets less light than this (one colour = 1) gets nothing:
                                         // drawn as a dotted line with a cross (the board's "nothing arrives")
const CABLE_VS = /* glsl */ `
varying float vU;
void main() { vU = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// the feedback cable: dim gold, with a bright packet at uHead (0 at the detectors, 1 at the projector) and a tail
const CABLE_FS = /* glsl */ `
uniform float uHead, uOn, uTime;
uniform vec3 uCol;
varying float vU;
void main() {
  float d = (vU - uHead) / 0.028;
  float packet = uOn * (exp(-d * d) * 4.5 + 0.3 * exp(max(-8.0, d * 0.22)) * step(vU, uHead));
  float idle = 0.2 + 0.06 * sin(vU * 60.0 - uTime * 3.0);
  gl_FragColor = vec4(uCol * (idle + packet), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

export function createRig(ctx, { boardAt = null, goal = 0.95 } = {}) {
  const { THREE, kit, bench, chipAt } = ctx;
  const g = new THREE.Group();                     // the whole set-up (rig.show hides it for zoom-outs)
  kit.group.add(g);
  const Y = ctx.y + bench.S.h;                     // the slate's top
  const prog = () => (bench.current && bench.current.id === 'wdm' ? bench.current : null);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.35, ...o });
  // the program's scale on the slate (as bench.make computes it)
  const SC = Math.min((bench.S.w - 0.3) / WDM.size.w, (bench.S.d - 1.2) / WDM.size.d);
  const glowTex = stops => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const gg = c.getContext('2d'), gr = gg.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    gg.fillStyle = gr; gg.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  // ---------------------------------------------------------------- the light source: a box with a bright window
  const srcX = chipAt.x - FAR * SC - 0.05;
  const src = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), std(0x3a424c));
  src.position.set(srcX - 0.8, Y + 0.05, 0); src.castShadow = true; g.add(src);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6), toneMapped: false }));
  win.rotation.y = Math.PI / 2; win.position.set(srcX + 0.01, Y + 0.06, 0); g.add(win);

  // ---------------------------------------------------------------- the detectors: one per output, a light on top
  // and a face showing what arrives
  const detX = chipAt.x + FAR * SC + 0.05;
  const house = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 4.6), std(0x3a424c));
  house.position.set(detX + 0.5, Y + 0.1, 0); house.castShadow = true; g.add(house);
  const lamp = () => { const m = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })); m.position.set(detX + 0.5, Y + 0.76, 0); g.add(m); return m; };
  const leds = [0, 1, 2, 3].map(lamp);
  const faces = [0, 1, 2, 3].map(() => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.78), new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false }));
    m.rotation.y = -Math.PI / 2; m.position.set(detX - 0.005, Y + 0.1, 0); g.add(m);
    return m;
  });

  // ---------------------------------------------------------------- the board, to the right of the detectors
  const bAt = boardAt || [detX + 1.3 + BW / 2, Y + 0.15 + BH / 2, 0.6];
  const board = kit.plate({ w: BW, h: BH, at: bAt, title: '', res: 896 });
  g.add(board.object);                             // (in the set-up's group, so that rig.show hides it too)
  // on a portrait screen (a phone) the board stands above the set-up instead, as wide as the set-up (from the source
  // to the detectors), in the band a portrait view would leave empty: beside the detectors its words were a few pixels
  // tall there (rig.layout, rig.boxTall).  It faces the camera (seen from 34 degrees up its top leans back by about
  // 3.4): it stands far enough forward that all of it is in front of the projector's rod (z -0.6), and high enough
  // that its lower edge clears the projector (and the cable's end, where the gold flash comes) - measured on a 390 x
  // 844 phone: the board's lower edge about 10 px above the projector's top
  const TX0 = srcX - 1.75, TX1 = detX + 1.2, sTall = (TX1 - TX0) / BW, hTall = BH * sTall;
  const bAtTall = [(TX0 + TX1) / 2, Y + 23.0, 3.7];
  const yTallTop = bAtTall[1] + hTall / 2 * Math.cos(34 * Math.PI / 180);       // (its top edge, leaning back)

  // ---------------------------------------------------------------- the feedback cable: from the detectors (the back
  // of their top) up to the projector's side - below the projector's top (no loop over it), behind the board's plane
  // and clear of its left edge
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(detX + 0.5, Y + 0.76, -1.4), new THREE.Vector3(detX + 0.7, Y + 2.4, -2.6),
    new THREE.Vector3(detX - 1.1, Y + 6.6, -2.4), new THREE.Vector3(chipAt.x + 3.3, Y + 9.9, -1.0),
    new THREE.Vector3(chipAt.x + 1.62, Y + PROJ_Y - 0.1, -0.3)]);
  const cableU = { uHead: { value: 0 }, uOn: { value: 0 }, uTime: { value: 0 }, uCol: { value: new THREE.Vector3(...lin(GOLD)) } };
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.085, 8), new THREE.ShaderMaterial({ uniforms: cableU, vertexShader: CABLE_VS, fragmentShader: CABLE_FS })));
  const goldTex = glowTex([[0, 'rgba(255,250,225,1)'], [0.22, 'rgba(255,214,110,0.9)'], [0.55, 'rgba(255,180,60,0.28)'], [1, 'rgba(255,160,40,0)']]);
  const sprite = (scale) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: goldTex, color: new THREE.Color(1.6, 1.25, 0.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.setScalar(scale); s.renderOrder = 9; g.add(s);
    return s;
  };
  const packet = sprite(1.25), arrive = sprite(2.0);
  curve.getPointAt(1, arrive.position);
  const mid = curve.getPointAt(0.5);

  const lIn = ctx.label('lbl.input', 'callout light'); lIn.at(srcX - 0.8, Y + 0.72, 0);
  const lOut = ctx.label('lbl.output', 'callout light below'); lOut.at(detX + 0.5, Y - 0.45, 2.3);
  const lFb = ctx.label('lbl.feedback', 'callout feedback'); lFb.at(mid.x, mid.y, mid.z);

  const st = { target: [2, 0, 3, 1], step: 0, hist: [] };
  const IV = [0, 0, 0, 0];                         // which colour should leave through each output
  const inv = () => { for (let c = 0; c < 4; c++) IV[st.target[c]] = c; return IV; };
  const purity = (P, q, c) => { let s = 0; for (let k = 0; k < 4; k++) s += P[k][q]; return s > 1e-9 ? P[c][q] / s : 0; };

  // ---------------------------------------------------------------- the board's drawing
  // what is drawn eases towards what is measured, so that the ribbons and the number move smoothly
  const B = { Pd: [0, 1, 2, 3].map(() => [0, 0, 0, 0]), md: 0, tk: 1, pop: [0, 0, 0, 0], ok: [false, false, false, false], dirty: true, acc: 0, fresh: true };
  const bez = (x0, y0, x1, y1, t, o) => {          // a cubic from (x0, y0) to (x1, y1), level at both ends
    const xm = (x0 + x1) / 2, u = 1 - t;
    o[0] = u * u * u * x0 + 3 * u * u * t * xm + 3 * u * t * t * xm + t * t * t * x1;
    o[1] = u * u * u * y0 + 3 * u * u * t * y0 + 3 * u * t * t * y1 + t * t * t * y1;
    return o;
  };
  const pt = [0, 0], pt2 = [0, 0];
  const head = (gg, x, y, dx, dy, size, rgb) => {   // an arrowhead at (x, y), pointing along (dx, dy)
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    gg.fillStyle = css(rgb);
    gg.beginPath();
    gg.moveTo(x + ux * size * 0.55, y + uy * size * 0.55);
    gg.lineTo(x - ux * size * 0.45 - uy * size * 0.5, y - uy * size * 0.45 + ux * size * 0.5);
    gg.lineTo(x - ux * size * 0.45 + uy * size * 0.5, y - uy * size * 0.45 - ux * size * 0.5);
    gg.closePath(); gg.fill();
  };
  const mark = (gg, x, y, s, ok) => {               // a tick or a cross, drawn
    gg.save();
    gg.lineCap = 'round'; gg.lineJoin = 'round'; gg.lineWidth = s * 0.2;
    gg.strokeStyle = css(ok ? GREEN : RED); gg.shadowColor = css(ok ? GREEN : RED, 0.8); gg.shadowBlur = ok ? 12 : 0;
    gg.beginPath();
    if (ok) { gg.moveTo(x - s * 0.42, y + s * 0.02); gg.lineTo(x - s * 0.12, y + s * 0.32); gg.lineTo(x + s * 0.45, y - s * 0.36); }
    else { gg.moveTo(x - s * 0.3, y - s * 0.3); gg.lineTo(x + s * 0.3, y + s * 0.3); gg.moveTo(x + s * 0.3, y - s * 0.3); gg.lineTo(x - s * 0.3, y + s * 0.3); }
    gg.stroke();
    gg.restore();
  };
  // one diagram: the input (four colours in one) on the left, the four outputs on the right; 'target': an arrow of
  // each colour to its output; 'now': a ribbon to each output, as thick as the light arriving, striped by colour
  const diagram = (gg, r, now, lab) => {
    const iv = inv();
    const xin0 = r.x, xin1 = r.x + r.w * 0.17, ym = r.y + r.h / 2;
    const xo = r.x + r.w * (now ? 0.72 : 0.83);
    const yo = q => r.y + r.h * (0.09 + 0.82 * (3 - q) / 3);
    // the outputs: small sockets
    const sw = r.w * 0.055, sh = r.h * 0.15;
    gg.save();
    gg.lineWidth = 3; gg.strokeStyle = 'rgba(200,214,228,0.75)'; gg.fillStyle = 'rgba(58,66,76,0.95)';
    for (let q = 0; q < 4; q++) { gg.beginPath(); gg.roundRect(xo + 4, yo(q) - sh / 2, sw, sh, 6); gg.fill(); gg.stroke(); }
    gg.restore();
    // the input: the four colours together (stacked as their outputs are, so that nothing crosses)
    const bt = r.h * 0.03, yc = c => ym + (3 - st.target[c] - 1.5) * bt;
    gg.save();
    gg.lineCap = 'butt';
    for (let c = 0; c < 4; c++) { gg.strokeStyle = css(COLOURS[c]); gg.lineWidth = bt + 0.6; gg.beginPath(); gg.moveTo(xin0, yc(c)); gg.lineTo(xin1, yc(c)); gg.stroke(); }
    gg.restore();
    gg.save();
    gg.lineCap = 'butt'; gg.lineJoin = 'round';
    const N = 30;
    if (!now) {
      const k = B.tk, lw = r.h * 0.034, hs = r.h * 0.085;
      for (let c = 0; c < 4; c++) {
        const q = st.target[c], y0 = yc(c), y1 = yo(q), x1 = xo - hs * 0.5;
        const tEnd = Math.max(0.001, Math.min(1, k * 1.15 - c * 0.05));
        gg.strokeStyle = css(COLOURS[c]); gg.lineWidth = lw;
        gg.beginPath(); gg.moveTo(xin1 - 1, y0);
        for (let i = 1; i <= N; i++) { bez(xin1, y0, x1, y1, tEnd * i / N, pt); gg.lineTo(pt[0], pt[1]); }
        gg.stroke();
        bez(xin1, y0, x1, y1, Math.max(0, tEnd - 0.02), pt2);
        head(gg, pt[0], pt[1], pt[0] - pt2[0], pt[1] - pt2[1], hs, COLOURS[c]);
      }
    } else if (lab) {
      const TH = r.h * 0.105;                       // the thickness of one colour's full light
      for (let q = 0; q < 4; q++) {
        let T = 0, mx = 0, rr = 0, gr = 0, bl = 0;
        for (let c = 0; c < 4; c++) { const a = B.Pd[c][q]; T += a; mx = Math.max(mx, a); rr += a * COLOURS[c][0]; gr += a * COLOURS[c][1]; bl += a * COLOURS[c][2]; }
        const hs = Math.max(r.h * 0.07, T * TH + 12), y1 = yo(q), x1 = xo - hs * 0.55;
        // (nothing arrives: a faint dotted line, and a cross - the colour this output should get is not there; with
        // the dark pattern of the goal the fan reaches only the middle two outputs)
        if (T < EMPTY) {
          gg.save(); gg.setLineDash([4, 8]); gg.strokeStyle = 'rgba(190,205,220,0.35)'; gg.lineWidth = 2;
          gg.beginPath(); gg.moveTo(xin1, ym); for (let i = 1; i <= N; i++) { bez(xin1, ym, x1, y1, i / N, pt); gg.lineTo(pt[0], pt[1]); } gg.stroke(); gg.restore();
          mark(gg, r.x + r.w * 0.93, y1, r.h * 0.12, false);
          continue;
        }
        let off = -T * TH / 2;
        for (let k = 3; k >= 0; k--) {                    // stripes stacked as the input's
          const c = iv[k], w = B.Pd[c][q] * TH;
          if (w > 0.6) {
            const o = off + w / 2;
            gg.strokeStyle = css(COLOURS[c]); gg.lineWidth = w + 0.6;
            gg.beginPath(); gg.moveTo(xin1 - 1, ym + o * 0.25);
            for (let i = 1; i <= N; i++) { const t = i / N; bez(xin1, ym, x1, y1, t, pt); gg.lineTo(pt[0], pt[1] + o * (0.25 + 0.75 * t)); }
            gg.stroke();
          }
          off += w;
        }
        // the arrowhead: the colour arriving if it is one, yellow-white while they are mixed
        const m = Math.max(rr, gr, bl, 1e-9), hue = [rr / m, gr / m, bl / m];
        const tip = mixc(hue, WARM, sstep(0.12, 0.7, (T - mx) / Math.max(3 * mx, 1e-9)));
        head(gg, x1 + 2, y1, 1, 0, hs, tip);
        const ok = B.ok[q], s = r.h * 0.12 * (1 + 0.55 * B.pop[q]);
        mark(gg, r.x + r.w * 0.93, y1, s, ok);
      }
    }
    gg.restore();
  };
  const drawBoard = (gg, box, W, H) => {
    const words = ctx.words(), p = prog(), lab = p ? p.inst.lab : null;
    const M = W * 0.04, ts = Math.round(H * 0.062), half = W / 2;
    kit.draw.text(gg, words('lbl.target'), M, M + ts, { size: ts, rgb: MUTED, weight: 700 });
    kit.draw.text(gg, words('lbl.now'), half + M * 0.5, M + ts, { size: ts, rgb: MUTED, weight: 700 });
    const top = M + ts * 1.55, bot = H * 0.6;
    gg.save(); gg.strokeStyle = 'rgba(160,185,210,0.2)'; gg.lineWidth = 2;
    gg.beginPath(); gg.moveTo(half, M * 0.6); gg.lineTo(half, bot + M * 0.2); gg.moveTo(M, H * 0.635); gg.lineTo(W - M, H * 0.635); gg.stroke(); gg.restore();
    diagram(gg, { x: M, y: top, w: half - 1.5 * M, h: bot - top }, false, lab);
    diagram(gg, { x: half + 0.5 * M, y: top, w: half - 1.5 * M, h: bot - top }, true, lab);
    // the match: big, green at the goal; the step, small
    const m = B.md, rgb = mixc(AMBER, GREEN, sstep(goal - 0.06, goal, m));
    const ls = Math.round(H * 0.058), big = Math.round(H * 0.15), yb = H * 0.695 + big * 0.86;
    kit.draw.text(gg, words('lbl.match'), M, H * 0.695, { size: ls, rgb: MUTED, weight: 700 });
    kit.draw.text(gg, `${Math.round(100 * m)}%`, M - 4, yb, { size: big, rgb, weight: 800 });
    kit.draw.text(gg, `${words('lbl.step')} ${st.step}`, W - M, yb, { size: Math.round(H * 0.052), rgb: [0.78, 0.82, 0.88], weight: 700, align: 'right' });
    // the match over the steps, across the board
    const cy0 = H * 0.845, cy1 = H * 0.955, cx0 = M, cx1 = W - M, n = Math.max(30, st.hist.length - 1);
    gg.save();
    gg.strokeStyle = 'rgba(160,185,210,0.28)'; gg.lineWidth = 2;
    gg.beginPath(); gg.moveTo(cx0, cy1); gg.lineTo(cx1, cy1); gg.stroke();
    gg.setLineDash([6, 8]); gg.strokeStyle = css(GREEN, 0.3);
    gg.beginPath(); gg.moveTo(cx0, cy0); gg.lineTo(cx1, cy0); gg.stroke(); gg.setLineDash([]);
    if (st.hist.length) {
      const X = i => cx0 + (cx1 - cx0) * i / n, Yv = v => cy1 - (cy1 - cy0) * Math.max(0, Math.min(1, v));
      const L = st.hist.length - 1;
      gg.beginPath(); gg.moveTo(X(0), cy1);
      st.hist.forEach((v, i) => gg.lineTo(X(i), Yv(i === L ? m : v)));
      gg.lineTo(X(L), cy1); gg.closePath(); gg.fillStyle = css(rgb, 0.16); gg.fill();
      gg.beginPath();
      st.hist.forEach((v, i) => { if (i) gg.lineTo(X(i), Yv(i === L ? m : v)); else gg.moveTo(X(i), Yv(v)); });
      gg.strokeStyle = css(rgb); gg.lineWidth = 6; gg.lineJoin = 'round'; gg.stroke();
      gg.fillStyle = css(rgb); gg.beginPath(); gg.arc(X(L), Yv(m), 9, 0, Math.PI * 2); gg.fill();
    }
    gg.restore();
  };
  board.draw(drawBoard);

  const tmp = new THREE.Color();
  const loop = { packet: -1, t: 0 };
  const shown = { on: true, labels: true, tall: false };
  const flash = { det: 0, proj: 0, last: null };
  const rig = {
    prog, st, Y, srcX, detX, board, curve, purity,
    lab: () => { const p = prog(); return p ? p.inst.lab : null; },
    restart({ target = st.target, fade = 0.9, draw = false } = {}) {
      const p = prog();
      if (!p) return;
      if (draw || target.join() !== st.target.join() || B.fresh) B.tk = kit.reduced ? 1 : 0;      // the arrows draw in
      B.fresh = false;
      st.target = target.slice();
      const lab = p.inst.lab;
      lab.target = st.target.slice();
      lab.env.fill(0);
      lab.reset(); lab.forward();
      p.inst.showPattern({ fade }); p.inst.showLight({ fade: Math.min(0.6, fade) });
      st.step = 0; st.hist = [lab.match];
      loop.packet = -1; loop.t = 0;
      B.dirty = true;
    },
    correct(raw, { tf = 0.4, ts = 0.2 } = {}) {
      const p = prog();
      if (!p) return false;
      const lab = p.inst.lab;
      // (the time a frame runs past the packet's arrival counts towards the next pause, and past the pause towards
      // the packet's run: on a slow computer each step would otherwise take a frame longer - 1.5 s over the in situ
      // story at 25 frames a second)
      if (loop.packet >= 0) {
        loop.packet += raw / tf;
        if (loop.packet >= 1) {
          loop.t = Math.min(ts, (loop.packet - 1) * tf); loop.packet = -1;
          lab.learn(); lab.forward();
          p.inst.showPattern({ fade: Math.min(0.4, ts + 0.15), flash: 1 }); p.inst.showLight({ fade: Math.min(0.35, ts + 0.1) });
          st.step++; st.hist.push(lab.match);
          if (st.hist.length > 120) st.hist.shift();
          if (!kit.reduced) flash.proj = 1;          // (less motion asked for: no flash at the projector, about 3 a
          B.dirty = true;                            // second in the quick beat; the packet still runs)
          return true;
        }
      } else {
        loop.t += raw;
        // the outputs are measured (the detectors flash, not under less motion), the error leaves
        if (loop.t >= ts) { loop.packet = Math.min(0.99, (loop.t - ts) / tf); if (!kit.reduced) flash.det = 1; }
      }
      return false;
    },
    idle() { loop.packet = -1; loop.t = 0; },
    // the board blank, drawn at once - nothing measured yet (no ribbons, no marks, 0 %), the step and the curve as
    // rig.st has them: a scene that is entered again starts from it, not from the last visit's result (tick does
    // not draw the board while the router is not on the chip)
    blank() {
      B.md = 0;
      for (let c = 0; c < 4; c++) for (let q = 0; q < 4; q++) B.Pd[c][q] = 0;
      for (let q = 0; q < 4; q++) { B.ok[q] = false; B.pop[q] = 0; }
      B.dirty = true;
      board.draw(null);
    },
    // the board beside the detectors (landscape), or above the set-up (portrait: a phone); the view's box goes along
    // (rig.box, rig.boxTall)
    layout(tall) {
      if (tall === shown.tall) return;
      shown.tall = tall;
      board.object.position.set(...(tall ? bAtTall : bAt));
      board.object.scale.setScalar(tall ? sTall : 1);
    },
    labels(on) { shown.labels = on; for (const l of [lIn, lOut, lFb]) l.show(on && shown.on); },
    // the whole set-up (source, detectors, board, cable, labels) hidden or shown, for zoom-outs
    show(on) { shown.on = on; g.visible = on; for (const l of [lIn, lOut, lFb]) l.show(on && shown.labels); },
    // the set-up's box for a view (table.js fits its corners into the screen): from the source to the board, from
    // below the table to the projector's top; only as deep as the projector, so that its corners hug what is seen -
    // seen from the front at 25-35 degrees the slate's near and far edges project inside it (its near edge thanks to
    // y0 below the table), and its far corners do not spread the view
    box: [[srcX - 1.75, ctx.y - 1.0, -1.3], [bAt[0] + BW / 2 + 0.2, Y + 11.65, 1.3]],
    // (portrait: from the source to the detectors, from below the table to the board's top above the set-up)
    boxTall: [[TX0, ctx.y - 1.0, -1.3], [TX1, yTallTop, 1.3]],
    tick(t) {
      const dt = flash.last == null ? 0 : Math.min(0.1, Math.max(0, t - flash.last));
      flash.last = t;
      cableU.uTime.value = t;
      cableU.uHead.value = Math.max(0, loop.packet);
      cableU.uOn.value = loop.packet >= 0 ? 1 : 0;
      packet.material.opacity = loop.packet >= 0 ? 1 : 0;
      if (loop.packet >= 0) curve.getPointAt(Math.min(1, loop.packet), packet.position);
      flash.det = Math.max(0, flash.det - dt / 0.3);
      flash.proj = Math.max(0, flash.proj - dt / 0.45);
      arrive.material.opacity = flash.proj;
      const p = prog();
      if (!p) { for (let q = 0; q < 4; q++) { faces[q].material.color.setRGB(0, 0, 0); leds[q].material.color.setRGB(0, 0, 0); } return; }
      const lab = p.inst.lab, s = p.s;
      // the board: ease what is drawn towards what is measured; redraw while something moves (at most 12 a second)
      let moving = B.dirty;
      const k = Math.min(1, dt * 7);
      for (let c = 0; c < 4; c++) for (let q = 0; q < 4; q++) {
        const d = lab.P[c][q] - B.Pd[c][q];
        if (Math.abs(d) > 2e-3) { B.Pd[c][q] += d * k; moving = true; } else B.Pd[c][q] = lab.P[c][q];
      }
      if (Math.abs(lab.match - B.md) > 2e-3) { B.md += (lab.match - B.md) * k; moving = true; } else B.md = lab.match;
      if (B.tk < 1) { B.tk = Math.min(1, B.tk + dt / 1.2); moving = true; }
      const iv = inv();
      for (let q = 0; q < 4; q++) {
        // (a tick: the right colour has the output nearly to itself - and light does arrive there)
        let T = 0;
        for (let c = 0; c < 4; c++) T += lab.P[c][q];
        const ok = T > EMPTY && purity(lab.P, q, iv[q]) >= 0.85;
        if (ok !== B.ok[q]) { B.ok[q] = ok; if (ok && !kit.reduced) B.pop[q] = 1; moving = true; }
        if (B.pop[q] > 0) { B.pop[q] = Math.max(0, B.pop[q] - dt / 0.45); moving = true; }
      }
      B.acc += dt;
      if (moving && B.acc >= 1 / 12) { B.acc = 0; B.dirty = false; board.draw(null); }
      // the detectors: what arrives at each output (a flash when they are read)
      for (let q = 0; q < 4; q++) {
        const z = p.inst.portZ(q) * s;
        // (the colours mixed: yellow-white, as the light; one colour alone: that colour)
        let r = 0, gg = 0, b = 0, T = 0, mx = 0;
        for (let c = 0; c < 4; c++) { const L = LCOL[c], w = B.Pd[c][q]; r += L[0] * w; gg += L[1] * w; b += L[2] * w; T += w; mx = Math.max(mx, w); }
        const n = Math.max(r, gg, b, 1e-9), wm = sstep(0.12, 0.7, (T - mx) / Math.max(3 * mx, 1e-9)), wl = WARM_L;
        tmp.setRGB(r / n + (wl[0] - r / n) * wm, gg / n + (wl[1] - gg / n) * wm, b / n + (wl[2] - b / n) * wm).multiplyScalar(2.2 * Math.min(1.2, T));
        faces[q].position.z = z; faces[q].material.color.copy(tmp);
        tmp.multiplyScalar(1 - 0.5 * flash.det).addScalar(1.6 * flash.det);
        leds[q].position.z = z; leds[q].material.color.copy(tmp);
      }
    },
  };
  return rig;
}

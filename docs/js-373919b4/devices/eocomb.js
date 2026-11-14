// Electro-optic comb: a lithium-niobate racetrack ring with gold electrodes along both straights, driven by a
// microwave at exactly the ring's round-trip frequency.  Every round, the microwave nudges some light to the
// neighbouring colours; the ring keeps the light going round, so the nudges add up into a broad comb of closely
// spaced lines (spacing = the microwave frequency), falling off steadily away from the laser line.
//
// The model behind the light: the round-trip map of a resonant electro-optic comb generator (simplified, slowed
// down; one step per round trip, NRT round trips per second of the animation):
//     E(theta) <- a rc exp(i beta cos theta) E(theta) + i kc            light just after the coupler
//     E_out(theta) = rc + i kc a exp(i beta cos theta) E(theta)          light leaving along the bus
// theta is the "fast time": the point of the microwave's cycle at which the light passed the middle of the front
// straight.  The signal electrode sits between the straights, the grounds outside, so at any instant the two arms
// are pushed in opposite directions; the light needs half a round trip (half a microwave period) to get from one
// arm to the other, so both pushes add up: per round trip the light's phase changes by beta cos theta.
//  - microwave off (beta = 0): the laser sits on a resonance; the ring is evenly and brightly lit;
//  - microwave on: only the light passing while the push goes through zero stays in tune, so the ring's light
//    bunches into two short pulses per round trip (at the two zero crossings), and its spectrum - the Fourier
//    series of E(theta) - is a comb whose lines fall off exponentially away from the laser: a straight line on a
//    log scale.  After switching on, the comb grows outwards line by line.
// The electrodes glow with the microwave's field (cos^2); the pulses cross the middle of the straights just when
// the field is zero.
export const meta = { id: 'eocomb', platform: 'ln', category: 'metro', size: { w: 8.5, d: 5.6 } };

const NB = ' ';
export const text = {
  en: {
    name: 'Microwave light ruler',
    tech: 'Ring with microwave electrodes · lithium niobate',
    what: 'Turns one colour into hundreds of colours, using a microwave signal.',
    in: `One laser colour, and a microwave signal (about 10${NB}GHz)`,
    out: 'Hundreds of colours, spaced exactly by the microwave frequency',
    how: 'Lithium niobate changes how fast light travels when a voltage is applied. The gold electrodes carry a microwave timed to the light’s trip round the ring, so on every round some light is nudged to the neighbouring colours. Round after round, the nudges add up into a wide comb.',
    use: 'Fibre-optic links that carry many colours at once, precise measurements of light, and compact light sources for spectroscopy.',
    fixed: 'The length of the ring decides which microwave frequency works, and the electrodes are laid out for that one frequency.',
    c: { in: 'One colour in', ring: 'Light circles the ring', elec: 'Microwave electrodes', pads: '', out: 'Hundreds of colours out' },
    ctl: { microwave: 'Microwave', power: 'Microwave power' },
    status: 'Microwave on: <b>one colour has become a comb</b> of evenly spaced colours.',
    'status.grow': 'Microwave on: the comb grows outwards from the laser’s colour…',
    'status.off': 'Microwave off: only the laser’s own colour comes out.',
    ref: `Zhang et al., Nature 568, 373 (2019): a lithium-niobate ring driven at about 10${NB}GHz made a comb of more than 900 lines.`,
    note: `Real combs have hundreds of lines about 10${NB}GHz apart, and the light goes round the ring about ten billion times a second; here everything is slowed down.`,
  },
  ja: {
    name: '電気で作る光のものさし',
    tech: 'マイクロ波電極つきのリング・ニオブ酸リチウム',
    what: 'マイクロ波を使って、一色の光を何百もの色に変えます。',
    in: `レーザー光（一色）と、マイクロ波の信号（約10${NB}GHz）`,
    out: 'マイクロ波の周波数ちょうどの間隔で並ぶ、何百もの色',
    how: 'ニオブ酸リチウムは、電圧をかけると光の進む速さが変わります。金の電極には、光がリングを一周する時間に合わせたマイクロ波が流れていて、光は一周するたびに少しずつ隣の色へ押し出されます。これが何周も積み重なって、幅の広いコムになります。',
    use: 'たくさんの色で同時に送る光ファイバー通信、光の精密な測定、小型の分光用光源など。',
    fixed: 'リングの長さで使えるマイクロ波の周波数が決まり、電極もその一つの周波数に合わせて配置されています。',
    c: { in: '一色の光', ring: '光がリングを回る', elec: 'マイクロ波の電極', pads: '', out: '何百もの色' },
    ctl: { microwave: 'マイクロ波', power: 'マイクロ波の強さ' },
    status: 'マイクロ波オン：<b>一つの色が、等間隔に並んだ色のくしに</b>なりました。',
    'status.grow': 'マイクロ波オン：レーザーの色から外側へ、コムが広がっていきます…',
    'status.off': 'マイクロ波オフ：レーザーの色だけが出てきます。',
    ref: `Zhang ほか、Nature 568, 373 (2019)：約10${NB}GHzで駆動したニオブ酸リチウムのリングで、900本を超える線のコムを作りました。`,
    note: `実際の線は約10${NB}GHz間隔で何百本も並び、光はリングを1秒間に約100億回まわります。ここではすべてゆっくりにしています。`,
  },
};

const W = meta.size.w, D = meta.size.d;
const RB = 0.9, LS = 4.6, CZ = -0.3;                     // bend radius, straight length, racetrack centre z
const ZF = CZ + RB, ZK = CZ - RB;                        // front and back straights
const ZC = ZF + 0.2, ZB = 1.6;                           // the bus: at the coupler, and elsewhere
const XC = 0.45, XS = 1.35;                              // coupler half-length; where the bus's S-bends end
const LT = 2 * LS + 2 * Math.PI * RB;                    // length of the racetrack
const ZPAD = -D / 2 + 0.42, PAD = 0.55;                  // microwave pads at the back edge (ground-signal-ground)
const Y = 0.085;
const NT = 256;                                          // fast-time grid (one microwave period)
const A = 0.985, RC = 0.94;                              // round-trip amplitude: loss, and the coupler
const KC = Math.sqrt(1 - RC * RC), AR = A * RC, ERES = KC / (1 - AR);
const BETA_MAX = 0.75;                                   // phase swing per round trip at full microwave power
const NRT = 30;                                          // model round trips per second (the comb builds in ~1.5 s)
const NLN = 30, DUE = 0.004;                             // lines -30..30 on the plate; colour step per line
const DR = 50;                                           // dB shown on the Out plate
const AUTO_ON = 1.8, AUTO_CYCLE = 17, AUTO_OFF = 3;      // focus story: off, then on; then a slow loop when idle
const TAU = 2 * Math.PI;
const GOLD = [1, 0.84, 0.36];

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const wrap = a => a - TAU * Math.floor(a / TAU);
const toS = x => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);   // linear -> display
const linOf = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export function create(kit) {
  const { P, colour } = kit;
  const IR = colour.IR;
  const V = kit.reduced ? 3.0 : 4.5;                     // speed of light in the animation (units per second)
  const OM = TAU * V / LT;                               // the microwave: one period per round trip
  const DL = LT / 12;                                    // dash length: 12 dashes round the ring

  kit.chip({ w: W, d: D, platform: 'ln' });

  // ---------------------------------------------------------------- waveguides
  // the racetrack, as one closed path starting at the middle of the front straight and running the way the light
  // goes (+x on the front straight, the same way as the bus at the coupler)
  const loopPts = [
    ...P.line(0, ZF, LS / 2, ZF).pts,
    ...P.arc(LS / 2, CZ, RB, Math.PI / 2, -Math.PI / 2).pts,
    ...P.line(LS / 2, ZK, -LS / 2, ZK).pts,
    ...P.arc(-LS / 2, CZ, RB, -Math.PI / 2, -1.5 * Math.PI).pts,
    ...P.line(-LS / 2, ZF, 0, ZF).pts,
  ];
  const loop = new P.Path(loopPts, true);
  const TP = 0.55;
  const busIn = P.chain(P.line(-W / 2, ZB, -XS, ZB), P.sbend(-XS, ZB, -XC, ZC), P.line(-XC, ZC, 0, ZC));
  const busOut = P.chain(P.line(0, ZC, XC, ZC), P.sbend(XC, ZC, XS, ZB), P.line(XS, ZB, W / 2, ZB));
  kit.ridges([loop, P.chain(P.line(-W / 2 + TP, ZB, -XS, ZB), P.sbend(-XS, ZB, -XC, ZC), P.line(-XC, ZC, XC, ZC),
    P.sbend(XC, ZC, XS, ZB), P.line(XS, ZB, W / 2 - TP, ZB))], 'ln');
  kit.ridges([P.line(-W / 2, ZB, -W / 2 + TP, ZB), P.line(W / 2 - TP, ZB, W / 2, ZB)], 'ln', { w: 0.07 });

  // light: bus in, bus out, the racetrack in six pieces (profiles drawn every frame)
  const net = kit.lightNet({ width: 0.3, flow: V, dashLen: DL });
  const sIn = net.add(busIn, { s0: 0 });
  const sOut = net.add(busOut, { s0: busIn.len });
  const NSEG = 6;
  const segs = Array.from({ length: NSEG }, (_, k) => {
    const a = LT * k / NSEG, b = LT * (k + 1) / NSEG;
    return { a, b, id: net.add(P.fn(s => loop.at(s), a, b, Math.ceil((b - a) / 0.03)), { s0: a }) };
  });
  net.build();
  segs.forEach(s => net.dash(s.id, 0));

  // ---------------------------------------------------------------- electrodes (gold) and microwave pads
  // ground-signal-ground: the signal electrode fills the space between the straights; the grounds are two C-shaped
  // plates round the outside (open at the coupler, where the bus comes close, and at the back for the signal's feed)
  const xe = LS / 2 - 0.15, gw = 0.4, RI = RB + 0.2, RO = RI + gw;
  const xPadG = 0.95, XGF = 1.12, XGB = 0.38;
  const sigItems = [
    { x0: -xe, z0: CZ, x1: xe, z1: CZ, w: 2 * (RB - 0.2) },                         // signal, between the straights
    { x0: 0, z0: CZ - (RB - 0.2), x1: 0, z1: ZK + 0.17, w: 0.26 },                  // feed to the pad ...
    { x0: 0, z0: ZK - 0.17, x1: 0, z1: ZPAD + PAD / 2, w: 0.26 },                   // ... over the back straight
    { x: 0, z: ZPAD, sx: PAD, sz: PAD, h: 0.03 },                                   // signal pad
  ];
  // gold that reads as gold on large areas (the kit's very metallic gold turns olive-brown without reflections);
  // the same material as the data modulator's electrodes, so that the two lithium-niobate chips match
  const gold = new kit.THREE.MeshStandardMaterial({ color: 0xd4a53a, metalness: 0.5, roughness: 0.4, emissive: 0x1c1404 });
  kit.boxes(sigItems, gold);
  const sig = kit.glows(sigItems, { pad: 0.08, y: 0.04, rgb: GOLD });
  let dimNow = 1;                                                    // the table dims us while another chip is in focus
  kit.onTick((dt, t, dim) => { dimNow = dim; });
  const goldPoly = pts => {                                          // a flat gold plate bounded by [[x, z], ...]
    const shape = new kit.THREE.Shape(pts.map(([x, z]) => new kit.THREE.Vector2(x, -z)));
    const g = new kit.THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    const m = new kit.THREE.Mesh(g, gold);
    m.receiveShadow = true;
    kit.group.add(m);
  };
  for (const side of [1, -1]) {
    const cx = side * LS / 2, pts = [];
    const arc = (r, a0, a1) => { for (let i = 0; i <= 24; i++) { const a = a0 + (a1 - a0) * i / 24; pts.push([cx + side * r * Math.cos(a), CZ + r * Math.sin(a)]); } };
    pts.push([side * XGF, CZ + RI]);
    arc(RI, Math.PI / 2, -Math.PI / 2);
    pts.push([side * XGB, CZ - RI], [side * XGB, CZ - RO]);
    arc(RO, -Math.PI / 2, Math.PI / 2);
    pts.push([side * XGF, CZ + RO]);
    goldPoly(side > 0 ? pts : pts.reverse());
  }
  kit.boxes([
    { x0: -xPadG, z0: CZ - RO + 0.05, x1: -xPadG, z1: ZPAD, w: 0.3 }, { x0: xPadG, z0: CZ - RO + 0.05, x1: xPadG, z1: ZPAD, w: 0.3 },
    { x: -xPadG, z: ZPAD, sx: PAD, sz: PAD }, { x: xPadG, z: ZPAD, sx: PAD, sz: PAD },          // ground pads
    { x: 0, z: ZK, sx: 0.26, sz: 0.36, h: 0.035, y0: 0.078 },                                   // the feed bridges the back
    { x: 0, z: ZK - 0.16, sx: 0.26, sz: 0.05, h: 0.113 }, { x: 0, z: ZK + 0.16, sx: 0.26, sz: 0.05, h: 0.113 },  // waveguide
  ], gold);

  // ---------------------------------------------------------------- beams and dots
  const inBeam = kit.beam({ from: [-W / 2 - 2.4, Y, ZB], to: [-W / 2, Y, ZB], rgb: IR, power: 1.1, r0: 0.08, fade: 'in', flow: V, dashLen: DL });
  const outBeam = kit.beam({ from: [W / 2, Y, ZB], to: [W / 2 + 2.4, Y, ZB], rgb: IR, power: 1, r0: 0.08, fade: 'out', flow: V, dashLen: DL });
  const dots = kit.photons({ max: 140, size: 0.2 });
  const lineRgb = [];
  // (their colours stretched further than their places on the plate, so that many colours can be seen)
  for (let n = -NLN; n <= NLN; n++) lineRgb.push(colour.ramp(n * 0.014));
  const PEAK = [1, 0.45, 0.3];                                       // where the light bunches up: many colours at once
  const LIR = IR.map(linOf), LPK = PEAK.map(linOf);

  // ---------------------------------------------------------------- the model
  const cosT = new Float64Array(NT), sinT = new Float64Array(NT);
  for (let j = 0; j < NT; j++) { cosT[j] = Math.cos(TAU * j / NT); sinT[j] = Math.sin(TAU * j / NT); }
  const er = new Float64Array(NT), ei = new Float64Array(NT), mr = new Float64Array(NT), mi = new Float64Array(NT);
  const inten = new Float32Array(NT);
  let beta = -1;
  function setBeta(b) {
    if (b === beta) return;
    beta = b;
    for (let j = 0; j < NT; j++) { const p = b * cosT[j]; mr[j] = AR * Math.cos(p); mi[j] = AR * Math.sin(p); }
  }
  function step() {
    for (let j = 0; j < NT; j++) {
      const xr = er[j], xi = ei[j];
      er[j] = mr[j] * xr - mi[j] * xi;
      ei[j] = mr[j] * xi + mi[j] * xr + KC;
    }
  }
  // the light leaving: its average (the laser line) every frame, its spectrum when a plate is drawn
  let pump = 0;
  function outAt(j, o) {               // E_out at grid point j -> o = [re, im]
    const qr = (mr[j] * er[j] - mi[j] * ei[j]) / RC, qi = (mr[j] * ei[j] + mi[j] * er[j]) / RC;
    o[0] = RC - KC * qi; o[1] = KC * qr;
  }
  const tmp = [0, 0];
  function measure() {
    let sr = 0, si = 0;
    for (let j = 0; j < NT; j++) { outAt(j, tmp); sr += tmp[0]; si += tmp[1]; inten[j] = (er[j] * er[j] + ei[j] * ei[j]) / (ERES * ERES); }
    pump = (sr * sr + si * si) / (NT * NT);
  }
  const lineP = new Float64Array(2 * NLN + 1);
  const oR = new Float64Array(NT), oI = new Float64Array(NT);
  function spectrum() {
    for (let j = 0; j < NT; j++) { outAt(j, tmp); oR[j] = tmp[0]; oI[j] = tmp[1]; }
    for (let n = -NLN; n <= NLN; n++) {
      let re = 0, im = 0;
      for (let j = 0, k = 0; j < NT; j++, k = (k + n + NT) % NT) {      // k = n j mod NT
        re += oR[j] * cosT[k] + oI[j] * sinT[k];
        im += oI[j] * cosT[k] - oR[j] * sinT[k];
      }
      lineP[n + NLN] = (re * re + im * im) / (NT * NT);
    }
    return lineP;
  }

  // ---------------------------------------------------------------- state
  let on = true, power = 75;          // microwave on/off, power in % of the maximum
  let tAll = 0, sinceOn = 99, acc = 0, idleUser = 0, focused = false, storyT = 99, lastPass = null, dotsAcc = 0;
  const ampOf = () => Math.sqrt(power / 100);
  function settle() {
    er.fill(0); ei.fill(0);
    setBeta(on ? BETA_MAX * ampOf() : 0);
    for (let k = 0; k < 400; k++) step();
    sinceOn = 99; measure();
  }
  function setOn(v) { if (v !== on) { on = v; sinceOn = 0; } }

  // ---------------------------------------------------------------- drawing the light
  const rgbOut = [0, 0, 0];
  const paint = (bg, pk) => {
    rgbOut[0] = toS(LIR[0] * bg + LPK[0] * pk); rgbOut[1] = toS(LIR[1] * bg + LPK[1] * pk); rgbOut[2] = toS(LIR[2] * bg + LPK[2] * pk);
    return rgbOut;
  };
  let combK = 1;                      // how far the comb has grown (0..1): colours the bunched light
  function drawRing() {
    const th0 = OM * tAll;            // fast time of the light now at the middle of the front straight
    for (const sg of segs) {
      const a = sg.a, L = sg.b - sg.a;
      net.setFn(sg.id, t => {
        const f = wrap(th0 - TAU * (a + t * L) / LT) / TAU * NT, i0 = Math.floor(f) % NT, i1 = (i0 + 1) % NT, u = f - Math.floor(f);
        const I = inten[i0] * (1 - u) + inten[i1] * u, p = 0.06 + (1.45 + 0.75 * combK) * I;
        const k = combK * clamp01((I - 0.2) * 1.6);
        return paint(p * (1 - k), p * k);
      });
    }
  }
  let outLevel = -1;
  function drawBus() {
    const po = 1.15 * pump;
    if (Math.abs(po - outLevel) > 0.004) { net.set(sOut, IR, po); outLevel = po; }
    outBeam.set(IR, po);
  }
  net.set(sIn, IR, 1.15);
  const alongOut = (dz, x1) => u => {
    const s = u * (busOut.len + x1 - W / 2);
    if (s <= busOut.len) { const p = busOut.at(s); return [p[0], Y + 0.02, p[1] + dz]; }
    return [W / 2 + s - busOut.len, Y + 0.02, ZB + dz];
  };
  function emitCluster() {
    // the pulse leaving carries the comb's colours: a few dots, picked across the comb (weighted by brightness)
    const sp = lineP;
    for (let k = 0; k < 6; k++) {
      let n = 0;
      for (let tries = 0; tries < 6; tries++) {
        const c = Math.round((kit.rand() - 0.5) * 2 * 24);
        if (c !== 0 && kit.rand() < Math.pow(sp[c + NLN] / Math.max(1e-12, sp[1 + NLN]), 0.18)) { n = c; break; }
      }
      if (!n) n = kit.rand() < 0.5 ? -2 : 2;
      const x1 = W / 2 + 2.4, dur = (busOut.len + x1 - W / 2) / V;
      dots.emit({ along: alongOut((kit.rand() - 0.5) * 0.07, x1), dur, rgb: lineRgb[n + NLN], power: 0.9, size: 0.17 + 0.05 * kit.rand(), delay: kit.rand() * 0.06, fade: 0.1 });
    }
  }

  // ---------------------------------------------------------------- plates
  const PX = u => 0.5 + u / 0.26;
  const MUTED = [0.62, 0.68, 0.74];
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  inPlate.live((g, box) => {
    const ja = kit.lang() === 'ja', lab = Math.round(box.h * 0.17), hh = box.h - lab - 14;
    // left: the laser, one colour
    const lb = { x: box.x, y: box.y, w: box.w * 0.3, h: hh };
    kit.draw.spectrum(g, lb, [{ u: 0.5, h: 0.92, rgb: IR, w: 8 }], { axisWord: false });
    g.fillStyle = 'rgba(160,185,210,0.45)'; g.fillRect(lb.x, lb.y + hh + 2, lb.w, 2);
    kit.draw.text(g, ja ? 'レーザー' : 'laser', lb.x + lb.w / 2, box.y + box.h, { size: lab, rgb: MUTED, align: 'center' });
    // right: the microwave, scrolling (newest at the right)
    const rb = { x: box.x + box.w * 0.38, y: box.y, w: box.w * 0.62, h: hh };
    const amp = on ? 0.46 * ampOf() : 0, T = TAU / OM;
    kit.draw.trace(g, rb, u => 0.5 + amp * Math.cos(OM * (tAll - (1 - u) * 2 * T)), { rgb: on ? GOLD : [0.45, 0.42, 0.35], axisWord: false });
    g.fillStyle = 'rgba(160,185,210,0.45)'; g.fillRect(rb.x, rb.y + hh + 2, rb.w, 2);
    kit.draw.text(g, ja ? 'マイクロ波' : 'microwave', rb.x + rb.w / 2, box.y + box.h, { size: lab, rgb: MUTED, align: 'center' });
  }, 8);
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  outPlate.live((g, box0) => {
    const box = { x: box0.x, y: box0.y, w: box0.w, h: box0.h - 34 };
    const sp = spectrum();
    const lines = [];
    for (let n = -NLN; n <= NLN; n++) {
      const dB = 10 * Math.log10(sp[n + NLN] + 1e-30);
      lines.push({ u: PX(n * DUE), h: clamp01((dB + DR) / DR), rgb: lineRgb[n + NLN], w: n === 0 ? 6 : 3 });
    }
    kit.draw.spectrum(g, box, lines, { axisWord: kit.word('colour'), glow: false });
  }, 6);

  // ---------------------------------------------------------------- per frame
  function update(dt) {
    tAll += dt; sinceOn += dt; storyT += dt;
    idleUser = Math.max(0, idleUser - dt);
    // the focus story: off at first, then on; afterwards, when nobody touches, a slow off/on loop
    if (focused && idleUser <= 0) {
      if (!on && storyT > AUTO_ON) { setOn(true); storyT = 0; }
      else if (on && storyT > AUTO_CYCLE) { setOn(false); storyT = AUTO_ON - AUTO_OFF; }
    }
    setBeta(on ? BETA_MAX * ampOf() : 0);
    acc += dt * NRT;
    let n = 0;
    while (acc >= 1 && n < 8) { step(); acc -= 1; n++; }
    if (acc > 1) acc = 0;
    measure();
    combK += ((on ? clamp01(sinceOn / 1.2) : 0) - combK) * Math.min(1, dt * 3);
    drawRing();
    drawBus();
    // the signal electrode glows with the microwave's field
    const f = on ? Math.cos(OM * tAll) ** 2 * ampOf() : 0;
    for (let i = 0; i < sigItems.length; i++) sig.set(i, on ? (0.02 + 0.15 * f) * dimNow : 0);
    // a pulse passes the coupler (fast time pi/2 or 3pi/2 there): its colours leave along the bus
    const pass = Math.floor((OM * tAll - Math.PI / 2) / Math.PI);
    if (lastPass !== null && pass !== lastPass && combK > 0.5) emitCluster();
    lastPass = pass;
  }
  settle();
  update(0);

  return {
    anchors: {
      in: [-W / 2 - 1.2, Y + 0.05, ZB],
      ring: [-2.1, Y + 0.05, ZF],
      elec: [1.6, Y + 0.05, ZF - 0.1],
      pads: [0, 0.05, ZPAD],
      out: [W / 2 + 1.2, Y + 0.05, ZB],
    },
    controls: [{ id: 'microwave', type: 'toggle' }, { id: 'power', type: 'slider', min: 20, max: 100, step: 5, unit: '%', digits: 0 }],
    act(id, v) {
      if (id === 'microwave') { setOn(!!v); idleUser = 15; storyT = 0; }
      if (id === 'power' && Number.isFinite(+v)) { power = Math.max(20, Math.min(100, +v)); idleUser = 15; }
    },
    value(id) { return id === 'microwave' ? on : id === 'power' ? power : undefined; },
    status() { return { key: !on ? 'status.off' : sinceOn < 1.6 ? 'status.grow' : 'status', vars: {} }; },
    focus(v) {
      focused = v;
      if (v) { setOn(false); storyT = 0; idleUser = 0; } else if (!on) setOn(true);
    },
    reset() { on = true; power = 75; idleUser = 0; settle(); },
    update,
  };
}

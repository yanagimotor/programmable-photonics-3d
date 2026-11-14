// White-light source: a supercontinuum made by short, intense infrared pulses in a long silicon-nitride waveguide
// whose cross-section is chosen precisely (dispersion engineering), coiled into a double spiral.
//
// Physics (as in Halir et al., Optics Letters 37, 1685 (2012): 4.3 cm of silicon-nitride waveguide, 160 pJ pulses,
// colours from 665 to 2025 nm): a pulse of about a hundred femtoseconds is intense enough to change the refractive
// index of the material it travels through (Kerr effect).  At first that only broadens its spectrum a little
// (self-phase modulation) while the waveguide's dispersion keeps the pulse short; then the pulse breaks up (soliton
// fission) and its spectrum suddenly spreads over more than an octave, with "dispersive waves" far out in the blue and
// in the deep red.  The cross-section (width and height) sets the dispersion: where this happens and which colours
// appear.  Weak pulses only broaden a little: they stay red.
//
// Model (qualitative, slowed down enormously): every pulse keeps its own strength.  Its spectrum S(u; z) at the
// fraction z of the way along the guide is precomputed (broadening up to the break-up at ZF, then the continuum); the
// pulse's colour on the chip is the mixture of that spectrum (red -> white).  After the break-up, photons of the new
// colours are born from the pulse; each travels at its own speed (the new colours are slower than the pulse, the
// bluest slowest), so the pulse grows a rainbow tail, and they leave the chip as a spray of colours.  The In plate
// shows the pulses' spectrum, the Out plate the spectrum of the last pulse that came out.

export const meta = { id: 'supercontinuum', platform: 'sin', category: 'metro', size: { w: 8, d: 6 } };

export const text = {
  en: {
    name: 'White-light source',
    tech: 'Dispersion-engineered waveguide (supercontinuum) · silicon nitride',
    what: 'Turns short infrared flashes into white light: all colours at once.',
    in: 'Short, intense pulses of infrared light, all one colour',
    out: 'A continuous spread of colours, from deep infrared to visible red',
    how: 'Each pulse squeezes its light into about a tenth of a trillionth of a second, so it is strong enough to change the material it travels through, and that creates new colours. The waveguide’s width and height are chosen precisely so that the pulse stays short and keeps making new colours along the way.',
    use: 'Measuring the exact frequencies of light rulers (frequency combs), and as a bright, broad light for spectroscopy, microscopy and medical imaging.',
    fixed: 'The waveguide’s exact width and height, etched once, decide which colours appear. Other colours would need another chip.',
    c: { in: 'Short flashes in', guide: '', born: 'New colours are born', out: 'White light out' },
    ctl: { power: 'Strong flashes' },
    status: 'Strong pulses: each one spreads into <b>all colours</b>, and white light comes out.',
    'status.weak': 'Weak pulses: too gentle to make new colours, so the light stays red.',
    ref: 'Halir et al., Optics Letters 37, 1685 (2012): a 4.3 cm silicon-nitride waveguide spread infrared pulses over colours from 665 to 2025 nm.',
    note: 'Real pulses last about a tenth of a trillionth of a second; here they are slowed down enormously. Most of the new colours are infrared, painted as a rainbow.',
  },
  ja: {
    name: '白色光源',
    tech: '分散を設計した導波路（スーパーコンティニウム光）・窒化シリコン',
    what: '赤外光の短いパルスを、すべての色を含む白い光に変えます。',
    in: '短く強い赤外光のパルス（すべて同じ色）',
    out: '深い赤外から目に見える赤まで、切れ目なく広がった色',
    how: 'パルスは光を約10兆分の1秒に詰め込むので、通り道の材料の性質を変えるほど強くなり、それが新しい色を生みます。導波路の幅と高さは、パルスが短いまま新しい色をつくり続けるように精密に選ばれています。',
    use: '光のものさし（光周波数コム）の周波数を正確に測るため。また、分光や顕微鏡、医療用の画像診断のための、明るく幅広い光源として。',
    fixed: '導波路の幅と高さは一度だけ刻まれ、どの色が出るかを決めます。別の色が欲しければ、別のチップが必要です。',
    c: { in: '短い光のパルス', guide: '', born: '新しい色が生まれる', out: '白い光' },
    ctl: { power: '強いパルス' },
    status: '強いパルス：一つひとつが<b>あらゆる色</b>に広がり、白色光が出てきます。',
    'status.weak': '弱いパルス：新しい色を生むには弱すぎて、光は赤いままです。',
    ref: 'Halir ほか、Optics Letters 37, 1685 (2012)：長さ4.3 cmの窒化シリコン導波路で、赤外パルスを665〜2025 nmの色に広げました。',
    note: '実際のパルスは約10兆分の1秒しか続かず、ここでは大幅にゆっくり見せています。新しい色の多くは赤外光で、虹色に塗って表しています。',
  },
};

const W = meta.size.w, D = meta.size.d;
const Y = 0.085, YP = 0.1;                    // height of the light / of the photons
const RMAX = 2.3, R0 = 0.62;                  // the double spiral: outer radius, radius where the S-bend starts
const PITCH = 0.66, EASE = 0.6;               // radial step of one arm per turn; easing of the arms into the S-bend
const U0 = -0.35, U1 = 1.05, NU = 71;         // colours drawn on the plates (kit.colour.ramp u) and samples
const NZ = 64;                                // steps along the guide for the precomputed spectra
const ZF = 0.46;                              // where (fraction of the way) a strong pulse breaks up
const V = 12;                                 // pulse speed, units per second (light is slowed down enormously)
const REP = 1.5;                              // seconds between pulses
const SIG = 0.2;                              // pulse length (units)
const NPH = 36;                               // photons of new colours born from each strong pulse
const BG = 0.06;                              // faint glow along the guide (the light that went by)
const RIDGE_W = 0.085;                        // a thin guide: the pale ridge must not drown the white pulses

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gauss = (u, m, s) => Math.exp(-0.5 * ((u - m) / s) * ((u - m) / s));
const WORDS = { en: { one: 'one colour', all: 'all colours' }, ja: { one: '一つの色', all: 'あらゆる色' } };

// the spectrum at the end for strong pulses (relative heights, as such spectra are drawn, on a log scale): a broad
// plateau with the leftover laser line in it, a strong "dispersive wave" in the blue and a weaker one in the deep red
function continuum(u) {
  const edge = sstep(-0.32, -0.2, u) * (1 - sstep(0.9, 1.0, u));
  const plateau = 0.55 + 0.08 * Math.cos(28 * u) * Math.exp(-(u / 0.3) * (u / 0.3)) - 0.18 * sstep(0.35, 0.7, u);
  return Math.min(1, edge * plateau + 0.4 * gauss(u, 0, 0.045) + 0.42 * gauss(u, 0.86, 0.04) + 0.2 * gauss(u, -0.22, 0.03));
}
// the laser line, broadened a little by the pulse itself (s = 0..1: self-phase modulation with its two side lobes)
function pumpShape(u, s) {
  const sg = 0.045 + 0.05 * s;
  return (1 - 0.3 * s) * gauss(u, 0, sg) + 0.32 * s * (gauss(u, 1.15 * sg, 0.45 * sg) + gauss(u, -1.15 * sg, 0.45 * sg));
}
const breakup = z => sstep(ZF - 0.05, ZF + 0.15, z);          // 0 before the break-up, 1 after
function spectrumAt(u, z, strong) {
  if (!strong) return pumpShape(u, 0.15 * z);
  const s = sstep(0, ZF, z), B = breakup(z);
  const lo = -0.04 - 0.28 * B, hi = 0.1 + 0.9 * B;
  const mask = sstep(lo - 0.05, lo, u) * (1 - sstep(hi, hi + 0.05, u));
  return Math.max(pumpShape(u, s) * (1 - 0.3 * B), Math.sqrt(B) * continuum(u) * mask);
}
// write a light segment's profile in linear light; f(t, out) fills out = linear rgb x power.  Kit wish: setLin().
function linWriter(handle) {
  const n = handle.net, S = n.data.length / (4 * n.rows);
  n.set(0, [1, 1, 1], 1);
  const K = n.data[0];                         // texel value of linear power 1 (255 / VMAX)
  n.set(0, [0, 0, 0], 0);
  const o3 = [0, 0, 0];
  return (seg, f) => {
    const d = n.data, base = seg * S * 4;
    for (let i = 0; i < S; i++) {
      f(i / (S - 1), o3);
      const j = base + 4 * i;
      d[j] = Math.min(255, Math.round(o3[0] * K)); d[j + 1] = Math.min(255, Math.round(o3[1] * K)); d[j + 2] = Math.min(255, Math.round(o3[2] * K));
    }
    n.dirty = true;
  };
}

export function create(kit) {
  const { P, colour } = kit;
  const IR = colour.IR;
  const SPD = kit.reduced ? 0.45 : 1;
  const word = k => (WORDS[kit.lang()] || WORDS.en)[k];
  kit.chip({ w: W, d: D, platform: 'sin' });

  // ---- the double spiral: in along the back edge, spiral in (clockwise seen from above), S-bend through the
  // centre, spiral out (counter-clockwise), out along the front edge.  Arm A: r(th) = R0 + k g(th1 - th), eased
  // (g'(0) = 0) so that it meets the S-bend's half circles smoothly; arm B is arm A turned by half a turn.
  const k = PITCH / (2 * Math.PI);
  const g = x => Math.sqrt(x * x + EASE * EASE) - EASE;
  const X = Math.sqrt(((RMAX - R0) / k + EASE) ** 2 - EASE * EASE);       // angle of one arm: r(th0) = RMAX
  const th0 = -Math.PI / 2, th1 = th0 + X;
  const r = th => R0 + k * g(th1 - th);
  const nA = Math.ceil(X * (RMAX + R0) / 2 / 0.035);
  const armA = P.fn(th => [r(th) * Math.cos(th), r(th) * Math.sin(th)], th0, th1, nA);
  const armB = P.fn(th => [-r(th) * Math.cos(th), -r(th) * Math.sin(th)], th1, th0, nA);
  const cx = R0 / 2 * Math.cos(th1), cz = R0 / 2 * Math.sin(th1);
  const sA = P.arc(cx, cz, R0 / 2, th1, th1 + Math.PI), sB = P.arc(-cx, -cz, R0 / 2, th1, th1 - Math.PI);
  const route = P.chain(P.line(-W / 2, -RMAX, 0, -RMAX), armA, sA, sB, armB, P.line(0, RMAX, W / 2, RMAX));
  const L = route.len;
  kit.ridges([route], 'sin', { w: RIDGE_W });

  // light: the route cut into short segments, each drawn with its own profile (the pulses) every frame; the band is
  // wider than the guide so that a pulse's glow spills onto the dark chip around it
  const net = kit.lightNet({ width: 0.34 });
  const NS = Math.ceil(L / 1.1);
  const segs = [];
  for (let i = 0; i < NS; i++) {
    const a = L * i / NS, b = L * (i + 1) / NS;
    const piece = P.fn(t => route.at(a + (b - a) * t), 0, 1, Math.max(10, Math.ceil((b - a) / 0.03)));
    segs.push({ a, b, id: net.add(piece, { s0: a }), lit: true, last: 2 });     // last: 0 none, 1 weak, 2 strong
  }
  net.build();
  for (const sg of segs) net.dash(sg.id, 0);
  const write = linWriter(net);

  // ---- the precomputed spectra and colours (index 0: weak pulses, 1: strong pulses)
  const UU = Array.from({ length: NU }, (_, i) => U0 + (U1 - U0) * i / (NU - 1));
  const RAMP = UU.map(u => colour.ramp(u));
  const spec = [false, true].map(strong => Array.from({ length: NZ }, (_, iz) => Float32Array.from(UU, u => spectrumAt(u, iz / (NZ - 1), strong))));
  // the colour of a pulse: the mixture of its spectrum, turning to the table's "many colours at once" white as the
  // spectrum spreads out (a plain mixture of the painted rainbow would look orange)
  const linCol = spec.map((rows, str) => rows.map((S, iz) => {
    let rr = 0, gg = 0, bb = 0;
    S.forEach((w, i) => { rr += RAMP[i][0] * w; gg += RAMP[i][1] * w; bb += RAMP[i][2] * w; });
    const m = Math.max(rr, gg, bb, 1e-9), wt = str ? 0.85 * breakup(iz / (NZ - 1)) : 0;
    return colour.lin([0, 1, 2].map(j => [rr, gg, bb][j] / m * (1 - wt) + colour.WHITE[j] * wt));
  }));
  const colAt = (str, z, out) => {                                    // linear colour of a pulse at z (0..1)
    const f = Math.min(NZ - 1.001, Math.max(0, z * (NZ - 1))), i = Math.floor(f), t = f - i;
    const a = linCol[str][i], b = linCol[str][i + 1];
    out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t;
    return out;
  };
  const dispOut = str => { const c = linCol[str][NZ - 1]; const toD = v => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); return [toD(c[0]), toD(c[1]), toD(c[2])]; };
  for (const sg of segs) sg.bg = [colAt(0, (sg.a + sg.b) / 2 / L, [0, 0, 0]), colAt(1, (sg.a + sg.b) / 2 / L, [0, 0, 0])];

  // ---- beams (faint: the pulses themselves are photons in the air) and photons
  const inBeam = kit.beam({ from: [-W / 2 - 2.4, Y, -RMAX], to: [-W / 2, Y, -RMAX], rgb: IR, power: 0.3, r0: 0.07, fade: 'in', dash: 0 });
  const outBeam = kit.beam({ from: [W / 2, Y, RMAX], to: [W / 2 + 2.4, Y, RMAX], rgb: dispOut(1), power: 0.25, r0: 0.08, fade: 'out', dash: 0 });
  const ph = kit.photons({ max: 300, size: 0.12 });

  // ---- the pulses
  let strong = true, pulses = [], nextPulse = 0.2, idleUser = 0, lastOut = 1;
  const v = V * SPD;
  const G = z => 0.6 * breakup(z) + 0.4 * Math.min(1, Math.max(0, (z - ZF) / (1 - ZF)));
  function sampleNew(z) {                                              // a colour among the new ones at z
    const B = breakup(z), lo = -0.04 - 0.28 * B, hi = 0.1 + 0.9 * B;
    for (let n = 0; n < 24; n++) {
      const u = lo + (hi - lo) * kit.rand();
      if (Math.abs(u) < 0.07) continue;
      if (kit.rand() < continuum(u)) return u;
    }
    return hi * kit.rand();
  }
  function birth(sb) {
    const u = sampleNew(sb / L);
    const vp = v * (1 - 0.22 * (u - 0.1) * (u - 0.1));                // new colours fall behind, the bluest most
    const total = (L - sb) + 2.4;
    const dz = (kit.rand() - 0.5) * 0.6, dy = 0.05 + 0.25 * kit.rand();
    ph.emit({
      along: q => {
        const s = sb + q * total;
        if (s <= L) { const p = route.at(s); return [p[0], YP, p[1]]; }
        const e = (s - L) / 2.4;
        return [W / 2 + 2.4 * e, YP + dy * e, RMAX + dz * e];
      },
      dur: total / vp, rgb: colour.ramp(u), power: 1.3, size: 0.17, fade: 0.05,
    });
  }
  function launch(s0 = -2.4) {
    const p = { s: s0, str: strong ? 1 : 0, acc: 0, col: colAt(strong ? 1 : 0, 0, [0, 0, 0]), done: s0 > L };
    pulses.push(p);
    if (s0 < 0) ph.emit({ from: [-W / 2 + s0, YP, -RMAX], to: [-W / 2, YP, -RMAX], dur: -s0 / v, rgb: IR, power: strong ? 1.6 : 0.85, size: strong ? 0.38 : 0.28, fade: 0.12 });
    // the pulse's bright head: a glow riding on it through the chip (its colour follows the pulse, see update)
    const a = Math.max(0, s0);
    p.head = ph.emit({ along: q => { const pt = route.at(a + q * (L - a)); return [pt[0], YP, pt[1]]; }, dur: (L - a) / v, delay: Math.max(0, -s0) / v, rgb: IR, power: 1, size: strong ? 0.46 : 0.34, fade: 0.02 });
  }
  function fill() {                                                    // the steady state: pulses all along the guide
    for (let s = L - 0.5; s > 0; s -= v * REP) launch(s);
    nextPulse = 0.4;
  }
  function clear() {
    pulses = []; ph.clear();
    for (const sg of segs) { sg.last = 0; sg.lit = true; }
    lastOut = -1;
    nextPulse = 0.15;
  }
  fill();

  // ---- the plates: the pulses' colours going in; the colours of the last pulse that came out
  const MUTED = [0.62, 0.68, 0.74];
  const xu = x => U0 + (U1 - U0) * x;
  const rgbAt = x => colour.ramp(xu(x));
  const sample = (arr, x) => { const f = Math.min(NU - 1.001, Math.max(0, x * (NU - 1))), i = Math.floor(f), t = f - i; return arr[i] * (1 - t) + arr[i + 1] * t; };
  const outShown = Float32Array.from(spec[1][NZ - 1]), outTarget = Float32Array.from(spec[1][NZ - 1]);
  const IN_H = [0.5, 0.95];
  const axisUnder = (gc, bx) => {
    const y = bx.y + bx.h + 6;
    gc.save(); gc.strokeStyle = 'rgba(160,185,210,0.5)'; gc.lineWidth = 3;
    gc.beginPath(); gc.moveTo(bx.x, y); gc.lineTo(bx.x + bx.w, y); gc.stroke();
    gc.beginPath(); gc.moveTo(bx.x + bx.w + 4, y); gc.lineTo(bx.x + bx.w - 12, y - 7); gc.lineTo(bx.x + bx.w - 12, y + 7); gc.closePath();
    gc.fillStyle = 'rgba(160,185,210,0.7)'; gc.fill(); gc.restore();
    kit.draw.text(gc, kit.word('colour'), bx.x + bx.w, y + 30, { size: 24, rgb: MUTED, align: 'right', weight: 600 });
  };
  const PW = 3.4, PH = 1.9;
  const inPlate = kit.plate({ w: PW, h: PH, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  inPlate.live((gc, box) => {
    const bx = { x: box.x, y: box.y + 26, w: box.w, h: box.h - 52 };
    const h = IN_H[strong ? 1 : 0], S = spec[strong ? 1 : 0][0];
    kit.draw.curve(gc, bx, x => h * sample(S, x), { rgbAt, fill: true, line: IR, axisWord: false });
    const x0 = (0 - U0) / (U1 - U0);
    kit.draw.text(gc, word('one'), bx.x + bx.w * (x0 + 0.06), bx.y + bx.h * (1 - h) + 30, { size: 34, rgb: [1, 0.45, 0.4], align: 'left', weight: 700 });
    axisUnder(gc, bx);
  }, 8);
  const outPlate = kit.plate({ w: PW, h: PH, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  outPlate.live((gc, box) => {
    const bx = { x: box.x, y: box.y + 26, w: box.w, h: box.h - 52 };
    let m = 0;
    for (let i = 0; i < NU; i++) m = Math.max(m, outShown[i]);
    if (m > 0.02) {
      kit.draw.curve(gc, bx, x => sample(outShown, x), { rgbAt, fill: true, line: [0.95, 0.95, 1], axisWord: false });
      const broad = outShown[Math.round((0.6 - U0) / (U1 - U0) * (NU - 1))] > 0.15;
      kit.draw.text(gc, word(broad ? 'all' : 'one'), broad ? bx.x + bx.w * 0.5 : bx.x + bx.w * ((0 - U0) / (U1 - U0) + 0.06), bx.y + 2 + (broad ? 0 : bx.h * 0.45), { size: 34, rgb: broad ? [0.95, 0.95, 1] : [1, 0.45, 0.4], align: broad ? 'center' : 'left', weight: 700 });
    }
    axisUnder(gc, bx);
  }, 8);

  const born = route.at((ZF + 0.04) * L);
  return {
    anchors: {
      in: [-W / 2 - 1.1, Y + 0.05, -RMAX],
      guide: [-0.6, Y + 0.05, -RMAX],                                 // on the waveguide where it enters the spiral
      born: [born[0], Y + 0.05, born[1]],
      out: [W / 2 + 1.1, Y + 0.05, RMAX],
    },
    controls: [{ id: 'power', type: 'toggle' }],
    act(id, val) { if (id === 'power') { strong = !!val; idleUser = 15; } },
    value(id) { return id === 'power' ? strong : undefined; },
    status() { return { key: strong ? 'status' : 'status.weak', vars: {} }; },
    focus(on) {
      if (on && idleUser <= 0) strong = true;   // (it keeps its steady stream: emptying the guide showed it not working)
    },
    reset() {
      strong = true; idleUser = 0;
      clear(); fill();
      for (const sg of segs) sg.last = 2;
      lastOut = 1; outShown.set(spec[1][NZ - 1]);
    },
    update(dt, t, focused) {
      if (idleUser > 0) idleUser -= dt;
      if (!focused && !strong && idleUser <= 0) strong = true;          // the overview shows it working
      nextPulse -= dt;
      if (nextPulse <= 0) { launch(); nextPulse += REP / SPD; }
      // move the pulses; strong ones give birth to photons of new colours after the break-up
      const step = v * dt;
      for (const p of pulses) {
        const s0 = p.s, s1 = s0 + step;
        p.s = s1;
        if (p.head && s1 > 0 && s1 < L) {                             // the head takes the pulse's colour (kit wish: a setter)
          colAt(p.str, s1 / L, p.col);
          const k = p.str ? 1.5 : 0.9;
          p.head.c[0] = p.col[0] * k; p.head.c[1] = p.col[1] * k; p.head.c[2] = p.col[2] * k;
        }
        if (p.str && s1 > 0 && s0 < L) {
          p.acc += NPH * (G(Math.min(1, s1 / L)) - G(Math.max(0, s0 / L)));
          while (p.acc >= 1) { p.acc -= 1; birth(Math.max(0, s0) + (Math.min(L, s1) - Math.max(0, s0)) * kit.rand()); }
        }
        if (!p.done && s1 >= L) {
          p.done = true; lastOut = p.str;
          const c = dispOut(p.str);
          ph.emit({ from: [W / 2, YP, RMAX], to: [W / 2 + 2.6, YP, RMAX], dur: 2.6 / v, rgb: p.str ? [1, 0.97, 0.94] : IR, power: p.str ? 1.3 : 0.85, size: p.str ? 0.36 : 0.28, fade: 0.12 });
          outBeam.set(c, 0.25);
        }
      }
      if (pulses.length && pulses[0].s > L + 4 * SIG) pulses = pulses.filter(p => p.s <= L + 4 * SIG);
      // the light in the guide: faint glow where light has passed, plus the bright pulses
      for (const sg of segs) {
        let near = false;
        for (const p of pulses) if (p.s > sg.a - 4 * SIG && p.s < sg.b + 4 * SIG) { near = true; if (p.s > (sg.a + sg.b) / 2) sg.last = p.str + 1; }
        if (!near && !sg.lit) continue;
        for (const p of pulses) if (p.s > sg.a - 4 * SIG && p.s < sg.b + 4 * SIG) colAt(p.str, Math.min(1, Math.max(0, p.s / L)), p.col);
        const bg = sg.last ? sg.bg[sg.last - 1] : null;
        write(sg.id, (tt, o) => {
          const s = sg.a + (sg.b - sg.a) * tt;
          if (bg) { o[0] = bg[0] * BG; o[1] = bg[1] * BG; o[2] = bg[2] * BG; } else { o[0] = 0; o[1] = 0; o[2] = 0; }
          for (const p of pulses) {
            const d = (s - p.s) / SIG;
            if (d > -4 && d < 4) { const e = (p.str ? 2.1 : 1.1) * Math.exp(-0.5 * d * d); o[0] += p.col[0] * e; o[1] += p.col[1] * e; o[2] += p.col[2] * e; }
          }
        });
        sg.lit = near;
      }
      inBeam.set(IR, strong ? 0.3 : 0.18);
      // the Out plate follows the last pulse out (a short morph)
      if (lastOut >= 0) { const S = spec[lastOut][NZ - 1], hh = lastOut ? 1 : IN_H[0]; for (let i = 0; i < NU; i++) outTarget[i] = S[i] * hh; }
      else outTarget.fill(0);
      const km = Math.min(1, dt * 5);
      for (let i = 0; i < NU; i++) outShown[i] += (outTarget[i] - outShown[i]) * km;
      if (lastOut < 0) outBeam.set(IR, 0);
    },
  };
}

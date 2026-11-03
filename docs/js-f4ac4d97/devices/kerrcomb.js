// Light ruler (microcomb): one strong laser drives a very clear silicon-nitride ring.  The light circling the ring
// becomes so intense that it changes the glass (the Kerr effect), new colours appear, and in the best state one short
// pulse (a dissipative Kerr soliton) circles the ring.  Out comes a train of pulses: a comb of evenly spaced colours.
//
// The model behind the light (the normalised Lugiato-Lefever picture, simplified and slowed down):
//  - pump strength f2 (strong 3, weak 0.7).  On "switch on" the laser is tuned from the blue side into the ring's
//    resonance (the detuning zeta rises).  The steady light in the ring is the largest root Y of the tilted Kerr
//    resonance f2 = Y((zeta - Y)^2 + 1): the ring fills up and the light passing by dips;
//  - above threshold (Y > 1) the light breaks up: first four even bumps (Turing rolls: a sparse primary comb, every
//    4th line), then a noisy jumble (chaotic modulation instability: flickering bumps, irregular lines);
//  - past the end of the upper branch the steady light drops to the lower branch (the soliton step) and one bump
//    survives as a soliton: a sech-shaped pulse of fixed width circling the ring on a weak background.  The light
//    passing by comes back up (the laser now sits beside the resonance).  Spectrum: lines spaced by the round-trip
//    frequency under a smooth sech^2 envelope (the Fourier transform of the pulse);
//  - weak pump: Y never exceeds 1, so the ring fills and nothing else happens (below threshold).
// The ring is drawn in the frame that moves with the light (coordinate xi): anything at fixed xi goes round at the
// animation's speed of light V.  Each time the soliton passes the coupler a pulse leaves along the bus, carrying the
// comb's colours (dots in the comb colours, one per few lines, brightness following the envelope).
export const meta = { id: 'kerrcomb', platform: 'sin', category: 'metro', size: { w: 8, d: 5.6 } };

export const text = {
  en: {
    name: 'Light ruler',
    tech: 'Kerr soliton microcomb · silicon nitride',
    what: 'Turns one colour into many evenly spaced colours: a ruler of light.',
    in: 'One strong laser, a single colour',
    out: 'A comb of evenly spaced colours, as a train of short pulses',
    how: 'The ring keeps the laser light circling until it is so intense that it changes how fast light travels in the glass. This creates new colours, spaced by how often the light goes round. When the light settles into one short pulse, all the colours keep in step.',
    use: 'Optical clocks, distance measurement, data links that send many colours at once, and calibrating telescopes that search for planets.',
    fixed: 'The size of the ring sets the spacing between the colours, and the shape of its waveguide how wide the comb can grow. Both are etched once and for all.',
    c: { in: 'One colour in', ring: 'A pulse circles the ring', out: 'Many colours out' },
    ctl: { start: 'Restart', laser: 'Laser' },
    opt: { laser: { strong: 'Strong', weak: 'Weak' } },
    'status.on': 'The laser is on: its light travels to the ring.',
    'status.fill': 'The light builds up in the ring.',
    'status.rolls': 'The light is now so intense that <b>new colours appear</b>.',
    'status.noisy': 'At first the new colours are a noisy jumble…',
    status: 'One short pulse circles the ring: out comes <b>a comb of evenly spaced colours</b>.',
    'status.weak': 'The light circles the ring, but it is <b>too weak</b> to make new colours.',
    ref: 'Brasch et al., Science 351, 357 (2016): a single pulse circling a silicon-nitride ring made a comb two-thirds of an octave wide.',
    note: 'Real microcombs have hundreds of colours, and the pulse goes round the ring tens to hundreds of billions of times a second; here it is slowed down enormously.',
  },
  ja: {
    name: '光のものさし',
    tech: 'カー・ソリトン・マイクロコム・窒化シリコン',
    what: '一色の光を、等間隔に並ぶたくさんの色に変えます。光のものさしです。',
    in: '強いレーザー光（一色）',
    out: '等間隔に並んだ色のくし。短いパルスの列として出てきます',
    how: 'リングの中を回り続ける光はとても強くなり、ガラスの中で光が進む速さを変えます。これが新しい色を生みます。色の間隔は、光が1秒間にリングを回る回数で決まります。光が一つの短いパルスにまとまると、すべての色が足並みをそろえます。',
    use: '光時計、距離の測定、たくさんの色で同時に送る光通信、惑星を探す望遠鏡の較正など。',
    fixed: 'リングの大きさで色の間隔が決まり、導波路の断面の形でコムがどこまで広がるかが決まります。どちらも、一度刻んだら変えられません。',
    c: { in: '一色の光', ring: 'リングを回るパルス', out: 'たくさんの色' },
    ctl: { start: 'もう一度スタート', laser: 'レーザー' },
    opt: { laser: { strong: '強い', weak: '弱い' } },
    'status.on': 'レーザーがオンになり、光がリングへ向かいます。',
    'status.fill': 'リングの中に光がたまっていきます。',
    'status.rolls': '光がとても強くなり、<b>新しい色が生まれます</b>。',
    'status.noisy': 'はじめは、新しい色がばらばらに揺らいでいます…',
    status: '一つの短いパルスがリングを回り、<b>等間隔に並んだ色のくし</b>が出てきます。',
    'status.weak': '光はリングを回りますが、<b>弱すぎて</b>新しい色は生まれません。',
    ref: 'Brasch ほか、Science 351, 357 (2016)：窒化シリコンのリングを一つのパルスが回り続け、オクターブの3分の2の幅をもつコムを作りました。',
    note: '実際のマイクロコムは数百本の色を持ち、パルスはリングを1秒間に数百億〜数千億回まわります。ここではとてもゆっくりにしています。',
  },
};

const W = meta.size.w, D = meta.size.d;
const R = 1.6, CZ = -0.38, GAP = 0.21, ZB = CZ + R + GAP;    // ring centre (0, CZ); the bus runs along z = ZB
const LR = 2 * Math.PI * R;                                     // length of the ring
const Y = 0.085;                                                // height of the light above the chip
const NG = 256;                                                 // grid round the ring, in the moving frame
const NL = 12, DU = 0.022;                                      // comb lines -NL..NL shown; colour step between lines
const F2 = { strong: 3.0, weak: 0.7 };                          // pump strength (normalised; threshold is 1)
const WS = 0.075;                                               // soliton width (radians of the ring): sets the comb
const WSD = 0.1;                                                // ... drawn a little wider on the chip, to be seen
const AS2 = 2.4;                                                // soliton peak brightness (on a weak background)
const ROLLS = 4;                                                // Turing rolls: every 4th line
// the start-up (seconds after "switch on"): laser on, light reaches the ring, threshold, chaos, soliton step
const K = { on: 0.35, mi: 3.2, chaos: 4.3, step: 6.5, sol: 7.1 };
const IDLE_LOOP = 16;                                           // focus, nobody touching: start again after this
const TAU = 2 * Math.PI;

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const sech = x => 1 / Math.cosh(x);
const wrap = a => a - TAU * Math.floor(a / TAU);                // 0..2 pi
const toS = x => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);   // linear -> display
const linOf = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

// the steady light in the ring: largest root of f2 = Y((z - Y)^2 + 1) (the upper branch while it exists)
function steady(f2, z) {
  let y = f2 + 0.01;
  for (let i = 0; i < 60; i++) {
    const d = z - y, g = y * (d * d + 1) - f2, dg = d * d + 1 - 2 * y * d;
    if (!(Math.abs(dg) > 1e-9)) break;
    const ny = Math.max(0, y - g / dg);
    if (Math.abs(ny - y) < 1e-7) { y = ny; break; }
    y = ny;
  }
  return y;
}
// piecewise-linear keyframes [[t, v], ...]
function keyed(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
    return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
  }
  return keys[keys.length - 1][1];
}

export function create(kit) {
  const { P, colour } = kit;
  const IR = colour.IR;
  const V = kit.reduced ? 3.0 : 4.5;                            // speed of light in the animation (units per second)
  const OM = TAU * V / LR;                                      // 2 pi x round trips per second
  const DL = LR / 8;                                            // dash length: 8 dashes round the ring
  const tRing = K.on + (W / 2) / V;                             // the light front reaches the coupler
  const ZETA = {
    strong: [[tRing, -4.5], [K.mi, -0.41], [K.chaos, 0.85], [K.step, 2.95], [K.sol, 3.3]],
    weak: [[tRing, -4.5], [K.mi, 0.7]],
  };

  kit.chip({ w: W, d: D, platform: 'sin' });
  // the ridges: the bus (with thin tapers at both facets, where the light enters and leaves the chip) and the ring
  const TP = 0.55;
  kit.ridges([P.line(-W / 2 + TP, ZB, W / 2 - TP, ZB), P.circle(0, CZ, R, Math.PI / 2, -1)], 'sin');
  kit.ridges([P.line(-W / 2, ZB, -W / 2 + TP, ZB), P.line(W / 2 - TP, ZB, W / 2, ZB)], 'sin', { w: 0.07 });

  // light: bus in, bus out, the ring in four quarter arcs (starting at the coupler, running the way the light goes)
  const net = kit.lightNet({ width: 0.3, flow: V, dashLen: DL });
  const sIn = net.add(P.line(-W / 2, ZB, 0, ZB), { s0: 0 });
  const sOut = net.add(P.line(0, ZB, W / 2, ZB), { s0: W / 2 });
  const arcs = [0, 1, 2, 3].map(k => net.add(P.arc(0, CZ, R, Math.PI / 2 - k * Math.PI / 2, Math.PI / 2 - (k + 1) * Math.PI / 2), { s0: 0 }));
  net.build();
  arcs.forEach(s => net.dash(s, 0));
  const pnet = kit.lightNet({ width: 0.34 });                   // pulses leaving along the bus (no dashes)
  const sPulse = pnet.add(P.line(0, ZB, W / 2, ZB), { s0: 0 });
  pnet.build();
  pnet.dash(sPulse, 0);

  const inBeam = kit.beam({ from: [-W / 2 - 2.4, Y, ZB], to: [-W / 2, Y, ZB], rgb: IR, power: 1, r0: 0.08, fade: 'in', flow: V, dashLen: DL });
  const outBeam = kit.beam({ from: [W / 2, Y, ZB], to: [W / 2 + 2.4, Y, ZB], rgb: IR, power: 1, r0: 0.08, fade: 'out', flow: V, dashLen: DL });
  const dots = kit.photons({ max: 160, size: 0.22 });

  // colours: the comb's lines, and the colour of the pulse (all of them at once: a warm white)
  const lineU = n => n * DU;
  const lineRgb = [];
  // (their colours stretched further than their places on the plate, so that many colours can be seen)
  for (let n = -NL; n <= NL; n++) lineRgb.push(colour.ramp(n * 0.045));
  const env = n => sech(Math.PI * n * WS / 2) ** 2;             // soliton comb envelope (power)
  const mixed = colour.mix(lineRgb.map((c, i) => [c, env(i - NL)]));
  const PEAK = mixed.map((c, i) => c * 0.55 + colour.WHITE[i] * 0.45);
  const LIR = IR.map(linOf), LPK = PEAK.map(linOf);

  // ---------------------------------------------------------------- state
  const rnd = () => kit.rand();
  let mode = 'strong';
  let tSeq = 0;                     // seconds since "switch on"
  let tAll = 0;                     // running clock (the moving frame turns with it)
  let idleUser = 0;
  let focused = false;
  // the bumps of the noisy state; bump 0 becomes the soliton
  const bumps = Array.from({ length: 9 }, (_, k) => ({ pos: 0, w: 0, a: 0, drift: 0, ph: 0, nu: 0, om: 0, p: 0, k }));
  const rollPos = 0.6;
  function seedBumps() {
    bumps.forEach((b, k) => {
      b.pos = TAU * (k + 0.6 * rnd()) / bumps.length;
      b.w = 0.08 + 0.06 * rnd();
      b.a = 1.2 + 0.35 * rnd();
      b.drift = (rnd() - 0.5) * 1.4;
      b.ph = TAU * rnd(); b.nu = (rnd() - 0.5) * 16;
      b.om = 6 + 8 * rnd(); b.p = TAU * rnd();
    });
  }
  seedBumps();

  // what the light does now (recomputed every frame from tSeq and the bumps)
  const S = { on: 0, front: -W / 2, Y: 0, T: 1, rolls: 0, c0: 0, chaos: 0, sol: 0, ripple: 1, pin: 0, pout: 0, key: 'status' };
  function evaluate() {
    const f2 = F2[mode], strong = mode === 'strong';
    S.on = smooth(K.on, K.on + 0.25, tSeq);
    S.front = -W / 2 + Math.max(0, tSeq - K.on) * V;
    S.pin = S.on * (strong ? 1.15 : 0.6);
    const arrived = tSeq > tRing ? 1 - Math.exp(-(tSeq - tRing) / 0.25) : 0;
    const z = keyed(ZETA[mode], tSeq);
    S.Y = steady(f2, z) * arrived;
    S.T = 1 - 0.8 * S.Y / f2;
    if (strong) {
      S.rolls = smooth(K.mi, K.mi + 0.6, tSeq) * (1 - smooth(K.chaos - 0.3, K.chaos + 0.5, tSeq));
      S.c0 = smooth(K.chaos - 0.3, K.chaos + 0.5, tSeq);
      S.chaos = S.c0 * (1 - smooth(K.step, K.step + 0.4, tSeq));
      S.sol = smooth(K.step, K.sol, tSeq);
    } else { S.rolls = 0; S.c0 = 0; S.chaos = 0; S.sol = 0; }
    // the flowing dashes show the light going round; they fade once the light has broken up into bumps
    S.ripple = 1 - Math.max(S.rolls * 0.4, S.chaos * 0.7, S.sol);
    if (S.chaos > 0.05) S.T += 0.06 * S.chaos * Math.sin(tAll * 23.0) * Math.sin(tAll * 7.3);
    S.pout = S.pin * S.T;
    S.key = tSeq < tRing ? 'status.on'
      : !strong ? (tSeq < K.mi ? 'status.fill' : 'status.weak')
        : tSeq < K.mi ? 'status.fill' : tSeq < K.chaos ? 'status.rolls' : tSeq < K.sol - 0.2 ? 'status.noisy' : 'status';
  }

  // the light round the ring: background (steady light, with dashes) and peaks (bumps, rolls, soliton) on a grid
  const gBg = new Float32Array(NG), gPk = new Float32Array(NG);
  const bp = [0, 0];
  function bumpParams(b) {
    // peak brightness and width of a bump now; bump 0 does not fade at the step: it turns into the soliton
    const breathe = 0.6 + 0.4 * Math.sin(b.om * tAll + b.p), a2 = (b.a * breathe) ** 2;
    if (b.k === 0) { const m = S.sol; bp[0] = (1 - m) * S.c0 * a2 + m * AS2; bp[1] = b.w + (WSD - b.w) * m; }
    else { bp[0] = S.chaos * a2; bp[1] = b.w; }
    return bp;
  }
  function fillGrid() {
    // once the light breaks up, most of it sits in the bumps: the even background fades accordingly
    const bg = (0.1 * (S.Y > 0 ? 1 : 0) + 0.42 * S.Y) * (1 - 0.65 * S.rolls - 0.75 * S.chaos);
    const m = Math.round(LR / DL);
    for (let j = 0; j < NG; j++) {
      const xi = TAU * j / NG;
      const ph = (xi * m / TAU) % 1;
      const dash = 0.38 + 0.62 * Math.pow(0.5 + 0.5 * Math.cos(TAU * ph), 1.5);
      gBg[j] = bg * (1 - S.ripple + S.ripple * dash);
      gPk[j] = 0;
    }
    if (S.rolls > 0.002) {
      for (let j = 0; j < NG; j++) {
        const c = 0.5 + 0.5 * Math.cos(ROLLS * (TAU * j / NG - rollPos)), c3 = c * c * c;
        gPk[j] += S.rolls * 1.7 * c3 * c3;
      }
    }
    for (const b of bumps) {
      const [a2, w] = bumpParams(b);
      if (a2 < 0.003) continue;
      const span = Math.ceil(6 * w / TAU * NG), c = b.pos / TAU * NG;
      for (let dj = -span; dj <= span; dj++) {
        const j = ((Math.round(c) + dj) % NG + NG) % NG;
        let d = TAU * j / NG - b.pos;
        d -= TAU * Math.round(d / TAU);
        gPk[j] += a2 * sech(d / w) ** 2;
      }
    }
  }
  const sample = (grid, xi) => {
    const f = wrap(xi) / TAU * NG, i0 = Math.floor(f) % NG, i1 = (i0 + 1) % NG, u = f - Math.floor(f);
    return grid[i0] * (1 - u) + grid[i1] * u;
  };
  const rgbOut = [0, 0, 0];
  const paint = (bg, pk) => {
    rgbOut[0] = toS(LIR[0] * bg + LPK[0] * pk); rgbOut[1] = toS(LIR[1] * bg + LPK[1] * pk); rgbOut[2] = toS(LIR[2] * bg + LPK[2] * pk);
    return rgbOut;
  };
  function drawRing() {
    const rot = OM * tAll;
    arcs.forEach((seg, k) => net.setFn(seg, t => {
      const xi = TAU * (k + t) / 4 - rot;
      return paint(sample(gBg, xi), sample(gPk, xi));
    }));
  }

  // pulses leaving along the bus (one per pass of the soliton), and the dots that carry the comb's colours on
  const flying = [];                // start times of pulses on the bus
  let lastPass = null, lastRoll = null, chaosAcc = 0, inLevel = -1, outLevel = -1, pulseShown = false;
  const emitDot = (n, power, dx = 0, size = 0.13, dz = 0.07) => {
    const x0 = Math.max(0, dx), x1 = W / 2 + 2.4, z = ZB + (rnd() - 0.5) * dz;
    dots.emit({ from: [x0, Y + 0.02, z], to: [x1, Y + 0.02, z], dur: (x1 - x0) / V, rgb: lineRgb[n + NL], power, size, delay: Math.max(0, -dx) / V, fade: 0.12 });
  };
  function emitPulse() {
    flying.push(tAll);
    for (let n = -NL; n <= NL; n += 3) {
      const m = Math.max(-NL, Math.min(NL, n + Math.round((rnd() - 0.5) * 2)));
      emitDot(m, 0.7 + 0.6 * env(m), (rnd() - 0.5) * 0.42, 0.17 + 0.07 * env(m), 0.16);
    }
  }
  function emitters(dt) {
    const rot = OM * tAll;
    // the soliton passes the coupler (lab position 0) when its moving-frame position + rot crosses a multiple of 2 pi
    const b0 = bumps[0];
    const pass = Math.floor((b0.pos + rot) / TAU);
    if (lastPass !== null && pass !== lastPass && S.sol > 0.6 && mode === 'strong') emitPulse();
    lastPass = pass;
    const roll = Math.floor((rollPos + rot) * ROLLS / TAU);       // one of the four rolls passes the coupler
    if (lastRoll !== null && roll !== lastRoll && S.rolls > 0.3) {
      for (const n of [-ROLLS, ROLLS, (rnd() < 0.5 ? -2 : 2) * ROLLS]) emitDot(n, 0.55 + 0.4 * S.rolls, (rnd() - 0.5) * 0.2, 0.22);
    }
    lastRoll = roll;
    if (S.chaos > 0.3) {
      chaosAcc += dt * 9 * S.chaos;
      while (chaosAcc >= 1) {
        chaosAcc -= 1;
        // a random colour from the noisy spectrum
        const sp = spectrum();
        let tot = 0; for (let i = 0; i < sp.length; i++) if (i !== NL) tot += sp[i];
        let r = rnd() * tot, n = 1;
        for (let i = 0; i < sp.length; i++) { if (i === NL) continue; r -= sp[i]; if (r <= 0) { n = i - NL; break; } }
        emitDot(n, 0.45 + 0.5 * rnd(), 0, 0.18 + 0.07 * rnd());
      }
    }
    // pulses on the bus
    while (flying.length && V * (tAll - flying[0]) > W / 2 + 0.6) flying.shift();
  }
  const LP = 0.12;                  // pulse half-width on the bus (scene units)
  function drawBus() {
    // light coming in: a front while the laser is switched on, then steady
    if (S.front < W / 2 && S.on > 0 && S.front < 0.05) {
      const f = S.front, p = S.pin;
      net.setFn(sIn, t => { const x = -W / 2 + t * W / 2, k = clamp01((f - x) / 0.25); return paint(p * k, 0); });
      inLevel = -1;
    } else if (Math.abs(inLevel - S.pin) > 0.004) { net.set(sIn, IR, S.pin); inLevel = S.pin; }
    const po = S.Y > 0 || S.front > 0 ? S.pout : 0;
    if (S.front > 0 && S.front < W / 2) {
      const f = S.front;
      net.setFn(sOut, t => { const x = t * W / 2, k = clamp01((f - x) / 0.25); return paint(po * k, 0); });
      outLevel = -1;
    } else if (Math.abs(outLevel - po) > 0.004) { net.set(sOut, IR, po); outLevel = po; }
    inBeam.set(IR, S.pin);
    outBeam.set(IR, S.front > W / 2 ? po : 0);
    if (flying.length) {
      const xs = flying.map(t0 => V * (tAll - t0));
      pnet.setFn(sPulse, t => {
        const x = t * W / 2;
        let p = 0;
        for (const xp of xs) p += 1.25 * sech((x - xp) / LP) ** 2;
        return paint(0, p);
      });
      pulseShown = true;
    } else if (pulseShown) { pnet.set(sPulse, IR, 0); pulseShown = false; }
  }

  // ---------------------------------------------------------------- spectrum (the Out plate and the dots' colours)
  const spec = new Float32Array(2 * NL + 1);
  function spectrum() {
    for (let i = 0; i < spec.length; i++) {
      const n = i - NL;
      let h = 0;
      // rolls: lines at every 4th position
      if (S.rolls > 0 && n !== 0 && n % ROLLS === 0) h += S.rolls * [0, 0.62, 0.3, 0.12][Math.abs(n) / ROLLS];
      // the noisy jumble: the bumps added with their own phases (a speckle that changes all the time)
      if (S.chaos > 0) {
        let re = 0, im = 0, norm = 0;
        for (const b of bumps) {
          const aw = b.a * (0.6 + 0.4 * Math.sin(b.om * tAll + b.p)) * b.w;
          const f = aw * sech(Math.PI * n * b.w / 2), ph = b.ph - n * b.pos;
          re += f * Math.cos(ph); im += f * Math.sin(ph); norm += aw * aw;
        }
        h += S.chaos * 0.5 * (re * re + im * im) / Math.max(1e-6, norm);
      }
      // the soliton: a smooth sech^2 envelope
      h += S.sol * 0.66 * env(n);
      spec[i] = Math.min(1, h);
    }
    return spec;
  }

  // ---------------------------------------------------------------- plates
  // (the drawing box is shortened so that the axis word fits on the plate: kit.draw.axis writes it 0.36 box
  // heights below the box, which falls off the canvas with the plate's full box)
  const PX = u => 0.5 + u / 0.6;
  const short = box => ({ x: box.x, y: box.y, w: box.w, h: box.h - 34 });
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  inPlate.live((g, box) => {
    const h = S.on * (mode === 'strong' ? 0.88 : 0.36);
    kit.draw.spectrum(g, short(box), [{ u: PX(0), h, rgb: IR, w: 7 }], { axisWord: kit.word('colour') });
  }, 6);
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  outPlate.live((g, box0) => {
    const box = short(box0);
    const sp = spectrum();
    const lines = [];
    const arrived = clamp01((S.front - W / 2) / 0.5);           // nothing comes out before the light gets there
    for (let i = 0; i < sp.length; i++) {
      const n = i - NL;
      if (n === 0) continue;
      lines.push({ u: PX(lineU(n)), h: sp[i] * arrived, rgb: lineRgb[i], w: 6 });
    }
    // the laser's own colour, passing by the ring: it stands above the comb (in reality far brighter still)
    lines.push({ u: PX(0), h: arrived * Math.max(sp[NL], Math.min(1, S.pout / 1.15 * 1.02)), rgb: IR, w: 7 });
    kit.draw.spectrum(g, box, lines, { axisWord: kit.word('colour') });
  }, 6);

  // ---------------------------------------------------------------- control
  function start() {
    tSeq = 0; seedBumps(); flying.length = 0; dots.clear(); lastPass = null; lastRoll = null; chaosAcc = 0;
  }
  function settle() {               // straight to the steady state (overview, reset)
    seedBumps(); flying.length = 0; dots.clear(); lastPass = null; lastRoll = null;
    tSeq = K.sol + 1; mode = 'strong';
  }
  settle();

  function update(dt) {
    tAll += dt; tSeq += dt;
    idleUser = Math.max(0, idleUser - dt);
    if (focused && idleUser <= 0 && tSeq > K.sol + IDLE_LOOP && mode === 'strong') start();
    // bumps wander and flicker (bump 0 settles as it turns into the soliton)
    const still = mode === 'strong' ? S.sol : 1;
    for (const b of bumps) {
      const k = b.k === 0 ? 1 - still : 1;
      b.pos = wrap(b.pos + b.drift * dt * k);
      b.ph += b.nu * dt * k;
    }
    evaluate();
    fillGrid();
    drawRing();
    emitters(dt);
    drawBus();
  }
  update(0);

  return {
    anchors: {
      in: [-W / 2 - 1.2, Y + 0.05, ZB],
      ring: [-R * Math.SQRT1_2, Y + 0.05, CZ - R * Math.SQRT1_2],
      out: [W / 2 + 1.2, Y + 0.05, ZB],
    },
    controls: [{ id: 'start', type: 'button' }, { id: 'laser', type: 'choice', options: ['strong', 'weak'] }],
    act(id, v) {
      if (id === 'start') { start(); idleUser = 15; }
      if (id === 'laser' && (v === 'strong' || v === 'weak')) { if (v !== mode) { mode = v; start(); } idleUser = 15; }
      if (id === 'seek' && Number.isFinite(v)) { tSeq = v; idleUser = 15; }      // development: jump in the start-up
    },
    value(id) { return id === 'laser' ? mode : undefined; },
    status() { return { key: S.key, vars: {} }; },
    focus(on) {
      focused = on;
      if (on) { mode = 'strong'; start(); } else if (mode !== 'strong' || tSeq < K.sol) settle();
    },
    reset() { settle(); idleUser = 0; },
    update,
  };
}

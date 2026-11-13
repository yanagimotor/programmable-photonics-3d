// Ring colour converter: frequency doubling (second-harmonic generation) inside a poled lithium-niobate ring.
//
// After Lu et al., Optica 6, 1455 (2019): a z-cut thin-film lithium-niobate ring (radius 70 um) whose crystal is
// flipped in 59 radial stripes, and ONE "pulley" bus waveguide that wraps around part of the ring and carries both
// colours in and out.  Loaded Q 8e5 at the pump: the resonance is about 2 pm wide (one part in a million of the
// colour); the light goes round about 200 times on average and its power builds up about 400-fold.  With 0.1 mW of
// infrared light, 15% came out at twice the frequency.
//
// Model (qualitative, slowed down): the laser's detuning d (pm) from the ring's resonance sets the steady fill
// L(d) = 1 / (1 + (d / HW)^2).  The ring's fill F follows L with a build-up time TAU (about a nanosecond in
// reality, 0.4 s here).  Red light circling in the ring ~ F; new light at twice the frequency ~ F^2 (doubling grows
// with the square of the power); the red passing by dips to 1 - DIP * F; at full resonance ETA = 15% of the input
// leaves at twice the frequency (painted blue).  Off resonance the red passes by and nothing else happens.
// Photons tell the same story: two red photons merge into one blue photon, which goes on round the ring, crosses
// to the bus at the pulley and leaves.

export const meta = { id: 'ringshg', platform: 'ln', category: 'convert', size: { w: 8, d: 5.6 } };

export const text = {
  en: {
    name: 'Ring colour converter',
    tech: 'Periodically poled microring resonator · lithium niobate',
    what: 'Turns weak infrared light into a new colour inside a tiny ring.',
    in: 'Weak infrared laser light, tuned to the ring’s colour',
    out: 'Light of twice the frequency (blue), and leftover infrared',
    how: 'Making light of twice the frequency needs strong light: two infrared photons must merge into one. The ring stores light: when the laser’s colour matches the ring’s to about one part in a million, the light circles hundreds of times and grows hundreds of times stronger. Stripes of flipped crystal keep the new light in step.',
    use: 'Research labs: compact light sources that turn telecom lasers into the colours atoms need (as in atomic clocks), and quantum optics with very few photons.',
    fixed: 'The ring’s size and stripes are fixed when the chip is made: it works only near the one colour it was designed for, with its temperature held to a tenth of a degree.',
    c: { in: 'Weak infrared in', ring: 'Light circles and builds up', stripes: '', out: 'New colour out' },
    ctl: { tune: 'Tune the laser to the ring' },
    status: 'In tune: the light circles hundreds of times and builds up; <b>{p}%</b> of it leaves as blue light.',
    'status.near': 'Nearly in tune: a little light builds up; <b>{p}%</b> leaves as blue light.',
    'status.off': 'Out of tune: the light passes the ring by, and no blue light is made.',
    ref: 'Lu et al., Optica 6, 1455 (2019): with about a tenth of a milliwatt of infrared light, 15% came out at twice the frequency.',
    note: 'Slowed down: a real ring fills up in about a billionth of a second. The real ring is 0.14 mm across, with 59 stripes as drawn here.',
  },
  ja: {
    name: 'リング型色変換器',
    tech: '周期分極反転マイクロリング共振器・ニオブ酸リチウム',
    what: '弱い赤外光を、小さなリングの中で別の色に変えます。',
    in: 'リングの色に合わせた、弱い赤外レーザー光',
    out: '周波数が2倍の光（青）と、残った赤外光',
    how: '周波数が2倍の光をつくるには、強い光が必要です。赤外の光子が二つ合わさって一つになるからです。リングは光をためます。レーザーの色がリングの色に百万分の一ほどの精度で合うと、光は何百回も周回し、何百倍も強くなります。反転させた結晶の縞が、新しい光の歩調をそろえます。',
    use: '研究段階：通信用レーザーの光を原子に必要な色に変える小型光源（原子時計など）や、ごくわずかな光子を使う量子光学。',
    fixed: 'リングの大きさと縞は、作るときに決まります。設計した一つの色の近くでしか働かず、温度も0.1度ほどの精度で保つ必要があります。',
    c: { in: '弱い赤外光', ring: '光が回って強まる', stripes: '', out: '新しい色の光' },
    ctl: { tune: 'レーザーの色をリングに合わせる' },
    status: '色が合っています：光が何百回も回ってたまり、その<b>{p}%</b>が青い光になって出ていきます。',
    'status.near': 'ほぼ合っています：たまる光は少なく、青い光になるのは<b>{p}%</b>です。',
    'status.off': '色が合っていません：光はリングを素通りし、青い光はできません。',
    ref: 'Lu ほか、Optica 6, 1455 (2019)：約0.1 mWの弱い赤外光のうち、15%が周波数2倍の光になりました。',
    note: '実際のリングは約10億分の1秒で光が満ちますが、ここではゆっくり見せています。本物は直径0.14 mmで、描いたとおり59本の縞があります。',
  },
};

const W = meta.size.w, D = meta.size.d;
const Y = 0.085, YP = 0.1;                     // height of the light / of the photons
const R = 1.5, ZC = -0.05;                     // the ring: radius and centre (x = 0)
const RP = R + 0.34, TH = 0.42;                // the pulley: bus radius around the ring centre, half its wrap angle
const ZL = ZC + 1.48, XT = 1.75;               // straight bus leads (z) and where they start to bend (|x|)
const LANE = 0.06;                             // red and blue light drawn side by side, LANE from the middle
const HW = 1.0;                                // half width of the resonance (pm): the real line is about 2 pm wide
const DMAX = 6;                                // the slider's range (pm)
const TAU = 0.4;                               // build-up time (s), slowed down from about a nanosecond
const DIP = 0.8;                               // on resonance only 20% of the red passes by
const ETA = 0.15;                              // ... and 15% of it leaves at twice the frequency (Lu et al. 2019)
const VPH = 1.6;                               // photon speed (units/s, the speed of the flowing dashes)
const MERGES = 2.4;                            // photon merges per second at full resonance

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lor = d => 1 / (1 + (d / HW) * (d / HW));
const WORDS = { en: { ring: 'ring', laser: 'laser' }, ja: { ring: 'リング', laser: 'レーザー' } };

// a curve from (x0, z0) to (x1, z1) leaving and arriving along the given unit tangents (cubic Hermite)
function hermite(P, x0, z0, tx0, tz0, x1, z1, tx1, tz1, n = 48) {
  const k = Math.hypot(x1 - x0, z1 - z0);
  return P.fn(t => {
    const t2 = t * t, t3 = t2 * t;
    const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, d = t3 - t2;
    return [a * x0 + b * k * tx0 + c * x1 + d * k * tx1, a * z0 + b * k * tz0 + c * z1 + d * k * tz1];
  }, 0, 1, n);
}
// the same path moved sideways by o(t) (positive = left of the direction of travel, as the kit's normals)
function offset(P, path, o) {
  const f = typeof o === 'function' ? o : () => o;
  return P.fn(t => {
    const s = t * path.len, [x, z] = path.at(s), [dx, dz] = path.dir(Math.min(s, path.len - 1e-6));
    const d = f(t);
    return [x - dz * d, z + dx * d];
  }, 0, 1, Math.max(16, Math.ceil(path.len / 0.035)));
}
// write a light segment's profile in linear light (the kit's setFn takes display colours, whose brightness is not
// linear in power); f(t, out) fills out = linear rgb x power at t = 0..1 along the segment.  Kit wish: setLin().
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
  const IR = colour.IR, SH = colour.SH, irL = colour.lin(IR), shL = colour.lin(SH);
  const SPD = kit.reduced ? 0.5 : 1;
  const word = k => (WORDS[kit.lang()] || WORDS.en)[k];
  kit.chip({ w: W, d: D, platform: 'ln' });

  // ---- the ring, its flipped stripes, and the pulley bus that wraps around its front
  const xs = RP * Math.sin(TH), zs = ZC + RP * Math.cos(TH), ct = Math.cos(TH), st = Math.sin(TH);
  const busIn = P.chain(P.line(-W / 2, ZL, -XT, ZL), hermite(P, -XT, ZL, 1, 0, -xs, zs, ct, st));
  const arc = P.arc(0, ZC, RP, Math.PI / 2 + TH, Math.PI / 2 - TH);
  const busOut = P.chain(hermite(P, xs, zs, ct, -st, XT, ZL, 1, 0), P.line(XT, ZL, W / 2, ZL));
  kit.ridges([P.chain(busIn, arc, busOut)], 'ln', { w: 0.12 });
  kit.ridges([P.circle(0, ZC, R)], 'ln', { w: 0.24 });
  kit.radialPoling({ cx: 0, cz: ZC, r: R, width: 0.5, n: 59, duty: 0.42 });

  // ---- light: red (net R) and the new light (net B), side by side once both are there.  The ring's dashes
  // circle counter-clockwise as seen from above, i.e. along +x at the pulley, like the light in the bus.
  const ringRed = P.circle(0, ZC, R + LANE, -Math.PI / 2, -1), ringBlue = P.circle(0, ZC, R - LANE, -Math.PI / 2, -1);
  const netR = kit.lightNet({ width: 0.2, dashLen: ringRed.len / 11 });       // whole dashes round the ring
  const sIn = netR.add(busIn, { s0: 0, width: 0.24 });
  const sArc = netR.add(offset(P, arc, t => LANE * sstep(0.2, 0.9, t)), { s0: busIn.len, width: 0.22 });
  const sOut = netR.add(offset(P, busOut, LANE), { s0: busIn.len + arc.len });
  const sRing = netR.add(ringRed, { s0: 0 });
  netR.build();
  const netB = kit.lightNet({ width: 0.15, dashLen: ringBlue.len / 10 });
  const arcBlue = offset(P, arc, -LANE), busBlue = offset(P, busOut, -LANE);
  const bArc = netB.add(arcBlue, { s0: 0 });
  const bOut = netB.add(busBlue, { s0: arc.len });
  const bRing = netB.add(ringBlue, { s0: 0 });
  netB.build();
  if (kit.reduced) { netR.flow = 0.8; netB.flow = 0.8; }
  const writeR = linWriter(netR), writeB = linWriter(netB);

  // ---- beams: the laser in; red and blue out, side by side
  kit.beam({ from: [-W / 2 - 2.4, Y, ZL], to: [-W / 2, Y, ZL], rgb: IR, power: 1, r0: 0.08, fade: 'in' });
  const outR = kit.beam({ from: [W / 2, Y, ZL + LANE], to: [W / 2 + 2.4, Y, ZL + LANE], rgb: IR, power: 1, r0: 0.055, fade: 'out' });
  const outB = kit.beam({ from: [W / 2, Y, ZL - LANE], to: [W / 2 + 2.4, Y, ZL - LANE], rgb: SH, power: 0, r0: 0.055, fade: 'out' });

  // ---- the state: laser detuning (pm) and the ring's fill (0..1)
  let det = 0, F = 1, shown = -1;
  function apply() {
    const T = 1 - DIP * F, b2 = F * F;
    netR.set(sIn, IR, 1);
    writeR(sArc, (t, o) => { const p = 1 + (T - 1) * sstep(0.08, 0.92, t); o[0] = irL[0] * p; o[1] = irL[1] * p; o[2] = irL[2] * p; });
    netR.set(sOut, IR, T);
    netR.set(sRing, IR, 0.04 + 2.2 * F);
    writeB(bArc, (t, o) => { const p = 0.75 * b2 * sstep(0.1, 0.9, t); o[0] = shL[0] * p; o[1] = shL[1] * p; o[2] = shL[2] * p; });
    netB.set(bOut, SH, 0.75 * b2);
    netB.set(bRing, SH, 1.8 * b2);                                 // the new light builds up in the ring too
    outR.set(IR, T);
    outB.set(SH, 0.7 * b2);
    shown = F;
  }
  apply();

  // ---- photons: two red photons merge into one blue photon, which circles on, crosses at the pulley and leaves
  const ph = kit.photons({ max: 160, size: 0.15 });
  const RB = R - LANE;
  const hop0 = Math.PI / 2 + 0.16;                                   // where the blue photon leaves the ring
  const lane = P.chain(arcBlue, busBlue);                            // the bus's blue lane, from the pulley on
  const hopS = arc.len / 2 + 0.25;                                   // ... and where it lands on it
  const pHop = lane.at(hopS);
  const tail = P.chain(
    P.line(RB * Math.cos(hop0), ZC + RB * Math.sin(hop0), pHop[0], pHop[1]),
    P.fn(t => lane.at(hopS + t * (lane.len - hopS)), 0, 1, 200),
    P.line(W / 2, ZL - LANE, W / 2 + 2.4, ZL - LANE));
  function merge() {
    let a;
    do a = -Math.PI + 2 * Math.PI * kit.rand(); while (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.75);
    const da = 0.8, tRed = da * R / (VPH * SPD);
    for (const sg of [1, -1]) {
      ph.emit({ along: q => { const aa = a + da * (1 - q), rr = R + sg * 0.16 * (1 - q) * (1 - q); return [rr * Math.cos(aa), YP, ZC + rr * Math.sin(aa)]; }, dur: tRed, rgb: IR, power: 1.4, size: 0.2, fade: 0.2 });
    }
    let rest = (((a - hop0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);  // angle still to go round (a decreasing)
    if (rest < 1.2) rest += 2 * Math.PI;
    const Lr = rest * RB, L = Lr + tail.len;
    ph.emit({
      along: q => {
        const s = q * L;
        if (s < Lr) { const aa = a - s / RB, rr = R - LANE * Math.min(1, s / 0.35); return [rr * Math.cos(aa), YP, ZC + rr * Math.sin(aa)]; }
        const [x, z] = tail.at(s - Lr);
        return [x, YP, z];
      },
      dur: L / (VPH * SPD), delay: tRed * 0.85, rgb: SH, power: 1.5, size: 0.24, fade: 0.04,
    });
  }
  let mergeAcc = 0;

  // ---- the automatic programme: stay in tune, now and then a short scan across the resonance (the ring must be
  // lit for most of the tour's 12 s)
  const PROG = [{ hold: 8 }, { to: 4, dur: 1.2 }, { hold: 0.6 }, { to: -4, dur: 2.6, linear: true }, { hold: 0.6 }, { to: 0, dur: 1.6 }];
  let pk = 0, pt = 0, pFrom = 0, idleUser = 0;
  function stepProg(dt, focused) {
    const ph0 = PROG[pk];
    pt += dt * SPD;
    const dur = ph0.hold !== undefined ? (pk === 0 && focused ? 6 : ph0.hold) : ph0.dur;
    if (ph0.to !== undefined) {
      const k = Math.min(1, pt / dur), e = ph0.linear ? k : k * k * (3 - 2 * k);
      det = pFrom + (ph0.to - pFrom) * e;
    }
    if (pt >= dur) { pk = (pk + 1) % PROG.length; pt = 0; pFrom = det; }
  }

  // ---- plates: the laser's colour against the ring's resonance (in); red and blue (out)
  const MUTED = [0.62, 0.68, 0.74];
  const axisUnder = (g, bx) => {
    const y = bx.y + bx.h + 6;
    g.save(); g.strokeStyle = 'rgba(160,185,210,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(bx.x, y); g.lineTo(bx.x + bx.w, y); g.stroke();
    g.beginPath(); g.moveTo(bx.x + bx.w + 4, y); g.lineTo(bx.x + bx.w - 12, y - 7); g.lineTo(bx.x + bx.w - 12, y + 7); g.closePath();
    g.fillStyle = 'rgba(160,185,210,0.7)'; g.fill(); g.restore();
    kit.draw.text(g, kit.word('colour'), bx.x + bx.w, y + 30, { size: 24, rgb: MUTED, align: 'right', weight: 600 });
  };
  const SPAN = 7;                                                    // the In plate shows -7..+7 pm
  const PW = 3.4, PH = 1.9;
  const inPlate = kit.plate({ w: PW, h: PH, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  inPlate.live((g, box) => {
    const bx = { x: box.x, y: box.y + 26, w: box.w, h: box.h - 52 }, base = bx.y + bx.h;
    const xOf = d => (d + SPAN) / (2 * SPAN), X = x => bx.x + x * bx.w, Yh = h => base - h * bx.h;
    // the ring's colour: a hill where the ring takes the light (its resonance, about 2 pm wide)
    g.save();
    g.beginPath(); g.moveTo(X(0), base);
    for (let i = 0; i <= 120; i++) { const x = i / 120; g.lineTo(X(x), Yh(0.78 * lor(-SPAN + 2 * SPAN * x))); }
    g.lineTo(X(1), base); g.closePath();
    g.fillStyle = 'rgba(150,172,200,0.22)'; g.fill();
    g.strokeStyle = 'rgba(175,195,220,0.75)'; g.lineWidth = 3; g.stroke();
    g.restore();
    const xl = Math.min(1, Math.max(0, xOf(det)));
    const right = xl < 0.56;                                       // the ring's label on the side away from the laser
    kit.draw.text(g, word('ring'), X(right ? 0.565 : 0.435), Yh(0.8), { size: 34, rgb: [0.72, 0.78, 0.86], align: right ? 'left' : 'right', weight: 700 });
    kit.draw.spectrum(g, bx, [{ u: xl, h: 1, rgb: IR, w: 12 }], { axisWord: false });
    kit.draw.text(g, word('laser'), X(xl), bx.y - 9, { size: 34, rgb: [1, 0.42, 0.36], align: xl < 0.2 ? 'left' : xl > 0.8 ? 'right' : 'center', weight: 700 });
    axisUnder(g, bx);
  }, 10);
  const outPlate = kit.plate({ w: PW, h: PH, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  outPlate.live((g, box) => {
    const bx = { x: box.x, y: box.y + 26, w: box.w, h: box.h - 52 };
    const XR = 0.4, XB = 0.8, base = bx.y + bx.h;                 // in proportion to frequency: blue at twice red's
    const T = 1 - DIP * F, b = ETA * F * F;
    g.save(); g.setLineDash([9, 8]); g.strokeStyle = colour.css(IR, 0.45); g.lineWidth = 4;   // the red that went in
    g.beginPath(); g.moveTo(bx.x + XR * bx.w, base); g.lineTo(bx.x + XR * bx.w, bx.y); g.stroke(); g.restore();
    kit.draw.spectrum(g, bx, [{ u: XR, h: T, rgb: IR, w: 12 }, { u: XB, h: b, rgb: SH, w: 12 }], { axisWord: false });
    const pct = Math.round(100 * b);
    if (pct >= 1) kit.draw.text(g, pct + '%', bx.x + XB * bx.w, Math.min(base - b * bx.h - 12, base - 48), { size: 42, rgb: [0.5, 0.7, 1], align: 'center', weight: 800 });
    kit.draw.text(g, '×2', bx.x + XB * bx.w + 18, base - 8, { size: 32, rgb: [0.5, 0.7, 1], align: 'left', weight: 800 });
    axisUnder(g, bx);
  }, 10);

  return {
    anchors: {
      in: [-W / 2 - 1.1, Y + 0.05, ZL],
      ring: [R * Math.cos(-2.45), Y + 0.05, ZC + R * Math.sin(-2.45)],
      stripes: [(R + 0.2) * Math.cos(0.15), Y + 0.05, ZC + (R + 0.2) * Math.sin(0.15)],
      out: [W / 2 + 1.1, Y + 0.05, ZL],
    },
    controls: [{ id: 'tune', type: 'slider', min: -DMAX, max: DMAX, step: 0.1, noValue: true }],   // (the plates show how far off)
    act(id, v) {
      if (id === 'tune' && Number.isFinite(+v)) { det = Math.max(-DMAX, Math.min(DMAX, +v)); idleUser = 15; }
    },
    value(id) { return id === 'tune' ? Math.round(det * 10) / 10 : undefined; },
    status() {
      const p = Math.round(100 * ETA * F * F);
      return { key: F > 0.6 ? 'status' : p >= 1 ? 'status.near' : 'status.off', vars: { p } };
    },
    focus(on) {
      if (on && idleUser <= 0) { det = -5; pk = 4; pt = 0; pFrom = det; }   // start out of tune, then tune in
    },
    reset() { det = 0; F = 1; pk = 0; pt = 0; pFrom = 0; idleUser = 0; mergeAcc = 0; ph.clear(); apply(); },
    update(dt, t, focused) {
      if (idleUser > 0) {
        idleUser -= dt;
        if (idleUser <= 0) { pk = PROG.length - 1; pt = 0; pFrom = det; }   // then tune back in by itself
      } else stepProg(dt, focused);
      F += (lor(det) - F) * (1 - Math.exp(-dt * SPD / TAU));
      if (Math.abs(F - shown) > 2e-4) apply();
      mergeAcc += dt * MERGES * SPD * F * F;
      if (mergeAcc > 1) { mergeAcc -= 1 + 0.6 * (kit.rand() - 0.5); merge(); }
    },
  };
}

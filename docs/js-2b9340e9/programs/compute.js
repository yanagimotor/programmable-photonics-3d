// Program "Light computer": the light-programmable chip with many inputs and many outputs under a dense free-form
// pattern of light (lots of information flowing through our chip, a complicated pattern encoding a very complicated
// function, little heat).  First tab 3's optical computation, then tab 2's sixth program, after voice recognition,
// while tab 3 tells optical computation as a story of its own.  Its thermometer stays cool beside it, as it did
// beside the GPU.  The patterns are made up (random streaks with the look of the paper's trained patterns, mixed
// here: streakField, patternOf); the light through them is computed (programs/freeform.js).  Every third of a second
// 36 new numbers come in as pulses of light, and the 36 outputs are what the slab makes of them; every 1.6 s the chip
// is reprogrammed (another layer of a network, another function): the green light changes (the programming
// illumination changes with time).
// The light is drawn as visitors picture it: trains of yellow-white pulses, white in the slab too.
import { freeformChip, streakField, patternOf } from './freeform.js';

export const DEVICE = { lam0: 1.55e-3, n0: 2.14, wx: 1.0, nx: 256, L: 10.0, nz: 100, dnMax: 1e-3, pw: 0.47, absX: 0.47, absG: 0.6 };
export const BEAMS = { n: 36, x0: -0.42, x1: 0.42, w: 0.011 };
export const BINS = { n: 36, x0: -0.42, x1: 0.42 };
const SIZE = { w: 8.8, d: 7.5 };      // closer to a square than tab 2's slab chips

// (app: no IN and OUT plates - its 36 streams of light in and out are the picture; it was tab 3's)
export const meta = { id: 'compute', platform: 'ln', category: 'compute', size: { ...SIZE }, app: true };

const PERIOD = 0.33;                  // seconds between two sets of inputs
const PROGRAM = 1.6;                  // seconds between two patterns
const COOL = 0.16;                    // the thermometer: barely above the room
const WHITE = [1, 0.9, 0.72];         // the light in the slab: yellow-white, as the pulses

export const text = {
  en: {
    name: 'Light computer',
    tech: 'Slab waveguide written by light · lithium niobate',
    what: 'Computes a large, complicated function while the light passes through.',
    in: '36 streams of data, as pulses of light',
    out: '36 results, as light',
    how: 'A pattern of light written on the chip bends and mixes the light; the whole calculation happens as the light flies through, with almost no heat.',
    use: 'Large AI models need enormous amounts of this kind of calculation.',
    fixed: 'Nothing is etched: another pattern of light computes another function.',
    c: { in: 'Input', pattern: '', out: 'Output' },
    ref: 'The idea: Onodera et al., Nature Physics 22, 164 (2026).',
    note: 'The patterns here are made up; the light through them is computed.',
  },
  ja: {
    name: '光の計算機',
    tech: '光で書いたスラブ導波路・ニオブ酸リチウム',
    what: '光が通り抜けるあいだに、大きく複雑な計算を行います。',
    in: '36本のデータの流れ。光のパルスで入ります',
    out: '36個の結果。光で出ます',
    how: 'チップに書いた光のパターンが光を曲げ、混ぜ合わせます。計算は光が通り抜けるあいだに終わり、熱はほとんど出ません。',
    use: '大きなAIモデルは、この種の計算を膨大に必要とします。',
    fixed: '何も刻まれていません。別の光のパターンで、別の計算になります。',
    c: { in: '入力', pattern: '', out: '出力' },
    ref: '考え方：Onodera ほか、Nature Physics 22, 164 (2026)。',
    note: 'ここでのパターンは作ったものですが、その中を通る光は計算しています。',
  },
};

export function create(kit) {
  const { P } = kit;
  const X0 = -2.75, X1 = 2.75, EDGE = SIZE.w / 2 - 0.1, FAR = 7.6;
  // the patterns: three fields of streaks, made once; every program is another mix of them (a random direction),
  // so that every pattern has the same look and none repeats
  const nz = DEVICE.nz, nxp = DEVICE.nx / 2;
  const base = [0, 1, 2].map(() => streakField(nz, nxp, () => kit.rand()));
  const gauss = () => { let u = 0; while (!u) u = kit.rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * kit.rand()); };
  const F = new Float32Array(nz * nxp);
  const newPattern = () => {
    const a = [gauss(), gauss(), gauss()], n = Math.hypot(...a) || 1;
    for (let i = 0; i < F.length; i++) F[i] = (a[0] * base[0][i] + a[1] * base[1][i] + a[2] * base[2][i]) / n;
    return patternOf(F, DEVICE);
  };
  const ff = freeformChip(kit, { DEVICE, BEAMS, BINS }, { pattern: newPattern(), size: SIZE,
    geo: { X0, X1, XI: X0 - 0.1, XO: X1 + 0.1, SX: 6.0 }, cells: false, mode: 'fade',
    gamma: 1.5, pulse: 0.42, flow: 3.0, dash: 16, fade: 0.2, rgb: WHITE });
  const N = BEAMS.n, M = BINS.n;
  const zIn = i => ff.zOf(BEAMS.x0 + (BEAMS.x1 - BEAMS.x0) * i / (N - 1));
  const zOut = c => ff.zOf(ff.binX(c));
  // the ports: at the chip's edges wider apart than at the slab, joined by S-bends (written by the light too); the
  // light in them and in the air: trains of pulses
  const spread = 1.2;
  const tr = kit.pulses({ width: 0.11, spacing: 1.05, length: 0.14, speed: 2.8, y: kit.RIDGE.h + 0.03 });
  // (each train its own phase: trains side by side do not line up)
  const guides = [], sIn = [], sOut = [];
  for (let i = 0; i < N; i++) {
    const z = zIn(i), ze = z * spread, o = kit.rand() * 3;
    const on = P.chain(P.line(-EDGE, ze, -EDGE + 0.4, ze), P.sbend(-EDGE + 0.4, ze, X0 - 0.3, z), P.line(X0 - 0.3, z, X0, z));
    guides.push(on);
    sIn.push(tr.add(P.line(-FAR, ze, -EDGE, ze), { s0: o }), tr.add(on, { s0: FAR - EDGE + o }));
  }
  for (let c = 0; c < M; c++) {
    const z = zOut(c), ze = z * spread, o = kit.rand() * 3;
    const on = P.chain(P.line(X1, z, X1 + 0.3, z), P.sbend(X1 + 0.3, z, EDGE - 0.4, ze), P.line(EDGE - 0.4, ze, EDGE, ze));
    guides.push(on);
    sOut.push(tr.add(on, { s0: o }), tr.add(P.line(EDGE, ze, FAR, ze), { s0: on.len + o }));
  }
  kit.ridges(guides, 'ln', { w: 0.06 });
  tr.build();

  // the data: new numbers every PERIOD; the outputs are what the light computes
  let timer = 0, ptimer = 0, amps = new Array(N).fill(0), res = null;
  const show = () => {
    res = ff.show(amps);
    for (let i = 0; i < N; i++) { const p = 0.12 + 1.3 * amps[i] * amps[i]; tr.white(sIn[2 * i], p, { seed: i }); tr.white(sIn[2 * i + 1], p, { seed: i }); }
    const m = Math.max(...res.share) || 1;
    for (let c = 0; c < M; c++) { const v = res.share[c] / m, p = 0.08 + 1.35 * v; tr.white(sOut[2 * c], p, { seed: 100 + c }); tr.white(sOut[2 * c + 1], p, { seed: 100 + c }); }
  };
  const next = () => { amps = amps.map(() => (kit.rand() < 0.22 ? 0 : 0.25 + 0.75 * kit.rand())); show(); };
  next();

  // the thermometer: barely warm.  (Back left, where tab 2's programs stand their IN plate: clear of the chip and of
  // the green light; on the chip's corner it stood in the light)
  const thermo = kit.plate({ w: 1.5, h: 2.7, at: [-FAR + 0.1, 3.9, -SIZE.d / 2], title: '' });
  thermo.live((g, box) => kit.draw.thermo(g, box, COOL, { rgb: [0.35, 0.7, 1] }), 2);

  const zFront = zIn(0) * spread;          // the trains nearest the visitor
  return {
    anchors: { in: [-FAR + 0.9, 0.1, zFront + 0.5], out: [FAR - 0.9, 0.1, zFront + 0.5] },
    controls: [],
    reset() { timer = 0; ptimer = 0; next(); },
    update(dt) {
      timer += dt; ptimer += dt;
      if (ptimer >= PROGRAM) { ptimer -= PROGRAM; ff.setPattern(newPattern(), { fade: 0.45 }); show(); }
      if (timer >= PERIOD) { timer -= PERIOD; next(); }
      ff.update(dt);
    },
    get outputs() { return res; },
  };
}

// AI chip: a 5 x 5 mesh of Mach-Zehnder interferometers that multiplies five numbers by a fixed table (a
// matrix), the core sum of a neural network, as in Shen et al. (Nature Photonics 2017), who used such a chip to
// recognise spoken vowels.
//
// One laser beam enters, is split five ways, five encoders set each beam's amplitude to one number of the input
// (the "sound" of a vowel, illustrative features), five columns of MZIs mix the beams (each MZI a rotation by
// its heater's angle), and five on-chip detectors read the result.  The weights are the mesh's angles; the five
// vowels' inputs are the rows of the mesh's matrix, so each vowel lights its own detector.  A little noise is
// added to every input, as a real voice would.  Amplitudes are carried through the mesh exactly (rotations);
// inside an MZI both arms carry half of the pair's power, as in the real device.
import { buildMesh, pairsOf } from './mzimesh.js';

export const meta = { id: 'mlmesh', platform: 'si', category: 'compute', size: { w: 11, d: 4.4 } };

const VOWELS = ['a', 'i', 'u', 'e', 'o'];
const KANA = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };

export const text = {
  en: {
    name: 'AI calculator',
    tech: 'Mesh of Mach–Zehnder interferometers · silicon',
    what: 'Recognises vowels by doing AI’s maths with light.',
    in: 'Five numbers from a spoken vowel, as the brightness of five beams',
    out: 'Five detectors: the brightest one names the vowel',
    how: 'Each beam carries one number. In each small switch two beams meet and mix in a ratio held by a heater. After five layers of mixing, every output is a weighted sum of all the inputs: the multiplication is done when the light arrives.',
    use: 'Research labs and start-ups building faster, lower-power hardware for AI.',
    fixed: 'Its size is etched in: five inputs, five outputs, one kind of sum. A bigger problem needs a bigger chip, with hundreds of heaters, each with its own wire.',
    c: { in: 'Light in', split: '', enc: 'Numbers in', heater: 'Light mixes here', det: 'Brightest = answer' },
    ctl: { vowel: 'Pick a vowel' },
    opt: { vowel: { a: 'a', i: 'i', u: 'u', e: 'e', o: 'o' } },
    status: 'Heard “{v}” → the brightest detector says <b>“{w}”</b>.',
    'status.wrong': 'Heard “{v}” → the brightest detector says <b>“{w}”</b>: wrong this time.',
    ref: 'Shen et al., Nature Photonics 11, 441 (2017): a chip like this recognised spoken vowels.',
    note: 'The five numbers for each vowel are made up for this page, with a little noise added; Shen et al. used four numbers measured from real voices.',
  },
  ja: {
    name: 'AI計算チップ',
    tech: 'マッハ・ツェンダー干渉計の網・シリコン',
    what: 'AIの中心となる計算を光で行い、母音を聞き分けます。',
    in: '話した母音から取り出した5つの数。5本の光の明るさで入ります',
    out: '5つの検出器。いちばん明るいものが母音の答え',
    how: '光1本が数を一つ運びます。小さなスイッチで2本の光が出会い、ヒーターで決めた割合で混ざります。5段混ざると、どの出力も全入力の重みつきの和になります。光が届いたときには、掛け算は終わっています。',
    use: 'AI向けの、より速く省電力な計算機を目指す研究機関やスタートアップ。',
    fixed: '大きさは刻み込まれています。入力5つ、出力5つ、一種類の計算だけ。もっと大きな問題には、何百ものヒーターと、その一つひとつにつながる配線を持つ、もっと大きなチップが必要です。',
    c: { in: '入力光', split: '', enc: '数を入れる', heater: 'ここで光が混ざる', det: 'いちばん明るい＝答え' },
    ctl: { vowel: '母音を選ぶ' },
    opt: { vowel: { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' } },
    status: '「{v}」と聞こえた → いちばん明るい検出器の答えは<b>「{w}」</b>。',
    'status.wrong': '「{v}」と聞こえた → いちばん明るい検出器の答えは<b>「{w}」</b>。今回は不正解です。',
    ref: 'Shen ほか、Nature Photonics 11, 441 (2017)：このようなチップで、話した母音を聞き分けました。',
    note: '各母音の5つの数は、このページのために作ったもので、少し雑音を加えています。Shen らは実際の声から測った4つの数を使いました。',
  },
};

const N = 5, PITCH = 0.55, W = meta.size.w, D = meta.size.d;
const X = { in0: -W / 2, mmi0: -5.0, mmi1: -4.45, fan1: -4.1, enc0: -4.0, enc1: -3.25, mesh0: -3.1, mesh1: 3.3, det: 4.3 };
const Y = 0.085;
const AUTO = 3.6, MORPH = 0.55, NOISE = 0.2;

export function create(kit) {
  const { P, colour } = kit;
  const RGB = colour.IR;
  kit.chip({ w: W, d: D, platform: 'si' });
  kit.carrier({ w: W + 1.4, d: D + 2.0, chipH: 0.45 });
  const net = kit.lightNet({ width: 0.3 });

  // one input guide, a splitter (a short slab), five guides fanning out
  const z = Array.from({ length: N }, (_, j) => (j - (N - 1) / 2) * PITCH);
  const lead = P.line(X.in0, 0, X.mmi0, 0);
  const sLead = net.add(lead, { s0: 0 });
  const mmiPath = P.line(X.mmi0, 0, X.mmi1, 0);
  const sMmi = net.add(mmiPath, { s0: X.mmi0 - X.in0, width: 1.2 });
  kit.slab([[X.mmi0, -0.5], [X.mmi1, -0.5], [X.mmi1, 0.5], [X.mmi0, 0.5]], 'si');
  const zf = z.map(zz => zz * 0.33);
  const fan = z.map((zz, j) => P.chain(P.sbend(X.mmi1, zf[j], X.fan1, zz), P.line(X.fan1, zz, X.enc0, zz)));
  const sFan = fan.map(p => net.add(p, { s0: X.mmi1 - X.in0 }));
  const enc = z.map(zz => P.line(X.enc0, zz, X.enc1, zz));
  const sEnc = enc.map(p => net.add(p, { s0: X.enc0 - X.in0 }));
  const gapPaths = z.map(zz => P.line(X.enc1, zz, X.mesh0, zz));
  const sGap = gapPaths.map(p => net.add(p, { s0: X.enc1 - X.in0 }));
  const mesh = buildMesh(kit, { n: N, pitch: PITCH, x0: X.mesh0, x1: X.mesh1, cols: N, net, platform: 'si', leadOut: X.det - 0.2, lb: 0.17, lcp: 0.1, sStart: X.in0 });
  kit.ridges([lead, ...fan, ...enc, ...gapPaths], 'si');
  net.build();
  const encoders = kit.electrodes(z.flatMap(zz => [
    { x0: X.enc0 + 0.06, z0: zz - 0.16, x1: X.enc1 - 0.06, z1: zz - 0.16, w: 0.1 },
    { x0: X.enc0 + 0.06, z0: zz + 0.16, x1: X.enc1 - 0.06, z1: zz + 0.16, w: 0.1 },
  ]), { rgb: [1, 0.85, 0.4] });
  const dets = kit.detectors(z.map(zz => [X.det, zz]), { size: 0.34 });

  // wires: pads on both long edges of the chip, bonded to the carrier
  const padX = Array.from({ length: 11 }, (_, i) => -4.2 + i * 0.86);
  const padsChip = [...padX.map(x => [x, -D / 2 + 0.3]), ...padX.map(x => [x, D / 2 - 0.3])];
  kit.pads(padsChip, 0.26);
  kit.pads([...padX.map(x => [x, -D / 2 - 0.55]), ...padX.map(x => [x, D / 2 + 0.55])], 0.3, -0.45);
  kit.bonds(padX.flatMap(x => [[[x, 0.03, -D / 2 + 0.3], [x, -0.42, -D / 2 - 0.55]], [[x, 0.03, D / 2 - 0.3], [x, -0.42, D / 2 + 0.55]]]), { rise: 0.35 });

  // the beam in
  kit.beam({ from: [X.in0 - 2.4, Y, 0], to: [X.in0, Y, 0], rgb: RGB, power: 1.1, r0: 0.08, fade: 'in' });

  // the mesh's weights: one angle per MZI (fixed, "trained"), and its matrix acting on real amplitudes
  const phi = mesh.mzis.map(() => 0.3 + 1.0 * kit.rand());
  const forward = (x, record = null) => {
    let a = x.slice();
    for (let c = 0; c < N; c++) {
      const nx = a.slice();
      for (const j of pairsOf(c, N)) {
        const m = mesh.mzis.find(mm => mm.c === c && mm.j === j), f = phi[m.heater];
        const cs = Math.cos(f), sn = Math.sin(f);
        nx[j] = cs * a[j] - sn * a[j + 1]; nx[j + 1] = sn * a[j] + cs * a[j + 1];
        if (record) record(c, j, a[j], a[j + 1], nx[j], nx[j + 1]);
      }
      if (record) for (let j = 0; j < N; j++) if (mesh.segs[c][j].through !== undefined) record(c, j, a[j], null, a[j], null);
      a = nx;
    }
    return a;
  };
  const backward = y => {
    let a = y.slice();
    for (let c = N - 1; c >= 0; c--) {
      const nx = a.slice();
      for (const j of pairsOf(c, N)) {
        const m = mesh.mzis.find(mm => mm.c === c && mm.j === j), f = phi[m.heater];
        const cs = Math.cos(f), sn = Math.sin(f);
        nx[j] = cs * a[j] + sn * a[j + 1]; nx[j + 1] = -sn * a[j] + cs * a[j + 1];
      }
      a = nx;
    }
    return a;
  };
  const proto = VOWELS.map((_, k) => backward(VOWELS.map((__, j) => (j === k ? 1 : 0))));

  // state: the input shown now morphs from `from` to `to`
  let cur = 0, from = proto[0].slice(), to = proto[0].slice(), x = proto[0].slice(), morph = 1;
  let auto = AUTO, idleUser = 0, y = forward(x), answer = 0;
  const gauss = () => { let u = 0, v = 0; while (u === 0) u = kit.rand(); v = kit.rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const say = k => {
    cur = k;
    const n = proto[k].map(v => v + NOISE * gauss());
    const L = Math.hypot(...n) || 1;
    from = x.slice(); to = n.map(v => v / L); morph = 0;
  };
  say(0); x = to.slice(); morph = 1;

  function show() {
    y = forward(x, (c, j, a0, a1, o0, o1) => {
      const sg = mesh.segs[c];
      if (a1 === null) { net.set(sg[j].through, RGB, a0 * a0 * GAIN); return; }
      net.set(sg[j].approach, RGB, a0 * a0 * GAIN); net.set(sg[j + 1].approach, RGB, a1 * a1 * GAIN);
      const arm = (a0 * a0 + a1 * a1) / 2;
      net.set(sg[j].arm, RGB, arm * GAIN); net.set(sg[j + 1].arm, RGB, arm * GAIN);
      net.set(sg[j].leave, RGB, o0 * o0 * GAIN); net.set(sg[j + 1].leave, RGB, o1 * o1 * GAIN);
    });
    const P0 = 0.55;                                        // power in each of the five beams before encoding
    net.set(sLead, RGB, 1.2); net.set(sMmi, RGB, 0.9);
    sFan.forEach(s => net.set(s, RGB, P0));
    sEnc.forEach((s, j) => net.setFn(s, t => { const p = P0 + (x[j] * x[j] * GAIN - P0) * Math.min(1, t * 1.4); return RGB.map(c => c * p); }));
    sGap.forEach((s, j) => net.set(s, RGB, x[j] * x[j] * GAIN));
    mesh.leads.out.forEach((s, j) => net.set(s, RGB, y[j] * y[j] * GAIN));
    z.forEach((_, j) => { encoders.set(2 * j, 0.1 + 0.45 * Math.abs(x[j])); encoders.set(2 * j + 1, 0.1 + 0.45 * Math.abs(x[j])); });
    answer = y.reduce((b, v, j) => (v * v > y[b] * y[b] ? j : b), 0);
    y.forEach((v, j) => dets.set(j, 0.15 + 2.2 * v * v, j === answer ? [1, 0.82, 0.4] : [1, 0.5, 0.4]));
    mesh.mzis.forEach(m => mesh.heaters.set(m.heater, phi[m.heater] / 1.4));
  }
  const GAIN = 1.5;
  show();

  // plates: the vowel and its five numbers in; the five detectors out
  const glyph = k => (kit.lang() === 'ja' ? KANA[VOWELS[k]] : VOWELS[k]);
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-3.0, 1.8, -D / 2 - 1.5], title: 'in' });
  inPlate.live((g, box) => {
    const gw = box.w * 0.3;
    kit.draw.text(g, glyph(cur), box.x + gw * 0.45, box.y + box.h * 0.82, { size: Math.round(box.h * 0.95), align: 'center', weight: 700 });
    kit.draw.bars(g, { x: box.x + gw, y: box.y, w: box.w - gw, h: box.h }, x, { rgb: [1, 0.35, 0.25], signed: true, max: 0.9 });
  }, 10);
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [3.0, 1.8, -D / 2 - 1.5], title: 'out' });
  outPlate.live((g, box) => {
    const p = y.map(v => v * v), m = Math.max(...p);
    kit.draw.bars(g, box, p, { labels: VOWELS.map((_, k) => glyph(k)), rgb: [1, 0.35, 0.25], highlight: answer, max: Math.max(0.6, m) });
  }, 10);

  return {
    anchors: {
      in: [X.in0 - 1.1, Y + 0.05, 0],
      split: [(X.mmi0 + X.mmi1) / 2, Y + 0.05, 0.45],
      enc: [(X.enc0 + X.enc1) / 2, Y + 0.05, z[N - 1] + 0.16],
      heater: [mesh.mzis[3].xh, Y + 0.05, mesh.mzis[3].zh],
      det: [X.det + 1.2, Y + 0.05, z[N - 1]],      // (beside the answer's glow, not on it)
    },
    controls: [{ id: 'vowel', type: 'choice', options: VOWELS }],
    act(id, v) { if (id === 'vowel') { const k = VOWELS.indexOf(v); if (k >= 0) { say(k); idleUser = 15; auto = AUTO; } } },
    value(id) { return id === 'vowel' ? VOWELS[cur] : undefined; },
    status() {
      const lab = k => (kit.lang() === 'ja' ? KANA[VOWELS[k]] : VOWELS[k]);
      return { key: answer === cur ? 'status' : 'status.wrong', vars: { v: lab(cur), w: lab(answer) } };
    },
    reset() { say(0); x = to.slice(); morph = 1; idleUser = 0; auto = AUTO; show(); },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      auto -= dt;
      if (auto <= 0 && idleUser <= 0) { let k; do k = Math.floor(kit.rand() * N); while (k === cur); say(k); auto = AUTO; }
      if (morph < 1) {
        morph = Math.min(1, morph + dt / MORPH);
        const e = morph * morph * (3 - 2 * morph);
        x = from.map((v, j) => v + (to[j] - v) * e);
        show();
      }
    },
  };
}

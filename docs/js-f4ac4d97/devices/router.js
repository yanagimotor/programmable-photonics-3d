// Light router: a 6 x 6 network of Mach-Zehnder switches on silicon (the reference device for the others).
//
// Four data channels A-D enter on guides 0, 2, 3, 5, each on its own colour of light (four frequencies, as in a
// network that carries several colours on one fibre).  Six columns of switches route them: the switch states
// are those of an odd-even sorting network (bubble sort), so any assignment of the six exits is reachable.
// The light is computed, not drawn: every channel's field is carried through the switches (couplers and the
// heater's phase), so when a heater changes its light visibly splits and moves to the other guide.
import { buildMesh, pairsOf, mzi } from './mzimesh.js';

export const meta = { id: 'router', platform: 'si', category: 'comm', size: { w: 11, d: 4.6 } };

export const text = {
  en: {
    name: 'Light router',
    tech: 'Network of Mach–Zehnder switches · silicon',
    what: 'Sends each beam of light to a chosen exit.',
    in: 'Four channels of data, each on its own colour of light',
    out: 'The same channels, at the chosen exits',
    how: 'The chip is a network of small switches. Each switch splits the light into two paths and joins them again. A tiny heater on one path delays its light very slightly, and that decides which of the two exits the light takes.',
    use: 'Data centres and telecom networks: reconnecting fibres in microseconds, without converting the light to electronics and back.',
    fixed: 'The paths are etched into the silicon. Heaters can choose among them, but this chip will only ever be a router, with six entrances and six exits.',
    c: { in: 'Light in', mzi: 'Switch', heater: 'Heater picks the path', out: 'Light out' },
    ctl: { shuffle: 'New routes' },
    status: 'A → exit {a} · B → exit {b} · C → exit {c} · D → exit {d}',
    ref: 'Suzuki et al., Journal of Lightwave Technology 37, 116 (2019): a 32 × 32 silicon router built from switches like these.',
  },
  ja: {
    name: '光ルーター',
    tech: 'マッハ・ツェンダー型スイッチの網・シリコン',
    what: 'それぞれの光を、選んだ出口へ送ります。',
    in: '4つのデータ信号。それぞれ別の色の光に乗っています',
    out: '同じ信号が、選んだ出口から',
    how: 'チップは小さなスイッチの網です。スイッチは光を二つの道に分け、また合わせます。片方の道の小さなヒーターが光をほんのわずかに遅らせると、光が二つの出口のどちらへ行くかが決まります。',
    use: 'データセンターや通信網。光を電気に変えずに、マイクロ秒単位で光ファイバーをつなぎ替えます。',
    fixed: '道はシリコンに刻まれています。ヒーターで道を選べても、このチップはずっとルーターのまま。入口6つ、出口6つです。',
    c: { in: '入力光', mzi: 'スイッチ', heater: 'ヒーターが道を選ぶ', out: '出力光' },
    ctl: { shuffle: '経路を変える' },
    status: 'A → 出口{a}・B → 出口{b}・C → 出口{c}・D → 出口{d}',
    ref: 'Suzuki ほか、Journal of Lightwave Technology 37, 116 (2019)：このようなスイッチで作った32×32のシリコン光ルーター。',
  },
};

const N = 6, PITCH = 0.5, W = meta.size.w, D = meta.size.d;
const MESH = { x0: -4.6, x1: 4.6 };
const Y = 0.085;                                   // height of the light (just above the ridges)
const STREAMS = [
  { name: 'A', line: 0, u: 0.0 }, { name: 'B', line: 2, u: 0.3 },
  { name: 'C', line: 3, u: 0.64 }, { name: 'D', line: 5, u: 0.97 },
];
const AUTO = 7;                                    // seconds between automatic new routes
const SWITCH_TIME = 0.7;                           // seconds for a heater to change state (slowed down to be seen)

export function create(kit) {
  const { colour } = kit;
  for (const s of STREAMS) s.rgb = colour.ramp(s.u);
  kit.chip({ w: W, d: D, platform: 'si' });
  const net = kit.lightNet({ width: 0.3 });
  const mesh = buildMesh(kit, { n: N, pitch: PITCH, ...MESH, cols: N, net, platform: 'si', leadIn: -W / 2, leadOut: W / 2 });
  net.build();
  const z = mesh.z;
  // bond pads along the back edge (the heaters' wires)
  kit.pads(Array.from({ length: 12 }, (_, i) => [-4.4 + i * 0.8, -D / 2 + 0.38]), 0.3);

  // beams in and out
  const yIn = Y, xin = -W / 2, xout = W / 2;
  const inBeams = STREAMS.map(s => kit.beam({ from: [xin - 2.4, yIn, z[s.line]], to: [xin, yIn, z[s.line]], rgb: s.rgb, power: 1, r0: 0.07, fade: 'in' }));
  const outBeams = z.map(zz => kit.beam({ from: [xout, yIn, zz], to: [xout + 2.4, yIn, zz], rgb: [1, 1, 1], power: 0, r0: 0.07, fade: 'out' }));

  // routing state: dest[j] = exit of guide j; theta per MZI eases towards its target
  const thetas = mesh.mzis.map(() => Math.PI), targets = mesh.mzis.map(() => Math.PI);
  let dest = [0, 1, 2, 3, 4, 5];
  let auto = AUTO, idleUser = 0;
  const route = d => {
    dest = d.slice();
    const a = d.slice();
    for (let c = 0; c < N; c++) for (const j of pairsOf(c, N)) {
      const m = mesh.mzis.find(mm => mm.c === c && mm.j === j);
      const cross = a[j] > a[j + 1];
      targets[m.heater] = cross ? 0 : Math.PI;
      if (cross) [a[j], a[j + 1]] = [a[j + 1], a[j]];
    }
  };
  const shuffle = () => {
    let d;
    do { d = [0, 1, 2, 3, 4, 5]; for (let i = 5; i > 0; i--) { const k = Math.floor(kit.rand() * (i + 1)); [d[i], d[k]] = [d[k], d[i]]; } }
    while (STREAMS.every(s => d[s.line] === dest[s.line]));
    route(d);
  };
  const START = [3, 0, 5, 1, 4, 2];
  route(START);
  for (let i = 0; i < thetas.length; i++) thetas[i] = targets[i];

  // carry every channel through the mesh; returns the light at the exits
  const exitPower = Array.from({ length: N }, () => STREAMS.map(() => 0));
  function propagate() {
    const acc = new Map();                                 // segment -> summed rgb
    const addSeg = (seg, rgb, I) => {
      if (I < 1e-4) return;
      const a = acc.get(seg) || [0, 0, 0];
      a[0] += rgb[0] * I; a[1] += rgb[1] * I; a[2] += rgb[2] * I;
      acc.set(seg, a);
    };
    STREAMS.forEach((s, si) => {
      let amp = Array.from({ length: N }, (_, j) => (j === s.line ? [1, 0] : [0, 0]));
      addSeg(mesh.leads.in[s.line], s.rgb, 1);
      for (let c = 0; c < N; c++) {
        const next = amp.slice();
        for (const j of pairsOf(c, N)) {
          const m = mesh.mzis.find(mm => mm.c === c && mm.j === j);
          const r = mzi(amp[j], amp[j + 1], thetas[m.heater]);
          const sg = mesh.segs[c];
          addSeg(sg[j].approach, s.rgb, amp[j][0] ** 2 + amp[j][1] ** 2);
          addSeg(sg[j + 1].approach, s.rgb, amp[j + 1][0] ** 2 + amp[j + 1][1] ** 2);
          addSeg(sg[j].arm, s.rgb, r.arm[0]); addSeg(sg[j + 1].arm, s.rgb, r.arm[1]);
          next[j] = r.out[0]; next[j + 1] = r.out[1];
          addSeg(sg[j].leave, s.rgb, next[j][0] ** 2 + next[j][1] ** 2);
          addSeg(sg[j + 1].leave, s.rgb, next[j + 1][0] ** 2 + next[j + 1][1] ** 2);
        }
        for (let j = 0; j < N; j++) if (mesh.segs[c][j].through !== undefined) addSeg(mesh.segs[c][j].through, s.rgb, amp[j][0] ** 2 + amp[j][1] ** 2);
        amp = next;
      }
      for (let j = 0; j < N; j++) {
        const I = amp[j][0] ** 2 + amp[j][1] ** 2;
        exitPower[j][si] = I;
        addSeg(mesh.leads.out[j], s.rgb, I);
      }
    });
    for (let k = 0; k < net.net.rows; k++) {
      const a = acc.get(k);
      if (!a) { net.set(k, [0, 0, 0], 0); continue; }
      const m = Math.max(a[0], a[1], a[2]);
      net.set(k, [a[0] / m, a[1] / m, a[2] / m], m * 1.15);
    }
    z.forEach((_, j) => {
      const col = [0, 0, 0];
      STREAMS.forEach((s, si) => { for (let q = 0; q < 3; q++) col[q] += s.rgb[q] * exitPower[j][si]; });
      const m = Math.max(...col);
      outBeams[j].set(m > 1e-3 ? col.map(v => v / m) : [1, 1, 1], m);
    });
    mesh.mzis.forEach(m => mesh.heaters.set(m.heater, thetas[m.heater] / Math.PI));
  }
  propagate();

  // plates: the data on each channel going in, and what arrives at each exit
  const bits = STREAMS.map((_, i) => Array.from({ length: 64 }, (__, k) => ((Math.sin(13.7 * (k + 1) * (i + 2)) * 9301) % 1 + 1) % 1 > 0.45 ? 1 : 0));
  const drawLanes = (g, box, rows, t) => {
    const n = rows.length, h = box.h / n, cell = Math.max(10, Math.round(box.w / 22));
    rows.forEach((r, k) => {
      const y = box.y + h * (k + 0.5);
      kit.draw.text(g, r.label, box.x, y + h * 0.18, { size: Math.round(h * 0.62), rgb: r.rgb || [0.62, 0.68, 0.74], weight: 700 });
      if (!r.stream && r.stream !== 0) { g.fillStyle = 'rgba(160,185,210,0.18)'; g.fillRect(box.x + h * 1.3, y - 1, box.w - h * 1.3, 2); return; }
      const off = Math.floor(t * 6);
      const s = r.stream, rgb = STREAMS[s].rgb;
      g.save(); g.shadowColor = kit.colour.css(rgb, 0.9); g.shadowBlur = 8; g.fillStyle = kit.colour.css(rgb, r.dim ?? 1);
      for (let i = 0; i * cell < box.w - h * 1.3; i++) {
        if (!bits[s][(i + off) % 64]) continue;
        g.fillRect(box.x + h * 1.3 + i * cell, y - h * 0.22, cell * 0.72, h * 0.44);
      }
      g.restore();
    });
  };
  const inPlate = kit.plate({ w: 2.8, h: 1.7, at: [-3.2, 1.75, -D / 2 - 1.1], title: 'in' });
  inPlate.live((g, box, W0, H0, t) => drawLanes(g, box, STREAMS.map((s, i) => ({ label: s.name, rgb: s.rgb, stream: i })), t), 8);
  const outPlate = kit.plate({ w: 2.8, h: 1.7, at: [3.2, 1.75, -D / 2 - 1.1], title: 'out' });
  outPlate.live((g, box, W0, H0, t) => drawLanes(g, box, z.map((_, j) => {
    let best = -1, bp = 0.5;
    STREAMS.forEach((s, si) => { if (exitPower[j][si] > bp) { bp = exitPower[j][si]; best = si; } });
    return { label: String(j + 1), rgb: best >= 0 ? STREAMS[best].rgb : null, stream: best >= 0 ? best : null, dim: Math.min(1, bp) };
  }), t), 8);

  const midMzi = mesh.mzis.find(m => m.c === 1 && m.j === 1), heatMzi = mesh.mzis.find(m => m.c === 3 && m.j === 3);
  return {
    anchors: {
      in: [-W / 2 - 1.2, Y + 0.05, z[0]],
      mzi: [midMzi.x, Y + 0.05, midMzi.zm],
      heater: [heatMzi.xh, Y + 0.05, heatMzi.zh],
      out: [W / 2 + 1.2, Y + 0.05, z[N - 1]],
    },
    controls: [{ id: 'shuffle', type: 'button' }],
    act(id) { if (id === 'shuffle') { shuffle(); auto = AUTO; idleUser = 20; } },
    status() {
      const ex = s => dest[s.line] + 1;
      return { key: 'status', vars: { a: ex(STREAMS[0]), b: ex(STREAMS[1]), c: ex(STREAMS[2]), d: ex(STREAMS[3]) } };
    },
    reset() { route(START); auto = AUTO; idleUser = 0; },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      auto -= dt;
      if (auto <= 0 && idleUser <= 0) { shuffle(); auto = AUTO; }
      let moving = false;
      const step = Math.PI * dt / SWITCH_TIME;
      for (let i = 0; i < thetas.length; i++) {
        const d = targets[i] - thetas[i];
        if (Math.abs(d) > 1e-4) { thetas[i] += Math.sign(d) * Math.min(Math.abs(d), step); moving = true; }
      }
      if (moving) propagate();
    },
  };
}

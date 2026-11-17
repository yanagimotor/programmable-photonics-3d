// Program "Light router" (tab 2): the light-programmable chip as a 4 x 4 router, with the routings the 2D Waveguide
// Studio inverse-designed (data/router.js; 3012 is the cyclic routing of the paper's Fig. 2c).  It replaces, on
// this tab only, the network of switches of tab 1's router (devices/router.js) written in green: the programmable
// chip needs no switches.  Light-written waveguides bring four channels A-D into a plain slab; one pattern of light
// over the slab, found by inverse design in simulation, sends each channel to its exit; for new routes the
// projector writes another pattern.  The pattern and the light are the studio's simulation (sim2d.js), one map per
// input, painted in that channel's colour.  The light's pulses are drawn; their speed is not to scale.
import { simSlab, SIZE, BEAM } from './sim2d.js';
import * as DATA from './data/router.js';

export const meta = { id: 'router', platform: 'ln', category: 'comm', size: { ...SIZE } };

const NBSP = ' ';
export const text = {
  en: {
    name: 'Light router',
    tech: 'Slab waveguide written by light · lithium niobate',
    what: 'Sends each beam of light to a chosen exit.',
    in: 'Four channels of data, one in each entrance',
    out: 'The same channels, at the chosen exits',
    how: 'In the middle of the chip there are no waveguides and no switches. A pattern of light, found by computer simulation, bends the light inside one flat slab so that each channel reaches its own exit.',
    use: 'Data centres and telecom networks: reconnecting fibres without converting the light to electronics and back.',
    fixed: 'Nothing is etched: for new routes, the projector writes a new pattern.',
    c: { in: 'Light in', pattern: 'Pattern found by simulation', out: 'Light out' },
    ctl: { shuffle: 'New routes' },
    status: 'A → exit {a} · B → exit {b} · C → exit {c} · D → exit {d}',
    ref: 'Onodera et al., Nature Physics 22, 164 (2026): routings like these, written by light (Fig. 2).',
    note: 'Pattern and light: beam-propagation simulations of the 2D Waveguide Studio (a 5 mm designed region between 1 mm waveguides written by light). The colours only tell the channels apart: all four are at 1550 nm.',
  },
  ja: {
    name: '光ルーター',
    tech: '光で書いたスラブ導波路・ニオブ酸リチウム',
    what: 'それぞれの光を、選んだ出口へ送ります。',
    in: '4つのデータ信号。入口ごとに1つ',
    out: '同じ信号が、選んだ出口から',
    how: 'チップの中ほどには、導波路もスイッチもありません。コンピューターのシミュレーションで見つけた光のパターンが、平らな板の中で光を曲げ、それぞれの信号を自分の出口へ届けます。',
    use: 'データセンターや通信網。光を電気に変えずに、光ファイバーをつなぎ替えます。',
    fixed: '何も刻まれていません。経路を変えるときは、プロジェクターが新しいパターンを書き込みます。',
    c: { in: '入力光', pattern: 'シミュレーションで見つけたパターン', out: '出力光' },
    ctl: { shuffle: '経路を変える' },
    status: 'A → 出口{a}・B → 出口{b}・C → 出口{c}・D → 出口{d}',
    ref: 'Onodera ほか、Nature Physics 22, 164 (2026)：光で書いた、このような経路（図2）。',
    note: `パターンと光は、2D Waveguide Studioのビーム伝搬シミュレーションです（設計した領域は5${NBSP}mm、その両側に光で書いた1${NBSP}mmの導波路）。色は信号を見分けるためのもので、4つともシミュレーションでは1550${NBSP}nmです。`,
  },
};

const N = 4;
const Y = 0.085;                                   // height of the beams in the air
// the channels, as on tab 1's router (A at the back of the chip, D at the front); the studio numbers its ports from
// the most negative x (the front), so channel k enters on port N - 1 - k, and exit e (1 = the back) is port N - e
const STREAMS = [{ name: 'A', u: 0.0 }, { name: 'B', u: 0.3 }, { name: 'C', u: 0.64 }, { name: 'D', u: 0.97 }];
const AUTO = 7;                                    // seconds between automatic new routes
const FADE = 0.8;                                  // seconds for the pattern and the light to change

export function create(kit) {
  const { colour } = kit;
  for (const s of STREAMS) s.rgb = colour.ramp(s.u);
  const sl = simSlab(kit, DATA, { colours: STREAMS.map(s => s.rgb) });
  const { X0, X1, zOf } = sl;
  const portOf = k => N - 1 - k;                   // channel k (or exit k + 1) -> the studio's port
  const zPort = k => zOf(DATA.PORTS[portOf(k)]);
  const routes = DATA.ROUTES.map(r => ({
    ...r,
    pattern: DATA.SHEET.map(r.pattern),
    light: STREAMS.map((_, k) => DATA.SHEET.map(r.light[portOf(k)])),       // the slab's channel k: channel k's light
    exitOf: STREAMS.map((_, k) => portOf(r.perm[portOf(k)])),                // channel k -> exit index (0 = exit 1)
    // power of channel k at exit e (mode-matched, of its power in)
    P: STREAMS.map((_, e) => STREAMS.map((__, k) => r.powers[portOf(k)][portOf(e)])),
  }));

  // beams in and out
  const inBeams = STREAMS.map((s, k) => kit.beam({ from: [X0 - BEAM, Y, zPort(k)], to: [X0, Y, zPort(k)], rgb: s.rgb, power: 1, r0: 0.07, fade: 'in' }));
  const outBeams = STREAMS.map((_, e) => kit.beam({ from: [X1, Y, zPort(e)], to: [X1 + BEAM, Y, zPort(e)], rgb: [1, 1, 1], power: 0, r0: 0.07, fade: 'out' }));

  let cur = 0, auto = AUTO, idleUser = 0;
  const show = (i, fade = FADE) => {
    cur = i;
    const r = routes[i];
    sl.setPattern(r.pattern, { fade });
    sl.setLight(r.light, { fade });
    r.P.forEach((row, e) => {
      const c = [0, 0, 0];
      STREAMS.forEach((s, k) => { for (let q = 0; q < 3; q++) c[q] += s.rgb[q] * row[k]; });
      const m = Math.max(...c);
      outBeams[e].set(m > 1e-3 ? c.map(v => v / m) : [1, 1, 1], m);
    });
  };
  show(0, 0);

  // plates: the data on each channel going in, and what arrives at each exit (as tab 1's router)
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
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(SIZE.w / 2 - 1.7), 1.85, -SIZE.d / 2 - 1.3], title: 'in' });
  inPlate.live((g, box, W0, H0, t) => drawLanes(g, box, STREAMS.map((s, i) => ({ label: s.name, rgb: s.rgb, stream: i })), t), 8);
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [SIZE.w / 2 - 1.7, 1.85, -SIZE.d / 2 - 1.3], title: 'out' });
  outPlate.live((g, box, W0, H0, t) => drawLanes(g, box, STREAMS.map((_, e) => {
    const P = routes[cur].P[e];
    let best = -1, bp = 0.5;
    P.forEach((p, k) => { if (p > bp) { bp = p; best = k; } });
    return { label: String(e + 1), rgb: best >= 0 ? STREAMS[best].rgb : null, stream: best >= 0 ? best : null, dim: Math.min(1, bp) };
  }), t), 8);

  return {
    anchors: {
      in: [X0 - 1.2, Y + 0.05, zPort(0)],
      pattern: [0, Y + 0.05, -sl.W / 2 + 0.4],
      out: [X1 + 1.2, Y + 0.05, zPort(N - 1)],
    },
    controls: [{ id: 'shuffle', type: 'button' }],
    act(id) { if (id === 'shuffle') { show((cur + 1) % routes.length); auto = AUTO; idleUser = 20; } },
    status() {
      const ex = routes[cur].exitOf;
      return { key: 'status', vars: { a: ex[0] + 1, b: ex[1] + 1, c: ex[2] + 1, d: ex[3] + 1 } };
    },
    reset() { show(0, 0); auto = AUTO; idleUser = 0; },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      auto -= dt;
      if (auto <= 0 && idleUser <= 0) { show((cur + 1) % routes.length); auto = AUTO; }
      sl.update(dt);
    },
  };
}

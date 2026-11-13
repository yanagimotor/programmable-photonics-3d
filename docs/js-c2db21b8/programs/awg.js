// Program "Spectrometer" (tab 2): the light-programmable chip as a wavelength splitter, inverse-designed with the 2D
// Waveguide Studio's model (data/awg.js).  It replaces, on this tab only, the arrayed waveguide grating of tab 1's
// spectrometer (devices/awg.js) written in green: the programmable chip needs no grating.  Four colours of light
// (1310, 1410, 1510 and 1610 nm, painted violet, cyan, amber and red as tab 3's colour router paints them) enter
// together through one light-written waveguide; one pattern of light over the slab, found by inverse design in
// simulation, sends each colour to its own exit.  It works because every colour bends a little differently in the
// same pattern (diffraction and the written phase both depend on the wavelength).  The pattern and the light are the
// studio's simulation (sim2d.js): one map per colour.  "One colour at a time" shows each colour's own light.
import { simSlab, mixOf, SIZE, BEAM } from './sim2d.js';
import { COLOURS, WARM } from './wdm.js';
import * as DATA from './data/awg.js';

export const meta = { id: 'awg', platform: 'ln', category: 'sense', size: { ...SIZE } };

const NBSP = ' ';
export const text = {
  en: {
    name: 'Spectrometer',
    tech: 'Slab waveguide written by light · lithium niobate',
    what: 'Splits light into its colours: each colour leaves through its own exit.',
    in: 'Four colours of light in one waveguide',
    out: 'Four exits, one colour each',
    how: 'There is no prism and no grating. Every colour bends a little differently, so a pattern of light, found by computer simulation, can guide each colour along its own path through one flat slab.',
    use: 'Fibre-optic networks, where many colours of light share one fibre and must be separated again.',
    fixed: 'Nothing is etched: another pattern of light sorts other colours.',
    c: { in: 'Four colours in', pattern: 'Pattern found by simulation', out: 'One colour per exit' },
    ctl: { source: 'Light in' },
    opt: { source: { all: 'All four colours', one: 'One colour at a time' } },
    status: 'All four colours in: each leaves through its own exit.',
    'status.one': 'One colour at a time: {lam} nm leaves through exit <b>{k}</b>.',
    note: 'Pattern and light: beam-propagation simulations of the 2D Waveguide Studio, at 1310, 1410, 1510 and 1610 nm (a 10 mm designed region between 1 mm waveguides written by light). The colours are painted much further apart than they are.',
  },
  ja: {
    name: '分光器',
    tech: '光で書いたスラブ導波路・ニオブ酸リチウム',
    what: '光を色ごとに分け、それぞれの色を別の出口から出します。',
    in: '1本の導波路に4色の光',
    out: '4つの出口。それぞれに1色',
    how: 'プリズムも回折格子もありません。光の曲がり方は色ごとに少しずつ違います。そこで、コンピューターのシミュレーションで見つけた光のパターンが、平らな板の中で色ごとに別の道へ光を導きます。',
    use: '光ファイバー網。1本のファイバーを共有する多くの色の光を、ふたたび分けます。',
    fixed: '何も刻まれていません。別の光のパターンで、別の色を分けられます。',
    c: { in: '4色の光', pattern: 'シミュレーションで見つけたパターン', out: '出口ごとに1色' },
    ctl: { source: '入れる光' },
    opt: { source: { all: '4色いっしょに', one: '1色ずつ' } },
    status: '4色いっしょに入れると、どの色も自分の出口から出ていきます。',
    'status.one': `1色ずつ：{lam}${NBSP}nmの光は出口<b>{k}</b>から出ていきます。`,
    note: `パターンと光は、2D Waveguide Studioのビーム伝搬シミュレーションです（1310・1410・1510・1610${NBSP}nm、設計した領域は10${NBSP}mm、その両側に光で書いた1${NBSP}mmの導波路）。色の違いは、実際よりずっと大きく描いています。`,
  },
};

const K = DATA.LAMS.length;
const Y = 0.085;                                   // height of the beams in the air
const DWELL = 1.8;                                 // one colour at a time: seconds per colour
const CYCLE = [['all', 6.0], ['one', K * DWELL]];  // when nobody is choosing
// exits are numbered from the front of the chip (the studio's most negative x), as on tab 1's spectrometer: exit 1
// gets the lowest frequency (red), exit 4 the highest (violet)

export function create(kit) {
  const sl = simSlab(kit, DATA, { colours: COLOURS, warm: WARM });
  const { X0, X1, zOf } = sl;
  sl.setPattern(DATA.SHEET.map(DATA.PATTERN), { fade: 0 });
  sl.setLight(DATA.LIGHT.map(m => DATA.SHEET.map(m)), { fade: 0 });
  const P = DATA.POWERS;                                         // [colour][exit]
  const exitRGB = DATA.PORTS.map((_, q) => COLOURS[DATA.TARGET.indexOf(q)]);
  // where each colour sits on the plates' colour axis (frequency, increasing to the right)
  const nu = DATA.LAMS.map(l => 299792.458 / l), lo = Math.min(...nu), hi = Math.max(...nu);
  const uOf = c => 0.14 + 0.72 * (nu[c] - lo) / (hi - lo);

  const inBeam = kit.beam({ from: [X0 - BEAM, Y, zOf(DATA.IN)], to: [X0, Y, zOf(DATA.IN)], rgb: WARM, power: 1, r0: 0.08, fade: 'in' });
  const outBeams = DATA.PORTS.map(x => kit.beam({ from: [X1, Y, zOf(x)], to: [X1 + BEAM, Y, zOf(x)], rgb: [1, 1, 1], power: 0, r0: 0.07, fade: 'out' }));

  let src = 'all', tau = 0, one = 0, cyc = 0, cycT = 0, idleUser = 0;
  const exitPower = new Float32Array(K);
  // the light in and out follows what is shown in the slab (sl.shown: the colours' weights, eased)
  const beams = () => {
    const w = sl.shown;
    inBeam.set(mixOf(COLOURS, w, WARM), Math.min(1.2, w.reduce((a, b) => a + b, 0)));
    for (let q = 0; q < K; q++) {
      const ws = w.map((v, c) => v * P[c][q]);
      exitPower[q] = ws.reduce((a, b) => a + b, 0);
      outBeams[q].set(mixOf(COLOURS, ws, WARM), Math.min(1.4, 1.1 * exitPower[q]));
    }
  };
  const setSource = id => {
    if (id === src) return;
    src = id; tau = 0; one = 0;
  };
  const target = () => {
    for (let c = 0; c < K; c++) sl.on[c] = src === 'all' || c === one ? 1 : 0;
  };
  target();

  // plates: the colours going in (a spectrum), the light in each exit (bars, in the colour that belongs there)
  const axisIn = (g, box, word) => {
    const fs = Math.round(box.h * 0.14), y = box.y + box.h - fs - 8;
    g.save();
    g.strokeStyle = 'rgba(160,185,210,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(box.x, y); g.lineTo(box.x + box.w, y); g.stroke();
    g.beginPath(); g.moveTo(box.x + box.w, y); g.lineTo(box.x + box.w - 11, y - 6); g.lineTo(box.x + box.w - 11, y + 6); g.closePath();
    g.fillStyle = 'rgba(160,185,210,0.7)'; g.fill();
    g.restore();
    if (word) kit.draw.text(g, word, box.x + box.w, box.y + box.h, { size: fs, rgb: [0.62, 0.68, 0.74], align: 'right', weight: 600 });
    return { x: box.x, y: box.y, w: box.w, h: y - box.y };
  };
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(SIZE.w / 2 - 1.7), 1.85, -SIZE.d / 2 - 1.3], title: 'in' });
  inPlate.live((g, box0) => {
    const box = axisIn(g, box0, kit.word('colour'));
    kit.draw.spectrum(g, box, COLOURS.map((rgb, c) => ({ u: uOf(c), h: 0.92 * sl.shown[c], rgb, w: 10 })), { axisWord: false });
  }, 10);
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [SIZE.w / 2 - 1.7, 1.85, -SIZE.d / 2 - 1.3], title: 'out' });
  const LABELS = DATA.PORTS.map((_, q) => String(q + 1));
  outPlate.live((g, box) => {
    kit.draw.bars(g, box, Array.from(exitPower), { labels: LABELS, rgbs: exitRGB, max: 1, highlight: src === 'one' ? DATA.TARGET[one] : -1 });
  }, 10);

  const startCycle = () => { cyc = 0; cycT = 0; setSource(CYCLE[0][0]); target(); };
  return {
    anchors: {
      in: [X0 - 1.2, Y + 0.05, zOf(DATA.IN)],
      pattern: [0, Y + 0.05, -sl.W / 2 + 0.4],
      out: [X1 + 1.2, Y + 0.05, zOf(DATA.PORTS[K - 1])],
    },
    controls: [{ id: 'source', type: 'choice', options: ['all', 'one'] }],
    act(id, v) {
      if (id !== 'source' || !CYCLE.some(c => c[0] === v)) return;
      setSource(v); target(); idleUser = 15;
      cyc = CYCLE.findIndex(c => c[0] === v); cycT = 0;
    },
    value(id) { return id === 'source' ? src : undefined; },
    status() {
      if (src === 'one') return { key: 'status.one', vars: { lam: DATA.LAMS[one], k: DATA.TARGET[one] + 1 } };
      return { key: 'status', vars: {} };
    },
    focus(on) { if (on && idleUser <= 0) startCycle(); },
    reset() { idleUser = 0; startCycle(); },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      if (idleUser <= 0) {
        cycT += dt;
        if (cycT >= CYCLE[cyc][1]) { cycT = 0; cyc = (cyc + 1) % CYCLE.length; setSource(CYCLE[cyc][0]); }
      }
      if (src === 'one') {
        // the colours one after the other, from the lowest frequency (red) up
        tau += dt * (kit.reduced ? 0.5 : 1);
        one = K - 1 - Math.min(K - 1, Math.floor(tau / DWELL) % K);
      }
      target();
      sl.update(dt);
      beams();
    },
  };
}

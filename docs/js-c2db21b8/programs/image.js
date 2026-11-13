// Program "Image recognition": the light-programmable chip as the handwritten-digit classifier of Onodera et al.,
// Nature Physics 22, 164 (2026): a picture averaged down to 7 x 7 pixels, read row by row into 49 numbers, sets the
// brightness of 49 beams at the input facet; the trained pattern of light steers the light so that most of it leaves
// through the digit's own exit (programs/freeform.js draws it).  Pattern and light are the 2D Waveguide Studio's
// MNIST classifier (data/image.js, written by the studio's tools/export_ryo_programs.py): the index map it trained,
// and the light of real MNIST test digits through it, computed by its beam propagation and recorded (the page does
// not propagate this light itself).
// The pictures (illustrations only, so drawn in high resolution everywhere):
// every digit drawn is its 28 x 28 MNIST original (data/mnist28.js), upsampled smoothly; the chip reads the same
// digit averaged to 7 x 7, and its light is the studio's recorded light of those 49 beams.
//
// Tab 2 runs it with its IN and OUT plates and a new digit every few seconds; tab 3's optical computation runs it in
// the scene's own look, without plates or cycling, and keeps a copy of its slab in the scene (slabOf):
//   create(kit, { rgb, pulse, flow, dash, cell, plates = true, auto = true })
//            rgb, pulse, flow, dash: the light's look, cell: the answer cell's colour (freeform.js; left out: tab 2's
//            red); plates: the IN and OUT plates; auto: a new digit every AUTO s while nobody chooses one
//   the instance, besides the module contract:
//     inst.auto              true / false (may be set): the automatic new digits
//     inst.showTest(test)    show the MNIST test digit with that index (one of the samples; false if there is none)
//     inst.result            { share, answer } of the digit whose light has reached the exits (null while in flight)
//     inst.shown             { c, x, name, test }: the digit whose light is on the chip (from when it starts in)
//     inst.beamAt(i, out?), inst.exitAt(c, out?)   chip-local [x, y, z] of input beam i and exit c (freeform.js)
//     inst.ff                the slab (freeform.js's handle: patTex, strip, field, ...)
//   slabOf(kit, opts)        the classifier's slab (trained pattern, recorded light, the ten answer cells) into a kit;
//                            -> freeform.js's handle; opts: freeformChip's (chip: false for a slab without a body)
//   sample(test)             the sample with that MNIST test index ({ label, test, x, share, light }), or null
//   digitCanvas(test, { k = 6, rgb, lo, hi })   its 28 x 28 original as a picture: a canvas 28k px square,
//                            upsampled bilinearly, alpha = smoothstep(lo, hi, value) (a soft edge); made once per look
import { freeformChip, SIZE } from './freeform.js';
import { showPattern } from './sim2d.js';
import * as DATA from './data/image.js';
import { digit28, SIZE as N28 } from './data/mnist28.js';

// the studio works in um, freeform.js in mm; the slab (510 um, inside the simulation's absorbing edges) is drawn
// 12.5 units per mm across, so that the ten exits' cells stay readable
const MM = 1e-3;
const FF = {
  DEVICE: { wx: DATA.DEVICE.wx * MM, nx: DATA.COLS, nz: DATA.DEVICE.nz, nzl: DATA.DEVICE.nzl, L: DATA.DEVICE.L * MM },
  BEAMS: { n: DATA.BEAMS.n, x0: DATA.BEAMS.x0 * MM, x1: DATA.BEAMS.x1 * MM },
  BINS: { n: DATA.BINS.n, x0: DATA.BINS.x0 * MM, x1: DATA.BINS.x1 * MM },
};
const GEO = { SX: 12.5 };

export const meta = { id: 'image', platform: 'ln', category: 'compute', size: { ...SIZE } };

const DIGITS = DATA.CLASSES;
const AUTO = 4.8;                 // seconds between two pictures when nobody is choosing

export const text = {
  en: {
    name: 'Image recognition',
    tech: 'Slab waveguide written by light · lithium niobate',
    what: 'Reads a handwritten number.',
    in: 'A picture of 7 × 7 pixels, as the brightness of 49 beams',
    out: 'Ten exits: the brightest one names the number',
    how: 'There are no waveguides and no switches. A pattern of light, found by training, bends the light inside one flat slab so that each number leaves through its own exit.',
    use: 'Research on faster, lower-power hardware for AI.',
    fixed: 'Nothing is etched: another pattern of light makes it a different chip.',
    c: { in: 'Picture in', pattern: '', out: 'Brightest = answer' },
    ctl: { digit: 'Show a number' },
    opt: { digit: Object.fromEntries(DIGITS.map(d => [d, d])) },
    status: 'Saw “{v}” → the brightest exit says <b>“{w}”</b>.',
    'status.wrong': 'Saw “{v}” → the brightest exit says <b>“{w}”</b>: wrong this time.',
    ref: 'Onodera et al., Nature Physics 22, 164 (2026).',
    note: `Pattern and light: beam-propagation simulations of the 2D Waveguide Studio, trained on handwritten digits (MNIST); it reads ${(DATA.ACCURACY.test * 100).toFixed(0)} % of new digits right. Shown here: test digits it reads correctly. The pictures are drawn at full resolution; the chip reads each one averaged to 7 × 7 pixels.`,
  },
  ja: {
    name: '画像認識',
    tech: '光で書いたスラブ導波路・ニオブ酸リチウム',
    what: '手書きの数字を読み取ります。',
    in: '7×7画素の画像。49本の光の明るさで入ります',
    out: '10の出口。いちばん明るいものが数字の答え',
    how: '導波路もスイッチもありません。学習で見つけた光のパターンが、平らな板の中で光を曲げ、数字ごとに決まった出口へ届けます。',
    use: 'AI向けの、より速く省電力な計算機の研究。',
    fixed: '何も刻まれていません。別の光のパターンで、別のチップになります。',
    c: { in: '画像を入れる', pattern: '', out: 'いちばん明るい＝答え' },
    ctl: { digit: '数字を見せる' },
    opt: { digit: Object.fromEntries(DIGITS.map(d => [d, d])) },
    status: '「{v}」を見た → いちばん明るい出口の答えは<b>「{w}」</b>。',
    'status.wrong': '「{v}」を見た → いちばん明るい出口の答えは<b>「{w}」</b>。今回は不正解です。',
    ref: 'Onodera ほか、Nature Physics 22, 164 (2026)。',
    note: `パターンと光は、2D Waveguide Studioのビーム伝搬シミュレーションです。手書き数字（MNIST）で学習し、初めて見る数字の${(DATA.ACCURACY.test * 100).toFixed(0)}%を正しく読み取ります。ここでは、正しく読み取れたテスト用の数字を見せています。画像は元の解像度で描いています。チップは、それを7×7画素に平均して読み取ります。`,
  },
};

// ------------------------------------------------------------------------------------------ the samples and their light
export const sample = test => DATA.SAMPLES.find(s => s.test === test) || null;
const BY_X = new Map(DATA.SAMPLES.map(s => [s.x, s]));
const LIGHT = new Map();
// the recorded light of a sample (intensity = (byte / 255)^2, normalised per row), looked up by its picture (its x, or
// a copy of it); made once, shared by the program and a copy of its slab
function run(xs) {
  const s = BY_X.get(xs) || DATA.SAMPLES.find(q => q.x.length === xs.length && q.x.every((v, i) => v === xs[i]));
  if (!s) throw new Error('image recognition: a picture that is not one of the samples');
  let I = LIGHT.get(s);
  if (!I) { I = Float32Array.from(DATA.SHEET.map(s.light), v => (v / 255) * (v / 255)); LIGHT.set(s, I); }
  return { I, share: s.share, answer: s.share.reduce((b, v, c) => (v > s.share[b] ? c : b), 0) };
}
let PATTERN = null;              // (the trained pattern as the green light shows it: made once)
export function slabOf(kit, opts = {}) {
  if (!PATTERN) PATTERN = DATA.SHEET.floats(DATA.PATTERN).map(showPattern);
  const ff = freeformChip(kit, FF, { run, pattern: PATTERN, geo: GEO, ...opts });
  ff.labels(() => DIGITS);
  return ff;
}

// ------------------------------------------------------------------------------------------ the pictures
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const PICS = new Map();
export function digitCanvas(test, { k = 6, rgb = [1, 0.97, 0.92], lo = 0.2, hi = 0.6 } = {}) {
  const key = `${test}|${k}|${rgb.join(',')}|${lo}|${hi}`;
  if (PICS.has(key)) return PICS.get(key);
  const v = digit28(test), n = N28 * k;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  if (v) {
    const g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
    const R = Math.round(255 * rgb[0]), G = Math.round(255 * rgb[1]), B = Math.round(255 * rgb[2]);
    const at = (r, q) => v[Math.min(N28 - 1, Math.max(0, r)) * N28 + Math.min(N28 - 1, Math.max(0, q))];
    for (let Y = 0; Y < n; Y++) {
      const u = (Y + 0.5) / k - 0.5, r0 = Math.floor(u), fr = u - r0;
      for (let X = 0; X < n; X++) {
        const w = (X + 0.5) / k - 0.5, q0 = Math.floor(w), fq = w - q0;
        const val = (1 - fr) * ((1 - fq) * at(r0, q0) + fq * at(r0, q0 + 1)) + fr * ((1 - fq) * at(r0 + 1, q0) + fq * at(r0 + 1, q0 + 1));
        const o = 4 * (Y * n + X);
        d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = Math.round(255 * smooth(lo, hi, val));
      }
    }
    g.putImageData(img, 0, 0);
  }
  PICS.set(key, c);
  return c;
}
// the same picture as one line of light: its 784 values row by row, the first at the bottom (as the beams on the
// chip's input facet), one fine glowing profile in a column w x h px; made once per digit
const PROFILES = new Map();
function profileCanvas(test, w, h) {
  const key = `${test}|${w}|${h}`;
  if (PROFILES.has(key)) return PROFILES.get(key);
  const v = digit28(test), c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d'), x0 = 4, span = w - 12, N = N28 * N28;
  g.strokeStyle = 'rgba(160, 185, 210, 0.35)'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0, h); g.stroke();
  if (v) {
    // (a thin line with a faint glow only: filled, or with a stronger glow, the dense spikes of the inked rows - one
    // every few pixels - merged into one red block)
    g.save();
    g.shadowColor = 'rgba(255, 60, 40, 0.8)'; g.shadowBlur = 2.5;
    g.beginPath(); g.moveTo(x0, h);
    for (let i = 0; i < N; i++) g.lineTo(x0 + span * v[i], h - (i + 0.5) * h / N);
    g.lineTo(x0, 0);
    g.strokeStyle = 'rgba(255, 140, 112, 0.95)'; g.lineWidth = 1; g.lineJoin = 'round'; g.stroke();
    g.restore();
  }
  PROFILES.set(key, c);
  return c;
}

// ------------------------------------------------------------------------------------------ the program
export function create(kit, { rgb, pulse, flow, dash, cell, plates = true, auto: autoOn = true } = {}) {
  const N = DIGITS.length, RED = [1, 0.35, 0.25];
  const byClass = DIGITS.map((_, c) => DATA.SAMPLES.filter(s => s.label === c));
  const next = DIGITS.map(() => 0);
  let cur = 0, s = byClass[0][0], autoT = AUTO, idleUser = 0;
  // (the IN board, and `shown`, follow the picture whose light is on the chip: they change when the new light starts in)
  let seen = null, shown = null;
  const ff = slabOf(kit, { rgb, pulse, flow, dash, cell, onSweep: () => { seen = s; shown = { c: s.label, x: s.x, name: DIGITS[s.label], test: s.test }; } });
  const show = (sm, instant = false) => { s = sm; cur = sm.label; ff.show(sm.x, { instant }); };
  const showClass = (c, instant = false) => { const list = byClass[c]; show(list[next[c]++ % list.length], instant); };

  // plates: the picture, and the same picture read row by row into one column (as the beams on the chip's input
  // facet: the first at the bottom); the light in each exit out, and the answer
  const PAD = 22;                // (canvas px between the column and the plate's top and bottom edges)
  if (plates) {
    const inPlate = kit.plate({ w: 3.2, h: 1.8, at: [-3.5, 2.2, -4.6], title: 'in' });
    // (the column runs the plate's whole inner height, beside the title: 784 values need every pixel)
    let picTest = -1, pic = null, prof = null;
    inPlate.live((g, box, W, H) => {
      const sm = seen || s, side = Math.min(box.h, box.w * 0.5);
      if (sm.test !== picTest) { picTest = sm.test; pic = digitCanvas(sm.test); prof = profileCanvas(sm.test, Math.round(box.w * 0.27), Math.round(H - 2 * PAD)); }
      const x0 = box.x + box.w * 0.08, y0 = box.y + (box.h - side) / 2;
      g.fillStyle = 'rgb(30, 34, 40)';
      g.beginPath(); g.roundRect(x0, y0, side, side, Math.round(side * 0.04)); g.fill();
      g.drawImage(pic, x0, y0, side, side);
      const ax = x0 + side + box.w * 0.07;
      g.fillStyle = 'rgba(160,185,210,0.7)';
      g.beginPath(); g.moveTo(ax, y0 + side / 2 - 9); g.lineTo(ax + 16, y0 + side / 2); g.lineTo(ax, y0 + side / 2 + 9); g.closePath(); g.fill();
      g.drawImage(prof, Math.round(box.x + box.w * 0.69), PAD);
    }, 8);
    const outPlate = kit.plate({ w: 3.2, h: 1.8, at: [3.5, 2.2, -4.6], title: 'out' });
    outPlate.live((g, box) => {
      const r = ff.result, gw = box.w * 0.24;
      kit.draw.bars(g, { x: box.x, y: box.y, w: box.w - gw, h: box.h }, r ? r.share : DIGITS.map(() => 0),
        { labels: DIGITS, rgb: RED, highlight: r ? r.answer : -1, max: r ? Math.max(...r.share) : 1, gap: 0.22 });
      if (r) kit.draw.text(g, DIGITS[r.answer], box.x + box.w - gw * 0.45, box.y + box.h * 0.82, { size: Math.round(box.h * 0.95), align: 'center', weight: 800, rgb: [1, 0.86, 0.45] });
    }, 8);
  }

  showClass(0, true);
  return {
    anchors: ff.anchors,
    controls: [{ id: 'digit', type: 'choice', options: DIGITS }],
    act(id, v) { if (id === 'digit') { const c = DIGITS.indexOf(String(v)); if (c >= 0) { showClass(c); idleUser = 12; autoT = AUTO; } } },
    value(id) { return id === 'digit' ? DIGITS[cur] : undefined; },
    status() {
      const r = ff.result;
      return { key: r && r.answer !== cur ? 'status.wrong' : 'status', vars: { v: DIGITS[cur], w: r ? DIGITS[r.answer] : '…' } };
    },
    reset() { next.fill(0); idleUser = 0; autoT = AUTO; showClass(0); },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      autoT -= dt;
      if (autoOn && autoT <= 0 && idleUser <= 0 && !ff.flying) { let c; do c = Math.floor(kit.rand() * N); while (c === cur); showClass(c); autoT = AUTO; }
      ff.update(dt);
    },
    get auto() { return autoOn; },
    set auto(on) { autoOn = !!on; autoT = AUTO; },
    showTest(test) { const sm = sample(test); if (!sm) return false; show(sm); autoT = AUTO; return true; },
    get result() { return ff.result; },
    get shown() { return shown; },
    beamAt: (i, out) => ff.beamAt(i, out),
    exitAt: (c, out) => ff.exitAt(c, out),
    get ff() { return ff; },
  };
}

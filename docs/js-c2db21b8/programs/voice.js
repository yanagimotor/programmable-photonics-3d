// Program "Voice recognition": the light-programmable chip as the vowel classifier of Onodera et al., Nature Physics
// 22, 164 (2026), who used 12 formant numbers from recordings of 7 English vowels.  Here: the five Japanese vowels,
// each heard as a 12-band spectrum of a made-up speaker (tools/train_freeform.py).  The 12 numbers set the brightness
// of 12 beams at the input facet; the trained pattern of light steers the light so that most of it leaves through the
// vowel's own exit (programs/freeform.js).
// Tab 2 runs it with its plates and a new vowel every few seconds; tab 3's optical computation in the scene's own
// look, as image.js (see there):  create(kit, { rgb, pulse, flow, dash, cell, plates = true, auto = true });  the
// instance, besides the module contract: inst.auto, inst.result, inst.shown ({ c, x, name }: the vowel whose light is
// on the chip, name 'a' ... 'o'), inst.beamAt(i, out?), inst.exitAt(c, out?), inst.ff.  KANA: the vowels in Japanese.
import { freeformChip, SIZE } from './freeform.js';
import * as DATA from './data/voice.js';

export const meta = { id: 'voice', platform: 'ln', category: 'compute', size: { ...SIZE } };

const VOWELS = DATA.CLASSES;
export const KANA = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };
const AUTO = 4.8;                 // seconds between two vowels when nobody is choosing

export const text = {
  en: {
    name: 'Voice recognition',
    tech: 'Slab waveguide written by light · lithium niobate',
    what: 'Hears a spoken vowel and names it.',
    in: 'The sound of a vowel, as the brightness of 12 beams',
    out: 'Five exits: the brightest one names the vowel',
    how: 'There are no waveguides and no switches. A pattern of light, found by training, bends the light inside one flat slab so that each vowel leaves through its own exit.',
    use: 'Research on faster, lower-power hardware for AI.',
    fixed: 'Nothing is etched: another pattern of light makes it a different chip.',
    c: { in: 'Sound in', pattern: '', out: 'Brightest = answer' },
    ctl: { vowel: 'Pick a vowel' },
    opt: { vowel: { a: 'a', i: 'i', u: 'u', e: 'e', o: 'o' } },
    status: 'Heard “{v}” → the brightest exit says <b>“{w}”</b>.',
    'status.wrong': 'Heard “{v}” → the brightest exit says <b>“{w}”</b>: wrong this time.',
    ref: 'Onodera et al., Nature Physics 22, 164 (2026).',
    note: 'The voices are made up for this page (a 12-band spectrum of each vowel); the paper used 12 formant numbers from real recordings of seven English vowels.',
  },
  ja: {
    name: '音声認識',
    tech: '光で書いたスラブ導波路・ニオブ酸リチウム',
    what: '話した母音を聞き分けます。',
    in: '母音の音。12本の光の明るさで入ります',
    out: '5つの出口。いちばん明るいものが母音の答え',
    how: '導波路もスイッチもありません。学習で見つけた光のパターンが、平らな板の中で光を曲げ、母音ごとに決まった出口へ届けます。',
    use: 'AI向けの、より速く省電力な計算機の研究。',
    fixed: '何も刻まれていません。別の光のパターンで、別のチップになります。',
    c: { in: '音を入れる', pattern: '', out: 'いちばん明るい＝答え' },
    ctl: { vowel: '母音を選ぶ' },
    opt: { vowel: { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' } },
    status: '「{v}」と聞こえた → いちばん明るい出口の答えは<b>「{w}」</b>。',
    'status.wrong': '「{v}」と聞こえた → いちばん明るい出口の答えは<b>「{w}」</b>。今回は不正解です。',
    ref: 'Onodera ほか、Nature Physics 22, 164 (2026)。',
    note: '声はこのページのために作ったものです（各母音の12帯域のスペクトル）。論文では、7つの英語の母音の録音から取った12個のフォルマントの数を使いました。',
  },
};

export function create(kit, { rgb, pulse, flow, dash, cell, plates = true, auto: autoOn = true } = {}) {
  const N = VOWELS.length, RED = [1, 0.35, 0.25];
  const glyph = c => (kit.lang() === 'ja' ? KANA[VOWELS[c]] : VOWELS[c]);
  const byClass = VOWELS.map((_, c) => DATA.SAMPLES.filter(s => s.label === c));
  const next = VOWELS.map(() => 0);
  // (the IN board, and `shown`, follow the vowel whose light is on the chip: they change when the new light starts in)
  let seenC = 0, seenX = null, shown = null;
  const ff = freeformChip(kit, DATA, { rgb, pulse, flow, dash, cell, onSweep: () => { seenC = cur; seenX = x; shown = { c: cur, x, name: VOWELS[cur] }; } });
  ff.labels(() => VOWELS.map((_, c) => glyph(c)));
  let cur = 0, x = byClass[0][0].x, autoT = AUTO, idleUser = 0;
  const say = (c, instant = false) => {
    cur = c;
    const list = byClass[c];
    x = list[next[c]++ % list.length].x;
    ff.show(x, { instant });
  };

  // plates: the vowel and its 12-band spectrum in; the light in each exit out, and the answer
  if (plates) {
    const inPlate = kit.plate({ w: 3.2, h: 1.8, at: [-3.5, 2.2, -4.6], title: 'in' });
    inPlate.live((g, box) => {
      const gw = box.w * 0.3;
      kit.draw.text(g, glyph(seenC), box.x + gw * 0.45, box.y + box.h * 0.82, { size: Math.round(box.h * 0.95), align: 'center', weight: 700 });
      kit.draw.bars(g, { x: box.x + gw, y: box.y, w: box.w - gw, h: box.h }, seenX || x, { rgb: RED, max: 1, gap: 0.2 });
    }, 8);
    const outPlate = kit.plate({ w: 3.2, h: 1.8, at: [3.5, 2.2, -4.6], title: 'out' });
    outPlate.live((g, box) => {
      const r = ff.result, gw = box.w * 0.28;
      kit.draw.bars(g, { x: box.x, y: box.y, w: box.w - gw, h: box.h }, r ? r.share : VOWELS.map(() => 0),
        { labels: VOWELS.map((_, c) => glyph(c)), rgb: RED, highlight: r ? r.answer : -1, max: r ? Math.max(...r.share) : 1 });
      if (r) kit.draw.text(g, glyph(r.answer), box.x + box.w - gw * 0.45, box.y + box.h * 0.82, { size: Math.round(box.h * 0.95), align: 'center', weight: 800, rgb: [1, 0.86, 0.45] });
    }, 8);
  }

  say(0, true);
  return {
    anchors: ff.anchors,
    controls: [{ id: 'vowel', type: 'choice', options: VOWELS }],
    act(id, v) { if (id === 'vowel') { const c = VOWELS.indexOf(v); if (c >= 0) { say(c); idleUser = 12; autoT = AUTO; } } },
    value(id) { return id === 'vowel' ? VOWELS[cur] : undefined; },
    status() {
      const r = ff.result;
      return { key: r && r.answer !== cur ? 'status.wrong' : 'status', vars: { v: glyph(cur), w: r ? glyph(r.answer) : '…' } };
    },
    reset() { next.fill(0); idleUser = 0; autoT = AUTO; say(0); },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      autoT -= dt;
      if (autoOn && autoT <= 0 && idleUser <= 0 && !ff.flying) { let c; do c = Math.floor(kit.rand() * N); while (c === cur); say(c); autoT = AUTO; }
      ff.update(dt);
    },
    get auto() { return autoOn; },
    set auto(on) { autoOn = !!on; autoT = AUTO; },
    get result() { return ff.result; },
    get shown() { return shown; },
    beamAt: (i, out) => ff.beamAt(i, out),
    exitAt: (c, out) => ff.exitAt(c, out),
    get ff() { return ff; },
  };
}

// The cartoon animals of tab 3's optical computation (the story starts from a blurry picture of a dog, then streams
// pictures of different cartoon animals): simple, friendly faces drawn with canvas 2-D paths - bold shapes,
// a dark outline, a few flat colours (no orange and no green as large fills: on this page orange means heat and
// green the programming light).  They are drawn for this page and are meant to look like no known character.
// Each animal is a picture card (a white border, a pale ground) in two versions: sharp, and blurred by three box
// passes in JS (ctx.filter is missing in Safari) inside a crisp border - a blurry photo, not a blurry card.  Each also
// has a few points spread over its outlines and features, where the light through the lens lands: the light draws
// the picture.  Built once (8 animals x 2 canvases of 256 px).
//
//   const zoo = createAnimals(THREE, { size = 256, blur = 8, points = 14 })
//   zoo.list          [{ id, sharp, blur, pts }] in the order of ANIMALS - sharp, blur: CanvasTextures (sRGB);
//                     pts: [[u, v], ...] on the picture (0..1, v up), spread by farthest-point sampling
//   zoo.index(id)     the animal's place in the list
export const ANIMALS = ['dog', 'cat', 'rabbit', 'bear', 'chick', 'panda', 'pig', 'penguin'];

const OUT = '#2a2321';                       // the outline: a warm near-black
const LW = 3.2;                              // outline width, in units of the 100 x 100 picture
const FRAME = '#f6f4ef', INSET = 4.2, R0 = 10;   // the card's white border and its corner radius

// ---------------------------------------------------------------- drawing helpers (a 100 x 100 picture)
const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
const paint = (g, fill, line = OUT, w = LW) => { if (fill) { g.fillStyle = fill; g.fill(); } if (line) { g.strokeStyle = line; g.lineWidth = w; g.stroke(); } };
const eye = (g, x, y, r = 4.6) => {
  ell(g, x, y, r, r * 1.15); paint(g, OUT, null);
  ell(g, x - r * 0.35, y - r * 0.45, r * 0.36, r * 0.36); paint(g, '#ffffff', null);
};
const cheek = (g, x, y) => { ell(g, x, y, 5, 3.2); g.globalAlpha = 0.75; paint(g, '#f2a2b6', null); g.globalAlpha = 1; };
const line = (g, pts, w = 2.4) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.strokeStyle = OUT; g.lineWidth = w; g.stroke(); };
// a small smile under a nose: down from (x, y), then two curls
const smile = (g, x, y, w = 5, d = 3) => {
  g.lineCap = 'round'; g.lineJoin = 'round';
  line(g, [[x, y], [x, y + d]], 2.4);
  g.beginPath(); g.arc(x - w / 2, y + d, w / 2, 0.15 * Math.PI, 0.95 * Math.PI); g.strokeStyle = OUT; g.lineWidth = 2.4; g.stroke();
  g.beginPath(); g.arc(x + w / 2, y + d, w / 2, 0.05 * Math.PI, 0.85 * Math.PI); g.stroke();
};
const whiskers = (g, x, y, s, n = 3, len = 15) => {
  for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2) * 0.22; line(g, [[x, y + i * 3.4 - (n - 1) * 1.7], [x + s * len * Math.cos(a), y + i * 3.4 - (n - 1) * 1.7 + len * Math.sin(a) * 0.6]], 1.5); }
};

// ---------------------------------------------------------------- the animals (each: its pale ground, then the face)
const DRAW = {
  dog: { bg: '#d4e4f1', f: g => {
    // floppy ears, a tan face with a brown patch over one eye, a cream muzzle, a pink tongue
    ell(g, 23, 50, 10.5, 21, 0.32); paint(g, '#7b5536');
    ell(g, 77, 50, 10.5, 21, -0.32); paint(g, '#7b5536');
    ell(g, 50, 52, 28.5, 27); paint(g, '#d3ad80');
    ell(g, 62, 45, 9.5, 9); paint(g, '#8f6542', null);
    ell(g, 50, 66, 15.5, 11.5); paint(g, '#f3e4cc', OUT, 2.4);
    eye(g, 39, 46); eye(g, 61, 46);
    ell(g, 50, 59.5, 6.4, 4.5); paint(g, OUT, null);
    ell(g, 48.2, 58.3, 1.8, 1.1); paint(g, '#ffffff', null);
    ell(g, 50, 72.6, 3.8, 4.2); paint(g, '#ef8fa6', OUT, 1.8);
    smile(g, 50, 63.8, 7, 4.5);
  } },
  cat: { bg: '#e2dbef', f: g => {
    // pointed ears with pink insides, a grey face with forehead stripes, whiskers
    poly(g, [[22, 44], [25, 13], [45, 31]]); paint(g, '#9aa1aa');
    poly(g, [[78, 44], [75, 13], [55, 31]]); paint(g, '#9aa1aa');
    poly(g, [[27, 36], [28.5, 21], [39, 31]]); paint(g, '#f2b0c0', null);
    poly(g, [[73, 36], [71.5, 21], [61, 31]]); paint(g, '#f2b0c0', null);
    ell(g, 50, 56, 30, 25); paint(g, '#a4aab2');
    g.lineCap = 'round';
    for (const [x0, x1] of [[44, 45], [50, 50], [56, 55]]) line(g, [[x0, 32.5], [x1, 39]], 3);
    ell(g, 45, 64, 6.5, 4.8); paint(g, '#f4f1ec', null); ell(g, 55, 64, 6.5, 4.8); paint(g, '#f4f1ec', null);
    eye(g, 39, 51, 4.3); eye(g, 61, 51, 4.3);
    poly(g, [[46.5, 58.5], [53.5, 58.5], [50, 62.5]]); paint(g, '#ec8aa2', OUT, 1.6);
    smile(g, 50, 62.5, 6, 2.2);
    whiskers(g, 37, 63, -1); whiskers(g, 63, 63, 1);
  } },
  rabbit: { bg: '#d5e3ef', f: g => {
    // long upright ears, a white face, pink cheeks, two front teeth
    ell(g, 38, 27, 8, 20, -0.12); paint(g, '#f7f5f1'); ell(g, 38, 28, 3.8, 14, -0.12); paint(g, '#f2b3c3', null);
    ell(g, 62, 27, 8, 20, 0.12); paint(g, '#f7f5f1'); ell(g, 62, 28, 3.8, 14, 0.12); paint(g, '#f2b3c3', null);
    ell(g, 50, 63, 26, 23); paint(g, '#f7f5f1');
    cheek(g, 35.5, 69); cheek(g, 64.5, 69);
    eye(g, 41, 58); eye(g, 59, 58);
    g.beginPath(); g.roundRect(46.6, 69.5, 3.2, 5, 0.8); paint(g, '#ffffff', OUT, 1.4);
    g.beginPath(); g.roundRect(50.2, 69.5, 3.2, 5, 0.8); paint(g, '#ffffff', OUT, 1.4);
    ell(g, 50, 65, 3.4, 2.5); paint(g, '#ec8aa2', OUT, 1.4);
    smile(g, 50, 67.4, 5, 1.6);
    whiskers(g, 38, 67, -1, 2, 12); whiskers(g, 62, 67, 1, 2, 12);
  } },
  bear: { bg: '#dde3ea', f: g => {
    // round ears, a brown face, a beige muzzle
    ell(g, 27, 32, 10, 10); paint(g, '#8a6445'); ell(g, 27, 32, 5.2, 5.2); paint(g, '#d8bd98', null);
    ell(g, 73, 32, 10, 10); paint(g, '#8a6445'); ell(g, 73, 32, 5.2, 5.2); paint(g, '#d8bd98', null);
    ell(g, 50, 56, 30, 27); paint(g, '#8f6748');
    ell(g, 50, 66, 14, 11); paint(g, '#dcc29e', OUT, 2.4);
    eye(g, 39, 50, 4.2); eye(g, 61, 50, 4.2);
    ell(g, 50, 61.5, 5.6, 4); paint(g, OUT, null);
    ell(g, 48.4, 60.5, 1.6, 1); paint(g, '#ffffff', null);
    smile(g, 50, 65, 6, 3);
  } },
  chick: { bg: '#d2e6f4', f: g => {
    // a round yellow chick, a tuft, little wings, a small beak
    ell(g, 46, 24, 4, 7, -0.5); paint(g, '#f2cf3f'); ell(g, 53, 23, 4, 7.5, 0.4); paint(g, '#f2cf3f');
    ell(g, 21.5, 64, 7, 11, 0.5); paint(g, '#ecc837'); ell(g, 78.5, 64, 7, 11, -0.5); paint(g, '#ecc837');
    ell(g, 50, 56, 30, 29); paint(g, '#f6d84b');
    cheek(g, 34, 63); cheek(g, 66, 63);
    eye(g, 40, 51); eye(g, 60, 51);
    poly(g, [[43.5, 59], [50, 55.5], [56.5, 59], [50, 64]]); paint(g, '#e2ab40', OUT, 2);
    line(g, [[43.5, 59], [56.5, 59]], 1.6);
  } },
  panda: { bg: '#efdfe8', f: g => {
    // black ears and eye patches on a white face
    ell(g, 27, 30, 10, 10); paint(g, '#26292e'); ell(g, 73, 30, 10, 10); paint(g, '#26292e');
    ell(g, 50, 56, 31, 27); paint(g, '#f7f6f2');
    ell(g, 38, 51, 7.5, 10, 0.6); paint(g, '#26292e', null); ell(g, 62, 51, 7.5, 10, -0.6); paint(g, '#26292e', null);
    ell(g, 39, 49.5, 3, 3); paint(g, '#ffffff', null); ell(g, 61, 49.5, 3, 3); paint(g, '#ffffff', null);
    ell(g, 39.6, 50, 1.7, 1.7); paint(g, OUT, null); ell(g, 61.6, 50, 1.7, 1.7); paint(g, OUT, null);
    cheek(g, 32, 64); cheek(g, 68, 64);
    ell(g, 50, 63, 5, 3.6); paint(g, OUT, null);
    smile(g, 50, 66, 6, 2.4);
  } },
  pig: { bg: '#d7e4f0', f: g => {
    // pink, ears turned out, a big snout
    poly(g, [[24, 40], [20, 17], [40, 29]]); paint(g, '#f0a9bb'); poly(g, [[28, 34], [25, 22], [35, 29]]); paint(g, '#e48aa2', null);
    poly(g, [[76, 40], [80, 17], [60, 29]]); paint(g, '#f0a9bb'); poly(g, [[72, 34], [75, 22], [65, 29]]); paint(g, '#e48aa2', null);
    ell(g, 50, 56, 30, 26); paint(g, '#f4b6c5');
    eye(g, 39, 48, 4.2); eye(g, 61, 48, 4.2);
    ell(g, 50, 64, 11.5, 8); paint(g, '#ea93aa');
    ell(g, 45.8, 64, 1.9, 3.1); paint(g, '#8c4459', null); ell(g, 54.2, 64, 1.9, 3.1); paint(g, '#8c4459', null);
    g.beginPath(); g.arc(50, 72, 4, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = OUT; g.lineWidth = 2.2; g.stroke();
  } },
  penguin: { bg: '#dee8f2', f: g => {
    // a dark head with a white face, a yellow beak
    ell(g, 50, 54, 30, 29); paint(g, '#2b2f36');
    g.beginPath(); g.arc(41, 55, 13, 0, Math.PI * 2); g.arc(59, 55, 13, 0, Math.PI * 2); g.fillStyle = '#f7f6f2'; g.fill();
    ell(g, 50, 65, 17, 12); paint(g, '#f7f6f2', null);
    cheek(g, 35, 64); cheek(g, 65, 64);
    eye(g, 42, 53, 4.2); eye(g, 58, 53, 4.2);
    poly(g, [[44, 60], [56, 60], [50, 67]]); paint(g, '#f0c43c', OUT, 2);
  } },
};

// ---------------------------------------------------------------- canvases
// the picture card: a white border, the pale ground, the face; `fill` draws what is inside the border
function card(n, fill) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  g.scale(n / 100, n / 100);
  g.beginPath(); g.roundRect(0.5, 0.5, 99, 99, R0); g.fillStyle = FRAME; g.fill();
  g.save();
  g.beginPath(); g.roundRect(INSET, INSET, 100 - 2 * INSET, 100 - 2 * INSET, R0 - INSET * 0.6); g.clip();
  fill(g);
  g.restore();
  return c;
}
// the face on its ground, the whole square (to be blurred, or clipped into a card)
function face(n, a) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  g.scale(n / 100, n / 100);
  g.fillStyle = a.bg; g.fillRect(0, 0, 100, 100);
  g.lineCap = 'round'; g.lineJoin = 'round';
  a.f(g);
  return c;
}
// three box passes of radius r over each channel (clamped at the edges): about a Gaussian of sigma r
function blurInPlace(c, r) {
  const n = c.width, g = c.getContext('2d'), img = g.getImageData(0, 0, n, n), d = img.data;
  const ch = [0, 1, 2].map(k => { const a = new Float32Array(n * n); for (let i = 0; i < n * n; i++) a[i] = d[4 * i + k]; return a; });
  const line = new Float32Array(n), cl = k => (k < 0 ? 0 : k > n - 1 ? n - 1 : k);
  const pass = (a, stride, step) => {
    for (let i = 0; i < n; i++) {
      const o = i * stride;
      for (let k = 0; k < n; k++) line[k] = a[o + k * step];
      let s = 0;
      for (let k = -r; k <= r; k++) s += line[cl(k)];
      for (let k = 0; k < n; k++) { a[o + k * step] = s / (2 * r + 1); s += line[cl(k + r + 1)] - line[cl(k - r)]; }
    }
  };
  for (const a of ch) for (let p = 0; p < 3; p++) { pass(a, n, 1); pass(a, 1, n); }
  for (let i = 0; i < n * n; i++) { d[4 * i] = ch[0][i]; d[4 * i + 1] = ch[1][i]; d[4 * i + 2] = ch[2][i]; d[4 * i + 3] = 255; }
  g.putImageData(img, 0, 0);
  return c;
}
// points on the outlines and features (dark pixels inside the border), farthest-point sampling from the middle
function outlinePoints(c, count) {
  const n = c.width, d = c.getContext('2d').getImageData(0, 0, n, n).data, cand = [];
  const lo = Math.ceil(n * (INSET + 3) / 100), hi = n - lo, step = Math.max(1, Math.round(n / 128));
  for (let y = lo; y < hi; y += step) for (let x = lo; x < hi; x += step) {
    const i = 4 * (y * n + x);
    if (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] < 70) cand.push([x, y]);
  }
  if (!cand.length) return [[0.5, 0.5]];
  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2, mid = [n / 2, n * 0.55];
  let first = 0;
  cand.forEach((p, i) => { if (d2(p, mid) < d2(cand[first], mid)) first = i; });
  const pick = [cand[first]], dmin = cand.map(p => d2(p, cand[first]));
  while (pick.length < Math.min(count, cand.length)) {
    let b = 0;
    for (let i = 1; i < dmin.length; i++) if (dmin[i] > dmin[b]) b = i;
    pick.push(cand[b]);
    for (let i = 0; i < cand.length; i++) dmin[i] = Math.min(dmin[i], d2(cand[i], cand[b]));
  }
  return pick.map(([x, y]) => [(x + 0.5) / n, 1 - (y + 0.5) / n]);
}

export function createAnimals(THREE, { size = 256, blur = 8, points = 14 } = {}) {
  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const list = ANIMALS.map(id => {
    const a = DRAW[id];
    const sharp = face(size, a), soft = blurInPlace(face(size, a), blur);
    const pts = outlinePoints(sharp, points);
    return { id, sharp: tex(card(size, g => g.drawImage(sharp, 0, 0, 100, 100))), blur: tex(card(size, g => g.drawImage(soft, 0, 0, 100, 100))), pts };
  });
  return { list, index: id => ANIMALS.indexOf(id) };
}

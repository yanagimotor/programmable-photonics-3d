// The energy graph of tab 3's optical computation, part 8: the energy of one calculation - an N x N matrix times a
// vector - against its size N, on log-log axes, lying on the table like a printed sheet, so that the hot GPU can stand
// on it beside its line and our light chip lie on it beside the light's (apps/compute.js places them with plotAt).
//
// Real, and pictures:
//   Real: the two lines.  The GPU, an NVIDIA B300, does N^2 multiply-accumulates at about 0.2 pJ each: 0.2 pJ x N^2
//   (slope 2).  In
//   the light, the multiplications themselves cost nothing; each of the N inputs and N outputs is converted - a
//   digital-to-analog converter and a modulator in, a photodetector and an analog-to-digital converter out - at about
//   10 pJ each (the upper end of 1-10 pJ for about 8 bits at GHz rates): 10 pJ x 2N (slope 1).  The lines cross at
//   N = 100 (2 nJ).  A dashed line marks where our chip works today: N = 49 (image recognition reads a digit as 7 x 7 =
//   49 beams).  Not counted: writing the weights (the program is written once and then used many times), memory.
//   Pictures: the GPU and the chip standing on the sheet are where they are for the picture, not points on it.
//
//   const graph = createEnergy(THREE, { lang, at: [x, y, z], w, d })   lang() -> 'en' | 'ja'; at: the sheet's centre on
//                     the table (world); w, d: its size along x and along z (the energy axis runs away from the visitor)
//   graph.group       add it to the scene
//   graph.plotAt(u, v, out)   a point of the plot (u: log N, 0..1 from N = 1 to 1000; v: log energy, 0..1 from 1 pJ to
//                     1 uJ) -> world, on the sheet
//   graph.show(a, k)  the sheet's opacity (0..1), and how far the lines are drawn (0..1: the GPU's line first, then the
//                     light's, then where they cross); redraws only when k or the language has changed
import { text } from '../kit/plate.js';
import { css } from '../kit/colour.js';

const FONT = '"Segoe UI", "Yu Gothic UI", "Meiryo", system-ui, sans-serif';
const PX = 100;                                         // canvas pixels per world unit
const LIFT = 0.05;                                      // the sheet's height over the table
// the plot inside the sheet (canvas pixels, for a sheet of 26 x 17): room on the left for the energy axis's word and
// ticks, below for the size axis
const BOX = { x0: 380, x1: 2470, y0: 120, y1: 1400 };
const DEC_N = 3, DEC_E = 6;                             // N from 1 to 1000; energy from 1 pJ to 1 uJ
const E_MAC = 0.2, E_CONV = 10;                         // pJ per multiply-accumulate (GPU); pJ per conversion (light)
export const HOT = [1.0, 0.48, 0.24], LIGHT = [1.0, 0.9, 0.72];
const MUTED = [0.62, 0.68, 0.74], AXIS = 'rgba(160, 185, 210, 0.6)', GRID = 'rgba(160, 185, 210, 0.13)';
// the two lines in plot units: v(u) = log10(energy in pJ) / DEC_E at N = 10^(DEC_N u)
const vGpu = u => (Math.log10(E_MAC) + 2 * DEC_N * u) / DEC_E;
const vLight = u => (Math.log10(2 * E_CONV) + DEC_N * u) / DEC_E;
const N_TODAY = 49;                                     // our chip today: 7 x 7 = 49 beams in
export const CROSS = { u: Math.log10(2 * E_CONV / E_MAC) / DEC_N, v: vLight(Math.log10(2 * E_CONV / E_MAC) / DEC_N) };

const TEXT = {
  en: {
    energy: 'Energy for one matrix multiplication', size: 'Size of the calculation  N', what: '(an N × N matrix times a vector)',
    gpu: 'GPU', gpuMake: 'NVIDIA B300', gpuHow: 'N² multiplications × 0.2 pJ', light: 'Light', lightHow: '2N signal conversions × 10 pJ',
    cross: 'N ≈ 100', today: 'Our chip today:  N = 49',
  },
  ja: {
    energy: '1回の行列の掛け算に使うエネルギー', size: '計算の大きさ  N', what: '（N × N 行列とベクトルの掛け算）',
    gpu: 'GPU', gpuMake: 'NVIDIA B300', gpuHow: 'N² 回の掛け算 × 0.2 pJ', light: '光', lightHow: '2N 回の信号変換 × 10 pJ',
    cross: 'N ≈ 100', today: '現在のチップ：N = 49',
  },
};
const E_TICKS = ['1 pJ', '10 pJ', '100 pJ', '1 nJ', '10 nJ', '100 nJ', '1 µJ'];

export function createEnergy(THREE, { lang = () => 'en', at = [0, 0, 0], w = 26, d = 17 } = {}) {
  const W = Math.round(w * PX), H = Math.round(d * PX);
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  // (as the plates: just under the bloom's threshold, so that the words stay crisp)
  // (lifted a little off the table and pulled towards the camera in the depth test: just over the table top, it
  // flickered against it where the depth buffer could not tell the two apart - from afar, and seen at a slant)
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: new THREE.Color(0.9, 0.9, 0.9),
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -40 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), mat);
  mesh.renderOrder = 1;
  const group = new THREE.Group();
  group.position.set(at[0], at[1] + LIFT, at[2]);
  group.add(mesh);
  group.visible = false;

  const X = u => BOX.x0 + u * (BOX.x1 - BOX.x0), Y = v => BOX.y1 - v * (BOX.y1 - BOX.y0);
  // a line of the plot from u = 0 to u = k, clipped to the box (v from 0 to 1)
  const line = (f, k, rgb) => {
    if (k <= 0) return;
    g.save();
    g.beginPath(); g.rect(BOX.x0, BOX.y0 - 4, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0 + 4); g.clip();
    g.strokeStyle = css(rgb); g.lineWidth = 14; g.lineCap = 'round';
    g.shadowColor = css(rgb, 0.9); g.shadowBlur = 26;
    g.beginPath(); g.moveTo(X(0), Y(f(0))); g.lineTo(X(k), Y(f(k))); g.stroke();
    g.restore();
  };
  let drawnK = -1, drawnLang = '';
  const draw = k => {
    const L = TEXT[lang()] || TEXT.en;
    g.clearRect(0, 0, W, H);
    // the sheet: the plates' dark panel and edge
    g.save();
    g.beginPath(); g.roundRect(3, 3, W - 6, H - 6, 60);
    g.fillStyle = 'rgba(9, 13, 19, 0.9)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = 'rgba(160, 185, 210, 0.28)'; g.stroke();
    g.restore();
    // decades: the grid, the ticks' words
    g.save(); g.strokeStyle = GRID; g.lineWidth = 3;
    for (let i = 1; i <= DEC_N; i++) { g.beginPath(); g.moveTo(X(i / DEC_N), BOX.y0); g.lineTo(X(i / DEC_N), BOX.y1); g.stroke(); }
    for (let i = 1; i <= DEC_E; i++) { g.beginPath(); g.moveTo(BOX.x0, Y(i / DEC_E)); g.lineTo(BOX.x1, Y(i / DEC_E)); g.stroke(); }
    g.restore();
    for (let i = 0; i <= DEC_N; i++) text(g, String(10 ** i), X(i / DEC_N), BOX.y1 + 72, { size: 56, rgb: MUTED, align: 'center', weight: 600 });
    for (let i = 0; i <= DEC_E; i++) text(g, E_TICKS[i], BOX.x0 - 28, Y(i / DEC_E), { size: 52, rgb: MUTED, align: 'right', weight: 600, baseline: 'middle' });
    // the axes, with arrows
    g.save(); g.strokeStyle = AXIS; g.fillStyle = AXIS; g.lineWidth = 5;
    g.beginPath(); g.moveTo(BOX.x0, BOX.y1); g.lineTo(BOX.x1 + 50, BOX.y1); g.moveTo(BOX.x0, BOX.y1); g.lineTo(BOX.x0, BOX.y0 - 50); g.stroke();
    g.beginPath(); g.moveTo(BOX.x1 + 70, BOX.y1); g.lineTo(BOX.x1 + 36, BOX.y1 - 16); g.lineTo(BOX.x1 + 36, BOX.y1 + 16); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(BOX.x0, BOX.y0 - 70); g.lineTo(BOX.x0 - 16, BOX.y0 - 36); g.lineTo(BOX.x0 + 16, BOX.y0 - 36); g.closePath(); g.fill();
    g.restore();
    // the axes' words: energy up the left side, size under the ticks (with what a calculation is)
    g.save(); g.translate(92, (BOX.y0 + BOX.y1) / 2); g.rotate(-Math.PI / 2);
    text(g, L.energy, 0, 0, { size: 62, rgb: [0.85, 0.89, 0.93], align: 'center', weight: 700, baseline: 'middle' });
    g.restore();
    text(g, L.size, BOX.x1, BOX.y1 + 150, { size: 62, rgb: [0.85, 0.89, 0.93], align: 'right', weight: 700 });
    text(g, L.what, BOX.x1, BOX.y1 + 214, { size: 46, rgb: MUTED, align: 'right', weight: 600 });
    // the lines: the GPU's, then the light's
    const kg = Math.min(1, Math.max(0, k / 0.45)), kl = Math.min(1, Math.max(0, (k - 0.35) / 0.45)), kc = Math.min(1, Math.max(0, (k - 0.85) / 0.15));
    line(vGpu, kg, HOT);
    line(vLight, kl, LIGHT);
    // their words, along each line near its end, where the other line is not: the GPU's above its line, the light's
    // under its line (right of where they cross, the GPU's line runs above the light's); the GPU's make over its name
    const along = (f, u, below, a, rgb, big, small, over = '') => {
      if (a <= 0) return;
      g.save();
      g.translate(X(u), Y(f(u)));
      g.rotate(Math.atan2(Y(f(1)) - Y(f(0)), X(1) - X(0)));
      const c = rgb.map(x => x * a);
      if (below) { text(g, big, 0, 96, { size: 84, rgb: c, align: 'right', weight: 800 }); text(g, small, 0, 158, { size: 50, rgb: c, align: 'right', weight: 600 }); }
      else {
        text(g, big, 0, -100, { size: 84, rgb: c, align: 'right', weight: 800 }); text(g, small, 0, -36, { size: 50, rgb: c, align: 'right', weight: 600 });
        if (over) text(g, over, 0, -186, { size: 56, rgb: c, align: 'right', weight: 700 });
      }
      g.restore();
    };
    along(vGpu, 0.97, false, (kg - 0.8) / 0.2, HOT, L.gpu, L.gpuHow, L.gpuMake);
    along(vLight, 0.99, true, (kl - 0.8) / 0.2, LIGHT, L.light, L.lightHow);
    // where our chip works today: a dashed line at N = 49, from the size axis to near the top, named at its top
    if (kc > 0) {
      const tx = X(Math.log10(N_TODAY) / DEC_N);
      g.save(); g.globalAlpha = kc;
      g.setLineDash([22, 16]); g.strokeStyle = css(LIGHT, 0.85); g.lineWidth = 5;
      g.beginPath(); g.moveTo(tx, BOX.y1); g.lineTo(tx, Y(0.9)); g.stroke();
      g.restore();
      text(g, L.today, tx, Y(0.9) - 28, { size: 52, rgb: LIGHT.map(c => c * kc), align: 'center', weight: 700 });
    }
    // where they cross: a ring, a dashed line down to the size axis, N ~ 100 (on a dark ground: the line at N = 49
    // passes behind its words)
    if (kc > 0) {
      const cx = X(CROSS.u), cy = Y(CROSS.v);
      g.save(); g.globalAlpha = kc;
      g.setLineDash([18, 16]); g.strokeStyle = 'rgba(214, 226, 238, 0.7)'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(cx, cy + 30); g.lineTo(cx, BOX.y1); g.stroke();
      g.setLineDash([]); g.fillStyle = 'rgba(9, 13, 19, 1)'; g.strokeStyle = '#f2f5f8'; g.lineWidth = 8;
      g.beginPath(); g.arc(cx, cy, 24, 0, Math.PI * 2); g.fill(); g.stroke();
      g.restore();
      g.save(); g.font = `700 56px ${FONT}`;
      const cw = g.measureText(L.cross).width;
      g.fillStyle = 'rgba(9, 13, 19, 1)'; g.fillRect(cx - 34 - cw, BOX.y1 - 82, cw + 24, 66);
      g.restore();
      text(g, L.cross, cx - 22, BOX.y1 - 30, { size: 56, rgb: [0.95 * kc, 0.96 * kc, 0.97 * kc], align: 'right', weight: 700 });
    }
    tex.needsUpdate = true;
    drawnK = k; drawnLang = lang();
  };

  const plotAt = (u, v, out) => out.set(at[0] - w / 2 + X(u) / PX, at[1] + LIFT, at[2] - d / 2 + Y(v) / PX);
  return {
    group, plotAt,
    show(a, k) {
      mat.opacity = a;
      group.visible = a > 0.003;
      if (!group.visible) return;
      k = Math.round(Math.min(1, Math.max(0, k)) * 60) / 60;          // (at most 60 redraws while the lines grow)
      if (k !== drawnK || lang() !== drawnLang) draw(k);
    },
  };
}

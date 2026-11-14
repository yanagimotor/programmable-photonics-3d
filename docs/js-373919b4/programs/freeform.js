// The two-dimensional programmable waveguide of Onodera et al., Nature Physics 22, 164 (2026): a slab waveguide
// whose refractive index is written by the projected light.  There are no waveguides and no switches: a free-form
// pattern of light, found by training, steers the light.  The input numbers are amplitude-encoded into equidistant
// Gaussian beams at the input facet; the light propagates by the paraxial wave equation
//     dE/dz = i/(2k) d2E/dx2 + i k0 dn(x, z) E,   dn = dnMax * p(x, z)   (p: the illumination pattern, 0..1)
// in split steps (diffraction in Fourier space, then the written phase and the absorbing edges), exactly the steps
// of tools/train_freeform.py, which trained the pattern; the light at the output facet is summed in equal bins, and
// the brightest bin is the answer.  Used by the programs image.js (handwritten digits) and voice.js (vowels).
//
//   const ff = freeformChip(kit, data, { onAnswer })    data: a module of programs/data (DEVICE, BEAMS, BINS, PATTERN)
//                            options: geo (where the slab lies: X0, X1, XI, XO, SX), cells (the answers' cells),
//                            mode 'sweep' (each input flies through) or 'fade' (a stream of inputs, cross-faded),
//                            pulse/flow (how strongly and how fast the light pulses along), chip (add the chip body)
//   ff.show(amps)            a new input (amplitudes of the input beams, 0..1): the light sweeps in from the input
//                            facet; onAnswer({ share, answer }) when it reaches the output facet; onSweep() when the
//                            new light starts in (after the old one has faded: the IN board changes then)
//   ff.update(dt)            every frame;  ff.result: { share, answer } of the input shown (null while in flight)
//   ff.labels(() => names)   the answers' names (current language) for the cells beside the output facet
//   ff.setPattern(p, { fade })  a new pattern (Float32Array nz x nx, 0..1): the green light cross-fades to it (the
//                            caller then shows its input again, through the new pattern)
//   ff.anchors               chip-local positions for callouts
//   ff.beamAt(i, out?)       chip-local [x, y, z] where input beam i starts (x = XI, on the chip's top, y = 0; beam 0
//                            nearest the visitor);  ff.exitAt(c, out?)  the same for exit c's cell (x = XL)
//   ff.patMesh, ff.patTex    the pattern's plane and its texture (nz x nx, the green light's picture); ff.strip the
//                            answers' cells (a plane, transparent: its material's opacity may be faded); ff.field the
//                            light's plane
//   options size (the chip body, default SIZE), rgb (the light's colour, default infrared red), pattern (a
//   Float32Array instead of data.PATTERN), run (amps -> { I, share, answer }: the light recorded elsewhere instead
//   of the Slab's propagation - image.js shows the 2D Waveguide Studio's simulation; I then has DEVICE.nzl rows),
//   cell (the answer cell's colour, display rgb; default tab 2's red with white text - a pale colour gets dark text)
//
//   streakField(nz, nxp, rand), patternOf(F, dev)   made-up patterns with the look of the paper's trained ones
//                            (tab 3's light computer makes a new one every second or two)
import { lin, IR } from '../kit/colour.js';

// the chip on the bench (scene units; the slab is 10 mm long and wx wide, drawn stretched across)
export const SIZE = { w: 11.4, d: 7.0 };
// where the slab lies (the AI programs): input and output facets X0, X1; the input beams start at XI, the light runs
// out into the bins up to XO; the strip of answer cells at XL (width WL); SX scene units per mm across the slab
const GEO = { X0: -4.75, X1: 4.25, XI: -5.7, XO: 4.62, XL: 5.16, WL: 0.92, SX: 7.4 };

// ------------------------------------------------------------------------------------------ the propagation
function makeFFT(n) {
  const levels = Math.round(Math.log2(n));
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < levels; b++) r |= ((i >> b) & 1) << (levels - 1 - b); rev[i] = r; }
  const cs = new Float64Array(n / 2), sn = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) { cs[i] = Math.cos(2 * Math.PI * i / n); sn[i] = Math.sin(2 * Math.PI * i / n); }
  // in place; forward: X_k = sum x_n exp(-2 pi i k n / N) (numpy's fft); inverse divides by N (numpy's ifft)
  return (re, im, inverse) => {
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let size = 2; size <= n; size *= 2) {
      const half = size / 2, step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const wr = cs[k], wi = inverse ? sn[k] : -sn[k];
          const a = i + j, b = a + half;
          const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr; im[b] = im[a] - xi;
          re[a] += xr; im[a] += xi;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  };
}

export function decodePattern(b64, n) {
  const s = atob(b64), p = new Float32Array(n);
  if (s.length !== n) throw new Error(`pattern: ${s.length} bytes, expected ${n}`);
  for (let i = 0; i < n; i++) p[i] = s.charCodeAt(i) / 255;
  return p;
}

export class Slab {
  constructor(dev, beams, bins, pattern) {
    const nx = this.nx = dev.nx, nz = this.nz = dev.nz;
    const dx = this.dx = dev.wx / nx, dz = dev.L / nz;
    const k0 = 2 * Math.PI / dev.lam0, k = k0 * dev.n0;
    this.x = Float64Array.from({ length: nx }, (_, j) => -dev.wx / 2 + (j + 0.5) * dx);
    this.Hr = new Float64Array(nx); this.Hi = new Float64Array(nx);
    for (let j = 0; j < nx; j++) {
      const f = (j < nx / 2 ? j : j - nx) / (nx * dx), kx = 2 * Math.PI * f;
      const ph = kx * kx * dz / (2 * k);
      this.Hr[j] = Math.cos(ph); this.Hi[j] = -Math.sin(ph);
    }
    this.abs = Float64Array.from(this.x, x => { const a = Math.min(1, Math.max(0, (Math.abs(x) - dev.absX) / (dev.wx / 2 - dev.absX))); return Math.exp(-dev.absG * a * a); });
    this.ph = k0 * dev.dnMax * dz;
    this.p = typeof pattern === 'string' ? decodePattern(pattern, nz * nx) : Float32Array.from(pattern);
    this.beams = beams; this.bins = bins;
    this.centres = Array.from({ length: beams.n }, (_, i) => beams.x0 + (beams.x1 - beams.x0) * i / (beams.n - 1));
    const edges = Array.from({ length: bins.n + 1 }, (_, c) => bins.x0 + (bins.x1 - bins.x0) * c / bins.n);
    this.binOf = Int8Array.from(this.x, x => { for (let c = 0; c < bins.n; c++) if (x >= edges[c] && x < edges[c + 1]) return c; return -1; });
    this.fft = makeFFT(nx);
  }
  // amps (beams.n numbers) -> the intensity at every step (I: (nz + 1) rows of nx), each bin's share of the input
  // power, the brightest bin
  run(amps) {
    const { nx, nz, x } = this;
    const re = new Float64Array(nx), im = new Float64Array(nx);
    for (let i = 0; i < this.beams.n; i++) {
      const a = amps[i] || 0;
      if (!a) continue;
      for (let j = 0; j < nx; j++) { const u = (x[j] - this.centres[i]) / this.beams.w; re[j] += a * Math.exp(-u * u); }
    }
    let P = 0;
    for (let j = 0; j < nx; j++) P += re[j] * re[j];
    const nrm = 1 / Math.sqrt(P + 1e-30);
    for (let j = 0; j < nx; j++) re[j] *= nrm;
    const I = new Float32Array((nz + 1) * nx);
    for (let j = 0; j < nx; j++) I[j] = re[j] * re[j];
    for (let s = 0; s < nz; s++) {
      this.fft(re, im, false);
      for (let j = 0; j < nx; j++) { const r = re[j] * this.Hr[j] - im[j] * this.Hi[j]; im[j] = re[j] * this.Hi[j] + im[j] * this.Hr[j]; re[j] = r; }
      this.fft(re, im, true);
      const row = s * nx, out = (s + 1) * nx;
      for (let j = 0; j < nx; j++) {
        const f = this.ph * this.p[row + j], c = Math.cos(f) * this.abs[j], d = Math.sin(f) * this.abs[j];
        const r = re[j] * c - im[j] * d; im[j] = re[j] * d + im[j] * c; re[j] = r;
        I[out + j] = re[j] * re[j] + im[j] * im[j];
      }
    }
    const share = new Array(this.bins.n).fill(0);
    for (let j = 0; j < nx; j++) if (this.binOf[j] >= 0) share[this.binOf[j]] += I[nz * nx + j];
    const answer = share.reduce((b, v, c) => (v > share[b] ? c : b), 0);
    return { I, share, answer };
  }
}

// ------------------------------------------------------------------------------------------ the light, drawn
const FIELD_VS = /* glsl */ `
varying vec3 vP;
void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// the light in the slab: the computed intensity (each step normalised to its brightest point, then a gamma of 1.6,
// so that the main paths read and the green pattern stays visible between them), sweeping
// in from the input facet when a new input arrives; the input beams arrive from the left, the light runs out into
// the bins on the right.  Drawn over the surface (not added), so that red stays red on the pale chip.
const FIELD_FS = /* glsl */ `
uniform sampler2D uField, uField2;
uniform vec3 uColor;
uniform float uFront, uLevel, uDim, uTime, uNz, uSI, uSO, uW, uX0, uLen, uMix, uPulse, uFlow, uDash;
varying vec3 vP;
void main() {
  float s = (vP.x - uX0) / uLen;
  float v = 0.5 - vP.z / uW;
  float u = (clamp(s, 0.0, 1.0) * uNz + 0.5) / (uNz + 1.0);
  float I = mix(texture2D(uField, vec2(u, v)).r, texture2D(uField2, vec2(u, v)).r, uMix);
  float ends = s < 0.0 ? smoothstep(uSI, uSI * 0.35, s) : (s > 1.0 ? 1.0 - smoothstep(1.0, uSO, s) * 0.85 : 1.0);
  float shown = 1.0 - smoothstep(uFront - 0.035, uFront, s);
  float flow = 1.0 - uPulse + uPulse * cos(6.2831853 * (s * uDash - uTime * uFlow));
  vec3 col = uColor * I * ends * shown * flow * uLevel * uDim;
  float m = max(max(col.r, col.g), col.b);
  float a = clamp(m * 1.6, 0.0, 1.0);
  gl_FragColor = vec4(col / max(a, 0.04), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function freeformChip(kit, data, { onAnswer = null, onSweep = null, gamma = 1.6, sweep = 1.35, geo = {}, cells = true, mode = 'sweep',
  fade = 0.22, pulse = 0.18, flow = 1.7, dash = 10, chip = true, size = SIZE, rgb = IR, pattern = null, run = null, cell = null } = {}) {
  const { THREE } = kit;
  const { X0, X1, XI, XO, XL, WL, SX } = { ...GEO, ...geo };
  const zOf = x => -x * SX;              // +x (up in the paper's figures) is away from the visitor
  const dev = data.DEVICE, nx = dev.nx, nz = dev.nz, W = dev.wx * SX;
  const nzl = dev.nzl || nz + 1;           // rows of the light: the input facet, then (every) step
  const slab = run ? { p: Float32Array.from(pattern || data.PATTERN), run } : new Slab(dev, data.BEAMS, data.BINS, pattern || data.PATTERN);
  if (chip) kit.chip({ w: size.w, d: size.d, platform: 'ln' });

  // the program: the illumination pattern over the slab (on the programmable chip it is drawn into the bench's mask:
  // the green light on the chip and in the projector's beam)
  const pData = new Uint8Array(nz * nx * 4);
  const pFrom = Float32Array.from(slab.p), pTo = Float32Array.from(slab.p);
  const putPattern = k => {
    for (let s = 0; s < nz; s++) for (let j = 0; j < nx; j++) {
      const i = s * nx + j, v = Math.round(255 * (pFrom[i] + (pTo[i] - pFrom[i]) * k)), o = (j * nz + s) * 4;
      pData[o] = pData[o + 1] = pData[o + 2] = v; pData[o + 3] = 255;
    }
  };
  putPattern(1);
  const pTex = new THREE.DataTexture(pData, nz, nx, THREE.RGBAFormat);
  pTex.magFilter = THREE.LinearFilter; pTex.minFilter = THREE.LinearFilter; pTex.needsUpdate = true;
  const patMesh = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, W).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: pTex }));
  patMesh.position.set((X0 + X1) / 2, 0.002, 0);
  patMesh.userData.maskMap = pTex;
  kit.group.add(patMesh);

  // the light
  const texOf = d => { const t = new THREE.DataTexture(d, nzl, nx, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; return t; };
  const fData = new Uint8Array(nzl * nx * 4), fData2 = new Uint8Array(nzl * nx * 4);
  const fTex = texOf(fData), fTex2 = texOf(fData2);        // the light shown, and (mode 'fade') the next one
  const sI = (XI - X0) / (X1 - X0), sO = (XO - X0) / (X1 - X0);
  const U = {
    uField: { value: fTex }, uField2: { value: fTex2 }, uMix: { value: 0 },
    uColor: { value: new THREE.Color(...lin(rgb)).multiplyScalar(1.7) },
    uFront: { value: 2 }, uLevel: { value: 1 }, uDim: { value: 1 }, uTime: { value: 0 }, uNz: { value: nzl - 1 },
    uSI: { value: sI }, uSO: { value: sO }, uW: { value: W }, uX0: { value: X0 }, uLen: { value: X1 - X0 },
    uPulse: { value: pulse }, uFlow: { value: flow }, uDash: { value: dash },
  };
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(XO - XI, W).rotateX(-Math.PI / 2).translate((XI + XO) / 2, 0, 0),
    new THREE.ShaderMaterial({ uniforms: U, vertexShader: FIELD_VS, fragmentShader: FIELD_FS, transparent: true, depthWrite: false }));
  field.position.y = 0.02;
  field.renderOrder = 5;
  field.userData.role = 'light';
  kit.group.add(field);
  kit.onTick((dt, t, dim) => { U.uTime.value = kit.reduced ? 0 : t; U.uDim.value = dim; });
  const paint = (I, data = fData, tex = fTex) => {
    for (let s = 0; s < nzl; s++) {
      let m = 1e-30;
      for (let j = 0; j < nx; j++) m = Math.max(m, I[s * nx + j]);
      for (let j = 0; j < nx; j++) {
        const v = Math.round(255 * Math.pow(I[s * nx + j] / m, gamma)), o = (j * nzl + s) * 4;
        data[o] = data[o + 1] = data[o + 2] = v; data[o + 3] = 255;
      }
    }
    tex.needsUpdate = true;
  };

  // the output bins (in the paper, bins of the camera at the output facet): a cell per answer beside the facet,
  // filled red as much as its share of the light; the answer's cell is solid, with its name in white.  (cell: another
  // colour for the cells - tab 3's light is yellow-white - with the answer's name in dark grey on its pale cell)
  const C255 = cell ? cell.map(v => Math.round(255 * Math.max(0, Math.min(1, v)))).join(', ') : '216, 56, 44';
  const cellWin = cell ? `rgb(${C255})` : '#d8382c', cellEdge = cell ? `rgb(${cell.map(v => Math.round(140 * Math.max(0, Math.min(1, v)))).join(', ')})` : '#8c1c14';
  const cellText = cell ? 'rgba(24, 30, 38, 0.95)' : '#ffffff';
  // (the other cells: dark names on tab 2's pale chip; light ones with tab 3's look, whose chip is darker, with
  // brighter rims and larger names, which fill their cells: the exits read as numbered from afar)
  const inkOff = cell ? 'rgba(232, 238, 245, 0.95)' : 'rgba(30, 40, 52, 0.85)', edgeOff = cell ? 'rgba(210, 222, 236, 0.62)' : 'rgba(40, 52, 66, 0.35)';
  const nameK = cell ? 0.8 : 0.6, rimW = cell ? 3 : 2;
  const bins = data.BINS, nb = bins.n, bw = (bins.x1 - bins.x0) / nb;
  const binX = c => bins.x0 + (c + 0.5) * bw;
  const strip = { canvas: document.createElement('canvas'), h: (bins.x1 - bins.x0) * SX + 0.1, w: WL };
  if (!cells) strip.canvas.width = strip.canvas.height = 1;
  strip.canvas.width = 160; strip.canvas.height = Math.round(160 * strip.h / strip.w);
  const sTex = new THREE.CanvasTexture(strip.canvas);
  sTex.colorSpace = THREE.SRGBColorSpace; sTex.anisotropy = 4;
  const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(strip.w, strip.h).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: sTex, transparent: true, depthWrite: false, toneMapped: false }));
  sMesh.position.set(XL, 0.012, 0);
  sMesh.renderOrder = 6;
  sMesh.userData.role = 'label';
  if (cells) kit.group.add(sMesh);
  let stripKey = '';
  const drawStrip = (labels, r) => {
    if (!cells) return;
    const key = labels.join('|') + '#' + (r ? r.share.map(v => v.toFixed(3)).join(',') : '-');
    if (key === stripKey) return;
    stripKey = key;
    const g = strip.canvas.getContext('2d'), Wc = strip.canvas.width, Hc = strip.canvas.height;
    g.clearRect(0, 0, Wc, Hc);
    const px = Hc / strip.h, ch = bw * SX * px, size = Math.round(Math.min(ch * nameK, Wc * 0.42));
    const m = r ? Math.max(...r.share) : 1;
    g.font = `700 ${size}px "Segoe UI", "Yu Gothic UI", "Meiryo", system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let c = 0; c < nb; c++) {
      const y = Hc / 2 + zOf(binX(c)) * px, v = r ? r.share[c] / m : 0, win = r && c === r.answer;
      g.beginPath(); g.roundRect(Wc * 0.06, y - ch * 0.44, Wc * 0.88, ch * 0.88, Math.min(14, ch * 0.2));
      g.fillStyle = win ? cellWin : `rgba(${C255}, ${(0.08 + 0.5 * v * v).toFixed(3)})`; g.fill();
      g.lineWidth = win ? 4 : rimW; g.strokeStyle = win ? cellEdge : edgeOff; g.stroke();
      g.fillStyle = win ? cellText : inkOff;
      g.fillText(labels[c], Wc / 2, y + size * 0.05);
    }
    sTex.needsUpdate = true;
  };

  // a new input: the light already in the slab fades, then the new light sweeps in from the input facet (mode
  // 'sweep'); or the new light cross-fades with the old one at once (mode 'fade', a stream of inputs)
  const st = { phase: 'steady', level: 1, front: 2, next: null, result: null, labels: null, mix: -1, pk: -1, pfade: 0.4 };
  const settle = () => { if (st.mix >= 0) { fData.set(fData2); fTex.needsUpdate = true; st.mix = -1; U.uMix.value = 0; } };
  const reveal = () => {
    st.result = st.next;
    if (onAnswer) onAnswer(st.result);
  };
  const beams = data.BEAMS;
  const ff = {
    slab, SX, zOf, X0, X1, XI, XL, binX,
    patMesh, patTex: pTex, strip: sMesh, field,
    beamAt(i, out = [0, 0, 0]) { out[0] = XI; out[1] = 0; out[2] = zOf(beams.x0 + (beams.x1 - beams.x0) * i / (beams.n - 1)); return out; },
    exitAt(c, out = [0, 0, 0]) { out[0] = XL; out[1] = 0; out[2] = zOf(binX(c)); return out; },
    get result() { return st.result; },
    get flying() { return st.phase !== 'steady'; },
    show(amps, { instant = false } = {}) {
      st.next = slab.run(amps);
      if (mode === 'fade') {
        settle();
        if (instant || kit.reduced) paint(st.next.I);
        else { paint(st.next.I, fData2, fTex2); st.mix = 0; }
        if (onSweep) onSweep();
        reveal();
        return st.next;
      }
      st.result = null;
      if (instant || kit.reduced) { paint(st.next.I); st.level = 1; st.front = 2; st.phase = 'steady'; if (onSweep) onSweep(); reveal(); return st.next; }
      st.phase = st.level > 0.02 && st.front > sI ? 'out' : 'in';
      if (st.phase === 'in') { paint(st.next.I); st.front = sI; st.level = 1; if (onSweep) onSweep(); }
      return st.next;
    },
    setPattern(p, { fade: f = 0.4 } = {}) {
      if (st.pk >= 0) { const e = st.pk * st.pk * (3 - 2 * st.pk); for (let i = 0; i < pTo.length; i++) pFrom[i] += (pTo[i] - pFrom[i]) * e; }
      else pFrom.set(pTo);
      pTo.set(p);
      slab.p.set(p);
      st.pfade = f;
      if (f <= 0 || kit.reduced) { st.pk = -1; pFrom.set(p); putPattern(1); pTex.needsUpdate = true; } else st.pk = 0;
    },
    update(dt) {
      if (st.pk >= 0) {
        st.pk = Math.min(1, st.pk + dt / st.pfade);
        putPattern(st.pk * st.pk * (3 - 2 * st.pk)); pTex.needsUpdate = true;
        if (st.pk >= 1) { st.pk = -1; pFrom.set(pTo); }
      }
      if (st.mix >= 0) { st.mix += dt / fade; U.uMix.value = Math.min(1, st.mix); if (st.mix >= 1) settle(); }
      if (st.phase === 'out') {
        st.level -= dt / 0.28;
        if (st.level <= 0) { paint(st.next.I); st.level = 1; st.front = sI; st.phase = 'in'; if (onSweep) onSweep(); }
      } else if (st.phase === 'in') {
        const was = st.front;
        st.front += dt * (sO + 0.06 - sI) / sweep;
        if (was < 1 && st.front >= 1) reveal();
        if (st.front >= sO + 0.06) { st.front = 2; st.phase = 'steady'; }
      }
      U.uFront.value = st.front; U.uLevel.value = Math.max(0, st.level);
      if (st.labels) drawStrip(st.labels(), st.result);
    },
    // labels: () -> the names of the answers in the current language
    labels(f) { st.labels = f; drawStrip(f(), st.result); },
    anchors: { in: [XI + 0.35, 0.1, zOf(data.BEAMS.x1) - 0.3], pattern: [0.4, 0.1, -W / 2 + 0.3], out: [XL, 0.1, zOf(bins.x1) - 0.5] },
  };
  return ff;
}

// ------------------------------------------------------------------------------------------ made-up patterns
// Random streaks along z in a few tilts, mixed in patches (the look of the paper's trained patterns; the recipe of
// tools/train_freeform.py's streaks())
// a Gaussian blur along one axis (n lines of m samples; sample k of line i at i * stride + k * step; edges mirrored)
function blur1(a, n, m, stride, step, sigma) {
  const r = Math.ceil(3 * sigma), w = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-0.5 * ((i - r) / sigma) ** 2));
  const ws = w.reduce((x, y) => x + y, 0), line = new Float32Array(m);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) line[k] = a[i * stride + k * step];
    for (let k = 0; k < m; k++) {
      let v = 0;
      for (let q = -r; q <= r; q++) {
        let kk = k + q;
        kk = kk < 0 ? -kk - 1 : kk >= m ? 2 * m - kk - 1 : kk;
        v += w[q + r] * line[Math.min(m - 1, Math.max(0, kk))];
      }
      a[i * stride + k * step] = v / ws;
    }
  }
}
// nz x nxp numbers with mean ~0 and standard deviation 1 (Float32Array, row by row)
export function streakField(nz, nxp, rand) {
  const gauss = () => { let u = 0; while (!u) u = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand()); };
  const tilts = [-0.8, -0.4, 0, 0.4, 0.8], W = nxp + 2 * nz;
  const layers = [], gates = [];
  for (const tilt of tilts) {
    const w = Float32Array.from({ length: nz * W }, gauss);
    blur1(w, W, nz, 1, W, 5.0);          // along z
    blur1(w, nz, W, W, 1, 1.0);          // along x
    const L = new Float32Array(nz * nxp);
    let ss = 0;
    for (let j = 0; j < nz; j++) {
      const sh = Math.round(tilt * j);
      for (let i = 0; i < nxp; i++) { const v = w[j * W + (((i + nz - sh) % W) + W) % W]; L[j * nxp + i] = v; ss += v * v; }
    }
    const sd = Math.sqrt(ss / L.length) || 1;
    for (let i = 0; i < L.length; i++) L[i] /= sd;
    layers.push(L);
    // the patches: very smooth noise, made on a coarse grid (every 8 cells) and interpolated
    const cz = Math.ceil(nz / 8) + 2, cx = Math.ceil(nxp / 8) + 2, c = Float32Array.from({ length: cz * cx }, gauss);
    blur1(c, cx, cz, 1, cx, 1.2); blur1(c, cz, cx, cx, 1, 1.2);
    const at = (zz, xx) => c[Math.min(cz - 1, zz) * cx + Math.min(cx - 1, xx)];
    const G = new Float32Array(nz * nxp);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nxp; i++) {
      const fz = j / 8, fx = i / 8, z0 = Math.floor(fz), x0 = Math.floor(fx), az = fz - z0, ax = fx - x0;
      G[j * nxp + i] = (1 - az) * ((1 - ax) * at(z0, x0) + ax * at(z0, x0 + 1)) + az * ((1 - ax) * at(z0 + 1, x0) + ax * at(z0 + 1, x0 + 1));
    }
    gates.push(G);
  }
  let gs = 0;
  for (const G of gates) for (const v of G) gs += v * v;
  const gk = 4 / (Math.sqrt(gs / (gates.length * nz * nxp)) || 1);
  const out = new Float32Array(nz * nxp);
  let os = 0;
  for (let i = 0; i < out.length; i++) {
    let mx = -Infinity;
    for (const G of gates) mx = Math.max(mx, gk * G[i]);
    let den = 0, num = 0;
    for (let l = 0; l < gates.length; l++) { const e = Math.exp(gk * gates[l][i] - mx); den += e; num += e * layers[l][i]; }
    out[i] = num / den; os += out[i] * out[i];
  }
  const sd = Math.sqrt(os / out.length) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= sd;
  return out;
}
// a field of streaks (nz x nx/2) -> an illumination pattern (nz x nx, 0..1): a sigmoid, each pixel two cells wide, a
// little blur (the optics), nothing beyond |x| > pw - as tools/train_freeform.py made the light computer's pattern
export function patternOf(F, dev, { gain = 2.6 } = {}) {
  const nz = dev.nz, nx = dev.nx, nxp = nx / 2, p = new Float32Array(nz * nx);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) p[j * nx + i] = 1 / (1 + Math.exp(-gain * F[j * nxp + (i >> 1)]));
  blur1(p, nx, nz, 1, nx, 0.9);
  blur1(p, nz, nx, nx, 1, 1.3);
  const dx = dev.wx / nx;
  for (let i = 0; i < nx; i++) if (Math.abs(-dev.wx / 2 + (i + 0.5) * dx) > dev.pw) for (let j = 0; j < nz; j++) p[j * nx + i] = 0;
  return p;
}

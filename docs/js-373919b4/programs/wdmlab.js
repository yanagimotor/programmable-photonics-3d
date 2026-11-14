// In situ inverse design of a colour router (tab 3; after Zhao et al., "Lithography-free in situ
// photonic inverse design", arXiv:2610.10404, 2026): the slab waveguide of the light-programmable chip, four colours
// of light (four wavelengths, 1310 to 1610 nm) entering together through one input, and a target: which colour
// leaves through which of four outputs (a permutation).  Nobody designs the pattern: it starts dark (no
// illumination: the light just spreads), and every step the outputs are measured, compared with the target, and the
// error is fed back into the pattern - here as the gradient of the error through the light's own propagation (what
// in situ backpropagation measures: the error sent back through the chip, overlapped with the light going forward),
// followed by one Adam step.  After about 30 steps every colour reaches its own output.
//
// The physics is the paraxial wave equation of freeform.js, per colour (wavelength lam):
//     dE/dz = i/(2k) d2E/dx2 + i k0 (dnMax p(x, z) + dnEnv(x, z)) E,     k0 = 2 pi / lam, k = k0 n0
// split-step as in freeform.js; dnEnv is what the surroundings add (the fire and the snow of tab 3's in situ story,
// apps/insitu.js: surroundings() below).
// tools/wdm_ref.py repeats every step in numpy (float64); site/dev/devcheck.js compares the two.
//
//   const lab = new WdmLab()            lab.target = [2, 0, 3, 1]   (colour c -> output port lab.target[c])
//   lab.forward()                       light through the current pattern: lab.P (port powers, colour x port),
//                                       lab.match (0..1: per colour, the share of its output light at its own port)
//   lab.learn()                         one step: the error of the last forward() fed back, the pattern updated
//   lab.p (nz x nx, 0..1)               the illumination pattern;  lab.env (nz x nx) the surroundings' dn
//   lab.intensity(c, I)                 the light of colour c at every step, into I ((nz + 1) x nx)
//   surroundings(lab) -> { sun, snow }  the surroundings' dn at full strength (nz x nx each): lab.env = a sun + b snow
export const WDM = {
  dev: { wx: 0.8, nx: 256, L: 10.0, nz: 100, dnMax: 1.7e-3, n0: 2.14, absX: 0.34, absG: 0.6 },   // mm; dn as in the paper
  lams: [1.31e-3, 1.41e-3, 1.51e-3, 1.61e-3],     // the four colours (mm)
  win: 0.04,                                       // input beam: exp(-(x / win)^2), centred
  ports: [-0.18, -0.06, 0.06, 0.18], half: 0.045,  // the four outputs: |x - port| < half at the output facet
  xmax: 0.3,                                       // the pattern is written only where |x| <= xmax
  lr: 0.05,                                        // Adam's step
};

// The surroundings (tab 3's in situ story; in this file, so that dev/devcheck.js checks what the story uses): a
// change of the slab's refractive index that nobody tells the chip about - a hot spot of +6e-4 (about 18 K) next to
// the fire at the chip's back edge (mm: x across the light, z along it), and under the snow a cold front side of
// -7e-4 (full where x < -0.3 mm, none beyond +0.3 mm), growing along the light towards the outputs
export const SURROUNDINGS = { sun: 6e-4, snow: 7e-4, hot: { x: 0.14, z: 4.5, sx: 0.15, sz: 2.6 } };
export function surroundings(lab) {
  const { nx, nz } = lab, n = nx * nz, { sun: SUN, snow: SNOW, hot: HOT } = SURROUNDINGS;
  const sun = new Float64Array(n), snow = new Float64Array(n);
  for (let s = 0; s < nz; s++) {
    const z = (s + 0.5) * lab.cfg.dev.L / nz;
    for (let j = 0; j < nx; j++) {
      const x = lab.x[j], i = s * nx + j;
      sun[i] = SUN * Math.exp(-(((x - HOT.x) ** 2) / (2 * HOT.sx ** 2) + ((z - HOT.z) ** 2) / (2 * HOT.sz ** 2)));
      snow[i] = -SNOW * Math.min(1, Math.max(0, 0.5 - x / 0.6)) * Math.sqrt(Math.min(1, Math.max(0, z / 10)));
    }
  }
  return { sun, snow };
}

function makeFFT(n) {
  const levels = Math.round(Math.log2(n));
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < levels; b++) r |= ((i >> b) & 1) << (levels - 1 - b); rev[i] = r; }
  const cs = new Float64Array(n / 2), sn = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) { cs[i] = Math.cos(2 * Math.PI * i / n); sn[i] = Math.sin(2 * Math.PI * i / n); }
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

export class WdmLab {
  constructor(cfg = WDM) {
    const d = cfg.dev, nx = this.nx = d.nx, nz = this.nz = d.nz, C = this.C = cfg.lams.length, Q = this.Q = cfg.ports.length;
    this.cfg = cfg;
    const dx = d.wx / nx, dz = d.L / nz;
    this.x = Float64Array.from({ length: nx }, (_, j) => -d.wx / 2 + (j + 0.5) * dx);
    this.k0dz = cfg.lams.map(l => 2 * Math.PI / l * dz);                // phase per step per unit of dn
    this.ph = this.k0dz.map(v => v * d.dnMax);                           // phase per step where p = 1
    this.Hr = []; this.Hi = [];
    for (const lam of cfg.lams) {
      const k = 2 * Math.PI / lam * d.n0, hr = new Float64Array(nx), hi = new Float64Array(nx);
      for (let j = 0; j < nx; j++) {
        const f = (j < nx / 2 ? j : j - nx) / (nx * dx), kx = 2 * Math.PI * f, a = kx * kx * dz / (2 * k);
        hr[j] = Math.cos(a); hi[j] = -Math.sin(a);
      }
      this.Hr.push(hr); this.Hi.push(hi);
    }
    this.A = Float64Array.from(this.x, x => { const a = Math.min(1, Math.max(0, (Math.abs(x) - d.absX) / (d.wx / 2 - d.absX))); return Math.exp(-d.absG * a * a); });
    this.keep = Float64Array.from(this.x, x => (Math.abs(x) <= cfg.xmax ? 1 : 0));
    this.portOf = Int8Array.from(this.x, x => { for (let q = 0; q < Q; q++) if (Math.abs(x - cfg.ports[q]) < cfg.half) return q; return -1; });
    const e0 = Float64Array.from(this.x, x => Math.exp(-((x / cfg.win) ** 2)));
    let P = 0; for (let j = 0; j < nx; j++) P += e0[j] * e0[j];
    this.E0 = e0.map(v => v / Math.sqrt(P));
    this.fft = makeFFT(nx);
    this.p = new Float64Array(nz * nx);
    this.env = new Float64Array(nz * nx);
    this.m = new Float64Array(nz * nx); this.v = new Float64Array(nz * nx);
    this.g = new Float64Array(nz * nx);
    // the light of every colour after every step (kept for the feedback)
    this.Er = Array.from({ length: C }, () => new Float64Array((nz + 1) * nx));
    this.Ei = Array.from({ length: C }, () => new Float64Array((nz + 1) * nx));
    this.re = new Float64Array(nx); this.im = new Float64Array(nx);
    this.target = Array.from({ length: C }, (_, c) => c % Q);
    this.P = Array.from({ length: C }, () => new Array(Q).fill(0));
    this.it = 0; this.loss = 0; this.match = 0;
    this.fresh = false;            // forward() ran on the current pattern
  }
  reset() { this.p.fill(0); this.m.fill(0); this.v.fill(0); this.it = 0; this.fresh = false; }
  // a fresh start of the optimiser, keeping the pattern (a new target, or the surroundings changed)
  restart() { this.m.fill(0); this.v.fill(0); this.it = 0; }

  forward() {
    const { nx, nz, re, im, A } = this;
    for (let c = 0; c < this.C; c++) {
      const Er = this.Er[c], Ei = this.Ei[c], hr = this.Hr[c], hi = this.Hi[c], k0dz = this.k0dz[c], dn = this.cfg.dev.dnMax;
      for (let j = 0; j < nx; j++) { re[j] = this.E0[j]; im[j] = 0; Er[j] = re[j]; Ei[j] = 0; }
      for (let s = 0; s < nz; s++) {
        this.fft(re, im, false);
        for (let j = 0; j < nx; j++) { const r = re[j] * hr[j] - im[j] * hi[j]; im[j] = re[j] * hi[j] + im[j] * hr[j]; re[j] = r; }
        this.fft(re, im, true);
        const row = s * nx, out = (s + 1) * nx;
        for (let j = 0; j < nx; j++) {
          const f = k0dz * (dn * this.p[row + j] + this.env[row + j]), a = Math.cos(f) * A[j], b = Math.sin(f) * A[j];
          const r = re[j] * a - im[j] * b; im[j] = re[j] * b + im[j] * a; re[j] = r;
          Er[out + j] = re[j]; Ei[out + j] = im[j];
        }
      }
      const Pc = this.P[c].fill(0), o = nz * nx;
      for (let j = 0; j < nx; j++) { const q = this.portOf[j]; if (q >= 0) Pc[q] += Er[o + j] * Er[o + j] + Ei[o + j] * Ei[o + j]; }
    }
    this.match = this.matchOf(this.P);
    this.fresh = true;
    return this.P;
  }
  matchOf(P) {
    let m = 0;
    for (let c = 0; c < this.C; c++) { let s = 0; for (const v of P[c]) s += v; m += P[c][this.target[c]] / (s + 1e-12); }
    return m / this.C;
  }
  // the error at the outputs: L = sum_c [ -log(P_ct / S_c) + (1 - P_ct) ],  S_c = sum_q P_cq + 0.02; dL/dP
  lossGrad() {
    let L = 0;
    const dP = this.P.map((Pc, c) => {
      const t = this.target[c], S = Pc.reduce((a, b) => a + b, 0) + 0.02;
      L += -Math.log(Pc[t] / S + 1e-9) + (1 - Pc[t]);
      return Pc.map((_, q) => 1 / S + (q === t ? -1 / (Pc[t] + 1e-9 * S) - 1 : 0));
    });
    this.loss = L;
    return dP;
  }
  // one step of in situ inverse design: the error of the last forward() sent back through the chip (the adjoint
  // field, step by step from the output facet to the input), overlapped with the light going forward: the gradient
  // of the error for every point of the pattern; then Adam
  learn() {
    if (!this.fresh) this.forward();
    const { nx, nz, re, im, A, g } = this;
    const dP = this.lossGrad();
    g.fill(0);
    for (let c = 0; c < this.C; c++) {
      const Er = this.Er[c], Ei = this.Ei[c], hr = this.Hr[c], hi = this.Hi[c], k0dz = this.k0dz[c], ph2 = 2 * this.ph[c], dn = this.cfg.dev.dnMax;
      const o = nz * nx;
      // dL/dconj(E_N) = dL/dI * E_N
      for (let j = 0; j < nx; j++) { const q = this.portOf[j], w = q >= 0 ? dP[c][q] : 0; re[j] = w * Er[o + j]; im[j] = w * Ei[o + j]; }
      for (let s = nz - 1; s >= 0; s--) {
        const out = (s + 1) * nx, row = s * nx;
        // dL/dp[s, j] = -2 ph Im(conj(g) E_{s+1})
        for (let j = 0; j < nx; j++) g[row + j] += -ph2 * (re[j] * Ei[out + j] - im[j] * Er[out + j]);
        for (let j = 0; j < nx; j++) {
          const f = k0dz * (dn * this.p[row + j] + this.env[row + j]), a = Math.cos(f) * A[j], b = -Math.sin(f) * A[j];
          const r = re[j] * a - im[j] * b; im[j] = re[j] * b + im[j] * a; re[j] = r;
        }
        this.fft(re, im, false);
        for (let j = 0; j < nx; j++) { const r = re[j] * hr[j] + im[j] * hi[j]; im[j] = -re[j] * hi[j] + im[j] * hr[j]; re[j] = r; }
        this.fft(re, im, true);
      }
    }
    // Adam (beta 0.9, 0.999), the pattern kept in 0..1 and only where it can be written
    const t = ++this.it, b1 = 1 - Math.pow(0.9, t), b2 = 1 - Math.pow(0.999, t), lr = this.cfg.lr;
    for (let s = 0; s < nz; s++) for (let j = 0; j < nx; j++) {
      const i = s * nx + j, gi = g[i];
      this.m[i] = 0.9 * this.m[i] + 0.1 * gi;
      this.v[i] = 0.999 * this.v[i] + 0.001 * gi * gi;
      const st = lr * (this.m[i] / b1) / (Math.sqrt(this.v[i] / b2) + 1e-12);
      this.p[i] = Math.min(1, Math.max(0, this.p[i] - st)) * this.keep[j];
    }
    this.fresh = false;
  }
  // the light of colour c at every step ((nz + 1) rows of nx), from the last forward()
  intensity(c, I) {
    const Er = this.Er[c], Ei = this.Ei[c];
    for (let i = 0; i < Er.length; i++) I[i] = Er[i] * Er[i] + Ei[i] * Ei[i];
    return I;
  }
}

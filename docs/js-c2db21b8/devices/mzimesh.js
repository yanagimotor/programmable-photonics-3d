// A rectangular mesh of Mach-Zehnder interferometers (MZIs), shared by the light router and the AI chip.
//
// n waveguides run along x at z_j = (j - (n-1)/2) * pitch.  The mesh has `cols` columns between x0 and x1;
// column c pairs the guides (j, j+1) for j = c % 2, c % 2 + 2, ...  (even columns start at guide 0, odd at 1:
// the rectangular layout of Clements et al. 2016, also the odd-even sorting network of a switch).
//
// One MZI: the two guides come close (coupler 1: splits the light 50:50), run apart as two arms (a heater on the
// upper arm delays its light by a phase theta), come close again (coupler 2: joins the light).  theta = pi: the
// light stays in its guide ("bar"); theta = 0: it crosses to the other guide ("cross"); anything between splits it.
//
// Every guide is cut into light segments so that each piece can carry its own brightness:
//   seg.approach / seg.arm / seg.leave  for a guide inside an MZI (before coupler 1 / between / after coupler 2)
//   seg.through                          for a guide that is not paired in that column
const SQ = Math.SQRT1_2;

export function pairsOf(c, n) {
  const out = [];
  for (let j = c % 2; j + 1 < n; j += 2) out.push(j);
  return out;
}

// complex helpers: [re, im]
export const C = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  i: a => [-a[1], a[0]],
  scale: (a, k) => [a[0] * k, a[1] * k],
  abs2: a => a[0] * a[0] + a[1] * a[1],
  exp: th => [Math.cos(th), Math.sin(th)],
};

// one MZI acting on complex amplitudes (u on the upper guide, v on the lower): returns the arm and output fields
export function mzi(u, v, theta) {
  const p = C.scale(C.add(u, C.i(v)), SQ), q = C.scale(C.add(C.i(u), v), SQ);   // coupler 1
  const pp = C.mul(p, C.exp(theta));                                               // heater on the upper arm
  const o1 = C.scale(C.add(pp, C.i(q)), SQ), o2 = C.scale(C.add(C.i(pp), q), SQ); // coupler 2
  return { arm: [C.abs2(p), C.abs2(q)], out: [o1, o2] };
}

// Build the waveguides, light segments and heaters of a mesh.  net = kit.lightNet(...) (built later by the caller).
export function buildMesh(kit, { n, pitch, x0, x1, cols, net, platform = 'si', leadIn = null, leadOut = null, gap = 0.15, lb = 0.19, lcp = 0.1, sStart = null }) {
  const { P } = kit;
  const z = Array.from({ length: n }, (_, j) => (j - (n - 1) / 2) * pitch);
  const Lc = (x1 - x0) / cols;
  const la = Lc - 4 * lb - 2 * lcp;
  if (la < 0.12) throw new Error('mzimesh: columns too short for the couplers');
  const s0 = x => x - (sStart ?? leadIn ?? x0);
  const ridges = [];
  const segs = [];        // segs[c][j] = { approach, arm, leave } | { through }
  const mzis = [];        // { c, j, x, zm, heater: index }
  const heaterItems = [];
  for (let c = 0; c < cols; c++) {
    const X = x0 + c * Lc, X1 = X + lb, Xc1 = X1 + lcp / 2, X2 = X1 + lcp, X3 = X2 + lb, X4 = X3 + la, X5 = X4 + lb, Xc2 = X5 + lcp / 2, X6 = X5 + lcp, X7 = X6 + lb;
    const row = segs[c] = [];
    const paired = new Set();
    for (const j of pairsOf(c, n)) {
      paired.add(j); paired.add(j + 1);
      const za = z[j], zb = z[j + 1], zm = (za + zb) / 2;
      for (const [k, zz, zc] of [[j, za, zm - gap / 2], [j + 1, zb, zm + gap / 2]]) {
        const approach = P.chain(P.sbend(X, zz, X1, zc), P.line(X1, zc, Xc1, zc));
        const arm = P.chain(P.line(Xc1, zc, X2, zc), P.sbend(X2, zc, X3, zz), P.line(X3, zz, X4, zz), P.sbend(X4, zz, X5, zc), P.line(X5, zc, Xc2, zc));
        const leave = P.chain(P.line(Xc2, zc, X6, zc), P.sbend(X6, zc, X7, zz));
        ridges.push(P.chain(approach, arm, leave));
        row[k] = { approach: net.add(approach, { s0: s0(X) }), arm: net.add(arm, { s0: s0(Xc1) }), leave: net.add(leave, { s0: s0(Xc2) }) };
      }
      heaterItems.push({ x0: X3 + 0.05, z0: za, x1: X4 - 0.05, z1: za });
      mzis.push({ c, j, x: (X + X7) / 2, zm, xh: (X3 + X4) / 2, zh: za, heater: heaterItems.length - 1 });
    }
    for (let j = 0; j < n; j++) {
      if (paired.has(j)) continue;
      const p = P.line(X, z[j], X + Lc, z[j]);
      ridges.push(p);
      row[j] = { through: net.add(p, { s0: s0(X) }) };
    }
  }
  const leads = { in: [], out: [] };
  if (leadIn !== null) for (let j = 0; j < n; j++) { const p = P.line(leadIn, z[j], x0, z[j]); ridges.push(p); leads.in.push(net.add(p, { s0: s0(leadIn) })); }
  if (leadOut !== null) for (let j = 0; j < n; j++) { const p = P.line(x1, z[j], leadOut, z[j]); ridges.push(p); leads.out.push(net.add(p, { s0: s0(x1) })); }
  kit.ridges(ridges, platform);
  const heaters = kit.heaters(heaterItems);
  return { z, Lc, segs, mzis, heaters, leads, cols, n };
}

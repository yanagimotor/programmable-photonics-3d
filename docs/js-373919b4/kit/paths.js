// Waveguide paths in the plane of a chip.  Coordinates are chip-local scene units: x along the chip (light
// enters at -x and leaves at +x), z across the chip (+z towards the viewer).  A Path is a dense polyline with
// its arc length; every builder below returns a Path, and chain() joins them.
//
//   P.line(x0, z0, x1, z1)            straight
//   P.sbend(x0, z0, x1, z1)           cosine S-bend from (x0, z0) to (x1, z1), x1 > x0
//   P.arc(cx, cz, r, a0, a1)          circular arc, angles in radians (x = cx + r cos a, z = cz + r sin a)
//   P.circle(cx, cz, r, a0 = 0, dir = 1)   closed ring starting at angle a0 (dir = +1 or -1)
//   P.poly([[x, z], ...])             straight pieces through the points
//   P.chain(p1, p2, ...)              one path through all of them (in order)
//   P.fn(f, t0, t1, n)                any curve: f(t) -> [x, z]
//
//   path.len, path.at(s) -> [x, z], path.dir(s) -> [dx, dz], path.closed, path.reversed()
const STEP = 0.04;

export class Path {
  constructor(pts, closed = false) {
    // drop consecutive duplicates
    const p = [];
    for (const q of pts) {
      const last = p[p.length - 1];
      if (!last || Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-6) p.push([q[0], q[1]]);
    }
    if (closed && p.length > 2) {
      const a = p[0], b = p[p.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6) p.pop();
    }
    if (p.length < 2) throw new Error('Path needs at least two distinct points');
    this.pts = p;
    this.closed = closed;
    const n = p.length + (closed ? 1 : 0);
    this.s = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const a = p[i - 1], b = p[i % p.length];
      this.s[i] = this.s[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    this.len = this.s[n - 1];
  }
  // index i and fraction f of the piece that contains arc length s
  locate(s) {
    if (this.closed) s = ((s % this.len) + this.len) % this.len;
    else s = Math.min(Math.max(s, 0), this.len);
    let lo = 0, hi = this.s.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.s[m] <= s) lo = m; else hi = m; }
    const d = this.s[hi] - this.s[lo];
    return [lo, d > 0 ? (s - this.s[lo]) / d : 0];
  }
  at(s) {
    const [i, f] = this.locate(s);
    const a = this.pts[i], b = this.pts[(i + 1) % this.pts.length];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  }
  dir(s) {
    const [i] = this.locate(s);
    const a = this.pts[i], b = this.pts[(i + 1) % this.pts.length];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  }
  get start() { return this.pts[0]; }
  get end() { return this.closed ? this.pts[0] : this.pts[this.pts.length - 1]; }
  reversed() { return new Path(this.pts.slice().reverse(), this.closed); }
  // the same path shifted by (dx, dz)
  moved(dx, dz) { return new Path(this.pts.map(([x, z]) => [x + dx, z + dz]), this.closed); }
}

export function line(x0, z0, x1, z1) {
  const L = Math.hypot(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.ceil(L / 0.5));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]);
  return new Path(pts);
}

export function sbend(x0, z0, x1, z1, n = 0) {
  n = n || Math.max(12, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / STEP));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * (1 - Math.cos(Math.PI * t)) / 2]);
  }
  return new Path(pts);
}

export function arc(cx, cz, r, a0, a1) {
  const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / STEP));
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return new Path(pts);
}

export function circle(cx, cz, r, a0 = 0, dir = 1) {
  const n = Math.max(48, Math.ceil(2 * Math.PI * r / STEP));
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + dir * 2 * Math.PI * i / n;
    pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
  }
  return new Path(pts, true);
}

export function poly(points) {
  const pts = [];
  for (let k = 0; k + 1 < points.length; k++) {
    const seg = line(points[k][0], points[k][1], points[k + 1][0], points[k + 1][1]).pts;
    pts.push(...(k ? seg.slice(1) : seg));
  }
  return new Path(pts);
}

export function fn(f, t0, t1, n = 200) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(f(t0 + (t1 - t0) * i / n));
  return new Path(pts);
}

export function chain(...parts) {
  const pts = [];
  for (const p of parts) pts.push(...p.pts);
  return new Path(pts);
}

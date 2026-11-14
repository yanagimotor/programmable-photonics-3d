// Solid parts of a chip: the chip body, etched ridges, slabs, metal (heaters, electrodes, pads, wire bonds),
// poled stripes, detectors, and soft glows that light up parts (a hot heater, a driven electrode, a detector).
// Every function returns a three.js object (or an object with .mesh and setters) in chip-local coordinates:
// the chip's top surface is y = 0, light runs along +x, +z points towards the viewer.
import * as THREE from 'three';
import { lin } from './colour.js';

// ------------------------------------------------------------------------------------------- platforms
// The material families on the table.  Colours follow the technical page: dark silicon, light grey ridges, muted
// violet lithium niobate, a dark teal silicon-nitride chip with pale ridges, and pale blue-grey silica glass.
export const PLATFORMS = {
  si: { top: 0x3a4048, side: 0x2a2f36, ridge: 0xb4c2d0, rough: 0.38, metal: 0.3 },
  sin: { top: 0x2b3d44, side: 0x1f2b31, ridge: 0xe2ece6, rough: 0.42, metal: 0.2 },
  ln: { top: 0x8e7ea6, side: 0x5d5370, ridge: 0xe0d6ee, rough: 0.5, metal: 0.05 },
  silica: { top: 0x7f97aa, side: 0x55687a, ridge: 0xe4f1fb, rough: 0.22, metal: 0.05 },   // silica glass on silicon (planar lightwave circuit)
};
export const RIDGE = { w: 0.13, h: 0.07 };        // default etched waveguide: width and height (scene units)
export const GOLD = 0xd4a53a;

const cache = new Map();
function cached(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }
export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15, ...o });
export const goldMat = () => cached('gold', () => std(GOLD, { metalness: 0.85, roughness: 0.3 }));
export const heaterMat = () => cached('heater', () => std(0xc9a25a, { metalness: 0.7, roughness: 0.35 }));
export const ridgeMat = pf => cached('ridge-' + pf, () => std(PLATFORMS[pf].ridge, { roughness: 0.32, metalness: 0.08, side: THREE.DoubleSide }));
export const darkMat = () => cached('dark', () => std(0x15181c, { roughness: 0.4, metalness: 0.4 }));

// ------------------------------------------------------------------------------------------- geometry helpers
// merge BufferGeometries that share their attribute names (indexed or not) into one
export function mergeGeos(list) {
  list = list.filter(Boolean);
  if (!list.length) return new THREE.BufferGeometry();
  const names = Object.keys(list[0].attributes);
  const out = new THREE.BufferGeometry();
  let total = 0;
  const idx = [];
  for (const g of list) {
    const n = g.attributes.position.count;
    if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + total);
    else for (let i = 0; i < n; i++) idx.push(i + total);
    total += n;
  }
  for (const name of names) {
    const size = list[0].attributes[name].itemSize;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of list) {
      const a = g.attributes[name];
      if (!a) throw new Error('mergeGeos: missing attribute ' + name);
      arr.set(a.array.subarray(0, a.count * size), off);
      off += a.count * size;
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  out.setIndex(total > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

// unit normals (left of the direction of travel) at every point of a path
function normals(path) {
  const p = path.pts, n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    let a, b;
    if (path.closed) { a = p[(i - 1 + n) % n]; b = p[(i + 1) % n]; }
    else { a = p[Math.max(0, i - 1)]; b = p[Math.min(n - 1, i + 1)]; }
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    out.push([-dz / L, dx / L]);
  }
  return out;
}

// an etched ridge along a path: top and both walls (and end caps for an open path)
export function ridgeGeometry(path, w = RIDGE.w, h = RIDGE.h) {
  const p = path.pts, n = p.length, N = normals(path), hw = w / 2;
  const pos = [], nor = [], idx = [];
  const strip = (fa, fb, na, nb) => {           // fa(i), fb(i): the two edges of a strip; na/nb normals
    const base = pos.length / 3;
    for (let i = 0; i < n; i++) {
      pos.push(...fa(i), ...fb(i));
      nor.push(...na(i), ...nb(i));
    }
    const m = path.closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % n;
      const a = base + 2 * i, b = a + 1, c = base + 2 * j, d = c + 1;
      idx.push(a, c, b, b, c, d);      // counter-clockwise seen from outside: the faces point out of the ridge
    }
  };
  const L = i => [p[i][0] + N[i][0] * hw, p[i][1] + N[i][1] * hw];
  const R = i => [p[i][0] - N[i][0] * hw, p[i][1] - N[i][1] * hw];
  strip(i => [L(i)[0], h, L(i)[1]], i => [R(i)[0], h, R(i)[1]], () => [0, 1, 0], () => [0, 1, 0]);
  strip(i => [L(i)[0], 0, L(i)[1]], i => [L(i)[0], h, L(i)[1]], i => [N[i][0], 0, N[i][1]], i => [N[i][0], 0, N[i][1]]);
  strip(i => [R(i)[0], h, R(i)[1]], i => [R(i)[0], 0, R(i)[1]], i => [-N[i][0], 0, -N[i][1]], i => [-N[i][0], 0, -N[i][1]]);
  if (!path.closed) {
    for (const [i, sgn] of [[0, -1], [n - 1, 1]]) {
      const base = pos.length / 3, d = [N[i][1] * sgn, -N[i][0] * sgn];   // direction of travel (outward at the end)
      const l = L(i), r = R(i);
      pos.push(l[0], 0, l[1], l[0], h, l[1], r[0], h, r[1], r[0], 0, r[1]);
      for (let k = 0; k < 4; k++) nor.push(d[0], 0, d[1]);
      if (sgn < 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

// etched ridges for many paths in one mesh
export function ridges(paths, platform = 'si', { w = RIDGE.w, h = RIDGE.h } = {}) {
  const m = new THREE.Mesh(mergeGeos(paths.map(p => ridgeGeometry(p, w, h))), ridgeMat(platform));
  m.castShadow = false; m.receiveShadow = true;
  return m;
}

// a flat etched region (star coupler, slab) bounded by a polygon [[x, z], ...]
export function slab(points, platform = 'si', h = RIDGE.h) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, ridgeMat(platform));
  m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------------------------------- the chip body
// top surface at y = 0; returns the mesh (the table also uses it for picking)
export function chipBody({ w, d, h = 0.45, platform = 'si' }) {
  const pf = PLATFORMS[platform];
  const top = std(pf.top, { roughness: pf.rough, metalness: pf.metal });
  const side = std(pf.side, { roughness: 0.6, metalness: 0.2 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, side, side, side]);
  m.position.y = -h / 2;
  m.castShadow = true; m.receiveShadow = true;
  m.userData.chip = { w, d, h, platform };
  return m;
}

// a carrier board under the chip (for chips with many wires); its top is at y = -chipH
export function carrier({ w, d, h = 0.22, chipH = 0.45 }) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#16231f'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(212,165,58,0.35)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(10 + 28 * i, 0); g.lineTo(10 + 28 * i, 30); g.lineTo(24 + 28 * i, 50); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(d / 4)));
  const topM = std(0xffffff, { map: tex, roughness: 0.7, metalness: 0.1 });
  const side = std(0x101915, { roughness: 0.8 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, topM, side, side, side]);
  m.position.y = -chipH - h / 2;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ------------------------------------------------------------------------------------------- boxes and glows
// items: {x0, z0, x1, z1, w, h = 0.03, y0 = 0} - a strip from (x0, z0) to (x1, z1), w wide, h tall, resting on y0
//    or  {x, z, sx, sz, h = 0.03, y0 = 0, rot = 0} - a box centred at (x, z), rotated by rot about y
function toBox(it) {
  if (it.x0 !== undefined) {
    const dx = it.x1 - it.x0, dz = it.z1 - it.z0;
    return { x: (it.x0 + it.x1) / 2, z: (it.z0 + it.z1) / 2, sx: Math.hypot(dx, dz), sz: it.w, h: it.h ?? 0.03, y0: it.y0 ?? 0, rot: -Math.atan2(dz, dx) };
  }
  return { x: it.x, z: it.z, sx: it.sx, sz: it.sz, h: it.h ?? 0.03, y0: it.y0 ?? 0, rot: it.rot ?? 0 };
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

export function boxes(items, material) {
  const geo = cached('unitbox', () => new THREE.BoxGeometry(1, 1, 1));
  const m = new THREE.InstancedMesh(geo, material, Math.max(1, items.length));
  m.count = items.length;
  items.map(toBox).forEach((b, i) => {
    _q.setFromAxisAngle(_up, b.rot);
    m.setMatrixAt(i, _m.compose(_p.set(b.x, b.y0 + b.h / 2, b.z), _q, _s.set(b.sx, b.h, b.sz)));
  });
  m.instanceMatrix.needsUpdate = true;
  m.castShadow = false; m.receiveShadow = true;
  return m;
}

// soft rectangle (alpha) used by every glow
function softTexture() {
  return cached('softtex', () => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'), img = g.createImageData(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const u = Math.abs(x - 31.5) / 32, v = Math.abs(y - 31.5) / 32;
      const a = Math.max(0, 1 - u ** 4) * Math.max(0, 1 - v ** 4);
      const i = 4 * (y * 64 + x);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(255 * a);
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    return t;
  });
}

// flat additive glows over items (same item format as boxes).  pad: extra size around each item.
// returns { mesh, set(i, value, rgb) }: value 0 = dark, 1 = bright (values > 1 bloom more)
export function glows(items, { pad = 0.12, y = 0.09, rgb = [1, 0.45, 0.1] } = {}) {
  const geo = cached('unitplane', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
  const mat = new THREE.MeshBasicMaterial({ map: softTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true });
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, items.length));
  m.count = items.length;
  const bx = items.map(toBox);
  bx.forEach((b, i) => {
    _q.setFromAxisAngle(_up, b.rot);
    m.setMatrixAt(i, _m.compose(_p.set(b.x, Math.max(y, b.y0 + b.h + 0.004), b.z), _q, _s.set(b.sx + 2 * pad, 1, b.sz + 2 * pad)));
  });
  m.instanceMatrix.needsUpdate = true;
  const col = new THREE.Color();
  const base = lin(rgb);
  for (let i = 0; i < items.length; i++) m.setColorAt(i, col.setRGB(0, 0, 0));
  m.renderOrder = 4;
  m.frustumCulled = false;
  return {
    mesh: m,
    set(i, v, c = null) {
      const L = c ? lin(c) : base;
      m.setColorAt(i, col.setRGB(L[0] * v, L[1] * v, L[2] * v));
      m.instanceColor.needsUpdate = true;
    },
  };
}

// heaters: thin metal strips that glow orange when on.  Returns { group, set(i, v) } with v in 0..1.
export function heaters(items, { w = 0.07 } = {}) {
  const its = items.map(it => ({ w, h: 0.02, y0: RIDGE.h + 0.004, ...it }));
  const group = new THREE.Group();
  group.add(boxes(its, heaterMat()));
  const gl = glows(its, { pad: 0.16, y: RIDGE.h + 0.03, rgb: [1, 0.5, 0.12] });
  group.add(gl.mesh);
  return { group, set: (i, v) => gl.set(i, 1.1 * v) };
}

// electrodes: gold strips that glow when driven.  Returns { group, set(i, v, rgb) }.
export function electrodes(items, { w = 0.3, rgb = [1, 0.85, 0.35] } = {}) {
  const its = items.map(it => ({ w, h: 0.03, y0: 0, ...it }));
  const group = new THREE.Group();
  group.add(boxes(its, goldMat()));
  const gl = glows(its, { pad: 0.08, y: 0.04, rgb });
  group.add(gl.mesh);
  return { group, set: (i, v, c) => gl.set(i, v, c) };
}

// square bond pads at points [[x, z], ...]
export function pads(points, size = 0.32, y0 = 0) {
  return boxes(points.map(([x, z]) => ({ x, z, sx: size, sz: size, h: 0.025, y0 })), goldMat());
}

// wire bonds: thin gold arcs from [x, y, z] to [x, y, z]
export function bonds(pairs, { r = 0.012, rise = 0.45 } = {}) {
  const geos = pairs.map(([a, b]) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const M = A.clone().lerp(B, 0.35); M.y = Math.max(A.y, B.y) + rise;
    const curve = new THREE.QuadraticBezierCurve3(A, M, B);
    return new THREE.TubeGeometry(curve, 16, r, 5, false);
  });
  const m = new THREE.Mesh(mergeGeos(geos.map(g => { g.deleteAttribute('uv'); return g; })), goldMat());
  return m;
}

// photodetectors: dark squares with a gold rim; returns { group, set(i, v, rgb) }
export function detectors(points, { size = 0.42 } = {}) {
  const group = new THREE.Group();
  group.add(boxes(points.map(([x, z]) => ({ x, z, sx: size + 0.08, sz: size + 0.08, h: 0.02 })), goldMat()));
  group.add(boxes(points.map(([x, z]) => ({ x, z, sx: size, sz: size, h: 0.05 })), darkMat()));
  const gl = glows(points.map(([x, z]) => ({ x, z, sx: size, sz: size, h: 0.05 })), { pad: 0.14, y: 0.06, rgb: [1, 1, 1] });
  group.add(gl.mesh);
  return { group, set: (i, v, c) => gl.set(i, v, c) };
}

// ------------------------------------------------------------------------------------------- poled stripes
// Periodically poled lithium niobate: domains flipped in stripes across the waveguide.
// Straight: from x0 to x1 around z, width wide, one stripe per period (duty = flipped fraction).
// env(u) (u = 0..1 along the stripes) may fade or thin the stripes (a quantum source, a chirp).
export function poling({ x0, x1, z = 0, width = 0.8, period = 0.18, duty = 0.5, env = null, color = 0x5a4c74 }) {
  const items = [];
  const n = Math.floor((x1 - x0) / period);
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n;
    const e = env ? env(u) : 1;
    if (e <= 0.02) continue;
    const xs = x0 + (k + 0.25) * period;
    items.push({ x: xs + duty * period / 2, z, sx: duty * period, sz: width * Math.max(0.25, e), h: RIDGE.h + 0.006, y0: 0.0005 });
  }
  const m = boxes(items, std(color, { roughness: 0.5, metalness: 0.05 }));
  m.renderOrder = 1;
  return m;
}

// Radial stripes for a poled ring of radius r (width across the ring), n stripes all around
export function radialPoling({ cx = 0, cz = 0, r, width = 0.7, n = 48, duty = 0.5, color = 0x5a4c74 }) {
  const items = [];
  const arcLen = 2 * Math.PI * r / n;
  for (let k = 0; k < n; k++) {
    const a = 2 * Math.PI * (k + 0.5) / n;
    items.push({ x: cx + r * Math.cos(a), z: cz + r * Math.sin(a), sx: width, sz: duty * arcLen, h: RIDGE.h + 0.006, y0: 0.0005, rot: -a });
  }
  return boxes(items, std(color, { roughness: 0.5, metalness: 0.05 }));
}

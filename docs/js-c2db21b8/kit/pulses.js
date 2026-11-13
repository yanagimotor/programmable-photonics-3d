// Pulses: light drawn as trains of short glowing pulses running along paths (tab 3; visitors think
// of light not as red lines but as trains of white pulses - yellow-white, with a bit of rainbow at their edges).
// All the trains of one chip in ONE mesh, like LightNet.
//
//   const tr = kit.pulses({ width: 0.16, spacing: 0.6, length: 0.13, speed: 2.6 })
//   const k = tr.add(path, { s0: 0 })     // s0: distance from where the light starts, so that a train continues from
//                                         // one segment into the next
//   tr.build()                            // after all add() calls (the kit adds the mesh)
//   tr.white(k, power, { data: 0.65, rainbow: 1, seed: 0 })   // yellow-white pulses; data: how much the pulses'
//                                         // heights vary (a stream of numbers), rainbow: the colour at the pulses'
//                                         // edges, seed (0..255): which numbers - give the segments of one train the
//                                         // same seed (and s0 offsets that continue), and different trains different
//                                         // seeds and offsets, so that trains side by side do not line up
//   tr.colours(k, [p0, p1, p2, p3])       // four colours of light in one path (the colour router): pulse n carries
//                                         // colour n mod 4, as bright as that colour's power
//   tr.mix(k, [p0, p1, p2, p3])           // the same four colours, mixed in every pulse (a pure colour, or a whitish
//                                         // mixture)
//   tr.rgb = [[r, g, b] x 4]              // the four colours (display rgb), before build()
//   Power 1 is "normal"; above ~1.5 the pulses bloom.  A faint line (base) shows the path between the pulses.
//   kit.pulses({ over: true }): drawn over what is below instead of added (keeps its colour on a pale chip)
import * as THREE from 'three';
import { lin } from './colour.js';

const VMAX = 3;

const VS = /* glsl */ `
attribute float aU; attribute float aS; attribute float aSeg;
uniform float uRows;
varying float vU; varying float vS; varying float vRow;
void main() {
  vU = aU; vS = aS; vRow = (aSeg + 0.5) / uRows;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FS = /* glsl */ `
uniform sampler2D uTex;
uniform float uTime, uSpeed, uSpacing, uLen, uGain, uDim, uBase;
uniform vec3 uCol0, uCol1, uCol2, uCol3;
varying float vU; varying float vS; varying float vRow;
float hash(float n, float seed) { return fract(sin(n * 12.9898 + seed * 78.233) * 43758.5453); }
void main() {
  vec4 a = texture2D(uTex, vec2(0.25, vRow)) * ${VMAX.toFixed(1)};      // mode, power, data, rainbow
  vec4 b = texture2D(uTex, vec2(0.75, vRow)) * ${VMAX.toFixed(1)};      // the four colours' powers
  float x = (vS - uTime * uSpeed) / uSpacing;
  float n = floor(x);
  float d = (x - n - 0.5) * uSpacing;                  // along the path, from the pulse's centre (+: ahead)
  float env = exp(-d * d / (uLen * uLen));
  float across = exp(-vU * vU * 3.2);
  vec3 col; float line;
  if (a.r < 0.75) {
    // yellow-white pulses: a warm white core, the edges tinted through the rainbow (blue ahead, red behind)
    float h = mix(1.0, 0.3 + 0.7 * hash(n, b.r * 85.0), clamp(a.b, 0.0, 1.0));
    float u = clamp(d / uLen, -1.8, 1.8);
    vec3 bow = 0.55 + 0.45 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) - 0.22 * u + 0.62));
    vec3 core = vec3(1.0, 0.88, 0.62);
    col = mix(core, bow, clamp(a.a, 0.0, 1.0) * smoothstep(0.35, 1.3, abs(u))) * a.g * h;
    line = a.g;
  } else if (a.r > 2.25) {
    // the four colours mixed in every pulse
    col = (uCol0 * b.r + uCol1 * b.g + uCol2 * b.b + uCol3 * b.a) * 1.3;
    line = (b.r + b.g + b.b + b.a) * 0.25;
  } else {
    // four colours sharing the path: pulse n carries colour n mod 4
    float c = mod(n, 4.0);
    float p = c < 0.5 ? b.r : c < 1.5 ? b.g : c < 2.5 ? b.b : b.a;
    col = (c < 0.5 ? uCol0 : c < 1.5 ? uCol1 : c < 2.5 ? uCol2 : uCol3) * p * 1.3;
    line = (b.r + b.g + b.b + b.a) * 0.25;
  }
  vec3 o = (col * env * across * uGain + vec3(1.0, 0.92, 0.8) * line * uBase * exp(-vU * vU * 9.0)) * uDim;
#ifdef OVER
  float m = max(max(o.r, o.g), o.b), al = clamp(m * 1.6, 0.0, 1.0);
  gl_FragColor = vec4(o / max(al, 0.04), al);
#else
  gl_FragColor = vec4(o, 1.0);
#endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const enc = v => Math.round(255 * Math.min(1, Math.max(0, v / VMAX)));

export class PulseNet {
  constructor({ width = 0.16, y = 0.03, spacing = 0.6, length = 0.13, speed = 2.6, gain = 2.2, base = 0.05, over = false } = {}) {
    Object.assign(this, { width, y, spacing, length, speed, gain, base, over });
    this.segs = [];
    this.mesh = null;
    this.dirty = false;
    this.rgb = [[0.62, 0.36, 1.0], [0.2, 0.82, 1.0], [1.0, 0.74, 0.12], [1.0, 0.26, 0.2]];
  }
  add(path, { s0 = 0, width = null } = {}) {
    if (this.mesh) throw new Error('PulseNet.add after build()');
    this.segs.push({ path, s0, width: width ?? this.width });
    return this.segs.length - 1;
  }
  build() {
    const rows = this.rows = Math.max(1, this.segs.length);
    this.data = new Uint8Array(2 * rows * 4);
    this.tex = new THREE.DataTexture(this.data, 2, rows, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter;
    this.tex.needsUpdate = true;
    const pos = [], aU = [], aS = [], aSeg = [], idx = [];
    this.segs.forEach((sg, k) => {
      const p = sg.path, P = p.pts, n = P.length, hw = sg.width / 2, base = pos.length / 3;
      for (let i = 0; i < n; i++) {
        const q = P[i], a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
        const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
        const nx = -dz / L, nz = dx / L;
        for (const u of [-1, 1]) { pos.push(q[0] + nx * hw * u, this.y, q[1] + nz * hw * u); aU.push(u); aS.push(sg.s0 + p.s[i]); aSeg.push(k); }
      }
      for (let i = 0; i + 1 < n; i++) { const a = base + 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
    g.setAttribute('aSeg', new THREE.Float32BufferAttribute(aSeg, 1));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    const col = c => new THREE.Vector3(...lin(c));
    this.uniforms = {
      uTex: { value: this.tex }, uRows: { value: rows }, uTime: { value: 0 }, uSpeed: { value: this.speed },
      uSpacing: { value: this.spacing }, uLen: { value: this.length }, uGain: { value: this.gain }, uDim: { value: 1 }, uBase: { value: this.base },
      uCol0: { value: col(this.rgb[0]) }, uCol1: { value: col(this.rgb[1]) }, uCol2: { value: col(this.rgb[2]) }, uCol3: { value: col(this.rgb[3]) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VS, fragmentShader: FS, defines: this.over ? { OVER: 1 } : {}, transparent: true, blending: this.over ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.renderOrder = 7;
    this.mesh.frustumCulled = false;
    this.mesh.userData.role = 'light';
    return this.mesh;
  }
  _o(k) { if (k < 0 || k >= this.rows) throw new Error('PulseNet: no segment ' + k); return k * 8; }
  white(k, power = 1, { data = 0.65, rainbow = 1, seed = k } = {}) {
    if (!Number.isFinite(power)) { this.bad = (this.bad || 0) + 1; return; }
    const o = this._o(k), d = this.data;
    d[o] = 0; d[o + 1] = enc(power); d[o + 2] = enc(data); d[o + 3] = enc(rainbow); d[o + 4] = Math.round(seed) & 255;
    this.dirty = true;
  }
  colours(k, ps) {
    if (!ps.every(Number.isFinite)) { this.bad = (this.bad || 0) + 1; return; }
    const o = this._o(k), d = this.data;
    d[o] = 128; d[o + 1] = 0;
    for (let i = 0; i < 4; i++) d[o + 4 + i] = enc(ps[i] || 0);
    this.dirty = true;
  }
  mix(k, ps) {
    if (!ps.every(Number.isFinite)) { this.bad = (this.bad || 0) + 1; return; }
    const o = this._o(k), d = this.data;
    d[o] = 255; d[o + 1] = 0;
    for (let i = 0; i < 4; i++) d[o + 4 + i] = enc(ps[i] || 0);
    this.dirty = true;
  }
  tick(t, dim = 1) {
    if (!this.mesh) return;
    this.uniforms.uTime.value = t;
    this.uniforms.uDim.value = dim;
    if (this.dirty) { this.tex.needsUpdate = true; this.dirty = false; }
  }
}

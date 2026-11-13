// Light in the air along 3-D paths (tab 3's optical computation): trains of yellow-white pulses - the look and the
// fragment shader of kit/pulses.js - on ribbons that turn to face the camera in the vertex shader.  All the rays of
// one set are one mesh; the scene keeps a set per picture (the glasses' light, the light of each digit).
//
//   const rays = new Rays(THREE, { width = 0.08, spacing = 0.6, length = 0.13, speed = 2.4, gain = 2.2, base = 0.07,
//                                  samples = 24 })
//   const k = rays.add(legs, { to = null, power = 1, seed = k })
//                     legs: [[[x, y, z], ...], ...] in the parent's frame - each leg a centripetal Catmull-Rom through
//                     its points, sampled evenly by arc length (`samples` points a leg); the legs join into one ray.
//                     to: a second shape with the same number of legs (rays.mix 0 -> 1 bends the ray into it; with
//                     legs sampled alike, a bend at a joint stays at that joint).  seed: where the ray's pulses sit
//   rays.build()      -> the mesh (additive, depthWrite false, renderOrder 7, never culled); add it to a group
//   rays.power(k, p)  one ray's brightness (1: normal; above ~1.5 it blooms); written into a texel, uploaded once per
//                     frame when something changed
//   rays.mix, rays.front, rays.level   0..1: shape -> second shape; how far the light has got along every ray (as a
//                     fraction of the ray); the overall fade.  rays.mesh.visible is kept off while level is 0
//   rays.tail         0..1: how much dimmer each ray's last stretch is (the spot it lands on shows the rest)
//   rays.head         0..1: how much dimmer each ray's first stretch is (the picture it leaves stays readable)
//   rays.tick(t, dim) every frame (from kit.onTick): time (x 0.25 with reduced motion), the kit's dim
import { lin } from '../kit/colour.js';

const VMAX = 3;

const VS = /* glsl */ `
attribute vec3 aTo, aDir, aDirTo;
attribute float aS, aSTo, aF, aU, aRay;
uniform float uMix, uWidth, uRows;
varying float vU, vS, vF, vRow;
void main() {
  vec3 p = mix(position, aTo, uMix);
  vec3 d = mix(aDir, aDirTo, uMix);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 dv = (modelViewMatrix * vec4(d, 0.0)).xyz;
  // across the ray and across the line of sight: the ribbon shows its face to the camera
  vec3 side = cross(dv, mv.xyz);
  float L = length(side);
  side = L > 1e-6 ? side / L : vec3(0.0, 1.0, 0.0);
  mv.xyz += side * aU * uWidth * 0.5;
  vU = aU; vS = mix(aS, aSTo, uMix); vF = aF; vRow = (aRay + 0.5) / uRows;
  gl_Position = projectionMatrix * mv;
}`;
// (kit/pulses.js's yellow-white pulses: a warm white core, the edges tinted through the rainbow, blue ahead and red
// behind; a faint line shows the path between the pulses; nothing beyond the light's front)
const FS = /* glsl */ `
uniform sampler2D uTex;
uniform float uTime, uSpeed, uSpacing, uLen, uGain, uBase, uDim, uFront, uLevel, uTail, uHead;
uniform vec3 uCore;
varying float vU, vS, vF, vRow;
void main() {
  vec4 a = texture2D(uTex, vec2(0.5, vRow));
  float power = a.r * ${VMAX.toFixed(1)};
  float x = (vS + a.g * uSpacing - uTime * uSpeed) / uSpacing;
  float n = floor(x);
  float d = (x - n - 0.5) * uSpacing;
  float env = exp(-d * d / (uLen * uLen));
  float across = exp(-vU * vU * 3.2);
  float u = clamp(d / uLen, -1.8, 1.8);
  vec3 bow = 0.55 + 0.45 * cos(6.2831853 * (vec3(0.0, 0.33, 0.67) - 0.22 * u + 0.62));
  vec3 col = mix(uCore, bow, smoothstep(0.35, 1.3, abs(u))) * power;
  float shown = (1.0 - smoothstep(uFront - 0.025, uFront, vF)) * (1.0 - uTail * smoothstep(0.68, 0.97, vF)) * (1.0 - uHead * (1.0 - smoothstep(0.0, 0.14, vF)));
  vec3 o = (col * env * across * uGain + vec3(1.0, 0.92, 0.8) * power * uBase * exp(-vU * vU * 9.0)) * shown * uLevel * uDim;
  gl_FragColor = vec4(o, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const enc = v => Math.round(255 * Math.min(1, Math.max(0, v / VMAX)));

export class Rays {
  constructor(THREE, { width = 0.08, spacing = 0.6, length = 0.13, speed = 2.4, gain = 2.2, base = 0.07, samples = 24 } = {}) {
    Object.assign(this, { THREE, width, spacing, length, speed, gain, base, samples });
    this.rays = [];
    this.mesh = null;
    this.dirty = false;
    this.reduced = false;
  }
  // a shape's points along its legs, evenly by arc length within each leg (the joints shared)
  sample(legs) {
    const { THREE } = this, pts = [];
    legs.forEach((leg, i) => {
      const c = new THREE.CatmullRomCurve3(leg.map(p => new THREE.Vector3(...p)), false, 'centripetal');
      const q = c.getSpacedPoints(this.samples - 1);
      pts.push(...(i ? q.slice(1) : q));
    });
    return pts;
  }
  add(legs, { to = null, power = 1, seed = this.rays.length } = {}) {
    if (this.mesh) throw new Error('Rays.add after build()');
    const a = this.sample(legs), b = to ? this.sample(to) : a;
    if (a.length !== b.length) throw new Error('Rays.add: the second shape must have the same legs');
    this.rays.push({ a, b, power, seed });
    return this.rays.length - 1;
  }
  build() {
    const { THREE } = this, R = this.rays, rows = Math.max(1, R.length);
    this.data = new Uint8Array(rows * 4);
    R.forEach((r, k) => { this.data[4 * k] = enc(r.power); this.data[4 * k + 1] = Math.round(255 * ((r.seed * 0.618034) % 1)); });
    this.tex = new THREE.DataTexture(this.data, 1, rows, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter;
    this.tex.needsUpdate = true;
    const pos = [], to = [], dir = [], dirTo = [], s = [], sTo = [], f = [], uu = [], ray = [], idx = [];
    const tangent = (P, i, out) => {
      const p = P[Math.max(0, i - 1)], q = P[Math.min(P.length - 1, i + 1)];
      out[0] = q.x - p.x; out[1] = q.y - p.y; out[2] = q.z - p.z;
      const L = Math.hypot(out[0], out[1], out[2]) || 1;
      out[0] /= L; out[1] /= L; out[2] /= L;
      return out;
    };
    const ta = [0, 0, 0], tb = [0, 0, 0];
    R.forEach((r, k) => {
      const n = r.a.length, base = pos.length / 3;
      let la = 0, lb = 0;
      for (let i = 0; i < n; i++) {
        if (i) { la += r.a[i].distanceTo(r.a[i - 1]); lb += r.b[i].distanceTo(r.b[i - 1]); }
        tangent(r.a, i, ta); tangent(r.b, i, tb);
        for (const u of [-1, 1]) {
          pos.push(r.a[i].x, r.a[i].y, r.a[i].z); to.push(r.b[i].x, r.b[i].y, r.b[i].z);
          dir.push(...ta); dirTo.push(...tb);
          s.push(la); sTo.push(lb); f.push(i / (n - 1)); uu.push(u); ray.push(k);
        }
      }
      for (let i = 0; i + 1 < n; i++) { const q = base + 2 * i; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    });
    const g = new THREE.BufferGeometry();
    const F = (arr, n) => new THREE.Float32BufferAttribute(arr, n);
    g.setAttribute('position', F(pos, 3)); g.setAttribute('aTo', F(to, 3));
    g.setAttribute('aDir', F(dir, 3)); g.setAttribute('aDirTo', F(dirTo, 3));
    g.setAttribute('aS', F(s, 1)); g.setAttribute('aSTo', F(sTo, 1)); g.setAttribute('aF', F(f, 1));
    g.setAttribute('aU', F(uu, 1)); g.setAttribute('aRay', F(ray, 1));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    this.uniforms = {
      uTex: { value: this.tex }, uRows: { value: rows }, uMix: { value: 0 }, uWidth: { value: this.width },
      uTime: { value: 0 }, uSpeed: { value: this.speed }, uSpacing: { value: this.spacing }, uLen: { value: this.length },
      uGain: { value: this.gain }, uBase: { value: this.base }, uDim: { value: 1 }, uFront: { value: 1.1 }, uLevel: { value: 1 }, uTail: { value: 0 }, uHead: { value: 0 },
      uCore: { value: new THREE.Vector3(...lin([1, 0.96, 0.86])) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VS, fragmentShader: FS, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.renderOrder = 7;
    this.mesh.frustumCulled = false;
    this.mesh.userData.role = 'light';
    return this.mesh;
  }
  power(k, p) {
    if (!this.data || k < 0 || k >= this.rays.length || !Number.isFinite(p)) return;
    const v = enc(p);
    if (this.data[4 * k] !== v) { this.data[4 * k] = v; this.dirty = true; }
  }
  get mix() { return this.uniforms.uMix.value; }
  set mix(v) { this.uniforms.uMix.value = v; }
  get front() { return this.uniforms.uFront.value; }
  // (a front of 1 still leaves the last few hundredths dark: a little beyond, so that the light reaches the end)
  set front(v) { this.uniforms.uFront.value = v >= 1 ? 1.1 : v; }
  get tail() { return this.uniforms.uTail.value; }
  set tail(v) { this.uniforms.uTail.value = v; }
  get head() { return this.uniforms.uHead.value; }
  set head(v) { this.uniforms.uHead.value = v; }
  get level() { return this.uniforms.uLevel.value; }
  set level(v) { this.uniforms.uLevel.value = v; if (this.mesh) this.mesh.visible = v > 0.002; }
  tick(t, dim = 1) {
    if (!this.mesh) return;
    this.uniforms.uTime.value = this.reduced ? t * 0.25 : t;
    this.uniforms.uDim.value = dim;
    if (this.dirty) { this.tex.needsUpdate = true; this.dirty = false; }
  }
}

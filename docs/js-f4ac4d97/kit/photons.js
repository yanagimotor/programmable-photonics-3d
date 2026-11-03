// Photons: small glowing dots that travel along a line or any curve - single photons, photon pairs, pulses of a
// pulse train, the colours inside a beam.  One THREE.Points object per pool, positions updated on the CPU.
//
//   const ph = kit.photons({ max: 300, size: 0.16 });     // size in scene units (perspective-scaled)
//   ph.emit({ from: [x, y, z], to: [x, y, z], dur: 1.2, rgb, size, delay = 0, fade = 0.15, onEnd })
//   ph.emit({ along: u => [x, y, z], dur, rgb })          // any curve, u = 0..1
//   ph.count()                                           // photons in flight
//   kit.photons({ over: true }): drawn over what is below instead of added (keeps its colour on a pale chip)
//   The kit advances the pool every frame; emit() just adds photons (the oldest is reused when the pool is full).
import * as THREE from 'three';
import { lin } from './colour.js';

const VS = /* glsl */ `
attribute vec3 aColor; attribute float aSize;
uniform float uScale;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.001, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS = /* glsl */ `
uniform float uDim;
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  float a = (exp(-r2 * 3.2) + 0.6 * exp(-r2 * 18.0)) * (1.0 - smoothstep(0.5, 1.0, r2));
  if (a < 0.01) discard;
#ifdef OVER
  gl_FragColor = vec4(vColor * uDim, clamp(a * 1.3, 0.0, 1.0) * clamp(max(max(vColor.r, vColor.g), vColor.b) * 2.0, 0.0, 1.0));
#else
  gl_FragColor = vec4(vColor * a * uDim, 1.0);
#endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Photons {
  constructor({ max = 300, size = 0.16, over = false } = {}) {
    this.max = max; this.size = size;
    this.items = [];
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.siz = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.uniforms = { uScale: { value: 600 }, uDim: { value: 1 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VS, fragmentShader: FS,
      transparent: true, blending: over ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, defines: over ? { OVER: 1 } : {},
    });
    this.object = new THREE.Points(g, mat);
    this.object.frustumCulled = false;
    this.object.renderOrder = 8;
  }
  emit({ from = null, to = null, along = null, dur = 1, rgb = [1, 0.1, 0.05], power = 1, size = null, delay = 0, fade = 0.15, onEnd = null }) {
    if (this.items.length >= this.max) this.items.shift();
    const L = lin(rgb);
    const it = { from, to, along, dur: Math.max(0.05, dur), t: -delay, c: [L[0] * power * 2, L[1] * power * 2, L[2] * power * 2], size: size ?? this.size, fade, onEnd };
    this.items.push(it);
    return it;
  }
  count() { return this.items.length; }
  clear() { this.items.length = 0; }
  tick(dt, dim = 1, scale = 600) {
    this.uniforms.uScale.value = scale;
    this.uniforms.uDim.value = dim;
    const keep = [];
    let n = 0;
    for (const it of this.items) {
      it.t += dt;
      if (it.t >= it.dur) { if (it.onEnd) it.onEnd(it); continue; }
      keep.push(it);
      if (it.t < 0) continue;
      const u = it.t / it.dur;
      let x, y, z;
      if (it.along) [x, y, z] = it.along(u);
      else { x = it.from[0] + (it.to[0] - it.from[0]) * u; y = it.from[1] + (it.to[1] - it.from[1]) * u; z = it.from[2] + (it.to[2] - it.from[2]) * u; }
      const f = Math.min(1, u / it.fade, (1 - u) / it.fade);
      this.pos[3 * n] = x; this.pos[3 * n + 1] = y; this.pos[3 * n + 2] = z;
      this.col[3 * n] = it.c[0] * f; this.col[3 * n + 1] = it.c[1] * f; this.col[3 * n + 2] = it.c[2] * f;
      this.siz[n] = it.size;
      n++;
    }
    this.items = keep;
    const g = this.object.geometry;
    g.setDrawRange(0, n);
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
  }
}

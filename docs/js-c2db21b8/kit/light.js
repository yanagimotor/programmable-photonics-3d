// Light: glowing light inside the waveguides (LightNet) and beams of light in the air (Beam).
//
// LightNet - all the light inside one chip, in ONE mesh and one draw call.
//   const net = kit.lightNet({ width: 0.34 });          // width of the glow band (the ridge is 0.13 wide)
//   const a = net.add(path, { s0: 0 });                  // a segment; s0 = distance of its start from the chip's
//                                                        // light input, so that the flowing dashes are continuous
//   net.build();                                         // after all add() calls (the kit adds the mesh for you)
//   net.set(a, rgb, power)                               // uniform colour (display rgb 0..1) x power (0..~3)
//   net.setFn(a, t => [r, g, b])                         // profile along the segment, t = 0..1 (already x power)
//   net.dash(a, amount)                                  // 0 = steady light, 1 = flowing dashes (default 1)
//   Segments are drawn as soft bands slightly above the ridge; the dashes flow along +s at net.flow units/s.
//   Changes are uploaded once per frame by the kit.  Power 1 is "normal" brightness; 2-3 blooms strongly.
//   The light is drawn OVER what is below it (opaque at a bright core, adding at the faint edges), so it keeps
//   its colour on pale ridges and light chips; lightNet({ over: false }) adds instead.
//   Note: setFn's colours go through the same display-to-linear conversion as set()'s colour, but applied to
//   colour x power, so its brightness grows faster than linearly with power (set() is linear in power).
//
// Beam - a beam of light in the air (into a facet, out of a facet, or up from the chip).
//   const b = kit.beam({ from: [x, y, z], to: [x, y, z], rgb, power: 1, r0: 0.09, r1: 0.09, fade: 'in'|'out'|'both'|'none' })
//   b.set(rgb, power)  b.setEnds(from, to)  b.object (THREE.Mesh)
import * as THREE from 'three';
import { lin } from './colour.js';
import { RIDGE } from './build.js';

const SAMPLES = 128;          // texels along every segment
const VMAX = 3;               // power stored in the texture is clamped to 0..VMAX

const NET_VS = /* glsl */ `
attribute float aT; attribute float aU; attribute float aS; attribute float aSeg;
uniform float uRows;
varying float vT; varying float vU; varying float vS; varying float vRow;
void main() {
  vT = aT; vU = aU; vS = aS; vRow = (aSeg + 0.5) / uRows;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const NET_FS = /* glsl */ `
uniform sampler2D uTex;
uniform float uTime, uFlow, uDash, uGain, uDim;
varying float vT; varying float vU; varying float vS; varying float vRow;
void main() {
  vec4 c = texture2D(uTex, vec2(vT, vRow));
  float ph = fract((vS - uTime * uFlow) / uDash);
  // light as a train of short pulses (visitors picture light as trains of pulses; tab 3's look),
  // each with a whiter core; the colour stays at its rim, so it keeps its meaning
  float pk = exp(-pow((ph - 0.5) / 0.16, 2.0));
  float pulse = mix(1.0, 0.16 + 1.3 * pk, c.a);
  float across = exp(-vU * vU * 5.0);                       // soft band: bright core, fading sides
  vec3 col = c.rgb * ${VMAX.toFixed(1)} * uGain * uDim * pulse * across;
  col = mix(col, vec3(max(max(col.r, col.g), col.b)), 0.3 * pk * c.a * exp(-vU * vU * 14.0));
#ifdef OVER
  // drawn over what is below (the green circuit of the programmable chip) instead of adding to it, so that the
  // light keeps its own colour; faint edges still add
  float m = max(max(col.r, col.g), col.b);
  float a = clamp(m * 1.6, 0.0, 1.0);
  gl_FragColor = vec4(col / max(a, 0.04), a);
#else
  gl_FragColor = vec4(col, 1.0);
#endif
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class LightNet {
  constructor({ width = 0.34, y = RIDGE.h + 0.012, flow = 1.6, dashLen = 0.9, gain = 1.6, over = true } = {}) {
    this.width = width; this.y = y; this.over = over;
    this.segs = [];
    this.flow = flow; this.dashLen = dashLen; this.gain = gain;
    this.mesh = null;
    this.dirty = false;
  }
  add(path, { s0 = 0, width = null } = {}) {
    if (this.mesh) throw new Error('LightNet.add after build()');
    this.segs.push({ path, s0, width: width ?? this.width });
    return this.segs.length - 1;
  }
  build() {
    const rows = this.rows = Math.max(1, this.segs.length);
    this.data = new Uint8Array(SAMPLES * rows * 4);
    for (let i = 3; i < this.data.length; i += 4) this.data[i] = 255;   // dashes on by default
    this.tex = new THREE.DataTexture(this.data, SAMPLES, rows, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.tex.magFilter = THREE.LinearFilter; this.tex.minFilter = THREE.LinearFilter;
    this.tex.wrapS = this.tex.wrapT = THREE.ClampToEdgeWrapping;
    this.tex.needsUpdate = true;
    const pos = [], aT = [], aU = [], aS = [], aSeg = [], idx = [];
    this.segs.forEach((sg, k) => {
      const p = sg.path, P = p.pts, n = P.length, hw = sg.width / 2;
      const base = pos.length / 3;
      const count = p.closed ? n + 1 : n;
      for (let i = 0; i < count; i++) {
        const q = P[i % n];
        const a = P[p.closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[p.closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
        const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
        const nx = -dz / L, nz = dx / L;
        const s = p.s[i];
        for (const u of [-1, 1]) {
          pos.push(q[0] + nx * hw * u, this.y, q[1] + nz * hw * u);
          aT.push(p.len > 0 ? s / p.len : 0); aU.push(u); aS.push(sg.s0 + s); aSeg.push(k);
        }
      }
      for (let i = 0; i + 1 < count; i++) {
        const a = base + 2 * i;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
    g.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
    g.setAttribute('aSeg', new THREE.Float32BufferAttribute(aSeg, 1));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    this.uniforms = {
      uTex: { value: this.tex }, uRows: { value: rows }, uTime: { value: 0 },
      uFlow: { value: this.flow }, uDash: { value: this.dashLen }, uGain: { value: this.gain }, uDim: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: NET_VS, fragmentShader: NET_FS, defines: this.over ? { OVER: 1 } : {},
      transparent: true, blending: this.over ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.renderOrder = 6;
    this.mesh.frustumCulled = false;
    return this.mesh;
  }
  _row(k) { if (k < 0 || k >= this.rows) throw new Error('LightNet: no segment ' + k); return k * SAMPLES * 4; }
  set(k, rgb, power = 1) {
    if (!(Number.isFinite(power) && Number.isFinite(rgb[0] + rgb[1] + rgb[2]))) { this.bad = (this.bad || 0) + 1; return; }
    const L = lin(rgb), o = this._row(k), d = this.data;
    const r = enc(L[0] * power), g = enc(L[1] * power), b = enc(L[2] * power);
    for (let i = 0; i < SAMPLES; i++) { const j = o + 4 * i; d[j] = r; d[j + 1] = g; d[j + 2] = b; }
    this.dirty = true;
  }
  setFn(k, f) {
    const o = this._row(k), d = this.data;
    for (let i = 0; i < SAMPLES; i++) {
      const v = f(i / (SAMPLES - 1));
      if (!Number.isFinite(v[0] + v[1] + v[2])) { this.bad = (this.bad || 0) + 1; continue; }
      const c = lin(v);
      const j = o + 4 * i;
      d[j] = enc(c[0]); d[j + 1] = enc(c[1]); d[j + 2] = enc(c[2]);
    }
    this.dirty = true;
  }
  dash(k, amount = 1) {
    const o = this._row(k), d = this.data, a = Math.round(255 * Math.min(1, Math.max(0, amount)));
    for (let i = 0; i < SAMPLES; i++) d[o + 4 * i + 3] = a;
    this.dirty = true;
  }
  // called by the kit once per frame
  tick(t, dim = 1) {
    if (!this.mesh) return;
    this.uniforms.uTime.value = t;
    this.uniforms.uDim.value = dim;
    if (this.dirty) { this.tex.needsUpdate = true; this.dirty = false; }
  }
}
const enc = v => Math.round(255 * Math.min(1, Math.max(0, v / VMAX)));

// ------------------------------------------------------------------------------------------- beams in the air
const BEAM_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FS = /* glsl */ `
uniform vec3 uColor; uniform float uTime, uFlow, uDash, uLen, uFadeIn, uFadeOut, uDashAmt, uDim;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  float a = vUv.y;                                            // 0 at 'from', 1 at 'to'
  float f = mix(1.0, smoothstep(0.0, 0.6, a), uFadeIn) * mix(1.0, 1.0 - smoothstep(0.35, 1.0, a), uFadeOut);
  float ph = fract((a * uLen - uTime * uFlow) / uDash);
  float pulse = mix(1.0, 0.4 + 0.6 * pow(0.5 + 0.5 * cos(6.2831853 * ph), 1.5), uDashAmt);
  float core = pow(abs(dot(vN, vV)), 1.6);                    // bright along the axis, soft at the rim
  gl_FragColor = vec4(uColor * f * pulse * core * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class Beam {
  constructor({ from, to, rgb = [1, 0.1, 0.05], power = 1, r0 = 0.09, r1 = null, fade = 'in', dash = 1, flow = 1.6, dashLen = 0.9 }) {
    this.r0 = r0; this.r1 = r1 ?? r0;
    this.uniforms = {
      uColor: { value: new THREE.Color() }, uTime: { value: 0 }, uFlow: { value: flow }, uDash: { value: dashLen },
      uLen: { value: 1 }, uFadeIn: { value: fade === 'in' || fade === 'both' ? 1 : 0 },
      uFadeOut: { value: fade === 'out' || fade === 'both' ? 1 : 0 }, uDashAmt: { value: dash }, uDim: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: BEAM_VS, fragmentShader: BEAM_FS,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide,
    });
    this.object = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    this.object.renderOrder = 7;
    this.object.frustumCulled = false;
    this.setEnds(from, to);
    this.set(rgb, power);
  }
  setEnds(from, to) {
    const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
    const dir = B.clone().sub(A), len = dir.length();
    this.object.geometry.dispose();
    const g = new THREE.CylinderGeometry(this.r1, this.r0, len, 18, 1, true);
    // CylinderGeometry: uv.y = 1 at the top (+y, = 'to' after the rotation below) - keep that
    this.object.geometry = g;
    this.object.position.copy(A).addScaledVector(dir, 0.5);
    this.object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.uniforms.uLen.value = len;
  }
  set(rgb, power = 1) {
    const L = lin(rgb);
    this.uniforms.uColor.value.setRGB(L[0] * power * 1.6, L[1] * power * 1.6, L[2] * power * 1.6);
    this.object.visible = power > 0.002;
  }
  tick(t, dim = 1) { this.uniforms.uTime.value = t; this.uniforms.uDim.value = dim; }
}

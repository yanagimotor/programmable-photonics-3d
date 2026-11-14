// The slab of the light-programmable chip as the 2D Waveguide Studio simulates it (used by router.js and awg.js):
// an index map found by inverse design, and the light of up to four inputs computed through it by beam propagation.
// Nothing here is drawn by hand: the pattern and the light are the studio's recorded results (programs/data/<id>.js
// and .png, written by the studio's tools/export_ryo_programs.py); this module only shows them.
//
//   const sl = simSlab(kit, data, { colours, warm, gamma })
//                            data: a module of programs/data (DEVICE, COLS, SHEET); colours: four display rgbs, one
//                            per input; warm: the colour of several inputs together
//   sl.setPattern(map, { fade })    a pattern map (DEVICE.nz rows of COLS bytes, the index change / its maximum):
//                            the green light (showPattern of it) cross-fades to it
//   sl.setLight(maps, { fade })     the light of each input (DEVICE.nzl rows of COLS bytes: sqrt of the intensity,
//                            normalised per row): cross-fades to it
//   sl.on                    how much of each input's light is shown (four numbers 0..1; eased towards)
//   sl.update(dt)            every frame
//   sl.zOf(x)                chip-local z of a point across the slab (x in um, as the studio's)
//   sl.X0, sl.X1, sl.W       the input and output facets (chip-local x) and the slab's width drawn
//
// Geometry: the device (input waveguides, designed region, output waveguides) runs from X0 to X1, the length of the
// chip; across, the inside of the simulation's absorbing edges (510 um) is drawn SX = 12 units per mm, stretched
// as in freeform.js.  The light's pulses run as in the beams outside (kit.beam: 1.6 units/s, 0.9 apart, counted
// from where an input beam starts 2.4 units before the chip), so they continue from the beams into the slab and
// out again (the slab is 15 pulse spacings long, beam included).
import { lin } from '../kit/colour.js';

export const SIZE = { w: 11.4, d: 7.0 };
export const BEAM = 2.4, FLOW = 1.6, DASH = 0.9;
const X0 = -5.55, X1 = 5.55, SX = 12;

const FIELD_VS = /* glsl */ `
varying vec3 vP;
void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// the light: one input per channel of the texture (sqrt of its intensity, each row normalised to its brightest point
// over all inputs); shown with a gamma so that the main paths read and the green pattern stays visible between
// them.  One input alone has its colour; where several overlap, the light turns yellow-white (as in wdm.js).
// Drawn over the pale chip (not added), so that the colours stay colours.
const FIELD_FS = /* glsl */ `
uniform sampler2D uField, uField2;
uniform vec4 uOn;
uniform vec3 uC0, uC1, uC2, uC3, uWarm;
uniform float uMix, uLevel, uDim, uTime, uNzl, uW, uX0, uLen, uGamma, uGain, uWave;
varying vec3 vP;
void main() {
  float s = (vP.x - uX0) / uLen;
  float v = 0.5 - vP.z / uW;
  float u = (clamp(s, 0.0, 1.0) * (uNzl - 1.0) + 0.5) / uNzl;
  vec4 a = mix(texture2D(uField, vec2(u, v)), texture2D(uField2, vec2(u, v)), uMix);
  vec4 I = pow(a * a, vec4(uGamma)) * uOn;
  float mx = max(max(I.r, I.g), max(I.b, I.a));
  if (mx < 0.004) discard;
  float sum = I.r + I.g + I.b + I.a;
  vec3 hue = (uC0 * I.r + uC1 * I.g + uC2 * I.b + uC3 * I.a) / sum;
  hue /= max(max(hue.r, hue.g), max(hue.b, 1e-4));
  float spread = clamp((sum - mx) / (3.0 * mx), 0.0, 1.0);
  hue = mix(hue, uWarm, smoothstep(0.12, 0.7, spread));
  float ph = fract((vP.x - uX0 + ${BEAM.toFixed(2)} - uTime * ${FLOW.toFixed(2)}) / ${DASH.toFixed(2)});
  float pulse = mix(1.0, 0.4 + 0.6 * pow(0.5 + 0.5 * cos(6.2831853 * ph), 1.5), uWave);
  vec3 col = hue * mx * pulse * uLevel * uDim * uGain;
  float m = max(max(col.r, col.g), col.b);
  float al = clamp(m * 2.4, 0.0, 1.0);
  gl_FragColor = vec4(col / max(al, 0.04), al);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const ease = k => k * k * (3 - 2 * k);
// The green light shown for an index map p (0..1): p squared.  The bench's circuit shader is made for the crisp
// masks of etched-style circuits and saturates at about half brightness, so a trained map's uniform background at
// half the index change (it only adds the same phase everywhere, as the training starts from it) would glow as
// bright as the structure that does the work; squared, it stays a faint green and the structure reads.
export const showPattern = p => p * p;
const SHOW = Uint8Array.from({ length: 256 }, (_, v) => Math.round(255 * showPattern(v / 255)));

export function simSlab(kit, data, { colours, warm = [1.0, 0.88, 0.62], gamma = 0.8, gain = 1.9, wave = 0.75 } = {}) {
  const { THREE } = kit;
  const dev = data.DEVICE, nx = data.COLS, nz = dev.nz, nzl = dev.nzl;
  const W = dev.wx / 1000 * SX;
  const zOf = x => -x / 1000 * SX;             // +x (up in the studio's pictures) is away from the visitor
  kit.chip({ w: SIZE.w, d: SIZE.d, platform: 'ln' });

  // the program: the index map over the slab (on the programmable chip it is drawn into the bench's mask: the green
  // light on the chip and in the projector's beam)
  const pData = new Uint8Array(nz * nx * 4);
  const pFrom = new Float32Array(nz * nx), pTo = new Float32Array(nz * nx);
  const putPattern = k => {
    for (let s = 0; s < nz; s++) for (let j = 0; j < nx; j++) {
      const i = s * nx + j, v = Math.round(pFrom[i] + (pTo[i] - pFrom[i]) * k), o = (j * nz + s) * 4;
      pData[o] = pData[o + 1] = pData[o + 2] = v; pData[o + 3] = 255;
    }
  };
  const pTex = new THREE.DataTexture(pData, nz, nx, THREE.RGBAFormat);
  pTex.magFilter = THREE.LinearFilter; pTex.minFilter = THREE.LinearFilter;
  const patMesh = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, W).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: pTex }));
  patMesh.position.set((X0 + X1) / 2, 0.002, 0);
  patMesh.userData.maskMap = pTex;
  kit.group.add(patMesh);

  // the light
  const texOf = d => { const t = new THREE.DataTexture(d, nzl, nx, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; return t; };
  const fData = new Uint8Array(nzl * nx * 4), fData2 = new Uint8Array(nzl * nx * 4);
  const fTex = texOf(fData), fTex2 = texOf(fData2);
  const col = c => new THREE.Vector3(...lin(c));
  const U = {
    uField: { value: fTex }, uField2: { value: fTex2 }, uMix: { value: 0 }, uOn: { value: new THREE.Vector4(1, 1, 1, 1) },
    uC0: { value: col(colours[0]) }, uC1: { value: col(colours[1]) }, uC2: { value: col(colours[2]) }, uC3: { value: col(colours[3]) },
    uWarm: { value: col(warm) }, uLevel: { value: 1 }, uDim: { value: 1 }, uTime: { value: 0 }, uNzl: { value: nzl },
    uW: { value: W }, uX0: { value: X0 }, uLen: { value: X1 - X0 }, uGamma: { value: gamma }, uGain: { value: gain }, uWave: { value: wave },
  };
  const field = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, W).rotateX(-Math.PI / 2).translate((X0 + X1) / 2, 0, 0),
    new THREE.ShaderMaterial({ uniforms: U, vertexShader: FIELD_VS, fragmentShader: FIELD_FS, transparent: true, depthWrite: false }));
  field.position.y = 0.02;
  field.renderOrder = 5;
  field.userData.role = 'light';
  kit.group.add(field);
  kit.onTick((dt, t, dim) => { U.uTime.value = kit.reduced ? 0 : t; U.uDim.value = dim; });
  const putLight = (maps, d) => {
    d.fill(0);
    maps.forEach((m, c) => { if (m) for (let s = 0; s < nzl; s++) for (let j = 0; j < nx; j++) d[(j * nzl + s) * 4 + c] = m[s * nx + j]; });
  };

  const st = { pk: -1, pfade: 0.6, mix: -1, fade: 0.6 };
  const on = [1, 1, 1, 1], shown = [1, 1, 1, 1];
  const settle = () => { if (st.mix >= 0) { fData.set(fData2); fTex.needsUpdate = true; st.mix = -1; U.uMix.value = 0; } };
  return {
    X0, X1, W, SX, zOf, on,
    setPattern(map, { fade = 0.6 } = {}) {
      if (st.pk >= 0) { const e = ease(st.pk); for (let i = 0; i < pTo.length; i++) pFrom[i] += (pTo[i] - pFrom[i]) * e; }
      else pFrom.set(pTo);
      for (let i = 0; i < pTo.length; i++) pTo[i] = SHOW[map[i]];
      if (fade <= 0 || kit.reduced) { st.pk = -1; pFrom.set(pTo); putPattern(1); pTex.needsUpdate = true; }
      else { st.pk = 0; st.pfade = fade; }
    },
    setLight(maps, { fade = 0.6 } = {}) {
      settle();
      if (fade <= 0 || kit.reduced) { putLight(maps, fData); fTex.needsUpdate = true; }
      else { putLight(maps, fData2); fTex2.needsUpdate = true; st.mix = 0; st.fade = fade; }
    },
    update(dt) {
      if (st.pk >= 0) {
        st.pk = Math.min(1, st.pk + dt / st.pfade);
        putPattern(ease(st.pk)); pTex.needsUpdate = true;
        if (st.pk >= 1) { st.pk = -1; pFrom.set(pTo); }
      }
      if (st.mix >= 0) { st.mix += dt / st.fade; U.uMix.value = ease(Math.min(1, st.mix)); if (st.mix >= 1) settle(); }
      const k = Math.min(1, dt * 5);
      for (let c = 0; c < 4; c++) shown[c] += (on[c] - shown[c]) * k;
      U.uOn.value.set(...shown);
    },
    get shown() { return shown; },
  };
}

// the colour of several lights together, as the slab's shader mixes them (weights: their powers): one alone keeps
// its colour, several together turn yellow-white
export function mixOf(colours, weights, warm = [1.0, 0.88, 0.62]) {
  let sum = 0, mx = 0;
  const c = [0, 0, 0];
  weights.forEach((w, i) => { sum += w; mx = Math.max(mx, w); for (let q = 0; q < 3; q++) c[q] += colours[i][q] * w; });
  if (sum <= 1e-9) return [1, 1, 1];
  const m = Math.max(...c);
  const spread = Math.min(1, Math.max(0, (sum - mx) / (3 * mx)));
  const t = Math.min(1, Math.max(0, (spread - 0.12) / 0.58)), e = t * t * (3 - 2 * t);
  return c.map((v, q) => v / m + (warm[q] - v / m) * e);
}

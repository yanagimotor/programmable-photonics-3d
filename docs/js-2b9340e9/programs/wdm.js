// Program "Colour router" (tab 3's in situ story, apps/insitu.js): the light-programmable
// slab with four colours of light coming in together through one input (wavelength-division multiplexing) and
// four outputs.  The pattern is not designed but learned on the chip (programs/wdmlab.js): the scenes of apps/ run
// the learning, step by step, and this program shows it - the green pattern, the light in the slab, the pulses in
// and out.
//
// What is drawn is simpler than what is computed (the physics is untouched):
//   - the light: one path from the input to each output, as much of each colour on it as the outputs measure
//     (lab.P).  Light that is not sorted yet (every colour everywhere) is one soft, yellow-white fan; sorted, it is
//     four paths, each in its own colour.  Pulses run through it, in step with the trains in and out.
//   - the pattern (the green light): lab.p smoothed along both axes, shown along the four paths, as strong as it
//     is written there - a few soft strands instead of the fine speckle of the real pattern.
//   - across the slab the drawing is a little wider than to scale, so that the four outputs stand apart.
//
//   inst.lab                     the learning (WdmLab): target, p, env, forward(), learn(), P, match
//   inst.showLight({ fade })     after lab.forward(): the light in the slab and in the outputs follows the new result
//   inst.showPattern({ fade, flash })   the green pattern follows lab.p (cross-fades; flash: a brief brightening of
//                                the projector's light, one step of the learning)
//   inst.outX, inst.portZ(q)     where the outputs leave the chip (chip-local), for the scene's detectors
import { WdmLab } from './wdmlab.js';
import { lin } from '../kit/colour.js';

const SIZE = { w: 8.8, d: 7.5 };
// the four colours (1310, 1410, 1510, 1610 nm), drawn as violet, cyan, amber and red: none of them green, the
// colour of the programming light
export const COLOURS = [[0.62, 0.36, 1.0], [0.2, 0.82, 1.0], [1.0, 0.74, 0.12], [1.0, 0.26, 0.2]];
export const WARM = [1.0, 0.88, 0.62];           // the colours together: yellow-white (a little deeper than the
                                                 // pulses' core, so that it reads on the pale chip)
// the amber as the slab draws it (only there): a little yellower than COLOURS[2].  A sorted path also carries a
// trace of its neighbours' colours (lifted, so that light spread over four outputs still shows), and with
// COLOURS[2] the amber path read orange (hue about 30, as the fire's 28) - in the in situ story it runs right under
// the fire, and orange means heat.  Measured on the path: hue about 41-45 with and without the post-processing.
const SLAB_AMBER = [1.0, 0.88, 0.12];
export const FAR = 6.6;                          // where the pulses come from and go to (chip-local)

export const meta = { id: 'wdm', platform: 'ln', category: 'comm', size: { ...SIZE }, app: true };   // app: tab 3's

export const text = {
  en: {
    name: 'Colour router',
    tech: 'Slab waveguide written by light · lithium niobate',
    what: 'Sends each of four colours of light to its own output.',
    in: 'Four colours of light in one input',
    out: 'Each colour at its own output',
    how: 'The pattern of light is not designed: the chip measures its outputs, and the error, fed back step by step, changes the pattern until every colour reaches its own output.',
    use: 'Optical networks send many colours of light through one fibre; each must be routed to the right place.',
    fixed: 'Another target, another pattern: the same chip learns it in seconds.',
    c: { in: 'Input', out: 'Output' },
    ref: 'In situ inverse design: Zhao et al., arXiv:2610.10404 (2026).',
  },
  ja: {
    name: '色の振り分け',
    tech: '光で書いたスラブ導波路・ニオブ酸リチウム',
    what: '4つの色の光を、それぞれ自分の出口へ送ります。',
    in: '1つの入口に4色の光',
    out: '色ごとに別の出口',
    how: '光のパターンは設計しません。チップが出力を測り、そのずれを一歩ずつ返すとパターンが変わり、やがてどの色も自分の出口に届きます。',
    use: '光通信では1本のファイバーに多くの色の光を通し、それぞれを正しい行き先へ送ります。',
    fixed: '目標が変われば、パターンも変わります。同じチップが数秒で覚え直します。',
    c: { in: '入力', out: '出力' },
    ref: 'その場での逆設計：Zhao ほか、arXiv:2610.10404 (2026)。',
  },
};

// the pulses (kit/pulses.js): the trains in and out, and the pulses in the slab, all in step
const PULSE = { spacing: 0.42, length: 0.1, speed: 2.4 };

const FIELD_VS = /* glsl */ `
varying vec3 vP;
void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// the light in the slab: four colours (one per channel of the texture), each 0..1 along its paths.  Where they are
// together the light is yellow-white; where one is alone, it has that colour.  Pulses run through it as in the
// trains outside (the same spacing and speed, counted from where the input train starts), as arcs spreading from
// the input.  Drawn over the pale chip (not added), so that the colours stay colours.
const FIELD_FS = /* glsl */ `
uniform sampler2D uField, uField2;
uniform vec3 uC0, uC1, uC2, uC3, uWarm;
uniform float uMix, uLevel, uDim, uTime, uNz, uW, uX0, uLen, uFar, uSpeed, uSpacing, uPLen;
varying vec3 vP;
void main() {
  float s = (vP.x - uX0) / uLen;
  float v = 0.5 - vP.z / uW;
  float u = (clamp(s, 0.0, 1.0) * uNz + 0.5) / (uNz + 1.0);
  vec4 I = mix(texture2D(uField, vec2(u, v)), texture2D(uField2, vec2(u, v)), uMix);
  float mx = max(max(I.r, I.g), max(I.b, I.a));
  if (mx < 0.004) discard;
  float sum = I.r + I.g + I.b + I.a;
  vec3 hue = (uC0 * I.r + uC1 * I.g + uC2 * I.b + uC3 * I.a) / sum;
  hue /= max(max(hue.r, hue.g), max(hue.b, 1e-4));
  float spread = clamp((sum - mx) / (3.0 * mx), 0.0, 1.0);
  hue = mix(hue, uWarm, smoothstep(0.12, 0.7, spread));
  float x = (uX0 + uFar + length(vec2(vP.x - uX0, vP.z)) - uTime * uSpeed) / uSpacing;
  float d = (fract(x) - 0.5) * uSpacing;
  float pulse = exp(-d * d / (uPLen * uPLen));
  vec3 col = hue * mx * (0.72 + 0.6 * pulse) * uLevel * uDim * 1.7;
  float m = max(max(col.r, col.g), col.b);
  float a = clamp(m * 2.4, 0.0, 1.0);
  gl_FragColor = vec4(col / max(a, 0.04), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const kernel = sig => {
  const r = Math.ceil(3 * sig), k = new Float64Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += (k[i + r] = Math.exp(-0.5 * (i / sig) ** 2));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  return k;
};

export function create(kit) {
  const { THREE, P } = kit;
  const lab = new WdmLab();
  const { nx, nz } = lab, dev = lab.cfg.dev;
  // (SX: drawn 9 units per mm across the slab, a little wider than along it, so that the outputs stand apart)
  const X0 = -SIZE.w / 2 + 0.05, X1 = SIZE.w / 2 - 0.05, SX = 9.0, W = dev.wx * SX;
  const zOf = x => -x * SX;
  const ports = lab.cfg.ports, ZQ = ports.map(zOf);
  const ZJ = Float64Array.from(lab.x, zOf);                                   // across: where each row is drawn
  const ROUTE = Float64Array.from({ length: nz + 1 }, (_, s) => sstep(0.12, 0.92, s / nz));   // input 0 -> output 1
  const GROW = Float64Array.from({ length: nz + 1 }, (_, s) => sstep(0, 0.6, s / nz));
  kit.chip({ w: SIZE.w, d: SIZE.d, platform: 'ln' });

  // ---------------------------------------------------------------- the program: the illumination pattern (drawn
  // into the bench's mask: the green light on the chip and in the projector's light)
  const pData = new Uint8Array(nz * nx * 4);
  const pFrom = new Float32Array(nz * nx), pTo = new Float32Array(nz * nx);
  const st = { mix: -1, fade: 0.3, pk: -1, pfade: 0.4, flash: 0 };
  const putPattern = k => {
    const gain = 1 + 0.4 * st.flash * (1 - k);
    for (let s = 0; s < nz; s++) for (let j = 0; j < nx; j++) {
      const i = s * nx + j, v = Math.min(255, Math.round(255 * gain * (pFrom[i] + (pTo[i] - pFrom[i]) * k))), o = (j * nz + s) * 4;
      pData[o] = pData[o + 1] = pData[o + 2] = v; pData[o + 3] = 255;
    }
  };
  putPattern(1);
  const pTex = new THREE.DataTexture(pData, nz, nx, THREE.RGBAFormat);
  pTex.magFilter = THREE.LinearFilter; pTex.minFilter = THREE.LinearFilter; pTex.needsUpdate = true;
  const pattern = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, W).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: pTex }));
  pattern.position.set((X0 + X1) / 2, 0.002, 0);
  pattern.userData.maskMap = pTex;
  kit.group.add(pattern);
  // the pattern as shown: lab.p smoothed (along and across), kept along the four paths (ENV), as strong as it is
  // written in the middle of the slab - soft strands that grow as the chip learns
  const ENV = new Float32Array(nz * nx);
  for (let s = 0; s < nz; s++) {
    const r = sstep(0.12, 0.92, (s + 0.5) / nz);
    for (let j = 0; j < nx; j++) {
      let e = 0;
      for (const zq of ZQ) { const d = (ZJ[j] - zq * r) / 0.42; e = Math.max(e, Math.exp(-0.5 * d * d)); }
      ENV[s * nx + j] = sstep(0.2, 0.75, e) * lab.keep[j];
    }
  }
  const KS = kernel(2.5), KX = kernel(5), RS = KS.length >> 1, RX = KX.length >> 1;
  const bufA = new Float64Array(nz * nx), bufB = new Float64Array(nz * nx);
  const mid = [];                                                    // the rows of the middle of the slab
  for (let j = 0; j < nx; j++) if (Math.abs(lab.x[j]) < 0.25) mid.push(j);
  const PMAX = 0.9;
  const shape = () => {
    const p = lab.p;
    for (let s = 0; s < nz; s++) for (let j = 0; j < nx; j++) {
      let v = 0;
      for (let i = 0; i < KS.length; i++) v += KS[i] * p[Math.min(nz - 1, Math.max(0, s + i - RS)) * nx + j];
      bufA[s * nx + j] = v;
    }
    let sum = 0;
    for (let s = 0; s < nz; s++) {
      const row = s * nx;
      for (const j of mid) sum += p[row + j];
      for (let j = 0; j < nx; j++) {
        if (ENV[row + j] <= 0) { bufB[row + j] = 0; continue; }
        let v = 0;
        for (let i = 0; i < KX.length; i++) v += KX[i] * bufA[row + Math.min(nx - 1, Math.max(0, j + i - RX))];
        bufB[row + j] = v;
      }
    }
    const level = Math.min(1, sum / (nz * mid.length) / 0.2);
    for (let i = 0; i < pTo.length; i++) pTo[i] = PMAX * ENV[i] * (0.35 + 0.65 * Math.min(1, bufB[i] / 0.3)) * level;
  };

  // ---------------------------------------------------------------- the light in the slab
  const texOf = d => { const t = new THREE.DataTexture(d, nz + 1, nx, THREE.RGBAFormat); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; return t; };
  const fData = new Uint8Array((nz + 1) * nx * 4), fData2 = new Uint8Array((nz + 1) * nx * 4);
  const fTex = texOf(fData), fTex2 = texOf(fData2);
  const col = c => new THREE.Vector3(...lin(c));
  const U = {
    uField: { value: fTex }, uField2: { value: fTex2 }, uMix: { value: 0 },
    uC0: { value: col(COLOURS[0]) }, uC1: { value: col(COLOURS[1]) }, uC2: { value: col(SLAB_AMBER) }, uC3: { value: col(COLOURS[3]) }, uWarm: { value: col(WARM) },
    uLevel: { value: 1 }, uDim: { value: 1 }, uTime: { value: 0 }, uNz: { value: nz }, uW: { value: W },
    uX0: { value: X0 }, uLen: { value: X1 - X0 }, uFar: { value: FAR }, uSpeed: { value: PULSE.speed }, uSpacing: { value: PULSE.spacing }, uPLen: { value: 0.16 },
  };
  const field = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, W).rotateX(-Math.PI / 2).translate((X0 + X1) / 2, 0, 0),
    new THREE.ShaderMaterial({ uniforms: U, vertexShader: FIELD_VS, fragmentShader: FIELD_FS, transparent: true, depthWrite: false }));
  field.position.y = 0.02;
  field.renderOrder = 5;
  field.userData.role = 'light';
  kit.group.add(field);
  kit.onTick((dt, t, dim) => { U.uTime.value = kit.reduced ? 0 : t; U.uDim.value = dim; });
  // each colour: one path to every output, as bright as its share there (a little lifted, so that light spread
  // over four outputs still shows), and soft and wide while the colour is not sorted, narrow once it is
  const wq = new Float64Array(4);
  const paint = data => {
    for (let c = 0; c < lab.C; c++) {
      const Pc = lab.P[c];
      let tot = 1e-12, mx = 0;
      for (let q = 0; q < lab.Q; q++) { tot += Pc[q]; mx = Math.max(mx, Pc[q]); }
      const pur = Math.min(1, Math.max(0, (mx / tot - 0.25) / 0.75));
      const sEnd = 0.1 + 0.4 * Math.pow(1 - pur, 1.5);
      for (let q = 0; q < lab.Q; q++) wq[q] = Math.pow(Pc[q] / tot, 0.55);
      for (let s = 0; s <= nz; s++) {
        const sig = 0.1 + (sEnd - 0.1) * GROW[s], k = 0.5 / (sig * sig), r = ROUTE[s];
        for (let j = 0; j < nx; j++) {
          let v = 0;
          for (let q = 0; q < lab.Q; q++) { const d = ZJ[j] - ZQ[q] * r, e = k * d * d; if (e < 9) v += wq[q] * Math.exp(-e); }
          data[(j * (nz + 1) + s) * 4 + c] = Math.round(255 * (1 - Math.exp(-1.6 * v)));
        }
      }
    }
  };

  // ---------------------------------------------------------------- the pulses: in, the colours together (yellow-
  // white, a rainbow at the edges); out, at each output what arrives there - yellow-white while the colours are
  // mixed, its colour once one colour has it to itself (two trains on each output, cross-fading)
  const tr = kit.pulses({ width: 0.26, spacing: PULSE.spacing, length: PULSE.length, speed: PULSE.speed, y: 0.06 });
  tr.net.rgb = COLOURS;
  const kIn = tr.add(P.line(-FAR, 0, X0, 0), { s0: 0 });
  const s0 = x => X0 + FAR + Math.hypot(X1 - X0, zOf(x));      // (in step with the arcs in the slab)
  const kOutW = ports.map(x => tr.add(P.line(X1, zOf(x), FAR, zOf(x)), { s0: s0(x) }));
  const kOutC = ports.map(x => tr.add(P.line(X1, zOf(x), FAR, zOf(x)), { s0: s0(x) }));
  tr.build();
  tr.white(kIn, 1.3, { data: 0, rainbow: 1, seed: 7 });
  const amt = [0, 0, 0, 0];
  const outputs = () => {
    for (let q = 0; q < lab.Q; q++) {
      let T = 0, mx = 0;
      for (let c = 0; c < lab.C; c++) { amt[c] = lab.P[c][q]; T += amt[c]; mx = Math.max(mx, amt[c]); }
      const k = sstep(0.45, 0.9, T > 1e-6 ? mx / T : 0);
      tr.white(kOutW[q], Math.min(1.6, 1.25 * T) * (1 - k), { data: 0, rainbow: 1, seed: 7 });
      tr.mix(kOutC[q], amt.map(v => Math.min(1.6, 1.7 * v) * k));
    }
  };

  const settle = () => { if (st.mix >= 0) { fData.set(fData2); fTex.needsUpdate = true; st.mix = -1; U.uMix.value = 0; } };
  const inst = {
    lab, COLOURS, outX: FAR, inX: -FAR, X0, X1,
    portZ: q => zOf(ports[q]),
    anchors: { in: [-FAR + 0.9, 0.1, -0.7], out: [FAR - 0.9, 0.1, zOf(ports[ports.length - 1]) - 0.6] },
    controls: [],
    showLight({ fade = 0.3 } = {}) {
      settle();
      if (fade <= 0 || kit.reduced) { paint(fData); fTex.needsUpdate = true; }
      else { paint(fData2); fTex2.needsUpdate = true; st.mix = 0; st.fade = fade; }
      outputs();
    },
    showPattern({ fade = 0.4, flash = 0 } = {}) {
      if (st.pk >= 0) { const e = st.pk * st.pk * (3 - 2 * st.pk); for (let i = 0; i < pTo.length; i++) pFrom[i] += (pTo[i] - pFrom[i]) * e; }
      else pFrom.set(pTo);
      shape();
      st.flash = kit.reduced ? 0 : flash;
      if (fade <= 0 || kit.reduced) { pFrom.set(pTo); st.flash = 0; putPattern(1); pTex.needsUpdate = true; st.pk = -1; }
      else { st.pk = 0; st.pfade = fade; }
    },
    reset() { lab.reset(); inst.showPattern({ fade: 0 }); lab.forward(); inst.showLight({ fade: 0 }); },
    update(dt) {
      if (st.pk >= 0) {
        st.pk = Math.min(1, st.pk + dt / st.pfade);
        putPattern(st.pk * st.pk * (3 - 2 * st.pk)); pTex.needsUpdate = true;
        if (st.pk >= 1) { st.pk = -1; st.flash = 0; pFrom.set(pTo); }
      }
      if (st.mix >= 0) { st.mix += dt / st.fade; U.uMix.value = Math.min(1, st.mix); if (st.mix >= 1) settle(); }
    },
  };
  lab.forward(); inst.showLight({ fade: 0 });
  return inst;
}

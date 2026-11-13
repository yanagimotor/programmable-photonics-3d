// The wavefront of tab 3's optical computation (parts 5-7): a picture going into the chip as a line of light values.
// The input digit becomes the wavefront's shape, and every picture is drawn in high resolution.
//   The digit: its 28 x 28 MNIST original read row by row - 784 values - drawn as one fine glowing profile that stands
//   out from the chip's input edge, where its beams start (the first value, the top-left pixel, at the front: beam 0's
//   end; the last at the back).  The unroll: the card's 28 rows peel off, top row first, one after another, and fly to
//   their places along the edge, each a line as bright as its pixels; the card keeps its picture meanwhile (a row is
//   drawn only once it has left the card).  A picture: the chip itself reads the digit averaged to 7 x 7 (49 beams), and the light drawn on the chip
//   is the 2D Waveguide Studio's recorded light of those 49 beams.  The two line up band by band, not beam by beam:
//   each row of 7 beams (a 4-pixel band of the picture, averaged) has the same stretch of the edge as those 4 rows of
//   the picture read one after another.
//   The vowel: a sound, not an image - its 12 bands, one short bar at each of the voice chip's 12 beams.
// Built once; per frame only uniforms change (the values are written into the mesh when the digit changes).
//
//   const wave = createWave(THREE, { cardAt(col, row, out), lineAt(f, out), dir, amp, width, cardWidth, stag, fly })
//                     cardAt: world point of pixel (col, row) on the card; lineAt: world point at the fraction f of
//                     the input edge (0: the front end); dir: the way the profile stands out (world, unit); amp: how
//                     far a value of 1 reaches; width: the line's width on the edge (cardWidth: as it leaves the card);
//                     stag: seconds between two rows leaving; fly: seconds a row flies
//   wave.mesh         add it to the scene (world frame)
//   wave.digit(test)  the profile's 784 values: the MNIST test digit's (written into the mesh on a change only)
//   wave.peel(s)      the unroll's clock, seconds: 0 all rows still on the card (none drawn), PEEL all on the edge
//   wave.height(h)    how far the profile stands out: 1 full, 0 a flat line (its light has gone into the chip)
//   wave.level(k)     brightness 0..1 (0 hides it);  wave.tick(t, dim) every frame;  wave.PEEL (the unroll's length)
//   const bands = createBands(THREE, { at(i, out), dir, amp, width, n })
//   bands.mesh, bands.values(x), bands.height(h), bands.level(k), bands.tick(t, dim)
import { digit28, SIZE as N28 } from '../programs/data/mnist28.js';
import { lin } from '../kit/colour.js';

const WARM = [1, 0.9, 0.72];                 // the light's warm white (compute.APP_LIGHT)
const STAG = 0.025, FLY = 0.6;               // the unroll (defaults): row r leaves at r * stag and flies fly seconds

// a ribbon turned to the camera along each row's 28 points (as apps/rays.js does); the row flies from the card (a
// line of the picture, as bright as its pixels) to its stretch of the edge, the values standing out along `dir`.  The
// row keeps its length on the card (the picture's line, legible in flight) until it nears the edge, then folds into
// its stretch there: its middle flies (aSC -> aEC), its shape changes late (f)
const WAVE_VS = /* glsl */ `
attribute vec3 aE, aS2, aE2, aSC, aEC;
attribute float aR, aV, aV2, aSg, aU;
uniform float uPeel, uStag, uFly, uH, uAmp, uW0, uW1, uLift;
uniform vec3 uDir;
varying float vU, vB;
vec3 place(vec3 S, vec3 E, float v, float e, float f) {
  vec3 p = mix(aSC, aEC, e) + mix(S - aSC, E - aEC, f) + uDir * (uAmp * v * uH * f);
  p.y += uLift * sin(3.14159265 * e);
  return p;
}
void main() {
  float k = clamp((uPeel - aR * uStag) / uFly, 0.0, 1.0), e = k * k * (3.0 - 2.0 * k), f = smoothstep(0.5, 1.0, k);
  vec3 p = place(position, aE, aV, e, f), q = place(aS2, aE2, aV2, e, f);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec3 dv = (modelViewMatrix * vec4((q - p) * aSg, 0.0)).xyz;
  vec3 side = cross(dv, mv.xyz);
  float L = length(side);
  side = L > 1e-9 ? side / L : vec3(0.0, 1.0, 0.0);
  mv.xyz += side * aU * mix(uW0, uW1, f) * 0.5;
  vU = aU;
  // (in flight the row is as bright as its pixels, over a faint line - a line of the picture read off the card, even
  // where it is empty; on the edge a faint line with the values glowing out of it; not drawn before it leaves the
  // card, which shows the picture itself)
  vB = mix(0.18 + 0.82 * aV, 0.3 + 0.7 * aV, f) * step(0.0005, k);
  gl_Position = projectionMatrix * mv;
}`;
const WAVE_FS = /* glsl */ `
uniform vec3 uCol;
uniform float uLevel, uDim;
varying float vU, vB;
void main() {
  float across = exp(-vU * vU * 2.2);
  gl_FragColor = vec4(uCol * vB * across * uLevel * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createWave(THREE, { cardAt, lineAt, dir = [-1, 0, 0], amp = 1.0, width = 0.016, cardWidth = 0.06, stag = STAG, fly = FLY }) {
  const N = N28 * N28, PEEL = stag * (N28 - 1) + fly;
  const S = [], E = [];
  const p = new THREE.Vector3();
  for (let j = 0; j < N; j++) {
    cardAt(j % N28, Math.floor(j / N28), p); S.push(p.clone());
    lineAt((j + 0.5) / N, p); E.push(p.clone());
  }
  // the middle of each row, on the card and on the edge
  const SC = [], EC = [];
  for (let r = 0; r < N28; r++) {
    const a = r * N28, b = a + N28 - 1;
    SC.push(S[a].clone().add(S[b]).multiplyScalar(0.5)); EC.push(E[a].clone().add(E[b]).multiplyScalar(0.5));
  }
  // two vertices per point (either side of the line); each row its own strip (rows fly apart)
  const pos = [], aE = [], aS2 = [], aE2 = [], aSC = [], aEC = [], aR = [], aSg = [], aU = [], idx = [];
  const aV = new Float32Array(2 * N), aV2 = new Float32Array(2 * N);
  for (let r = 0; r < N28; r++) {
    for (let c = 0; c < N28; c++) {
      const j = r * N28 + c, last = c === N28 - 1, k = last ? j - 1 : j + 1;
      for (const u of [-1, 1]) {
        pos.push(S[j].x, S[j].y, S[j].z); aE.push(E[j].x, E[j].y, E[j].z);
        aS2.push(S[k].x, S[k].y, S[k].z); aE2.push(E[k].x, E[k].y, E[k].z);
        aSC.push(SC[r].x, SC[r].y, SC[r].z); aEC.push(EC[r].x, EC[r].y, EC[r].z);
        aR.push(r); aSg.push(last ? -1 : 1); aU.push(u);
      }
      if (!last) { const q = 2 * j; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  const F = (a, n) => new THREE.Float32BufferAttribute(a, n);
  g.setAttribute('position', F(pos, 3)); g.setAttribute('aE', F(aE, 3)); g.setAttribute('aS2', F(aS2, 3)); g.setAttribute('aE2', F(aE2, 3));
  g.setAttribute('aSC', F(aSC, 3)); g.setAttribute('aEC', F(aEC, 3));
  g.setAttribute('aR', F(aR, 1)); g.setAttribute('aSg', F(aSg, 1)); g.setAttribute('aU', F(aU, 1));
  const vAttr = new THREE.BufferAttribute(aV, 1), v2Attr = new THREE.BufferAttribute(aV2, 1);
  g.setAttribute('aV', vAttr); g.setAttribute('aV2', v2Attr);
  g.setIndex(idx);
  const U = {
    uPeel: { value: 0 }, uStag: { value: stag }, uFly: { value: fly }, uH: { value: 1 }, uAmp: { value: amp },
    uW0: { value: cardWidth }, uW1: { value: width }, uLift: { value: 0.35 }, uDir: { value: new THREE.Vector3(...dir).normalize() },
    uCol: { value: new THREE.Vector3(...lin(WARM)) }, uLevel: { value: 0 }, uDim: { value: 1 },
  };
  const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: WAVE_VS, fragmentShader: WAVE_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  mesh.renderOrder = 7; mesh.frustumCulled = false; mesh.visible = false;
  mesh.userData.role = 'light';
  let shown = -1;
  return {
    mesh, PEEL,
    digit(test) {
      if (test === shown) return;
      shown = test;
      const v = digit28(test);
      for (let r = 0; r < N28; r++) for (let c = 0; c < N28; c++) {
        const j = r * N28 + c, k = c === N28 - 1 ? j - 1 : j + 1;
        aV[2 * j] = aV[2 * j + 1] = v ? v[j] : 0;
        aV2[2 * j] = aV2[2 * j + 1] = v ? v[k] : 0;
      }
      vAttr.needsUpdate = true; v2Attr.needsUpdate = true;
    },
    get shown() { return shown; },
    peel(s) { U.uPeel.value = s; },
    height(h) { U.uH.value = h; },
    level(k) { U.uLevel.value = k; mesh.visible = k > 0.003; },
    get on() { return U.uLevel.value; },
    tick(t, dim = 1) { U.uDim.value = dim; },
  };
}

// the vowel's 12 bands at the voice chip's beams: flat bars on the chip's surface, standing out along `dir` as far as
// their values (at least a stub), as bright as their values
const BAND_VS = /* glsl */ `
attribute float aI, aT, aW;
uniform float uVal[12], uH, uAmp, uStub, uWidth;
uniform vec3 uDir, uSide;
varying float vV, vW;
void main() {
  int i = int(aI + 0.5);
  float v = uVal[i];
  vec3 p = position + uDir * aT * (uStub + uAmp * v * uH) + uSide * aW * uWidth * 0.5;
  vV = v; vW = aW;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const BAND_FS = /* glsl */ `
uniform vec3 uCol;
uniform float uLevel, uDim;
varying float vV, vW;
void main() {
  float edge = 1.0 - smoothstep(0.55, 1.0, abs(vW));
  gl_FragColor = vec4(uCol * (0.3 + 0.7 * vV) * edge * uLevel * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createBands(THREE, { at, dir = [-1, 0, 0], side = [0, 0, 1], amp = 1.0, width = 0.13, stub = 0.06, n = 12 }) {
  const pos = [], aI = [], aT = [], aW = [], idx = [];
  const p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    at(i, p);
    for (const [t, w] of [[0, -1], [0, 1], [1, 1], [1, -1]]) { pos.push(p.x, p.y, p.z); aI.push(i); aT.push(t); aW.push(w); }
    const o = 4 * i; idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aI', new THREE.Float32BufferAttribute(aI, 1));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(aT, 1));
  g.setAttribute('aW', new THREE.Float32BufferAttribute(aW, 1));
  g.setIndex(idx);
  const U = {
    uVal: { value: new Float32Array(12) }, uH: { value: 0 }, uAmp: { value: amp }, uStub: { value: stub }, uWidth: { value: width },
    uDir: { value: new THREE.Vector3(...dir).normalize() }, uSide: { value: new THREE.Vector3(...side).normalize() },
    uCol: { value: new THREE.Vector3(...lin(WARM)) }, uLevel: { value: 0 }, uDim: { value: 1 },
  };
  const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: U, vertexShader: BAND_VS, fragmentShader: BAND_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  mesh.renderOrder = 7; mesh.frustumCulled = false; mesh.visible = false;
  mesh.userData.role = 'light';
  let key = null;
  return {
    mesh,
    // (scaled to the loudest band, as the card's bars are)
    values(x) {
      if (x === key) return;
      key = x;
      let m = 1e-6;
      for (let i = 0; i < n; i++) m = Math.max(m, x ? x[i] : 0);
      for (let i = 0; i < n; i++) U.uVal.value[i] = x ? x[i] / m : 0;
    },
    height(h) { U.uH.value = h; },
    level(k) { U.uLevel.value = k; mesh.visible = k > 0.003; },
    get on() { return U.uLevel.value; },
    tick(t, dim = 1) { U.uDim.value = dim; },
  };
}

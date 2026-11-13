// Colour converter: frequency doubling (second-harmonic generation) in a periodically poled lithium-niobate
// waveguide (PPLN), like Wang et al., Optica 5, 1438 (2018).
//
// The light (simplified, slowed down).  Two infrared photons (frequency f) can merge into one photon of frequency
// 2f.  The new light and the infrared travel at slightly different speeds, so after one "coherence length" the
// new light is out of step and flows back into the infrared: left alone it rises and falls again and again, with a
// period of two coherence lengths.  Flipping the crystal every coherence length (the poled stripes: period = two
// coherence lengths) reverses the conversion just when it would turn back, so the new light keeps growing
// (quasi-phase matching).  The model integrates the coupled-amplitude equations through the very stripe pattern
// drawn on the chip, with the infrared slowly used up, so the small steps of the growth sit on the stripes.
// Without stripes it uses the small-signal result |a2| ~ |sin(pi s / period)|, drawn magnified (see text.note).
//
// Display: the infrared glows with its power; the blue glows with the strength (amplitude) of its wave, so that it
// shows early on; the plates show powers, on a frequency axis that starts at zero (the blue line sits at twice the
// distance of the red one).  The arrows beside the guide show the crystal's orientation: alternate stripes point
// the other way; without stripes they all point the same way.
export const meta = { id: 'shg', platform: 'ln', category: 'convert', size: { w: 11, d: 2.6 } };

const NB = ' ';
export const text = {
  en: {
    name: 'Colour converter',
    tech: 'Periodically poled waveguide (PPLN) · lithium niobate',
    what: 'Turns invisible infrared light into a new colour.',
    in: 'Infrared laser light of one colour',
    out: 'Light at twice the frequency (blue here) and the leftover infrared',
    how: 'In this crystal, two infrared photons can merge into one photon of twice the frequency. Left alone, the new light soon falls out of step with the infrared and turns back into it. Stripes where the crystal is flipped keep the two in step, so the new light grows all along the chip.',
    use: 'Making colours that no handy laser gives directly: green laser pointers, light for atom-based clocks and sensors, and pump light for quantum light sources.',
    fixed: 'The stripe spacing is written into the crystal when the chip is made. It suits one input colour only: another colour needs another chip.',
    c: { in: 'Infrared in', stripes: 'Striped crystal', born: 'New colour is born', out: 'New colour out' },
    ctl: { stripes: 'Stripes', lstripes: 'Light stripes' },
    status: '<b>With stripes</b>: the blue light keeps growing along the chip and leaves with the leftover infrared.',
    'status.off': '<b>Without stripes</b>: the blue light turns back into infrared again and again. Almost none comes out.',
    'status.start': 'Laser on: blue light is born as the infrared travels along the chip.',
    ref: `Wang et al., Optica 5, 1438 (2018): a thin-film lithium-niobate waveguide like this one, poled every 4${NB}µm, doubled telecom light more than 20 times more efficiently than conventional waveguides.`,
    note: `The stripes are drawn far wider than real (4${NB}µm): a real chip has about a thousand. Without stripes, the blue light inside is much fainter than drawn.`,
  },
  ja: {
    name: '色変換器',
    tech: '周期分極反転導波路（PPLN）・ニオブ酸リチウム',
    what: '目に見えない赤外光を、別の色の光に変えます。',
    in: '一つの色の赤外レーザー光',
    out: '2倍の周波数の光（ここでは青）と、残った赤外光',
    how: 'この結晶の中では、赤外の光子2個が合わさって、周波数が2倍の光子1個になります。そのままだと、新しい光はすぐに赤外光と足並みがずれて、赤外光に戻ってしまいます。結晶の向きを縞状に反転させておくと足並みがそろい続け、新しい光はチップ全体で育ちます。',
    use: '手ごろなレーザーでは直接出せない色をつくるのに使われます。緑のレーザーポインター、原子を使う時計やセンサー用の光、量子光源を励起する光などです。',
    fixed: '縞の間隔は、チップを作るときに結晶に書き込まれます。合うのは一つの入力の色だけで、別の色には別のチップが必要です。',
    c: { in: '赤外光', stripes: '縞模様の結晶', born: '新しい色が生まれる', out: '新しい色の光' },
    ctl: { stripes: '縞模様', lstripes: '光の縞' },
    status: '<b>縞あり</b>：青い光はチップを進むあいだ育ち続け、残った赤外光と一緒に出ていきます。',
    'status.off': '<b>縞なし</b>：青い光は何度も赤外光に戻ってしまい、ほとんど出てきません。',
    'status.start': 'レーザーをオン：赤外光が進むにつれて、青い光が生まれます。',
    ref: `Wang ほか、Optica 5, 1438 (2018)：このような薄膜ニオブ酸リチウム導波路を4${NB}µm周期で分極反転し、通信用の赤外光の周波数を、従来の導波路の20倍以上の効率で2倍にしました。`,
    note: `縞は実物（4${NB}µm）よりずっと太く描いています。実際のチップには千本ほどあります。縞なしのとき、中の青い光は実際にはもっとずっと弱いものです。`,
  },
};

const W = meta.size.w, D = meta.size.d;
const Y = 0.085;                               // height of the light (just above the ridge)
const PERIOD = 0.75, NPER = 12;                // stripe period (drawn; real: about 4 µm) and number of periods
const XA = -4.5, XB = XA + NPER * PERIOD;      // the poled section
const AIR = 2.4;                               // length of the beams in the air
const CONV = 0.3;                              // share of the power that leaves as blue (illustrative)
const RED = 1.0, BLUE = 2.0, HUMP = 0.55;       // glow of the infrared, of the blue at the end, of the blue's humps
const RED_AIR = 1.15;                          // the infrared beams in the air (over the dark mat)
const FRONT = 4.5;                             // a change sweeps along the chip with the light (units/s, slowed)
const V = 1.8;                                 // speed of the drawn photons (units/s)
const RATE_ON = 5, RATE_OFF = 1.4;             // drawn conversions per second, with / without stripes
const TM = 0.34, TS = 0.34;                    // two red photons meet for this long; split again for this long
const AUTO_OFF = 7, AUTO_ON = 12.5, CYCLE = 20;  // focus story: stripes off at 7 s, back on at 12.5 s
const NG = 420, G0 = -W / 2, G1 = W / 2 + AIR, DXG = (G1 - G0) / (NG - 1);
const ZA = 0.4;                                // the row of orientation arrows (in front of the guide)
const STRIPE_W = 0.92, STRIPE_H = 0.02, STRIPE_RGB = 0x66568a;   // poled stripes: across the guide, height, colour

// ------------------------------------------------------------------------------------------------- helpers
// Written here because the kit has no alpha-blended light yet (see the kit wishes in planning/build/shg.md): light
// nets and photons add up, so a blue core on red light turns purple and red light on the pale chip turns pink.
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const toLin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

const DOT_VS = /* glsl */ `
attribute vec4 aColor; attribute float aSize;
uniform float uScale;
varying vec4 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.001, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const DOT_FS = /* glsl */ `
uniform float uDim;
varying vec4 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  float a = exp(-r2 * 3.2) + 0.6 * exp(-r2 * 18.0);
  if (a < 0.02) discard;
  // dimmed (another chip in focus): fade out, never darken the chip (alpha-blended, unlike the kit's light)
  gl_FragColor = vec4(vColor.rgb * (0.55 + 0.45 * a) * (0.6 + 0.4 * uDim), clamp(a * 1.25, 0.0, 1.0) * vColor.a * uDim);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// photons drawn over the light (alpha-blended, so that a blue photon on red light stays blue)
function dotsLayer(kit, max) {
  const T = kit.THREE;
  const pos = new Float32Array(max * 3), col = new Float32Array(max * 4), siz = new Float32Array(max);
  const geo = new T.BufferGeometry();
  const aPos = new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage);
  const aCol = new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage);
  const aSiz = new T.BufferAttribute(siz, 1).setUsage(T.DynamicDrawUsage);
  geo.setAttribute('position', aPos); geo.setAttribute('aColor', aCol); geo.setAttribute('aSize', aSiz);
  geo.setDrawRange(0, 0);
  const uniforms = { uScale: { value: 600 }, uDim: { value: 1 } };
  const mat = new T.ShaderMaterial({ uniforms, vertexShader: DOT_VS, fragmentShader: DOT_FS, transparent: true, depthWrite: false });
  const obj = new T.Points(geo, mat);
  obj.frustumCulled = false; obj.renderOrder = 8;
  obj.onBeforeRender = (renderer, scene, camera) => {
    if (camera && camera.isPerspectiveCamera) uniforms.uScale.value = (renderer.domElement.height / 2) / Math.tan(camera.fov * Math.PI / 360);
  };
  kit.group.add(obj);
  kit.onTick((dt, t, dim) => { uniforms.uDim.value = dim; });
  let n = 0;
  return {
    begin() { n = 0; },
    add(x, y, z, L, a, size) {                   // L: linear rgb, already times brightness
      if (n >= max || !(a > 0.004) || !Number.isFinite(x + y + z)) return;
      pos[3 * n] = x; pos[3 * n + 1] = y; pos[3 * n + 2] = z;
      col[4 * n] = L[0]; col[4 * n + 1] = L[1]; col[4 * n + 2] = L[2]; col[4 * n + 3] = Math.min(1, a);
      siz[n] = size; n++;
    },
    end() { geo.setDrawRange(0, n); aPos.needsUpdate = true; aCol.needsUpdate = true; aSiz.needsUpdate = true; },
  };
}

const BAND_VS = /* glsl */ `
attribute float aT; attribute float aU;
varying float vT; varying float vU;
void main() {
  vT = aT; vU = aU;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BAND_FS = /* glsl */ `
uniform sampler2D uTex; uniform vec3 uColor;
uniform float uTime, uFlow, uDash, uLen, uS0, uGain, uDim, uSharp, uDashAmt;
varying float vT; varying float vU;
void main() {
  float p = texture2D(uTex, vec2(vT, 0.5)).r * 3.0;
  float ph = fract((uS0 + vT * uLen - uTime * uFlow) / uDash);
  float pulse = mix(1.0, 0.38 + 0.62 * pow(0.5 + 0.5 * cos(6.2831853 * ph), 1.5), uDashAmt);
  float across = exp(-vU * vU * uSharp);
  float a = across * smoothstep(0.0, 0.35, p) * (0.5 + 0.5 * pulse) * uDim;     // dimmed: fade out, never darken
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor * (p * uGain * (0.6 + 0.4 * pulse) * (0.6 + 0.4 * uDim)), a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// light in a straight guide along x, drawn as a soft band that COVERS what is below it (alpha-blended): red stays
// red on the pale lithium niobate, and a narrower blue band on top of the red one stays blue.  Flowing dashes
// like the kit's light nets.  set(f): f(x) -> brightness (like a light net's power, 0..3).
function lightBand(kit, { x0, x1, y, half, rgb, s0, sharp = 3, dash = 1, order = 7.2, texels = 512, segs = 120, halfAt = null }) {
  const T = kit.THREE;
  const data = new Uint8Array(texels * 4);
  const tex = new T.DataTexture(data, texels, 1, T.RGBAFormat, T.UnsignedByteType);
  tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter;
  tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  const pos = [], aT = [], aU = [], idx = [];
  for (let k = 0; k <= segs; k++) {
    const t = k / segs, x = x0 + (x1 - x0) * t;
    const hw = halfAt ? halfAt(x) : half;
    for (const u of [-1, 1]) { pos.push(x, y, u * hw); aT.push(t); aU.push(u); }
    if (k < segs) { const a = 2 * k; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aT', new T.Float32BufferAttribute(aT, 1));
  geo.setAttribute('aU', new T.Float32BufferAttribute(aU, 1));
  geo.setIndex(idx);
  const L = rgb.map(toLin);
  const uniforms = {
    uTex: { value: tex }, uColor: { value: new T.Vector3(L[0], L[1], L[2]) }, uTime: { value: 0 }, uFlow: { value: 1.6 },
    uDash: { value: 0.9 }, uLen: { value: x1 - x0 }, uS0: { value: s0 }, uGain: { value: 1.6 }, uDim: { value: 1 }, uSharp: { value: sharp }, uDashAmt: { value: dash },
  };
  const mat = new T.ShaderMaterial({ uniforms, vertexShader: BAND_VS, fragmentShader: BAND_FS, transparent: true, depthWrite: false, side: T.DoubleSide });
  const mesh = new T.Mesh(geo, mat);
  mesh.renderOrder = order; mesh.frustumCulled = false;
  kit.group.add(mesh);
  kit.onTick((dt, t, dim) => { uniforms.uTime.value = t; uniforms.uDim.value = dim; });
  return {
    uniforms,
    set(f) {
      for (let i = 0; i < texels; i++) data[4 * i] = Math.round(255 * clamp01(f(x0 + (x1 - x0) * i / (texels - 1)) / 3));
      tex.needsUpdate = true;
    },
  };
}

// small arrows lying on the chip: the crystal's orientation in each half-period (flipped ones turn round).
// Shown in focus only (fade(v)): from afar they would only be specks.
function domainArrows(kit, { x0, half, count, z, yTop }) {
  const T = kit.THREE;
  const shape = new T.Shape([[0, -0.12], [0.07, -0.035], [0.024, -0.035], [0.024, 0.11], [-0.024, 0.11], [-0.024, -0.035], [-0.07, -0.035]]
    .map(([a, b]) => new T.Vector2(a, b)));
  const geo = new T.ShapeGeometry(shape).rotateX(-Math.PI / 2);
  const mat = new T.MeshStandardMaterial({ color: 0xece4fb, roughness: 0.55, metalness: 0, emissive: 0x231c30, side: T.DoubleSide, transparent: true, opacity: 0 });
  const m = new T.InstancedMesh(geo, mat, count);
  m.visible = false;
  m.renderOrder = 2;
  kit.group.add(m);
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(1, 1, 1), Pp = new T.Vector3(), UP = new T.Vector3(0, 1, 0);
  const set = amount => {
    for (let j = 0; j < count; j++) {
      const flipped = j % 2 === 0;
      Q.setFromAxisAngle(UP, flipped ? Math.PI * amount : 0);
      Pp.set(x0 + (j + 0.5) * half, 0.004 + (flipped ? yTop * amount : 0), z);
      m.setMatrixAt(j, M.compose(Pp, Q, S));
    }
    m.instanceMatrix.needsUpdate = true;
  };
  set(1);
  let shown = 0;
  return {
    set,
    fade(want, dt) {
      if (shown === want) return;
      shown += Math.sign(want - shown) * Math.min(Math.abs(want - shown), dt * 3);
      mat.opacity = shown; m.visible = shown > 0.01;
    },
  };
}

// ------------------------------------------------------------------------------------------------- the chip
export function create(kit) {
  const { P, colour } = kit;
  const IR = colour.IR, SH = colour.SH;
  const LIR = IR.map(toLin), LSH = SH.map(toLin);
  const C_RED = LIR.map(c => c * 2.4), C_BLUE = LSH.map(c => c * 2.8);     // photon colours (linear, x brightness)
  const K = kit.reduced ? 0.5 : 1;               // less motion: everything at half speed

  kit.chip({ w: W, d: D, platform: 'ln' });
  const guide = P.line(-W / 2, 0, W / 2, 0);
  kit.ridges([guide], 'ln');
  const stripes = kit.poling({ x0: XA - PERIOD / 4, x1: XB, z: 0, width: STRIPE_W, period: PERIOD, duty: 0.5, color: STRIPE_RGB });
  stripes.material.transparent = true;
  stripes.scale.y = STRIPE_H / (kit.RIDGE.h + 0.006);   // domains are inside the crystal: flat stripes, the ridge runs over them
  const arrows = domainArrows(kit, { x0: XA, half: PERIOD / 2, count: 2 * NPER, z: ZA, yTop: STRIPE_H + 0.001 });

  const redBand = lightBand(kit, { x0: -W / 2, x1: W / 2, y: 0.083, half: 0.26, rgb: IR, s0: 0, sharp: 3.0, order: 7.2 });
  const inBeam = kit.beam({ from: [-W / 2 - AIR, Y, 0], to: [-W / 2, Y, 0], rgb: IR, power: RED_AIR, r0: 0.085, fade: 'in' });
  const outBeam = kit.beam({ from: [W / 2, Y, 0], to: [W / 2 + AIR, Y, 0], rgb: IR, power: RED_AIR * (1 - CONV), r0: 0.09, fade: 'out' });
  const BX0 = XA - 0.1;
  const band = lightBand(kit, {
    x0: BX0, x1: G1, y: 0.088, half: 0.13, rgb: SH, s0: BX0 + W / 2, sharp: 2.2, dash: 0.35, order: 7.6,
    halfAt: x => 0.13 - 0.06 * smooth(W / 2, W / 2 + 0.6, x),              // narrower in the air: the leftover red shows round it
  });
  const dots = dotsLayer(kit, 160);

  // ---- the model: power shares along the guide (a1: infrared, a2: blue), integrated through the stripes
  const L = XB - XA, steps = NPER * 96, h = PERIOD / 96, dk = 2 * Math.PI / PERIOD;
  const g = Math.atanh(Math.sqrt(CONV)) * Math.PI / (2 * L);     // first-order QPM: effective coupling (2/pi) g
  const s1 = new Float32Array(steps + 1), s2 = new Float32Array(steps + 1);
  {
    const f = (s, A, d, o) => {
      const c = Math.cos(dk * s), sn = Math.sin(dk * s);
      const qr = A[0] * A[0] - A[1] * A[1], qi = 2 * A[0] * A[1];                 // a1^2
      const er = qr * c - qi * sn, ei = qr * sn + qi * c;                         // a1^2 e^{i dk s}
      const wr = A[0] * A[2] + A[1] * A[3], wi = A[0] * A[3] - A[1] * A[2];       // conj(a1) a2
      const vr = wr * c + wi * sn, vi = wi * c - wr * sn;                         // ... e^{-i dk s}
      o[0] = g * d * vi; o[1] = -g * d * vr;                                      // da1 = -i g d conj(a1) a2 e^{-i dk s}
      o[2] = g * d * ei; o[3] = -g * d * er;                                      // da2 = -i g d a1^2 e^{i dk s}
    };
    const A = [1, 0, 0, 0], k1 = [0, 0, 0, 0], k2 = [0, 0, 0, 0], k3 = [0, 0, 0, 0], k4 = [0, 0, 0, 0], B = [0, 0, 0, 0];
    s1[0] = 1; s2[0] = 0;
    for (let j = 0; j < steps; j++) {
      const s = j * h, d = ((j + 0.5) * h) % PERIOD < PERIOD / 2 ? -1 : 1;     // flipped in the first half of each period
      f(s, A, d, k1);
      for (let q = 0; q < 4; q++) B[q] = A[q] + 0.5 * h * k1[q];
      f(s + h / 2, B, d, k2);
      for (let q = 0; q < 4; q++) B[q] = A[q] + 0.5 * h * k2[q];
      f(s + h / 2, B, d, k3);
      for (let q = 0; q < 4; q++) B[q] = A[q] + h * k3[q];
      f(s + h, B, d, k4);
      for (let q = 0; q < 4; q++) A[q] += h / 6 * (k1[q] + 2 * k2[q] + 2 * k3[q] + k4[q]);
      s1[j + 1] = A[0] * A[0] + A[1] * A[1]; s2[j + 1] = A[2] * A[2] + A[3] * A[3];
    }
  }
  const p2L = s2[steps], p1L = s1[steps];
  const share = (arr, x) => {
    const s = Math.min(Math.max(x - XA, 0), L) / h, i = Math.min(steps - 1, Math.floor(s)), fr = s - i;
    return arr[i] + (arr[i + 1] - arr[i]) * fr;
  };
  const ON = { r1: new Float32Array(NG), b2: new Float32Array(NG), out: [p1L, p2L] };
  const OFF = { r1: new Float32Array(NG), b2: new Float32Array(NG), out: [1, 0] };
  const DARK = { r1: new Float32Array(NG), b2: new Float32Array(NG), out: [0, 0] };
  const cdf = new Float32Array(NG);                  // where blue photons are born with stripes (growth of the power)
  for (let i = 0; i < NG; i++) {
    const x = G0 + i * DXG;
    ON.r1[i] = RED * share(s1, x);
    ON.b2[i] = BLUE * Math.sqrt(Math.max(0, share(s2, x)) / p2L);
    OFF.r1[i] = RED;
    OFF.b2[i] = x >= XA && x <= XB ? HUMP * Math.abs(Math.sin(Math.PI * (x - XA) / PERIOD)) : 0;
    cdf[i] = (i ? cdf[i - 1] : 0) + (i ? Math.max(0, share(s2, x) - share(s2, x - DXG)) : 0);
  }
  for (let i = 0; i < NG; i++) cdf[i] /= cdf[NG - 1];

  // ---- what is shown: the profiles sweep from the old state to the new one with the light
  const r1 = new Float32Array(NG), b2 = new Float32Array(NG), r1o = new Float32Array(NG), b2o = new Float32Array(NG);
  let tgt = ON, front = Infinity, moving = false, starting = false, outOld = ON.out, stripesOn = true, stripeAmt = 1;
  let laser = 1;
  const at = (arr, x) => {
    const s = (x - G0) / DXG, i = Math.max(0, Math.min(NG - 2, Math.floor(s))), fr = clamp01(s - i);
    return arr[i] + (arr[i + 1] - arr[i]) * fr;
  };
  const frontW = x => (moving ? clamp01((front - x) / 0.3 + 0.5) : 1);
  const outShares = () => { const w = frontW(W / 2); return [outOld[0] + (tgt.out[0] - outOld[0]) * w, outOld[1] + (tgt.out[1] - outOld[1]) * w]; };
  function push() {
    redBand.set(x => at(r1, x));
    band.set(x => at(b2, x) * (x <= W / 2 ? 1 : 1 - smooth(0.35, 1, (x - W / 2) / AIR)));
    outBeam.set(IR, at(r1, W / 2 - 0.02) * RED_AIR / RED);
    inBeam.set(IR, RED_AIR * laser);
  }
  function settle(state) {
    tgt = state; moving = false; starting = false; front = Infinity; outOld = state.out;
    r1.set(state.r1); b2.set(state.b2);
    push();
  }
  function sweep(state, fromDark = false) {
    const src = fromDark ? DARK : null;
    r1o.set(src ? src.r1 : r1); b2o.set(src ? src.b2 : b2);
    outOld = fromDark ? DARK.out : outShares();
    tgt = state; moving = true; starting = fromDark; front = G0 - (fromDark ? 0.9 : 0.3);
    if (fromDark) laser = 0;
  }
  function stepSweep(dt) {
    front += FRONT * dt;                             // (not slowed for reduced motion: a gentle sweep)
    for (let i = 0; i < NG; i++) {
      const w = clamp01((front - (G0 + i * DXG)) / 0.3 + 0.5);
      r1[i] = r1o[i] + (tgt.r1[i] - r1o[i]) * w;
      b2[i] = b2o[i] + (tgt.b2[i] - b2o[i]) * w;
    }
    if (front > G1 + 0.4) { moving = false; starting = false; outOld = tgt.out; }
    push();
  }
  const setStripes = on => {
    if (on === stripesOn) return;
    stripesOn = on;
    sweep(on ? ON : OFF);
  };
  settle(ON);

  // ---- photons: two red ones merge into a blue one (with stripes it flies out; without, it splits again)
  const events = [];
  let clock = 0, nextBirth = 0.2;
  const RX = 0.13;                                     // how far apart the two red photons start (across the guide)
  function spawn() {
    const on = tgt === ON;
    let xb, xd = null;
    if (on) {
      const r = kit.rand();
      let lo = 0, hi = NG - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cdf[m] < r) lo = m; else hi = m; }
      xb = G0 + hi * DXG;
    } else {
      const k = Math.floor(kit.rand() * NPER), sp = PERIOD * (0.06 + 0.26 * kit.rand());
      xb = XA + k * PERIOD + sp; xd = XA + (k + 1) * PERIOD - sp;
    }
    if (moving && (xd ?? xb) > front - 0.4) return;    // the light has not got there yet
    if (events.length >= 48) return;
    events.push({ xb, xd, t0: clock + TM });
  }
  function drawDots() {
    dots.begin();
    const yP = Y + 0.035;
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i], tau = clock - e.t0;
      if (tau < 0) {                                   // two red photons approaching each other
        const k = -tau / TM, x = e.xb + V * tau, a = clamp01((TM + tau) / 0.1);
        const zz = RX * Math.pow(k, 1.4);
        dots.add(x, yP, zz, C_RED, a, 0.16);
        dots.add(x, yP, -zz, C_RED, a, 0.16);
        continue;
      }
      const x = e.xb + V * tau;
      const pop = 1 + 0.7 * Math.exp(-tau / 0.09);
      if (e.xd === null) {                            // with stripes: flies out with the blue light
        if (x > G1) { events.splice(i, 1); continue; }
        const a = x <= W / 2 ? 1 : 1 - smooth(0.35, 1, (x - W / 2) / AIR);
        dots.add(x, yP, 0, C_BLUE, a, 0.19 * pop);
      } else if (x < e.xd) {                          // without: lives until it falls out of step
        dots.add(x, yP, 0, C_BLUE, 1, 0.19 * pop);
      } else {                                         // ... and splits back into two red photons
        const t2 = (x - e.xd) / V;
        if (t2 > TS) { events.splice(i, 1); continue; }
        const k = t2 / TS, zz = RX * Math.pow(k, 1.4), a = 1 - k;
        dots.add(x, yP, zz, C_RED, a, 0.16);
        dots.add(x, yP, -zz, C_RED, a, 0.16);
      }
    }
    dots.end();
  }

  // ---- plates: frequency axis from zero; the blue line sits at twice the frequency of the red one
  const MUTED = [0.62, 0.68, 0.74], css = colour.css;
  const lay = box => { const yb = box.y + box.h - 4; return { yb, hmax: (yb - box.y) * 0.86, X: f => box.x + box.w * f / 2.45 }; };
  const axisRow = (g, box, Lo) => {
    g.save();
    g.strokeStyle = 'rgba(160,185,210,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(box.x, Lo.yb); g.lineTo(box.x + box.w - 4, Lo.yb); g.stroke();
    g.fillStyle = 'rgba(160,185,210,0.75)';
    g.beginPath(); g.moveTo(box.x + box.w + 2, Lo.yb); g.lineTo(box.x + box.w - 12, Lo.yb - 6); g.lineTo(box.x + box.w - 12, Lo.yb + 6); g.closePath(); g.fill();
    g.restore();
    kit.draw.text(g, kit.word('colour'), box.x + box.w, Lo.yb + 36, { size: 28, rgb: MUTED, align: 'right', weight: 600 });
  };
  const line = (g, Lo, f, hh, rgb) => {
    if (hh < 0.01) return;
    const x = Lo.X(f);
    g.save(); g.lineCap = 'round';
    g.strokeStyle = css(rgb); g.lineWidth = 17; g.shadowColor = css(rgb, 0.9); g.shadowBlur = 20;
    g.beginPath(); g.moveTo(x, Lo.yb - 9); g.lineTo(x, Lo.yb - Math.max(11, hh * Lo.hmax)); g.stroke();
    g.restore();
  };
  const ghost = (g, Lo, f, hh, rgb) => {
    const x = Lo.X(f), y1 = Lo.yb - hh * Lo.hmax;
    g.save(); g.setLineDash([8, 7]); g.strokeStyle = css(rgb, 0.7); g.lineWidth = 3;
    g.strokeRect(x - 12, y1 - 3, 24, Lo.yb - 2 - y1); g.restore();
  };
  const hop = (g, Lo, f0, h0, f1, h1, label) => {
    const xa = Lo.X(f0) + 8, ya = Lo.yb - h0 * Lo.hmax - 16, xb = Lo.X(f1) - 6, yb = Lo.yb - h1 * Lo.hmax - 16;
    const cx = (xa + xb) / 2, cy = Math.min(ya, yb) - 58;
    g.save(); g.strokeStyle = 'rgba(226,236,250,0.85)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(xa, ya); g.quadraticCurveTo(cx, cy, xb, yb); g.stroke();
    const tx = xb - cx, ty = yb - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
    g.fillStyle = 'rgba(226,236,250,0.95)';
    g.beginPath(); g.moveTo(xb + ux * 4, yb + uy * 4); g.lineTo(xb - ux * 18 - uy * 10, yb - uy * 18 + ux * 10); g.lineTo(xb - ux * 18 + uy * 10, yb - uy * 18 - ux * 10); g.closePath(); g.fill();
    g.restore();
    const mx = 0.25 * xa + 0.5 * cx + 0.25 * xb, my = 0.25 * ya + 0.5 * cy + 0.25 * yb;
    kit.draw.text(g, label, mx, my - 12, { size: 44, rgb: [0.9, 0.94, 1], align: 'center', weight: 700 });
  };
  const IN_H = 0.92;
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  inPlate.draw((gg, box) => { const Lo = lay(box); axisRow(gg, box, Lo); line(gg, Lo, 1, IN_H * laser, IR); });
  outPlate.draw((gg, box) => {
    const Lo = lay(box), [pr, pb] = outShares();
    axisRow(gg, box, Lo);
    ghost(gg, Lo, 1, IN_H, IR);
    if (pb < CONV * 0.6) ghost(gg, Lo, 2, IN_H * p2L, SH);   // where the blue line would be
    if (tgt === OFF && pb < CONV * 0.1) {             // without stripes no blue comes out: say so under the arrow
      const none = kit.lang() === 'ja' ? 'ほぼゼロ' : 'almost none';
      kit.draw.text(gg, none, Lo.X(2) - 20, Lo.yb - 12, { size: 22, rgb: [0.62, 0.72, 0.95], align: 'right', weight: 700 });
    }
    line(gg, Lo, 1, IN_H * pr, IR);
    line(gg, Lo, 2, IN_H * pb, SH);
    hop(gg, Lo, 1, IN_H * Math.max(pr, 0.25), 2, IN_H * Math.max(pb, p2L), '×2');
  });
  let sigIn = '', sigOut = '', plateAcc = 0;
  const refreshPlates = dt => {
    plateAcc += dt;
    if (plateAcc < 1 / 12) return;
    plateAcc = 0;
    const lang = kit.lang(), o = outShares();
    const si = `${laser.toFixed(2)}|${lang}`, so = `${o[0].toFixed(3)}|${o[1].toFixed(3)}|${lang}`;
    if (si !== sigIn) { sigIn = si; inPlate.draw(null); }
    if (so !== sigOut) { sigOut = so; outPlate.draw(null); }
  };

  // ---- the story in focus: laser on (the blue grows behind the light), stripes off for a while, back on
  let focused = false, story = 0, idleUser = 0;
  const setStripeLook = amt => {
    stripes.material.opacity = amt; stripes.visible = amt > 0.01;
    arrows.set(smooth(0, 1, amt));
  };

  return {
    anchors: {
      in: [-W / 2 - 1.2, Y + 0.05, 0],
      stripes: [XA + 1.25 * PERIOD, Y + 0.05, -0.42],
      born: [1.6, Y + 0.05, 0],
      out: [W / 2 + 1.2, Y + 0.05, 0],
    },
    controls: [{ id: 'stripes', type: 'toggle', label: kit.written ? 'lstripes' : 'stripes' }],   // (on tab 2 the stripes are light)
    act(id, v) { if (id === 'stripes') { setStripes(!!v); idleUser = 15; story = 0; } },
    value(id) { return id === 'stripes' ? stripesOn : undefined; },
    status() {
      if (starting) return { key: 'status.start', vars: {} };
      return { key: stripesOn ? 'status' : 'status.off', vars: {} };
    },
    focus(on) {
      focused = on; story = 0; idleUser = 0;
      if (on) { stripesOn = true; stripeAmt = 1; setStripeLook(1); sweep(ON, true); }
      else if (!stripesOn) setStripes(true);
    },
    reset() {
      stripesOn = true; stripeAmt = 1; setStripeLook(1); laser = 1; settle(ON);
      events.length = 0; story = 0; idleUser = 0;
    },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      if (focused && idleUser <= 0) {
        const s0 = story;
        story = (story + dt) % CYCLE;
        const crossed = x => (s0 < x && story >= x) || (story < s0 && (s0 < x || story >= x));
        if (crossed(AUTO_OFF)) setStripes(false);
        if (crossed(AUTO_ON)) setStripes(true);
      }
      // stripes fade in or out (the crystal's orientation turns with them)
      const want = stripesOn ? 1 : 0;
      if (stripeAmt !== want) {
        stripeAmt += Math.sign(want - stripeAmt) * Math.min(Math.abs(want - stripeAmt), dt * 1.4 * K);
        setStripeLook(stripeAmt);
      }
      arrows.fade(focused ? 1 : 0, dt);
      if (laser < 1) { laser = Math.min(1, laser + dt * 3); inBeam.set(IR, RED_AIR * laser); }
      if (moving) stepSweep(dt);
      // photons
      clock += dt * K;
      const rate = (tgt === ON ? RATE_ON : RATE_OFF) * K;
      if (nextBirth < clock - 1) nextBirth = clock;
      while (nextBirth <= clock) { spawn(); nextBirth += -Math.log(1 - 0.98 * kit.rand()) / rate; }
      drawDots();
      refreshPlates(dt);
    },
  };
}

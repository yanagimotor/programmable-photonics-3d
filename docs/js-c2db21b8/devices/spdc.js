// Photon-pair source: spontaneous parametric down-conversion (SPDC) in a periodically poled lithium-niobate
// waveguide, like Zhao et al., Physical Review Letters 124, 163603 (2020).
//
// The colour converter (shg.js) run backwards, on a chip that looks the same on purpose (same stripes).  Now and
// then one blue pump photon (frequency 2f) splits into two infrared photons whose frequencies add up to the blue
// one's (f + d and f - d), born at the same instant.  Which blue photon splits, and where, is random; with an
// even pump and even stripes the chance is the same all along the stripes.  The stripes keep the process in step
// (quasi-phase matching), and their spacing decides which pairs of colours come out.  The two photons leave the
// chip together; after it they are drawn going separate ways (in practice a filter splits them by colour), linked
// by a dotted line, and they arrive at the same instant: the pair counter and the Out plate flash together.
// Real chips split fewer than one blue photon in a million; here about one in four (text.note).
// Slow motion slows everything on this chip (photons, flowing light) with one simulated clock.
export const meta = { id: 'spdc', platform: 'ln', category: 'quantum', size: { w: 11, d: 2.6 } };

export const text = {
  en: {
    name: 'Quantum light source',
    tech: 'Spontaneous parametric down-conversion · lithium niobate',
    what: 'Splits photons, the particles of light, into twins.',
    in: 'Blue laser light',
    out: 'Pairs of infrared photons, and the leftover blue light',
    how: 'Now and then, a blue photon splits into two infrared photons, born at the same instant. Their energies add up to the blue photon’s, so their colours sit evenly either side of half the blue’s frequency. The same flipped stripes as in the colour converter keep the process in step.',
    use: 'Quantum communication and quantum computing with light: detecting one photon of a pair tells you the other is there, and pairs can be entangled.',
    fixed: 'The stripe spacing, set when the chip is made, decides which colours the pairs can have: one chip, one pair of colours.',
    c: { in: 'Blue light in', stripes: '', split: 'One photon becomes two', out: 'Twin photons out' },
    ctl: { slow: 'Slow motion' },
    status: '<b>{n}</b> pairs so far. The two photons of a pair are always born together.',
    'status.one': '<b>1</b> pair so far. The two photons of a pair are always born together.',
    'status.slow': 'Slow motion: a blue photon splits into two infrared photons, born at the same instant.',
    ref: 'Zhao et al., Physical Review Letters 124, 163603 (2020): a thin-film lithium-niobate waveguide like this one made high-quality entangled photon pairs at telecom colours.',
    note: 'Real chips split fewer than one blue photon in a million; here about one in four, slowed down, so that you can see it. After the chip the two photons are drawn going separate ways: in practice a filter splits them by colour.',
  },
  ja: {
    name: '量子光源',
    tech: '自発的パラメトリック下方変換・ニオブ酸リチウム',
    what: '光の粒を2つに分けて、ふたごの光子をつくります。量子の光です。',
    in: '青いレーザー光',
    out: '赤外光子のペアと、残った青い光',
    how: 'ときどき、青い光子が二つの赤外光子に分かれます。二つは同じ瞬間に生まれます。二つのエネルギーを足すと元の青い光子のエネルギーになるので、二つの色は、青の周波数のちょうど半分をはさんで等しく離れています。色変換チップと同じ反転の縞が、この過程の足並みをそろえます。',
    use: '光を使った量子通信や量子コンピューターに使われます。ペアの片方を検出すれば、もう片方があることがわかります。ペアをもつれ合わせることもできます。',
    fixed: '縞の間隔はチップを作るときに決まり、それでペアの色も決まります。一つのチップで、一組の色だけです。',
    c: { in: '青い光', stripes: '', split: '光子が2つに分かれる', out: 'ふたごの光子' },
    ctl: { slow: 'スローモーション' },
    status: 'これまでに<b>{n}</b>組。ペアの二つの光子は、いつも一緒に生まれます。',
    'status.one': 'これまでに<b>1</b>組。ペアの二つの光子は、いつも一緒に生まれます。',
    'status.slow': 'スローモーション：青い光子が、同じ瞬間に生まれる二つの赤外光子に分かれます。',
    ref: 'Zhao ほか、Physical Review Letters 124, 163603 (2020)：このような薄膜ニオブ酸リチウム導波路で、通信用の波長の、質の高いもつれた光子ペアをつくりました。',
    note: '実際のチップで分かれる青い光子は、100万個に1個もありません。ここでは見えるように4個に1個ほどにし、ゆっくり描いています。チップを出たあと二つの光子を別々の方向に描いていますが、実際にはフィルターで色ごとに分けます。',
  },
};

const W = meta.size.w, D = meta.size.d;
const Y = 0.085;                               // height of the light (just above the ridge)
const PERIOD = 0.75, NPER = 12;                // the same stripes as the colour converter's
const XA = -4.5, XB = XA + NPER * PERIOD;      // the poled section
const AIR = 2.4;                               // length of the beams in the air
const X0 = -W / 2 - AIR, X1 = W / 2 + AIR;     // where the drawn photons start and end
const V = 2.0;                                 // photon speed (units per simulated second)
const EVERY = 0.32;                            // a blue photon enters about every 0.32 s
const P_SPLIT = 0.24;                          // chance that one splits on the way (real: below one in a million)
const DU = 0.08;                               // the pair's colours: u = +-DU around telecom (kit colour scale)
const DF = DU / 0.82;                          // ... in units of the telecom frequency (u = 0.82 (f - 1))
const PUMP = 1.15, PUMP_AIR = 1.1;             // glow of the blue pump in the chip and in the air
const ZP = 0.095;                              // the two photons ride side by side, this far from the axis
const FLY = 2.2, SPREAD = 1.25;                // after the chip: flight length along x, how far apart they end up
const SLOW = 0.28, AUTO_SLOW = 7.5;            // slow-motion factor; focus story: slow motion for the first 7.5 s
const ZA = 0.4;                                // the row of orientation arrows (in front of the guide)
const STRIPE_W = 0.92, STRIPE_H = 0.02, STRIPE_RGB = 0x66568a;   // poled stripes: across the guide, height, colour

// ------------------------------------------------------------------------------------------------- helpers
// The same helpers as shg.js (the two chips look alike on purpose).  Written here because the kit has no
// alpha-blended light yet (see the kit wishes in planning/build/spdc.md): light nets and photons add up, so red
// photons on blue light turn pink, and blue light on the pale chip turns lavender.
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
  const { colour } = kit;
  const SH = colour.SH, RA = colour.ramp(DU), RB = colour.ramp(-DU);   // the pair: a little above / below telecom
  const LSH = SH.map(toLin);
  const C_PUMP = LSH.map(c => c * 2.4 + 0.3);                         // a blue photon (whiter, to show on the blue light)
  const C_A = RA.map(toLin).map(c => c * 2.6), C_B = RB.map(toLin).map(c => c * 2.6);
  const C_LINK = [1.5, 0.85, 0.9], C_FLASH = [1.25, 0.7, 1.9];     // the split: a short lavender burst
  const K = kit.reduced ? 0.5 : 1;               // less motion: everything at half speed

  kit.chip({ w: W, d: D, platform: 'ln' });
  kit.ridges([kit.P.line(-W / 2, 0, W / 2, 0)], 'ln');
  const stripes = kit.poling({ x0: XA - PERIOD / 4, x1: XB, z: 0, width: STRIPE_W, period: PERIOD, duty: 0.5, color: STRIPE_RGB });
  stripes.scale.y = STRIPE_H / (kit.RIDGE.h + 0.006);   // domains are inside the crystal: flat stripes, the ridge runs over them
  const arrows = domainArrows(kit, { x0: XA, half: PERIOD / 2, count: 2 * NPER, z: ZA, yTop: STRIPE_H + 0.001 });

  const pump = lightBand(kit, { x0: -W / 2, x1: W / 2, y: 0.083, half: 0.2, rgb: SH, s0: 0, sharp: 2.8, order: 7.2 });
  pump.set(() => PUMP);                           // the pump is hardly used up: the same all along
  const inBeam = kit.beam({ from: [X0, Y, 0], to: [-W / 2, Y, 0], rgb: SH, power: PUMP_AIR, r0: 0.085, fade: 'in' });
  const outBeam = kit.beam({ from: [W / 2, Y, 0], to: [X1, Y, 0], rgb: SH, power: PUMP_AIR * 0.6, r0: 0.07, fade: 'out' });
  const dots = dotsLayer(kit, 260);

  // ---- the photons, on one simulated clock (slow motion slows it down)
  const pumps = [], pairs = [], flashes = [];
  let sim = 0, nextPump = 0, count = 0, lastArrival = -99, speed = 1, slow = false;
  const pairZ = (d, x) => (x <= W / 2 ? ZP * smooth(0, 0.35, d) : ZP + SPREAD * Math.min(1, (x - W / 2) / FLY));
  function step(dts) {
    sim += dts;
    while (nextPump <= sim) {
      const xs = kit.rand() < P_SPLIT ? XA + 0.15 + (XB - XA - 0.3) * kit.rand() : null;   // even chance all along the stripes
      pumps.push({ t0: nextPump, xs });
      nextPump += EVERY * (0.6 + 0.8 * kit.rand());
    }
    for (let i = pumps.length - 1; i >= 0; i--) {
      const p = pumps[i], x = X0 + V * (sim - p.t0);
      if (p.xs !== null && x >= p.xs) {             // the blue photon splits: two infrared photons, born together
        const ts = p.t0 + (p.xs - X0) / V;
        pairs.push({ t0: ts, xs: p.xs });
        flashes.push({ t0: ts, x: p.xs, z: 0, kind: 0 });
        pumps.splice(i, 1);
      } else if (x > X1) pumps.splice(i, 1);
    }
    for (let i = pairs.length - 1; i >= 0; i--) {
      const q = pairs[i], x = q.xs + V * (sim - q.t0);
      if (x >= W / 2 + FLY) {                       // both arrive at the same instant
        const ta = q.t0 + (W / 2 + FLY - q.xs) / V, z = ZP + SPREAD;
        flashes.push({ t0: ta, x: W / 2 + FLY, z, kind: 1 }, { t0: ta, x: W / 2 + FLY, z: -z, kind: 2 });
        count++; lastArrival = ta;
        pairs.splice(i, 1);
      }
    }
    for (let i = flashes.length - 1; i >= 0; i--) if (sim - flashes[i].t0 > 0.45) flashes.splice(i, 1);
  }
  // make the next split happen right in front of the visitor (slow motion, the story)
  function forceSplit() {
    let best = null, bd = 1e9;
    for (const p of pumps) {
      const x = X0 + V * (sim - p.t0);
      if (x < XA - 1.6 || x > 0.2) continue;
      const d = Math.abs(x + 0.9);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    const x = X0 + V * (sim - best.t0);
    best.xs = Math.min(XB - 0.3, Math.max(XA + 0.3, x + 0.8));
    for (const p of pumps) if (p !== best && p.xs !== null && Math.abs(p.xs - best.xs) < 1.5 && X0 + V * (sim - p.t0) < p.xs) p.xs = null;
  }
  function warm() {                                  // start with the chip already working
    pumps.length = 0; pairs.length = 0; flashes.length = 0; sim = 0; nextPump = 0;
    for (let i = 0; i < 160; i++) step(0.05);
    count = 0; lastArrival = -99;
  }
  warm();

  function draw() {
    dots.begin();
    const yP = Y + 0.035;
    for (const p of pumps) {
      const x = X0 + V * (sim - p.t0);
      const a = x < -W / 2 ? smooth(X0, X0 + 0.9, x) : x > W / 2 ? 1 - smooth(W / 2 + 0.35 * AIR, X1, x) : 1;
      dots.add(x, yP, 0, C_PUMP, 0.9 * a, 0.12);
    }
    for (const q of pairs) {
      const d = V * (sim - q.t0), x = q.xs + d, z = pairZ(d, x);
      dots.add(x, yP, z, C_A, 1, 0.2);
      dots.add(x, yP, -z, C_B, 1, 0.2);
      if (z > 0.22) { const n = Math.min(10, Math.round(z * 8)); for (let k = 1; k < n; k++) dots.add(x, yP, z - 2 * z * k / n, C_LINK, 0.75, 0.075); }   // the pair's link
    }
    for (const f of flashes) {
      const k = (sim - f.t0) / 0.45;
      if (k < 0 || k > 1) continue;
      if (f.kind === 0) dots.add(f.x, yP, 0, C_FLASH, 1 - k, 0.4 * (1 - 0.5 * k));
      else dots.add(f.x, yP, f.z, f.kind === 1 ? C_A : C_B, 1 - k, 0.5 * (1 - 0.5 * k));
    }
    dots.end();
  }
  draw();

  // ---- plates: the same frequency axis as the colour converter's (from zero); the pair sits either side of half
  // the blue's frequency, and both lines flash when a pair arrives
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
  const line = (g, Lo, f, hh, rgb, w = 17) => {
    if (hh < 0.01) return;
    const x = Lo.X(f);
    g.save(); g.lineCap = 'round';
    g.strokeStyle = css(rgb); g.lineWidth = w; g.shadowColor = css(rgb, 0.9); g.shadowBlur = 20;
    g.beginPath(); g.moveTo(x, Lo.yb - 9); g.lineTo(x, Lo.yb - Math.max(11, hh * Lo.hmax)); g.stroke();
    g.restore();
  };
  const ghost = (g, Lo, f, hh, rgb) => {
    const x = Lo.X(f), y1 = Lo.yb - hh * Lo.hmax;
    g.save(); g.setLineDash([8, 7]); g.strokeStyle = css(rgb, 0.7); g.lineWidth = 3;
    g.strokeRect(x - 12, y1 - 3, 24, Lo.yb - 2 - y1); g.restore();
  };
  const arrow = (g, xa, ya, xb, yb, lift) => {       // a curved arrow from (xa, ya) to (xb, yb)
    const cx = (xa + xb) / 2, cy = Math.min(ya, yb) - lift;
    g.save(); g.strokeStyle = 'rgba(226,236,250,0.85)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(xa, ya); g.quadraticCurveTo(cx, cy, xb, yb); g.stroke();
    const tx = xb - cx, ty = yb - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl;
    g.fillStyle = 'rgba(226,236,250,0.95)';
    g.beginPath(); g.moveTo(xb + ux * 4, yb + uy * 4); g.lineTo(xb - ux * 18 - uy * 10, yb - uy * 18 + ux * 10); g.lineTo(xb - ux * 18 + uy * 10, yb - uy * 18 - ux * 10); g.closePath(); g.fill();
    g.restore();
  };
  const IN_H = 0.92, BASE = 0.42;
  const flashLevel = () => (sim >= lastArrival ? Math.exp(-(sim - lastArrival) / 0.5) : 0);
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  inPlate.draw((g, box) => { const Lo = lay(box); axisRow(g, box, Lo); line(g, Lo, 2, IN_H, SH); });
  outPlate.draw((g, box) => {
    const Lo = lay(box), fl = flashLevel(), h = BASE + (IN_H - BASE) * fl;
    axisRow(g, box, Lo);
    ghost(g, Lo, 2, IN_H, SH);                       // where the blue photon came from ...
    const xa = Lo.X(2) - 10, ya = Lo.yb - IN_H * Lo.hmax - 4;
    arrow(g, xa, ya, Lo.X(1 + DF) + 4, Lo.yb - h * Lo.hmax - 16, 44);   // ... split into the two
    arrow(g, xa, ya, Lo.X(1 - DF) + 2, Lo.yb - h * Lo.hmax - 16, 70);
    line(g, Lo, 1 - DF, h, RB, 15);
    line(g, Lo, 1 + DF, h, RA, 15);
    const n = count, label = kit.lang() === 'ja' ? `${n}組` : n === 1 ? '1 pair' : `${n} pairs`;
    if (n > 0) kit.draw.text(g, label, box.x + box.w, box.y - 23, { size: 34, rgb: [0.93, 0.95, 0.97], align: 'right', weight: 700 });   // ('0 pairs' read wrong while pairs were flying)
  });
  let sigOut = '', plateAcc = 0, lang0 = '';
  const refreshPlates = dt => {
    plateAcc += dt;
    if (plateAcc < 1 / 12) return;
    plateAcc = 0;
    const lang = kit.lang(), so = `${count}|${flashLevel().toFixed(2)}|${lang}`;
    if (so !== sigOut) { sigOut = so; outPlate.draw(null); }
    if (lang !== lang0) { lang0 = lang; inPlate.draw(null); }
  };

  // ---- the story in focus: slow motion first, with one split right in front of you, then normal speed
  let story = -1, forced = false, idleUser = 0, focused = false;
  const flowAt = v => {
    pump.uniforms.uFlow.value = 1.6 * v;
    inBeam.uniforms.uFlow.value = 1.6 * v; outBeam.uniforms.uFlow.value = 1.6 * v;
  };

  return {
    anchors: {
      in: [-W / 2 - 1.2, Y + 0.05, 0],
      stripes: [XA + 1.25 * PERIOD, Y + 0.05, -0.42],
      split: [-0.4, Y + 0.05, 0],
      out: [W / 2 + 1.4, Y + 0.05, 0],
    },
    controls: [{ id: 'slow', type: 'toggle' }],
    act(id, v) {
      if (id !== 'slow') return;
      slow = !!v; idleUser = 15; story = -1;
      if (slow) forceSplit();
    },
    value(id) { return id === 'slow' ? slow : undefined; },
    status() {
      if (slow) return { key: 'status.slow', vars: { n: count } };
      return { key: count === 1 ? 'status.one' : 'status', vars: { n: count } };
    },
    focus(on) {
      idleUser = 0; focused = on;
      if (on) { count = 0; lastArrival = -99; slow = true; story = 0; forced = false; }
      else { slow = false; story = -1; }
    },
    reset() { slow = false; speed = 1; story = -1; idleUser = 0; warm(); flowAt(K); draw(); },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      if (story >= 0) {
        story += dt;
        if (!forced && story > 0.7) { forced = true; forceSplit(); }
        if (story > AUTO_SLOW) { slow = false; story = -1; }
      }
      const want = slow ? SLOW : 1;
      speed += (want - speed) * Math.min(1, dt * 5);
      if (Math.abs(want - speed) < 1e-3) speed = want;
      flowAt(speed * K);
      arrows.fade(focused ? 1 : 0, dt);
      step(dt * speed * K);
      draw();
      refreshPlates(dt);
    },
  };
}

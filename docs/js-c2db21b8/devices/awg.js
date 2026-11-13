// Spectrometer: an arrayed waveguide grating (AWG) on silica glass, the planar "prism" proposed around 1990 (Smit,
// Takahashi et al. at NTT, Dragone) and made by NTT into the silica chips used in fibre networks (an IEEE Milestone).
//
// Light enters on one guide and fans out in a first slab (star coupler 1).  It feeds an array of 12 curved guides
// whose lengths increase in exactly equal steps (L_i = L0 + i * DL: straight + arc + straight, solved below), and
// gathers again in a second slab (star coupler 2).  The equal steps give every colour a phase step from one guide
// to the next that depends on its frequency; in the second slab this tilts the converging wave, so each colour comes
// to a focus at its own point on the far edge, where the eight exit guides start.
//
// Model: the focus moves along the exit arc in proportion to the frequency, p(u) = u / DU (in exit spacings; the
// direction follows from the geometry: higher frequencies focus towards the long, outer guides, i.e. the back).
// Exit k collects the light focused near it with a Gaussian passband (SIG exit spacings): the exits' powers are the
// spectrum integrated over each passband, as a real AWG spectrometer measures it.  The light in the slabs is drawn
// by a small shader: one cone per exit band (plus one for the laser), converging on that colour's focus, brighter
// towards it, drawn as rays from the guide ends (the ray picture of a lens).  Coloured photons follow the colours.
export const meta = { id: 'awg', platform: 'silica', category: 'sense', size: { w: 9.5, d: 6.6 } };

export const text = {
  en: {
    name: 'Spectrometer',
    tech: 'Arrayed waveguide grating (AWG) · silica glass',
    what: 'Splits light into its colours, like a prism.',
    in: 'Light of many colours, in one waveguide',
    out: 'Eight exits, each with its own band of colours',
    how: 'The light fans out and enters a bundle of curved guides, each a little longer than the last. These equal steps of delay tilt the waves of each colour by a different amount, so when the light gathers again, every colour comes to a focus on its own exit.',
    use: 'Fibre-optic networks worldwide, where it separates the colours that share one fibre; NTT’s silica version was named an IEEE Milestone in 2026.',
    fixed: 'The lengths of the curved guides, etched once, decide which colour goes to which exit. To sort other colours, you need another chip.',
    c: { in: 'Many colours in', sc1: '', array: 'Paths of different lengths', sc2: '', out: 'One colour per exit' },
    ctl: { source: 'Light in' },
    opt: { source: { white: 'White lamp', gas: 'Lamp through a gas', laser: 'One-colour laser' } },
    status: 'White light in: every exit receives its own colour, a rainbow in eight bars.',
    'status.gas': 'Light through a gas: exits <b>{a}</b> and <b>{b}</b> stay dark. The gas absorbed those colours.',
    'status.laser': 'One colour at a time: the light leaves through exit <b>{k}</b>.',
    ref: 'Takahashi et al. (NTT), Electronics Letters 26, 87 (1990): one of the first arrayed waveguide gratings, sorting colours about a nanometre apart.',
    note: 'Real AWGs separate colours less than a nanometre apart, often in 40 channels or more; here eight channels are spread over the rainbow. The dots show which colour goes where.',
  },
  ja: {
    name: '分光器',
    tech: 'アレイ導波路回折格子（AWG）・石英ガラス',
    what: 'プリズムのように、光を色ごとに分けます。',
    in: '多くの色が混ざった光（導波路1本）',
    out: '8つの出口。それぞれに一つの色の帯',
    how: '光は扇形に広がり、少しずつ長くなる曲がった導波路の束に入ります。この等しい長さの差による遅れが、色ごとに違う角度で波を傾けます。そのため、光が再び集まるとき、どの色も自分の出口に焦点を結びます。',
    use: '世界中の光ファイバー網で、1本のファイバーを共有する多くの色を分けています。NTTの石英製AWGは、2026年にIEEEマイルストーンに認定されました。',
    fixed: '一度刻んだ導波路の長さが、どの色がどの出口へ行くかを決めています。別の色を分けたいなら、別のチップが必要です。',
    c: { in: 'いろいろな色の光', sc1: '', array: '長さの違う道', sc2: '', out: '出口ごとに一つの色' },
    ctl: { source: '入れる光' },
    opt: { source: { white: '白色ランプ', gas: 'ガスを通した光', laser: '色を選べるレーザー' } },
    status: '白色光：どの出口にも自分の色が届き、8本の棒で虹になります。',
    'status.gas': 'ガスを通した光：出口<b>{a}</b>と<b>{b}</b>は暗いまま。ガスがその色を吸収しました。',
    'status.laser': '一度に一つの色：光は出口<b>{k}</b>から出ていきます。',
    ref: 'Takahashi ほか（NTT）、Electronics Letters 26, 87 (1990)：約1' + ' ' + 'nm離れた色を分けた、最初期のアレイ導波路回折格子。',
    note: '実際のAWGは1' + ' ' + 'nmに満たない間隔の色を分け、40チャンネル以上のものも普通です。ここでは8チャンネルを虹の色に広げ、点でどの色がどこへ行くかを示しています。',
  },
};

const W = meta.size.w, D = meta.size.d;
const Y = 0.085;                                    // height of the light (just above the ridges)
// layout, in the top view (X = x, Yt = -z: +Yt is the back of the chip)
const F1 = [-3.3, -1.6];                            // input focal point of star coupler 1 (F2 is its mirror image)
const R = 2.1;                                      // focal length of both star couplers
const A0 = 58 * Math.PI / 180;                      // axis of star coupler 1 (from +x towards the back)
const N = 12, PA = 0.14;                            // array guides and their pitch where they meet the slabs
const L0 = 3.49, DL = 0.428;                        // array lengths: L_i = L0 + i * DL (equal steps)
const NE = 8, PE = 0.2;                             // exits and their pitch on the exit arc
const EXIT_PITCH = 0.24, YO = -2.3, REX = 1.0;      // exits at the right edge: pitch, centre, bend radius
const RIN = 1.5;                                    // bend radius of the input guide
// colours: exit k (0 = exit 1, red) receives u = k * DU; the plates' colour axis runs from U_LO to U_HI
const DU = 0.8 / 7, U_LO = -DU / 2, U_HI = 0.8 + DU / 2;
const SIG = 0.25;                                   // passband of one exit, in exit spacings (Gaussian sigma)
const NS = 96;                                      // samples of the spectrum (exit powers)
const NC = NE;                                      // light cones drawn for a broad spectrum (one per exit band)
const MAXC = NC + 1;                                // + the laser
const FADE = 0.6;                                   // seconds to change the light source
const DWELL = 0.5, GLIDE = 0.35;                     // laser: rests on each exit, then glides to the next
const T_UP = NE * DWELL + (NE - 1) * GLIDE;         // laser: one pass from exit 1 to exit 8
const CYCLE = [['white', 5.0], ['gas', 4.5], ['laser', T_UP + 0.4]];   // about 16 s: one round per tour stop (17 s)
const GAS = [2, 5];                                 // the gas absorbs the colours of exits 3 and 6
const SPEED = 3.2;                                  // photons, scene units per second

const SLAB_VS = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// light in a slab: cones of light, each converging on (or diverging from) its tip Q, Gaussian across the cone;
// its brightness grows as the cone narrows (the same light through a narrower width), up to uG times.  Inside a
// cone the light is drawn as rays, one through each array guide's end (the ray picture of a lens), which merge
// into a smooth glow where they would be closer than a few pixels; the waves (dashes) of the guides continue
// along the rays
const SLAB_FS = /* glsl */ `
#define MAXC ${MAXC}
uniform vec2 uQ[MAXC]; uniform vec2 uB[MAXC]; uniform float uT[MAXC]; uniform float uG[MAXC]; uniform vec3 uC[MAXC];
uniform int uN;
uniform float uTime, uFlow, uDash, uWave, uDim, uSign, uS0, uWap, uSpot, uProf, uRays, uRayOff;
varying vec2 vP;
void main() {
  float px = length(fwidth(vP));                  // size of a pixel here, in scene units
  vec3 col = vec3(0.0);
  for (int j = 0; j < MAXC; j++) {
    if (j >= uN) break;
    vec2 v = vP - uQ[j];
    float along = dot(v, uB[j]);
    if (along <= -0.02) continue;
    float across = uB[j].x * v.y - uB[j].y * v.x;
    float hw = max(along * uT[j], 0.5 * uSpot);
    float x = across / hw;
    float prof = exp(-uProf * x * x) * (1.0 - smoothstep(0.85, 1.1, abs(x)));
    float gain = min(uG[j], uWap / (2.0 * hw));
    float q = x * uRays + uRayOff, d = abs(q - floor(q + 0.5)), aa = uRays * px / hw;
    float ray = mix(0.25 + 2.2 * (1.0 - smoothstep(0.08, 0.08 + aa, d)), 1.0, smoothstep(0.18, 0.45, aa));
    float ph = fract((uS0 + uSign * length(v) - uTime * uFlow) / uDash);
    float pulse = mix(1.0, 0.38 + 0.62 * pow(0.5 + 0.5 * cos(6.2831853 * ph), 1.5), uWave);
    col += uC[j] * prof * gain * pulse * ray;
  }
  gl_FragColor = vec4(col * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function create(kit) {
  const { P, colour, THREE } = kit;
  const ramp = colour.ramp;
  const LY = kit.RIDGE.h + 0.012;                   // height of the light bands (as kit.lightNet)
  const xz = ([X, Yt]) => [X, -Yt];
  const path = pts => new P.Path(pts.map(xz));
  kit.chip({ w: W, d: D, platform: 'silica' });

  // ---------------------------------------------------------------- geometry (top view, then x/z)
  const da = PA / R;
  const alph = Array.from({ length: N }, (_, i) => A0 + (i - (N - 1) / 2) * da);
  const A = alph.map(a => [F1[0] + R * Math.cos(a), F1[1] + R * Math.sin(a)]);        // array starts (slab 1)
  const F2 = [-F1[0], F1[1]];
  const M1 = [F1[0] + R * Math.cos(A0), F1[1] + R * Math.sin(A0)], M2 = [-M1[0], M1[1]];
  // array guide i: straight t, arc of radius r turning by 2a, straight t (mirror symmetric about x = 0)
  const arr = alph.map((a, i) => {
    const L = L0 + i * DL, Ax = A[i][0], Ay = A[i][1];
    const r = (L - 2 * (-Ax) / Math.cos(a)) / (2 * (a - Math.tan(a)));
    const t = Math.max(0, (-Ax - r * Math.sin(a)) / Math.cos(a));
    const pts = [];
    const nS = Math.max(1, Math.ceil(t / 0.1));
    for (let k = 0; k <= nS; k++) pts.push([Ax + t * k / nS * Math.cos(a), Ay + t * k / nS * Math.sin(a)]);
    const Bx = Ax + t * Math.cos(a), By = Ay + t * Math.sin(a), Cx = Bx + r * Math.sin(a), Cy = By - r * Math.cos(a);
    const nA = Math.ceil(2 * a * r / 0.04);
    for (let k = 1; k <= nA; k++) { const th = a - 2 * a * k / nA; pts.push([Cx - r * Math.sin(th), Cy + r * Math.cos(th)]); }
    for (let k = 1; k <= nS; k++) pts.push([-Bx + t * k / nS * Math.cos(a), By - t * k / nS * Math.sin(a)]);
    return { path: path(pts), L, top: Cy + r, end: [-Ax, Ay] };
  });
  // exit arc: centred on M2, through F2; exit k at angle -A0 + phi_k (k = 7, the bluest, nearest the back)
  const de = PE / R;
  const phiOf = p => (p - (NE - 1) / 2) * de;
  const onArc = p => [M2[0] + R * Math.cos(-A0 + phiOf(p)), M2[1] + R * Math.sin(-A0 + phiOf(p))];
  const E = Array.from({ length: NE }, (_, k) => onArc(k));
  const yEdge = k => YO + (k - (NE - 1) / 2) * EXIT_PITCH;
  const exits = E.map((e, k) => {
    const b = -A0 + phiOf(k), yf = yEdge(k);
    const s = Math.max(0, (e[1] - REX * (1 - Math.cos(b)) - yf) / Math.abs(Math.sin(b)));
    const pts = [];
    const nS = Math.max(1, Math.ceil(s / 0.1));
    for (let q = 0; q <= nS; q++) pts.push([e[0] + s * q / nS * Math.cos(b), e[1] + s * q / nS * Math.sin(b)]);
    const Px = e[0] + s * Math.cos(b), Py = e[1] + s * Math.sin(b), Cx = Px - REX * Math.sin(b), Cy = Py + REX * Math.cos(b);
    const nA = Math.ceil(Math.abs(b) * REX / 0.04);
    for (let q = 1; q <= nA; q++) { const th = b - b * q / nA; pts.push([Cx + REX * Math.sin(th), Cy - REX * Math.cos(th)]); }
    pts.push([W / 2, yf]);
    return { path: path(pts), z: -yf };
  });
  // input: straight from the left edge, then a bend up into F1, arriving along the slab's axis
  const yIn = F1[1] - RIN * (1 - Math.cos(A0)), xs = F1[0] - RIN * Math.sin(A0);
  const inPts = [[-W / 2, yIn]];
  for (let q = 0; q <= 40; q++) { const th = A0 * q / 40; inPts.push([xs + RIN * Math.sin(th), yIn + RIN * (1 - Math.cos(th))]); }
  const inPath = path(inPts), zIn = -yIn;

  // the star couplers (slabs): confocal, bounded by an arc around the other side's focus
  const arcPts = (c, r, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, q) => { const a = a0 + (a1 - a0) * q / n; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; });
  const m = 0.75 * da, ei = 0.2 / R, em = 3.9 * de;
  const sc1 = [...arcPts(M1, R, A0 + Math.PI - ei, A0 + Math.PI + ei, 6), ...arcPts(F1, R + 0.03, alph[0] - m, alph[N - 1] + m)];
  const sc2 = [...arcPts(M2, R, -A0 - em, -A0 + em, 16), ...arcPts(F2, R + 0.03, Math.PI - alph[N - 1] - m, Math.PI - alph[0] + m)];
  // kit.slab would paint them in the pale ridge colour, on which their light cannot show: a darker, glassy slab
  // lets the light inside them be seen (kit wish: a material option for kit.slab)
  const slabMat = kit.mat.std(0x3c5263, { roughness: 0.28, metalness: 0.1 });
  for (const poly of [sc1, sc2]) {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([X, Yt]) => new THREE.Vector2(X, Yt))), { depth: kit.RIDGE.h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(g, slabMat);
    mesh.receiveShadow = true;
    kit.group.add(mesh);
  }
  // kit.ridges winds its triangles inwards (faces pointing into the ridge), so the double-sided ridge material
  // shades the tops as if lit from below: nearly black.  If the first (top) triangle faces down, flip the winding
  // of the whole mesh (kit bug, reported; the check keeps this right once the kit is fixed).
  const faceOut = m => {
    const ix = m.geometry.index, p = m.geometry.attributes.position, a = ix.getX(0), b = ix.getX(1), c = ix.getX(2);
    const ny = (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a)) - (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a));
    if (ny < 0) { for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); } ix.needsUpdate = true; }
    return m;
  };
  // the guides in the same darker core glass as the slabs (on the pale ridge colour the light's colour washes out)
  faceOut(kit.ridges([inPath, ...arr.map(g => g.path), ...exits.map(g => g.path)], 'silica')).material = slabMat;

  // ---------------------------------------------------------------- light: guides, slabs, beams, photons
  const net = kit.lightNet({ width: 0.28 });
  const sIn = net.add(inPath, { s0: 0 });
  const sArr = arr.map(g => net.add(g.path, { s0: inPath.len + R, width: 0.22 }));
  const sTip = inPath.len + R + L0 + DL * (N - 1) / 2 + R;
  const sExit = exits.map(g => net.add(g.path, { s0: sTip, width: 0.24 }));
  net.build();

  const slabLight = (poly, sign, s0, profile) => {
    const shape = new THREE.Shape(poly.map(([X, Yt]) => new THREE.Vector2(X, Yt)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, LY, 0);
    const u = {
      uQ: { value: new Float32Array(2 * MAXC) }, uB: { value: new Float32Array(2 * MAXC) }, uT: { value: new Float32Array(MAXC) },
      uG: { value: new Float32Array(MAXC) }, uC: { value: new Float32Array(3 * MAXC) }, uN: { value: 0 },
      uTime: { value: 0 }, uFlow: { value: net.flow }, uDash: { value: 0.9 }, uWave: { value: 0.55 }, uDim: { value: 1 },
      uSign: { value: sign }, uS0: { value: s0 }, uWap: { value: N * PA }, uSpot: { value: 0.11 }, uProf: { value: profile },
      uRays: { value: 1 }, uRayOff: { value: (N - 1) / 2 },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SLAB_VS, fragmentShader: SLAB_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 6; mesh.frustumCulled = false;
    kit.group.add(mesh);
    return u;
  };
  const L1 = slabLight(sc1, 1, inPath.len, 1.6), L2 = slabLight(sc2, -1, sTip, 2.0);
  kit.onTick((dt, t, dim) => { for (const u of [L1, L2]) { u.uTime.value = t; u.uDim.value = dim; } });
  // one cone j: tip Q (top view), opening towards the given ends (top view), tip gain G, colour x power
  const cone = (u, j, Q, e0, e1, G, rgb, power) => {
    const q = xz(Q), a = xz(e0), b = xz(e1);
    let ax = a[0] - q[0], az = a[1] - q[1], bx = b[0] - q[0], bz = b[1] - q[1];
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    ax /= la; az /= la; bx /= lb; bz /= lb;
    let cx = ax + bx, cz = az + bz; const lc = Math.hypot(cx, cz); cx /= lc; cz /= lc;
    const half = Math.acos(Math.min(1, ax * cx + az * cz)) + 0.6 * PA / R;
    u.uQ.value[2 * j] = q[0]; u.uQ.value[2 * j + 1] = q[1];
    u.uB.value[2 * j] = cx; u.uB.value[2 * j + 1] = cz;
    u.uT.value[j] = Math.tan(half); u.uG.value[j] = G;
    const L = colour.lin(rgb), k = 1.6 * power;
    u.uC.value[3 * j] = L[0] * k; u.uC.value[3 * j + 1] = L[1] * k; u.uC.value[3 * j + 2] = L[2] * k;
    return half;
  };
  const ends2 = [arr[0].end, arr[N - 1].end];
  // rays: seen from a slab's focus the guide ends are evenly spaced in angle (da), and the cone's edge lies at
  // x = 1, so guide i sits at x = (i - (N - 1) / 2) * da / half
  L1.uRays.value = cone(L1, 0, F1, A[0], A[N - 1], 1, [1, 1, 1], 0) / da;
  L2.uRays.value = cone(L2, 0, F2, ends2[0], ends2[1], 1, [1, 1, 1], 0) / da;

  const inBeam = kit.beam({ from: [-W / 2 - 2.4, Y, zIn], to: [-W / 2, Y, zIn], rgb: [1, 1, 1], power: 1, r0: 0.08, fade: 'in' });
  const outBeams = exits.map(g => kit.beam({ from: [W / 2, Y, g.z], to: [W / 2 + 2.4, Y, g.z], rgb: [1, 1, 1], power: 0, r0: 0.07, fade: 'out' }));
  const photons = kit.photons({ max: 160, size: 0.15 });

  // ---------------------------------------------------------------- the model: spectra, exits, focus
  const uOfP = p => p * DU;                                   // colour that focuses at exit position p
  const xOfU = u => (u - U_LO) / (U_HI - U_LO);               // plate axis
  const SU = Float32Array.from({ length: NS }, (_, i) => U_LO + (U_HI - U_LO) * (i + 0.5) / NS);
  const lamp = u => 0.8 + 0.2 * Math.exp(-(((u - 0.32) / 0.38) ** 2));
  const gasLine = u => GAS.reduce((s, k) => s * (1 - 0.95 * Math.exp(-(((u - k * DU) / 0.05) ** 2))), 1);
  const SPEC = {
    white: { S: Float32Array.from(SU, u => lamp(u)), laser: 0 },
    gas: { S: Float32Array.from(SU, u => lamp(u) * gasLine(u)), laser: 0 },
    laser: { S: new Float32Array(NS), laser: 1 },
  };
  const pass = (p, k) => Math.exp(-((p - k) ** 2) / (2 * SIG * SIG));
  // weights: exit k sees sample i with pass(p(u_i), k), normalised so that a flat spectrum gives 1
  const WK = Array.from({ length: NE }, (_, k) => { const w = Float32Array.from(SU, u => pass(u / DU, k)); const s = w.reduce((a, b) => a + b, 0); return w.map(v => v / s); });
  const exitRGB = Array.from({ length: NE }, (_, k) => ramp(k * DU));

  // state
  let src = 'white', from = SPEC.white, fade = 1;
  const S = Float32Array.from(SPEC.white.S);
  let wl = 0, tau = 0, pL = 0;                                 // laser weight, its program time, its focus (exits)
  let cyc = 0, cycT = 0, idleUser = 0, emitAcc = 0;
  const Pk = new Float32Array(NE), PkC = new Float32Array(NE);
  let mixRGB = [1, 1, 1];
  const laserP = s => {                                       // dwell-and-glide over the exits, up then down
    const per = DWELL + GLIDE, up = s % (2 * T_UP), dir = up < T_UP ? 1 : -1, w = dir > 0 ? up : up - T_UP;
    const k = Math.min(NE - 1, Math.floor(w / per)), rem = w - k * per;
    const f = rem < DWELL || k >= NE - 1 ? 0 : (rem - DWELL) / GLIDE;
    const p = k + f * f * (3 - 2 * f);
    return dir > 0 ? p : NE - 1 - p;
  };
  const setSource = id => {
    if (!SPEC[id] || id === src) return;
    from = { S: Float32Array.from(S), laser: wl };
    src = id; fade = 0;
    if (id === 'laser') { tau = 0; photons.clear(); }
  };

  function compute() {
    const to = SPEC[src], f = fade * fade * (3 - 2 * fade);
    let sum = 0;
    for (let i = 0; i < NS; i++) { S[i] = from.S[i] + (to.S[i] - from.S[i]) * f; sum += S[i]; }
    wl = from.laser + (to.laser - from.laser) * f;
    const uL = uOfP(pL), rgbL = ramp(uL);
    for (let k = 0; k < NE; k++) {
      let c = 0; const w = WK[k];
      for (let i = 0; i < NS; i++) c += w[i] * S[i];
      PkC[k] = c;
      Pk[k] = c + wl * pass(pL, k);
    }
    // what goes in: all colours at once (white, as the table paints a mixture), and the laser's colour
    mixRGB = colour.mix([[colour.WHITE, sum / NS + 1e-6], [rgbL, wl]]);
    const pin = Math.min(1, sum / NS + wl);
    inBeam.set(mixRGB, pin);
    net.set(sIn, mixRGB, 1.05 * pin);
    arr.forEach((g, i) => net.set(sArr[i], mixRGB, pin * (0.42 + 0.58 * Math.exp(-(((i - (N - 1) / 2) / 3.6) ** 2)))));
    // slab 1: one cone from F1 to the array
    cone(L1, 0, F1, A[0], A[N - 1], 1.5, mixRGB, 0.42 * pin);
    L1.uN.value = 1;
    // slab 2: one cone per exit for the broad part of the light (the band that exit collects), and one for the laser
    for (let k = 0; k < NC; k++) cone(L2, k, E[k], ends2[0], ends2[1], 15, exitRGB[k], 0.075 * PkC[k]);
    cone(L2, NC, onArc(pL), ends2[0], ends2[1], 5, rgbL, 0.5 * wl);
    L2.uN.value = MAXC;
    // exits and beams out
    for (let k = 0; k < NE; k++) {
      const c = colour.mix([[exitRGB[k], PkC[k] + 1e-6], [rgbL, wl * pass(pL, k)]]);
      const p = Math.min(1.6, PkC[k] * 1.1 + wl * pass(pL, k) * 1.6);
      net.set(sExit[k], c, p);
      outBeams[k].set(c, p * 0.95);
    }
  }
  compute();

  // photons: each follows one colour of the lamp's light, through one array guide, to the exit for its colour (only
  // for the lamp: real light crosses the chip in picoseconds, but these dots take seconds, so with the laser changing
  // its colour they would lag behind it and show colours that are no longer there)
  const line = (a, b) => { const p = xz(a), q = xz(b), L = Math.hypot(q[0] - p[0], q[1] - p[1]); return { len: L, at: s => [p[0] + (q[0] - p[0]) * s / L, p[1] + (q[1] - p[1]) * s / L] }; };
  const beamIn = { len: 2.4, at: s => [-W / 2 - 2.4 + s, zIn] };
  const beamOut = exits.map(g => ({ len: 2.4, at: s => [W / 2 + s, g.z] }));
  const wArr = Array.from({ length: N }, (_, i) => 0.42 + 0.58 * Math.exp(-(((i - (N - 1) / 2) / 3.6) ** 2)));
  const pick = ws => { let s = 0; for (const w of ws) s += w; let r = kit.rand() * s; for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; } return ws.length - 1; };
  function emit() {
    const k = pick(PkC), p = k + (kit.rand() - 0.5) * 0.3, rgb = ramp(uOfP(p));
    const i = pick(wArr), lands = Math.abs(p - k) < 0.3;
    const Q = onArc(p);
    const parts = [beamIn, inPath, line(F1, A[i]), arr[i].path, line(arr[i].end, Q)];
    if (lands) parts.push(exits[k].path, beamOut[k]);
    const cum = [0];
    for (const q of parts) cum.push(cum[cum.length - 1] + q.len);
    const len = cum[cum.length - 1];
    photons.emit({
      along: u => {
        const s = u * len; let j = 0;
        while (j < parts.length - 1 && s > cum[j + 1]) j++;
        const q = parts[j].at(s - cum[j]);
        return [q[0], Y + 0.03, q[1]];
      },
      dur: len / (SPEED * (kit.reduced ? 0.5 : 1)), rgb, power: 1.1, size: 0.15, fade: 0.06,
    });
  }

  // ---------------------------------------------------------------- plates
  // the colour axis along the bottom of a plate with its word under it, kept inside the plate (kit.draw.axis puts
  // the word below the canvas on plates of this size); returns the area above the axis
  const axisIn = (g, box, word) => {
    const fs = Math.round(box.h * 0.14), y = box.y + box.h - fs - 8;
    g.save();
    g.strokeStyle = 'rgba(160,185,210,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(box.x, y); g.lineTo(box.x + box.w, y); g.stroke();
    g.beginPath(); g.moveTo(box.x + box.w, y); g.lineTo(box.x + box.w - 11, y - 6); g.lineTo(box.x + box.w - 11, y + 6); g.closePath();
    g.fillStyle = 'rgba(160,185,210,0.7)'; g.fill();
    g.restore();
    if (word) kit.draw.text(g, word, box.x + box.w, box.y + box.h, { size: fs, rgb: [0.62, 0.68, 0.74], align: 'right', weight: 600 });
    return { x: box.x, y: box.y, w: box.w, h: y - box.y };
  };
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  inPlate.live((g, box0) => {
    const box = axisIn(g, box0, kit.word('colour'));
    const at = x => { const i = Math.min(NS - 1, Math.max(0, Math.round(x * NS - 0.5))); return S[i]; };
    const cont = S.reduce((a, b) => a + b, 0) / NS;
    if (cont > 0.02) kit.draw.curve(g, box, x => 0.92 * at(x), { rgbAt: x => ramp(U_LO + (U_HI - U_LO) * x), axisWord: false });
    if (wl > 0.02) kit.draw.spectrum(g, box, [{ u: xOfU(uOfP(pL)), h: 0.95 * wl, rgb: ramp(uOfP(pL)), w: 9 }], { axisWord: false });
  }, 10);
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  const LABELS = Array.from({ length: NE }, (_, k) => String(k + 1));
  outPlate.live((g, box) => {
    const vals = Array.from(Pk), hi = wl > 0.5 ? Math.round(Math.min(NE - 1, Math.max(0, pL))) : -1;
    kit.draw.bars(g, box, vals, { labels: LABELS, rgbs: exitRGB, max: 1.05, highlight: hi });
  }, 10);

  // ---------------------------------------------------------------- interface
  const sc1c = [F1[0] + 0.6 * R * Math.cos(A0), F1[1] + 0.6 * R * Math.sin(A0)];
  const sc2c = [F2[0] - 0.64 * R * Math.cos(A0), F2[1] + 0.64 * R * Math.sin(A0)];
  const midArr = arr[Math.round(N * 0.66)];
  const startCycle = () => { cyc = 0; cycT = 0; setSource(CYCLE[0][0]); };
  return {
    anchors: {
      in: [-W / 2 - 1.3, Y + 0.05, zIn],
      sc1: [sc1c[0], Y + 0.05, -sc1c[1]],
      array: [0, Y + 0.05, -midArr.top],
      sc2: [sc2c[0], Y + 0.05, -sc2c[1]],
      out: [W / 2 + 1.8, Y + 0.05, exits[NE - 1].z],
    },
    controls: [{ id: 'source', type: 'choice', options: ['white', 'gas', 'laser'] }],
    act(id, v) {
      if (id !== 'source' || !SPEC[v]) return;
      setSource(v); idleUser = 15;
      cyc = CYCLE.findIndex(c => c[0] === v); cycT = 0;
    },
    value(id) { return id === 'source' ? src : undefined; },
    status() {
      if (src === 'gas') return { key: 'status.gas', vars: { a: GAS[0] + 1, b: GAS[1] + 1 } };
      if (src === 'laser') return { key: 'status.laser', vars: { k: Math.round(Math.min(NE - 1, Math.max(0, pL))) + 1 } };
      return { key: 'status', vars: {} };
    },
    focus(on) { if (on && idleUser <= 0) startCycle(); },
    reset() { idleUser = 0; startCycle(); fade = 1; from = SPEC.white; tau = 0; pL = 0; compute(); },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      if (idleUser <= 0) {
        cycT += dt;
        if (cycT >= CYCLE[cyc][1]) { cycT = 0; cyc = (cyc + 1) % CYCLE.length; setSource(CYCLE[cyc][0]); }
      }
      let changed = false;
      if (fade < 1) { fade = Math.min(1, fade + dt / FADE); changed = true; }
      if (src === 'laser' || wl > 0.001) {
        tau += dt * (kit.reduced ? 0.5 : 1);
        const p = src === 'laser' ? laserP(tau) : pL;
        if (p !== pL) { pL = p; changed = true; }
      }
      if (changed) compute();
      emitAcc += dt * (kit.reduced ? 3 : 6.5) * (1 - wl);
      while (emitAcc >= 1) { emitAcc -= 1; emit(); }
    },
  };
}

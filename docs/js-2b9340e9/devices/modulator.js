// Data modulator: an electro-optic Mach-Zehnder modulator on thin-film lithium niobate (as in Wang et al.,
// Nature 2018), sending a short text as flashes of light.
//
// The light: one laser beam is split into two arms and joined again.  Gold electrodes run along the arms in a
// ground-signal-ground row; the arms sit in the two gaps.  The data's voltage on the middle (signal) strip makes an
// electric field across both gaps, pointing opposite ways, so the Pockels effect speeds the light up in one arm and
// slows it down in the other (push-pull).  The chip is biased so that without voltage the two halves arrive half a
// wave apart: a '1' (voltage on) brings them back in step, they add, light on; a '0' leaves them out of step, they
// cancel, and that light leaks away into the chip at the junction: light off.
// Travelling wave: the data enters at the left pad, runs along the signal strip at the speed of the light in the
// arms (velocity matching, the trick of thin-film lithium niobate) and is absorbed at the right pad (a resistor).
// Each slice of light rides along with one bit all the way, so the bits come out sharp.
//
// One coordinate drives everything: sigma = v * time - (distance travelled), and bit k occupies sigma in
// [k LB, (k+1) LB).  The glow on the electrode, the light after the join, the beam out and both plates are read
// from it, so they always agree.  Slowed down about ten billion times; at 100 Gbit/s one bit is about a millimetre
// long in the waveguide, so a handful of bits along the electrodes, as drawn, is about right.
export const meta = { id: 'modulator', platform: 'ln', category: 'comm', size: { w: 11, d: 3.8 } };

const NB = ' ';
export const text = {
  en: {
    name: 'Data modulator',
    tech: 'Electro-optic Mach–Zehnder modulator · lithium niobate',
    what: 'Turns electrical data into flashes of light.',
    in: 'Steady laser light, and the data as an electrical signal',
    out: 'The same light, flashing on and off with the data',
    how: 'The light splits into two arms and joins again. The data’s voltage on the gold electrodes speeds up the light in one arm and slows it in the other. Where the arms meet, the two halves add up (light on) or cancel out (light off). The data runs along the electrodes at the speed of the light.',
    use: 'Fibre links in data centres and telecom networks, where they put data onto light at 100' + NB + 'gigabits per second and more.',
    fixed: 'The arms and electrodes are laid out for one data speed and one band of colours: one chip, one channel.',
    c: { in: 'Laser in', pad: 'Data in', elec: '', join: 'Light adds up or cancels', out: 'Flashes = data' },
    ctl: { msg: 'Message' },
    opt: { msg: { NTT: 'NTT', Hi: 'Hi', OK: 'OK' } },
    status: 'Sending “{ch}” as 8 flashes: {bits}',
    'status.space': 'Sending a space as 8 flashes: {bits}',
    ref: 'Wang et al., Nature 562, 101 (2018): thin-film lithium-niobate modulators that run on the low voltages of ordinary computer chips, at up to 210' + NB + 'gigabits per second.',
    note: 'Slowed down about ten billion times: real modulators send tens to hundreds of gigabits per second.',
  },
  ja: {
    name: 'データ変調器',
    tech: '電気光学マッハ・ツェンダー変調器・ニオブ酸リチウム',
    what: '電気のデータを、光の点滅に変えます。',
    in: '一定の明るさのレーザー光と、電気信号で届くデータ',
    out: 'データに合わせて点いたり消えたりする光',
    how: '光は二つの腕に分かれ、また一つに戻ります。金色の電極にかかるデータの電圧が、片方の腕の光を速め、もう片方を遅らせます。合流点で二つの光は強め合うか（光がオン）、打ち消し合います（光がオフ）。データは光と同じ速さで電極の上を進みます。',
    use: 'データセンターや通信網の光ファイバー通信。毎秒100' + NB + 'ギガビット以上の速さで、データを光に乗せます。',
    fixed: '腕と電極は、一つのデータの速さと一つの色の帯に合わせて作られています。一つのチップに、一つのチャンネルです。',
    c: { in: 'レーザー光', pad: 'データ入力', elec: '', join: '強め合う／打ち消し合う', out: '点滅＝データ' },
    ctl: { msg: 'メッセージ' },
    opt: { msg: { NTT: 'NTT', Hi: 'Hi', OK: 'OK' } },
    status: '「{ch}」を8回の点滅で送信中：{bits}',
    'status.space': '空白文字を8回の点滅で送信中：{bits}',
    ref: 'Wang ほか、Nature 562, 101 (2018)：薄膜ニオブ酸リチウムの変調器が、普通のコンピューターチップと同じ低い電圧で、毎秒最大210' + NB + 'ギガビットで動きました。',
    note: '実際より約100億倍ゆっくり動かしています。実物は毎秒数十〜数百ギガビットでデータを送ります。',
  },
};

const W = meta.size.w, D = meta.size.d;
const X = { in0: -W / 2, sp0: -4.8, sp1: -3.8, e0: -3.0, e1: 3.0, jn0: 3.8, jn1: 4.8, out: W / 2 };
const ZA = 0.5;                                   // the arms run at z = -ZA (back) and +ZA (front)
const SIG = 0.28, GIN = 0.72, GOUT = 1.5;         // electrode edges (|z|): signal strip, gaps with the arms, grounds
const PAD = { x: 3.5, z: -1.42, sx: 0.85, sz: 0.56 };   // the two RF pads (data in at -x, termination at +x)
const LEAD_Z = -0.95;                             // the leads run straight back from here to the pads
const HM = 0.035;                                 // metal thickness
const Y = 0.085;                                  // height of the beams (the light in the guides is at ~0.082)
const RATE = 2.5;                                 // bits per second (real: tens of billions)
const V = 1.6;                                    // speed of the light and of the data along the chip (units/s)
const LB = V / RATE;                              // length of one bit on the chip
const BEAM = 2.4;                                 // length of the beams in the air
const NWIN = 12;                                  // bits shown on each plate
const MSGS = ['NTT', 'Hi', 'OK'];
const GOLD = [1, 0.84, 0.45];                    // plates: the data
const DRIVE = [1, 0.9, 0.62];                    // the glow of a '1' on the electrode (driven metal: warm white)

// a beam in the air whose brightness follows a profile along its length (the pulses flying out); same look as
// kit.beam (kit/light.js), one draw call.  Kit wish: a profile option on kit.beam.
const NPROF = 40;
function pulseBeam(kit, { from, to, rgb, power = 1, r = 0.08 }) {
  const THREE = kit.THREE;
  const L = kit.colour.lin(rgb);
  const uniforms = {
    uColor: { value: new THREE.Color(L[0] * power * 1.6, L[1] * power * 1.6, L[2] * power * 1.6) },
    uProf: { value: new Float32Array(NPROF) }, uDim: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uProf[${NPROF}]; uniform float uDim;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        float a = clamp(vUv.y, 0.0, 1.0);
        float x = a * ${(NPROF - 1).toFixed(1)};
        int i = int(floor(x));
        int j = min(i + 1, ${NPROF - 1});
        float p = mix(uProf[i], uProf[j], fract(x));
        float f = 1.0 - smoothstep(0.35, 1.0, a);
        float core = pow(abs(dot(vN, vV)), 1.6);
        gl_FragColor = vec4(uColor * p * f * core * uDim, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to);
  const dir = B.clone().sub(A), len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18, 1, true), mat);
  mesh.position.copy(A).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.renderOrder = 7;
  mesh.frustumCulled = false;
  kit.group.add(mesh);
  kit.onTick((dt, t, dim) => { uniforms.uDim.value = dim; });
  return { mesh, prof: uniforms.uProf.value };
}

// gold that reads as gold on large areas (the kit's very metallic gold turns olive-brown without reflections)
const goldCache = new WeakMap();
function brightGold(kit) {
  if (!goldCache.has(kit.THREE)) goldCache.set(kit.THREE, new kit.THREE.MeshStandardMaterial({ color: 0xd4a53a, metalness: 0.5, roughness: 0.4, emissive: 0x1c1404 }));
  return goldCache.get(kit.THREE);
}

export function create(kit) {
  const { P, colour } = kit;
  const RGB = colour.IR;
  kit.chip({ w: W, d: D, platform: 'ln' });
  const net = kit.lightNet({ width: 0.3 });
  net.flow = kit.reduced ? V / 2 : V;            // the dashes in the arms move with the data on the electrode

  // ---- waveguides: input, Y-split, two straight arms, Y-join, output
  const pIn = P.line(X.in0, 0, X.sp0, 0);
  const pSplit = [-1, 1].map(sg => P.sbend(X.sp0, 0, X.sp1, sg * ZA));
  const pArm = [-1, 1].map(sg => P.line(X.sp1, sg * ZA, X.jn0, sg * ZA));
  const pJoin = [-1, 1].map(sg => P.sbend(X.jn0, sg * ZA, X.jn1, 0));
  const pOut = P.line(X.jn1, 0, X.out, 0);
  const S = { split: pIn.len };
  S.arm = S.split + pSplit[0].len; S.join = S.arm + pArm[0].len; S.out = S.join + pJoin[0].len; S.end = S.out + pOut.len;
  const sIn = net.add(pIn, { s0: 0 });
  const sSplit = pSplit.map(p => net.add(p, { s0: S.split }));
  const sArm = pArm.map(p => net.add(p, { s0: S.arm }));
  const sJoin = pJoin.map(p => net.add(p, { s0: S.join }));
  const sOut = net.add(pOut, { s0: S.out });
  kit.ridges([pIn, ...pSplit, ...pArm, ...pJoin, pOut], 'ln');
  net.build();

  // ---- electrodes: ground - signal - ground along the arms, leads to two RF pads at the back
  const zg = (GIN + GOUT) / 2, wg = GOUT - GIN;
  const metal = [
    { x0: X.e0 - 0.12, z0: 0, x1: X.e1 + 0.12, z1: 0, w: 2 * SIG, h: HM },             // signal strip
    { x0: -3.35, z0: zg, x1: 3.35, z1: zg, w: wg, h: HM },                             // ground, front
    { x0: -2.9, z0: -zg, x1: 2.9, z1: -zg, w: wg, h: HM },                             // ground, back
  ];
  const zPad0 = PAD.z - PAD.sz / 2;
  for (const sg of [-1, 1]) {
    const xp = sg * PAD.x, xe = sg * X.e1;
    metal.push({ x: xp, z: PAD.z, sx: PAD.sx, sz: PAD.sz, h: HM });                  // signal pad
    metal.push({ x0: xp, z0: PAD.z, x1: xp, z1: LEAD_Z, w: 0.3, h: HM });             // lead, straight part
    metal.push({ x0: xp, z0: LEAD_Z, x1: xe, z1: 0, w: 0.3, h: HM });                 // lead, diagonal part
    // where the lead crosses the back arm it bridges over the waveguide
    const f = (-ZA - LEAD_Z) / (0 - LEAD_Z), xc = xp + (xe - xp) * f;
    const ux = (xe - xp), uz = (0 - LEAD_Z), ul = Math.hypot(ux, uz);
    metal.push({ x0: xc - 0.2 * ux / ul, z0: -ZA - 0.2 * uz / ul, x1: xc + 0.2 * ux / ul, z1: -ZA + 0.2 * uz / ul, w: 0.3, h: 0.1 });
    metal.push({ x: sg * 2.575, z: (zPad0 - GOUT) / 2, sx: 0.65, sz: -GOUT - zPad0 + 0.01, h: HM });  // ground pad (foot)
  }
  // through kit.electrodes, so that the metal counts as metal (the programmable chip of tab 2 has none); with a
  // brighter gold than the kit's, which turns olive on areas this large
  kit.electrodes(metal).group.children[0].material = brightGold(kit);
  // the termination: a small resistor between the right signal pad and ground, where the data ends as heat
  kit.electrodes([{ x: 2.99, z: PAD.z - 0.12, sx: 0.32, sz: 0.14, h: 0.05 }]).group.children[0].material = kit.mat.dark();

  // ---- the data on the signal conductor: many small glows from pad to pad
  const sigPath = P.poly([[-PAD.x, PAD.z], [-PAD.x, LEAD_Z], [X.e0, 0], [X.e1, 0], [PAD.x, LEAD_Z], [PAD.x, PAD.z]]);
  const XI_E0 = Math.abs(PAD.z - LEAD_Z) + Math.hypot(PAD.x - X.e1, LEAD_Z);          // start of the straight strip
  const gItems = [{ x: -PAD.x, z: PAD.z, sx: PAD.sx, sz: PAD.sz, h: HM }], gXi = [0];
  const LG = 0.1;
  for (let xi = PAD.sz / 2; xi < sigPath.len - PAD.sz / 2 - 1e-6; xi += LG) {
    const xb = Math.min(xi + LG, sigPath.len - PAD.sz / 2), m = (xi + xb) / 2;
    const a = sigPath.at(xi), b = sigPath.at(xb), c = sigPath.at(m);
    const onStrip = m > XI_E0 && m < sigPath.len - XI_E0;
    const bridge = !onStrip && Math.abs(c[1] + ZA) < 0.2;
    gItems.push({ x0: a[0], z0: a[1], x1: b[0], z1: b[1], w: onStrip ? 2 * SIG : 0.3, h: bridge ? 0.1 : HM });
    gXi.push(m);
  }
  gItems.push({ x: PAD.x, z: PAD.z, sx: PAD.sx, sz: PAD.sz, h: HM }); gXi.push(sigPath.len);
  const glow = kit.glows(gItems, { pad: 0.03, y: 0.04, rgb: DRIVE });
  glow.mesh.visible = !kit.written;               // no electrodes on the programmable chip

  // ---- beams
  kit.beam({ from: [X.in0 - BEAM, Y, 0], to: [X.in0, Y, 0], rgb: RGB, power: 1.1, r0: 0.08, fade: 'in' });
  const out = pulseBeam(kit, { from: [X.out, Y, 0], to: [X.out + BEAM, Y, 0], rgb: RGB, power: 1.15, r: 0.08 });
  // where the halves cancel, their light leaves the waveguide at the junction and spreads into the chip: a soft glow
  const leak = kit.glows([{ x: X.jn1 + 0.12, z: 0, sx: 0.55, sz: 0.36, h: 0 }], { pad: 0.22, y: 0.03, rgb: RGB });

  // ---- the message: a list of segments {k0, text, bits}; bit k comes from the last segment with k0 <= k
  const encode = s => { const t = s + ' ', bits = []; for (const ch of t) { const c = ch.charCodeAt(0); for (let i = 7; i >= 0; i--) bits.push((c >> i) & 1); } return { text: t, bits }; };
  const mod = (a, n) => ((a % n) + n) % n;
  let segs, msg, clock;
  const segOf = k => { let s = segs[0]; for (const q of segs) if (q.k0 <= k) s = q; return s; };
  const nextK0 = k => { let n = Infinity; for (const q of segs) if (q.k0 > k && q.k0 < n) n = q.k0; return n; };
  const bitAt = k => { const s = segOf(k); return s.bits[mod(k - s.k0, s.bits.length)]; };
  const infoAt = k => { const s = segOf(k), i = mod(k - s.k0, s.bits.length); return { s, ch: s.text[i >> 3], b: i & 7, k0: k - (i & 7) }; };
  // level of the data at coordinate sigma (0..1, edges softened a little, as a real drive signal's are)
  const EDGE = 0.07;
  const sm = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const level = sig => {
    const q = sig / LB, k = Math.floor(q), f = q - k, b = bitAt(k);
    if (f < EDGE) { const p = bitAt(k - 1); return p + (b - p) * sm((f + EDGE) / (2 * EDGE)); }
    if (f > 1 - EDGE) { const n = bitAt(k + 1); return b + (n - b) * sm((f - 1 + EDGE) / (2 * EDGE)); }
    return b;
  };
  // the light at path position s carries the data that was at the same place on the electrode (velocity matching)
  const S_E0 = S.arm + (X.e0 - X.sp1);
  const OFF = S_E0 - XI_E0;                       // sigma of the light = V t - s + OFF
  const DELAY_OUT = S.end - OFF;                  // sigma at the output facet = V t - DELAY_OUT

  function reset() {
    msg = 'NTT'; segs = [{ k0: 0, ...encode(msg) }]; clock = 0;
  }
  reset();
  const setMsg = m => {
    if (!MSGS.includes(m) || m === msg) return;
    msg = m;
    const kNow = Math.floor(V * clock / LB);
    segs.push({ k0: kNow + 1, ...encode(m) });
    const oldest = Math.floor((V * clock - DELAY_OUT - BEAM) / LB) - NWIN - 2;
    while (segs.length > 1 && segs[1].k0 <= oldest) segs.shift();
    if (segs.length > 4) segs.splice(1, segs.length - 4);
  };

  // ---- steady light up to the join
  const P_IN = 1.05, P_ARM = 0.66, P_OUT = 1.2, P_OFF = 0.05;   // P_OFF: a real modulator never goes fully dark
  net.set(sIn, RGB, P_IN);
  for (const k of [...sSplit, ...sArm, ...sJoin]) net.set(k, RGB, P_ARM);
  net.dash(sOut, 0);
  const g24 = p => Math.pow(Math.max(0, p), 1 / 2.4);         // setFn values go through lin(): keep power linear

  let dimNow = 1;                                  // glows are not dimmed by the kit when another chip is in focus
  kit.onTick((dt, t, dim) => { dimNow = dim; });
  function show() {
    const vt = V * clock;
    for (let i = 0; i < gXi.length; i++) glow.set(i, 0.8 * dimNow * level(vt - gXi[i]));
    net.setFn(sOut, u => { const k = g24(P_OUT * (P_OFF + (1 - P_OFF) * level(vt - (S.out + u * pOut.len) + OFF))); return [RGB[0] * k, RGB[1] * k, RGB[2] * k]; });
    for (let i = 0; i < NPROF; i++) out.prof[i] = P_OFF + (1 - P_OFF) * level(vt - (S.end + BEAM * i / (NPROF - 1)) + OFF);
    leak.set(0, 0.5 * dimNow * (1 - level(vt - S.out + OFF)));
  }
  show();

  // ---- plates: the laser and the data going in; the light coming out, with the letters it carries
  const MUTED = [0.62, 0.68, 0.74], RED = [1, 0.3, 0.22], LETTER = [1, 0.93, 0.78];
  const lang = () => kit.lang();
  // bits ending at sigma `sigR` (the newest at the right), drawn as blocks, with each byte's letter above it
  function drawBits(g, box, sigR, rgb, glowRgb) {
    const q1 = sigR / LB, q0 = q1 - NWIN, X0 = box.x, Wd = box.w;
    const xq = q => X0 + (q - q0) / NWIN * Wd;
    const yTop = box.y + box.h * 0.5, yBot = box.y + box.h, hBlk = yBot - yTop;
    g.save();
    g.beginPath(); g.rect(X0, box.y - 4, Wd, box.h + 8); g.clip();
    // baseline (light off)
    g.fillStyle = 'rgba(160,185,210,0.22)'; g.fillRect(X0, yBot - 2, Wd, 2);
    g.shadowColor = kit.colour.css(glowRgb, 0.9); g.shadowBlur = 12; g.fillStyle = kit.colour.css(rgb);
    for (let k = Math.floor(q0); k <= Math.floor(q1); k++) {
      if (!bitAt(k)) continue;
      const xa = Math.max(X0, xq(k) + 1.5), xb = Math.min(X0 + Wd, xq(k + 1) - 1.5);
      if (xb > xa) g.fillRect(xa, yTop, xb - xa, hBlk);
    }
    g.shadowBlur = 0;
    // letters, one per byte, centred over its eight bits
    const seen = new Set();
    for (let k = Math.floor(q0) - 8; k <= Math.floor(q1) + 8; k++) {
      const inf = infoAt(k);
      if (inf.b !== 0 || seen.has(k)) continue;
      seen.add(k);
      if (xq(k + 8) < X0 + 8 || xq(k) > X0 + Wd - 8) continue;
      if (nextK0(k) < k + 8) continue;               // a letter cut short by a new message is not a letter
      const lab = inf.ch === ' ' ? '' : inf.ch;      // (a space: a gap - the word 'space' read as part of the message)
      const sz = inf.ch === ' ' ? Math.round(box.h * 0.26) : Math.round(box.h * 0.46);
      // the letter stays over the visible part of its byte (so the one coming in or going out still shows)
      const half = inf.ch === ' ' ? sz * 1.3 : sz * 0.4;
      const xc = Math.min(Math.max(xq(k + 4), X0 + half), X0 + Wd - half);
      kit.draw.text(g, lab, xc, box.y + box.h * 0.4, { size: sz, align: 'center', rgb: inf.ch === ' ' ? MUTED : LETTER, weight: 800 });
      // a thin bracket over the byte's eight bits
      g.fillStyle = 'rgba(160,185,210,0.4)';
      const yb = box.y + box.h * 0.44, hb = box.h * 0.035;
      g.fillRect(xq(k) + 2, yb, 2, hb); g.fillRect(xq(k + 8) - 4, yb, 2, hb);
      g.fillRect(xq(k) + 2, yb, xq(k + 8) - xq(k) - 4, 2);
    }
    g.restore();
  }
  const timeArrow = (g, box) => {
    const y = box.y + box.h + 22;
    g.save(); g.strokeStyle = 'rgba(160,185,210,0.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(box.x + box.w * 0.55, y); g.lineTo(box.x + box.w, y); g.stroke();
    g.beginPath(); g.moveTo(box.x + box.w, y); g.lineTo(box.x + box.w - 13, y - 7); g.lineTo(box.x + box.w - 13, y + 7); g.closePath();
    g.fillStyle = 'rgba(160,185,210,0.7)'; g.fill(); g.restore();
    kit.draw.text(g, kit.word('time'), box.x + box.w * 0.53, y + 9, { size: 26, rgb: MUTED, align: 'right', weight: 700 });
  };
  const LW = 122;                                   // the column of row names on the plates
  const rowName = (g, s, x, y) => kit.draw.text(g, s, x, y, { size: s.length > 3 && lang() === 'ja' ? 32 : 36, rgb: MUTED, weight: 700, baseline: 'middle' });
  const PL = { w: 3.0, h: 1.7, y: 1.85, z: -D / 2 - 1.3, x: W / 2 - 1.7 };
  const inPlate = kit.plate({ w: PL.w, h: PL.h, at: [-PL.x, PL.y, PL.z], title: 'in' });
  inPlate.live((g, box) => {
    const vt = V * clock;
    const r1 = box.h * 0.18, lab = lang() === 'ja' ? ['光', 'データ'] : ['light', 'data'];
    rowName(g, lab[0], box.x, box.y + r1);
    g.save(); g.shadowColor = kit.colour.css(RED, 0.9); g.shadowBlur = 12; g.fillStyle = kit.colour.css(RED);
    g.fillRect(box.x + LW, box.y + r1 - 5, box.w - LW, 10); g.restore();
    const b2 = { x: box.x + LW, y: box.y + box.h * 0.3, w: box.w - LW, h: box.h * 0.7 };
    rowName(g, lab[1], box.x, b2.y + b2.h * 0.75);
    drawBits(g, b2, vt, GOLD, [1, 0.8, 0.35]);
    timeArrow(g, box);
  }, 12);
  const outPlate = kit.plate({ w: PL.w, h: PL.h, at: [PL.x, PL.y, PL.z], title: 'out' });
  outPlate.live((g, box) => {
    const vt = V * clock;
    const b2 = { x: box.x + LW, y: box.y, w: box.w - LW, h: box.h };
    rowName(g, lang() === 'ja' ? '光' : 'light', box.x, b2.y + b2.h * 0.75);
    drawBits(g, b2, vt - DELAY_OUT, RED, RED);
    timeArrow(g, box);
  }, 12);

  // ---- what the status line says: the letter going in now, its bits, the one entering in bold
  const status = () => {
    const k = Math.floor(V * clock / LB), inf = infoAt(k);
    let bits = '';
    for (let i = 0; i < 8; i++) { const v = bitAt(inf.k0 + i); bits += i === inf.b ? `<b>${v}</b>` : String(v); }
    return inf.ch === ' ' ? { key: 'status.space', vars: { bits } } : { key: 'status', vars: { ch: inf.ch, bits } };
  };

  return {
    anchors: {
      in: [X.in0 - 1.3, Y + 0.05, 0],
      pad: [-PAD.x, 0.05, PAD.z],
      elec: [-1.4, 0.05, 0],
      join: [X.jn0 + 0.15, Y + 0.05, -ZA],
      out: [X.out + 1.7, Y + 0.05, 0],
    },
    controls: [{ id: 'msg', type: 'choice', options: MSGS }],
    act(id, v) { if (id === 'msg') setMsg(v); },
    value(id) { return id === 'msg' ? msg : undefined; },
    status,
    reset() { reset(); show(); },
    update(dt) {
      clock += dt * (kit.reduced ? 0.5 : 1);
      show();
    },
  };
}

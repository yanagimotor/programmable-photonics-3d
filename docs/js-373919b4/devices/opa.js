// Beam steerer: an optical phased array on silicon (as in Sun et al., Nature 2013; Poulton et al., Optics Letters
// 2017), the solid-state way to sweep a lidar beam.
//
// The light: one input is split by a tree of Y-splitters (1 -> 2 -> 4 -> 8 -> 16), each of the 16 paths passes a
// heater (a phase shifter: heat slows the light) and ends in a grating antenna (fine cross-bars) that sends the light
// up out of the chip.  Above the chip the 16 waves interfere: when each heater delays its light by the same step
// more than its neighbour (a ramp of delays; only the delay modulo one wave matters, so the heaters show a sawtooth),
// the wavefronts tilt and the beam leaves at the angle theta with sin(theta) = (phase step) / (k * pitch).
// Layout: the antenna row runs along x, across the visitor's view, so that the beam sweeps left and right; it sits
// at the back of the chip (the light comes in along the front edge and the tree points away from the visitor), so
// that the beam and its waves rise against the dark room, not over the chip.  The field above the antennas is
// computed exactly for the 16 sources (a shader: sum of cylindrical waves with an element pattern), at a visual
// wavelength of 0.5 (pitch 0.3), shown in focus.  The Out plate shows the array factor of the same 16 antennas.
export const meta = { id: 'opa', platform: 'si', category: 'sense', size: { w: 9.5, d: 6.2 } };

export const text = {
  en: {
    name: 'Beam steerer',
    tech: 'Optical phased array · silicon',
    what: 'Steers a beam of light with no moving parts.',
    in: 'Laser light of one colour',
    out: 'A beam, sent in the direction you choose',
    how: 'The light is split into 16 paths, each ending in a tiny antenna that sends it upwards. A heater on each path delays its light a little more than the one before. Above the chip the waves line up along a tilted front, and the beam leaves at that tilt.',
    use: 'Lidar, the laser “radar” of self-driving cars and robots, which sweeps a beam across a scene to measure distances.',
    fixed: 'The number and spacing of the antennas are etched in: they decide how narrow the beam is and how far it can turn.',
    c: { in: 'Light in', split: '', heater: 'Heaters delay the light', ant: 'Tiny antennas', waves: 'The beam turns' },
    ctl: { angle: 'Beam angle', scan: 'Automatic sweep' },
    'status.right': 'The beam points <b>{a}°</b> to the right.',
    'status.left': 'The beam points <b>{a}°</b> to the left.',
    'status.up': 'The beam points <b>straight up</b>.',
    ref: 'Poulton et al., Optics Letters 42, 4091 (2017): a sending and a receiving phased array measured distance and speed at the same time, a lidar with no moving parts.',
    note: 'Real arrays have hundreds of antennas a few micrometres apart and turn the beam within microseconds. The waves are drawn far larger and slower than real.',
  },
  ja: {
    name: 'ビーム走査器',
    tech: '光フェーズドアレイ・シリコン',
    what: '動く部品なしで、光のビームの向きを変えます。',
    in: '一つの色のレーザー光',
    out: '選んだ方向へ進むビーム',
    how: '光は16本の道に分けられ、それぞれの先の小さなアンテナから上へ出ていきます。各道のヒーターが、となりの道より少しだけ多く光を遅らせます。するとチップの上で波の山が斜めにそろい、ビームはその傾きの方向へ進みます。',
    use: 'ライダー（自動運転車やロボットのレーザー「レーダー」）。ビームで周りを走査して、距離を測ります。',
    fixed: 'アンテナの数と間隔は作るときに決まります。それがビームの細さと、どこまで向きを変えられるかを決めます。',
    c: { in: '入力光', split: '', heater: 'ヒーターで光を遅らせる', ant: '小さなアンテナ', waves: 'ビームの向きが変わる' },
    ctl: { angle: 'ビームの角度', scan: '自動スキャン' },
    'status.right': 'ビームは右へ<b>{a}°</b>傾いています。',
    'status.left': 'ビームは左へ<b>{a}°</b>傾いています。',
    'status.up': 'ビームは<b>真上</b>を向いています。',
    ref: 'Poulton ほか、Optics Letters 42, 4091 (2017)：送信用と受信用のフェーズドアレイで、距離と速さを同時に測りました。動く部品のないライダーです。',
    note: '実物は数マイクロメートル間隔で何百ものアンテナを並べ、マイクロ秒でビームの向きを変えます。波は実物よりずっと大きく、ゆっくり描いています。',
  },
};

const W = meta.size.w, D = meta.size.d;
const N = 16, PITCH = 0.3, XC = 0;
const XN = Array.from({ length: N }, (_, n) => XC + (n - (N - 1) / 2) * PITCH);
const Z_IN = 2.62, R_B = 0.5;                     // input guide along the front edge, then a bend into the tree
const LZ = [1.05, 0.62, 0.44, 0.34];              // the tree's four levels: length (towards -z) ...
const OFFS = [1.2, 0.6, 0.3, 0.15];               // ... and sideways step of each branch
const STEM = 0.08;
const Z_H0 = -0.82, Z_H1 = -1.56;                 // heaters
const Z_A0 = -1.74, Z_A1 = -2.86, Z_AM = (Z_A0 + Z_A1) / 2;  // grating antennas (light enters at Z_A0)
const Y = 0.085;
const LAM = 0.5, K = 2 * Math.PI / LAM;           // visual wavelength in the air (the pitch is 0.6 of it)
const MAXDEG = 25, SWEEP = 9;                     // steering range; period of the automatic sweep (s)
const BEAM_L = 5.2;
const PW = 8.4, PH = 5.2;                         // the plane of waves above the antennas

const mod2pi = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

// the field of the 16 antennas in the vertical plane through them: brightness = intensity x moving crests
function wavePlane(kit) {
  const THREE = kit.THREE;
  const L = kit.colour.lin(kit.colour.IR);
  const uniforms = { uDphi: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 0 }, uDim: { value: 1 }, uColor: { value: new THREE.Color(L[0], L[1], L[2]) } };
  const f = v => v.toFixed(5);
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xy + vec2(0.0, ${f(PH / 2)});
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uDphi, uTime, uAlpha, uDim;
      uniform vec3 uColor;
      varying vec2 vP;
      void main() {
        float y = vP.y;
        if (y < 0.03) discard;
        float re = 0.0, im = 0.0;
        for (int n = 0; n < ${N}; n++) {
          float dx = vP.x - (float(n) - ${f((N - 1) / 2)}) * ${f(PITCH)};
          float r = sqrt(dx * dx + y * y);
          float ph = ${f(K)} * r + float(n) * uDphi;
          float a = (y / r) * inversesqrt(r + 0.2);        // element pattern (mostly upwards) and 2D spreading
          re += a * cos(ph); im += a * sin(ph);
        }
        float env = clamp((re * re + im * im) / 7.5, 0.0, 1.0);
        env *= env;                                         // the main lobe: the side lobes read as clutter
        float crest = 0.5 + 0.5 * cos(atan(im, re) - uTime);
        crest *= crest; crest *= crest;                     // thin bright wavefronts
        float fy = smoothstep(0.03, 0.35, y) * (1.0 - smoothstep(${f(PH * 0.45)}, ${f(PH)}, y));
        float fx = 1.0 - smoothstep(${f(PW * 0.34)}, ${f(PW * 0.5)}, abs(vP.x));
        float b = env * (0.08 + 0.92 * crest) * fy * fx * uAlpha * uDim;
        gl_FragColor = vec4(uColor * b, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat);
  mesh.position.set(XC, PH / 2, Z_AM);
  mesh.renderOrder = 5;
  mesh.frustumCulled = false;
  mesh.visible = false;
  kit.group.add(mesh);
  kit.onTick((dt, t, dim) => { uniforms.uDim.value = dim; });
  return { mesh, uniforms };
}

export function create(kit) {
  const { P, colour, THREE } = kit;
  const RGB = colour.IR;
  kit.chip({ w: W, d: D, platform: 'si' });
  kit.carrier({ w: W + 2.0, d: D + 0.8, chipH: 0.45 });
  const net = kit.lightNet({ width: 0.26 });
  const ridges = [];
  const shown = p => 1.15 * Math.pow(p, 0.3);          // brightness of guided power p (halving dims it, gently)
  const g24 = p => Math.pow(Math.max(0, p), 1 / 2.4);   // setFn values go through lin(): keep power linear
  const sbz = (x0, z0, x1, z1) => P.fn(t => [x0 + (x1 - x0) * (1 - Math.cos(Math.PI * t)) / 2, z0 + (z1 - z0) * t], 0, 1, 40);
  const add = (path, s0, power) => { ridges.push(path); const k = net.add(path, { s0 }); powers.push([k, power]); return k; };
  const powers = [];

  // ---- input guide along the front edge, a 90-degree bend, then the tree of splitters towards the back
  const pIn = P.line(-W / 2, Z_IN, XC - R_B, Z_IN);
  const pBend = P.arc(XC - R_B, Z_IN - R_B, R_B, Math.PI / 2, 0);
  let s = 0;
  add(pIn, s, 1); s += pIn.len;
  add(pBend, s, 1); s += pBend.len;
  let z = Z_IN - R_B;
  add(P.line(XC, z, XC, z - STEM), s, 1); s += STEM; z -= STEM;
  let xs = [XC], p = 1;
  const splits = [];                                  // [x, z, level] of every Y-junction
  for (let l = 0; l < 4; l++) {
    const nx = [];
    p /= 2;
    let len = 0;
    for (const x of xs) {
      splits.push([x, z, l]);
      for (const sg of [-1, 1]) {
        const path = sbz(x, z, x + sg * OFFS[l], z - LZ[l]);
        add(path, s, p); len = path.len; nx.push(x + sg * OFFS[l]);
      }
    }
    s += len; z -= LZ[l];
    if (l < 3) { for (const x of nx) add(P.line(x, z, x, z - STEM), s, p); s += STEM; z -= STEM; }
    xs = nx;
  }
  const zLeaf = z;
  // the 16 parallel guides (heaters on them) and the antennas
  const sAnt = [];
  for (const x of XN) add(P.line(x, zLeaf, x, Z_A0), s, p);
  const s1 = s + (zLeaf - Z_A0);
  for (const x of XN) { const path = P.line(x, Z_A0, x, Z_A1); ridges.push(path); sAnt.push(net.add(path, { s0: s1 })); }
  kit.ridges(ridges, 'si');
  net.build();
  for (const [k, pw] of powers) net.set(k, RGB, shown(pw));
  const DECAY = 0.42;                                 // the antennas give their light away along their length
  for (const k of sAnt) net.setFn(k, u => { const v = g24(shown(p) * 1.15 * Math.exp(-u * (Z_A0 - Z_A1) / DECAY)); return [RGB[0] * v, RGB[1] * v, RGB[2] * v]; });

  // grating teeth across each antenna, and the light they send up
  const teeth = [];
  for (const x of XN) for (let zz = Z_A0 - 0.07; zz > Z_A1 + 0.02; zz -= 0.085) teeth.push({ x, z: zz, sx: 0.24, sz: 0.032, h: kit.RIDGE.h, y0: 0 });
  kit.boxes(teeth, kit.mat.ridge('si'));
  const antGlow = kit.glows(XN.map(x => ({ x, z: Z_A0 - 0.42, sx: 0.2, sz: 0.84, h: kit.RIDGE.h })), { pad: 0.05, y: 0.09, rgb: RGB });
  // glows are not dimmed by the kit when another chip is in focus: follow its dim here
  let dimNow = 1, antDim = -1;
  kit.onTick((dt, t, dim) => {
    dimNow = dim;
    if (Math.abs(dim - antDim) > 0.004) { antDim = dim; XN.forEach((_, i) => antGlow.set(i, 0.34 * dim)); }
  });

  // heaters (as kit.heaters, with a tighter glow so that the 16 stay distinct: kit wish), their pads along the side
  // edges, wired to a carrier
  const hItems = XN.map(x => ({ x0: x, z0: Z_H0, x1: x, z1: Z_H1, w: 0.075, h: 0.02, y0: kit.RIDGE.h + 0.004 }));
  let heaters;
  if (kit.written) heaters = kit.heaters(hItems, { w: 0.075 });      // the programmable chip: written phase patches
  else {
    const strips = kit.electrodes(hItems, { rgb: [1, 0.5, 0.12] });     // metal strips (tagged as metal) ...
    strips.group.children[0].material = kit.mat.heater();
    const hGlow = kit.glows(hItems, { pad: 0.045, y: kit.RIDGE.h + 0.03, rgb: [1, 0.5, 0.12] });   // ... and their heat
    heaters = { set: (i, v) => hGlow.set(i, 1.15 * v) };
  }
  const padZ = Array.from({ length: 8 }, (_, i) => 0.2 - i * 0.4);
  const padX = W / 2 - 0.3, cpX = W / 2 + 0.55;
  kit.pads([...padZ.map(zz => [-padX, zz]), ...padZ.map(zz => [padX, zz])], 0.24);
  kit.pads([...padZ.map(zz => [-cpX, zz]), ...padZ.map(zz => [cpX, zz])], 0.28, -0.45);
  kit.bonds(padZ.flatMap(zz => [[[-padX, 0.03, zz], [-cpX, -0.42, zz]], [[padX, 0.03, zz], [cpX, -0.42, zz]]]), { rise: 0.32 });

  // ---- beams: in at the left edge; out: one beam rising from the antennas, turned every frame
  kit.beam({ from: [-W / 2 - 2.4, Y, Z_IN], to: [-W / 2, Y, Z_IN], rgb: RGB, power: 1.1, r0: 0.08, fade: 'in' });
  const BEAM_P = 1.25;
  const beam = kit.beam({ from: [0, 0, 0], to: [0, BEAM_L, 0], rgb: RGB, power: BEAM_P, r0: 0.42, r1: 0.2, fade: 'out' });
  const base = new THREE.Vector3(XC, 0.06, Z_AM), dir = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  const plane = wavePlane(kit);

  // ---- state
  let theta = 0, target = 0, scan = true, sweepT = 0, idleUser = 0, resumeScan = false, focused = false, alpha = 0, crest = 0, beamP = BEAM_P;
  const dphiOf = deg => K * PITCH * Math.sin(deg * Math.PI / 180);
  function apply() {
    const dphi = dphiOf(theta), a = theta * Math.PI / 180;
    for (let n = 0; n < N; n++) heaters.set(n, dimNow * mod2pi(n * dphi) / (2 * Math.PI));
    dir.set(Math.sin(a), Math.cos(a), 0);
    beam.object.position.copy(base).addScaledVector(dir, BEAM_L / 2);
    beam.object.quaternion.setFromUnitVectors(UP, dir);
    plane.uniforms.uDphi.value = dphi;
  }
  apply();

  // ---- plates: the light and the heaters' delays in; the beam's direction (far-field pattern) out
  const MUTED = [0.62, 0.68, 0.74], RED = [1, 0.3, 0.22], HEAT = [1, 0.55, 0.16];
  const lang = () => kit.lang();
  const LW = 122;
  const rowName = (g, str, x, y) => kit.draw.text(g, str, x, y, { size: 36, rgb: MUTED, weight: 700, baseline: 'middle' });
  // the plates stand wider apart than on the other chips: the beam and its waves rise between them
  const PLX = W / 2 + 0.65;
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-PLX, 1.85, -D / 2 - 1.3], title: 'in' });
  inPlate.live((g, box) => {
    const r1 = box.h * 0.16;
    rowName(g, lang() === 'ja' ? '光' : 'light', box.x, box.y + r1);
    g.save(); g.shadowColor = colour.css(RED, 0.9); g.shadowBlur = 12; g.fillStyle = colour.css(RED);
    g.fillRect(box.x + LW, box.y + r1 - 5, box.w - LW, 10); g.restore();
    const b2 = { x: box.x + LW, y: box.y + box.h * 0.34, w: box.w - LW, h: box.h * 0.66 };
    rowName(g, lang() === 'ja' ? '遅れ' : 'delay', box.x, b2.y + b2.h * 0.62);
    const dphi = dphiOf(theta);
    kit.draw.bars(g, b2, XN.map((_, n) => mod2pi(n * dphi) / (2 * Math.PI)), { rgb: HEAT, max: 1, gap: 0.22 });
  }, 12);
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [PLX, 1.85, -D / 2 - 1.3], title: 'out' });
  const AF = (deg, dphi) => {
    const psi = dphi - K * PITCH * Math.sin(deg * Math.PI / 180);
    const sn = Math.sin(psi / 2);
    if (Math.abs(sn) < 1e-6) return 1;
    const v = Math.sin(N * psi / 2) / (N * sn);
    return v * v;
  };
  outPlate.live((g, box) => {
    const cx = box.x + box.w * 0.6, cy = box.y + box.h + 6, R = Math.min(box.h + 2, box.w * 0.38);
    const P2 = (deg, r) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
    g.save();
    // the half disc and its ticks
    g.beginPath(); g.moveTo(cx - R, cy); g.arc(cx, cy, R, Math.PI, 2 * Math.PI); g.closePath();
    g.fillStyle = 'rgba(160,185,210,0.07)'; g.fill();
    g.strokeStyle = 'rgba(160,185,210,0.4)'; g.lineWidth = 2; g.stroke();
    for (const d of [-60, -30, 0, 30, 60]) {
      const [x0, y0] = P2(d, R * 0.9), [x1, y1] = P2(d, R);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    }
    // the reach of this chip (+-25 degrees)
    g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, -Math.PI / 2 - MAXDEG * Math.PI / 180, -Math.PI / 2 + MAXDEG * Math.PI / 180); g.closePath();
    g.fillStyle = 'rgba(160,185,210,0.08)'; g.fill();
    // brightness by direction (square root, so that the faint side lobes show)
    const dphi = dphiOf(theta);
    g.beginPath(); g.moveTo(cx, cy);
    for (let d = -90; d <= 90; d += 0.5) { const [x, y] = P2(d, R * Math.sqrt(AF(d, dphi))); g.lineTo(x, y); }
    g.closePath();
    g.shadowColor = colour.css(RED, 0.9); g.shadowBlur = 14; g.fillStyle = colour.css(RED, 0.95); g.fill();
    g.restore();
    // the angle
    const a = Math.round(theta);
    kit.draw.text(g, `${Math.abs(a)}°`, box.x, box.y + box.h * 0.42, { size: 64, rgb: [1, 0.93, 0.85], weight: 800 });
    const side = a === 0 ? (lang() === 'ja' ? '真上' : 'up') : a > 0 ? (lang() === 'ja' ? '右へ' : 'right') : (lang() === 'ja' ? '左へ' : 'left');
    kit.draw.text(g, side, box.x, box.y + box.h * 0.66, { size: 32, rgb: MUTED, weight: 700 });
  }, 12);

  const sp1 = splits.find(q => q[2] === 1 && q[0] > XC);   // a junction of the second level, right of centre
  return {
    anchors: {
      waves: [XC + 0.4, 3.4, Z_AM],
      heater: [XN[12], Y + 0.05, (Z_H0 + Z_H1) / 2],
      split: [sp1[0], Y + 0.02, sp1[1] - 0.03],
      ant: [XN[14], Y + 0.05, Z_AM],
      in: [XC - 0.75, Y + 0.05, Z_IN],
    },
    controls: [
      { id: 'angle', type: 'slider', min: -MAXDEG, max: MAXDEG, step: 1, unit: '°', digits: 0 },
      { id: 'scan', type: 'toggle' },
    ],
    act(id, v) {
      if (id === 'angle') { target = Math.max(-MAXDEG, Math.min(MAXDEG, +v || 0)); scan = false; resumeScan = true; idleUser = 15; }
      if (id === 'scan') { scan = !!v; resumeScan = false; if (scan) sweepT = Math.asin(Math.max(-1, Math.min(1, theta / MAXDEG))) * SWEEP / (2 * Math.PI); }
    },
    value(id) { return id === 'angle' ? Math.round(theta) : id === 'scan' ? scan : undefined; },
    status() {
      const a = Math.round(theta);
      return { key: a === 0 ? 'status.up' : a > 0 ? 'status.right' : 'status.left', vars: { a: Math.abs(a) } };
    },
    focus(on) { focused = on; },
    // a lower camera than the table's default: the beam rises, the plane of waves faces the visitor
    view: { pos: [-0.9, 11.9, 12.2], target: [-0.9, 1.75, -0.8] },
    reset() { theta = 0; target = 0; scan = true; sweepT = 0; idleUser = 0; resumeScan = false; apply(); },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      if (!scan && resumeScan && idleUser <= 0) { scan = true; resumeScan = false; sweepT = Math.asin(Math.max(-1, Math.min(1, theta / MAXDEG))) * SWEEP / (2 * Math.PI); }
      const slow = kit.reduced ? 0.5 : 1;
      if (scan) { sweepT += dt * slow; target = MAXDEG * Math.sin(2 * Math.PI * sweepT / SWEEP); }
      const d = target - theta, step = 45 * dt * slow;
      theta += Math.abs(d) <= step ? d : Math.sign(d) * step;
      apply();
      // the plane of waves: shown in focus, crests rising
      alpha += ((focused ? 1 : 0) - alpha) * Math.min(1, dt * 2.5);
      plane.mesh.visible = alpha > 0.01;
      crest += dt * slow * K * 0.8;                     // crests rise at 0.8 units per second
      plane.uniforms.uTime.value = crest % (2 * Math.PI * 1000);
      plane.uniforms.uAlpha.value = alpha * 0.55;
      const bp = BEAM_P * (1 + 0.15 * alpha);              // in focus the beam stays the brightest thing: one beam, turning
      if (Math.abs(bp - beamP) > 0.003) { beamP = bp; beam.set(RGB, bp); }
    },
  };
}

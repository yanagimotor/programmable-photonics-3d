// Ring biosensor: silicon microring resonators read by a swept laser, as in the label-free sensor arrays of the
// Bailey group (Washburn et al. 2009: CEA, ~100 pm shifts; Iqbal et al. 2010: 32 rings, 8 of them controls).
//
// A bus guide runs along the front.  Two rings sit next to it: the sensing ring in an open well of liquid, coated
// with capture molecules (antibodies), and a twin ring under a cover, which feels temperature but no molecules.
// The laser sweeps its colour back and forth over a small range.  Near a ring's resonance the light circles that
// ring many times (it lights up) and the light passing by dips (an all-pass ring near critical coupling: a
// Lorentzian dip, linewidth GAM, i.e. Q of about 40 000).  Each molecule caught on the sensing ring raises the
// ring's effective index a little, so its resonance moves to a lower frequency (towards the red, a longer
// wavelength) in small steps; the covered ring does not move.  Molecules random-walk in the liquid and stick when
// they touch the ring; "Rinse" washes them off and the dip returns.
export const meta = { id: 'biosensor', platform: 'si', category: 'sense', size: { w: 9, d: 5.6 } };

const NB = ' ';
export const text = {
  en: {
    name: 'Ring biosensor',
    tech: 'Microring resonators · silicon',
    what: 'Detects molecules: when they stick, the ring’s colour shifts.',
    in: 'Laser light that sweeps through a small range of colours',
    out: 'The light that passes by, dipping at each ring’s colour',
    how: 'At certain colours, light circles the ring many times and less of it passes by: a dip. Molecules caught on the ring slow that light slightly, so the dip moves towards the red, by an amount that tells how many were caught. A covered twin ring corrects for temperature.',
    use: 'Medical tests: measuring several proteins at once in a drop of blood, on low-cost disposable chips.',
    fixed: 'The rings, and the capture molecules coated on them, are chosen when the chip is made: one chip, one set of tests.',
    c: { in: 'Laser in', ring: 'Sensing ring', mol: 'Molecules stick here', ref: '', out: 'Light out' },
    ctl: { add: 'Add a sample', rinse: 'Rinse' },
    status: '<b>{n}</b> molecules caught: the dip moved <b>{s}' + NB + 'pm</b> towards the red.',
    'status.one': '<b>1</b> molecule caught: the dip moved <b>{s}' + NB + 'pm</b> towards the red.',
    'status.clean': 'Clean ring: the dip sits at its starting colour.',
    'status.wait': 'Sample added: molecules drift in the liquid…',
    'status.rinse': 'Rinsing: the molecules are washed off and the dip moves back.',
    ref: 'Washburn, Gunn & Bailey, Analytical Chemistry 81, 9499 (2009): silicon rings measured a cancer marker (CEA) without labels, even in undiluted serum.',
    note: 'Each dot stands for very many molecules, and the laser’s sweep is slowed down with its change of colour exaggerated. The shift has a real size: in that study a cancer marker moved the dip by about 100' + NB + 'pm (trillionths of a metre).',
    w: { sensor: 'sensor', ref: 'reference' },
  },
  ja: {
    name: 'リング型バイオセンサー',
    tech: 'マイクロリング共振器・シリコン',
    what: '分子を見つけます。分子がつくと、リングの色がずれます。',
    in: '狭い範囲で色を変えながら掃引するレーザー光',
    out: '通り抜けた光。それぞれのリングの色でくぼみます',
    how: 'ある色のとき、光はリングを何度も回り、通り抜ける光が減ります。これがくぼみです。リングに捕まった分子はその光をわずかに遅らせるので、くぼみは赤い側へずれ、そのずれから捕まった分子の量がわかります。覆いをした双子のリングで、温度の影響を差し引きます。',
    use: '医療検査。使い捨ての安価なチップで、一滴の血液に含まれる何種類ものタンパク質を一度に測ります。',
    fixed: 'リングと、その表面に塗る「捕まえる分子」は、チップを作るときに決まります。一つのチップで、一組の検査だけです。',
    c: { in: 'レーザー光', ring: 'センサーのリング', mol: 'ここに分子がつく', ref: '', out: '出力光' },
    ctl: { add: 'サンプルを加える', rinse: '洗い流す' },
    status: '分子を<b>{n}</b>個捕まえました：くぼみが赤い側へ<b>{s}' + NB + 'pm</b>ずれました。',
    'status.one': '分子を<b>1</b>個捕まえました：くぼみが赤い側へ<b>{s}' + NB + 'pm</b>ずれました。',
    'status.clean': 'きれいなリング：くぼみは元の色の位置にあります。',
    'status.wait': 'サンプルを加えました：分子が液体の中をただよっています…',
    'status.rinse': '洗浄中：分子が洗い流され、くぼみが元に戻ります。',
    ref: 'Washburn ほか、Analytical Chemistry 81, 9499 (2009)：シリコンのリングで、がんのマーカー（CEA）を目印なしで、希釈していない血清の中でも測りました。',
    note: '点1つは、実際にはとても多くの分子を表します。レーザーの掃引はゆっくりにし、色の変化は誇張しています。ずれの大きさは実際に近く、この研究では、がんのマーカーがくぼみを約100' + NB + 'pm（1' + NB + 'pmは1兆分の1メートル）動かしました。',
    w: { sensor: 'センサー', ref: '参照' },
  },
};

const W = meta.size.w, D = meta.size.d;
const Y = 0.085;                                    // height of the light (just above the ridges)
const ZB = 1.75;                                    // bus guide, near the front
const RS = 1.2, RR = 1.0;                           // ring radii: sensing, reference
const GAPC = 0.19;                                  // bus to ring: centre-line spacing
const XS = -1.6, XR = 2.45;                         // ring centres
const ZS = ZB - GAPC - RS, ZR = ZB - GAPC - RR;
const WELL = 1.7, RIM = 0.13, LIQ = 0.44;           // well: inner radius, rim width, liquid surface height
// the measurement: colour axis 0..1 = the laser's sweep, PM_SPAN picometres wide
const PM_SPAN = 400, GAM = 0.1;                     // linewidth 40 pm at 1550 nm: Q of about 40 000
const X_S0 = 0.56, X_R = 0.84;                      // resonances: sensing ring (before any binding), reference ring
const DEPTH_S = 0.9, DEPTH_R = 0.85, BUILD = 2.3;   // dip depths, light build-up in a ring (display)
const STEP_PM = 4.5;                                // shift per molecule shown (illustrative)
const U_LO = -0.07, U_HI = 0.07;                    // the laser's colours (kit.colour.ramp), exaggerated
const PASS = 2.5;                                   // seconds per sweep (one way)
// molecules
const NCAP = 48, MAXM = 30, PER_DROP = 20;
const YMIN = 0.12, CAP_H = 0.1, MOL_R = 0.055;

export function create(kit) {
  const { P, colour, THREE } = kit;
  const ramp = colour.ramp;
  kit.chip({ w: W, d: D, platform: 'si' });

  // ---------------------------------------------------------------- waveguides and light
  const bus = [P.line(-W / 2, ZB, XS, ZB), P.line(XS, ZB, XR, ZB), P.line(XR, ZB, W / 2, ZB)];
  const ringS = P.circle(XS, ZS, RS, Math.PI / 2, -1);           // starts at the coupling point, flows +x there
  const ringR = P.circle(XR, ZR, RR, Math.PI / 2, -1);
  // kit.ridges winds its triangles inwards (faces pointing into the ridge), so the double-sided ridge material
  // shades the tops as if lit from below: nearly black.  If the first (top) triangle faces down, flip the winding
  // of the whole mesh (kit bug, reported; the check keeps this right once the kit is fixed).
  const faceOut = m => {
    const ix = m.geometry.index, p = m.geometry.attributes.position, a = ix.getX(0), b = ix.getX(1), c = ix.getX(2);
    const ny = (p.getZ(b) - p.getZ(a)) * (p.getX(c) - p.getX(a)) - (p.getX(b) - p.getX(a)) * (p.getZ(c) - p.getZ(a));
    if (ny < 0) { for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); } ix.needsUpdate = true; }
    return m;
  };
  // in a mid grey of our own: on the kit's light-grey ridges the laser's red would wash out to pink
  faceOut(kit.ridges([P.line(-W / 2, ZB, W / 2, ZB), ringS, ringR], 'si')).material = kit.mat.std(0x707d8c, { roughness: 0.4, metalness: 0.25 });
  const net = kit.lightNet({ width: 0.3 });
  const sBus = bus.map((p, i) => net.add(p, { s0: [0, XS + W / 2, XR + W / 2][i] }));
  const sRingS = net.add(ringS, { s0: XS + W / 2 });
  const sRingR = net.add(ringR, { s0: XR + W / 2 });
  net.build();
  const inBeam = kit.beam({ from: [-W / 2 - 2.4, Y, ZB], to: [-W / 2, Y, ZB], rgb: ramp(0), power: 1, r0: 0.08, fade: 'in' });
  const outBeam = kit.beam({ from: [W / 2, Y, ZB], to: [W / 2 + 2.4, Y, ZB], rgb: ramp(0), power: 1, r0: 0.08, fade: 'out' });

  // ---------------------------------------------------------------- the well, the liquid, the cover
  const flat = (shape, depth, y0, mat, order) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 48 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    const m = new THREE.Mesh(g, mat); m.renderOrder = order;
    kit.group.add(m);
    return m;
  };
  const circle = (cx, cz, r) => { const s = new THREE.Path(); s.absarc(cx, -cz, r, 0, Math.PI * 2, false); return s; };
  const rimShape = new THREE.Shape(); rimShape.absarc(XS, -ZS, WELL + RIM, 0, Math.PI * 2, false);
  rimShape.holes.push(circle(XS, ZS, WELL));
  flat(rimShape, LIQ + 0.04, 0, new THREE.MeshStandardMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.5, roughness: 0.35, metalness: 0.05, depthWrite: false }), 5);
  const liqMat = new THREE.MeshStandardMaterial({ color: 0x4f9fdc, transparent: true, opacity: 0.13, roughness: 0.08, metalness: 0.1, depthWrite: false });
  const liq = new THREE.Mesh(new THREE.CircleGeometry(WELL, 64).rotateX(-Math.PI / 2), liqMat);
  liq.position.set(XS, LIQ, ZS); liq.renderOrder = 5;
  kit.group.add(liq);
  // the rinse: faint streaks on the liquid that flow along +x while it is being washed
  const flowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    for (let k = 0; k < 9; k++) {
      const y = 8 + 13.5 * k + 4 * Math.sin(k * 2.3), x = (k * 47) % 128, L = 40 + (k * 29) % 50;
      const grad = g.createLinearGradient(x, 0, x + L, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(x, y, L, 2.5); g.fillRect(x - 128, y, L, 2.5);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 1.5);
    return t;
  })();
  const flowMat = new THREE.MeshBasicMaterial({ map: flowTex, color: 0x9fd0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flowDisc = new THREE.Mesh(new THREE.CircleGeometry(WELL - 0.02, 64).rotateX(-Math.PI / 2), flowMat);
  flowDisc.position.set(XS, LIQ + 0.004, ZS); flowDisc.renderOrder = 5; flowDisc.visible = false;
  kit.group.add(flowDisc);
  let flowOn = 0, dimNow = 1;
  kit.onTick((dt, t, dim) => { dimNow = dim; });
  const rr = (x0, z0, x1, z1, r) => {
    const s = new THREE.Shape();
    s.moveTo(x0 + r, -z0); s.lineTo(x1 - r, -z0); s.quadraticCurveTo(x1, -z0, x1, -z0 - r);
    s.lineTo(x1, -z1 + r); s.quadraticCurveTo(x1, -z1, x1 - r, -z1); s.lineTo(x0 + r, -z1);
    s.quadraticCurveTo(x0, -z1, x0, -z1 + r); s.lineTo(x0, -z0 - r); s.quadraticCurveTo(x0, -z0, x0 + r, -z0);
    return s;
  };
  flat(rr(XR - 1.35, ZR - 1.3, XR + 1.35, ZB + 0.38, 0.3), 0.17, 0, new THREE.MeshStandardMaterial({ color: 0xd9e6f2, transparent: true, opacity: 0.3, roughness: 0.25, metalness: 0, depthWrite: false }), 5);

  // capture molecules (Y shapes) standing on the sensing ring, arms spread across the ring
  const yGeo = (() => {
    const parts = [
      new THREE.BoxGeometry(0.022, 0.06, 0.022).translate(0, 0.03, 0),
      new THREE.BoxGeometry(0.018, 0.05, 0.018).rotateZ(0.6).translate(-0.014, 0.078, 0),
      new THREE.BoxGeometry(0.018, 0.05, 0.018).rotateZ(-0.6).translate(0.014, 0.078, 0),
    ].map(g => g.toNonIndexed());
    const pos = [], nor = [];
    for (const g of parts) { pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  })();
  const caps = new THREE.InstancedMesh(yGeo, new THREE.MeshStandardMaterial({ color: 0xf4e9cc, emissive: 0x2e2818, roughness: 0.5 }), NCAP);
  const site = [];
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  for (let k = 0; k < NCAP; k++) {
    const a = 2 * Math.PI * (k + 0.5) / NCAP;
    const x = XS + RS * Math.cos(a), z = ZS + RS * Math.sin(a);
    site.push({ x, z, a, used: -1 });
    _q.setFromAxisAngle(_up, -a);
    caps.setMatrixAt(k, _m.compose(_p.set(x, kit.RIDGE.h, z), _q, _s.set(1.4, 1.4, 1.4)));
  }
  caps.instanceMatrix.needsUpdate = true;
  kit.group.add(caps);

  // the molecules to detect: small balls that drift in the liquid and stick to the ring
  const mols = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(MOL_R, 1), new THREE.MeshStandardMaterial({ color: 0xe55cb0, emissive: 0x4a0f36, roughness: 0.45 }), MAXM);
  mols.frustumCulled = false;
  kit.group.add(mols);
  const mx = new Float32Array(MAXM), my = new Float32Array(MAXM), mz = new Float32Array(MAXM), ma = new Float32Array(MAXM);
  const mode = new Int8Array(MAXM);                 // 0 none, 1 free, 2 bound, 3 washed away
  const msite = new Int16Array(MAXM).fill(-1), mt = new Float32Array(MAXM), sx = new Float32Array(MAXM), sy = new Float32Array(MAXM), sz = new Float32Array(MAXM);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), new THREE.MeshStandardMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.4, roughness: 0.05, depthWrite: false }));
  drop.visible = false; drop.renderOrder = 5;
  kit.group.add(drop);

  // ---------------------------------------------------------------- the model
  const lor = d => 1 / (1 + (2 * d / GAM) ** 2);
  let tSweep = 0, xL = 0, bound = 0, free = 0, xS = X_S0, shiftPm = 0;
  let rinsing = false, releaseAcc = 0, dropT = -1, pending = 0;
  let phase = 'clean', phaseT = 0, idleUser = 0;
  const gauss = () => (kit.rand() + kit.rand() + kit.rand() - 1.5) * 2;
  const T = x => (1 - DEPTH_S * lor(x - xS)) * (1 - DEPTH_R * lor(x - X_R));

  function addSample() {
    if (dropT >= 0) return;
    rinsing = false;
    dropT = 0; pending = PER_DROP;
  }
  function spill() {                                 // the drop lands: its molecules spread into the liquid
    let n = pending; pending = 0;
    for (let i = 0; i < MAXM && n > 0; i++) {
      if (mode[i] !== 0) continue;
      const r = (WELL - 0.25) * Math.sqrt(kit.rand()), a = 2 * Math.PI * kit.rand();
      mx[i] = XS + r * Math.cos(a) * 0.35; mz[i] = ZS + r * Math.sin(a) * 0.35; my[i] = LIQ - 0.05;
      sx[i] = XS + r * Math.cos(a); sz[i] = ZS + r * Math.sin(a);
      ma[i] = 0; mode[i] = 1; mt[i] = 0; n--;
    }
  }
  function rinse() { rinsing = true; releaseAcc = 0; dropT = -1; pending = 0; drop.visible = false; }
  function clearAll() {
    mode.fill(0); msite.fill(-1); for (const s of site) s.used = -1;
    bound = 0; free = 0; xS = X_S0; shiftPm = 0; rinsing = false; dropT = -1; pending = 0; drop.visible = false;
  }

  function stepMolecules(dt) {
    const sq = Math.sqrt(dt);
    bound = 0; free = 0;
    for (let i = 0; i < MAXM; i++) {
      if (mode[i] === 0) continue;
      mt[i] += dt;
      if (mode[i] === 1) {
        free++;
        ma[i] = Math.min(1, ma[i] + dt * 2.5);
        // spreading from the drop's landing point in the first moments, then a random walk with a slight sinking
        if (mt[i] < 0.6) { const f = Math.min(1, dt * 4); mx[i] += (sx[i] - mx[i]) * f; mz[i] += (sz[i] - mz[i]) * f; }
        mx[i] += 0.42 * sq * gauss(); mz[i] += 0.42 * sq * gauss();
        my[i] += 0.12 * sq * gauss() - 0.1 * dt;
        if (my[i] < YMIN) my[i] = 2 * YMIN - my[i];
        if (my[i] > LIQ - 0.06) my[i] = 2 * (LIQ - 0.06) - my[i];
        let dx = mx[i] - XS, dz = mz[i] - ZS, rho = Math.hypot(dx, dz);
        const lim = WELL - 0.08;
        if (rho > lim) { const k = (2 * lim - rho) / rho; mx[i] = XS + dx * k; mz[i] = ZS + dz * k; dx *= k; dz *= k; rho = Math.hypot(dx, dz); }
        if (!rinsing && mt[i] > 0.6 && my[i] < 0.3 && Math.abs(rho - RS) < 0.12 && kit.rand() < dt / 0.35) {
          // caught: glide onto the nearest free capture molecule
          const a = Math.atan2(dz, dx), k0 = Math.round((a / (2 * Math.PI)) * NCAP - 0.5);
          let s = -1;
          for (let d = 0; d < NCAP && s < 0; d++) for (const k of [k0 + d, k0 - d]) { const kk = ((k % NCAP) + NCAP) % NCAP; if (site[kk].used < 0) { s = kk; break; } }
          if (s >= 0) { site[s].used = i; msite[i] = s; mode[i] = 2; mt[i] = 0; sx[i] = mx[i]; sy[i] = my[i]; sz[i] = mz[i]; }
        }
      } else if (mode[i] === 2) {
        bound++;
        const s = site[msite[i]], e = Math.min(1, mt[i] / 0.3), f = e * e * (3 - 2 * e);
        mx[i] = sx[i] + (s.x - sx[i]) * f; mz[i] = sz[i] + (s.z - sz[i]) * f;
        my[i] = sy[i] + (kit.RIDGE.h + CAP_H * 1.4 + MOL_R - sy[i]) * f;
      } else if (mode[i] === 3) {
        mx[i] += 1.2 * dt + 0.2 * sq * gauss(); mz[i] += 0.2 * sq * gauss(); my[i] = Math.min(LIQ - 0.06, my[i] + 0.1 * dt);
        ma[i] -= dt * 0.9;
        if (ma[i] <= 0 || mx[i] > XS + WELL - 0.1) { mode[i] = 0; ma[i] = 0; }
      }
    }
    if (rinsing) {
      for (let i = 0; i < MAXM; i++) if (mode[i] === 1) { mode[i] = 3; mt[i] = 0; }
      releaseAcc += dt;
      while (releaseAcc > 0.09) {
        releaseAcc -= 0.09;
        let j = -1;
        for (let i = 0; i < MAXM; i++) if (mode[i] === 2) { j = i; break; }
        if (j < 0) break;
        site[msite[j]].used = -1; msite[j] = -1; mode[j] = 3; mt[j] = 0; bound--;
      }
      if (!bound && !free && !mode.some(v => v === 3)) rinsing = false;
    }
    // positions of the balls
    for (let i = 0; i < MAXM; i++) {
      const sc = mode[i] ? Math.max(0, Math.min(1, ma[i])) : 0;
      mols.setMatrixAt(i, _m.compose(_p.set(mx[i], my[i], mz[i]), _q.identity(), _s.set(sc, sc, sc)));
    }
    mols.instanceMatrix.needsUpdate = true;
  }

  // the laser's colour: a triangle sweep with rounded turns, x = 0..1 over the axis
  const sweepX = t => { const ph = (t / PASS) % 2, tri = ph < 1 ? ph : 2 - ph; return 0.02 + 0.96 * (tri * tri * (3 - 2 * tri) * 0.25 + tri * 0.75); };
  function light() {
    const u = U_LO + (U_HI - U_LO) * xL, rgb = ramp(u);
    const ls = lor(xL - xS), lr = lor(xL - X_R);
    const tS = 1 - DEPTH_S * ls, tR = 1 - DEPTH_R * lr;
    net.set(sBus[0], rgb, 1.1);
    const L1 = bus[1].len, L2 = bus[2].len;
    net.setFn(sBus[1], t => { const p = 1.1 * (tS + (1 - tS) * Math.exp(-((t * L1 / 0.45) ** 2))); return [rgb[0] * p, rgb[1] * p, rgb[2] * p]; });
    net.setFn(sBus[2], t => { const p = 1.1 * tS * (tR + (1 - tR) * Math.exp(-((t * L2 / 0.45) ** 2))); return [rgb[0] * p, rgb[1] * p, rgb[2] * p]; });
    net.set(sRingS, rgb, 0.03 + BUILD * ls * ls);           // (squared: lights up only near its resonance)
    net.set(sRingR, rgb, 0.03 + 0.85 * BUILD * lr * lr);
    inBeam.set(rgb, 1);
    outBeam.set(rgb, 1.05 * tS * tR);
  }

  // ---------------------------------------------------------------- plates
  const W2 = () => (text[kit.lang()] || text.en).w;
  const MUTED = [0.62, 0.68, 0.74], GOLD = [1, 0.84, 0.45];
  const uAt = x => U_LO + (U_HI - U_LO) * x;
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
    if (word) kit.draw.text(g, word, box.x + box.w, box.y + box.h, { size: fs, rgb: MUTED, align: 'right', weight: 600 });
    return { x: box.x, y: box.y, w: box.w, h: y - box.y };
  };
  const trail = new Float32Array(8);
  let trailAcc = 0;
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(W / 2 - 1.7), 1.85, -D / 2 - 1.3], title: 'in' });
  inPlate.live((g, box0) => {
    const box = axisIn(g, box0, kit.word('colour'));
    g.save();
    // the sweep range, shaded with the laser's colours; the laser's line now, and where it just was
    const grad = g.createLinearGradient(box.x, 0, box.x + box.w, 0);
    for (let k = 0; k <= 6; k++) grad.addColorStop(k / 6, colour.css(ramp(uAt(k / 6)), 0.18));
    g.fillStyle = grad; g.fillRect(box.x, box.y + box.h * 0.08, box.w, box.h * 0.92 - 3);
    g.lineCap = 'round';
    for (let k = trail.length - 1; k >= 0; k--) {
      const x = box.x + trail[k] * box.w, a = k === 0 ? 1 : 0.35 * (1 - k / trail.length);
      g.strokeStyle = colour.css(ramp(uAt(trail[k])), a);
      g.lineWidth = k === 0 ? 9 : 5;
      if (k === 0) { g.shadowColor = colour.css(ramp(uAt(trail[k])), 0.9); g.shadowBlur = 14; }
      g.beginPath(); g.moveTo(x, box.y + box.h - 4); g.lineTo(x, box.y + box.h * 0.1); g.stroke();
    }
    g.restore();
  }, 12);

  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [W / 2 - 1.7, 1.85, -D / 2 - 1.3], title: 'out' });
  outPlate.live((g, box) => {
    const w = W2();
    const ls = Math.round(box.h * 0.15);                         // labels under the dips
    const top = box.y + box.h * 0.3, bot = box.y + box.h - ls - 10;
    const X = x => box.x + x * box.w, Yv = v => bot - (bot - top) * v;
    g.save();
    // where the sensing dip was before any molecule was caught
    g.setLineDash([9, 7]); g.strokeStyle = 'rgba(210,225,240,0.85)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(X(X_S0), box.y + 2); g.lineTo(X(X_S0), bot + 2); g.stroke();
    g.setLineDash([]);
    // the light that passes, against the laser's colour (each piece drawn in that colour)
    g.lineWidth = 5; g.lineCap = 'round';
    const n = 120;
    for (let i = 0; i < n; i++) {
      const x0 = i / n, x1 = (i + 1) / n;
      g.strokeStyle = colour.css(ramp(uAt(x0)), 0.95);
      g.beginPath(); g.moveTo(X(x0), Yv(T(x0))); g.lineTo(X(x1), Yv(T(x1))); g.stroke();
    }
    // the laser now
    g.fillStyle = '#fff'; g.shadowColor = colour.css(ramp(uAt(xL)), 1); g.shadowBlur = 16;
    g.beginPath(); g.arc(X(xL), Yv(T(xL)), 9, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    // the shift: a gold arrow from the dashed line to the dip, and its size
    const sh = Math.round(shiftPm);
    if (sh >= 1) {
      const ya = box.y + box.h * 0.13;
      g.strokeStyle = colour.css(GOLD); g.fillStyle = colour.css(GOLD); g.lineWidth = 4;
      if (X(X_S0) - X(xS) > 16) { g.beginPath(); g.moveTo(X(X_S0), ya); g.lineTo(X(xS) + 12, ya); g.stroke(); }
      g.beginPath(); g.moveTo(X(xS), ya); g.lineTo(X(xS) + 14, ya - 8); g.lineTo(X(xS) + 14, ya + 8); g.closePath(); g.fill();
      // (no number: '-25 pm' read as a clock time, and as a shift the wrong way - the arrow says it)
    }
    g.restore();
    kit.draw.text(g, w.sensor, X(xS), box.y + box.h, { size: ls, rgb: [0.55, 0.8, 1], align: 'center', weight: 700 });
    kit.draw.text(g, w.ref, X(X_R), box.y + box.h, { size: ls, rgb: MUTED, align: 'center', weight: 700 });
  }, 12);

  // ---------------------------------------------------------------- story and interface
  const setPhase = p => { phase = p; phaseT = 0; };
  function auto(dt) {                                // the chip's own little story when nobody touches it
    phaseT += dt;
    if (phase === 'clean' && phaseT > 2.0) { addSample(); setPhase('binding'); }
    else if (phase === 'binding' && phaseT > 11) setPhase('hold');
    else if (phase === 'hold' && phaseT > 4) { rinse(); setPhase('rinsing'); }
    else if (phase === 'rinsing' && !rinsing && phaseT > 1) setPhase('clean');
  }
  light();
  return {
    anchors: {
      in: [-W / 2 - 1.3, Y + 0.05, ZB],
      ring: [XS - RS, Y + 0.05, ZS],
      mol: [XS + RS * Math.cos(-1.0), kit.RIDGE.h + 0.12, ZS + RS * Math.sin(-1.0)],
      ref: [XR + 0.7 * RR, 0.2, ZR - 0.7 * RR],
      out: [W / 2 + 1.3, Y + 0.05, ZB],
    },
    controls: [{ id: 'add', type: 'button' }, { id: 'rinse', type: 'button' }],
    _probe: () => ({ xL, xS, bound, free, shiftPm }),           // read-only, for tests and screenshots
    act(id) {
      if (id === 'add') { addSample(); idleUser = 15; setPhase('binding'); }
      if (id === 'rinse') { rinse(); idleUser = 15; setPhase('rinsing'); }
    },
    status() {
      if (rinsing) return { key: 'status.rinse', vars: {} };
      if (bound > 0) return { key: bound === 1 ? 'status.one' : 'status', vars: { n: bound, s: Math.round(shiftPm) } };
      if (free > 0 || dropT >= 0) return { key: 'status.wait', vars: {} };
      return { key: 'status.clean', vars: {} };
    },
    focus(on) { if (on && idleUser <= 0) { clearAll(); setPhase('clean'); phaseT = 0.8; } },
    reset() { clearAll(); idleUser = 0; setPhase('clean'); tSweep = 0; stepMolecules(0); },
    update(dt) {
      const sp = kit.reduced ? 0.5 : 1;
      idleUser = Math.max(0, idleUser - dt);
      if (idleUser <= 0) auto(dt);
      // the drop of sample falling into the well
      if (dropT >= 0) {
        dropT += dt * sp;
        const f = Math.min(1, dropT / 0.55);
        drop.visible = true;
        drop.position.set(XS + 0.2, 2.4 - (2.4 - LIQ) * f * f, ZS - 0.1);
        const sq = f < 1 ? 1 : Math.max(0, 1 - (dropT - 0.55) / 0.25);
        drop.scale.set(1 + (1 - sq) * 0.8, sq, 1 + (1 - sq) * 0.8);
        if (dropT >= 0.55 && pending) spill();
        if (dropT >= 0.8) { dropT = -1; drop.visible = false; }
      }
      stepMolecules(dt * sp);
      // the resonance follows the molecules caught (a little smoothed, so that each one is a visible step)
      const target = bound * STEP_PM;
      shiftPm += (target - shiftPm) * Math.min(1, dt * 5);
      xS = X_S0 - shiftPm / PM_SPAN;
      flowOn += ((rinsing ? 1 : 0) - flowOn) * Math.min(1, dt * 4);
      liqMat.opacity = 0.13 + 0.08 * flowOn;
      flowDisc.visible = flowOn > 0.01;
      if (flowDisc.visible) { flowMat.opacity = 0.4 * flowOn * dimNow; flowTex.offset.x -= dt * 0.9 * sp; }
      tSweep += dt * sp;
      xL = sweepX(tSweep);
      trailAcc += dt;
      if (trailAcc > 0.07) { trailAcc = 0; for (let k = trail.length - 1; k > 1; k--) trail[k] = trail[k - 1]; trail[1] = trail[0]; }
      trail[0] = xL;
      light();
    },
  };
}

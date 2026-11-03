// Tab 3, "Quantum internet":
//   1. chip (14 s): our chip writes a waveguide with a periodic poling profile (programs/qsource.js); blue pump light
//      from a small laser makes twin photons, and the twins leave by two different paths - one along a short fibre into
//      a local memory (a Fabry-Perot resonator with an atom inside, apps/cavity.js: the twin bounces between the
//      mirrors, then the atom lights up), one into a long fibre;
//   2. pair (11 s, kept quick): the camera draws back; a distant chip makes twins too, and
//      its partner twin waits in its memory as well; one twin from each chip meets the other in the middle, at a beam
//      splitter with a detector at each output (a simplified "quantum eraser": after the splitter nobody can tell which
//      chip a photon came from).  Both detectors click together - a two-photon measurement - and the twins waiting in
//      the two memories are entangled: both atoms pulse cyan and an arc of light grows from the two memories to the
//      middle;
//   3. web (22 s): the camera draws back further: many chips, many meeting points - entanglement shared across a web,
//      a quantum internet.
// A picture of the idea (heralded entanglement by which-path erasure, as in entanglement swapping), not a model.
import * as THREE from 'three';
import { TWIN, PUMP, PUMP_X, meta as QMETA } from '../programs/qsource.js';
import { lin } from '../kit/colour.js';
import { Memory, ENT } from './cavity.js';

const CHIP = 14, PAIR = 11, WEB = 22;          // seconds per part
const SPEED = 15;                              // scene units per second of a twin in a long fibre (the chip part)
const TO_MEM = 0.6;                            // seconds from the chip's edge to the memory (the short fibre)
// the pair part's one round: the twins are born as the camera starts to draw back (R_BORN, R_AT along the stripes);
// their partners are stored in the memories as the flight ends; the travellers reach the beam splitter together
// (R_MEET), go on to the two detectors (R_OUT), both click, and the arc grows from the memories to the middle (GROW),
// stays (HOLD) and fades (FADE) as the camera leaves for the web
const R_BORN = 0.05, R_AT = 0.9, R_MEET = 4.4, R_OUT = 0.3;
const GROW = 1.2, HOLD = 4.0, GROW_WEB = 0.8, HOLD_WEB = 2.4, FADE = 1.0;
// a memory beside its chip, by the front output: where the fibre on the table ends (x from the chip's middle towards
// its outputs, z), the turn of its axis (into the cavity: away from the chip and a little back, so that the camera of
// the chip part sees the mirrors' faces three-quarter on; in the wide views the camera looks from the other side, and
// the memories turn the other way: wide)
const MEM = { x: 5.6, z: 1.6, turn: 0.42, wide: -0.42 };
const MEM_WIDE = 1.6;                          // the two memories drawn larger once the camera has drawn back
const SZ = 0.019;                              // a photon's size per unit of camera distance (as big on screen at any zoom)
const KSB = 1.3;                               // the meeting point between our chip and the distant one, drawn larger
const smooth = x => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

const ARC_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// an arc of entanglement: two strands of light twisting along it; when it is made it grows from the two memories
// (u = 0 and 1) towards the middle, a bright head on each growing end
const ARC_FS = /* glsl */ `
uniform float uOn, uGrow, uTime;
uniform vec3 uCol;
varying vec2 vUv;
void main() {
  float u = vUv.x, a = vUv.y * 6.2831853;
  float d = abs(u - 0.5), front = 0.5 * (1.0 - uGrow);
  if (d < front - 0.0005) discard;
  float s1 = pow(max(0.0, cos(a - u * 40.0 + uTime * 3.0)), 6.0), s2 = pow(max(0.0, cos(a + 3.14159 - u * 40.0 + uTime * 3.0)), 6.0);
  float head = (1.0 - step(0.999, uGrow)) * exp(-pow((d - front) / 0.03, 2.0));
  float glow = 0.35 + 1.4 * (s1 + s2) + 2.4 * head;
  gl_FragColor = vec4(uCol * glow * uOn, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// the photons' dots, fading to nothing at the edge of their square (kit/photons.js stops at ~4 %, which shows as a
// square around a bright dot once the dots are big)
const DOT_FS = /* glsl */ `
uniform float uDim;
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  float a = (exp(-r2 * 3.2) + 0.6 * exp(-r2 * 18.0)) * (1.0 - smoothstep(0.5, 1.0, r2));
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function radial(stops, size = 128) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// a tube along a curve, thinner at its two ends (an arc leaves a memory thin, so that the atom stays in sight)
function taper(geo, curve, segs, radial) {
  const pos = geo.attributes.position, p = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, f = 0.22 + 0.78 * smooth(Math.min(u, 1 - u) / 0.09);
    curve.getPointAt(u, p);
    for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; q.fromBufferAttribute(pos, k).sub(p).multiplyScalar(f).add(p); pos.setXYZ(k, q.x, q.y, q.z); }
  }
  pos.needsUpdate = true;
  return geo;
}

export function create(ctx) {
  const { kit, bench, chipAt } = ctx;
  const g = kit.group;
  const Y = ctx.y + bench.S.h;                                   // the top of our chip
  // the program's scale on the slate (as bench.make does it), so that the scene meets the program's light where it is
  const SC = Math.min((bench.S.w - 0.3) / QMETA.size.w, (bench.S.d - 1.2) / QMETA.size.d);
  const TY = Y + SC * 0.13, X1 = 4.3 * SC, ZB = 1.45 * SC;       // the twins' height; where the chip's two outputs are
  const PY = bench.S.h + SC * 0.1;                               // the pump light's height above the table
  const prog = () => (bench.current && bench.current.id === 'qsource' ? bench.current : null);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.35, ...o });
  const ph = kit.photons({ max: 260, size: 0.5 });
  ph.object.material.fragmentShader = DOT_FS; ph.object.material.needsUpdate = true;
  const flashTex = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(200,240,255,0.7)'], [1, 'rgba(120,200,255,0)']]);
  const v3 = new THREE.Vector3();

  // ---------------------------------------------------------------- the ground: a faint grid for the zoom-outs
  const gridTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const gg = c.getContext('2d'); gg.fillStyle = '#000'; gg.fillRect(0, 0, 128, 128);
    gg.fillStyle = 'rgba(120,160,200,0.55)'; gg.fillRect(0, 0, 128, 2); gg.fillRect(0, 0, 2, 128);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(180, 180); t.anisotropy = 8;
    return t;
  })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  ground.position.set(chipAt.x + 30, ctx.y - 1.25, 0); ground.visible = false; g.add(ground);

  // ---------------------------------------------------------------- the pieces
  // the other chips' circuit, painted as our program lays it out (stripes, splitter, two outputs)
  const stripesTex = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 448;
    const px = x => (x + 4.3) / 8.6 * 512, py = z => (z + 3.75) / 7.5 * 448;
    const gg = c.getContext('2d'); gg.fillStyle = '#000'; gg.fillRect(0, 0, 512, 448);
    gg.strokeStyle = '#3fff6a'; gg.lineWidth = 7;
    const xs = px(1.5 * SC), xe = px(3.65 * SC), yb = py(-ZB), yf = py(ZB);
    gg.beginPath(); gg.moveTo(0, 224); gg.lineTo(xs, 224);
    gg.bezierCurveTo((xs + xe) / 2, 224, (xs + xe) / 2, yb, xe, yb); gg.lineTo(512, yb);
    gg.moveTo(xs, 224); gg.bezierCurveTo((xs + xe) / 2, 224, (xs + xe) / 2, yf, xe, yf); gg.lineTo(512, yf); gg.stroke();
    gg.fillStyle = '#3fff6a';
    for (let x = px(-3.1 * SC); x < px(0.8 * SC); x += 11.7) gg.fillRect(x, py(-0.5 * SC), 5.8, py(0.5 * SC) - py(-0.5 * SC));
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const slateMat = std(0xc3cad2, { roughness: 0.5, metalness: 0.05 }), darkMat = std(0x262b31);
  const coneGeo = new THREE.CylinderGeometry(0.9 * Math.SQRT2, 4.5 * Math.SQRT2, 10.0, 4, 1, true).rotateY(Math.PI / 4);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0x2bff5a, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const fibreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.2, 0.3) });
  // a fibre through points (in its parent's frame)
  const fibre = (pts, parent = g) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => (p.isVector3 ? p.clone() : new THREE.Vector3(...p))), false, 'centripetal');
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(24, Math.round(c.getLength() * 3)), 0.09, 6), fibreMat); parent.add(m);
    return { c, m, len: c.getLength() };
  };
  // the pump laser: a small steel box with a blue band, whose window sends the blue pump light along the chip's
  // waveguide; its origin is the window's foot on the table; facing +x (dir 1) or -x
  const PUMP_L = lin(PUMP);
  const laserGeo = new THREE.BoxGeometry(1.6, 0.95, 0.9), laserMat = std(0x8f9aa6, { roughness: 0.38, metalness: 0.35 });
  const bandGeo = new THREE.BoxGeometry(1.62, 0.09, 0.92), capGeo = new THREE.BoxGeometry(0.1, 0.64, 0.64), capMat = std(0x262c33, { roughness: 0.5 });
  const winGeo = new THREE.CircleGeometry(0.15, 24).rotateY(Math.PI / 2);
  const winOff = new THREE.MeshBasicMaterial({ color: new THREE.Color(...PUMP_L).multiplyScalar(0.9), toneMapped: false });
  const laser = (parent, x, y, z, dir, win = winOff) => {
    const l = new THREE.Group(); l.position.set(x, y, z); if (dir < 0) l.rotation.y = Math.PI; parent.add(l);
    const body = new THREE.Mesh(laserGeo, laserMat); body.position.set(-0.86, 0.475, 0); body.castShadow = true; l.add(body);
    const band = new THREE.Mesh(bandGeo, win); band.position.set(-0.86, 0.3, 0); l.add(band);
    const cap = new THREE.Mesh(capGeo, capMat); cap.position.set(-0.04, PY, 0); l.add(cap);
    const w = new THREE.Mesh(winGeo, win); w.position.set(0.02, PY, 0); l.add(w);
    return l;
  };
  // a memory beside a chip (in the chip's frame: dir 1 faces +x; scale: how large it is drawn), and the short fibre from
  // the chip's front output, over the slate's edge and along the table to it
  const memoryOf = (parent, ox, oy, dir, scale = 1, turn = MEM.turn) => {
    const mem = new Memory({ fibreMat });
    mem.root.position.set(ox + dir * MEM.x, oy + 0.09, MEM.z);
    mem.root.rotation.y = dir > 0 ? turn : Math.PI - turn;
    mem.root.scale.setScalar(scale);
    parent.add(mem.root);
    const y = oy + TY - ctx.y;
    const fib = fibre([[ox + dir * X1, y, ZB], [ox + dir * 4.8, y, ZB + 0.02], [ox + dir * 5.15, oy + 0.22, ZB + 0.12], [ox + dir * 5.4, oy + 0.09, MEM.z + 0.09], [ox + dir * MEM.x, oy + 0.09, MEM.z]], parent);
    return { mem, fib };
  };
  // a chip like ours (a picture): its own platform, the slate, the stripes written by light, the projector, the pump
  // laser, the memory; facing +x (dir 1) or -x (dir -1)
  const node = (x, z, dir = 1, memScale = 1, memTurn = MEM.turn) => {
    const n = new THREE.Group(); n.position.set(x, ctx.y, z); g.add(n);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 15), std(0x1b2026, { roughness: 0.7 })); pl.position.y = -0.6; pl.receiveShadow = true; n.add(pl);
    const slate = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.55, 8.6), slateMat); slate.position.y = 0.275; slate.castShadow = true; n.add(slate);
    const pat = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 7.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: stripesTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pat.position.y = 0.57; if (dir < 0) pat.rotation.y = Math.PI; n.add(pat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.6), darkMat); body.position.y = 11.15; n.add(body);
    const cone = new THREE.Mesh(coneGeo, coneMat); cone.position.y = 0.55 + 5.0; n.add(cone);
    laser(n, dir * PUMP_X * SC, 0, 0, dir);
    const { mem, fib } = memoryOf(n, 0, 0, dir, memScale, memTurn);
    return { n, mem, fib, x, z, dir };
  };
  // the meeting point: a beam splitter (a glass cube with its diagonal) on a post, a detector at each output
  const stGeo = { post: new THREE.CylinderGeometry(0.35, 0.5, 0.9, 16), cube: new THREE.BoxGeometry(1.1, 1.1, 1.1), diag: new THREE.PlaneGeometry(1.5, 1.05), det: new THREE.BoxGeometry(1.0, 1.0, 1.0) };
  const stMat = {
    cube: new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.42 }),
    diag: new THREE.MeshBasicMaterial({ color: 0xd8f2ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }),
    det: std(0x1a1e24),
  };
  const sprite = (s, x, y, z, scale) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sp.position.set(x, y, z); sp.scale.setScalar(scale); s.add(sp);
    return sp;
  };
  const station = (x, z, k = 1) => {
    const s = new THREE.Group(); s.position.set(x, ctx.y, z); s.scale.setScalar(k); g.add(s);
    const post = new THREE.Mesh(stGeo.post, darkMat); post.position.y = 0.45; s.add(post);
    const cube = new THREE.Mesh(stGeo.cube, stMat.cube); cube.position.y = 1.45; s.add(cube);
    const diag = new THREE.Mesh(stGeo.diag, stMat.diag); diag.rotation.y = Math.PI / 4; diag.position.y = 1.45; s.add(diag);
    const det = [[2.4, 0], [0, 2.4]].map(([dx, dz]) => {
      const d = new THREE.Mesh(stGeo.det, stMat.det); d.position.set(dx, 1.45, dz); s.add(d);
      return sprite(s, dx, 2.2, dz, 3.2);
    });
    const glint = sprite(s, 0, 1.45, 0, 4);
    const y = ctx.y + 1.45 * k;
    return { s, det, glint, x, z, k, at: [x, y, z], detAt: [[x + 2.4 * k, y, z], [x, y, z + 2.4 * k]] };
  };
  const arcMat = () => new THREE.ShaderMaterial({ uniforms: { uOn: { value: 0 }, uGrow: { value: 0 }, uTime: { value: 0 }, uCol: { value: new THREE.Vector3(...lin(ENT)).multiplyScalar(1.6) } }, vertexShader: ARC_VS, fragmentShader: ARC_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const arc = (a, b, h, grow = GROW_WEB, hold = HOLD_WEB) => {
    const A = a.clone(), B = b.clone(), M = A.clone().add(B).multiplyScalar(0.5); M.y += h;
    const c = new THREE.QuadraticBezierCurve3(A, M, B);
    const m = new THREE.Mesh(taper(new THREE.TubeGeometry(c, 96, 0.22 + 0.004 * A.distanceTo(B), 10), c, 96, 10), arcMat()); m.renderOrder = 9; m.visible = false; g.add(m);
    return { m, c, apex: c.getPoint(0.5), on: 0, t: 0, level: 0, grow, hold, mems: null, met: false, spark: null };
  };

  // ---------------------------------------------------------------- node A: our bench, its pump laser and its memory
  const winA = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
  laser(g, chipAt.x + PUMP_X * SC, ctx.y, 0, 1, winA);
  const { mem: memA, fib: fibA } = memoryOf(g, chipAt.x, ctx.y, 1);
  // our memory as the camera draws back (k 0..1): larger, and turned towards the camera of the wide views
  const poseA = k => { const e = smooth(k); memA.root.rotation.y = MEM.turn + (MEM.wide - MEM.turn) * e; memA.root.scale.setScalar(1 + (MEM_WIDE - 1) * e); };
  // the station between A and B, node B (a distant chip facing back towards A), their long fibres from the chips'
  // back outputs (first away from the viewer - far away - clear of the memories and their labels)
  const SAB = station(chipAt.x + 30, 0, KSB);
  const B = node(chipAt.x + 60, 0, -1, MEM_WIDE, MEM.wide);
  B.n.updateMatrixWorld(true);
  const sy = SAB.at[1], sf = 0.58 * KSB;                          // the cube's middle; half its side
  const longFibre = (x0, dir, end) => fibre([[x0 + dir * X1, TY, -ZB], [x0 + dir * 5.0, ctx.y + 0.25, -2.2], [x0 + dir * 6.2, ctx.y + 0.25, -4.5], [x0 + dir * 8.5, ctx.y + 0.25, -7.0], [x0 + dir * 13, ctx.y + 0.25, -8.0], ...end]);
  const fA = longFibre(chipAt.x, 1, [[SAB.x - 8, ctx.y + 0.25, -5.5], [SAB.x - 2.2, ctx.y + 1.1, -0.3], [SAB.x - sf, sy, 0]]);
  const fB = longFibre(B.x, -1, [[SAB.x + 8, ctx.y + 0.25, -6.5], [SAB.x + 0.25, ctx.y + 1.1, -2.6], [SAB.x, sy, -sf]]);
  // (in the chip part the long fibre's twins fade out once they are out of the picture)
  const uOffA = (() => { const p = new THREE.Vector3(); for (let i = 1; i <= 200; i++) if (fA.c.getPointAt(i / 200, p).x > chipAt.x + 13) return i / 200; return 1; })();
  poseA(1);
  const atomA = memA.atomAt(MEM_WIDE), atomB = B.mem.atomAt(MEM_WIDE);
  poseA(0);
  const arcAB = arc(atomA, atomB, 18, GROW, HOLD);
  arcAB.spark = sprite(g, arcAB.apex.x, arcAB.apex.y, arcAB.apex.z, 7);
  // labels (callouts first in their order: the culling keeps the earlier one)
  const lMeet = ctx.label('lbl.meet', 'callout quantum'); lMeet.at(SAB.x, ctx.y + 2.05 * KSB, 0);
  const lEnt = ctx.label('lbl.entangled', 'callout quantum'); lEnt.at(arcAB.apex.x, arcAB.apex.y + 0.6, arcAB.apex.z);
  const lMem = ctx.label('lbl.memory', 'callout quantum');
  const lPump = ctx.label('lbl.pump', 'callout pump'); lPump.at(chipAt.x + PUMP_X * SC - 0.25, ctx.y + 0.98, 0);   // (over its window)
  const lTwin = ctx.label('lbl.twins', 'callout twins');
  const pairOnly = [B.n, SAB.s, fB.m];

  // ---------------------------------------------------------------- the web: more chips, more meeting points
  const WEBN = [[-48, -74], [-70, 52], [24, 104], [104, 92], [138, -30], [88, -104], [12, -122]].map(([x, z]) => node(chipAt.x + x, z, x < 30 ? 1 : -1));
  const all = { A: { x: chipAt.x, z: 0, mem: memA }, B, C: WEBN[0], D: WEBN[1], E: WEBN[2], F: WEBN[3], G: WEBN[4], H: WEBN[5], I: WEBN[6] };
  // a memory's atom once the web's chips have grown to their size (WEB_S)
  const WEB_S = 1.8;
  const atomAt = nd => (nd === all.A ? atomA.clone() : nd === B ? atomB.clone() : nd.n.position.clone().addScaledVector(nd.mem.atomAt(1, new THREE.Vector3(), true), WEB_S));
  const EDGES = [['A', 'C'], ['A', 'D'], ['A', 'E'], ['B', 'F'], ['B', 'G'], ['B', 'H'], ['C', 'I'], ['I', 'H'], ['D', 'E'], ['E', 'F'], ['G', 'H'], ['C', 'D'], ['F', 'G']];
  const web = EDGES.map(([a, b]) => {
    const na = all[a], nb = all[b], mx = (na.x + nb.x) / 2, mz = (na.z + nb.z) / 2;
    const st = station(mx, mz);
    const fa = fibre([[na.x, ctx.y + 0.25, na.z], [mx, ctx.y + 0.25, mz]]), fb = fibre([[nb.x, ctx.y + 0.25, nb.z], [mx, ctx.y + 0.25, mz]]);
    const sa = atomAt(na), sb = atomAt(nb);
    return { st, fa, fb, arc: arc(sa, sb, 0.28 * sa.distanceTo(sb)), na, nb, busy: false };
  });
  const webOnly = [...WEBN.map(n => n.n), ...web.flatMap(e => [e.st.s, e.fa.m, e.fb.m])];
  const arcs = [arcAB, ...web.map(w => w.arc)];
  const mems = [memA, B.mem, ...WEBN.map(n => n.mem)];

  // ---------------------------------------------------------------- events
  const flash = [];                              // sprites fading out: { sp, t, dur, max }
  const blink = (sp, dur = 0.7, max = 1) => flash.push({ sp, t: 0, dur, max });
  // a point moving along a curve (u0..u1 of it), in world coordinates (m4: the curve's frame), no allocation per frame
  const alongC = (c, u0 = 0, u1 = 1, m4 = null) => {
    const o = [0, 0, 0], p = new THREE.Vector3();
    return u => { c.getPointAt(u0 + (u1 - u0) * u, p); if (m4) p.applyMatrix4(m4); o[0] = p.x; o[1] = p.y; o[2] = p.z; return o; };
  };
  const shoot = (o, k = 1) => { const it = ph.emit(o); it.k = k; return it; };
  // a twin from a chip's front output along the short fibre into its memory: up into the input mirror, back and forth
  // between the mirrors, then the atom takes it (stored)
  const toMemory = (mem, fib, m4 = null) => shoot({ along: alongC(fib.c, 0, 1, m4), dur: TO_MEM, rgb: TWIN, power: 0.95, fade: 0.04, onEnd: () => {
    shoot({ along: mem.path(), dur: mem.PATH, rgb: TWIN, power: 1.2, fade: 0.03, onEnd: () => mem.store() }, 0.6);
  } });
  // the cyan arc between two memories, and the atoms' pulse (the arcs say it every frame)
  const herald = (e, ms) => { e.on = 1; e.t = 0; e.level = 0; e.met = false; e.mems = ms; e.m.visible = true; };
  // the two travellers at a meeting point: a glint in the beam splitter, a photon on to each detector, and both
  // detectors click together (a two-photon measurement)
  const meet = (S, done) => {
    blink(S.glint, 0.5, 1);
    let n = 0;
    for (const d of S.detAt) shoot({ from: S.at, to: d, dur: R_OUT, rgb: TWIN, power: 1.1, fade: 0.08, onEnd: () => { if (++n === 2) { for (const l of S.det) blink(l, 1.1, 1); done(); } } }, 0.8);
  };
  const pend = { n: 0 };
  const arrive = r => {
    if (st.part !== 'pair' || r !== st.round || ++pend.n !== 2) return;
    meet(SAB, () => { if (st.part === 'pair') { herald(arcAB, [memA, B.mem]); st.clicks++; } });
  };
  // our twins at the chip's edge: the front one into our memory, the back one into the long fibre (in the pair part
  // the round's traveller reaches the meeting point at R_MEET)
  const onExitA = (b, pid) => {
    if (b === 1) { toMemory(memA, fibA); return; }
    if (st.part === 'pair' && pid === st.roundId) {
      const r = st.round;
      shoot({ along: alongC(fA.c), dur: Math.max(0.6, R_MEET - st.t), rgb: TWIN, power: 1.0, fade: 0.03, onEnd: () => arrive(r) });
    } else shoot({ along: alongC(fA.c, 0, uOffA), dur: uOffA * fA.len / SPEED, rgb: TWIN, power: 0.95, fade: 0.1 });
  };
  // node B's twins (a picture of the same source, mirrored): born side by side in its stripes, to its two outputs
  const emitB = (dur, at) => {
    const xb = -3.1 + 3.9 * at, r = st.round;
    for (const b of [0, 1]) {
      const sg = b === 0 ? -1 : 1;
      const pts = [[-xb + sg * 0.15, sg * 0.2], [-1.25 + sg * 0.1, sg * 0.15], [-1.6, sg * 0.1], [-2.6, sg * 0.73], [-3.65, sg * 1.45], [-4.3, sg * 1.45]].map(([x, z]) => new THREE.Vector3(B.x + x * SC, TY, z * SC));
      const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      shoot({ along: alongC(c), dur, rgb: TWIN, power: 0.9, fade: 0.04, onEnd: () => {
        if (b === 1) toMemory(B.mem, B.fib, B.n.matrixWorld);
        else shoot({ along: alongC(fB.c), dur: Math.max(0.6, R_MEET - st.t), rgb: TWIN, power: 1.0, fade: 0.03, onEnd: () => arrive(r) });
      } }, 0.7);
    }
  };
  const startRound = p => {
    st.round++; pend.n = 0;
    const dur = p.inst.emit(R_AT);
    st.roundId = p.inst.lastId;
    emitB(dur, R_AT);
  };
  const webEvent = () => {
    const free = web.filter(e => !e.busy && !e.arc.m.visible);
    if (!free.length) return;
    const e = free[Math.floor(kit.rand() * free.length)];
    e.busy = true;
    let n = 0;
    const done = () => {
      if (++n < 2) return;
      e.busy = false;
      blink(e.st.glint, 0.5, 1); for (const l of e.st.det) blink(l, 1.0, 1);      // both detectors click together
      herald(e.arc, [e.na.mem, e.nb.mem]);
    };
    shoot({ along: alongC(e.fa.c), dur: e.fa.len / (SPEED * 4), rgb: TWIN, power: 1.1, fade: 0.05, onEnd: done }, 0.5);
    shoot({ along: alongC(e.fb.c), dur: e.fb.len / (SPEED * 4), rgb: TWIN, power: 1.1, fade: 0.05, onEnd: done }, 0.5);
  };

  // ---------------------------------------------------------------- the story
  const st = { part: 'chip', t: 0, serial: 0, round: 0, roundId: -1, webT: 0, kPair: 0, kWeb: 0, hooked: null, clicks: 0, focus: new THREE.Vector3(), view: null };
  // (boxes: our pump laser, chip, projector and memory; the two chips, their memories and the meeting point; the web)
  const VIEWS = {
    chip: { target: [chipAt.x + 1.1, 3.4, 0.4], elev: 30, dist: 24.5, box: [[chipAt.x - 7.5, 0, -4.6], [chipAt.x + 9.8, 12, 4.6]], dur: 3.0 },
    pair: { target: [chipAt.x + 30, 2.5, 0], elev: 34, dist: 76, box: [[chipAt.x - 7.5, 0, -7.6], [chipAt.x + 69.5, 12.5, 7.6]], fog: [150, 330], maxDist: 220, dur: 3.6 },
    web: { target: [chipAt.x + 40, 0, 8], elev: 50, dist: 335, box: [[chipAt.x - 86, 0, -135.5], [chipAt.x + 154, 22, 117.5]], fog: [380, 900], maxDist: 600, dur: 4.5 },
  };
  const go = part => {
    st.part = part; st.t = 0; st.serial++; st.round = 0; st.roundId = -1; pend.n = 0;
    st.focus.fromArray(VIEWS[part].target);
    if (part === 'pair') B.mem.reset();
    else for (const m of mems) m.reset();
  };
  const restart = () => {
    go('chip');
    st.kPair = st.kWeb = 0;
    ph.clear(); flash.length = 0;
    for (const e of arcs) { e.m.visible = false; e.on = 0; e.level = 0; }
    for (const e of web) e.busy = false;
  };
  for (const o of [...pairOnly, ...webOnly]) o.visible = false;
  st.focus.fromArray(VIEWS.chip.target);

  return {
    program: 'qsource',
    get view() { if (!st.view || st.view.serial !== st.serial) st.view = { ...VIEWS[st.part], serial: st.serial }; return st.view; },
    caption: () => `app.quantum.cap.${st.part}`,
    // part: 'chip' | 'pair' | 'web';  arc: the entanglement between our chip and the distant one (on x grown);
    // webArcs: arcs shown in the web;  photons: twins in flight in the scene;  memory: our memory 'idle' | 'bounce' |
    // 'stored' | 'entangled';  clicks: two-photon clicks at the meeting point;  t: seconds into the part
    get state() { return { part: st.part, arc: arcAB.level, webArcs: web.filter(e => e.arc.on > 0.3).length, photons: ph.count(), memory: memA.state, clicks: st.clicks, t: st.t }; },
    controls: [],
    enter() { restart(); },
    leave() { bench.hideLabels(false); ph.clear(); },
    update(dt, t, camera, pointScale, raw = dt) {
      st.t += raw;
      const p = prog();
      if (p && st.hooked !== p.inst) { st.hooked = p.inst; p.inst.onExit(onExitA); }
      const running = !!p && bench.phase === 'run' && bench.task > 0.6;
      if (p) p.inst.auto = st.part === 'chip';
      // the parts
      if (st.part === 'chip') { if (running && st.t >= CHIP) go('pair'); }
      else if (st.part === 'pair') {
        if (!st.round && st.t >= R_BORN && p) startRound(p);
        if (st.t >= PAIR) go('web');
      } else if (st.part === 'web') {
        st.webT += raw;
        if (st.t > 3.5 && st.webT > 0.55) { st.webT = 0; webEvent(); }
        if (st.t >= WEB) go('chip');
      }
      // what is shown
      const kp = st.part === 'pair' || st.part === 'web' ? 1 : 0, kw = st.part === 'web' ? 1 : 0;
      st.kPair += (kp - st.kPair) * Math.min(1, raw * 1.5); st.kWeb += (kw - st.kWeb) * Math.min(1, raw * 1.2);
      for (const o of pairOnly) o.visible = st.kPair > 0.01;
      for (const o of webOnly) o.visible = st.kWeb > 0.01;
      const s = st.kWeb * st.kWeb * (3 - 2 * st.kWeb);
      for (const n of WEBN) n.n.scale.setScalar(0.001 + WEB_S * s);         // (drawn larger: they are far away)
      ground.visible = st.kPair > 0.01; ground.material.opacity = 0.13 * st.kPair;
      // our memory grows and turns as the camera draws back (about the fibre's end, which stays put)
      poseA(st.kPair);
      const sA = memA.root.scale.x;
      // the photons keep about the same size on screen while the camera draws back
      const base = SZ * (camera ? camera.position.distanceTo(st.focus) : 26);
      for (const it of ph.items) it.size = base * (it.k || 1);
      if (p) p.inst.size = Math.max(0.48, 0.72 * base);
      const kl = running ? 1.7 : 0.15;
      winA.color.setRGB(PUMP_L[0] * kl, PUMP_L[1] * kl, PUMP_L[2] * kl);
      // labels
      const wide = st.kPair > 0.3;
      bench.hideLabels(wide);
      lPump.show(!wide && running); lTwin.show(!wide && running);
      if (p && !wide) { p.kit.group.localToWorld(v3.fromArray(p.inst.anchors.pairs)); lTwin.at(v3.x, v3.y, v3.z); }
      memA.atomAt(sA, v3); lMem.at(v3.x, v3.y + 1.0 * sA, v3.z);
      lMem.show(st.part === 'pair' || (st.part === 'chip' && st.kPair < 0.4));
      lMeet.show(st.part === 'pair' && st.kPair > 0.8);
      lEnt.show(st.part === 'pair' && arcAB.met && arcAB.on > 0.3);
      // flashes, arcs, memories
      for (let i = flash.length - 1; i >= 0; i--) { const f = flash[i]; f.t += raw; f.sp.material.opacity = f.max * Math.max(0, 1 - f.t / f.dur); if (f.t >= f.dur) flash.splice(i, 1); }
      for (const e of arcs) {
        if (!e.m.visible) continue;
        e.t += raw;
        const u = e.m.material.uniforms, grow = Math.min(1, e.t / e.grow);
        e.on = e.t < e.grow + e.hold ? 1 : Math.max(0, 1 - (e.t - e.grow - e.hold) / FADE);
        u.uTime.value = t; u.uGrow.value = grow; u.uOn.value = e.on;
        e.level = e.on * grow;
        if (grow >= 1 && !e.met) { e.met = true; if (e.spark) blink(e.spark, 0.8, 1); }
        if (e.mems) for (const m of e.mems) m.entangle(e.on);
        if (e.on <= 0) { e.m.visible = false; e.level = 0; }
      }
      for (const m of mems) m.update(raw, t);
    },
  };
}

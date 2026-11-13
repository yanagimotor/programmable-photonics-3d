// The memory of the quantum internet (tab 3): a Fabry-Perot resonator with an atom inside - two
// facing concave mirrors (silvery, on small mounts, a cyan glow round each rim), one atom between them (a bright dot
// with a soft halo), and a faint beam between the mirrors.  A twin photon comes along a fibre, rises into the input
// mirror, bounces between the mirrors for a moment, and the atom lights up: the twin is stored.  When the
// entanglement is made, the atom and the rims pulse in the arc's cyan.  A picture of the idea, not a model.
//
//   const m = new Memory({ fibreMat })
//   m.root                      place its origin where a fibre lying on the table ends, turn it about y (its +x runs
//                               from the fibre's end into the cavity), scale it (the scene draws it larger far away)
//   m.atomLocal, m.atomAt(scale, out, local)   the atom (the middle of the cavity): in m.root's frame; in the world
//                               (or in m.root's parent's frame) for a given scale of m.root
//   m.path()                    one twin's way in, u => [x, y, z] (world) over m.PATH seconds: from the fibre's end up
//                               into the input mirror, back and forth between the mirrors, then into the atom
//   m.arrive()                  a twin has come in (path() says it): the beam between the mirrors brightens
//   m.store()                   the twin is stored: the atom lights up (and stays lit, slowly dimming)
//   m.entangle(k)               0..1, this frame: the atom and the rims pulse cyan (the scene follows its arcs)
//   m.reset();  m.update(dt, t);  m.state -> 'idle' | 'bounce' | 'stored' | 'entangled'
// Size (scale 1): about 3.0 wide with its mounts, 2.0 high, 1.5 deep - half as big again as the fibre spool it
// replaces, so that it is easy to see.
import * as THREE from 'three';
import { lin } from '../kit/colour.js';

export const ENT = [0.45, 0.95, 1.0];                     // the entanglement: the arc's cyan
const REST = lin([0.62, 0.78, 1.0]), HOLD = lin([1.0, 0.72, 0.58]), CYAN = lin(ENT);
const AP = 0.74, ROC = 1.75, TH = 0.14;                   // a mirror: aperture radius, radius of curvature, thickness
const HALF = 1.22;                                        // from the atom to each mirror's centre
const AXIS_H = 1.05;                                      // the axis above the table
const RISE = 0.45, BOUNCE = 1.15;                         // seconds: up into the input mirror; back and forth
const sag = r => ROC - Math.sqrt(ROC * ROC - r * r);
// the riser (in the atom's frame): from the fibre's end on the table up into the back of the input mirror
const RISER = [[-2.3, -0.96], [-2.0, -0.9], [-1.76, -0.5], [-1.62, -0.1], [-1.5, 0], [-HALF - TH - 0.04, 0]];

let G = null;                                             // geometries and materials shared by every memory
function shared() {
  if (G) return G;
  // a mirror: a meniscus shell around the y axis, its concave face towards +y; the profile runs out along the back,
  // up the rim and in along the face, so that the lathe's normals point outwards (uv.y: 0..0.48 back, 0.52..1 face)
  const prof = [];
  for (let i = 0; i <= 12; i++) { const r = AP * i / 12; prof.push(new THREE.Vector2(r, sag(r) - TH)); }
  for (let i = 12; i >= 0; i--) { const r = AP * i / 12; prof.push(new THREE.Vector2(r, sag(r))); }
  const shell = new THREE.LatheGeometry(prof, 44);
  // the mirror's shine: the concave face bright towards its rim and darker inside (it reflects the dark room), with a
  // small bright spot in the middle; the back plain silver
  const sc = document.createElement('canvas'); sc.width = 4; sc.height = 256;
  const sg = sc.getContext('2d'), grd = sg.createLinearGradient(0, 256, 0, 0);
  for (const [o, v] of [[0, 0.78], [0.47, 0.9], [0.5, 1.0], [0.56, 1.0], [0.68, 0.72], [0.86, 0.5], [0.95, 0.62], [1, 0.95]]) grd.addColorStop(o, `rgb(${Math.round(255 * v)},${Math.round(255 * v)},${Math.round(255 * v)})`);
  sg.fillStyle = grd; sg.fillRect(0, 0, 4, 256);
  const shine = new THREE.CanvasTexture(sc); shine.colorSpace = THREE.SRGBColorSpace;
  const rim = new THREE.TorusGeometry(AP + 0.02, 0.055, 8, 48).rotateX(Math.PI / 2);
  // the cavity's light: a slim hourglass between the mirrors (narrowest at the atom)
  const bp = [];
  for (let i = 0; i <= 16; i++) { const y = -HALF + 0.06 + (2 * HALF - 0.12) * i / 16; bp.push(new THREE.Vector2(0.075 * Math.sqrt(1 + (y / 0.75) ** 2), y)); }
  const beam = new THREE.LatheGeometry(bp, 20).rotateZ(-Math.PI / 2);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const haloTex = new THREE.CanvasTexture(c); haloTex.colorSpace = THREE.SRGBColorSpace;
  const riser = new THREE.CatmullRomCurve3(RISER.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
  G = {
    shell, rim, beam, haloTex, riser,
    riserGeo: new THREE.TubeGeometry(riser, 24, 0.09, 6),
    post: new THREE.CylinderGeometry(0.08, 0.1, 1, 12),
    clamp: new THREE.BoxGeometry(0.34, 0.16, 0.34),
    base: new THREE.BoxGeometry(2 * HALF + 0.95, 0.1, 1.15),
    atom: new THREE.SphereGeometry(0.13, 18, 12),
    silver: new THREE.MeshStandardMaterial({ color: 0xffffff, map: shine, metalness: 0.5, roughness: 0.22, emissive: 0x5a6878, emissiveIntensity: 0.6 }),
    mount: new THREE.MeshStandardMaterial({ color: 0x6b7682, metalness: 0.5, roughness: 0.35 }),
    plate: new THREE.MeshStandardMaterial({ color: 0x46505b, metalness: 0.3, roughness: 0.5 }),
  };
  return G;
}

export class Memory {
  constructor({ fibreMat = null } = {}) {
    const g = shared();
    this.PATH = RISE + BOUNCE;
    this.root = new THREE.Group();
    this.group = new THREE.Group();                          // the atom's frame
    this.group.position.set(-RISER[0][0], -RISER[0][1], 0);   // (the riser starts at the root's origin)
    this.root.add(this.group);
    this.atomLocal = this.group.position.clone();
    this.rimMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });
    this.beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.85, 1.0), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    this.atomMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    this.haloMat = new THREE.SpriteMaterial({ map: g.haloTex, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    for (const side of [-1, 1]) {
      const cap = new THREE.Group();
      const shell = new THREE.Mesh(g.shell, g.silver); shell.castShadow = true; cap.add(shell);
      const rim = new THREE.Mesh(g.rim, this.rimMat); rim.position.y = sag(AP) - TH / 2; cap.add(rim);
      cap.rotation.z = side < 0 ? -Math.PI / 2 : Math.PI / 2;      // the concave face looks at the atom
      cap.position.x = side * HALF;
      this.group.add(cap);
      const xr = side * (HALF - sag(AP) + TH / 2), y0 = -AXIS_H + 0.1, y1 = -AP - 0.04;
      const post = new THREE.Mesh(g.post, g.mount); post.scale.y = y1 - y0; post.position.set(xr, (y0 + y1) / 2, 0); this.group.add(post);
      const clamp = new THREE.Mesh(g.clamp, g.mount); clamp.position.set(xr, y1 + 0.03, 0); this.group.add(clamp);
    }
    const base = new THREE.Mesh(g.base, g.plate); base.position.y = -AXIS_H + 0.05; base.receiveShadow = true; this.group.add(base);
    if (fibreMat) this.group.add(new THREE.Mesh(g.riserGeo, fibreMat));
    const beam = new THREE.Mesh(g.beam, this.beamMat); beam.renderOrder = 6; this.group.add(beam);
    this.group.add(new THREE.Mesh(g.atom, this.atomMat));
    this.halo = new THREE.Sprite(this.haloMat); this.halo.renderOrder = 7; this.group.add(this.halo);
    this.reset();
    this.update(0, 0);
  }
  reset() { this.stored = 0; this.flash = 0; this.bounceT = 0; this.ent = 0; this.entNow = 0; }
  arrive() { this.bounceT = BOUNCE; }
  store() { this.stored = 1; this.flash = 1; this.bounceT = 0; }
  entangle(k) { this.ent = Math.max(this.ent, k); }
  get state() { return this.entNow > 0.3 ? 'entangled' : this.bounceT > 0 ? 'bounce' : this.stored > 0.05 ? 'stored' : 'idle'; }
  // the atom for a given scale of the root, in world coordinates (or in the root's parent's frame: local) - the
  // scene's arcs are made for the memories as drawn in the wide views
  atomAt(scale, out = new THREE.Vector3(), local = false) {
    out.copy(this.atomLocal).multiplyScalar(scale).applyQuaternion(this.root.quaternion).add(this.root.position);
    if (!local && this.root.parent) { this.root.parent.updateWorldMatrix(true, false); this.root.parent.localToWorld(out); }
    return out;
  }
  // one twin's way in: u => [x, y, z] (world), over this.PATH seconds - up the riser into the input mirror, back and
  // forth between the mirrors (the beam brightens), and into the atom
  path() {
    const out = [0, 0, 0], v = new THREE.Vector3(), f = RISE / (RISE + BOUNCE);
    let inside = false;
    return u => {
      if (u < f) G.riser.getPointAt(Math.max(0, u / f), v);
      else {
        if (!inside) { inside = true; this.arrive(); }
        const k = Math.min(3.5, (u - f) / (1 - f) * 3.5), n = Math.floor(k), x = k - n;
        v.set((n % 2 === 0 ? -1 + 2 * x : 1 - 2 * x) * (HALF - 0.04), 0, 0);   // -1: the input mirror; ends at 0, the atom
      }
      this.group.localToWorld(v);
      out[0] = v.x; out[1] = v.y; out[2] = v.z;
      return out;
    };
  }
  update(dt, t) {
    this.bounceT = Math.max(0, this.bounceT - dt);
    this.stored = Math.max(0, this.stored - dt / 10);             // a stored twin waits; the glow fades slowly
    this.flash = Math.max(0, this.flash - dt / 0.6);
    this.entNow += (this.ent - this.entNow) * Math.min(1, dt * 8);
    this.ent = 0;                                                 // (the scene says it again every frame)
    const e = this.entNow, h = Math.min(1, this.stored * 1.4), s = h * (1 - e), r = (1 - h) * (1 - e);
    const pulse = 0.5 + 0.5 * Math.sin(t * 6.5);
    const kS = 2.2 + 2.0 * this.flash, kE = 1.4 + 1.8 * pulse;
    const c = this.atomMat.color;
    c.setRGB(REST[0] * 1.1 * r + HOLD[0] * kS * s + CYAN[0] * kE * e, REST[1] * 1.1 * r + HOLD[1] * kS * s + CYAN[1] * kE * e, REST[2] * 1.1 * r + HOLD[2] * kS * s + CYAN[2] * kE * e);
    this.haloMat.color.copy(c).multiplyScalar(0.5);
    this.halo.scale.setScalar(1.15 + 0.55 * s + 0.6 * this.flash + 1.0 * e * pulse);
    const kr = 0.62 + 0.25 * s + 1.7 * e * pulse;
    this.rimMat.color.setRGB(CYAN[0] * kr, CYAN[1] * kr, CYAN[2] * kr);
    this.beamMat.opacity = 0.2 + 0.45 * Math.min(1, this.bounceT / 0.3) + 0.25 * e;
  }
}

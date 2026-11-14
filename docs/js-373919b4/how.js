// Tab "How it works": the chip as an exploded stack of layers - substrate, optical waveguide, photoconductor,
// transparent electrodes - with a voltage source across it and a projector above it, told in steps:
//   1 the layers;  2 a voltage across them: in the dark the photoconductor takes it all, no field in the waveguide;
//   3 a pattern of light: where it falls, the photoconductor conducts;  4 so the electric field reaches the waveguide
//   only there;  5 there the material changes: the pattern is written into the waveguide;  6 light sent into the chip
//   follows it;  7 another pattern of light, another circuit.
// A picture of the principle (the arrows of light and of the field, the written stripe), not a model.
//
//   const how = new How({ scene, lang, reduced })   its group stands at the table's centre (hidden until enter())
//   how.enter() / how.leave();  how.go(i), how.next(), how.prev();  how.step (0..STEPS-1), how.t (seconds in it)
//   how.hold (set by app.js: the visitor steps by hand) - a step left alone shows its change again and again
//   how.caption (the key of the step's caption);  how.view (the camera: target, elev, az, dist, box)
//   how.update(dt, t, camera, pointScale);  how.setLabelText(words);  how.allLabels()
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeKit } from './kit/index.js';

export const STEPS = 7;
const W = 10, D = 6;                                         // the layers' size (x along the waveguide, z across)
// each layer: its bottom when stacked and when spread apart, its thickness, its colour
const LAYERS = {
  sub: { y: [0, 0], h: 0.8, color: 0x5d646c },
  wg: { y: [0.8, 0.8], h: 0.22, color: 0xefdedb },
  pc: { y: [1.02, 3.0], h: 0.7, color: 0xeda566 },
  el: { y: [1.72, 5.2], h: 0.07, color: 0xf6e7a0 },
};
const PROJ = new THREE.Vector3(3.6, 10.2, -2.8);              // the projector, above and behind on the right
const GREEN = 0x3fff6a, GOLD = 0xffd34d, CHANGED = 0x8f2a22;
const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
// the pattern of light: a straight line (m = 0), or an S-bend (m = 1), as z(x)
const pathZ = (x, m) => m * 1.5 * (2 * ease((x + 3.2) / 6.4) - 1);
// stepping by hand (RY, 2026-11-13: a step left alone keeps explaining itself): from LOOP_AT seconds into a step, every
// LOOP_P seconds the step's own change is undone for LOOP_OFF seconds (smoothly: the layers stack again, the voltage or
// the light goes off, the field draws back, the written stripe fades, the signal stops, the S-bend straightens), then
// it comes again as when the step began
const LOOP_AT = 7, LOOP_P = 8, LOOP_OFF = 2.2;

export class How {
  constructor({ scene, lang, reduced = false }) {
    this.reduced = reduced;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.kit = makeKit({ lang, reduced, seed: 2027 });
    this.group.add(this.kit.group);
    this.step = 0; this.t = 0; this.hold = false;
    this.k = { explode: 0, volt: 0, proj: 0, pc: 0, field: 0, change: 0, signal: 0, morph: 0 };   // shown, 0..1
    this.labels = {};
    this.words = k => k;
    this.buildLayers();
    this.buildMask();
    this.buildArrows();
    this.buildSource();
    this.buildProjector();
    this.buildSignal();
    this.buildLabels();
    this.drawMask(0);
  }

  // ------------------------------------------------------------------ construction
  buildLayers() {
    this.layers = {};
    for (const [id, Ly] of Object.entries(LAYERS)) {
      // (the photoconductor and the electrodes see-through: the waveguide below them - the written stripe, the light
      // in it - and the arrows of the field must show)
      const see = id === 'el' ? 0.4 : id === 'pc' ? 0.55 : 1;
      const mat = new THREE.MeshStandardMaterial({ color: Ly.color, roughness: 0.55, metalness: 0.05,
        ...(see < 1 ? { transparent: true, opacity: see, depthWrite: false } : {}) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(W, Ly.h, D), mat);
      m.castShadow = see === 1; m.receiveShadow = true;
      if (see < 1) m.renderOrder = 4;
      this.group.add(m);
      this.layers[id] = m;
    }
    // the waveguide's core, seen at its front edge (a red line)
    const core = new THREE.Mesh(new THREE.BoxGeometry(W + 0.01, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0xc0504d, roughness: 0.5 }));
    core.position.set(0, -0.02, D / 2 + 0.005);
    this.layers.wg.add(core);
  }
  // the pattern of light as a mask (white where the light falls): the green spot on the electrodes, the conducting
  // stripe in the photoconductor, the written stripe in the waveguide
  buildMask() {
    const c = this.maskCanvas = document.createElement('canvas');
    c.width = 512; c.height = Math.round(512 * D / W);
    this.maskTex = new THREE.CanvasTexture(c);
    const plane = (color, blending, y) => {
      const mat = new THREE.MeshBasicMaterial({ color, map: blending === THREE.AdditiveBlending ? this.maskTex : null,
        alphaMap: blending === THREE.AdditiveBlending ? null : this.maskTex, transparent: true, opacity: 0, blending, depthWrite: false });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), mat);
      m.renderOrder = 5; m.position.y = y;
      this.group.add(m);
      return m;
    };
    this.spot = plane(GREEN, THREE.AdditiveBlending, 0);            // on the electrodes (lit by the projector)
    this.glow = plane(0xfff0b0, THREE.AdditiveBlending, 0);         // in the photoconductor (conducting)
    this.mark = plane(CHANGED, THREE.NormalBlending, 0);            // in the waveguide (the material changed)
    this.mark.renderOrder = 3;                                      // (under the see-through layers: drawn before them)
  }
  drawMask(m) {
    const c = this.maskCanvas, g = c.getContext('2d'), sx = c.width / W, sz = c.height / D;
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = '#fff'; g.shadowBlur = 10;
    g.lineWidth = 0.42 * sx;
    g.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = -W / 2 + 0.25 + (W - 0.5) * i / 60, X = (x + W / 2) * sx, Z = (pathZ(x, m) + D / 2) * sz;
      if (i) g.lineTo(X, Z); else g.moveTo(X, Z);
    }
    g.stroke();
    this.maskTex.needsUpdate = true;
    this.maskM = m;
  }
  // arrows: the field (gold) everywhere in the photoconductor, reaching the waveguide along the lit stripe; the
  // projector's light (green) along the stripe
  buildArrows() {
    const mk = (color, n, r = 0.05) => {
      const shaft = new THREE.CylinderGeometry(r, r, 1, 8).translate(0, -0.5, 0);           // from y = 0 down to -1
      const head = new THREE.ConeGeometry(r * 3, 0.34, 12).rotateX(Math.PI).translate(0, -0.17, 0);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
      const s = new THREE.InstancedMesh(shaft, mat, n), h = new THREE.InstancedMesh(head, mat, n);
      s.renderOrder = h.renderOrder = 7; s.frustumCulled = h.frustumCulled = false;
      this.group.add(s, h);
      return { s, h, mat, n };
    };
    this.FX = [-4, -3, -2, -1, 0, 1, 2, 3, 4];                   // along the stripe
    this.OFF = [[-3.6, -2.2], [-1.2, -2.2], [1.2, -2.2], [3.6, -2.2], [-3.6, 2.2], [-1.2, 2.2], [1.2, 2.2], [3.6, 2.2]];   // away from it
    this.lit = mk(GOLD, this.FX.length, 0.075);                 // the field along the lit stripe
    this.field = mk(GOLD, this.OFF.length, 0.04);               // the field elsewhere (dimmer)
    this.lightArrows = mk(GREEN, 5);
  }
  // one arrow: from y0 down to y1 at (x, z)
  setArrow(set, i, x, z, y0, y1) {
    const m4 = new THREE.Matrix4(), len = Math.max(0.05, y0 - y1 - 0.34);
    m4.compose(new THREE.Vector3(x, y0, z), new THREE.Quaternion(), new THREE.Vector3(1, len, 1));
    set.s.setMatrixAt(i, m4);
    m4.makeTranslation(x, y0 - len, z);
    set.h.setMatrixAt(i, m4);
  }
  // the voltage source (a circle with a lightning bolt) and its wires to the top and the bottom
  buildSource() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(128, 128, 112, 0, 2 * Math.PI); g.fill();
    g.lineWidth = 16; g.strokeStyle = '#6b7178'; g.stroke();
    g.fillStyle = '#ffd400'; g.beginPath(); g.moveTo(52, 186); g.lineTo(128, 52); g.lineTo(204, 186); g.closePath(); g.fill();
    g.fillStyle = '#1b1f24'; g.beginPath(); g.moveTo(138, 78); g.lineTo(104, 136); g.lineTo(128, 136); g.lineTo(112, 176); g.lineTo(154, 116); g.lineTo(130, 116); g.lineTo(146, 78); g.closePath(); g.fill();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.source = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(0.62, 0.62, 0.62), transparent: true, opacity: 0, depthWrite: false }));
    this.source.scale.setScalar(1.8);
    this.source.position.set(-W / 2 - 2.1, 2.8, 0);
    this.group.add(this.source);
    const wire = pts => {
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.05);
      const mat = new THREE.MeshStandardMaterial({ color: 0x7d858e, roughness: 0.5, metalness: 0.3, emissive: new THREE.Color(1, 0.8, 0.25), emissiveIntensity: 0, transparent: true, opacity: 0 });
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.06, 8), mat);
      this.group.add(m);
      return m;
    };
    const sx = this.source.position.x;
    this.wires = [
      wire([[sx, 3.7, 0], [sx, 6.0, 0], [-W / 2 + 0.4, 6.0, 0], [-W / 2 + 0.4, 5.3, 0]]),        // to the electrodes
      wire([[sx, 1.9, 0], [sx, 0.4, 0], [-W / 2 - 0.05, 0.4, 0]]),                                 // to the bottom
    ];
  }
  // the projector (a dark-blue box with its lens towards the chip) and its light: a faint green pyramid
  buildProjector() {
    const g = this.projector = new THREE.Group();
    g.position.copy(PROJ);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.7), new THREE.MeshStandardMaterial({ color: 0x23324a, roughness: 0.45, metalness: 0.35 }));
    g.add(body);
    this.lens = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 24), new THREE.MeshStandardMaterial({ color: 0x9fb0c0, roughness: 0.2, emissive: new THREE.Color(GREEN), emissiveIntensity: 0 }));
    this.lens.position.set(0, -0.72, 0.2);
    g.add(this.lens);
    const to = new THREE.Vector3(0, 0, 0);
    g.lookAt(to); g.rotateX(-Math.PI / 2);                     // (the body's -y, where the lens is, towards the chip)
    this.group.add(g);
    // the light: from the lens to the electrodes' four corners
    const yTop = LAYERS.el.y[1] + LAYERS.el.h;
    this.group.updateMatrixWorld(true);
    const apex = this.lens.getWorldPosition(new THREE.Vector3()).sub(this.group.getWorldPosition(new THREE.Vector3()));
    const corners = [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]].map(([x, z]) => [x, yTop, z]);
    const pos = [];
    for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4]; pos.push(apex.x, apex.y, apex.z, ...a, ...b); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.cone.renderOrder = 4;
    this.group.add(this.cone);
  }
  // the light sent into the chip (steps 6-7): trains of yellow-white pulses along the stripe, straight and S-bent
  buildSignal() {
    const kit = this.kit, P = kit.P, y = LAYERS.wg.y[1] + LAYERS.wg.h + 0.03;
    this.signal = kit.pulses({ width: 0.3, spacing: 0.9, length: 0.16, speed: 2.6, y, over: true });
    const pathOf = m => P.fn(u => { const x = -W / 2 - 1.8 + (W + 3.6) * u; return [x, pathZ(x, m)]; }, 0, 1, 120);
    this.sigA = this.signal.add(pathOf(0), { s0: 0 });
    this.sigB = this.signal.add(pathOf(1), { s0: 0 });
    this.signal.build();
    this.signal.net.mesh.renderOrder = 3;
  }
  buildLabels() {
    const mk = (key, pos, cls = 'callout') => {
      const el = document.createElement('div'); el.className = cls; el.innerHTML = '<span></span>';
      const obj = new CSS2DObject(el); obj.position.set(...pos); obj.visible = false;
      this.group.add(obj);
      this.labels[key] = { obj, el, key };
    };
    const right = W / 2 + 0.3, front = D / 2;
    mk('how.electrode', [right, 0, front]);
    mk('how.pc', [right, 0, front]);
    mk('how.wg', [right, 0, front]);
    mk('how.sub', [-W / 2 + 1.2, LAYERS.sub.h / 2, front]);      // (at the left: the waveguide's tag is just above at the right)
    mk('how.volt', [this.source.position.x, 3.8, 0]);
    mk('how.proj', [PROJ.x, PROJ.y + 0.9, PROJ.z]);
  }
  setLabelText(words) {
    this.words = words;
    for (const l of Object.values(this.labels)) l.el.querySelector('span').textContent = words(l.key);
  }
  allLabels() { return Object.values(this.labels); }

  // ------------------------------------------------------------------ the steps
  get caption() { return `how.s${this.step + 1}`; }
  get view() { return { target: [0, 3.6, 0], elev: 31, az: -20, dist: 30, box: [[-W / 2 - 3.1, 0, -D / 2 - 0.4], [W / 2 + 0.4, PROJ.y + 1.0, D / 2 + 0.4]] }; }
  go(i) {
    this.step = Math.max(0, Math.min(STEPS - 1, i));
    this.t = 0;
    if (this.step === 0) this.k.explode = 0;                  // the layers come apart again
    if (this.step < 6 && this.maskM !== 0) this.drawMask(0);
  }
  next() { this.go(this.step + 1); }
  prev() { this.go(this.step - 1); }
  enter() { this.group.visible = true; for (const l of Object.values(this.labels)) l.obj.visible = true; this.go(0); }
  leave() { this.group.visible = false; for (const l of Object.values(this.labels)) l.obj.visible = false; }

  update(dt, t, camera, pointScale, raw = dt) {
    if (!this.group.visible) return;
    this.t += raw;
    const s = this.step, T = this.t, k = this.k, sp = this.reduced ? 3 : 1;
    const toward = (key, target, rate) => { k[key] += (target - k[key]) * Math.min(1, raw * rate * sp); };
    // what each step shows (each step keeps what the ones before it built).  Tn: seconds since the step's own change
    // last began - its clock, or stepping by hand round LOOP_P (below 0: the change undone for a moment)
    let Tn = T;
    if (this.hold && T >= LOOP_AT) { const u = (T - LOOP_AT) % LOOP_P; Tn = u < LOOP_OFF ? -1 : u - LOOP_OFF; }
    const own = (j, delay = 0) => s > j || (s === j && Tn >= delay);
    if (s === 0) k.explode = Tn >= 0 ? Math.min(1, k.explode + raw * sp / 1.8) : Math.max(0, k.explode - raw * sp / 1.2); else k.explode = 1;
    toward('volt', own(1) ? 1 : 0, 3);
    toward('proj', own(2) ? 1 : 0, 2.5);
    toward('pc', own(2, 0.9) ? 1 : 0, 2.5);
    toward('field', own(3, 0.6) ? 1 : 0, 1.6);
    toward('change', own(4, 0.8) ? 1 : 0, 1.2);
    toward('signal', own(5) ? 1 : 0, 2);
    // (the new pattern drawn from the straight line into the S-bend; undone, back to the straight line)
    const mT = s !== 6 ? 0 : Tn >= 0 ? ease((Tn - 1.0) / 2.6) : Math.max(0, k.morph - raw * sp / 1.0);
    if (Math.abs(mT - k.morph) > 0.004) { k.morph = mT; this.drawMask(mT); }
    const e = ease(k.explode), m = k.morph;
    // the layers
    const yOf = id => LAYERS[id].y[0] + (LAYERS[id].y[1] - LAYERS[id].y[0]) * e;
    for (const [id, Ly] of Object.entries(LAYERS)) this.layers[id].position.y = yOf(id) + Ly.h / 2;
    const top = id => yOf(id) + LAYERS[id].h;
    this.spot.position.y = top('el') + 0.006;
    this.glow.position.y = top('pc') + 0.006;
    this.mark.position.y = top('wg') + 0.004;
    this.spot.material.opacity = 0.9 * k.proj;
    this.glow.material.opacity = 0.85 * k.pc * (0.85 + 0.15 * Math.sin(t * 3));
    this.mark.material.opacity = 0.95 * k.change;
    // the field: everywhere it ends in the photoconductor; along the lit stripe it reaches down to the waveguide
    const yE = yOf('el'), yStop = yOf('pc') + 0.12, yWg = top('wg') + 0.02;
    this.FX.forEach((x, i) => this.setArrow(this.lit, i, x, pathZ(x, m), yE - 0.04, yStop + (yWg - yStop) * ease(k.field)));
    this.OFF.forEach(([x, z], i) => this.setArrow(this.field, i, x, z, yE - 0.04, yStop));
    for (const a of [this.lit, this.field]) a.s.instanceMatrix.needsUpdate = a.h.instanceMatrix.needsUpdate = true;
    const fieldOn = k.volt * (e > 0.98 ? 1 : 0);
    this.lit.mat.opacity = fieldOn * (0.75 + 0.25 * k.field);
    this.field.mat.opacity = fieldOn * (0.75 - 0.3 * k.field);
    // the projector's light along the stripe, down to the photoconductor
    [-3.6, -1.8, 0, 1.8, 3.6].forEach((x, j) => this.setArrow(this.lightArrows, j, x + 0.35, pathZ(x + 0.35, m) - 0.35, yE + 1.5, top('pc') + 0.04));
    this.lightArrows.s.instanceMatrix.needsUpdate = this.lightArrows.h.instanceMatrix.needsUpdate = true;
    this.lightArrows.mat.opacity = 0.85 * k.proj * (s === 2 ? 1 : 0.3);         // (from step 4 on the field is the point)
    // the source, the wires (a flicker of current while the voltage is on), the projector and its light
    this.source.material.opacity = Math.min(1, k.volt * 1.2);
    for (const w of this.wires) { w.material.opacity = Math.min(1, k.volt * 1.2); w.material.emissiveIntensity = k.volt * (0.35 + 0.25 * Math.sin(t * 5)); }
    this.projector.visible = k.proj > 0.01 || s >= 2;
    this.lens.material.emissiveIntensity = 1.6 * k.proj;
    this.cone.material.opacity = 0.07 * k.proj;
    this.signal.white(this.sigA, 1.1 * k.signal * (1 - m), { data: 0.5, seed: 3 });
    this.signal.white(this.sigB, 1.1 * k.signal * m, { data: 0.5, seed: 4 });
    // labels: the layers first, then the source, then the projector; each at its layer's right front corner
    const show = (key, on, y) => { const l = this.labels[key]; if (y != null) l.obj.position.y = y; l.obj.visible = on && this.group.visible; };
    show('how.electrode', e > 0.9, top('el'));
    show('how.pc', e > 0.9, yOf('pc') + LAYERS.pc.h / 2);
    show('how.wg', e > 0.9, yOf('wg') + LAYERS.wg.h / 2);
    show('how.sub', e > 0.9);
    show('how.volt', k.volt > 0.5);
    show('how.proj', k.proj > 0.5);
    this.kit._tick(dt, t, { dim: 1, plateRate: 1, camera, pointScale, platesOn: false });
  }
}

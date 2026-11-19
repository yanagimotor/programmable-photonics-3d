// The bench of tab 2, "Programmable photonics": one blank, light-grey chip under a projector.  Green light from the
// projector carries the program; where it lands, a circuit glows on the chip; then the chip does that circuit's job.
// Each program is a device module of tab 1 (the same circuit, the same light and plates) built with the kit's
// 'written' style: its waveguiding structure is rendered from above into a mask, and that mask is both the green
// circuit on the chip and the pattern inside the projector's light.  Two programs exist only here (programs/*.js:
// image and voice recognition, a free-form pattern of light on a plain slab, after Onodera et al. 2026).  The light
// router and the spectrometer are the programmable chip's own here (programs/router.js, awg.js): plain
// slabs too, with patterns found by inverse design in the 2D Waveguide Studio's simulation; they and image
// recognition show the studio's recorded index maps and light (programs/data/*.png).
//
//   const bench = new Bench({ renderer, scene, lang, reduced, quality, catalog: [{ id, mod, opts }] })
//                            opts (optional): passed to the program, mod.create(kit, opts) - tab 3 gives image and
//                            voice recognition its own look (programs/image.js); tab 2 passes none
//   bench.enter()            start from the blank chip (then the first program loads by itself)
//   bench.load(id)           switch to another program (light off, new pattern, circuit, task); null: no program
//                            - the light goes off, the circuit fades, the chip is blank again
//   bench.load(null, { now: true })   blank at once: no fading, no light, phase 'blank' (a story that starts over)
//   bench.update(dt, t, camera, pointScale); bench.renderMask(renderer) before the frame is drawn
//   bench.phase              'blank' | 'off' | 'dark' | 'light' | 'write' | 'run';  bench.current: { id, kit, inst, holder, s }
//   bench.selected           the program asked for (null: none);  bench.erased: blank because a program was turned off
//   bench.make(id)           build a program of the catalog without loading it (-> { id, kit, inst, holder, s }: its
//                            place on the slate, for a scene that lines things up with it)
//   bench.sweep              where the green scan line is while a program is written: 0..1.05 across the chip, -1
//                            when nothing is being written
//   bench.setHealth(h)       (tab 3) how well the chip does its job, 0..1: a soft glow around a chip that works, a dim,
//                            dark shade over one that does not; null: neither
//   bench.setStage({ chip, projector, solid, shade })   (tab 3's optical computation) how far the chip and
//                            the projector are in place, 0..1 each (any may be left out); all 1 unless a scene says
//                            otherwise - tab 2 and the other scenes never call it.  chip: the slate with its frame, the
//                            circuit and the programs sit (1 - chip) x 0.62 lower, inside the table top, hidden at 0;
//                            projector: it sits (1 - projector) x 8 higher, hidden at 0.  The green light (the cone)
//                            does not move: write only with both at 1.  solid: the slate's (and its frame's) opacity -
//                            the story fades the chip in where the flattened glass lies; shade: how bright the slate's
//                            top is (a darker top shows the yellow-white light on it); glow: how bright the green light
//                            and the written pattern stay while the program runs (after the writing; a dimmer green
//                            lets the yellow-white light on the chip read).  bench.stage: { chip, projector, solid, shade,
//                            glow } (read-only)
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeKit, MASK_LAYER } from './kit/index.js';
import { lin, IR } from './kit/colour.js';
import { Beam } from './kit/light.js';

export const SLATE = { w: 12.6, d: 8.2, h: 0.55 };
const PROJ = { y: 10.6, lensY: 9.4, a: 0.9 };           // projector body height, lens height, lens half-size
const GREEN = [0.1, 1.0, 0.26];                          // the programming light (532 nm, really green)
// (write: a scan line sweeps the chip in SWEEP seconds, the circuit appearing behind it - the writing, seen)
const T = { blank: 1.4, off: 0.55, dark: 0.35, light: 0.25, write: 1.6, run: 0.8 };
const SWEEP = 1.4;
const c01 = v => Math.max(0, Math.min(1, +v || 0));
// setStage: how far the chip sinks into the table (the slate is 0.55 thick: 0.62 puts its top inside the table top) and
// how far the projector rises away
const SINK = 0.62, RISE = 8;

const WORLD_VS = /* glsl */ `
varying vec3 vPos;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vPos = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
// The projected light between the lens and the chip, as a volume: each pixel marches
// along its view ray through the frustum from the lit area (half-sizes box.x, box.y at height y0) to the lens
// (half-size box.z at height box.w); a point is as bright as the pattern where its ray from the lens lands, so the
// circuit's lines become converging sheets of green light.
const RAYS_FS = /* glsl */ `
uniform sampler2D map;
uniform float gain, face, flow, y0, level;
uniform vec3 color, origin;
uniform vec4 box;
varying vec3 vPos;
float wave(float y) { return 0.8 + 0.2 * cos(6.2831853 * (y * 0.5 + flow)); }
float fade(float f) { return mix(1.0, 0.45, f) * smoothstep(0.02, 0.3, f); }
float landing(vec3 p, float f) {
  float hx = mix(box.x, box.z, f), hz = mix(box.y, box.z, f);
  float u = 0.5 + 0.5 * p.x / hx, v = clamp(0.5 - 0.5 * p.z / hz, 0.002, 0.998);
  return texture2D(map, vec2(u, v)).r + 0.04;
}
float bright(vec3 p) {
  float f = clamp((p.y - y0) / (box.w - y0), 0.0, 1.0);
  return landing(p, f) * fade(f) * wave(p.y);
}
float edge(vec3 p) {
  float f = (p.y - y0) / (box.w - y0);
  if (f < 0.01 || f > 0.99) return 0.0;
  return landing(p, f) * (1.0 - 0.6 * f) * fade(f) * wave(p.y);
}
void bound(vec3 n, float d, vec3 ro, vec3 rd, inout float t0, inout float t1) {
  float dn = dot(n, rd), num = d - dot(n, ro);
  if (abs(dn) < 1e-7) { if (num < 0.0) t1 = -1.0; }
  else if (dn > 0.0) t1 = min(t1, num / dn);
  else t0 = max(t0, num / dn);
}
void main() {
  vec3 ro = cameraPosition - origin, rd = normalize(vPos - cameraPosition);
  float kx = (box.z - box.x) / (box.w - y0), kz = (box.z - box.y) / (box.w - y0);
  float t0 = 0.0, t1 = 1e5;
  bound(vec3(1.0, -kx, 0.0), box.x - kx * y0, ro, rd, t0, t1);
  bound(vec3(-1.0, -kx, 0.0), box.x - kx * y0, ro, rd, t0, t1);
  bound(vec3(0.0, -kz, 1.0), box.y - kz * y0, ro, rd, t0, t1);
  bound(vec3(0.0, -kz, -1.0), box.y - kz * y0, ro, rd, t0, t1);
  bound(vec3(0.0, -1.0, 0.0), -y0, ro, rd, t0, t1);
  bound(vec3(0.0, 1.0, 0.0), box.w, ro, rd, t0, t1);
  if (t1 <= t0) discard;
  float dt = (t1 - t0) / float(STEPS);
  float j = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float acc = 0.0;
  for (int i = 0; i < STEPS; i++) acc += bright(ro + rd * (t0 + (float(i) + j) * dt));
  float rim = 0.45 * edge(ro + rd * t1);
  if (t0 > 0.0) rim += edge(ro + rd * t0);
  gl_FragColor = vec4(color * level * (gain * acc * dt + face * rim), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// the circuit glowing on the chip: the mask, a soft halo around it, coloured green; while it is written, only the
// part behind the scan line (uSweep, 0..1 across the chip; < 0: no sweep) and the line itself
const PATTERN_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const PATTERN_FS = /* glsl */ `
uniform sampler2D uMask;
uniform vec2 uTexel;
uniform float uLevel, uTime, uSweep;
uniform vec3 uGreen;
varying vec2 vUv;
void main() {
  float m = texture2D(uMask, vUv).r;
  float h = 0.0;
  for (int i = 0; i < 12; i++) {
    float a = 6.2831853 * float(i) / 12.0;
    h += texture2D(uMask, vUv + vec2(cos(a), sin(a)) * uTexel * 3.4).r;
  }
  h /= 12.0;
  float core = smoothstep(0.06, 0.45, m);
  float a = clamp(core * 1.5 + 0.75 * h, 0.0, 1.0) * clamp(uLevel, 0.0, 1.0);
  // saturated green, bright enough at the core to glow (bloom); the halo stays a softer green
  vec3 col = uGreen * (0.6 + 0.75 * core + 0.3 * smoothstep(0.75, 1.0, m)) * max(1.0, uLevel);
  if (uSweep >= 0.0) {
    // the scan line: a bright, whitish band with a short glow trailing behind it, over the projected light
    a *= 1.0 - smoothstep(uSweep - 0.012, uSweep + 0.012, vUv.x);
    float d = vUv.x - uSweep;
    float line = (exp(-d * d / 0.00025) + 0.45 * exp(-d * d / 0.004) * step(d, 0.0)) * step(uSweep, 1.0);
    col = mix(col, vec3(0.8, 1.0, 0.85) * 3.0, clamp(line, 0.0, 1.0));
    a = max(a, clamp(line, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// "No program" (tab 2): the infrared beam that the programs take in, entering the blank chip with nothing written
// to guide it - a Gaussian beam diffracting from its waist at the input facet, w(x) = W0 sqrt(1 + (x / ZR)^2), its
// pulses on wavefronts curved around the waist.  (The single-waveguide program keeps the same beam in one line.)
// The diffraction is exaggerated so it shows within the chip.
const SPREAD = { x0: -5.55, x1: 5.55, y: 0.085, beam: 2.4, w0: 0.09, zr: 0.55, flow: 1.6, dash: 0.9 };
const SPREAD_FS = /* glsl */ `
uniform float uLevel, uTime, uX0, uW0, uZr, uHalf;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vP;
void main() {
  float dx = max(vP.x - uX0, 0.0), z = vP.z;
  float w = uW0 * sqrt(1.0 + dx * dx / (uZr * uZr));
  float I = pow(uW0 / w, 0.55) * exp(-2.0 * z * z / (w * w));
  I *= smoothstep(uHalf, uHalf - 0.25, abs(z));
  float r = sqrt(dx * dx + z * z);
  float ph = fract((r + ${SPREAD.beam.toFixed(2)} - uTime * ${SPREAD.flow.toFixed(2)}) / ${SPREAD.dash.toFixed(2)});
  float pulse = 0.4 + 0.6 * pow(0.5 + 0.5 * cos(6.2831853 * ph), 1.5);
  vec3 col = uColor * I * pulse * uLevel * 1.9;
  float m = max(max(col.r, col.g), col.b);
  if (m < 0.004) discard;
  float al = clamp(m * 2.4, 0.0, 1.0);
  gl_FragColor = vec4(col / max(al, 0.04), al);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const SPREAD_VS = /* glsl */ `
varying vec2 vUv;
varying vec3 vP;
void main() { vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export class Bench {
  constructor({ renderer, scene, lang, reduced = false, quality = 'high', catalog = [], chipLabel = null, slate = null }) {
    this.renderer = renderer; this.scene = scene; this.lang = lang; this.reduced = reduced;
    this.S = { ...SLATE, ...(slate || {}) };   // the slate under the chip (tab 3: squarer)
    this.catalog = catalog;
    this.chipLabel = chipLabel;     // a fixed name for the chip's label (tab 3); otherwise blank / written
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.programs = new Map();
    this.current = null;            // the program on the chip
    this.want = null;               // the program asked for (null: no program - no light, a blank chip)
    this.erased = false;            // the chip is blank because its program was turned off
    this.phase = 'blank';
    this.pt = 0;                    // time in the phase
    this.cone = 0;                  // brightness of the program light (0..1)
    this.pattern = 0;               // brightness of the circuit on the chip
    this.task = 0;                  // the chip's own light (0..1)
    this.time = 0;
    this.inputOn = true;            // the light going into the chip (off: the circuit stays written, no light runs through it)
    this.inLevel = 1;
    this.labels = {};
    this._stage = { chip: 1, projector: 1, solid: 1, shade: 1, glow: 1 };
    this.buildSlate();
    this.buildMask();
    this.buildProjector(quality);
    this.buildLabels();
    if (!chipLabel) this.buildSpread();
  }
  // tab 2's "No program": the beam that spreads out in the blank chip (see SPREAD)
  buildSpread() {
    const S = this.S, half = S.d / 2 - 0.05;
    this.spreadU = {
      uLevel: { value: 0 }, uTime: { value: 0 }, uX0: { value: SPREAD.x0 }, uW0: { value: SPREAD.w0 }, uZr: { value: SPREAD.zr },
      uHalf: { value: half }, uColor: { value: new THREE.Color(...lin(IR)) },
    };
    const geo = new THREE.PlaneGeometry(SPREAD.x1 - SPREAD.x0, 2 * half).rotateX(-Math.PI / 2).translate((SPREAD.x0 + SPREAD.x1) / 2, 0, 0);
    const mesh = this.spreadMesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: this.spreadU, vertexShader: SPREAD_VS, fragmentShader: SPREAD_FS, transparent: true, depthWrite: false }));
    mesh.position.y = 0.02;
    mesh.renderOrder = 5;
    mesh.visible = false;
    this.chipGroup.add(mesh);
    this.spreadBeam = new Beam({ from: [SPREAD.x0 - SPREAD.beam, SPREAD.y, 0], to: [SPREAD.x0, SPREAD.y, 0], rgb: IR, power: 1.1, r0: 0.08, fade: 'in' });
    this.spreadBeam.object.visible = false;
    this.chipGroup.add(this.spreadBeam.object);
    this.spread = 0;
    const el = document.createElement('div');
    el.className = 'callout';
    el.innerHTML = '<span></span>';
    const obj = new CSS2DObject(el);
    obj.position.set(2.2, 0.1, -1.6);
    obj.visible = false;
    this.group.add(obj);
    this.labels.spread = { obj, el };
  }

  // ------------------------------------------------------------------ construction
  buildSlate() {
    const S = this.S;
    // the chip and all that sits on it (its frame, the circuit, the programs): one group, so that a scene can sink it
    // into the table (setStage)
    this.chipGroup = new THREE.Group();
    this.group.add(this.chipGroup);
    const top = this.slateTop = new THREE.MeshStandardMaterial({ color: 0xc3cad2, roughness: 0.5, metalness: 0.05 });
    const side = new THREE.MeshStandardMaterial({ color: 0x8d97a2, roughness: 0.6, metalness: 0.1 });
    const slate = this.slate = new THREE.Mesh(new THREE.BoxGeometry(S.w, S.h, S.d), [side, side, top, side, side, side]);
    slate.position.y = -S.h / 2;
    slate.castShadow = true; slate.receiveShadow = true;
    this.chipGroup.add(slate);
    // a thin darker frame line around the top, so the pale chip reads as an object on the dark table
    const frame = this.frameMesh = new THREE.Mesh(new THREE.BoxGeometry(S.w + 0.12, 0.05, S.d + 0.12), new THREE.MeshStandardMaterial({ color: 0x5d6873, roughness: 0.5 }));
    this.slateMats = [top, side, frame.material];       // (faded together: setStage's solid)
    frame.position.y = -S.h - 0.025 + 0.05;
    this.chipGroup.add(frame);
    // the health glow (tab 3): a soft rim of light on the table around the slate
    const c = document.createElement('canvas'), W = 512, H = Math.round(512 * (S.d + 3) / (S.w + 3));
    c.width = W; c.height = H;
    const g = c.getContext('2d'), m = W * 1.5 / (S.w + 3);       // the rim: 1.5 units out from the slate
    for (let i = 0; i < 18; i++) {
      const k = i / 17;
      g.strokeStyle = `rgba(255, 255, 255, ${(0.11 * (1 - k) * (1 - k)).toFixed(3)})`;
      g.lineWidth = 6 + 4 * i;
      g.beginPath(); g.roundRect(m, m, W - 2 * m, H - 2 * m, 18); g.stroke();      // (the canvas has the plane's aspect)
    }
    const tex = new THREE.CanvasTexture(c);
    this.haloMat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.55, 1.0, 0.8), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const halo = this.halo = new THREE.Mesh(new THREE.PlaneGeometry(S.w + 3, S.d + 3).rotateX(-Math.PI / 2), this.haloMat);
    halo.position.y = -S.h + 0.02;
    halo.renderOrder = 2;
    halo.visible = false;
    this.group.add(halo);
    this.healthT = null; this.healthNow = 1;
  }
  setHealth(h) { this.healthT = h == null ? null : Math.max(0, Math.min(1, h)); }
  // (tab 3's zoom-outs: the bench's labels would only crowd the wide view)
  hideLabels(on) { this.labelsHidden = on; }
  // (tab 3's optical computation: the chip rises out of the table and the projector comes down only when the story
  // gets there; see the header)
  setStage({ chip, projector, solid, shade, glow } = {}) {
    const st = this._stage;
    if (solid !== undefined) {
      st.solid = c01(solid);
      // (see-through only while it fades in; opaque again at 1, as tab 2's - a new program for the material, once.
      // While it fades in it writes no depth and casts no shadow: what lies in it - the flattened glass fading out -
      // shows through it, and no shadow comes before the slate)
      const see = st.solid < 0.999;
      for (const m of this.slateMats) {
        if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
        m.opacity = st.solid; m.depthWrite = !see;
      }
      this.slate.castShadow = !see;
    }
    if (shade !== undefined) st.shade = c01(shade);
    if (glow !== undefined) st.glow = c01(glow);
    if (chip !== undefined) {
      st.chip = c01(chip);
      this.chipGroup.position.y = -(1 - st.chip) * SINK;
      this.chipGroup.visible = st.chip > 0;
    }
    if (projector !== undefined) {
      st.projector = c01(projector);
      this.projector.position.y = (1 - st.projector) * RISE;
      this.projector.visible = st.projector > 0;
    }
  }
  get stage() { return this._stage; }
  get sweep() { return this.patternU.uSweep.value; }

  buildMask() {
    const S = this.S;
    const W = 1024, H = Math.round(1024 * S.d / S.w);
    this.maskRT = new THREE.WebGLRenderTarget(W, H, { depthBuffer: true, generateMipmaps: false });
    this.maskRT.texture.minFilter = THREE.LinearFilter; this.maskRT.texture.magFilter = THREE.LinearFilter;
    const cam = this.maskCam = new THREE.OrthographicCamera(-S.w / 2, S.w / 2, S.d / 2, -S.d / 2, 0.1, 60);
    cam.layers.set(MASK_LAYER);
    cam.up.set(0, 0, -1);
    this.maskWhite = new Map();
    // the circuit glowing on the chip
    const geo = new THREE.PlaneGeometry(S.w, S.d).rotateX(-Math.PI / 2);
    this.patternU = {
      uMask: { value: this.maskRT.texture }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) },
      uLevel: { value: 0 }, uTime: { value: 0 }, uSweep: { value: -1 }, uGreen: { value: new THREE.Vector3(...lin(GREEN)) },
    };
    const mat = new THREE.ShaderMaterial({ uniforms: this.patternU, vertexShader: PATTERN_VS, fragmentShader: PATTERN_FS, transparent: true, depthWrite: false });
    const plane = this.patternPlane = new THREE.Mesh(geo, mat);
    plane.position.y = 0.006;
    plane.renderOrder = 3;
    this.chipGroup.add(plane);
  }

  buildProjector(quality) {
    const S = this.S;
    const y0 = 0.02, R = { h: PROJ.lensY, a: PROJ.a };
    const hull = new THREE.BoxGeometry(2, 1, 2), hp = hull.attributes.position;
    for (let i = 0; i < hp.count; i++) {
      const f = hp.getY(i) + 0.5;
      hp.setXYZ(i, hp.getX(i) * (S.w / 2 + (R.a - S.w / 2) * f), y0 + (R.h - y0) * f, hp.getZ(i) * (S.d / 2 + (R.a - S.d / 2) * f));
    }
    this.rayU = {
      map: { value: this.maskRT.texture }, color: { value: new THREE.Color(...lin(GREEN)) }, gain: { value: 0.085 }, face: { value: 0.3 },
      flow: { value: 0 }, box: { value: new THREE.Vector4(S.w / 2, S.d / 2, R.a, R.h) }, y0: { value: y0 }, level: { value: 0 },
      origin: { value: new THREE.Vector3() },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.rayU, defines: { STEPS: quality === 'low' ? 12 : 24 },
      vertexShader: WORLD_VS, fragmentShader: RAYS_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    });
    this.coneMesh = new THREE.Mesh(hull, mat);
    this.coneMesh.renderOrder = 4;
    this.coneMesh.frustumCulled = false;
    this.group.add(this.coneMesh);
    // the projector: a compact mid-grey body with a lens looking down, held from a post above (no shadow: its shadow
    // read as a stray box on the table)
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.4, ...o });
    const g = this.projector = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.6, 2.6), std(0x4b545e));
    body.position.y = PROJ.y; g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.9, 32), std(0x15181c, { metalness: 0.6, roughness: 0.3 }));
    barrel.position.y = PROJ.y - 1.0; g.add(barrel);
    this.lensMat = std(0x7cff9a, { transparent: true, opacity: 0.75, roughness: 0.05, depthWrite: false, emissive: new THREE.Color(0x2bff5a), emissiveIntensity: 0 });
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.1, 32), this.lensMat);
    lens.position.y = PROJ.lensY; g.add(lens);
    // (its pilot lamp on the back face: on the front it read as a stray dot in the caption)
    this.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), new THREE.MeshBasicMaterial({ color: 0x1f2a22 }));
    this.lamp.position.set(1.35, PROJ.y + 0.5, -1.31); g.add(this.lamp);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 30, 12), std(0x9aa4ae, { metalness: 0.75, roughness: 0.32 }));
    rod.position.set(0, PROJ.y + 0.8 + 15, -0.6); g.add(rod);
    this.group.add(g);
  }

  buildLabels() {
    const S = this.S;
    const mk = (key, pos, cls = 'callout') => {
      const el = document.createElement('div');
      el.className = cls;
      el.innerHTML = '<span></span>';
      const obj = new CSS2DObject(el);
      obj.position.set(...pos);
      obj.visible = false;
      this.group.add(obj);
      this.labels[key] = { obj, el };
    };
    // the program light's tag on the cone's right flank, under the lens; the chip's tag hangs below its front edge
    // (under the circuit's front edge when there is one: switchTo)
    const hy = PROJ.lensY * 0.7;
    mk('program', [PROJ.a + (S.w / 2 - PROJ.a) * (1 - hy / PROJ.lensY), hy, 0], 'callout program');
    mk('chip', [0, 0.05, S.d / 2 - 0.25], 'callout below');
    this.chipAt0 = [0, 0.05, S.d / 2 - 0.25];
  }
  setLabelText(words) {
    this.words = words;
    this.labels.program.el.querySelector('span').textContent = words('lbl.program');
    this.labels.chip.el.querySelector('span').textContent = words(this.chipKey());
    if (this.labels.spread) this.labels.spread.el.querySelector('span').textContent = words('lbl.spread');
    for (const p of this.programs.values()) p.kit._redrawPlates();
  }
  chipKey() { return this.chipLabel || (this.phase === 'run' || this.phase === 'write' ? 'lbl.written' : 'lbl.blank'); }

  // ------------------------------------------------------------------ programs
  make(id) {
    const S = this.S;
    if (this.programs.has(id)) return this.programs.get(id);
    const entry = this.catalog.find(c => c.id === id);
    if (!entry) return null;
    const kit = makeKit({ lang: this.lang, reduced: this.reduced, seed: 4242 + this.programs.size * 131, style: 'written' });
    let inst = {};
    try { inst = entry.mod.create(kit, entry.opts || {}) || {}; }
    catch (e) { window.dispatchEvent(new ErrorEvent('error', { message: `program ${id}: ${e && (e.stack || e.message) || e}` })); return null; }
    kit._finishWritten();
    const fp = kit.footprint || entry.mod.meta.size;
    const s = Math.min((S.w - 0.3) / fp.w, (S.d - 1.2) / fp.d);
    const holder = new THREE.Group();
    holder.scale.setScalar(s);
    holder.add(kit.group);
    holder.visible = false;
    this.chipGroup.add(holder);
    const guides = [];
    kit.group.traverse(o => { if (o.userData.role === 'guide' && (o.isMesh)) guides.push(o); });
    // the circuit's front edge (bench coordinates): the chip's tag hangs below it
    this.group.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const o of guides) box.expandByObject(o);
    box.applyMatrix4(new THREE.Matrix4().copy(this.group.matrixWorld).invert());
    const front = box.isEmpty() ? null : [(box.min.x + box.max.x) / 2, 0.05, Math.min(box.max.z + 0.1, S.d / 2 - 0.25)];
    // tab 2: the program's IN and OUT plates at the chip's two ends, outside the green light, larger than on tab 1
    // (they were tiny and floated inside the beam)
    if (!this.chipLabel) {
      for (const p of kit._plates) {
        const side = p.title === 'in' ? -1 : p.title === 'out' ? 1 : 0;
        if (!side) continue;
        const k = 4.0 / p.w;                                            // 4 units wide on the bench
        p.object.scale.setScalar(k / s);
        p.object.position.set(side * (S.w / 2 + 0.7) / s, (2.4 + 0.5 * k * p.h) / s, (-S.d / 2 + 0.6) / s);
      }
    }
    const prog = { id, kit, inst, holder, s, guides, front, mod: entry.mod };
    this.programs.set(id, prog);
    return prog;
  }

  enter() {
    this.group.visible = true;
    for (const l of Object.values(this.labels)) l.obj.visible = true;
    if (this.current) { this.call(this.current, 'focus', false); this.current.holder.visible = false; }
    this.current = null;
    this.want = this.catalog.length ? this.catalog[0].id : null;
    this.erased = false;
    this.bare = false;           // ("No program" chosen: the beam spreads out in the blank chip)
    this.phase = 'blank'; this.pt = 0;
    this.cone = 0; this.pattern = 0; this.task = 0;
  }
  leave() {
    this.group.visible = false;
    for (const l of Object.values(this.labels)) l.obj.visible = false;
    if (this.current) this.call(this.current, 'focus', false);
  }
  // ask for a program: the chip switches to it (light off, new pattern, circuit, task); null: no program (light off,
  // the circuit fades, the chip is blank again); null with now: blank at once (tab 3's story starting over)
  load(id, { now = false, bare = false } = {}) {
    this.bare = id == null && (bare || (this.bare && !now));
    if (id == null && now) {
      this.clear();
      this.phase = 'blank'; this.pt = 0;
      this.cone = 0; this.pattern = 0; this.task = 0;
      this.patternU.uSweep.value = -1; this.patternU.uLevel.value = 0;
      this.rayU.level.value = 0; this.coneMesh.visible = false;
      this.lensMat.emissiveIntensity = 0;
      this.labels.program.obj.visible = false;
      return;
    }
    if (id != null && !this.catalog.some(c => c.id === id)) return;
    if (id === this.want) { if (id && this.phase === 'blank') this.pt = Math.max(this.pt, T.blank - 0.3); return; }
    this.want = id;
    if (this.phase === 'run' || this.phase === 'write' || this.phase === 'light') { this.phase = 'off'; this.pt = 0; }
    else if (this.phase === 'blank' && id) this.pt = Math.max(this.pt, T.blank - 0.3);
  }
  get selected() { return this.want; }
  call(prog, fn, ...args) {
    if (!prog || !prog.inst || typeof prog.inst[fn] !== 'function') return undefined;
    try { return prog.inst[fn](...args); } catch (e) { window.dispatchEvent(new ErrorEvent('error', { message: `program ${prog.id}.${fn}: ${e && (e.stack || e.message) || e}` })); return undefined; }
  }

  // ------------------------------------------------------------------ per frame
  update(dt, t, camera, pointScale, raw = dt) {
    if (!this.group.visible) return;
    this.time += dt;
    this.pt += raw;                // the sequence runs on real time
    const sp = this.reduced ? 2 : 1;
    // the phases: blank -> (light -> write -> run) ; a new program: off -> dark -> light -> write -> run ;
    // no program: off -> dark -> blank
    switch (this.phase) {
      case 'blank':
        if (this.pt >= T.blank && this.want) { this.pt = 0; if (this.switchTo(this.want)) this.phase = 'light'; else this.clear(); }
        break;
      case 'off':
        this.task = Math.max(0, this.task - raw / T.off * sp);
        if (this.pt >= T.off) { this.phase = 'dark'; this.pt = 0; }
        break;
      case 'dark':
        if (this.pt >= T.dark) { this.pt = 0; if (this.want && this.switchTo(this.want)) this.phase = 'light'; else { this.clear(); this.phase = 'blank'; } }
        break;
      case 'light':
        if (this.pt >= T.light) { this.phase = 'write'; this.pt = 0; }
        break;
      case 'write':
        if (this.pt >= T.write) { this.phase = 'run'; this.pt = 0; this.call(this.current, 'focus', true); }
        break;
      default: break;
    }
    const k = Math.min(1, raw * 5 * sp);
    const coneT = this.phase === 'blank' || this.phase === 'dark' ? 0 : this.phase === 'off' ? 0.25 : this.phase === 'run' ? this._stage.glow : 1;
    this.cone += (coneT - this.cone) * k;
    let patT = 0;
    if (this.phase === 'write') patT = 1.2;                                           // bright behind the scan line
    else if (this.phase === 'run') patT = (0.62 + 0.38 * Math.max(0, 1 - this.pt / 1.2)) * this._stage.glow;  // then settles so the chip's light reads
    else if (this.phase === 'off') patT = 0.35;
    this.patternU.uSweep.value = this.phase === 'write' ? Math.min(1.05, this.pt * sp / SWEEP) : -1;
    this.pattern += (patT - this.pattern) * Math.min(1, raw * (this.phase === 'write' ? 9 : 5) * sp);
    if (this.phase === 'run') this.task = Math.min(1, this.task + raw / T.run * sp);
    else if (this.phase !== 'off') this.task = 0;
    this.patternU.uLevel.value = this.pattern;
    this.patternU.uTime.value = this.time;
    this.rayU.level.value = this.cone;
    this.rayU.flow.value = (this.time * (this.reduced ? 0.1 : 0.35)) % 1;
    this.group.getWorldPosition(this.rayU.origin.value);
    this.lensMat.emissiveIntensity = 1.4 * this.cone;
    this.lamp.material.color.setHex(this.cone > 0.5 ? 0x3fff6a : 0x1f2a22);
    // health: glow when the chip does its job, a dark shade when it does not
    const hT = this.healthT == null ? 1 : this.healthT;
    this.healthNow += (hT - this.healthNow) * Math.min(1, raw * 3);
    const hOn = this.healthT != null, h = this.healthNow;
    this.halo.visible = hOn && h > 0.02;
    this.haloMat.opacity = hOn ? 0.9 * Math.pow(h, 2) * (0.85 + 0.15 * Math.sin(this.time * 2.2)) : 0;
    const shade = (hOn ? 0.26 + 0.74 * Math.pow(h, 0.7) : 1) * this._stage.shade;
    this.slateTop.color.setRGB(0.765 * shade, 0.792 * shade, 0.824 * shade);
    this.slateTop.emissive.setRGB(0.05 * h * h, 0.09 * h * h, 0.07 * h * h).multiplyScalar(hOn ? 1 : 0);
    this.coneMesh.visible = this.cone > 0.01;
    this.labels.program.obj.visible = this.cone > 0.4 && !this.labelsHidden;
    // the input light (tab 2's "Light in" button): fades the chip's own light - the beams in and out and the light inside
    this.inLevel += ((this.inputOn ? 1 : 0) - this.inLevel) * Math.min(1, raw * 6);
    this.labels.chip.obj.visible = !this.labelsHidden;
    if (this.spreadU) {
      // "No program" chosen and the chip blank again: the beam comes in and spreads out
      const on = this.phase === 'blank' && !this.want && !this.current && (this.erased || this.bare) ? 1 : 0;
      this.spread += (on - this.spread) * Math.min(1, raw * (on ? 2 : 6));
      const s = this.spread, vis = s > 0.01;
      this.spreadU.uLevel.value = s * this.inLevel;
      this.spreadU.uTime.value = this.reduced ? 0 : this.time;
      this.spreadMesh.visible = vis;
      this.spreadBeam.object.visible = vis;
      this.spreadBeam.tick(this.reduced ? 0 : this.time, s * this.inLevel);
      this.labels.spread.obj.visible = s > 0.6 && this.inLevel > 0.5 && !this.labelsHidden;
    }
    if (this.words) this.labels.chip.el.querySelector('span').textContent = this.words(this.chipKey());
    const prog = this.current;
    if (prog) {
      const running = this.task > 0.001 || this.phase === 'run';
      if (running) this.call(prog, 'update', dt, t, true);
      prog.kit._tick(dt, t, { dim: this.task * this.inLevel, plateRate: 2, camera, pointScale, platesOn: this.task > 0.6 });
    }
  }

  switchTo(id) {
    const prog = this.make(id);
    if (!prog) return false;
    if (this.current && this.current !== prog) { this.call(this.current, 'focus', false); this.current.holder.visible = false; }
    this.current = prog;
    this.erased = false;
    prog.holder.visible = true;
    this.labels.chip.obj.position.set(...(prog.front || this.chipAt0));
    this.call(prog, 'reset');
    this.task = 0;
    return true;
  }
  // no program on the chip (or the one asked for could not be built): blank
  clear() {
    if (this.current) { this.call(this.current, 'focus', false); this.current.holder.visible = false; this.erased = true; }
    this.labels.chip.obj.position.set(...this.chipAt0);
    this.current = null;
    this.want = null;
    this.task = 0;
  }

  // the circuit of the current program, seen from above, into the mask (before the frame is drawn)
  renderMask(renderer) {
    if (!this.group.visible) return;
    const prog = this.current;
    const prevTarget = renderer.getRenderTarget();
    const prevClear = renderer.getClearColor(this._clear || (this._clear = new THREE.Color())), prevAlpha = renderer.getClearAlpha();
    const prevShadow = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(this.maskRT);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    if (prog) {
      const c = this._at || (this._at = new THREE.Vector3());
      this.group.getWorldPosition(c);
      this.maskCam.position.set(c.x, c.y + 20, c.z);
      this.maskCam.lookAt(c.x, c.y, c.z);
      this.maskCam.updateMatrixWorld();
      const saved = this._saved || (this._saved = []);
      saved.length = 0;
      for (const o of prog.guides) {
        let w = this.maskWhite.get(o);
        // (a guide may carry its own picture for the mask: userData.maskMap - a free-form pattern of light)
        if (!w) { w = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.7, 0.7), map: o.userData.maskMap || null, fog: false, side: THREE.DoubleSide }); this.maskWhite.set(o, w); }
        const om = o.material;
        const op = Array.isArray(om) ? 1 : (om.transparent ? om.opacity : 1);
        w.transparent = op < 0.999; w.opacity = op;
        saved.push(o, om);
        o.material = w;
      }
      const bg = this.scene.background, fog = this.scene.fog;
      this.scene.background = null; this.scene.fog = null;
      renderer.render(this.scene, this.maskCam);
      this.scene.background = bg; this.scene.fog = fog;
      for (let i = 0; i < saved.length; i += 2) saved[i].material = saved[i + 1];
    }
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(prevClear, prevAlpha);
    renderer.shadowMap.autoUpdate = prevShadow;
  }
}

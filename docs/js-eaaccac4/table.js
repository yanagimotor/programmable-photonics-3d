// The table: twelve conventional photonic chips laid out in a grid, each on its own mat, each doing its job.
// Owns the renderer, camera, picking, the chips' name labels and callouts, and the flights between the
// overview and one chip in focus.  The App (app.js) owns the interface around it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeKit } from './kit/index.js';
import { Bench, SLATE } from './bench.js';
import { Apps } from './apps/index.js';
import { How } from './how.js';
import { CATEGORY } from './kit/colour.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const CELL = { w: 18, d: 13.5 };
export const GRID = { cols: 4, rows: 3 };
const TABLE = { w: 82, d: 50, y: 0 };
const BG = 0x0b0f14;
const OVERVIEW = { pos: V(0, 48.5, 44.5), target: V(0, -2.2, 2.4), fov: 36, lift: 0.03 };    // lift: image shifted up (fraction of the height)
const FOCUS_LIFT = 0.1;
// tab 2: the programmable chip under its projector (the bench sits in the middle of the table); box: what the view
// must show (world: the chip, the light in and out, the plates, the whole projector), fitted above the story
const BENCH = { target: V(0, 3.2, 0.6), elev: 33, dist: 25, lift: -0.04, box: [[-9.2, 0, -4.2], [9.2, 11.4, 4.5]] };
// tab 3: the applications - each scene asks for its own view (apps.view: target, elev, dist, box - fitted as tab 2's;
// dur for the flight; fog [near, far] and maxDist for the zoom-outs)
const FOG = { near: 110, far: 220 };
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function holesTexture() {
  const px = 64, c = makeCanvas(px, px), g = c.getContext('2d');
  g.fillStyle = '#1b2026'; g.fillRect(0, 0, px, px);
  g.fillStyle = '#101317'; g.beginPath(); g.arc(px / 2, px / 2, px * 0.08, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(TABLE.w / 1.6, TABLE.d / 1.6);
  t.anisotropy = 8;
  return t;
}
// a rounded-rectangle outline glow (hover / focus halo around a mat)
function haloTexture(aspect) {
  const W = 512, H = Math.max(64, Math.round(512 / aspect)), c = makeCanvas(W, H), g = c.getContext('2d');
  const r = Math.min(W, H) * 0.12, m = 14;
  g.strokeStyle = 'rgba(160,215,255,1)'; g.lineWidth = 5; g.shadowColor = 'rgba(140,200,255,1)'; g.shadowBlur = 12;
  g.beginPath(); g.roundRect(m, m, W - 2 * m, H - 2 * m, r); g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Table {
  constructor(container, { entries, catalog = [], programs = {}, lang, quality = 'high', kiosk = false, reduced = false } = {}) {
    this.container = container;
    this.lang = lang;                     // () -> 'en' | 'ja'
    this.quality = quality; this.kiosk = kiosk; this.reduced = reduced;
    this.lowered = false;
    this.time = 0;
    this.devices = [];
    this.byId = {};
    this.focusId = null;
    this.hoverId = null;
    this.labelsOn = true;
    this.blockers = [];
    this.panelPx = 0; this.offXNow = 0; this.liftNow = 0;
    this.freeBottom = null;               // top of the story block (px): the chip in focus is fitted above it
    this.focusOff = { x: 0, y: 0 };       // image offset that centres the chip in focus in the free area
    this.viewOff = { x: 0, y: 0 };        // the same for the views of tabs 2 and 3
    this.fogK = 1;                        // tab 3: the fitted distance over the view's own (the fog follows)
    this.tween = null;
    this.listeners = { pick: [], hover: [] };
    this.tab = 'conv';                    // 'conv' (tab 1: the table of chips) | 'prog' (tab 2: the bench) | 'apps' (tab 3) | 'how' (tab 4)
    this.errors = [];

    const w = container.clientWidth || 800, h = container.clientHeight || 600;
    const low = quality === 'low';
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: low, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, low ? 1 : kiosk ? 1.5 : 2));
    r.setSize(w, h);
    r.setClearColor(BG);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = !low;
    r.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(r.domElement);
    r.domElement.setAttribute('aria-hidden', 'true');
    r.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); setTimeout(() => location.reload(), 1500); });
    // a shader that does not compile or link is a page error (the error log, the tests and the screenshot tools see it;
    // three itself would only write it to the console and draw nothing)
    r.debug.onShaderError = (gl, program, vs, fs) => {
      const log = sh => (gl.getShaderInfoLog(sh) || '').trim().replace(/\s+/g, ' ');
      window.dispatchEvent(new ErrorEvent('error', { message: `shader: ${(gl.getProgramInfoLog(program) || '').trim().slice(0, 160)} | vertex: ${log(vs).slice(0, 200)} | fragment: ${log(fs).slice(0, 400)}` }));
    };
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    Object.assign(this.labelRenderer.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });
    this.labelRenderer.domElement.className = 'label-layer';
    container.appendChild(this.labelRenderer.domElement);

    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BG, 110, 220);
    const cam = this.camera = new THREE.PerspectiveCamera(OVERVIEW.fov, w / h, 0.1, 600);
    cam.position.copy(OVERVIEW.pos);
    const ctl = this.controls = new OrbitControls(cam, r.domElement);
    ctl.target.copy(OVERVIEW.target);
    ctl.enableDamping = true; ctl.dampingFactor = 0.08;
    ctl.minDistance = 4; ctl.maxDistance = 120;
    ctl.maxPolarAngle = Math.PI * 0.47;
    ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    ctl.addEventListener('start', () => { this.endTween(); });
    ctl.update();

    this.composer = null;
    if (!low) {
      const size = r.getDrawingBufferSize(new THREE.Vector2());
      const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(scene, cam));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.55, 0.42, 0.92);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this.buildLights();
    this.buildTable();
    this.conv = new THREE.Group();          // everything of tab 1 (hidden on tab 2)
    scene.add(this.conv);
    for (const [i, e] of entries.entries()) this.addDevice(e.mod, e.slot ?? i, i);
    this.bench = new Bench({ renderer: r, scene, lang, reduced, quality, catalog });
    this.bench.group.position.set(0, TABLE.y + SLATE.h, 0);
    this.apps = new Apps({ renderer: r, scene, lang, reduced, quality, programs, y: TABLE.y });
    this.how = new How({ scene, lang, reduced });          // the "How it works" tab: the chip's layers, step by step
    this.applyFit(true);
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(container);
  }

  // ------------------------------------------------------------------ construction
  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xd6e0ea, 0x1a2028, 1.25));
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(-26, 52, 34);
    key.castShadow = this.quality !== 'low';
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -46, right: 46, top: 32, bottom: -32, near: 1, far: 140 });
    key.shadow.bias = -0.0005;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fb8d8, 0.45);
    fill.position.set(30, 18, -20);
    this.scene.add(fill);
  }

  buildTable() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: holesTexture(), metalness: 0.4, roughness: 0.62 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w, 1.2, TABLE.d), mat);
    top.position.set(0, TABLE.y - 0.6, 0);
    top.receiveShadow = true;
    this.scene.add(top);
  }

  slotPosition(i) {
    const col = i % GRID.cols, row = Math.floor(i / GRID.cols);
    return V((col - (GRID.cols - 1) / 2) * CELL.w, 0, (row - (GRID.rows - 1) / 2) * CELL.d);
  }

  addDevice(mod, slot, i) {
    const meta = mod.meta, id = meta.id;
    const kit = makeKit({ lang: this.lang, reduced: this.reduced, seed: 1 + i * 7919 });
    const rec = { id, mod, meta, kit, inst: null, index: i, dim: 1, error: null };
    const size = meta.size || { w: 8, d: 5 };
    try {
      rec.inst = mod.create(kit) || {};
    } catch (e) {
      rec.error = e;
      this.errors.push(`${id}: ${e && (e.stack || e.message) || e}`);
      // a plain placeholder chip, so that the rest of the table still works
      kit.group.clear();
      kit.chip({ w: size.w, d: size.d, platform: meta.platform || 'si' });
      rec.inst = {};
    }
    const group = rec.group = new THREE.Group();
    group.add(kit.group);
    const pos = this.slotPosition(slot);
    group.position.set(pos.x, TABLE.y - kit.bottom + 0.06, pos.z);
    this.conv.add(group);

    // the mat (one station per job), its halo, and a generous invisible box for picking
    const mw = (meta.mat && meta.mat[0]) || Math.min(CELL.w - 1.2, size.w + 6.4);
    const md = (meta.mat && meta.mat[1]) || Math.min(CELL.d - 1.6, size.d + 4.2);
    rec.matSize = [mw, md];
    const matMesh = new THREE.Mesh(new THREE.BoxGeometry(mw, 0.06, md), new THREE.MeshStandardMaterial({ color: 0x323b46, roughness: 0.85, metalness: 0.1 }));
    matMesh.position.set(pos.x, TABLE.y + 0.03, pos.z);
    matMesh.receiveShadow = true;
    this.conv.add(matMesh);
    const halo = rec.halo = new THREE.Mesh(new THREE.PlaneGeometry(mw + 0.5, md + 0.5).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: haloTexture((mw + 0.5) / (md + 0.5)), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(pos.x, TABLE.y + 0.07, pos.z);
    halo.renderOrder = 2;
    this.conv.add(halo);
    const pick = new THREE.Mesh(new THREE.BoxGeometry(mw, 2.4, md), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
    pick.position.set(pos.x, TABLE.y + 1.2, pos.z);
    pick.userData.deviceId = id;
    this.conv.add(pick);
    rec.pick = pick;

    // name label on the front edge of the mat
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'chiplbl';
    el.style.setProperty('--cat', CATEGORY[meta.category] || '#9fb3c8');
    el.innerHTML = '<i></i><span></span>';
    el.addEventListener('click', e => { e.stopPropagation(); this.emit('pick', id); });
    el.addEventListener('pointerenter', () => this.setHover(id));
    el.addEventListener('pointerleave', () => this.setHover(null));
    const lbl = rec.label = new CSS2DObject(el);
    lbl.position.set(0, 0.1 - group.position.y + TABLE.y, md / 2 - 0.55);
    group.add(lbl);

    // callouts (shown in focus)
    rec.callouts = [];
    const anchors = rec.inst.anchors || {};
    for (const [key, p] of Object.entries(anchors)) {
      const c = document.createElement('div');
      c.className = 'callout';
      c.innerHTML = '<span></span>';
      const obj = new CSS2DObject(c);
      obj.position.set(...p);
      obj.visible = false;
      kit.group.add(obj);
      rec.callouts.push({ key, obj, el: c });
    }
    this.devices.push(rec);
    this.byId[id] = rec;
    this.refreshText(rec);
  }

  // texts of one device in the current language
  textOf(rec) {
    const T = rec.mod.text || {};
    return T[this.lang()] || T.en || {};
  }
  refreshText(rec) {
    const T = this.textOf(rec), TE = (rec.mod.text && rec.mod.text.en) || {};
    rec.label.element.querySelector('span').textContent = T.name || TE.name || rec.id;
    for (const c of rec.callouts) {
      const has = T.c && c.key in T.c ? T.c[c.key] : TE.c && TE.c[c.key];
      c.empty = !has;
      c.el.querySelector('span').textContent = has || '';
    }
  }
  setLang() {
    for (const rec of this.devices) { this.refreshText(rec); rec.kit._redrawPlates(); }
  }

  // ------------------------------------------------------------------ events
  on(ev, f) { this.listeners[ev].push(f); }
  emit(ev, v) { for (const f of this.listeners[ev]) f(v); }

  bindPointer() {
    const el = this.renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    let down = null;
    const pickAt = (cx, cy) => {
      const r = el.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hits = ray.intersectObjects(this.devices.map(d => d.pick), false);
      return hits.length ? hits[0].object.userData.deviceId : null;
    };
    el.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', e => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
      down = null;
      if (moved > 7 || dt > 600) return;
      const id = pickAt(e.clientX, e.clientY);
      if (this.tab === 'conv') this.emit('pick', id);
    });
    el.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      const id = pickAt(e.clientX, e.clientY);
      this.setHover(id);
    });
    el.addEventListener('pointerleave', () => this.setHover(null));
  }
  setHover(id) {
    if (id === this.hoverId) return;
    this.hoverId = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : '';
    this.emit('hover', id);
  }

  // ------------------------------------------------------------------ camera
  // the camera of the tabs after the first (each fitted above the story)
  tabPose() { return this.tab === 'prog' ? this.benchPose() : this.tab === 'how' ? this.fitView(this.how.view, this.how.view.box) : this.appsPose(); }
  benchPose() {
    const target = BENCH.target.clone().add(this.bench.group.position).setY(BENCH.target.y);
    return this.fitView({ ...BENCH, target: target.toArray() }, BENCH.box);
  }
  // Tabs 2 and 3: the view's box (world) is fitted into the free part of the stage - left of the catalog, above the
  // story at the bottom left - as the chip in focus is on tab 1: the view keeps its target, elevation and azimuth; the
  // distance and the image offset are found with a trial camera.  (Without a box: the view's own distance and lift.)
  fitView(v, box) {
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const el = THREE.MathUtils.degToRad(v.elev), az = THREE.MathUtils.degToRad(v.az || 0);
    const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const target = V(...v.target);
    let dist = v.dist * Math.max(1, Math.pow(1.78 / this.camera.aspect, 0.85));
    this.viewOff = { x: this.panelPx / 2, y: (v.lift ?? -0.04) * H };
    if (!W || !H || !box) return { pos: target.clone().addScaledVector(dir, dist), target, dist };
    const pts = [];
    for (let i = 0; i < 8; i++) pts.push(V(box[i & 1][0], box[(i >> 1) & 1][1], box[(i >> 2) & 1][2]));
    const region = { x0: 0.02 * W, x1: W - this.panelPx - 0.02 * W, y0: 0.025 * H, y1: Math.max(0.45 * H, (this.freeBottom ?? H * 0.8) - 0.025 * H) };
    const rw = region.x1 - region.x0, rh = region.y1 - region.y0;
    // (a portrait screen - a phone - lets the box overflow the sides a little, and sets it on the story rather than
    // in the middle of the free part: the scene, not an empty band, meets the caption)
    const portrait = rw < rh, ow = portrait ? 1.15 : 1;
    const cam = new THREE.PerspectiveCamera(this.camera.fov, W / H, 0.1, 4000), p = new THREE.Vector3();
    let bb = null;
    for (let it = 0; it < 10; it++) {
      cam.position.copy(target).addScaledVector(dir, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      for (const q of pts) {
        p.copy(q).project(cam);
        const x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H;
        bb.x0 = Math.min(bb.x0, x); bb.x1 = Math.max(bb.x1, x); bb.y0 = Math.min(bb.y0, y); bb.y1 = Math.max(bb.y1, y);
      }
      const f = Math.max((bb.x1 - bb.x0) / (rw * ow), (bb.y1 - bb.y0) / rh);
      if (Math.abs(f - 1) < 0.01) break;
      dist = Math.max(4, dist * f);
    }
    // offsets of the image (view offset): the fitted box's centre onto the free area's centre
    const cy = portrait ? region.y1 - (bb.y1 - bb.y0) / 2 : (region.y0 + region.y1) / 2;
    this.viewOff = { x: (bb.x0 + bb.x1) / 2 - (region.x0 + region.x1) / 2, y: (bb.y0 + bb.y1) / 2 - cy };
    this.fitBottom = this.freeBottom;
    return { pos: target.clone().addScaledVector(dir, dist), target, dist };
  }
  appsPose() {
    const v = this.apps.view;
    this.appsViewKey = this.apps.viewKey;
    const pose = this.fitView(v, v.box);
    // (a narrow screen fits a zoom-out from farther away: the orbit's limit and the fog go along)
    this.fogK = Math.max(1, pose.dist / v.dist);
    this.controls.maxDistance = Math.max(120, (v.maxDist || 0) * this.fogK);
    return pose;
  }
  // tab 1 (the table of chips), tab 2 (the programmable chip), tab 3 (the applications) or tab 4 (how it works)
  setTab(tab, { instant = false } = {}) {
    if (tab === this.tab) return;
    if (this.focusId) this.overview({ instant: true });
    this.tab = tab;
    this.conv.visible = tab === 'conv';
    this.setHover(null);
    if (tab === 'prog') this.bench.enter(); else this.bench.leave();
    if (tab === 'apps') this.apps.enter(); else this.apps.leave();
    if (tab === 'how') this.how.enter(); else this.how.leave();
    this.renderer.toneMapping = tab === 'conv' ? THREE.ACESFilmicToneMapping : THREE.NeutralToneMapping;
    this.controls.minDistance = 4; this.controls.maxDistance = 120;
    this.applyFit(instant);
  }
  overviewPose() {
    // (a portrait screen draws back further, so that all four columns of chips fit across)
    const a = this.camera.aspect, k = Math.max(1, Math.pow(1.78 / a, a < 0.8 ? 1.02 : 0.85));
    const pos = OVERVIEW.target.clone().add(OVERVIEW.pos.clone().sub(OVERVIEW.target).multiplyScalar(k));
    return { pos, target: OVERVIEW.target.clone() };
  }
  // The chip in focus is fitted into the free part of the view (left of a panel, above the story block): its body,
  // its beams in and out, and its plates are projected through a trial camera, and the distance and the image offset
  // are chosen so that they fill that area.
  focusPose(rec) {
    const c = rec.group.position.clone(); c.y = TABLE.y + 0.4;
    const v = rec.inst.view;
    if (v) { this.focusOff = { x: this.panelPx / 2, y: FOCUS_LIFT * this.container.clientHeight }; return { pos: c.clone().add(V(...v.pos)), target: c.clone().add(V(...v.target)) }; }
    const fit = this.fitFocus(rec);
    if (fit) { this.focusOff = fit.off; return fit.pose; }
    this.focusOff = { x: this.panelPx / 2, y: FOCUS_LIFT * this.container.clientHeight };
    const [mw, md] = rec.matSize;
    const usable = Math.max(0.35, 1 - this.panelPx / Math.max(1, this.container.clientWidth));
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect * usable);
    const elev = THREE.MathUtils.degToRad(57);
    // fit the mat's width into the free part of the view, and its depth (seen at the elevation) into the height
    const dW = (mw * 0.5 + 0.4) / Math.tan(hfov / 2);
    const dD = (md * 0.5 * Math.sin(elev) + 1.6) / Math.tan(vfov / 2);
    const dist = Math.max(dW, dD) * 1.06;
    const target = c.clone().add(V(0, 0.3, -0.4));
    return { pos: target.clone().add(V(0, Math.sin(elev) * dist, Math.cos(elev) * dist)), target };
  }
  fitFocus(rec) {
    const W = this.container.clientWidth, H = this.container.clientHeight;
    if (!W || !H) return null;
    rec.group.updateMatrixWorld(true);
    const pts = [], plates = [];
    const box = new THREE.Box3(), corners = (b) => { for (let i = 0; i < 8; i++) pts.push(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)); };
    for (const m of rec.kit.hit) { box.setFromObject(m); if (!box.isEmpty()) corners(box); }
    for (const b of rec.kit._beams) { if (!b.object.visible) continue; box.setFromObject(b.object); if (!box.isEmpty()) corners(box); }
    for (const p of rec.kit._plates) plates.push({ c: p.object.getWorldPosition(new THREE.Vector3()), w: p.w * rec.group.scale.x, h: p.h * rec.group.scale.y });
    if (!pts.length) return null;
    const all = new THREE.Box3().setFromPoints([...pts, ...plates.map(p => p.c)]);
    const target = all.getCenter(new THREE.Vector3());
    target.y = Math.min(target.y, TABLE.y + 1.2);
    const margin = 0.025;
    const region = { x0: margin * W, x1: W - this.panelPx - margin * W, y0: 0.03 * H, y1: Math.max(0.45 * H, (this.freeBottom ?? H * 0.72) - 0.02 * H) };
    const rw = region.x1 - region.x0, rh = region.y1 - region.y0;
    const elev = THREE.MathUtils.degToRad(57), dir = V(0, Math.sin(elev), Math.cos(elev));
    const cam = new THREE.PerspectiveCamera(this.camera.fov, W / H, 0.1, 600);
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    let dist = 30, bb = null;
    const v = new THREE.Vector3();
    for (let it = 0; it < 8; it++) {
      cam.position.copy(target).addScaledVector(dir, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      bb = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
      const put = (x, y) => { bb.x0 = Math.min(bb.x0, x); bb.x1 = Math.max(bb.x1, x); bb.y0 = Math.min(bb.y0, y); bb.y1 = Math.max(bb.y1, y); };
      const px = p => { v.copy(p).project(cam); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };
      for (const p of pts) put(...px(p));
      for (const p of plates) {
        const [x, y] = px(p.c);
        const depth = p.c.distanceTo(cam.position), k = (H / 2) / (tanH * Math.max(0.1, depth));
        put(x - p.w / 2 * k, y - p.h / 2 * k); put(x + p.w / 2 * k, y + p.h / 2 * k);
      }
      const f = Math.max((bb.x1 - bb.x0) / rw, (bb.y1 - bb.y0) / rh);
      if (Math.abs(f - 1) < 0.015) break;
      dist = Math.max(6, dist * f);
    }
    // offsets of the image (view offset): the fitted box's centre onto the free area's centre
    const off = { x: (bb.x0 + bb.x1) / 2 - (region.x0 + region.x1) / 2, y: (bb.y0 + bb.y1) / 2 - (region.y0 + region.y1) / 2 };
    this.fitBottom = this.freeBottom;
    return { pose: { pos: target.clone().addScaledVector(dir, dist), target }, off };
  }
  // the top of the story block (px): when it moves (another chip, another language), the chip in focus - or the view
  // of tabs 2 and 3 - is refitted
  setFreeBottom(px) {
    this.freeBottom = px;
    if (this.tween || Math.abs((this.fitBottom ?? px) - px) <= 24) return;
    if (this.tab === 'conv') { if (this.focusId) this.flyTo(this.focusPose(this.byId[this.focusId]), 0.6); }
    else this.flyTo(this.tabPose(), 0.6);
  }
  // (during a flight the orbit controls must not clamp the distance - a flight back from a zoom-out of tab 3 starts
  // far beyond the usual limit; the limit set for the destination applies when the flight ends)
  flyTo(pose, dur = 1.15) {
    if (this.reduced) dur = 0.01;
    // the limit for the destination: what the caller has just set, else the one the flight under way would restore
    const limit = this.controls.maxDistance === Infinity ? (this.tween ? this.tween.maxAfter : 120) : this.controls.maxDistance;
    this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: pose.pos, t1: pose.target, k: 0, dur, maxAfter: limit };
    this.controls.maxDistance = Infinity;
  }
  endTween() { if (this.tween) { this.controls.maxDistance = this.tween.maxAfter; this.tween = null; } }
  applyFit(instant = false) {
    const pose = this.tab !== 'conv' ? this.tabPose() : this.focusId ? this.focusPose(this.byId[this.focusId]) : this.overviewPose();
    if (instant) {
      if (this.controls.maxDistance === Infinity) this.controls.maxDistance = this.tween ? this.tween.maxAfter : 120;
      this.camera.position.copy(pose.pos); this.controls.target.copy(pose.target); this.tween = null; this.controls.update();
    } else this.flyTo(pose);
  }

  focus(id, { instant = false } = {}) {
    const rec = this.byId[id];
    if (!rec) return;
    const prev = this.focusId ? this.byId[this.focusId] : null;
    if (prev && prev !== rec) { this.callInst(prev, 'focus', false); for (const c of prev.callouts) c.obj.visible = false; }
    this.focusId = id;
    this.callInst(rec, 'focus', true);
    for (const c of rec.callouts) c.obj.visible = this.labelsOn && !c.empty;
    this.controls.minDistance = 3; this.controls.maxDistance = 60;
    if (instant) this.applyFit(true); else this.flyTo(this.focusPose(rec));
  }
  overview({ instant = false } = {}) {
    if (this.focusId) {
      const rec = this.byId[this.focusId];
      this.callInst(rec, 'focus', false);
      for (const c of rec.callouts) c.obj.visible = false;
    }
    this.focusId = null;
    this.controls.minDistance = 4; this.controls.maxDistance = 120;
    if (instant) this.applyFit(true); else this.flyTo(this.overviewPose());
  }
  // width (px) of the info panel over the right side of the view: the camera's image is shifted left by half
  setPanel(px) { this.panelPx = px; }

  callInst(rec, fn, ...args) {
    if (!rec.inst || typeof rec.inst[fn] !== 'function') return undefined;
    try { return rec.inst[fn](...args); } catch (e) { this.reportError(rec, e); return undefined; }
  }
  reportError(rec, e) {
    const msg = `${rec.id}: ${e && (e.stack || e.message) || e}`;
    if (!rec.error) { rec.error = e; this.errors.push(msg); window.dispatchEvent(new ErrorEvent('error', { message: msg })); }
  }

  setLabelsVisible(on) {
    this.labelsOn = on;
    for (const rec of this.devices) {
      rec.label.visible = on && !this.focusId;
      for (const c of rec.callouts) c.obj.visible = on && this.focusId === rec.id && !c.empty;
    }
  }
  setBlockers(rects) { this.blockers = rects; }
  // light up the halos of every chip of one category (the legend in the overview); null clears
  setHighlight(category) { this.highlight = category; }

  // hide labels that collide with the interface or with each other (callouts first, in their given order)
  cullLabels() {
    const placed = [];
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const cr = this.container.getBoundingClientRect();
    const overlaps = (a, b, m = 4) => a.left < b.right + m && a.right > b.left - m && a.top < b.bottom + m && a.bottom > b.top - m;
    const list = [];
    if (this.focusId) for (const c of this.byId[this.focusId].callouts) if (c.obj.visible) list.push(c.el);
    for (const rec of this.devices) if (rec.label.visible) list.push(rec.label.element);
    if (this.tab === 'prog') for (const l of Object.values(this.bench.labels)) if (l.obj.visible) list.push(l.el);
    if (this.tab === 'apps') for (const l of this.apps.allLabels()) if (l.obj.visible) list.push(l.el);
    if (this.tab === 'how') for (const l of this.how.allLabels()) if (l.obj.visible) list.push(l.el);
    for (const el of list) {
      el.classList.remove('culled');
      const r = (el.classList.contains('callout') ? el.querySelector('span') || el : el).getBoundingClientRect();
      const rr = { left: r.left - cr.left, right: r.right - cr.left, top: r.top - cr.top, bottom: r.bottom - cr.top };
      const off = rr.left < 2 || rr.right > W - 2 || rr.top < 2 || rr.bottom > H - 2;
      const hit = off || this.blockers.some(b => overlaps(rr, b)) || placed.some(p => overlaps(rr, p));
      if (hit) el.classList.add('culled'); else placed.push(rr);
    }
  }

  // ------------------------------------------------------------------ per frame
  update(dt, raw = dt) {
    this.time += dt;
    const t = this.time;
    // camera flight
    if (this.tween) {
      const tw = this.tween;
      tw.k = Math.min(1, tw.k + dt / tw.dur);
      const e = ease(tw.k);
      this.camera.position.lerpVectors(tw.p0, tw.p1, e);
      this.controls.target.lerpVectors(tw.t0, tw.t1, e);
      if (tw.k >= 1) this.endTween();
    }
    // shift the image: left by half the panel (the chip in focus sits in the free part of the view), and up so that
    // the story at the bottom left does not cover the front row
    const W = this.container.clientWidth, H = this.container.clientHeight;
    const k = this.liftNow === 0 && this.time < 0.2 ? 1 : Math.min(1, dt * 6);
    const ox = this.tab !== 'conv' ? this.viewOff.x : this.focusId ? this.focusOff.x : 0;
    const oy = this.tab !== 'conv' ? this.viewOff.y : this.focusId ? this.focusOff.y : OVERVIEW.lift * H;
    this.offXNow += (ox - this.offXNow) * k;
    this.liftNow += (oy - this.liftNow) * k;
    this.camera.setViewOffset(W, H, this.offXNow, this.liftNow, W, H);
    this.controls.update();

    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const pointScale = (this.renderer.domElement.height / 2) / Math.tan(vfov / 2);
    // the fog: farther away for the zoom-outs of tab 3
    const fog = (this.tab === 'apps' && this.apps.view.fog) || [FOG.near, FOG.far], kf = Math.min(1, dt * 1.5), fk = this.tab === 'apps' ? this.fogK : 1;
    this.scene.fog.near += (fog[0] * fk - this.scene.fog.near) * kf; this.scene.fog.far += (fog[1] * fk - this.scene.fog.far) * kf;
    if (this.tab !== 'conv') {
      for (const rec of this.devices) { rec.label.visible = false; for (const c of rec.callouts) c.obj.visible = false; }
      if (this.tab === 'prog') this.bench.update(dt, t, this.camera, pointScale, raw);
      else if (this.tab === 'how') this.how.update(dt, t, this.camera, pointScale, raw);
      else {
        this.apps.update(dt, t, this.camera, pointScale, raw);
        // another scene, or the scene's story moved the camera (a zoom-out): fly there
        if (this.apps.viewKey !== this.appsViewKey) this.flyTo(this.appsPose(), this.apps.view.dur || 1.3);
      }
      return;
    }
    for (const rec of this.devices) {
      const focused = this.focusId === rec.id;
      const want = !this.focusId || focused ? 1 : 0.12;      // (the neighbours' light all but out: it read as part of the chip in focus)
      rec.dim += (want - rec.dim) * Math.min(1, dt * 4);
      const lit = this.hoverId === rec.id || (!this.focusId && this.highlight && rec.meta.category === this.highlight);
      const hl = focused ? 0.05 : lit ? 0.6 : 0;
      rec.halo.material.opacity += (hl - rec.halo.material.opacity) * Math.min(1, dt * 8);
      rec.label.visible = this.labelsOn && !this.focusId;
      if (rec.error && !rec.inst.update) continue;
      try {
        if (rec.inst.update) rec.inst.update(dt, t, focused);
        // plates redraw often only on the chip in focus (each redraw uploads a texture)
        rec.kit._tick(dt, t, { dim: rec.dim, plateRate: focused ? 2 : 0.3, camera: this.camera, pointScale, platesOn: focused });
      } catch (e) { this.reportError(rec, e); rec.inst.update = null; }
    }
  }

  render() {
    if (this.tab === 'prog') this.bench.renderMask(this.renderer);
    if (this.tab === 'apps') this.apps.renderMask(this.renderer);
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    this.cullLabels();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    if (this.composer) { this.composer.setSize(w, h); if (this.bloom) this.bloom.resolution.set(w / 2, h / 2); }
    if (!this.tween) this.applyFit(false);
  }

  lowerQuality() {
    if (this.lowered) return;
    this.lowered = true;
    if (this.composer) { this.composer.dispose?.(); this.composer = null; }
    this.renderer.shadowMap.enabled = false;
    this.renderer.setPixelRatio(1);
    this.resize();
  }
}

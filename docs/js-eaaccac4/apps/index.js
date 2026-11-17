// Tab 3, "Potential applications": what the chip written by light can do, one application per button.  Each
// application is a scene (apps/<id>.js) around one shared bench - the light-programmable chip under its projector
// (bench.js), with a squarer slate than tab 2's - which runs the scene's program (programs/*.js): image and voice
// recognition in tab 3's own look (compute.APP_LIGHT: yellow-white light, no plates, no cycling) for optical
// computation, whose story writes them itself (its program is null: it starts from a blank chip, sunk into the table),
// the colour router (wdm) for in situ inverse design and error correction, the twin-photon source (qsource) for the
// quantum internet.
//
//   const apps = new Apps({ renderer, scene, lang, reduced, quality, programs, y })
//   apps.enter() / apps.leave() / apps.load(id);  apps.selected;  apps.update(dt, t, camera, pointScale, raw)
//                       (load takes an old id too - ALIASES: the scene it lives in now, entered at its part)
//   apps.view           the camera the scene asks for: { target: [x, y, z], elev, dist, lift, dur, fog, serial }
//                       (a scene may change it - a zoom-out - by giving a new object or a new serial)
//   apps.caption        the key of the caption (a scene may change it as its story goes on)
//   apps.current        the scene: { controls, act(id), value(id) } for the buttons under the caption
//   apps.renderMask(renderer) before the frame;  apps.allLabels() for the label culling
//   apps.hold           stepping by hand (auto-play off; app.js sets it every frame): each part of the story waits at
//                       its end for Next
//   apps.parts, apps.partIndex   the story's parts and the one shown (or asked for);  apps.next() / apps.prev():
//                       Next, Back (false at the last / first part: app.js then opens the next application)
//
// A scene module exports create(ctx) -> { program, view, caption, update(dt, t, camera, pointScale, raw), enter(),
// leave(), controls, act, value, parts, step, waiting, goOn(), go(part) }.  ctx: { THREE, kit (its own kit, etched
// style), group, bench, y, reduced, quality, lang, chipAt, label(key, cls) -> { obj, el, at(x, y, z), show(on),
// set(key) }, anchor(name) -> world position of the program's anchor (null until the program is built), words() -> the
// current translation function, hold() -> apps.hold }.  Stepping by hand, a scene whose part has run its course stops
// that part's clock and waits (waiting); goOn() lets it go on as the story would; go(part) poses a part at once.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { makeKit } from '../kit/index.js';
import { Bench } from '../bench.js';
import * as compute from './compute.js';
import * as insitu from './insitu.js';
import * as quantum from './quantum.js';

// dwell: seconds on the tour, each story whole: optical computation's GPU, lens, super glass and chip, and its energy
// graph (the last vowel is read at about 63 s, the graph is drawn by about 69 s, and the tour moves on before the story
// turns back to part 1 at about 76.4 s); the in situ
// story's router learned, fixed in the fire and in the snow, and its zoom-out (the tour moves on in the last second of
// the chips written by light, after "System working" has shown for about 7 s, before the camera flies back); the
// quantum internet's two zoom-outs
export const APPS = [{ id: 'compute', dwell: 76 }, { id: 'insitu', dwell: 61 }, { id: 'quantum', dwell: 47 }];
const SCENES = { compute, insitu, quantum };
// each scene's kit is seeded by the scene's id, not by its place in the list, so that its random pictures stay as they
// are when the list changes: insitu has the seed of the error-correction entry, whose snow, frost and grid it draws
// now; quantum keeps its own (the order its web grows in)
const SEEDS = { compute: 777, insitu: 979, quantum: 1080 };
// old ids: the error-correction entry (?app=correct) became part of the in situ story; its links open
// that story at the fire.  energy: optical computation opened at its last part, the energy graph
export const ALIASES = { correct: { id: 'insitu', part: 'fire' }, energy: { id: 'compute', part: 'energy' } };
export const CHIP_AT = { x: 6.0, z: 0 };            // where the bench stands
const SLATE3 = { w: 9.6, d: 8.6 };                  // squarer than tab 2's

export class Apps {
  constructor({ renderer, scene, lang, reduced = false, quality = 'high', programs = {}, y = 0 }) {
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    this.words = k => k;
    this.hold = true;
    // (the light computer, programs/compute.js, left tab 3 and is off the page: still in the folder, and
    // devcheck still checks it)
    const catalog = [{ id: 'image', opts: compute.APP_LIGHT }, { id: 'voice', opts: compute.APP_LIGHT }, 'wdm', 'qsource']
      .map(e => (typeof e === 'string' ? { id: e } : e)).filter(e => programs[e.id]).map(e => ({ ...e, mod: programs[e.id] }));
    this.bench = new Bench({ renderer, scene, lang, reduced, quality, catalog, chipLabel: 'lbl.lightchip', slate: SLATE3 });
    this.bench.group.position.set(CHIP_AT.x, y + this.bench.S.h, CHIP_AT.z);
    this.scenes = {};
    APPS.forEach((a, i) => {
      const kit = makeKit({ lang, reduced, seed: SEEDS[a.id] ?? 777 + 101 * i });
      const g = new THREE.Group();
      g.visible = false;
      g.add(kit.group);
      this.group.add(g);
      const rec = this.scenes[a.id] = { id: a.id, kit, g, inst: null, labels: [] };
      const ctx = {
        THREE, kit, group: g, bench: this.bench, y, reduced, quality, lang, chipAt: CHIP_AT,
        label: (key, cls = 'callout') => this.addLabel(rec, key, cls),
        anchor: name => this.anchor(rec, name),
        words: () => this.words,
        hold: () => this.hold,
      };
      try { rec.inst = SCENES[a.id].create(ctx); }
      catch (e) { window.dispatchEvent(new ErrorEvent('error', { message: `application ${a.id}: ${e && (e.stack || e.message) || e}` })); rec.inst = null; }
    });
    this.selected = APPS[0].id;
    this.on = false;
    this.pending = null;            // an alias's part: { id, part }, asked of the scene once it is entered
  }
  get current() { return this.scenes[this.selected] && this.scenes[this.selected].inst; }
  get view() { const s = this.current; return (s && s.view) || { target: [-2, 2, 0.6], elev: 28, dist: 30, lift: -0.04 }; }
  get viewKey() { const v = this.view; return `${this.selected}:${v.serial || 0}`; }
  get caption() { const s = this.current; return (s && (typeof s.caption === 'function' ? s.caption() : s.caption)) || `app.${this.selected}.cap`; }
  // stepping through the story: its parts, and the one shown (or asked for: go() may pose a part a few frames later)
  get parts() { const s = this.current; return (s && s.parts) || []; }
  get partIndex() { const s = this.current; return s && s.parts ? s.parts.indexOf(s.step) : -1; }
  // Next: a part that has run its course goes on as the story would; one still running gives way to the next part at
  // once.  Back: the part before, from its start.  (false at the last / first part)
  next() {
    const s = this.current, i = this.partIndex;
    if (!s || i < 0 || i >= s.parts.length - 1) return false;
    if (s.waiting) s.goOn(); else s.go(s.parts[i + 1]);
    return true;
  }
  prev() {
    const s = this.current, i = this.partIndex;
    if (!s || i <= 0) return false;
    s.go(s.parts[i - 1]);
    return true;
  }

  addLabel(rec, key, cls) {
    const el = document.createElement('div');
    el.className = cls;
    el.innerHTML = '<span></span>';
    const obj = new CSS2DObject(el);
    obj.visible = false;
    this.group.add(obj);
    const l = { obj, el, key, on: true, set: k => { l.key = k; el.querySelector('span').textContent = this.words(k); },
      at: (x, y, z) => { obj.position.set(x, y, z); }, show: on => { l.on = on; obj.visible = on && this.on && this.selected === rec.id; } };
    rec.labels.push(l);
    return l;
  }
  // a program's anchor (chip-local, programs/*.js) in world coordinates; null until the bench has built it
  anchor(rec, name) {
    const prog = rec.inst && this.bench.programs.get(rec.inst.program);
    const a = prog && prog.inst && prog.inst.anchors && prog.inst.anchors[name];
    if (!a) return null;
    prog.kit.group.updateWorldMatrix(true, false);
    return prog.kit.group.localToWorld(new THREE.Vector3(...a));
  }
  show(id, on) {
    const rec = this.scenes[id];
    if (!rec) return;
    rec.g.visible = on;
    for (const l of rec.labels) l.obj.visible = on && l.on;
    if (rec.inst) { try { (on ? rec.inst.enter : rec.inst.leave)?.call(rec.inst); } catch (e) { window.dispatchEvent(new ErrorEvent('error', { message: `application ${id}: ${e && (e.stack || e.message) || e}` })); } }
    if (on) this.goPending();
  }
  // an alias's part, asked of its scene right after the scene's enter() (or at once, when it is already on)
  goPending() {
    const p = this.pending, rec = p && this.scenes[p.id];
    if (!rec || !this.on || p.id !== this.selected) return;
    this.pending = null;
    if (rec.inst && rec.inst.go) { try { rec.inst.go(p.part); } catch (e) { window.dispatchEvent(new ErrorEvent('error', { message: `application ${p.id}: ${e && (e.stack || e.message) || e}` })); } }
  }
  enter() {
    this.on = true;
    this.group.visible = true;
    this.bench.enter();
    this.show(this.selected, true);
    const s = this.current;
    if (s && s.program) this.bench.load(s.program);
  }
  leave() {
    this.on = false;
    this.group.visible = false;
    this.show(this.selected, false);
    this.bench.leave();
  }
  load(id) {
    // (an old id: the scene it lives in now, and the part to open it at - kept until the scene is entered, as
    // ?tab=apps&app=correct loads before the tab opens)
    const alias = ALIASES[id];
    if (alias) id = alias.id;
    if (!this.scenes[id]) return;
    this.pending = alias && alias.part ? { id, part: alias.part } : null;
    if (id === this.selected) { this.goPending(); return; }
    if (this.on) this.show(this.selected, false);
    this.selected = id;
    if (this.on) {
      this.show(id, true);
      const s = this.current;
      if (s && s.program) this.bench.load(s.program);
    }
  }
  setLabelText(words) {
    this.words = words;
    for (const rec of Object.values(this.scenes)) {
      for (const l of rec.labels) l.el.querySelector('span').textContent = words(l.key);
      rec.kit._redrawPlates();
    }
    this.bench.setLabelText(words);
  }
  allLabels() {
    const rec = this.scenes[this.selected];
    return [...(rec ? rec.labels : []), ...Object.values(this.bench.labels)];
  }
  update(dt, t, camera, pointScale, raw = dt) {
    if (!this.group.visible) return;
    const rec = this.scenes[this.selected];
    if (rec && rec.inst) {
      try { rec.inst.update?.(dt, t, camera, pointScale, raw); }
      catch (e) { window.dispatchEvent(new ErrorEvent('error', { message: `application ${rec.id}: ${e && (e.stack || e.message) || e}` })); rec.inst.update = null; }
      rec.kit._tick(dt, t, { dim: 1, plateRate: 1, camera, pointScale, platesOn: true });
    }
    this.bench.update(dt, t, camera, pointScale, raw);
  }
  renderMask(renderer) { this.bench.renderMask(renderer); }
}

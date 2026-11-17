// The kit: everything a device module needs to build and animate its chip.  One kit per device; it keeps the
// list of animated parts (light nets, beams, photons, plates) so that the table can tick them every frame, dim
// them when another chip is in focus, and redraw the plates after a language change.
//
// A device module calls kit functions inside its create(kit) and adds the returned objects to its own group
// (kit.lightNet, kit.beam, kit.photons, kit.plate add themselves to kit.group for you).
//
// Two styles.  'etched' (tab 1): the chip as made in a fab.  'written' (tab 2, programmable photonics): the same
// device module runs on the blank, light-programmable chip.  Its waveguiding structure (ridges, slabs, poled
// stripes, any custom opaque mesh) is moved to layer 1, where the main camera does not see it: the bench renders it
// from above into a mask, which becomes the green circuit on the chip and the pattern in the projector's light.
// Heaters become "phase patches" in that mask (brighter = more phase, written by the light too); metal (electrodes,
// pads, bond wires, carrier) and the chip body are hidden: the programmable chip has none of them.
import * as THREE from 'three';
import * as P from './paths.js';
import * as C from './colour.js';
import * as B from './build.js';
import { LightNet, Beam } from './light.js';
import { PulseNet } from './pulses.js';
import { Photons } from './photons.js';
import { Plate, text, axis, spectrum, curve, bars, trace, marker, thermo } from './plate.js';

// common words used on plates (devices may pass their own text instead)
const WORDS = {
  en: { in: 'IN', out: 'OUT', colour: 'colour', time: 'time', power: 'power', exit: 'exit', data: 'DATA IN' },
  ja: { in: '入力', out: '出力', colour: '色', time: '時間', power: '強さ', exit: '出口', data: 'データ入力' },
};
export const MASK_LAYER = 1;

export function makeKit({ lang = () => 'en', reduced = false, seed = 1, style = 'etched' } = {}) {
  const group = new THREE.Group();
  const nets = [], beams = [], pools = [], plates = [], tickers = [];
  const written = style === 'written';
  let rng = seed >>> 0 || 1;
  // role of each solid part: 'guide' (part of the circuit), 'phase' (heater as a written phase patch),
  // 'metal' and 'body' (not on the programmable chip)
  const tag = (obj, role) => {
    obj.userData.role = role;
    if (written) {
      if (role === 'guide' || role === 'phase') obj.traverse(o => o.layers.set(MASK_LAYER));
      else if (role === 'metal' || role === 'body' || role === 'deco') obj.visible = false;
    }
    return obj;
  };
  const noop = () => {};
  const kit = {
    THREE, P, colour: C, group,
    V: (x, y, z) => new THREE.Vector3(x, y, z),
    PLATFORMS: B.PLATFORMS, RIDGE: B.RIDGE,
    style, written,                             // devices may check kit.written (the programmable chip)
    reduced,                                    // true when the visitor asked for less motion
    lang,                                       // () -> 'en' | 'ja'
    word: k => (WORDS[lang()] || WORDS.en)[k] ?? k,
    // deterministic random numbers (0..1), so a chip looks the same every time
    rand() { rng ^= rng << 13; rng >>>= 0; rng ^= rng >> 17; rng ^= rng << 5; rng >>>= 0; return rng / 4294967296; },

    // solid parts
    chip(o) { const m = tag(B.chipBody(o), 'body'); group.add(m); kit.hit.push(m); kit.footprint = { w: o.w, d: o.d }; kit.bottom = Math.min(kit.bottom, -(o.h ?? 0.45)); return m; },
    carrier(o) { const m = tag(B.carrier(o), 'metal'); group.add(m); if (!written) kit.bottom = Math.min(kit.bottom, -(o.chipH ?? 0.45) - (o.h ?? 0.22)); return m; },
    ridges(paths, platform, o) { const m = tag(B.ridges(paths, platform, o), 'guide'); group.add(m); return m; },
    slab(points, platform, h) { const m = tag(B.slab(points, platform, h), 'guide'); group.add(m); return m; },
    boxes(items, material) { const m = tag(B.boxes(items, material), 'guide'); group.add(m); return m; },
    glows(items, o) { const r = B.glows(items, o); group.add(r.mesh); return r; },
    heaters(items, o) {
      if (!written) { const r = B.heaters(items, o); group.add(r.group); return r; }
      // a phase patch per heater: extra light written on that stretch of the arm, added on top of the guide in the
      // mask (brighter and wider = more phase)
      const w = (o && o.w) || 0.07;
      const its = items.map(it => (it.x0 !== undefined ? { ...it, w: (it.w ?? w) * 3.2, h: 0.02, y0: B.RIDGE.h + 0.004 } : { ...it, sz: (it.sz ?? w) * 3.2, h: 0.02, y0: B.RIDGE.h + 0.004 }));
      const m = B.boxes(its, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const col = new THREE.Color();
      for (let i = 0; i < items.length; i++) m.setColorAt(i, col.setRGB(0, 0, 0));
      tag(m, 'phase'); group.add(m);
      return { group: m, set(i, v) { const k = 0.6 * Math.max(0, Math.min(1, v)); m.setColorAt(i, col.setRGB(k, k, k)); m.instanceColor.needsUpdate = true; } };
    },
    electrodes(items, o) { const r = B.electrodes(items, o); tag(r.group, 'metal'); group.add(r.group); return written ? { group: r.group, set: noop } : r; },
    pads(points, size, y0) { const m = tag(B.pads(points, size, y0), 'metal'); group.add(m); return m; },
    bonds(pairs, o) { const m = tag(B.bonds(pairs, o), 'metal'); group.add(m); return m; },
    detectors(points, o) {
      const r = B.detectors(points, o);
      if (written) r.group.children.forEach((c, i) => { if (i < 2) tag(c, 'metal'); });   // the frame and the dark square; the glow stays
      group.add(r.group); return r;
    },
    poling(o) { const m = tag(B.poling(o), 'guide'); group.add(m); return m; },
    radialPoling(o) { const m = tag(B.radialPoling(o), 'guide'); group.add(m); return m; },
    mat: { std: B.std, gold: B.goldMat, heater: B.heaterMat, ridge: B.ridgeMat, dark: B.darkMat },

    // light
    // light as trains of pulses (tab 3): kit.pulses(o) -> { add, build, white, colours, net }
    pulses(o) { const n = new PulseNet(o); nets.push(n); return { net: n, add: (p, oo) => n.add(p, oo), build: () => { const m = n.build(); group.add(m); return m; }, white: (...a) => n.white(...a), colours: (...a) => n.colours(...a), mix: (...a) => n.mix(...a) }; },
    lightNet(o) { const n = new LightNet(o); nets.push(n); return { net: n, add: (p, oo) => n.add(p, oo), build: () => { const m = n.build(); group.add(m); return m; }, set: (...a) => n.set(...a), setFn: (...a) => n.setFn(...a), dash: (...a) => n.dash(...a), get flow() { return n.flow; }, set flow(v) { n.flow = v; if (n.uniforms) n.uniforms.uFlow.value = v; } }; },
    beam(o) { const b = new Beam(o); beams.push(b); group.add(b.object); return b; },
    photons(o) { const p = new Photons(o); pools.push(p); group.add(p.object); return p; },
    plate(o) { const p = new Plate({ ...o, words: k => kit.word(k) }); plates.push(p); group.add(p.object); return p; },
    draw: { text, axis, spectrum, curve, bars, trace, marker, thermo },

    // a function called every frame with (dt, t, dim) - for anything the device animates itself; dim (0.28..1) is
    // how bright the device should be (other chips dim while one is in focus): apply it to your own glowing materials
    onTick(f) { tickers.push(f); },

    hit: [],          // meshes used for picking (the chip body is added automatically)
    bottom: 0,        // lowest point of the device (the table rests it on the table top)
    footprint: null,  // { w, d } of the chip body

    // ---- used by the table and the bench, not by devices
    // platesOn: the plates are shown only while the chip is in focus (they fade in and out); in the overview they
    // would be too small to read and only crowd the table
    _tick(dt, t, { dim = 1, plateRate = 1, camera = null, pointScale = 600, platesOn = true } = {}) {
      for (const f of tickers) f(dt, t, dim);
      for (const n of nets) n.tick(t, dim);
      for (const b of beams) b.tick(t, dim);
      for (const p of pools) p.tick(dt, dim, pointScale);
      const k = Math.min(1, dt * 4);
      for (const p of plates) {
        p.fade = p.fade ?? (platesOn ? 1 : 0);
        p.fade += ((platesOn ? 1 : 0) - p.fade) * k;
        const shown = p.fade > 0.02;
        p.object.visible = shown;
        p.mesh.material.opacity = p.fade;
        p.mesh.material.depthWrite = p.fade > 0.98;
        if (!shown) continue;
        p.tick(dt, plateRate);
        if (camera) p.object.quaternion.copy(camera.quaternion);
      }
    },
    _redrawPlates() { for (const p of plates) p.draw(null); },
    // written style: classify what the device added by itself (custom meshes) - light stays, opaque meshes join
    // the circuit, opaque instanced decorations (arrows, markers) are hidden
    _finishWritten() {
      if (!written) return;
      const isLight = m => m.isPoints || m.isLine || [].concat(m.material || []).some(mt => mt.transparent || mt.isShaderMaterial || mt.blending === THREE.AdditiveBlending);
      group.traverse(o => {
        if (o.userData.role || !(o.isMesh || o.isPoints || o.isLine)) return;
        let p = o.parent, tagged = false;
        while (p && p !== group) { if (p.userData.role) { tagged = true; break; } p = p.parent; }
        if (tagged || isLight(o)) return;
        tag(o, o.isInstancedMesh ? 'deco' : 'guide');
      });
    },
    _plates: plates, _nets: nets, _beams: beams, _pools: pools,
  };
  return kit;
}

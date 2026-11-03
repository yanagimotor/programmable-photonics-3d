// The GPU of tab 3's "optical computation" (a GPU on one side, computing while producing lots of heat): a graphics
// processor on its board under a big heatsink and two fans.  The story opens on it: pictures go in at its left side
// and come out sharp at its right (apps/cards.js's belt), and as picture after picture streams through, it warms up
// from cold - the thermometer climbs and turns from blue to red, the fans speed up, the heatsink glows orange, hot air
// shimmers above it.  A picture, not a model.  (A GPU at full load is at 70-90 degrees - no glowing metal, smoke or
// embers.)
//
// Heat is all it shows of its energy (the GPU makes heat, the glass does not): no mains, no
// numbers; orange means heat on this page.  Its board is graphite, not green (green is the programming light), and no
// signals run along it (yellow-white dashes are the light's).
//
//   const gpu = createGPU(kit)          kit in the etched style; everything goes into kit.group (board on y = 0)
//   gpu.warm                            how hot it is, 0..1 - set by the story (it does not warm up by itself)
//   gpu.busy                            how hard it works now, 0..1 (the fans; set by the story)
//   gpu.reset()                         cold and idle again
//   gpu.thermoAt(x, y, z, s = 1)        where its thermometer stands (kit-local), and its size (scale)
//   gpu.update(dt, t, camera, pointScale)   every frame: fans, heat, rising air (turned to face the camera)
//   GPU_GATE                            where pictures go in and come out (kit-local): x = -+GPU_GATE.x, at GPU_GATE.y
//   drawThermo(g, box, level, rgb, W, H)   the thermometer's picture (the glasses' thermometer uses it too)
import * as THREE from 'three';

const BOARD = { w: 9.6, d: 7.4, h: 0.16 };          // about the size of the bench with our chip
const SINK = { w: 5.6, d: 5.0, base: 0.22, finH: 2.4, fins: 27 };
const FAN_Y = BOARD.h + SINK.base + SINK.finH + 0.1;
export const GPU_GATE = { x: SINK.w / 2, y: BOARD.h + SINK.base + SINK.finH / 2, d: SINK.d };
export const THERMO = { w: 1.5, h: 2.7 };            // the thermometers' plates (the GPU's and the glasses'): one size
export const COLD = [0.35, 0.68, 1.0], HOT = [1.0, 0.3, 0.12];

const PLUME_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// hot air: a faint, colourless shimmer of drifting, warped noise (added to the picture)
const PLUME_FS = /* glsl */ `
uniform float uTime, uHeat;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; } return v; }
void main() {
  vec2 p = vec2(vUv.x * 3.2, vUv.y * 3.6 - uTime * 0.85);
  float n = fbm(p + 1.6 * vec2(fbm(p * 0.8 + vec2(0.0, uTime * 0.3)), 0.0));
  float side = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
  float rise = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.25, 1.0, vUv.y));
  float wisps = smoothstep(0.42, 0.95, n) * (0.55 + 0.45 * sin(vUv.y * 26.0 - uTime * 5.0 + n * 9.0));
  float a = max(wisps, 0.0) * side * rise * uHeat;
  // (faint: brighter, with bloom, it read as smoke)
  vec3 col = vec3(1.0, 0.94, 0.88) * a * 0.1;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const css = (c, a = 1) => `rgba(${Math.round(255 * c[0])}, ${Math.round(255 * c[1])}, ${Math.round(255 * c[2])}, ${a})`;
// a thermometer: a thick glass tube and a big bulb, filled to level (0..1) in rgb, a few ticks, no numbers - big
// enough to be read at a glance across the scene (W, H: the plate's canvas)
export function drawThermo(g, box, level, rgb, W, H) {
  const tw = W * 0.27, r = tw * 0.92, cx = W * 0.46;
  const top = H * 0.09, cy = H * 0.9 - r, base = cy - r * 0.55;
  const pad = Math.max(4, tw * 0.2);
  g.save();
  g.fillStyle = 'rgba(255, 255, 255, 0.09)'; g.strokeStyle = 'rgba(214, 226, 238, 0.85)'; g.lineWidth = Math.max(3, tw * 0.08);
  g.beginPath(); g.roundRect(cx - tw / 2, top, tw, cy - top, tw / 2); g.fill(); g.stroke();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  const span = base - top - pad, h = span * Math.max(0, Math.min(1, level));
  g.fillStyle = css(rgb); g.shadowColor = css(rgb, 0.9); g.shadowBlur = tw * 0.35;
  g.beginPath(); g.arc(cx, cy, r - pad, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.roundRect(cx - tw / 2 + pad, base - h, tw - 2 * pad, h + r * 0.8, (tw - 2 * pad) / 2); g.fill();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(214, 226, 238, 0.6)'; g.lineWidth = Math.max(2, tw * 0.06);
  for (let i = 1; i <= 5; i++) { const y = base - span * i / 5.4; g.beginPath(); g.moveTo(cx + tw / 2 + tw * 0.15, y); g.lineTo(cx + tw / 2 + tw * 0.5, y); g.stroke(); }
  g.restore();
}

export function createGPU(kit) {
  const g = kit.group, rand = () => kit.rand();
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.2, ...o });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };

  // the board: graphite, parts around the cooler (no gold contacts at the front edge: seen from the front they were a
  // row of yellow dashes, the light's look)
  const board = add(new THREE.BoxGeometry(BOARD.w, BOARD.h, BOARD.d), std(0x1c2129, { roughness: 0.72 }), 0, BOARD.h / 2, 0);
  kit.hit.push(board);
  const m4 = new THREE.Matrix4();
  const parts = [];
  while (parts.length < 46) {
    const x = (rand() - 0.5) * (BOARD.w - 0.8), z = (rand() - 0.5) * (BOARD.d - 1.4);
    if (Math.abs(x) < SINK.w / 2 + 0.25 && Math.abs(z) < SINK.d / 2 + 0.25) continue;
    parts.push([x, z, 0.16 + 0.3 * rand(), 0.12 + 0.22 * rand(), 0.06 + 0.16 * rand()]);
  }
  const partMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std(0x2a2e35, { roughness: 0.5 }), parts.length);
  parts.forEach(([x, z, sx, sz, h], i) => partMesh.setMatrixAt(i, m4.compose(new THREE.Vector3(x, BOARD.h + h / 2, z), new THREE.Quaternion(), new THREE.Vector3(sx, h, sz))));
  partMesh.castShadow = true; g.add(partMesh);
  const mem = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.08, 0.86), std(0x0d0f12, { roughness: 0.35 }), 8);
  [-2.6, -0.87, 0.87, 2.6].forEach((x, i) => { mem.setMatrixAt(2 * i, m4.makeTranslation(x, BOARD.h + 0.04, -SINK.d / 2 - 0.55)); mem.setMatrixAt(2 * i + 1, m4.makeTranslation(x, BOARD.h + 0.04, SINK.d / 2 + 0.55)); });
  g.add(mem);

  // the heatsink: a dark metal base and aluminium fins, a warm tint low on the fins when hot (no copper: an orange-brown
  // base read as heat while the GPU was still cold).  Satin, not mirror-like: with no environment to mirror, shiny metal
  // showed only the dark room - the cold GPU, the subject of part 1, was a dark block on a dark table
  const heat = { value: 1 };
  const base = add(new THREE.BoxGeometry(SINK.w, SINK.base, SINK.d), std(0x50565e, { metalness: 0.3, roughness: 0.45, emissive: new THREE.Color(1, 0.3, 0.06), emissiveIntensity: 0 }), 0, BOARD.h + SINK.base / 2, 0);
  const finMat = std(0xaeb7c1, { metalness: 0.25, roughness: 0.42 });
  finMat.onBeforeCompile = sh => {
    sh.uniforms.uHeat = heat;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vHy;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHy = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHy;\nuniform float uHeat;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uHeat * vec3(1.0, 0.3, 0.06) * 0.3 * pow(clamp(0.55 - vHy / ${SINK.finH.toFixed(2)}, 0.0, 1.0), 1.4);`);
  };
  const fins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, SINK.finH, SINK.d - 0.2), finMat, SINK.fins);
  for (let i = 0; i < SINK.fins; i++) fins.setMatrixAt(i, m4.makeTranslation(-SINK.w / 2 + 0.1 + i * (SINK.w - 0.2) / (SINK.fins - 1), BOARD.h + SINK.base + SINK.finH / 2, 0));
  fins.castShadow = true; g.add(fins);
  const glow = kit.glows([{ x: 0, z: 0, sx: SINK.w, sz: SINK.d, h: 0, y0: BOARD.h }], { pad: 0.9, y: BOARD.h + 0.015, rgb: [1, 0.35, 0.08] });

  // two fans on top, spinning (faster as it works and heats up; a darker disc blurs the blades)
  const dark = std(0x16191d, { roughness: 0.45, metalness: 0.4 });
  const rotors = [], blurs = [];
  for (const x of [-1.36, 1.36]) {
    const ring = add(new THREE.TorusGeometry(1.22, 0.07, 8, 48), dark, x, FAN_Y, 0);
    ring.rotation.x = Math.PI / 2;
    const rotor = new THREE.Group(); rotor.position.set(x, FAN_Y, 0); g.add(rotor);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 24), std(0x2a2f36, { roughness: 0.4 }));
    rotor.add(hub);
    const bladeGeo = new THREE.BoxGeometry(0.86, 0.025, 0.34).translate(0.76, 0, 0);
    for (let k = 0; k < 7; k++) {
      const b = new THREE.Mesh(bladeGeo, dark);
      b.rotation.set(0.45, k * Math.PI * 2 / 7, 0, 'YXZ');
      rotor.add(b);
    }
    const blur = new THREE.Mesh(new THREE.CircleGeometry(1.16, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0c0f13, transparent: true, opacity: 0.3, depthWrite: false }));
    blur.position.set(x, FAN_Y + 0.02, 0); g.add(blur);
    rotors.push(rotor); blurs.push(blur);
  }

  // the power cable at the back
  add(new THREE.BoxGeometry(1.0, 0.42, 0.5), dark, 3.6, BOARD.h + 0.21, -BOARD.d / 2 + 0.45);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(3.6, 0.45, -BOARD.d / 2 + 0.3), new THREE.Vector3(3.9, 0.5, -BOARD.d / 2 - 1.0), new THREE.Vector3(4.6, 0.12, -BOARD.d / 2 - 3.5)]), 24, 0.13, 8), dark);
  g.add(cable);

  // hot air shimmering above the fans (a sheet turned to the camera; over the left fan and the middle, clear of the
  // thermometer over the right fan)
  const plumeU = { uTime: { value: 0 }, uHeat: { value: 1 } };
  const plume = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 6.0), new THREE.ShaderMaterial({
    uniforms: plumeU, vertexShader: PLUME_VS, fragmentShader: PLUME_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  plume.position.set(-0.9, FAN_Y + 2.9, 0);
  plume.renderOrder = 8;
  g.add(plume);

  // the thermometer: from cold (blue, low) to hot (red, high); redrawn when its level moves, at most 10 times a second
  const thermo = kit.plate({ w: THERMO.w, h: THERMO.h, at: [BOARD.w / 2 + 1.2, 2.9, -1.8], title: '', res: 256 });
  let level = 0.12, drawn = -1, since = 1;
  const rgb = [...COLD];
  thermo.draw((gg, box, W, H) => drawThermo(gg, box, level, rgb, W, H));

  let warm = 0, busy = 0;
  const cam = new THREE.Vector3();
  return {
    anchors: { gpu: [0, FAN_Y + 0.9, -SINK.d / 2] },
    thermo,
    reset() { warm = 0; busy = 0; },
    get warm() { return warm; },
    set warm(v) { warm = Math.max(0, Math.min(1, +v || 0)); },
    get busy() { return busy; },
    set busy(v) { busy = Math.max(0, Math.min(1, +v || 0)); },
    thermoAt(x, y, z, s = 1) { thermo.object.position.set(x, y, z); thermo.object.scale.setScalar(s); },
    update(dt, t, camera, pointScale = 600) {
      const slow = kit.reduced ? 0.25 : 1;
      const w = warm * warm * (3 - 2 * warm);
      const spin = 2 + 4 * busy + 10 * w;
      for (const r of rotors) r.rotation.y -= dt * spin * slow;
      for (const b of blurs) b.material.opacity = 0.3 + 0.45 * Math.min(1, Math.max(0, (spin * slow - 3) / 10));
      const h = w * (0.9 + 0.06 * Math.sin(t * 1.7) + 0.04 * Math.sin(t * 5.3));
      heat.value = h; plumeU.uHeat.value = h;
      base.material.emissiveIntensity = 0.3 * h;
      glow.set(0, 0.22 * h);
      plumeU.uTime.value = t * slow;
      // (the thermometer: its column follows the heat; blue turns red as it warms)
      level = 0.12 + 0.8 * w;
      const k = Math.min(1, Math.max(0, (w - 0.1) / 0.4)), e = k * k * (3 - 2 * k);
      for (let i = 0; i < 3; i++) rgb[i] = COLD[i] + (HOT[i] - COLD[i]) * e;
      since += dt;
      if (Math.abs(level - drawn) > 0.003 && since >= 0.1) { drawn = level; since = 0; thermo.draw(null); }
      if (camera) {
        cam.copy(camera.position); g.worldToLocal(cam);
        plume.rotation.y = Math.atan2(cam.x - plume.position.x, cam.z - plume.position.z);
      }
    },
  };
}

// Weather pictograms for tab 3's in situ story (apps/insitu.js): heat is a little fire
// (a stylised flame - layered tongues, red edge, orange, yellow core - flickering, with a soft warm glow), cold is the
// snow sign of a weather forecast (a rounded cloud, six-armed snowflakes falling from it in a narrow column), and a
// chip that has failed gets a red cross.  Each pictogram is a small group: put it where it belongs, scale it, and
// call tick() every frame (nothing is allocated per frame).
//
//   const fire = createFire({ height: 3.2, ground: 2.6 })   fire.group: the flame's base at the origin (ground: the
//                                                           radius of its warm glow on the floor, 0 for none)
//   fire.set(level)          0..1 (the flame grows and fades with it)
//   fire.tick(t, camera)     flicker; the flame faces the camera
//   const snow = createSnow({ fall: 5.2, rx: 1.5, rz: 1.0, count: 90, flake: 0.6, cloud: 4.4, rand })
//                            snow.group: the cloud's flat bottom at the origin, the flakes falling from it to y = -fall
//                            inside an ellipse (rx, rz); flake: a flake's size (world units at scale 1)
//   snow.set(level)          0..1 (the cloud fades in, the snowfall thickens)
//   snow.tick(t, camera, pointScale)
//   snow.scale(s)            the whole sign s times larger (the flakes too)
//   crossTexture()           a red cross (a chip that has failed), for a THREE.Sprite
import * as THREE from 'three';

const QUAD_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// The flame: tongues with a round bottom and a pointed, swaying tip (half-width ~ sqrt(v) (1 - v)^1.15 along the
// tongue's height v), drawn in flat colours with crisp edges like a pictogram: a red outer flame with two side
// tongues, an orange flame inside it, a yellow core and a pale centre.
const FLAME_FS = /* glsl */ `
uniform float uTime, uOn, uAsp, uGain;
uniform vec3 uRed, uOrange, uYellow, uWhite;
varying vec2 vUv;
float tongue(vec2 p, vec2 b, float h, float w, float lean, float ph) {
  float v = (p.y - b.y) / h;
  float sway = lean * v * v + 0.045 * v * v * sin(7.0 * v - 8.0 * uTime + ph) + 0.022 * v * v * v * sin(13.0 * v - 14.0 * uTime + 1.7 * ph);
  float vc = clamp(v, 0.0, 1.0);
  float wid = w * 2.75 * sqrt(vc) * pow(1.0 - vc, 1.15);
  return smoothstep(0.0, 0.012, wid - abs(p.x - b.x - sway));
}
void main() {
  vec2 p = vec2((vUv.x - 0.5) * uAsp, vUv.y);
  float t = uTime;
  float f1 = 1.0 + 0.035 * sin(11.0 * t) + 0.025 * sin(17.0 * t + 1.3);
  float f2 = 1.0 + 0.06 * sin(9.0 * t + 2.0) + 0.04 * sin(19.0 * t + 0.4);
  float f3 = 1.0 + 0.07 * sin(12.0 * t + 4.1) + 0.04 * sin(23.0 * t + 2.2);
  float f4 = 1.0 + 0.05 * sin(15.0 * t + 0.7);
  float o = max(tongue(p, vec2(0.0, 0.0), 0.93 * f1, 0.27, 0.0, 0.0),
            max(tongue(p, vec2(-0.115, 0.04), 0.58 * f2, 0.135, -0.12, 2.1),
                tongue(p, vec2(0.125, 0.03), 0.5 * f3, 0.12, 0.11, 4.2)));
  float m = max(tongue(p, vec2(0.004, 0.025), 0.71 * f2, 0.2, 0.0, 1.0),
                tongue(p, vec2(-0.07, 0.05), 0.4 * f3, 0.095, -0.08, 3.0));
  float c = tongue(p, vec2(0.008, 0.045), 0.45 * f4, 0.125, 0.0, 2.0);
  float w = tongue(p, vec2(0.008, 0.06), 0.2 * f1, 0.06, 0.0, 5.0);
  vec3 col = mix(uRed, uOrange, m);
  col = mix(col, uYellow, c);
  col = mix(col, uWhite, w);
  float a = max(o, max(m, c)) * uOn;
  if (a < 0.004) discard;
  gl_FragColor = vec4(col * uGain, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// The snowflakes: each falls from the cloud (f = 0) to the ground (f = 1) and starts again; it sways a little and
// turns slowly.  aSeed: phase, size, spin, the level at which it joins the snowfall.
const FLAKE_VS = /* glsl */ `
uniform float uTime, uScale, uSize, uFall, uOn, uSpeed;
attribute vec4 aSeed;
varying float vA;
varying float vRot;
void main() {
  float f = fract(aSeed.x + uTime * uSpeed * (0.8 + 0.4 * aSeed.y));
  vec3 p = position;
  p.x += 0.09 * sin(uTime * 1.7 + aSeed.x * 31.0);
  p.z += 0.07 * cos(uTime * 1.3 + aSeed.x * 17.0);
  p.y = -f * uFall;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uScale * uSize * (0.75 + 0.5 * aSeed.y) / -mv.z;
  gl_Position = projectionMatrix * mv;
  vA = smoothstep(0.0, 0.08, f) * (1.0 - smoothstep(0.92, 1.0, f)) * smoothstep(aSeed.w - 0.06, aSeed.w + 0.06, uOn);
  vRot = aSeed.z * uTime + aSeed.x * 6.2831853;
}`;
const FLAKE_FS = /* glsl */ `
uniform sampler2D uMap;
varying float vA;
varying float vRot;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float s = sin(vRot), k = cos(vRot);
  vec4 tx = texture2D(uMap, vec2(k * c.x - s * c.y, s * c.x + k * c.y) + 0.5);
  float a = tx.a * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(tx.rgb, a);
  #include <colorspace_fragment>
}`;

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const texOf = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function radialTex(stops, size = 128) {
  const [c, g] = canvas(size, size), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return texOf(c);
}

// ------------------------------------------------------------------------------------------------ the fire
let warmTex = null;
export function createFire({ height = 3.2, ground = 2.6 } = {}) {
  const group = new THREE.Group();
  group.visible = false;
  const asp = 0.74, W = height * asp;
  const U = {
    uTime: { value: 0 }, uOn: { value: 0 }, uAsp: { value: asp }, uGain: { value: 1.25 },
    uRed: { value: new THREE.Color('#e3341d') }, uOrange: { value: new THREE.Color('#ff8a1c') },
    uYellow: { value: new THREE.Color('#ffd83a') }, uWhite: { value: new THREE.Color('#fff4c4') },
  };
  const flame = new THREE.Mesh(new THREE.PlaneGeometry(W, height).translate(0, height / 2, 0),
    new THREE.ShaderMaterial({ uniforms: U, vertexShader: QUAD_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  flame.renderOrder = 3;
  group.add(flame);
  // a soft warm glow around the flame, and on the floor under it
  warmTex = warmTex || radialTex([[0, 'rgba(255,190,90,0.85)'], [0.35, 'rgba(255,130,40,0.38)'], [1, 'rgba(255,90,20,0)']]);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(height * 1.5, height * 1.5, 1); halo.position.y = height * 0.36; halo.renderOrder = 2;
  group.add(halo);
  let glow = null;
  if (ground > 0) {
    glow = new THREE.Mesh(new THREE.PlaneGeometry(2 * ground, 2 * ground).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: warmTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 0.02; glow.renderOrder = 2;
    group.add(glow);
  }
  let level = 0;
  return {
    group, flame, halo, glow,
    set(v) { level = Math.max(0, Math.min(1, v)); group.visible = level > 0.005; },
    get level() { return level; },
    order(n) { flame.renderOrder = n; halo.renderOrder = n - 1; if (glow) glow.renderOrder = n - 1; },
    tick(t, camera) {
      if (!group.visible) return;
      const k = level * level * (3 - 2 * level);
      U.uTime.value = t; U.uOn.value = Math.min(1, level * 1.6);
      flame.scale.set(0.45 + 0.55 * k, 0.3 + 0.7 * k, 1);          // a fire that starts small and grows
      if (camera) flame.quaternion.copy(camera.quaternion);
      const fl = 0.85 + 0.09 * Math.sin(t * 9.1) + 0.06 * Math.sin(t * 15.3 + 1.1);
      halo.material.opacity = 0.4 * k * fl;
      if (glow) glow.material.opacity = 0.6 * k * fl;
    },
  };
}

// ------------------------------------------------------------------------------------------------ the snow
let flakeTex = null, cloudTex = null;
function makeFlakeTex() {
  const S = 128, [c, g] = canvas(S, S), r = S * 0.4;
  const arms = (lw, col) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 2 + i * Math.PI / 3, dx = Math.cos(a), dy = Math.sin(a);
      g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + r * dx, S / 2 + r * dy);
      for (const [f, l] of [[0.5, 0.34], [0.78, 0.2]]) {
        const bx = S / 2 + r * f * dx, by = S / 2 + r * f * dy;
        for (const sg of [-1, 1]) { const b = a + sg * Math.PI / 3.2; g.moveTo(bx, by); g.lineTo(bx + r * l * Math.cos(b), by + r * l * Math.sin(b)); }
      }
    }
    g.stroke();
  };
  arms(15, 'rgba(46, 96, 168, 0.9)');           // a blue rim: the flake reads on the pale chip as well as in the dark
  arms(7, '#ffffff');
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(S / 2, S / 2, 6, 0, Math.PI * 2); g.fill();
  return texOf(c);
}
function makeCloudTex() {
  const W = 512, H = 300, [c, g] = canvas(W, H);
  const shape = () => {
    g.beginPath();
    g.roundRect(72, 148, 368, 104, 52);
    g.moveTo(233, 160); g.arc(165, 160, 68, 0, Math.PI * 2);
    g.moveTo(357, 120); g.arc(265, 120, 92, 0, Math.PI * 2);
    g.moveTo(422, 160); g.arc(360, 160, 62, 0, Math.PI * 2);
  };
  g.save(); g.shadowColor = 'rgba(150, 200, 255, 0.75)'; g.shadowBlur = 22;
  shape(); g.lineWidth = 14; g.strokeStyle = 'rgba(92, 132, 180, 0.95)'; g.stroke(); g.restore();
  const gr = g.createLinearGradient(0, 28, 0, 252);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#f2f6fb'); gr.addColorStop(1, '#c9d7e6');
  shape(); g.fillStyle = gr; g.fill('nonzero');
  return texOf(c);
}
export function createSnow({ fall = 5.2, rx = 1.5, rz = 1.0, count = 90, flake = 0.6, cloud = 4.4, speed = 0.36, rand = Math.random } = {}) {
  flakeTex = flakeTex || makeFlakeTex();
  cloudTex = cloudTex || makeCloudTex();
  const group = new THREE.Group();
  group.visible = false;
  const ch = cloud * 300 / 512;
  const cl = new THREE.Mesh(new THREE.PlaneGeometry(cloud, ch).translate(0, ch * 0.31, 0),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  cl.renderOrder = 11;
  group.add(cl);
  // the flakes: their places in the column (x, z); y is computed in the shader (falling)
  const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const a = 2 * Math.PI * rand(), r = Math.sqrt(rand());
    pos[3 * i] = rx * r * Math.cos(a); pos[3 * i + 1] = 0; pos[3 * i + 2] = rz * r * Math.sin(a);
    seed[4 * i] = rand(); seed[4 * i + 1] = rand(); seed[4 * i + 2] = (rand() < 0.5 ? -1 : 1) * (0.4 + 0.8 * rand()); seed[4 * i + 3] = 0.05 + 0.85 * rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const U = { uTime: { value: 0 }, uScale: { value: 600 }, uSize: { value: flake }, uFall: { value: fall }, uOn: { value: 0 }, uSpeed: { value: speed }, uMap: { value: flakeTex } };
  const flakes = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: FLAKE_VS, fragmentShader: FLAKE_FS, transparent: true, depthWrite: false }));
  flakes.frustumCulled = false; flakes.renderOrder = 10;
  group.add(flakes);
  let level = 0, size = 1;
  return {
    group, cloud: cl, flakes,
    set(v) { level = Math.max(0, Math.min(1, v)); group.visible = level > 0.005; },
    get level() { return level; },
    scale(s) { size = s; group.scale.setScalar(s); },
    order(n) { flakes.renderOrder = n; cl.renderOrder = n + 1; },
    tick(t, camera, pointScale) {
      if (!group.visible) return;
      const k = level * level * (3 - 2 * level);
      U.uTime.value = t; U.uOn.value = level; U.uScale.value = pointScale; U.uSize.value = flake * size;
      cl.material.opacity = Math.min(1, k * 1.4);
      cl.position.y = 0.05 * Math.sin(t * 1.1);
      if (camera) cl.quaternion.copy(camera.quaternion);
    },
  };
}

// ------------------------------------------------------------------------------------------------ a failed chip
let crossTex = null;
export function crossTexture() {
  if (crossTex) return crossTex;
  const S = 128, [c, g] = canvas(S, S);
  const x = () => { g.beginPath(); g.moveTo(32, 32); g.lineTo(96, 96); g.moveTo(96, 32); g.lineTo(32, 96); };
  g.lineCap = 'round';
  g.save(); g.shadowColor = 'rgba(255, 60, 40, 0.8)'; g.shadowBlur = 14;
  x(); g.lineWidth = 30; g.strokeStyle = 'rgba(38, 6, 6, 0.9)'; g.stroke(); g.restore();
  x(); g.lineWidth = 17; g.strokeStyle = '#ff3b2f'; g.stroke();
  crossTex = texOf(c);
  return crossTex;
}

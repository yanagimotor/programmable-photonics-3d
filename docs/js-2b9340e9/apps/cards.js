// The pictures around the light in tab 3's optical computation: the input card (a cartoon animal, blurred; a
// handwritten digit, sharp; or a spoken vowel), the screen where the light lands (the sharp animal) and the board of
// ten spots that takes the screen's place (the digits 0-9, one above the other: the spot the light lands on is the
// answer); and the GPU's belt - picture cards that go into the GPU blurred and come out sharp (parts 1-2).
// The board is a column, not a grid: seen from the front the light comes in from the left
// nearly level, and in a grid of two rows it crossed the other spots of a row on its way to its own, nearly as bright
// as the answer (the 7's light over the 5 and the 6).  In a column every spot has a height of its own, so the
// light converging on one crosses no other; and a column is the line that the spots become on the chip (the fold).
// Every digit is drawn from its 28 x 28 MNIST original (programs/data/mnist28.js), upsampled smoothly with a soft edge
// (no 7 x 7 blocks anywhere); the chip reads the same digit averaged to 7 x 7.  The animals are
// apps/animals.js's.  Built once: the canvases are drawn when a picture changes (a new digit, a new vowel, another lit
// spot), never per frame; an animal is a texture swap.
//
//   const cards = createCards(THREE, { lang, card: { at, face }, screen: { at, face }, board: { face, lift },
//                     byChip: { at, face, size, tilt }, size, zoo })   face: the azimuth (degrees, from +z towards +x)
//                     the picture faces; size: the card's side; board: the column's azimuth and how far its middle
//                     stands above the screen's; byChip.tilt: how far the card leans back by the chip (degrees, to
//                     face a camera that looks down); zoo: apps/animals.js's createAnimals (the animals' textures)
//   cards.group       add it to the scene (world frame)
//   cards.show(test)  the card's sharp digit: the MNIST test digit with that index (made once per digit)
//   cards.animal(i), cards.screenAnimal(i)   the animal (zoo index) on the card (blurred) and on the screen (sharp)
//   cards.sound(x, glyph)   the card as a sound: a speaker, the vowel's glyph and its 12 bands (redrawn on a change)
//   cards.look({ sharp, sound, back, animal })   the card's layers, 0..1 each: the sharp digit, the sound, the dark
//                     backing, the blurred animal
//   cards.cardPose(k) 0: on the axis, facing the light and the camera; 1: by the chip (byChip), facing the camera
//   cards.cardPoint(u, v, out, pose = 0, lift = 0)   world point of the card's face at pose 0 or 1 (u to the right,
//                     v up, in units of the card at pose 0; lift: out of its face)
//   cards.digitPoint(col, row, out, pose = 0, lift = 0)   world point of pixel (col, row) of the 28 x 28 digit
//   cards.lineUp(exits, size1)   the fold (part 5): where the board's ten spots land - exits[c], world points on the
//                     chip's output edge - and their size there (built once)
//   cards.fold(k, fade)   the spots flying from the board to the exits and lying down there (k 0 .. 1: the 0 first, the
//                     9 last; each keeps its size on the board until it lands), fade: their opacity (0 hides them)
//   cards.screen({ back, animal })   the screen: its dark backing, the sharp animal (0..1 each)
//   cards.board({ on, glow, lit, back })   the ten spots: their rings and names (on), each spot's glow (an array of
//                     ten, 0..1), the lit spot (drawn as the chip's answer cell: a pale warm disc, its digit dark; -1:
//                     none), the column's dark backing (back; default: as on)
//   cards.spotAt(c, out)   world point of spot c (on the board's face); cards.RING: a spot's radius (units)
//   cards.picPoint(u, v, out, where = 0, lift = 0)   world point (u, v: 0..1, v up) of the animal picture on the card
//                     at pose 0 (where 0) or on the screen (where 1); lift: out of its face
//   cards.beltCard(slot, animal, sharp, x, y, z, scale, opacity)   one of the belt's BELT cards, facing +z (the
//                     camera of parts 1-2): the animal blurred or sharp, at a world point; cards.beltHide() hides all
import { digitCanvas } from '../programs/image.js';
import { SIZE as N28 } from '../programs/data/mnist28.js';

const BG = 'rgba(9, 13, 19, 0.93)', EDGE = 'rgba(160, 185, 210, 0.28)';      // kit/plate.js's backing
const WARM = [1, 0.9, 0.72];                                                     // the light's warm white (APP_LIGHT)
const K = 8;                                                                     // canvas px per pixel of the original
const FILL = 0.92;                                                               // the digit's 28-px frame: this part of the card
// the board: spot c at local (0, PITCH * (c - 4.5)) of the column (units), its ring's radius RING; the column's
// backing BW x BH.  (Larger spots, and names that fill them - legible from a few metres away.)
const PITCH = 0.58, RING = 0.245, BW = 1.56, BH = 6.2;
// the spots' names: this part of the ring's radius (font size)
const NAME = 1.62;

const GLOW_VS = /* glsl */ `
varying vec2 vP;
void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// the spots' light: a bright core and a soft halo per spot, as bright as its glow (added to the board)
const GLOW_FS = /* glsl */ `
uniform float uGlow[10];
uniform vec2 uCell[10];
uniform vec3 uCol;
uniform float uOn;
varying vec2 vP;
void main() {
  float s = 0.0;
  for (int i = 0; i < 10; i++) {
    vec2 d = vP - uCell[i];
    float r2 = dot(d, d);
    s += uGlow[i] * (1.3 * exp(-r2 / 0.02) + 0.55 * exp(-r2 / 0.11));
  }
  gl_FragColor = vec4(uCol * s * uOn, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createCards(THREE, { lang = () => 'en', size = 2.6, card: cardAt = { at: [0, 2.9, 0], face: 50 },
  screen: scrAt = { at: [12, 2.9, 0], face: -20 }, board: brdAt = { face: -36, lift: 0.22 },
  byChip = { at: [-0.5, 1.4, 0.6], face: 10, size: 2.2, tilt: 0 }, zoo = null } = {}) {
  const group = new THREE.Group();
  const D = size * FILL;                       // the digit's 28-px frame on the card
  const PIC = size * 0.94;                     // an animal's picture card on the card, the screen and the belt
  const animalTex = (i, sharp) => (zoo && zoo.list[i] ? (sharp ? zoo.list[i].sharp : zoo.list[i].blur) : null);
  const texOf = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const backing = () => {
    const c = document.createElement('canvas'), n = 256, r = 20;
    c.width = c.height = n;
    const g = c.getContext('2d');
    g.beginPath(); g.roundRect(2, 2, n - 4, n - 4, r); g.fillStyle = BG; g.fill();
    g.lineWidth = 2; g.strokeStyle = EDGE; g.stroke();
    return texOf(c);
  };
  const BACK = backing();
  // a layer: a plane in front of the backing (z), drawn just under the bloom's threshold (crisp, as the plates)
  const layer = (parent, w, h, z, map, order, o = {}) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(0.9, 0.9, 0.9), ...o }));
    m.position.z = z; m.renderOrder = order; m.visible = false;
    parent.add(m);
    return m;
  };
  const fadeTo = (m, k) => { m.material.opacity = k; m.visible = k > 0.003; };
  const yaw = deg => THREE.MathUtils.degToRad(deg);

  // ---------------------------------------------------------------- the input card
  const card = new THREE.Group();
  card.position.set(...cardAt.at); card.rotation.order = 'YXZ'; card.rotation.y = yaw(cardAt.face);
  group.add(card);
  const cBack = layer(card, size, size, 0, BACK, 3, { depthWrite: true });
  cBack.visible = true; cBack.material.opacity = 1;
  // the sharp digit: the original upsampled (image.js's picture), one texture per digit, made when first shown
  const sharpTex = new Map();
  const sharpOf = test => { let t = sharpTex.get(test); if (!t) { t = texOf(digitCanvas(test, { k: K, rgb: WARM, lo: 0.2, hi: 0.6 })); sharpTex.set(test, t); } return t; };
  const cSharp = layer(card, D, D, 0.018, sharpOf(17), 3.2);
  // the animal, blurred (part 3: the picture whose light goes through the lens)
  const cAnimal = layer(card, PIC, PIC, 0.014, animalTex(0, false), 3.15);
  let cardAnimal = 0;
  // the sound (a vowel): a speaker, the glyph, 12 bands
  const sCanvas = document.createElement('canvas');
  sCanvas.width = sCanvas.height = 256;
  const sTex = texOf(sCanvas);
  const cSound = layer(card, size, size, 0.024, sTex, 3.3);
  let soundKey = '';
  const drawSound = (x, glyph) => {
    const key = glyph + '|' + Array.from(x || [], v => v.toFixed(3)).join(',');
    if (key === soundKey) return;
    soundKey = key;
    const g = sCanvas.getContext('2d'), n = 256, col = `rgb(${WARM.map(v => Math.round(255 * v)).join(', ')})`;
    g.clearRect(0, 0, n, n);
    // the speaker, its sound waves
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(26, 44); g.lineTo(42, 44); g.lineTo(62, 26); g.lineTo(62, 92); g.lineTo(42, 74); g.lineTo(26, 74); g.closePath(); g.fill();
    for (const r of [18, 32]) { g.beginPath(); g.arc(66, 59, r, -0.75, 0.75); g.stroke(); }
    g.font = '700 104px "Segoe UI", "Yu Gothic UI", "Meiryo", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(glyph, 170, 66);
    // the 12 bands, as bright as their values
    const vals = x || [], nb = Math.max(1, vals.length), x0 = 22, w = n - 44, gap = 4, bw = (w - gap * (nb - 1)) / nb, top = 132, bot = 232;
    let m = 1e-6;
    for (const v of vals) m = Math.max(m, v);
    for (let i = 0; i < vals.length; i++) {
      const h = Math.max(3, (bot - top) * vals[i] / m);
      g.fillStyle = `rgba(${WARM.map(v => Math.round(255 * v)).join(', ')}, ${(0.35 + 0.65 * vals[i] / m).toFixed(3)})`;
      g.beginPath(); g.roundRect(x0 + i * (bw + gap), bot - h, bw, h, 3); g.fill();
    }
    sTex.needsUpdate = true;
  };
  let shownTest = 17;
  const P0 = new THREE.Vector3(...cardAt.at), P1 = new THREE.Vector3(...byChip.at);
  const Y0 = yaw(cardAt.face), Y1 = yaw(byChip.face), S1 = byChip.size / size, T1 = -yaw(byChip.tilt || 0);
  const eul = new THREE.Euler(0, 0, 0, 'YXZ'), qua = new THREE.Quaternion();

  // ---------------------------------------------------------------- the screen, then the board
  const scr = new THREE.Group();
  scr.position.set(...scrAt.at); scr.rotation.y = yaw(scrAt.face);
  group.add(scr);
  const sBack = layer(scr, size, size, 0, BACK, 3, { depthWrite: true });
  sBack.visible = true; sBack.material.opacity = 1;
  // the animal, sharp: what the light through the lens draws on the screen (part 3)
  const sAnimal = layer(scr, PIC, PIC, 0.02, animalTex(0, true), 3.15);
  let scrAnimal = 0;
  // the board: a column of ten spots in a group of its own, where the screen stands (its middle a little higher),
  // turned a little more to the camera than the screen; its backing, the spots' light (one shader plane), then their
  // rings and names on top
  const brd = new THREE.Group();
  brd.position.set(scrAt.at[0], scrAt.at[1] + (brdAt.lift || 0), scrAt.at[2]); brd.rotation.y = yaw(brdAt.face);
  group.add(brd);
  const bBack = (() => {
    const c = document.createElement('canvas'), w = 128, h = Math.round(128 * BH / BW);
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 12); g.fillStyle = BG; g.fill();
    g.lineWidth = 2; g.strokeStyle = EDGE; g.stroke();
    return layer(brd, BW, BH, 0, texOf(c), 3);
  })();
  const cells = Array.from({ length: 10 }, (_, c) => new THREE.Vector2(0, PITCH * (c - 4.5)));
  const glowU = { uGlow: { value: new Float32Array(10) }, uCell: { value: cells }, uCol: { value: new THREE.Vector3(1.0, 0.86, 0.6) }, uOn: { value: 1 } };
  const sGlow = new THREE.Mesh(new THREE.PlaneGeometry(BW * 0.98, BH * 0.98), new THREE.ShaderMaterial({
    uniforms: glowU, vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sGlow.position.z = 0.024; sGlow.renderOrder = 3.4; sGlow.visible = false;
  brd.add(sGlow);
  const BPX = 168;                                     // the board's canvas, px per unit
  const bCanvas = document.createElement('canvas');
  bCanvas.width = Math.round(BW * BPX); bCanvas.height = Math.round(BH * BPX);
  const bTex = texOf(bCanvas);
  const sBoard = layer(brd, BW, BH, 0.03, bTex, 3.5);
  const FONT = px => `800 ${Math.round(px)}px "Segoe UI", "Yu Gothic UI", "Meiryo", system-ui, sans-serif`;
  let boardLit = -2;
  const drawBoard = lit => {
    if (lit === boardLit) return;
    boardLit = lit;
    const g = bCanvas.getContext('2d'), W = bCanvas.width, H = bCanvas.height;
    g.clearRect(0, 0, W, H);
    g.font = FONT(NAME * RING * BPX);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // (the lit spot as the chip's answer cell: a pale warm disc with its digit in dark grey - lit at a glance)
    const warm = `rgba(${WARM.map(v => Math.round(255 * v)).join(', ')}, 0.96)`;
    for (let c = 0; c < 10; c++) {
      const x = W / 2 + cells[c].x * BPX, y = H / 2 - cells[c].y * BPX, on = c === lit;
      g.beginPath(); g.arc(x, y, RING * BPX, 0, Math.PI * 2);
      if (on) { g.fillStyle = warm; g.fill(); }
      g.lineWidth = on ? 5 : 3.5; g.strokeStyle = on ? 'rgba(255, 246, 226, 0.95)' : 'rgba(170, 190, 212, 0.45)'; g.stroke();
      g.fillStyle = on ? 'rgba(24, 30, 38, 0.95)' : 'rgba(225, 233, 242, 0.9)';
      g.fillText(String(c), x, y + 0.012 * BPX);
    }
    bTex.needsUpdate = true;
  };
  drawBoard(-1);

  // ---------------------------------------------------------------- the fold: the spots fly to the chip's exits
  // (ten tokens drawn as the board draws an unlit spot - a faint ring, a light digit - so that they take over from the
  // board without a jump; built by lineUp, moved only while they fly.  Each keeps its size on the board until it is
  // about to land, then shrinks to its exit's)
  const CELL = 2.5 * RING;                             // a token's side (its dark disc just round the ring), in units
  const flyers = [];
  const qBoard = new THREE.Quaternion(), qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  let size1 = 0.3;
  const cellCanvas = c => {
    const cv = document.createElement('canvas'), n = 128, px = n / CELL;
    cv.width = cv.height = n;
    const g = cv.getContext('2d');
    // (a dark token behind it, the board's backing: on the board it does not show; on the chip it carries the digit)
    g.beginPath(); g.arc(n / 2, n / 2, n * 0.48, 0, Math.PI * 2); g.fillStyle = BG; g.fill();
    g.beginPath(); g.arc(n / 2, n / 2, RING * px, 0, Math.PI * 2);
    g.lineWidth = 3.5 * px / BPX; g.strokeStyle = 'rgba(170, 190, 212, 0.45)'; g.stroke();
    g.font = FONT(NAME * RING * px);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(225, 233, 242, 0.9)';
    g.fillText(String(c), n / 2, n / 2 + 0.012 * px);
    return cv;
  };
  const lineUp = (exits, s1 = 0.3) => {
    if (flyers.length) return;
    size1 = s1;
    brd.updateWorldMatrix(true, false);
    brd.getWorldQuaternion(qBoard);
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let c = 0; c < 10; c++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texOf(cellCanvas(c)), transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(0.9, 0.9, 0.9) }));
      m.renderOrder = 6.5; m.visible = false;
      const from = brd.localToWorld(new THREE.Vector3(cells[c].x, cells[c].y, 0.035));
      group.add(m);
      flyers.push({ m, from, to: exits[c].clone().setY(exits[c].y + 0.02) });
    }
  };
  const flyTo = (f, k, fade) => {
    const e = k * k * (3 - 2 * k), m = f.m;
    m.position.lerpVectors(f.from, f.to, e);
    m.position.y += 0.5 * Math.sin(Math.PI * e);
    m.quaternion.slerpQuaternions(qBoard, qFlat, e);
    m.scale.setScalar(CELL + (size1 - CELL) * smooth(0.72, 1, e));
    m.material.opacity = fade; m.visible = fade > 0.003;
  };

  // ---------------------------------------------------------------- the GPU's belt (parts 1-2)
  // (picture cards as the card is drawn - the dark backing, the animal's picture - posed by the story, which knows
  // where the GPU takes them in and gives them back; a pool of BELT, each showing one animal at a time)
  const BELT = 5;
  const belt = Array.from({ length: BELT }, () => {
    const g = new THREE.Group();
    g.visible = false;
    group.add(g);
    const back = layer(g, size, size, 0, BACK, 3), pic = layer(g, PIC, PIC, 0.012, animalTex(0, false), 3.15);
    back.visible = pic.visible = true;
    return { g, back, pic, animal: 0, sharp: false };
  });

  return {
    group,
    show(test) { if (test === shownTest) return; shownTest = test; cSharp.material.map = sharpOf(test); },
    get shown() { return shownTest; },
    animal(i) { const t = animalTex(i, false); if (t && i !== cardAnimal) { cardAnimal = i; cAnimal.material.map = t; } },
    screenAnimal(i) { const t = animalTex(i, true); if (t && i !== scrAnimal) { scrAnimal = i; sAnimal.material.map = t; } },
    sound(x, glyph) { drawSound(x, glyph); },
    look({ sharp, sound, back, animal } = {}) {
      if (sharp !== undefined) fadeTo(cSharp, sharp);
      if (sound !== undefined) fadeTo(cSound, sound);
      if (animal !== undefined) fadeTo(cAnimal, animal);
      if (back !== undefined) { fadeTo(cBack, back); cBack.material.depthWrite = back > 0.98; }
    },
    beltCard(slot, animal, sharp, x, y, z, scale, opacity) {
      const b = belt[slot];
      if (!b) return;
      if (!(opacity > 0.003) || !animalTex(animal, sharp)) { b.g.visible = false; return; }
      if (animal !== b.animal || sharp !== b.sharp) { b.animal = animal; b.sharp = sharp; b.pic.material.map = animalTex(animal, sharp); }
      b.g.visible = true;
      b.g.position.set(x, y, z); b.g.scale.setScalar(scale);
      b.back.material.opacity = opacity; b.pic.material.opacity = opacity;
    },
    beltHide() { for (const b of belt) b.g.visible = false; },
    BELT,
    cardPose(k) {
      const e = k * k * (3 - 2 * k);
      card.position.lerpVectors(P0, P1, e);
      card.rotation.y = Y0 + (Y1 - Y0) * e;
      card.rotation.x = T1 * e;
      card.scale.setScalar(1 + (S1 - 1) * e);
    },
    cardPoint(u, v, out = new THREE.Vector3(), pose = 0, lift = 0) {
      const P = pose ? P1 : P0, k = pose ? S1 : 1;
      qua.setFromEuler(eul.set(pose ? T1 : 0, pose ? Y1 : Y0, 0, 'YXZ'));
      return out.set(u, v, lift).applyQuaternion(qua).multiplyScalar(k).add(P);
    },
    digitPoint(col, row, out = new THREE.Vector3(), pose = 0, lift = 0) {
      return this.cardPoint(((col + 0.5) / N28 - 0.5) * D, (0.5 - (row + 0.5) / N28) * D, out, pose, lift);
    },
    lineUp,
    // (the 0 first, the 9 last: each starts a little after the one below it, as a column tipping over)
    fold(k, fade) {
      for (let c = 0; c < flyers.length; c++) flyTo(flyers[c], Math.max(0, Math.min(1, k * 1.6 - 0.6 * c / 9)), fade);
    },
    screen({ back, animal } = {}) {
      if (animal !== undefined) fadeTo(sAnimal, animal);
      if (back !== undefined) { fadeTo(sBack, back); sBack.material.depthWrite = back > 0.98; }
    },
    board({ on = 0, glow = null, lit = -1, back = on } = {}) {
      fadeTo(sBoard, on);
      fadeTo(bBack, back);
      drawBoard(lit);
      let any = 0;
      const G = glowU.uGlow.value;
      for (let c = 0; c < 10; c++) { G[c] = glow ? glow[c] : 0; any = Math.max(any, G[c]); }
      glowU.uOn.value = on;
      sGlow.visible = on > 0.003 && any > 0.003;
    },
    RING,
    spotAt(c, out = new THREE.Vector3()) { brd.updateWorldMatrix(true, false); return brd.localToWorld(out.set(cells[c].x, cells[c].y, 0.03)); },
    // (the board's facing direction, world)
    boardNormal(out = new THREE.Vector3()) { return out.set(Math.sin(brd.rotation.y), 0, Math.cos(brd.rotation.y)); },
    picPoint(u, v, out = new THREE.Vector3(), where = 0, lift = 0) {
      if (where) { scr.updateWorldMatrix(true, false); return scr.localToWorld(out.set((u - 0.5) * PIC, (v - 0.5) * PIC, 0.02 + lift)); }
      return this.cardPoint((u - 0.5) * PIC, (v - 0.5) * PIC, out, 0, lift);
    },
  };
}

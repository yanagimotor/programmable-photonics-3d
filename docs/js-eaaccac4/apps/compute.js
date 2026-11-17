// Tab 3, "Optical computation": how light can compute, in eight parts (about 76 s, and 2 s to start over by itself).
//   1. gpu (6 s): a GPU sharpens a picture: a blurry cartoon dog goes in at its left side, the GPU works, and the dog
//      comes out sharp at its right (cards.js's belt).  The GPU is cold.
//   2. stream (10 s): one animal after another streams through it, blurry in and sharp out, and it heats up as it goes:
//      its thermometer climbs and turns from blue to red, the fans speed up, the heatsink glows orange, hot air shimmers.
//   3. optics (11 s): "How can light compute?"  The camera moves to the optics side; the GPU stays at the side, hot.  The
//      same animals, blurred on a card, send their light through a pair of glasses, and the light draws each one sharp on
//      a screen.  The glasses' thermometer - the GPU's twin, the same size at the same height - stays cold.
//   4. super (11 s): the card's last animal gives way to a handwritten 7, sharp; the lens turns to face the light,
//      stretches and swells into a "super glass": a clear, gem-like sculpture full of bubbles, turned a little towards
//      the visitor (apps/gem.js); the screen gives way to a column of ten spots, 0 at the bottom to 9 at the top;
//      handwritten digits on the card (7, 4, 0) each send their light through the glass onto their own spot (a column:
//      the light to one spot crosses no other), its name beside it.  The hot GPU comes a little nearer, so that the
//      camera can too.
//   5. flat (9 s): the glass thins and spreads into a slab of the chip's own size and lands where the chip stands; the
//      chip is its last state - the glass gives way to it in place, and leaves its pattern on it (grey-blue).  The
//      column's spots fly to the chip's exits and lie down there as a line; the card, now by the chip, sends its 0's 28
//      rows one after another to the input edge, where they stand as one fine wavefront (apps/wave.js); the recorded
//      light of the 0 runs through the chip and lights exit 0.  The chip's top is darker in this scene than on tab 2
//      (bench setStage shade), so that the yellow-white light on it shows.
//   6. program (about 8.5 s): the projector comes down and green light writes the same pattern - a program - over the
//      grey-blue one (the scan line hands the chip over from the scene's copy of the slab to the bench's program); the
//      chip reads the 0 again, then the 7.  Once written, the green light and the pattern dim (bench setStage glow), so
//      that the yellow-white light that computes is the brightest thing on the chip.
//   7. rewrite (about 8.5 s): another program: the same chip recognises spoken vowels (あ, then お); the card becomes
//      a sound, the wavefront its 12 bands, the exits five.
//   8. energy (12 s): what it costs.  The projector rises away, the card goes, and the camera looks down on a graph
//      lying on the table (apps/energy.js): the energy of one calculation against its size N, log-log - the GPU's
//      0.2 pJ x N^2 and the light's 10 pJ x 2N, crossing at N = 100.  The hot GPU, made smaller, flies onto the graph
//      beside its steep line; the chip, smaller too, lands beside the light's line, still reading digits with its
//      light, and the glasses' cold thermometer stands by it.
//   Then the graph goes, the chip sinks, the projector rises away, the GPU cools and goes back, and the camera flies
//   back to part 1 (2 s).  From part 3 on the hot GPU stands at the side, named; for part 4 it comes a little nearer,
//   for parts 5-7 nearer still, so that the glass and the chip can be large with its hot heatsink and thermometer still
//   in frame (on a phone it stays out of frame, and so does its name).
//
// Real, and pictures:
//   Real: the digits are MNIST test digits 17, 6 and 3, drawn from their 28 x 28 originals; the chip reads each one
//   averaged to 7 x 7 (49 beams), and its light on the chip is the 2D Waveguide Studio's recorded light of those 49
//   beams through its trained pattern.  Which spot each digit lights in the glass, and how faintly the others glow:
//   the classifier's recorded shares (cubed, to sharpen the picture, so that the light is seen to focus on the
//   right spot).  The vowels' light is computed in the page through its trained pattern; the voices are made up, as
//   on tab 2.  The writing is the bench's, as on tab 2.  The exits, the answer and the pattern on the chip are the
//   programs' own.
//   Pictures: the animals are cartoons drawn for this page (apps/animals.js), blurred in the page.  The GPU and all it
//   does - the pictures going in and out, the sharpening, the heat (no numbers on either thermometer) - is a picture,
//   not a computation.  The glasses and their light are a metaphor - glasses as an image processor, a blurred picture
//   in and a sharp one out; a lens cannot unblur a picture that is already blurred (it refocuses light), the image is
//   drawn upright, the light ends on points of the picture's outlines (it draws the picture), and the eye's own lens is
//   not drawn.  The super glass: its shape, its bubbles, its veins (the chip's 2-D pattern stacked in layers) and its
//   light paths are drawn, not computed, and so are its sparkles and the light it mirrors (a studio drawn in its shader);
//   so is the column of spots (a picture of where the light lands - only which spot and how bright are the
//   classifier's).  Every morph and flight (lens -> glass -> slab -> chip, the projector coming down, the unroll and the
//   fold, the GPU coming nearer): a squashed glass would not keep its function; the chip's pattern was trained for the
//   chip.  The darker chip top and the dimmer green while a program runs are looks, so that the light shows.
//   The wavefront: the digit's 784 values read row by row (the digit becomes the shape of the input wavefront); the
//   chip itself reads the digit averaged to 7 x 7, its 49 beams' light the recorded one.  "The same chip": two
//   simulated slabs drawn at one size (in the paper, one device did both tasks).
//   Energy: parts 1-7 show no numbers, no mains, nothing about our chip (the GPU makes heat, the glass does not).  The
//   heat is shown by the two thermometers - the GPU's climbs, the glasses' stays cold - and named in two captions: the
//   GPU heats up, the lens does not.  Part 8 gives the numbers (apps/energy.js: real estimates, per calculation); the
//   GPU and the chip on its graph, their sizes and places, are a picture.
//
// The scene (apps/index.js): create(ctx) -> { program: null, view, caption, controls ("From the start"), act, value,
// state, go(part), enter, leave, update, parts, step, waiting, goOn }.  The story's clock runs on real time (raw).
// go(part) poses everything at once as at the start of that part (tests, screenshots, the buttons, Back); the story
// itself only moves forward.  Stepping by hand (auto-play off, ctx.hold()), each part waits at its end for goOn().
//   state: { part, t, glasses, sharp, gpu, busy, morph, flat, input, output, passed, cold, answer, bars, exits, stage,
//   program, phase, label, rest, bubbles, glassOn }
//   (parts 1-3: input - the animal going in or on the card ('dog', 'cat', ...), output - the animal last come out
//   sharp (the belt's, then the screen's), passed - how many have come out sharp in this part, sharp - how sharp the
//   output shows (0..1), cold - the glasses' thermometer's level while it is shown (else null); gpu - how hot the GPU
//   is, busy - how hard it works.  bars: the values of the wavefront on the chip - 784 for a digit, 12 for a vowel, 0
//   for none; exits: 10, 5 or 0; stage: the bench's { chip, projector, solid, shade }.  rest (part 4, while a spot is
//   lit): the brightest other spot's glow as a share of the lit one's; bubbles: the gem's bubbles are shown; glassOn:
//   the glass is shown)
import * as THREE from 'three';
import { makeKit } from '../kit/index.js';
import { lin } from '../kit/colour.js';
import { createGPU, GPU_GATE, THERMO, COLD, drawThermo } from './gpu.js';
import { createAnimals, ANIMALS } from './animals.js';
import { Rays } from './rays.js';
import { createGlass } from './gem.js';
import { createEnergy } from './energy.js';
import { createCards } from './cards.js';
import { createWave, createBands } from './wave.js';
import { slabOf, sample } from '../programs/image.js';
import { digit28, SIZE as N28 } from '../programs/data/mnist28.js';
import { KANA } from '../programs/voice.js';
import { SAMPLES as VOICES } from '../programs/data/voice.js';

// tab 3's look for image and voice recognition (apps/index.js gives it to both in the bench's catalog): the light
// computer's yellow-white light, a warm answer cell, no plates (the scene's card and answer replace them), no cycling
export const APP_LIGHT = { rgb: [1, 0.9, 0.72], pulse: 0.42, flow: 3.0, dash: 16, cell: [1, 0.9, 0.72], plates: false, auto: false };

const GPU_AT = { x: -10.0, z: 0.4 };
// part 4: the GPU a little nearer (it slides in while the camera flies to the super glass), so that view S can come
// closer - the glass and the column larger - with the hot GPU's right end and its thermometer still at the side
const GPU_MID = { x: -6.6, z: 0.4 };
// parts 5-7: the GPU nearer, at the chip's side (its hot heatsink's right end, its right fan and its thermometer over
// that fan in frame, the chip large); it goes there while the camera flies to the chip, and back in the loop
const GPU_NEAR = { x: -5.8, z: -1.0 };
// the stage of parts 3-4: the optical axis along +x at y AY, z 0; the card on it, the glasses (then the glass) in the
// middle, the screen (then the board) at the end.  The camera looks from the front (az 0); the card and the screen
// both turn 45 deg towards it and towards the lens, so that the light is seen leaving the one and landing on the
// other.  (A screen lit from behind hides where the light lands; one turned away from the lens is only grazed: the
// light skims across its other spots.)
const AY = 2.9, SIZE = 3.0;
const CARD = { at: [0, AY, 0], face: 45 };
const LENS_AT = [6, AY, 0];
const SCREEN = { at: [12, AY, 0], face: -45 };
// the card by the chip (parts 5-7): left of the chip's input edge, large, leaning back to face the camera above
const BYCHIP = { at: [-1.6, 1.9, 0.4], face: 0, size: 2.6, tilt: 40 };
// the column of spots (part 4): where the screen stood, its middle a little higher, turned a little more to the camera
const BOARD = { face: -36, lift: 0.36 };
// the chip's top in this scene (bench setStage shade): darker than tab 2's pale grey, so that the light on it shows;
// and the green light and the written pattern while a program runs (setStage glow): dimmer than while it is written, so
// that the yellow-white light that computes is the brightest thing on the chip (it was the faintest)
const SHADE = 0.2, RUN_GLOW = 0.38;
// the two thermometers, the same size at the same height (above the light): the glasses' right above them (world), the
// GPU's above its right side (GPU-local; parts 5-7: on its right fan, nearer the front and a little smaller - the GPU
// is then beside the chip, and the camera looks down: farther back or higher, the plate rose behind the page's
// subtitle)
const TH_Y = 5.7;
const COLD_AT = [6.0, TH_Y, -1.6], COLD_LEVEL = 0.12;
const TH_HI = [3.6, TH_Y, -2.0], TH_LO = [1.9, 3.95, 0.4], TH_LO_S = 0.82;
const TESTS = [17, 6, 3];                                          // the 7, the 4 and the 0 (MNIST test indices)
const VOWELS = ['a', 'i', 'u', 'e', 'o'];
const PARTS = ['gpu', 'stream', 'optics', 'super', 'flat', 'program', 'rewrite', 'energy'];
// seconds per part (program, rewrite: a limit - the bench's phases time them)
const DUR = { gpu: 6.0, stream: 10.0, optics: 11.0, super: 11.0, flat: 9.3, program: 14, rewrite: 14, energy: 12 };
// part 8: the graph on the table (its centre, its size), and where the GPU and the chip stand on it (plot units: u along
// log N, v along log energy; the GPU above its line's lower half, the chip under the light's line's end), how small they
// are made, and when: the GPU and the chip fly there (FLY8), the graph fades in (SHEET), its lines are drawn (LINES); the
// chip reads a new digit every READ s
const SHEET_AT = [1.0, 0, 0.6], SHEET_W = 26, SHEET_D = 17;
const E_GPU = { u: 0.25, v: 0.74, s: 0.6 }, E_CHIP = { u: 0.81, v: 0.24, s: 0.5 }, E_COLD = { u: 0.985, v: 0.27, y: 1.35, s: 0.75 };
const FLY8 = [0.3, 2.4], SHEET = [0.9, 1.7], LINES = [1.8, 4.6], READ = 3.4;
const LOOP = 2.0;                                                  // the reset before part 1 when the story starts over
const CAP = Object.fromEntries(PARTS.map(p => [p, 'app.compute.cap.' + p]));
// parts 1-2, the GPU's belt: picture cards at stations p along x (world) - -2 far left (faded), -1 the queue, 0 the
// input, 1 inside the GPU (hidden; the card shrinks and fades as it goes in at the heatsink's side), 2 the output,
// 3 gone on (faded).  Part 2 steps one station every STEP seconds, moving for the first MOVE of it.
const BELT = { y: 1.75, gap: 3.6, xIn: GPU_AT.x - 6.4, xOut: GPU_AT.x + 6.4, shrink: 0.4, near: 2.5 };
const STEP = 1.5, MOVE = 0.5;
// part 3: the animals through the lens - from t0, one every dt (the first n of the belt's); its light lands land
// seconds into its turn, and the screen shows it sharp from then until its turn ends (card and screen change together)
const OPT = { t0: 2.0, dt: 2.2, n: 4, land: 0.45 };
// part 4: when each digit's turn starts; its old light fades (FADE), the new light runs through (RUN), its spot glows
const T_DIGIT = [3.3, 5.8, 8.3], FADE = 0.3, RUN = 1.2, GLOW = 0.3;
// part 5, one thing at a time (seconds): the glass thins and spreads (FLAT), and gives way to the chip where it lies
// (SOLID); the column's backing goes (BACK); its spots fly to the exits (FOLD), where the chip's cells take over
// (CELLS); the card glides to its place by the chip (CARD); its rows peel off, one every STAG s, each flying FLY s
// (from UNROLL); the copy's light is asked for (T_LIGHT; it starts in some 0.3 s later, and its front reaches the
// exits 1.35 s after that)
const P5 = { flat: [0.2, 2.5], solid: [2.5, 3.1], back: [1.8, 2.6], fold: [2.8, 4.0], cells: [3.85, 4.2], card: [1.4, 2.6] };
const UNROLL = 3.9, STAG = 0.06, FLY = 0.45, T_LIGHT = 6.4;
// a new input on the chip (parts 5-7): its wavefront stands up (0.3 s), and sinks as its light goes in
const RISE = 0.3, SINK0 = 0.5, SINK1 = 1.0;
// stepping by hand (RY, 2026-11-13: a step left alone keeps explaining itself), a part that has run its course goes
// round: its clock runs on, and what it shows follows the part's window [a, b) of it, again and again - part 1 the
// next dog through the cold GPU, part 3 the animals through the lens, part 4 the digits 7, 4, 0, part 5 the chip
// reading the card's digits one after another (FLAT_GAP: the card turns to the next digit, the last one's light fades);
// part 2's stream simply goes on, and parts 6 and 7 go on reading a new digit or vowel (its answer shown IN_SHOW s)
const FLAT_GAP = 3.4, IN_SHOW = 2.2, IN_MAX = 10;
const WINDOW = { gpu: [0, 6.0], optics: [OPT.t0, OPT.t0 + OPT.n * OPT.dt], super: [T_DIGIT[0], 2 * T_DIGIT[2] - T_DIGIT[1]], flat: [FLAT_GAP, DUR.flat] };
// the cameras (table.fitView; az from +z towards +x).  G: the GPU in the middle, its belt at both sides; O: the card,
// the glasses and the screen, with the hot GPU's right part and its thermometer at the side; S: the super glass and
// the column of spots, with the hot GPU's near half and its thermometer at the side; C: the chip from above the front -
// its input edge (the wavefront) and its line of exits both seen along their length - with the card by it, the column
// at the right (the fold) and the hot GPU, near now, at the side; D: the same, the green light coming down from above
// (the projector at the frame's top)
const VIEWS = {
  G: { target: [-10, 3.2, 0.4], az: 0, elev: 16, dist: 30, box: [[-18.2, 0.2, -3.3], [-1.8, 7.1, 4.1]], dur: 2.0 },
  O: { target: [2.6, 3.6, 0], az: 0, elev: 15, dist: 26, box: [[-8.2, 0.4, -2.2], [13.3, 7.1, 2.2]], dur: 2.0 },
  S: { target: [4.3, 3.4, 0], az: 0, elev: 15, dist: 26, box: [[-4.8, 0.15, -2.0], [13.4, 7.1, 2.0]], dur: 2.0 },
  C: { target: [3.8, 1.2, 0], az: 0, elev: 56, dist: 24, box: [[-4.6, 0, -3.0], [12.7, 3.0, 3.0]], dur: 2.5 },
  D: { target: [3.8, 1.6, 0], az: 0, elev: 56, dist: 24, box: [[-4.6, 0, -3.0], [11.3, 3.6, 3.0]], dur: 1.5 },
  // E: the graph on the table from above the front, the GPU on it
  E: { target: [SHEET_AT[0], 0.8, SHEET_AT[2]], az: 0, elev: 58, dist: 30, box: [[SHEET_AT[0] - SHEET_W / 2, 0, SHEET_AT[2] - SHEET_D / 2], [SHEET_AT[0] + SHEET_W / 2, 1.0, SHEET_AT[2] + SHEET_D / 2]], dur: 2.5 },
};
// (a portrait screen - a phone - lets the box overflow its sides by 7.5 % each: there the GPU and its two nearest cards
// in parts 1-2; in parts 3-4 the optics keep the whole width, with the glasses' thermometer but without the GPU's strip
// (with it, the pictures were some 40 px wide), and a little margin on the right for the board in part 4; from part 5
// on the card, the chip and the column without the GPU, which stays back out of frame with its thermometer - a hot
// thermometer alone beside the chip would read as the chip's)
const TALL = {
  G: { ...VIEWS.G, box: [[-17.6, 0.2, -3.3], [-2.4, 7.1, 4.1]] },
  O: { ...VIEWS.O, target: [6.0, 3.6, 0], box: [[-1.8, 0.4, -2.2], [13.8, 7.1, 2.2]] },
  S: { ...VIEWS.S, target: [7.1, 3.4, 0], box: [[-1.3, 0.15, -2.0], [15.5, 7.1, 2.0]] },
  C: { ...VIEWS.C, target: [4.6, 1.2, 0], box: [[-2.9, 0, -3.0], [12.7, 3.0, 3.0]] },
  D: { ...VIEWS.D, target: [4.6, 1.6, 0], box: [[-2.9, 0, -3.0], [11.3, 3.6, 3.0]] },
  E: VIEWS.E,
};
const VIEW_OF = { gpu: 'G', stream: 'G', optics: 'O', super: 'S', flat: 'C', program: 'D', rewrite: 'D', energy: 'E' };

const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const sm = x => { const k = clamp01(x); return k * k * (3 - 2 * k); };
// a seeded random generator (the light's paths look the same every time)
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

// points spread over a digit's strokes (pixels of its 28 x 28 original at 0.5 or more): farthest-point sampling,
// from the stroke pixel nearest the ink's centre
function strokes(test, n) {
  const v = digit28(test), cand = [];
  if (!v) return cand;
  let sx = 0, sy = 0, sw = 0;
  for (let r = 0; r < N28; r++) for (let c = 0; c < N28; c++) { const a = v[r * N28 + c]; sx += a * c; sy += a * r; sw += a; if (a >= 0.5) cand.push([c, r, a]); }
  const cx = sx / sw, cy = sy / sw, d2 = (p, x, y) => (p[0] - x) ** 2 + (p[1] - y) ** 2;
  let first = 0;
  cand.forEach((p, i) => { if (d2(p, cx, cy) < d2(cand[first], cx, cy)) first = i; });
  const pick = [cand[first]], dmin = cand.map(p => d2(p, cand[first][0], cand[first][1]));
  while (pick.length < Math.min(n, cand.length)) {
    let b = 0;
    dmin.forEach((d, i) => { if (d > dmin[b]) b = i; });
    pick.push(cand[b]);
    cand.forEach((p, i) => { dmin[i] = Math.min(dmin[i], d2(p, cand[b][0], cand[b][1])); });
  }
  return pick;
}

// the copy's pattern on the chip before the green light writes it (parts 5-6): grey-blue on the pale chip, erased to
// the left of a world x (the bench's scan line, which writes the same pattern in green behind it)
const CUT_VS = /* glsl */ `
varying vec2 vUv;
varying float vX;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vX = w.x; gl_Position = projectionMatrix * viewMatrix * w; }`;
const CUT_FS = /* glsl */ `
uniform sampler2D uPat;
uniform vec3 uCol;
uniform float uAlpha, uCutX;
varying vec2 vUv;
varying float vX;
void main() {
  float a = uAlpha * smoothstep(0.05, 0.6, texture2D(uPat, vUv).r) * smoothstep(uCutX, uCutX + 0.06, vX);
  gl_FragColor = vec4(uCol, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function create(ctx) {
  const { kit, bench } = ctx;
  const reduced = !!ctx.reduced;
  const world = ctx.group;

  // ---------------------------------------------------------------- the GPU (its own kit: the scene's)
  const gpu = createGPU(kit);
  kit.group.position.set(GPU_AT.x, ctx.y, GPU_AT.z);

  // ---------------------------------------------------------------- the scene's own parts (world frame)
  // a second kit for the glasses' thermometer (a plate turned to the camera, ticked here): the GPU's twin, cold
  const sk = makeKit({ lang: ctx.lang, reduced, seed: 9901 });
  world.add(sk.group);
  const cold = sk.plate({ w: THERMO.w, h: THERMO.h, at: COLD_AT, title: '', res: 256 });
  cold.draw((g, box, W, H) => drawThermo(g, box, COLD_LEVEL, COLD, W, H));
  const zoo = createAnimals(THREE);
  const cards = createCards(THREE, { lang: ctx.lang, size: SIZE, card: CARD, screen: SCREEN, board: BOARD, byChip: BYCHIP, zoo });
  world.add(cards.group);

  // the chip's slab, copied into the scene (programs/image.js's slabOf: the same trained pattern and recorded light):
  // its pattern is the super glass's veins, and on the chip it is the pattern before the green light writes it, then
  // erased behind the bench's scan line.  Its holder takes the image program's place on the slate, and rises and sinks
  // with the chip.  (onSweep: its new light has started in - until then the old one stays dark)
  const prog = bench.make('image');
  const s = prog ? prog.s : 0.8158;
  const copyKit = makeKit({ lang: ctx.lang, reduced, seed: 9902 });
  let copySwept = 0;
  const copy = slabOf(copyKit, { chip: false, ...APP_LIGHT, onSweep: () => { copySwept++; } });
  const copyHolder = new THREE.Group();
  copyHolder.scale.setScalar(s);
  copyHolder.add(copyKit.group);
  copyHolder.visible = false;
  bench.chipGroup.add(copyHolder);
  const cutU = { uPat: { value: copy.patTex }, uCol: { value: new THREE.Vector3(...lin([0.36, 0.44, 0.55])) }, uAlpha: { value: 0 }, uCutX: { value: -1e9 } };
  copy.patMesh.material = new THREE.ShaderMaterial({ uniforms: cutU, vertexShader: CUT_VS, fragmentShader: CUT_FS, transparent: true, depthWrite: false });
  copy.patMesh.renderOrder = 2.5;
  copy.strip.visible = false;
  const copyPat = (a, cutX) => { cutU.uAlpha.value = 0.65 * a; cutU.uCutX.value = cutX; copy.patMesh.visible = a > 0.003; };
  const copyStrip = k => { copy.strip.material.opacity = k; copy.strip.visible = k > 0.003; };
  let copyLight = 0;
  // where the flattened glass lies: a slab of the chip's own size and thickness, in the chip's place (outline: the
  // slate), its veins landing on its top exactly over the slab's pattern (slabAt, slabHalf: the pattern's rectangle,
  // the thickness the slate's) - so that the chip can take its place as its last state (world)
  const bp = bench.group.position, pw = copy.patMesh.geometry.parameters, SH = bench.S.h / 2;
  const slabAt = [bp.x + s * copy.patMesh.position.x, bp.y - SH, bp.z], slabHalf = [s * pw.width / 2, SH, s * pw.height / 2];
  // (?gem=high, a dev switch: the glass keeps its high path on a slow computer - frames of it under a software renderer.
  // Its pattern once held a backspace character, not a word boundary, so the switch never took effect)
  const gemHigh = typeof location !== 'undefined' && /[?&]gem=high(&|$)/.test(location.search);
  const glass = createGlass(THREE, { at: LENS_AT, slabAt, slabHalf, patternTex: copy.patTex, quality: gemHigh ? 'high' : ctx.quality || 'high', dropH: 6.5,
    outline: { at: [bp.x, bp.y - SH, bp.z], half: [bench.S.w / 2, SH, bench.S.d / 2] }, reduced, selfLower: !gemHigh });
  world.add(glass.group);
  const gemBubbles = glass.group.getObjectByName('gem-bubbles');
  // (which path the glass draws - for the tests and the frames: the high one, or the cheap one it lowers itself to on a
  // slow computer)
  const gemOf = () => { const i = glass.info; return { lowered: glass.lowered, vertices: i.vertices, bubbles: i.drawn }; };
  // (a chip-local point of a program at scale k -> world, the chip in place)
  const onChip = (l, k, out) => out.set(bp.x + k * l[0], bp.y + 0.012, bp.z + k * l[2]);

  // the fold: the column's ten spots land on the copy's exits (its cells, beside the output edge), at the cells' pitch
  const exitPitch = s * Math.abs(copy.exitAt(1)[2] - copy.exitAt(0)[2]);
  cards.lineUp(Array.from({ length: 10 }, (_, c) => onChip(copy.exitAt(c), s, new THREE.Vector3())), exitPitch);
  // the wavefront: the digit's 784 values along the input edge, where the 49 beams start (beam 0 at the front): one
  // stretch per beam, standing out of the chip (-x) over the dark table
  const b0 = onChip(copy.beamAt(0), s, new THREE.Vector3()), b48 = onChip(copy.beamAt(48), s, new THREE.Vector3());
  const pitch = (b0.z - b48.z) / 48;
  const wave = createWave(THREE, {
    cardAt: (c, r, out) => cards.digitPoint(c, r, out, 1, 0.03),
    lineAt: (f, out) => out.set(b0.x, b0.y, b0.z + pitch / 2 - f * 49 * pitch),
    dir: [-1, 0, 0], amp: 1.5, width: 0.024, cardWidth: 0.08, stag: STAG, fly: FLY,
  });
  world.add(wave.mesh);
  // the vowel's 12 bands at the voice program's 12 beams
  const pv = bench.make('voice'), sv = pv ? pv.s : s;
  const bands = createBands(THREE, { at: (i, out) => (pv ? onChip(pv.inst.beamAt(i), sv, out) : out.set(b0.x, b0.y, 1.33 - 0.2415 * i)), dir: [-1, 0, 0], amp: 1.6, width: 0.14, stub: 0.08 });
  world.add(bands.mesh);
  // the first あ of the voice program after its reset (shown on the card at the switch, before its light starts in)
  const VOICE_A = (VOICES.find(v => v.label === 0) || { x: null }).x;

  // ---------------------------------------------------------------- the light
  const allRays = [];
  const rays = o => { const r = new Rays(THREE, o); r.reduced = reduced; allRays.push(r); return r; };
  const cardN = new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(CARD.face)), 0, Math.cos(THREE.MathUtils.degToRad(CARD.face)));
  const brdN = cards.boardNormal(new THREE.Vector3());
  // (the board's right, on its face: where the answer's tag stands beside the lit spot in part 4)
  const brdR = new THREE.Vector3(brdN.z, 0, -brdN.x), SPOT = new THREE.Vector3(), V0 = new THREE.Vector3();
  const arr = v => [v.x, v.y, v.z];
  // the glasses' light (part 3), one set per animal: from points on the card's picture, through the lens (the top of
  // the picture through the lens's top, its right side through the lens's side nearer the camera), to the same points
  // of the sharp picture on the screen - the light ends on the picture's outlines and features: it draws the picture
  const lightA = zoo.list.slice(0, OPT.n).map((a, i) => {
    const r = rays({ width: 0.075, spacing: 0.6, length: 0.13, speed: 2.4, samples: 24, base: 0.09 });
    a.pts.forEach(([u, v], k) => {
      const S = cards.picPoint(u, v, new THREE.Vector3(), 0, 0.03);
      const E = cards.picPoint(u, v, new THREE.Vector3(), 1, 0.02);
      const L = glass.lensToWorld(0, 0.62 * 0.62 * (2 * v - 1), 0.78 * 0.62 * (2 * u - 1), new THREE.Vector3());
      r.add([[arr(S), arr(L)], [arr(L), arr(E)]], { power: 0.45, seed: 7 * i + k });
    });
    world.add(r.build());
    // (dimmer where it leaves the card and where it lands: both pictures stay readable under the light)
    r.level = 0; r.head = 0.88; r.tail = 0.6;
    return r;
  });
  const lightsOff = () => { for (const r of lightA) r.level = 0; };

  // each digit's light in the glass: one ray from each of 10 points on its strokes to its own spot, along a path that
  // wanders inside the glass; one faint ray to each of the two runner-up spots.  The spots' glow: the recorded
  // shares, (share / top)^3 - the brightest spot by far, the others at most about a fifth.  (The spots stand in a
  // column, each at its own height: the light converging on one passes no other.)
  const SETS = TESTS.map((test, d) => {
    const sm0 = sample(test);
    const top = Math.max(...sm0.share), ans = sm0.share.indexOf(top);
    const glow = Float32Array.from(sm0.share, v => (v === top ? 1 : Math.pow(v / top, 3)));
    const ups = [...glow.keys()].filter(c => c !== ans).sort((a, b) => glow[b] - glow[a]).slice(0, 2);
    const R = rng(101 + 37 * d);
    const r = rays({ width: 0.07, spacing: 0.5, length: 0.12, speed: 2.2, samples: 48 });
    // (inside the glass the path is laid out in the sculpture's own frame - in at its left end, x -2.3, out at its
    // right end, +2.3 - and carried into its pose: the sculpture stands turned towards the visitor)
    const path = (col, row, c) => {
      const P = cards.digitPoint(col, row, new THREE.Vector3()).addScaledVector(cardN, 0.03);
      const Sp = cards.spotAt(c, new THREE.Vector3()).addScaledVector(brdN, 0.02);
      const E = [-2.3, 0.8 * (P.y - AY), 0.8 * P.z];
      // (the light leaves the glass as a wide cone round the axis and converges on the spot: focused)
      const ang = R() * Math.PI * 2, rad = 0.2 + 0.25 * R();
      const X = [2.3, 0.3 * (Sp.y - AY) + rad * Math.sin(ang), 0.3 * Sp.z + rad * Math.cos(ang)];
      const W = (x, y, z) => arr(glass.sculptToWorld(x, y, z, V0));
      const pts = [arr(P), W(...E)];
      for (const [x, f] of [[-1.1, 0.26], [0, 0.5], [1.1, 0.74]]) {
        const j = 0.45 * Math.sin(Math.PI * f);
        pts.push(W(x, E[1] + (X[1] - E[1]) * f + (R() - 0.5) * 2 * j, E[2] + (X[2] - E[2]) * f + (R() - 0.5) * 2 * j));
      }
      pts.push(W(...X), [Sp.x + (R() - 0.5) * 0.04, Sp.y + (R() - 0.5) * 0.04, Sp.z]);
      return [pts];
    };
    const pts = strokes(test, 10);
    pts.forEach(([col, row, v], i) => r.add(path(col, row, ans), { power: 0.6 + 0.25 * v, seed: i }));
    ups.forEach((c, j) => { const p = pts[(2 + 5 * j) % pts.length]; r.add(path(p[0], p[1], c), { power: 0.9 * glow[c], seed: 20 + j }); });
    const mesh = r.build();
    world.add(mesh);
    r.level = 0; r.tail = 0.8;
    return { test, name: String(sm0.label), ans, glow, rays: r };
  });
  const NAME = Object.fromEntries(SETS.map(S => [S.test, S.name]));
  kit.onTick((dt, t, dim) => { for (const r of allRays) r.tick(t, dim); wave.tick(t, dim); bands.tick(t, dim); glass.tick(t, dim); });

  // ---------------------------------------------------------------- labels
  // (the GPU's name: neutral while it is cold, in hot orange once it has warmed up - orange means heat on this page)
  const lGpu = ctx.label('lbl.gpu', 'callout');
  const lProg = ctx.label('lbl.prog.image', 'callout program');
  // (the answer beside its lit exit or spot, to the right: above it, it stood over the other exits of the line)
  const lAns = ctx.label('', 'callout light answer side');
  // (part 8: our chip's name on the graph, under it: above it stood on the light's line)
  const lChip = ctx.label('lbl.lightchip', 'callout light below');
  const labels = [lGpu, lProg, lAns, lChip];

  // ---------------------------------------------------------------- part 8: the energy graph on the table
  const graph = createEnergy(THREE, { lang: ctx.lang, at: [SHEET_AT[0], ctx.y + SHEET_AT[1], SHEET_AT[2]], w: SHEET_W, d: SHEET_D });
  world.add(graph.group);
  // where the GPU and the chip go on it (world), and where they are at home: the chip's bench, and its size
  const gpuOn = graph.plotAt(E_GPU.u, E_GPU.v, new THREE.Vector3());
  const chipOn = graph.plotAt(E_CHIP.u, E_CHIP.v, new THREE.Vector3()).setY(ctx.y + E_CHIP.s * bench.S.h);
  const coldOn = graph.plotAt(E_COLD.u, E_COLD.v, new THREE.Vector3()).setY(ctx.y + E_COLD.y);
  const benchHome = bench.group.position.clone();
  // (ek: how far the GPU and the chip are on the graph, 0..1 - set every frame; sheet: the graph's opacity, lines: how
  // far its lines are drawn)
  const e8 = { ek: 0, sheet: 0, lines: 0, cold: false };
  const placeBench = k => { bench.group.position.lerpVectors(benchHome, chipOn, k); bench.group.scale.setScalar(1 + (E_CHIP.s - 1) * k); };
  // (class toggles, only when they change: the answer to the right or above its point, a letter's weight, the GPU hot)
  const cls = { side: true, letter: false, hot: false };
  const ansClass = (side, letter) => {
    if (side !== cls.side) { cls.side = side; lAns.el.classList.toggle('side', side); }
    if (letter !== cls.letter) { cls.letter = letter; lAns.el.classList.toggle('letter', letter); }
  };

  // ---------------------------------------------------------------- the story
  // (per part: runT when the bench runs, lightT when the green light comes on, switchT when the voice program is on the
  // chip, askT the copy's sweep count when its light was asked for, waveT when the input on the chip last changed and
  // waveOf that input, cardT when the card last changed and cardOf its digit)
  const st = { part: 'gpu', t: 0, serial: 0, view: null, viewTall: null, loop: false, once: 0, runT: -1, lightT: -1, switchT: -1, askT: -1,
    waveT: -1, waveOf: null, cardT: -1, cardOf: 3, sharp: 0, glasses: 0, morph: 0, flat: 0,
    input: 'dog', output: null, passed: 0, answer: null, bars: 0, exits: 0, label: null, lang: '', vowel: '', doneT: -1,
    waiting: false, go: false, waitT: 0, loopN: 0, inT: -1, ansT: -1, inAsk: null, flatCyc: 0, flatTest: 3, flatPrev: 3, beltT: null, from: null };
  const glowNow = new Float32Array(10);
  const once = bit => { if (st.once & bit) return false; st.once |= bit; return true; };
  // stepping by hand (auto-play off: ctx.hold()), a part that has run its course stays (waiting) and goes round (see
  // WINDOW) until Next (goOn); with auto-play the story goes on by itself
  const onward = () => { if (!ctx.hold() || st.go) return true; if (!st.waiting) st.waitT = st.t; st.waiting = true; return false; };
  // what the part shows at its clock t: as it is, or - stepping by hand, past its window's end - round its window again
  // (st.loopN: how many times it has come round)
  const shown = (part, t) => {
    const w = ctx.hold() && WINDOW[part];
    if (!w || t < w[1]) { st.loopN = 0; return t; }
    const L = w[1] - w[0], u = t - w[1];
    st.loopN = 1 + Math.floor(u / L);
    return w[0] + (u % L);
  };
  // the story moves on (smoothly: the bench and the GPU go on from where they are).  (The answer and the label go with
  // the part they belong to: the next part sets its own on its first frame - a frame waited on "part 5 and answer 0"
  // and caught part 4's 0.)
  const advance = (part, loop = false) => {
    if (VIEW_OF[part] !== VIEW_OF[st.part] || loop) st.serial++;
    st.part = part; st.t = loop ? -LOOP : 0; st.loop = loop; st.once = 0; st.waiting = st.go = false;
    st.loopN = 0; st.inT = st.ansT = -1; st.inAsk = null; st.flatCyc = 0;
    st.runT = st.lightT = st.switchT = st.askT = st.waveT = st.cardT = st.doneT = -1; st.waveOf = null; st.stale = undefined; st.rest = null;
    st.answer = null; st.label = null; st.posed = false; st.readN = -1;
    if (part === 'gpu' && loop) { bench.load(null); for (const l of labels) l.show(false); }
  };
  // go: everything at once as at the start of that part (tests, screenshots, "From the start")
  const go = part => {
    if (!PARTS.includes(part)) return;
    advance(part);
    st.serial++;
    bench.hideLabels(true);
    for (const l of labels) l.show(false);
    copyHolder.visible = show.copy = false;
    // (the state as at the start of that part at once, before the next frame recomputes it: a test polling it must
    // not see the part before)
    st.answer = null; st.label = null; st.output = null; st.passed = 0; st.sharp = 0;
    // (posed: each part from the state the story leaves it in - not from where the part before went round to)
    st.from = null; st.beltT = null; st.flatTest = st.flatPrev = 3;
    st.input = part === 'gpu' || part === 'optics' ? 'dog' : part === 'stream' ? 'cat' : part === 'flat' || part === 'program' ? '0' : '7';
    st.bars = part === 'program' || part === 'rewrite' ? 784 : 0; st.exits = st.bars ? 10 : 0;
    if (PARTS.indexOf(part) <= PARTS.indexOf('flat')) {
      bench.load(null, { now: true });
      bench.setStage({ chip: 0, projector: 0, solid: 0, shade: SHADE, glow: RUN_GLOW });
    } else if (part === 'program') {
      bench.load(null, { now: true });
      bench.setStage({ chip: 1, projector: 0, solid: 1, shade: SHADE, glow: RUN_GLOW });
      copy.show(sample(3).x, { instant: true });
      st.cardOf = 3; wave.digit(3);
    } else if (part === 'rewrite') {
      bench.load(null, { now: true });
      bench.setStage({ chip: 1, projector: 1, solid: 1, shade: SHADE, glow: RUN_GLOW });
      st.cardOf = 17; wave.digit(17);
    } else if (part === 'energy') {
      bench.load(null, { now: true });
      bench.setStage({ chip: 1, projector: 0, solid: 1, shade: SHADE, glow: RUN_GLOW });
      st.posed = true;
    }
    gpu.warm = heatOf(part, 0); gpu.busy = 0;
  };

  // ---------------------------------------------------------------- what each part shows, from its clock
  // (computed every frame from st.part and st.t, so that go() needs to pose only the bench and the copy)
  const show = { cold: false, copy: false };
  const hideChipParts = () => { wave.level(0); bands.level(0); cards.fold(0, 0); copyPat(0, -1e9); copyStrip(0); };
  // how hot the GPU is: cold in part 1, heating up through part 2, hot from then on (it cools while the camera flies
  // back to part 1)
  const heatOf = (part, t) => (part === 'gpu' ? (st.loop && t < 0 ? sm(-t / LOOP) : 0) : part === 'stream' ? 0.02 + 0.98 * sm(ramp(t, 0.5, 9.5)) : 1);

  // ------------------------------------------------ parts 1-2: the GPU's belt
  const GX = GPU_AT.x, GZ = GPU_AT.z;
  // (a station -> x; the card shrinks towards the GPU's sides and fades as it goes in (out: grows and appears))
  const beltX = p => (p <= 0 ? BELT.xIn + p * BELT.gap : p <= 1 ? BELT.xIn + (GX - BELT.xIn) * p : p <= 2 ? GX + (BELT.xOut - GX) * (p - 1) : BELT.xOut + (p - 2) * BELT.gap);
  const beltPose = (slot, j, p, fade) => {
    const x = beltX(p), d = Math.abs(x - GX) - GPU_GATE.x;
    const scale = d >= BELT.near ? 1 : d <= 0 ? BELT.shrink : BELT.shrink + (1 - BELT.shrink) * sm(d / BELT.near);
    let o = sm((d + 0.2) / 1.0) * fade;
    if (p < -1.3) o *= clamp01((p + 2) / 0.7);
    if (p > 2) o *= 1 - clamp01((p - 2) / 0.6);
    cards.beltCard(slot, j, p >= 1, x, BELT.y, GZ, scale, o);
  };
  // part 1: the dog - in from the left, a moment at the input, into the GPU, a moment inside, out sharp, and it stays
  const dogP = t => (t < 1.0 ? -1.6 + 1.6 * (1 - (1 - t) * (1 - t)) : t < 2.0 ? 0 : t < 2.8 ? sm((t - 2.0) / 0.8) : t < 3.6 ? 1 : t < 4.4 ? 1 + sm((t - 3.6) / 0.8) : 2);
  // part 2: every animal one station on every STEP seconds (the dog waits at the output until the cat comes out)
  const steps = t => { const n = Math.floor(t / STEP); return n + sm((t - n * STEP) / (MOVE * STEP)); };
  // (poses the belt's cards; what is at the input and at the output goes into beltNow, reused every frame)
  const beltNow = { inp: null, out: null, passed: 0, sharp: 0 };
  const belt = (part, t, fade) => {
    cards.beltHide();
    const b = beltNow;
    b.inp = null; b.out = null; b.passed = 0; b.sharp = 0;
    const S = part === 'gpu' ? 0 : steps(t);
    // (stepping by hand the stream never runs dry: the eight animals come round again, one after another)
    const endless = part === 'stream' && ctx.hold();
    const j0 = endless ? Math.max(0, Math.floor(S) - 3) : 0, j1 = endless ? Math.floor(S) + 2 : ANIMALS.length - 1;
    for (let j = j0; j <= j1; j++) {
      const p = part === 'gpu' ? (j === 0 ? dogP(t) : -9) : j === 0 ? Math.max(2, S) : S - j;
      const a = j % ANIMALS.length;
      if (p >= 1.75) { b.passed++; if (p < 2.6) { b.out = ANIMALS[a]; if (p <= 2.3) b.sharp = 1; } }
      if (p >= -0.3 && p < 0.75) b.inp = ANIMALS[a];
      if (p > -2 && p < 2.6) beltPose(j % cards.BELT, a, p, fade);
    }
    // (part 1 come round: the dog that came out sharp goes on and fades while the next blurry one comes in)
    if (part === 'gpu' && st.loopN > 0 && t < 1.0) beltPose(1, 0, 2 + 0.7 * sm(t / 0.9), fade);
    return b;
  };
  const hideOptics = () => {
    glass.fade(0); glass.drop(0); glass.specs(1); glass.shape(0, 0); glass.veins(0);
    lightsOff();
    for (const q of SETS) q.rays.level = 0;
    cards.cardPose(0);
    cards.look({ sharp: 0, sound: 0, animal: 0, back: 0 });
    cards.screen({ back: 0, animal: 0 });
    cards.board({ on: 0, glow: null, lit: -1 });
  };
  const gpuParts = (part, t) => {
    hideOptics();
    const b = belt(part, t, 1);
    if (part === 'stream') st.beltT = t;                 // (where the stream stood, for part 3 to fade it from there)
    st.input = b.inp; st.output = b.out; st.passed = b.passed; st.sharp = b.sharp;
    st.glasses = 0; st.morph = 0; st.flat = 0; st.answer = null; st.bars = 0; st.exits = 0;
    show.cold = false; show.copy = false;
    hideChipParts();
  };

  // ------------------------------------------------ part 3: the same animals through the lens
  const fromOpt = { k: OPT.n - 1, a: 1, sa: 1, light: 1 };
  const optics = t => {
    // (stepping by hand the part goes round: the last animal's turn ends as the others' do, and the first one's begins
    // as the others' do; the stream fades from where it stood)
    const held = ctx.hold(), round = st.loopN > 0;
    belt('stream', held && st.beltT != null ? st.beltT : DUR.stream, 1 - ramp(t, 0, 0.5));
    // the stage comes in while the camera flies over: the card and the screen, the glasses coming down
    const stage = sm(ramp(t, 0.5, 1.2)), drop = ramp(t, 0.6, 1.6);
    glass.fade(sm(ramp(t, 0.6, 1.0))); glass.drop(drop); glass.specs(1); glass.shape(0, 0); glass.veins(0);
    st.glasses = drop; st.morph = 0; st.flat = 0;
    for (const q of SETS) q.rays.level = 0;
    // the animal of this turn: blurred on the card from the turn's start; its light runs through the lens (the last
    // one's stays on: part 4 fades it) and draws it sharp on the screen; card, light and screen go out together at the
    // turn's end, so that the two pictures always show the same animal
    const k = Math.max(0, Math.min(OPT.n - 1, Math.floor((t - OPT.t0) / OPT.dt)));
    const tk = t - (OPT.t0 + k * OPT.dt), last = k === OPT.n - 1 && !held;
    const end = last ? 1 : 1 - ramp(tk, OPT.dt - 0.15, OPT.dt);
    const a = (k === 0 && !round ? sm(ramp(t, 0.8, 1.3)) : ramp(tk, 0, 0.15)) * end;
    cards.cardPose(0);
    cards.animal(k);
    cards.look({ sharp: 0, sound: 0, animal: a, back: stage });
    for (let i = 0; i < OPT.n; i++) {
      const r = lightA[i], s0 = OPT.t0 + i * OPT.dt;
      r.level = t < s0 ? 0 : i === OPT.n - 1 && !held ? 1 : 1 - ramp(t, s0 + OPT.dt - 0.15, s0 + OPT.dt);
      r.front = sm(ramp(t, s0 + 0.05, s0 + 0.55));
    }
    const sa = t < OPT.t0 ? 0 : sm(ramp(tk, OPT.land, OPT.land + 0.25)) * end;
    // (what part 4 takes over: this animal on the card and the screen, and its light, as they are now)
    fromOpt.k = k; fromOpt.a = a; fromOpt.sa = sa; fromOpt.light = lightA[k].level;
    st.from = fromOpt;
    cards.screenAnimal(k);
    cards.screen({ back: stage, animal: sa });
    cards.board({ on: 0, glow: null, lit: -1 });
    const landed = t >= OPT.t0 + OPT.land;
    st.input = ANIMALS[k]; st.output = landed ? ANIMALS[tk >= OPT.land ? k : k - 1] : null;
    st.passed = landed ? (tk >= OPT.land ? k + 1 : k) : 0; st.sharp = sa;
    st.answer = null; st.bars = 0; st.exits = 0;
    show.cold = t >= 1.6; show.copy = false;
    hideChipParts();
  };

  // ------------------------------------------------ part 4: the super glass reads digits
  const superPart = t => {
    cards.beltHide();
    // the glasses: the frame goes, the lens grows into the block
    const morph = sm(ramp(t, 0.8, 3.3));
    glass.drop(1); glass.specs(1 - sm(ramp(t, 0.8, 1.4)));
    glass.shape(morph, 0); glass.fade(1);
    glass.veins(sm(ramp(t, 2.3, 3.3)));
    st.glasses = 1; st.morph = morph; st.flat = 0;
    // the hand-over: the last animal's light fades, the card turns from that animal to the 7 (sharp: a handwritten
    // digit for the super glass to read), the screen's animal fades, and the screen gives way to the column of spots
    // (from the animal part 3 showed when it ended - its last one, or the one it had come round to)
    const fr = st.from || fromOpt, k0 = st.from ? fr.k : OPT.n - 1;
    lightsOff(); lightA[k0].level = (st.from ? fr.light : 1) * (1 - ramp(t, 0, 0.4));
    const out = 1 - sm(ramp(t, 0.4, 0.8)), col = sm(ramp(t, 2.0, 3.0));
    cards.screenAnimal(k0);
    cards.screen({ back: 1 - col, animal: out * (st.from ? fr.sa : 1) });
    st.sharp = 1;
    // the card: the digits, sharp (each digit's turn: a quick fade to the next).  Come round (stepping by hand), the
    // 0 gives way to the 7 as each digit to the next
    const round = st.loopN > 0, LAST = TESTS.length - 1;
    cards.cardPose(0);
    let cardSharp = sm(ramp(t, 0.4, 0.8)), test = round && t < T_DIGIT[0] + FADE / 2 ? TESTS[LAST] : TESTS[0];
    for (let d = round ? 0 : 1; d < TESTS.length; d++) {
      if (t >= T_DIGIT[d] && t < T_DIGIT[d] + FADE) cardSharp *= Math.abs(1 - 2 * ramp(t, T_DIGIT[d], T_DIGIT[d] + FADE));
      if (t >= T_DIGIT[d] + FADE / 2) test = TESTS[d];
    }
    cards.show(test);
    cards.animal(k0);
    cards.look({ animal: out * (st.from ? fr.a : 1), sharp: cardSharp, sound: 0, back: 1 });
    st.input = NAME[test]; st.output = null; st.passed = 0;
    st.flatTest = st.flatPrev = test;                  // (the digit part 5 starts from)
    // each digit's light, and the spots
    glowNow.fill(0);
    let lit = -1;
    for (let d = 0; d < SETS.length; d++) {
      const S = SETS[d], r = S.rays;
      const t0 = T_DIGIT[d] + (d || round ? FADE : 0), next = T_DIGIT[d + 1] ?? Infinity;
      let level = t < T_DIGIT[d] ? 0 : t < next ? 1 : 1 - ramp(t, next, next + FADE);
      let front = sm(ramp(t, t0, t0 + RUN));
      let g = sm(ramp(t, t0 + RUN - 0.1, t0 + RUN - 0.1 + GLOW)) * level;
      // (come round: the 0's light, on since the round before, fades as the 7's turn begins)
      if (round && d === LAST && t < T_DIGIT[0] + FADE) { level = 1 - ramp(t, T_DIGIT[0], T_DIGIT[0] + FADE); front = 1; g = level; }
      r.level = level; r.front = front;
      if (g > 0) for (let c = 0; c < 10; c++) glowNow[c] += g * S.glow[c];
      if (g > 0.5 && t < next) lit = S.ans;
    }
    cards.board({ on: col, glow: glowNow, lit });
    st.answer = lit >= 0 ? String(lit) : null;
    // (the answer's name beside the lit spot, to its right, as by the chip's lit exit in parts 5-7: which spot it is,
    // at a glance and from afar)
    if (lit >= 0) {
      cards.spotAt(lit, SPOT).addScaledVector(brdR, cards.RING + 0.06);
      if (lAns.key !== DIGIT[lit]) lAns.set(DIGIT[lit]);
      ansClass(true, false);
      lAns.at(SPOT.x, SPOT.y, SPOT.z);
      lAns.show(true);
    } else lAns.show(false);
    // (for the tests: the brightest other spot, as a share of the lit one's glow)
    let rest = 0;
    if (lit >= 0) for (let c = 0; c < 10; c++) if (c !== lit) rest = Math.max(rest, glowNow[c] / Math.max(1e-6, glowNow[lit]));
    st.rest = lit >= 0 ? rest : null;
    st.bars = 0; st.exits = 0;
    show.cold = true;
    show.copy = false;
    hideChipParts();
  };

  // the answer beside its exit, at the cell's outer end (chip-local exit of a program's slab, in that program's holder
  // at scale k; the cells are 0.92 long across the edge); on a phone, where the chip fills the width, above the cell
  // (letter: a vowel - in a lighter weight, so that its "o" keeps its hole; in English in quotes, as on tab 2, so that it
  // is not read as a zero or a dot)
  const ansAt = [0, 0, 0];
  const answerAt = (glyph, exit, k, letter = false) => {
    if (glyph == null) { lAns.show(false); return; }
    if (lAns.key !== glyph) lAns.set(glyph);
    const tall = innerWidth < innerHeight;
    ansClass(!tall, letter);
    lAns.at(bp.x + k * (exit[0] + (tall ? 0 : 0.5)), bp.y + (tall ? 0.35 : 0.03), bp.z + k * exit[2]);
    lAns.show(true);
  };
  // the wavefront of the input on the chip: it stands up when that input arrives, and sinks as its light goes in
  const waveHeight = t => (st.waveT < 0 ? 0 : sm(ramp(t, st.waveT, st.waveT + RISE)) * (1 - sm(ramp(t, st.waveT + SINK0, st.waveT + SINK1))));
  // the card shows the input on the chip: a quick fade in when it changes
  const cardLook = (t, test) => {
    if (test !== st.cardOf) { st.cardOf = test; st.cardT = t; }
    cards.show(test);
    return st.cardT < 0 ? 1 : 0.2 + 0.8 * sm(ramp(t, st.cardT, st.cardT + 0.3));
  };

  // part 5: the glass thins and spreads into a slab of the chip's size and lands in the chip's place; there it gives
  // way to the chip (the chip fades in where the glass fades out: one object) and leaves its pattern on it
  // (grey-blue).  Then, one at a time: the column's spots fly to the exits and lie down as a line; the card's 28 rows
  // peel off into the wavefront along the input edge (the card keeps its 0); the recorded light of the 0 runs through
  // the chip
  const flat = t => {
    cards.beltHide();
    // (come round, stepping by hand: the glass, the chip, the column and the card stay as the first round left them
    // (ts); only the reading goes round - the card turns to the next digit while the last one's light fades (from
    // FLAT_GAP), its rows peel off into the wavefront, its light runs through the chip)
    const round = st.loopN > 0, ts = round ? DUR.flat : t;
    if (st.flatCyc !== st.loopN) {
      st.flatCyc = st.loopN;
      st.flatPrev = st.flatTest; st.flatTest = TESTS[(TESTS.indexOf(st.flatTest) + 1) % TESTS.length];
      st.once &= ~1; st.askT = -1;
    }
    const f = sm(ramp(ts, P5.flat[0], P5.flat[1])), solid = sm(ramp(ts, P5.solid[0], P5.solid[1]));
    glass.drop(1); glass.specs(0); glass.shape(1, f);
    glass.veins(1 - solid); glass.fade(1 - solid);
    st.morph = 1; st.flat = f; st.glasses = 1; st.sharp = 1;
    lightsOff();
    // (the light of the digit the glass read last fades: the 0, or the one part 4 had come round to)
    const S = SETS[Math.max(0, TESTS.indexOf(st.flatPrev))];
    for (const q of SETS) q.rays.level = q === S ? 1 - ramp(ts, 0, 0.4) : 0;
    const g = 1 - ramp(ts, 0, 0.4);
    for (let c = 0; c < 10; c++) glowNow[c] = g * S.glow[c];
    // the column: its backing goes, its spots stay until they fly (FOLD), then the chip's ten cells take over
    const fold = P5.fold[0];
    cards.board({ on: ts < fold ? 1 : 0, glow: glowNow, lit: g > 0.5 ? S.ans : -1, back: 1 - sm(ramp(ts, P5.back[0], P5.back[1])) });
    cards.screen({ back: 0, animal: 0 });
    cards.fold(ramp(ts, P5.fold[0], P5.fold[1]), ts >= fold ? 1 - sm(ramp(ts, P5.cells[0], P5.cells[1])) : 0);
    // the card: by the chip, its digit drawn all along; its rows peel off one after another into the wavefront (come
    // round: a quick fade to the next digit, as on part 4's card)
    const test = round && t < FLAT_GAP + FADE / 2 ? st.flatPrev : st.flatTest;
    cards.show(test); st.cardOf = test;
    cards.cardPose(ramp(ts, P5.card[0], P5.card[1]));
    cards.look({ animal: 0, sharp: round && t < FLAT_GAP + FADE ? Math.abs(1 - 2 * ramp(t, FLAT_GAP, FLAT_GAP + FADE)) : 1, sound: 0, back: 1 });
    st.input = NAME[test]; st.output = null; st.passed = 0;
    wave.digit(st.flatTest); wave.peel(Math.max(0, t - UNROLL));
    wave.level(t < UNROLL ? 0 : 1);
    wave.height(1 - sm(ramp(t, T_LIGHT + 0.4, T_LIGHT + 0.9)));
    bands.level(0);
    // the chip: in place but unseen until the glass lies there, then it fades in as the glass fades out; the copy's
    // pattern appears where the veins lay, its cells as the spots land
    bench.setStage({ chip: solid > 0 ? 1 : 0, solid });
    show.copy = solid > 0;
    copyPat(sm(ramp(ts, P5.solid[0] + 0.1, P5.solid[1] + 0.1)), -1e9);
    copyStrip(sm(ramp(ts, P5.cells[0], P5.cells[1])));
    // the recorded light of the digit (the old light stays dark until the new one starts in; come round, the last
    // digit's light fades while the card turns)
    if (t >= T_LIGHT && once(1)) { st.askT = copySwept; copy.show(sample(st.flatTest).x); }
    const on = st.askT >= 0 && copySwept > st.askT, fading = round && !on && t < FLAT_GAP + 0.4;
    copyLight = on ? 1 : fading ? 1 - ramp(t, FLAT_GAP, FLAT_GAP + 0.4) : 0;
    const r = on || fading ? copy.result : null;
    st.bars = t >= UNROLL ? 784 : 0; st.exits = ts >= P5.cells[0] ? 10 : 0;
    st.answer = r ? String(r.answer) : null;
    answerAt(r ? String(r.answer) : null, r ? copy.exitAt(r.answer, ansAt) : null, s);
    lProg.show(false); st.label = null;
    show.cold = false;
  };
  const chipPose = () => {
    cards.beltHide();
    glass.fade(0); glass.veins(0); lightsOff();
    for (const q of SETS) q.rays.level = 0;
    cards.screen({ back: 0, animal: 0 }); cards.board({ on: 0, glow: null, lit: -1 });
    cards.fold(1, 0);
    cards.cardPose(1);
    st.morph = 1; st.flat = 1; st.glasses = 1; st.sharp = 1; st.output = null; st.passed = 0;
    show.cold = false;
  };
  const glyphOf = (id, c) => (id === 'voice' ? (ctx.lang() === 'ja' ? KANA[VOWELS[c]] : VOWELS[c]) : DIGIT[c]);
  // (the answer's tag: a vowel in English in quotes, as tab 2 writes it)
  const tagOf = (id, c) => (id === 'voice' && ctx.lang() !== 'ja' ? QUOTED[c] : glyphOf(id, c));
  const DIGIT = Array.from({ length: 10 }, (_, c) => String(c)), LABEL = { image: 'lbl.prog.image', voice: 'lbl.prog.voice' };
  const QUOTED = VOWELS.map(v => '“' + v + '”');
  // parts 6 and 7: the bench writes the program (image, then voice) and runs it
  const program = (t, id) => {
    chipPose();
    const cur = bench.current && bench.current.id === id ? bench.current : null;
    const inst = cur && cur.inst, ph = bench.phase;
    if (st.runT < 0 && cur && ph === 'run') st.runT = t;
    // (the program's last input from an earlier run stays in inst.shown until its new light starts in: not shown)
    if (inst && st.stale === undefined) st.stale = inst.shown;
    const sh = inst && inst.shown !== st.stale ? inst.shown : null;
    // (a new input on the chip: its wavefront stands up, then sinks as its light goes in)
    if (sh && sh !== st.waveOf) { st.waveOf = sh; st.waveT = t; }
    // stepping by hand, once the part has run its course the chip goes on reading, as part 4's glass did: the next
    // digit (7, 4, 0) or vowel once the answer to the last one has shown IN_SHOW seconds - its light on the chip, its
    // answer out (a slow computer computes the vowels' light slowly) - and at the latest IN_MAX seconds after it was asked
    if (st.waiting && inst && ph === 'run') {
      const fresh = sh && st.inAsk === (id === 'image' ? sh.test : sh.name) && t >= st.waveT + 1.2 && st.answer != null;
      if (fresh && st.ansT < 0) st.ansT = t;
      if (st.inT < 0 || (st.ansT >= 0 && t >= st.ansT + IN_SHOW) || t >= st.inT + IN_MAX) {
        if (id === 'image') inst.showTest(st.inAsk = TESTS[(TESTS.indexOf(sh ? sh.test : 17) + 1) % TESTS.length]);
        else inst.act('vowel', st.inAsk = VOWELS[(VOWELS.indexOf(sh ? sh.name : 'o') + 1) % VOWELS.length]);
        st.inT = t; st.ansT = -1;
      }
    }
    if (id === 'image') {
      bench.setStage({ projector: sm(ramp(t, 0, 1.2)) });
      if (t >= 0.8 && once(1)) bench.load('image');
      // the handover: the copy's light fades when the green light comes on, its cells give way to the program's in the
      // same place, its grey-blue pattern goes behind the scan line that writes the same pattern in green; then it goes
      if (st.lightT < 0 && cur && ph !== 'off' && ph !== 'dark' && ph !== 'blank') st.lightT = t;
      copyLight = st.lightT < 0 ? 1 : 1 - ramp(t, st.lightT, st.lightT + 0.4);
      show.copy = !(cur && ph === 'run');
      copyStrip(cur ? 0 : 1);
      copyPat(1, cur && ph === 'write' ? bp.x - bench.S.w / 2 + bench.S.w * Math.max(0, bench.sweep) : -1e9);
      if (st.runT >= 0 && t >= st.runT + 2.4 && once(2) && inst) inst.showTest(17);
      const test = sh ? sh.test : st.flatTest;          // (until the program reads its own: the digit part 5 read last)
      wave.digit(test); wave.peel(wave.PEEL); wave.level(1); wave.height(waveHeight(t));
      bands.level(0);
      cards.look({ animal: 0, sharp: cardLook(t, test), sound: 0, back: 1 });
      st.input = NAME[test] || String(sh ? sh.c : 0);
      st.bars = 784; st.exits = 10;
    } else {
      bench.setStage({ projector: 1 });
      if (once(1)) bench.load('voice');
      show.copy = false;
      if (st.runT >= 0 && t >= st.runT + 2.4 && once(2) && inst) inst.act('vowel', 'o');
      if (cur) {
        // the switch: the card becomes a sound, the line of 784 values a row of 12 bands, the exits five
        if (st.switchT < 0) st.switchT = t;
        const k = sm(ramp(t, st.switchT, st.switchT + 0.3));
        const name = sh ? sh.name : 'a', glyph = glyphOf('voice', VOWELS.indexOf(name)), x = sh ? sh.x : VOICE_A;
        if (name !== st.vowel || ctx.lang() !== st.lang) { st.vowel = name; st.lang = ctx.lang(); cards.sound(x, glyph); }
        cards.look({ animal: 0, sharp: 1 - k, sound: k, back: 1 });
        wave.level(1 - k); wave.height(0);
        bands.values(x); bands.level(k); bands.height(waveHeight(t));
        st.input = name; st.bars = 12; st.exits = 5;
      } else {
        // (the image program going off: its light dims, its pattern fades; the card still shows the 7)
        cards.look({ animal: 0, sharp: cardLook(t, st.cardOf), sound: 0, back: 1 });
        wave.digit(st.cardOf); wave.peel(wave.PEEL); wave.level(1); wave.height(0);
        bands.level(0);
        st.input = NAME[st.cardOf] || null; st.bars = 784; st.exits = 10;
      }
      copyPat(0, -1e9); copyStrip(0);
    }
    const r = inst && inst.result;
    st.answer = r ? (id === 'voice' ? VOWELS[r.answer] : DIGIT[r.answer]) : null;
    // the program's name on the green light's flank, while the light is on; the answer above its exit (part 6: the
    // copy's 0 until the program takes the chip over)
    const on = bench.cone > 0.3 && !!cur;
    st.label = on ? LABEL[id] : null;
    if (on && lProg.key !== st.label) lProg.set(st.label);
    // (on the green light's right flank, lower than tab 2's tag: the camera here keeps the chip large and the projector
    // at the frame's top - on a phone, which shows the projector, as high as tab 2's.  The cone runs from the
    // projector's lens, 0.9 to each side at 9.4 above the chip - bench.js's PROJ - to the slate's edges)
    const lh = innerWidth < innerHeight ? 6.6 : 3.4, lx = 0.9 + (bench.S.w / 2 - 0.9) * (1 - lh / 9.4);
    lProg.at(bp.x + lx, bp.y + lh, bp.z); lProg.show(on);
    const rc = id === 'image' && !cur ? copy.result : null;
    if (rc) st.answer = DIGIT[rc.answer];
    if (rc) answerAt(DIGIT[rc.answer], copy.exitAt(rc.answer, ansAt), s);
    else answerAt(r && inst ? tagOf(id, r.answer) : null, r && inst ? inst.exitAt(r.answer, ansAt) : null, cur ? cur.s : s, id === 'voice');
    // on to the next part when the second input has been read and shown a moment (on a slow computer the program's
    // light, which moves by the clamped frame time, comes later than the story's clock: wait for it), or after the limit
    if (st.doneT < 0 && (st.once & 2) && st.answer === (id === 'voice' ? 'o' : '7')) st.doneT = t;
    if (st.runT >= 0 && t >= st.runT + 5.6 && (st.doneT >= 0 ? t >= st.doneT + 1.4 : t >= st.runT + 9)) return true;
    return t >= DUR[st.part];
  };
  // part 8: the voice program goes off, the projector rises away, the card and its sound go; the GPU and the chip fly
  // onto the graph, made smaller, the graph fades in under them and its lines are drawn; the chip, its pattern back
  // (the copy's), reads one digit after another with its light, the glasses' cold thermometer beside it
  const energy = t => {
    chipPose();
    if (once(1)) bench.load(null);
    bench.setStage({ chip: 1, solid: 1, projector: st.posed ? 0 : 1 - sm(ramp(t, 0, 1.2)) });
    const out = st.posed ? 0 : 1 - sm(ramp(t, 0, 0.6));
    cards.look({ animal: 0, sharp: 0, sound: out, back: out });
    wave.level(0); bands.level(bands.on > 0 ? out : 0); bands.height(0);
    const pk = sm(ramp(t, 1.0, 1.8));
    show.copy = true; copyPat(pk, -1e9); copyStrip(pk);
    const n = t < 2.2 ? -1 : Math.floor((t - 2.2) / READ);
    if (n >= 0 && n !== st.readN) { st.readN = n; st.askT = copySwept; copy.show(sample(TESTS[n % TESTS.length]).x); }
    copyLight = st.askT >= 0 && copySwept > st.askT ? 1 : 0;
    e8.ek = sm(ramp(t, FLY8[0], FLY8[1])); e8.sheet = sm(ramp(t, SHEET[0], SHEET[1])); e8.lines = ramp(t, LINES[0], LINES[1]);
    st.input = null; st.output = null; st.answer = null; st.bars = 0; st.exits = 10; st.label = null;
    lProg.show(false); lAns.show(false);
    show.cold = t >= SHEET[0];
  };
  // the loop (t from -LOOP to 0): the program goes off, the sound and the bands fade, the card fades away (part 1 has
  // none), the chip sinks and the projector rises away; the GPU cools while the camera flies back to it.  (After part
  // 8: the graph fades, the chip and the GPU fly back to their places, full size)
  const loopBack = t => {
    const k = 1 - sm(ramp(t, -1.1, -0.1));
    bench.setStage({ chip: k, projector: k });
    chipPose();
    const out = 1 - sm(ramp(t, -LOOP, -LOOP + 0.4));
    wave.level(0); bands.level(bands.on > 0 ? out : 0); bands.height(0);
    copyPat(0, -1e9); copyStrip(0);
    const gone = 1 - sm(ramp(t, -1.2, -0.3));
    cards.look({ animal: 0, sharp: 0, sound: (1 - sm(ramp(t, -LOOP, -LOOP + 0.5))) * gone, back: gone });
    cards.screen({ back: 0, animal: 0 });
    st.input = null; st.output = null; st.passed = 0; st.answer = null; st.bars = 0; st.exits = 0; st.label = null; st.sharp = 0;
    lProg.show(false); lAns.show(false);
    glass.fade(0);
    show.copy = false;
    e8.ek = 1 - sm(ramp(t, -LOOP, -0.4)); e8.sheet = 1 - sm(ramp(t, -LOOP, -LOOP + 0.6)); e8.lines = 1;
  };

  return {
    program: null,
    get view() {
      if (!st.view || st.view.serial !== st.serial) {
        const k = VIEW_OF[st.part], v = VIEWS[k], dur = st.loop && st.part === 'gpu' ? 2.5 : v.dur;
        st.view = { ...v, serial: st.serial, dur };
        st.viewTall = { ...(TALL[k] || v), serial: st.serial, dur };
      }
      return innerWidth < innerHeight ? st.viewTall : st.view;
    },
    caption: () => CAP[st.part],
    parts: PARTS,
    get step() { return st.part; },
    get waiting() { return st.waiting; },
    goOn() { st.go = true; },
    controls: [{ type: 'button', id: 'restart', key: 'btn.fromStart', plain: true }],
    act(id) { if (id === 'restart') go('gpu'); },
    value() { return null; },
    get state() {
      return { part: st.part, t: st.t, glasses: st.glasses, sharp: st.sharp, gpu: gpu.warm, busy: gpu.busy, morph: st.morph, flat: st.flat,
        input: st.input, output: st.output, passed: st.passed, cold: show.cold ? COLD_LEVEL : null,
        answer: st.answer, bars: st.bars, exits: st.exits, stage: bench.stage,
        program: bench.current ? bench.current.id : null, phase: bench.phase, label: st.label,
        rest: st.part === 'super' ? st.rest : null, bubbles: !!(gemBubbles && gemBubbles.visible), glassOn: glass.state.fade > 0.003,
        gem: gemOf() };
    },
    go,
    enter() { go('gpu'); },
    leave() {
      bench.setStage({ chip: 1, projector: 1, solid: 1, shade: 1, glow: 1 });
      bench.hideLabels(false);
      copyHolder.visible = false;
      for (const l of labels) l.show(false);
      // (the bench is the other applications' too: back home, full size; the GPU full size)
      e8.ek = e8.sheet = 0; placeBench(0); graph.show(0, 0); kit.group.scale.setScalar(1);
    },
    update(dt, t, camera, pointScale, raw = dt) {
      // (the first frame's raw can be negative: its timestamp is older than the clock's start)
      raw = Math.max(0, raw);
      st.t += raw;
      // (T: what the part shows - its clock, or stepping by hand, round the part's window once it has run its course)
      const part = st.part, T = shown(part, st.t);
      e8.ek = e8.sheet = e8.lines = 0;
      // the story: on to the next part (stepping by hand, once Next is pressed); after the last, from the start
      if (part === 'program' || part === 'rewrite') {
        if (program(T, part === 'program' ? 'image' : 'voice') && onward()) advance(part === 'program' ? 'rewrite' : 'energy');
      } else {
        if (part === 'gpu' && st.loop && T < 0) loopBack(T);
        else {
          if (part === 'gpu' && st.loop && once(4)) { bench.load(null, { now: true }); bench.setStage({ chip: 0, projector: 0 }); }
          if (part === 'energy') energy(T); else if (part === 'flat') flat(T); else if (part === 'super') superPart(T); else if (part === 'optics') optics(T); else gpuParts(part, T);
        }
        const nx = PARTS[PARTS.indexOf(part) + 1];
        if (st.t >= DUR[part] && onward()) advance(nx || 'gpu', !nx);
      }
      // part 8: the chip and the GPU on the graph (the GPU below), the graph and its lines
      placeBench(e8.ek);
      graph.show(e8.sheet, e8.lines);
      // the GPU, always there: how hot (from the story's clock), how busy (part 1: while the dog is inside), its
      // thermometer up beside the glasses' in parts 1-4; from part 5 on it stands nearer, at the chip's side, its
      // thermometer over its right fan (a phone keeps it back, out of frame: there a thermometer alone would show)
      const P = PARTS.indexOf(st.part), tt = st.part === part ? T : st.t;
      gpu.warm = heatOf(st.part, tt);
      gpu.busy = st.part === 'gpu' ? (st.loop && tt < 0 ? 0 : sm(ramp(tt, 2.3, 2.8)) * (1 - sm(ramp(tt, 3.8, 4.4)))) : st.part === 'stream' || st.part === 'energy' ? 1 : 0.4;
      const back = st.part === 'gpu' && st.loop && tt < 0;
      const low = st.part === 'flat' ? sm(ramp(tt, 0.2, 2.4)) : P > 4 ? 1 : back ? 1 - sm(ramp(tt, -LOOP, 0)) : 0;
      const ts = 1 + (TH_LO_S - 1) * low;
      gpu.thermoAt(TH_HI[0] + (TH_LO[0] - TH_HI[0]) * low, TH_HI[1] + (TH_LO[1] - TH_HI[1]) * low, TH_HI[2] + (TH_LO[2] - TH_HI[2]) * low, ts);
      // (where it stands: at its place in parts 1-3, a little nearer in part 4, beside the chip in parts 5-7, and back
      // in the loop - on a phone always at its place, out of frame from part 3 on)
      const tall = innerWidth < innerHeight;
      const mid = tall ? 0 : st.part === 'super' ? sm(ramp(tt, 0, 2.0)) : P > 3 ? 1 : back ? low : 0, near = tall ? 0 : low;
      const gx = GPU_AT.x + (GPU_MID.x - GPU_AT.x) * mid, gz = GPU_AT.z + (GPU_MID.z - GPU_AT.z) * mid;
      kit.group.position.set(gx + (GPU_NEAR.x - gx) * near, ctx.y, gz + (GPU_NEAR.z - gz) * near);
      // (part 8: on the graph, smaller; on a phone too)
      kit.group.position.lerp(gpuOn.setY(ctx.y), e8.ek);
      kit.group.scale.setScalar(1 + (E_GPU.s - 1) * e8.ek);
      kit.group.visible = true;
      gpu.update(raw, t, camera, pointScale);
      // its label: while it is the subject (parts 1-2), then at the side over its right fan (part 3 on), and in parts
      // 5-7, where the camera looks down from above, on its heatsink's front (higher, it stood under the page's header);
      // not on a phone from part 3 on (the GPU is out of frame there).  Neutral while cold, orange once hot.
      const a = gpu.anchors.gpu, gp = kit.group.position, beside = P > 3 || back;
      const side = st.part === 'optics' ? 2.2 * sm(ramp(tt, 0, 1.5)) : P === 3 ? 2.2 : 0;
      if (beside) lGpu.at(gp.x + 1.6, ctx.y + 1.9, gp.z + 2.4);
      else lGpu.at(gp.x + a[0] + side, ctx.y + a[1], gp.z + a[2]);
      // (part 8: over the GPU on the graph, and our chip's name over the chip)
      const onGraph = st.part === 'energy' && e8.ek > 0.9;
      if (onGraph) lGpu.at(gp.x, ctx.y + 4.6 * E_GPU.s, gp.z - 1.2);
      lGpu.show((((st.part === 'gpu' && (tt >= 0.3 || st.loopN > 0)) || st.part === 'stream' || ((st.part === 'optics' || P >= 3) && !tall)) && !back && (st.part !== 'energy' || onGraph)) || onGraph);
      lChip.at(chipOn.x, chipOn.y, chipOn.z + 0.5 * E_CHIP.s * bench.S.d);
      lChip.show(onGraph);
      // the glasses' cold thermometer: beside the chip in part 8 (and there while it fades after it)
      if (st.part === 'energy') e8.cold = true; else if (show.cold) e8.cold = false;
      if (e8.cold) { cold.object.position.copy(coldOn); cold.object.scale.setScalar(E_COLD.s); }
      else { cold.object.position.set(...COLD_AT); cold.object.scale.setScalar(1); }
      const hot = gpu.warm > 0.5;
      if (hot !== cls.hot) { cls.hot = hot; lGpu.el.classList.toggle('gpu', hot); }
      if (P < 3) { lProg.show(false); lAns.show(false); st.label = null; }
      else if (P === 3) { lProg.show(false); st.label = null; }
      // the glasses' thermometer (a kit of the scene's own: ticked here)
      sk._tick(dt, t, { dim: 1, camera, pointScale, platesOn: show.cold });
      // the copy of the slab on the chip (its light dimmed as the story asks)
      copyHolder.visible = show.copy;
      if (show.copy) { copy.update(raw); copyKit._tick(dt, t, { dim: copyLight, camera, pointScale, platesOn: false }); }
    },
  };
}

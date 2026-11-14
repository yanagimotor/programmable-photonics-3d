// Program "Colour converter" (tab 2 only): the light-programmable chip as a frequency doubler whose new colours the
// visitor chooses, after Yanagimoto et al., Nature 649, 330 (2026), Fig. 3 ("Spectral engineering of SHG").  It
// replaces, on this tab only, tab 1's poled converter (devices/shg.js) written in green: there one stripe spacing is
// fixed when the chip is made, here the projector writes any.  Very short pulses of infrared light (many shades at
// once, painted red) run along the chip; the stripes written by light (where the light falls, the chip's
// nonlinearity is switched on) decide which new colours, at twice the frequency, are made: one stripe spacing makes
// one narrow new colour; the sum of several spacings makes several at once.  Change the stripes and the colours change.
//
// What is real here (the model, also checked by dev/devcheck.js without a GPU):
//   - the pattern: the sum of the chosen colours' gratings (in step at the middle of the stripes), written as light /
//     no light, as the projector writes it (bars or gaps too thin to write are filled in);
//   - the new light: each colour's field grows as the overlap of that very pattern with the colour's grating,
//     E(z) = integral of p(z') exp(i k z') dz' (second-harmonic generation with quasi-phase matching, the pump not
//     used up), so it grows along the stripes when the spacing suits it and stays at nothing when it does not; a sum
//     of spacings gives each colour its share.  The spacings fit a whole number of times into the stripes, so none of
//     the three colours that a choice leaves out is made;
//   - the pump: a broad red hump; each new colour takes the pump's share at half its frequency.
// What is a picture: the colours (the pump is infrared, the new light near 0.78 um: painted red and yellow / blue /
// violet, as the table paints frequencies), the spacings (about 17 um, differing by a few per cent, in the paper;
// drawn 1.1 / 0.67 / 0.5 units), how much light is converted (much less in reality), the new light riding on the red
// flashes and growing with them (really it trails them, as a longer pulse: the paper's GVM is -92 fs/mm against 60 fs
// pulses), several new colours taking turns from flash to flash, on the chip and on the beam that leaves it (as tab
// 3's colour router draws several colours in one guide; really every flash carries all of them), the glitter, the
// pulses' speed.  The plates also leave out a few faint other colours that the light / no-light sum of
// two or three spacings makes between the three (blue + violet: one beside yellow, about a third of violet's power;
// yellow + blue: one beside violet, a quarter of yellow's; all three: one beside blue; devcheck reports them):
// drawn, they would read as a colour that was not chosen.
import { lin, ramp } from '../kit/colour.js';

export const meta = { id: 'shg', platform: 'sin', category: 'convert', size: { w: 11, d: 6 } };

const NB = ' ';
export const text = {
  en: {
    name: 'Colour converter',
    tech: 'Stripes written by light (quasi-phase matching) · silicon nitride',
    what: 'Turns infrared laser light into new colours: the stripes written by light choose which.',
    in: 'Very short pulses of infrared light: many shades at once',
    out: 'The new colours the stripes choose, and the leftover infrared',
    how: 'Two infrared photons can merge into one photon of a new colour, at twice the frequency. The stripes keep the new light in step, so it grows along the chip; each stripe spacing suits one colour. Write several spacings at once, and several colours grow together.',
    use: 'Light of a chosen colour, made on demand from one laser: for sensing, atomic clocks and quantum light sources.',
    fixed: 'Nothing is etched: write another pattern of stripes, and other colours come out within about a second.',
    c: { in: 'Infrared in', stripes: 'Stripes written by light', out: 'New colours out' },
    ctl: { yellow: 'Yellow', blue: 'Blue', violet: 'Violet' },
    status: 'One stripe spacing: <b>one new colour</b>.',
    'status.2': 'Two spacings written together: <b>two new colours</b> at once.',
    'status.3': 'Three spacings written together: <b>three new colours</b> at once.',
    'status.none': 'No stripes: the infrared light passes through unchanged.',
    'status.write': 'New stripes are being written: where they are written, the colours change.',
    ref: 'Yanagimoto et al., Nature 649, 330 (2026): stripes of light written on a silicon-nitride chip chose which new colours ultrashort laser pulses made (one, several at once, or a broad band; Fig. 3).',
    note: `Colours and stripe spacings are exaggerated: the red stands for infrared pulses (about 1.56${NB}µm, 60${NB}fs long), the new colours for light near 0.78${NB}µm, and the real stripes are about 17${NB}µm apart, differing by only a few per cent from colour to colour. Much less light is converted than drawn; several new colours take turns from flash to flash only so that each can be seen (every flash carries all of them). The glitter is decoration.`,
  },
  ja: {
    name: '色変換器',
    tech: '光で書いた縞（擬似位相整合）・窒化シリコン',
    what: '赤外のレーザー光を、新しい色の光に変えます。色を選ぶのは、光で書いた縞です。',
    in: 'いろいろな波長を同時に含む、赤外レーザー光のとても短いパルス',
    out: '縞が選んだ新しい色の光と、残った赤外光',
    how: '赤外の光子2個が合わさると、周波数が2倍の、新しい色の光子1個になります。縞が新しい光の足並みをそろえるので、新しい光はチップを進むにつれて育ちます。縞の間隔ごとに、合う色は一つです。いくつかの間隔を重ねて書けば、いくつもの色が同時に育ちます。',
    use: '一つのレーザーから、欲しい色の光をその場でつくれます。センシング、原子時計、量子光源などに役立ちます。',
    fixed: '何も刻まれていません。別の縞を書けば、1秒ほどで別の色が出てきます。',
    c: { in: '赤外光', stripes: '光で書いた縞', out: '新しい色の光' },
    ctl: { yellow: '黄色', blue: '青', violet: '紫' },
    status: '縞の間隔が一つなら、<b>新しい色も一つ</b>です。',
    'status.2': '2つの間隔を重ねて書くと、<b>新しい色が2つ</b>同時にできます。',
    'status.3': '3つの間隔を重ねて書くと、<b>新しい色が3つ</b>同時にできます。',
    'status.none': '縞がないと、赤外光はそのまま通り抜けます。',
    'status.write': '新しい縞を書き込んだところから、色が変わっていきます。',
    ref: 'Yanagimoto ほか、Nature 649, 330 (2026)：窒化シリコンのチップに光で縞を書き、超短パルスのレーザー光からできる新しい色を選びました。一つの色、同時にいくつもの色、幅広い色の帯（図3）。',
    note: `色と縞の間隔は誇張しています。赤は赤外のパルス光（約1.56${NB}µm、長さ60${NB}fs）を、新しい色は0.78${NB}µm付近の光を表します。実際の縞の間隔は約17${NB}µmで、色による違いは数%しかありません。変換される光は、図よりずっと少なくなります。いくつもの新しい色がパルスごとに入れ替わるのは、見分けやすくするためです（実際には、どのパルスもすべての色を運びます）。きらめきは飾りです。`,
  },
};

// ------------------------------------------------------------------------------------------------- the model
// Chip-local units: the light runs along x from -W/2 to W/2 (the chip's facets); the stripes are written from XA to XB.
const W = meta.size.w;
const XA = -5.0, XB = 5.0, L = XB - XA;
const NP = 1000, DZ = L / NP;                  // the pattern, sampled along the stripes
const MINW = 0.07;                             // the thinnest bar or gap the projector writes
// The three new colours: n stripe periods fit into the stripes (period L / n; bluer = finer, as in the paper, where
// longer periods make longer wavelengths).  Quasi-phase matching: the mismatch k(F) = 2 pi n / L grows linearly with
// the new light's frequency F (in units of the pump's centre frequency, so F = 2 is "twice the frequency", the blue
// of tab 1); F = 2 + 0.04 (n - 15): yellow 1.76, blue 2.00, violet 2.20.  The bins (9, 15, 20) are ones for which no
// mix of the others' stripes (the light / no-light sum creates some) lands on a third colour (searched); the mixes
// land between the colours instead (see "What is a picture" above).
// Painted with the converter's own stretch of the table's ramp (monotonic: higher frequency, larger u): blue a little
// towards azure (u 0.76, not tab 1's 0.82) so that it stays apart from violet on the red light.
export const COLOURS = [
  { id: 'yellow', u: 0.33, n: 9 },
  { id: 'blue', u: 0.76, n: 15 },
  { id: 'violet', u: 1.0, n: 20 },
].map(c => ({ ...c, period: L / c.n, F: 2 + 0.04 * (c.n - 15), rgb: ramp(c.u) }));
// The pump: very short pulses, so a broad hump of frequencies f (flat-topped; f = 1 at its centre).  Its shades of
// red: deep crimson at the low end, scarlet at the high end (never orange: an orange glow means heat on this page).
export const PUMP = { f0: 0.99, w: 0.19, lo: 0.78, hi: 1.2 };
export const pumpAt = f => Math.exp(-(((f - PUMP.f0) / PUMP.w) ** 4));
const SHADE = f => ramp(-0.18 + 0.22 * Math.min(1, Math.max(0, (f - PUMP.lo) / (PUMP.hi - PUMP.lo))));

// exp(i k z) of each colour at the samples (z from XA)
const COS = COLOURS.map(c => Float32Array.from({ length: NP }, (_, i) => Math.cos(2 * Math.PI * c.n * (i + 0.5) / NP)));
const SIN = COLOURS.map(c => Float32Array.from({ length: NP }, (_, i) => Math.sin(2 * Math.PI * c.n * (i + 0.5) / NP)));

// The pattern of light for a choice of colours (sel: three booleans, yellow / blue / violet): 1 = light (the
// nonlinearity switched on), 0 = dark.  No colour: no stripes.
export function grating(sel) {
  const p = new Uint8Array(NP);
  const on = COLOURS.filter((_, j) => sel[j]);
  if (!on.length) return p;
  for (let i = 0; i < NP; i++) {
    let s = 0;
    for (const c of on) s += Math.cos(2 * Math.PI * c.n * ((i + 0.5) / NP - 0.5));
    p[i] = s > 0 ? 1 : 0;
  }
  // fill in what is too thin to write (the shortest run first, until none is left)
  const minN = Math.ceil(MINW / DZ - 1e-9);
  for (let guard = 0; guard < 400; guard++) {
    let best = -1, bestLen = minN, start = 0;
    for (let i = 1; i <= NP; i++) {
      if (i === NP || p[i] !== p[start]) {
        if (i - start < bestLen) { bestLen = i - start; best = start; }
        start = i;
      }
    }
    if (best < 0) break;
    for (let i = best; i < best + bestLen; i++) p[i] ^= 1;
  }
  return p;
}

// the field of each new colour along the stripes, cumulative (n + 1 values from z = 0 to L): re[j], im[j]
function cumulate(p, re, im) {
  for (let j = 0; j < 3; j++) {
    const c = COS[j], s = SIN[j], r = re[j], m = im[j];
    let a = 0, b = 0;
    r[0] = 0; m[0] = 0;
    for (let i = 0; i < NP; i++) { if (p[i]) { a += c[i]; b += s[i]; } r[i + 1] = a * DZ; m[i + 1] = b * DZ; }
  }
}
// each colour's own grating makes REF[j] (the amplitude at the end of the stripes); the pump's share at half each
// colour's frequency (two photons of f make one of 2f)
const REF = COLOURS.map((_, j) => {
  const p = grating(COLOURS.map((__, q) => q === j));
  let a = 0, b = 0;
  for (let i = 0; i < NP; i++) if (p[i]) { a += COS[j][i]; b += SIN[j][i]; }
  return Math.hypot(a, b) * DZ;
});
const SHARE = COLOURS.map(c => pumpAt(c.F / 2) ** 2);

// how much of each new colour a pattern makes (power, 1 = that colour's own stripes with all of the pump)
export function made(p) {
  return COLOURS.map((_, j) => {
    let a = 0, b = 0;
    for (let i = 0; i < NP; i++) if (p[i]) { a += COS[j][i]; b += SIN[j][i]; }
    return (Math.hypot(a, b) * DZ / REF[j]) ** 2 * SHARE[j];
  });
}
// a number for a pattern (the tests compare them)
export function patternId(p) {
  let h = 2166136261;
  for (let i = 0; i < p.length; i++) { h ^= p[i] + (i & 7); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

// ------------------------------------------------------------------------------------------------- the picture
const AIR = 2.4, XIN = -W / 2 - AIR;           // the beams in the air (the flashes are counted from XIN)
const Y = 0.1;                                 // height of the beams' axis in the air
const ZS = 1.15;                               // the stripes reach this far across the light, both sides
const HW = 0.52;                               // half-width of the red light on the chip
const SW = 0.4;                                // half-width of the new colours' flashes (fully grown)
const FLOW = 1.6, DASH = 0.9;                  // the flashes: speed and spacing, as the kit's light
const ETA = 0.25;                              // drawn share of the red that one colour uses up (illustrative)
const LT = 256;                                // texels of the light along the chip
// Left alone: the first change FIRST s after the program starts (the kiosk's trailer runs it about 7 s), then one
// every STEP s (tab 2 on its own runs a program 10 s: blue, then a superposition to its end); both twice as long
// when the visitor asked for less motion.  After a visitor's choice the cycle waits IDLE s.
const FIRST = 4, STEP = 6.5, IDLE = 15;
// one colour, two together, one, another, all three, ...
const CYCLE = [[0, 1, 0], [1, 1, 0], [1, 0, 0], [0, 0, 1], [1, 1, 1], [0, 1, 1]].map(s => s.map(Boolean));
const GMAX = 260;                              // glints (star-like sparkles) at most
const GAIN = [0.85, 1.0, 1.0];                 // brightness of the new colours (yellow is brighter to the eye)

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const PULSE_GLSL = /* glsl */ `
float hash(float n) { return fract(sin(n * 12.9898 + 4.1) * 43758.5453); }
// a flash every uDash units, moving at uFlow units/s; s: distance from where the light starts in the air
float flash(float s, out float n) {
  float x = (s - uTime * uFlow) / uDash;
  n = floor(x);
  float ph = x - n;
  return exp(-pow((ph - 0.5) / 0.15, 2.0));
}
// n mod k for whole numbers, 0..k-1 also where the GPU divides a little inexactly (n is far below 0 after a while)
float imod(float n, float k) { return n - k * floor((n + 0.5) / k); }`;
// the pump's shade of red along the light (after PULSE_GLSL and the uniforms uRedA, uRedB): each flash has its own
// shade at its middle, between deep crimson and scarlet, blended smoothly into the next flash's (a shade that jumped at
// each flash's edge made hard-edged blocks of red, close up)
const SHADE_GLSL = /* glsl */ `
vec3 redShade(float s) {
  float x = (s - uTime * uFlow) / uDash - 0.5;
  float i = floor(x), f = x - i;
  return mix(uRedA, uRedB, mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f)));
}`;

// the light on the chip: row 0 the red pump (a soft band, flashes in many shades of red), row 1 the new colours,
// riding on the red flashes: with several colours chosen, the flashes take them in turn (flash n: the (n mod k)-th),
// the stripes behind the writing front deciding (uSelA); ahead of the front the light still carries the colours made
// behind it, so there the flashes take the new choice and the old one together (uSelA or uSelB; a colour with no light
// there stays dark: its field is 0).  A flash of a new colour grows in size and brightness with that colour's field
// (the texture's rows 1-3).  Drawn OVER what is below (alpha-blended), so that red stays red on the pale chip and a
// new colour keeps its colour on the red.  Both strips reach a little past the output facet, fading out where the beam
// in the air takes over (uE0, uE1).
const BAND_VS = /* glsl */ `
attribute float aRow; attribute float aU;
varying float vRow; varying float vU; varying float vX;
void main() {
  vRow = aRow; vU = aU; vX = position.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BAND_FS = /* glsl */ `
uniform sampler2D uTex;
uniform vec3 uC1, uC2, uC3, uRedA, uRedB, uSelA, uSelB;
uniform float uTime, uFlow, uDash, uDim, uX0, uLen, uS0, uFront, uE0, uE1;
varying float vRow; varying float vU; varying float vX;
${PULSE_GLSL}
${SHADE_GLSL}
float row(float r) { return texture2D(uTex, vec2(clamp((vX - uX0) / uLen, 0.0, 1.0), (r + 0.5) / 4.0)).r; }
void main() {
  float n;
  float pk = flash(vX - uS0, n);
  float ends = smoothstep(uE0, uE0 + 0.1, vX) * smoothstep(uE1, uE1 - 0.1, vX);
  vec3 col; float a;
  if (vRow < 0.5) {
    float v = row(0.0);
    vec3 shade = redShade(vX - uS0);
    float glow = exp(-vU * vU * 2.2);
    // (kept below about 1.4: brighter, the tone mapping turns scarlet orange)
    col = shade * v * (0.8 + 0.55 * pk) * (0.8 + 0.2 * glow);
    // (opaque but for its rims: with the bloom on, as on a kiosk PC, the frame is blended in linear light before the tone
    // mapping, and the bright green stripes showing through a red that let 18 % through turned it orange)
    a = smoothstep(1.0, 0.68, abs(vU)) * smoothstep(0.0, 0.25, v) * ends;
  } else {
    vec3 sel = vX < uFront ? uSelA : max(uSelA, uSelB);
    float k = sel.x + sel.y + sel.z;
    if (k < 0.5) discard;
    float m = imod(n, k), j;
    if (sel.x > 0.5 && m < 0.5) j = 0.0;
    else j = (sel.y > 0.5 && m - sel.x < 0.5) ? 1.0 : 2.0;
    float v = row(1.0 + j);
    vec3 c = j < 0.5 ? uC1 : (j < 1.5 ? uC2 : uC3);
    // the flash grows with its colour's field, in size (its colour stays a colour: opaque, never mixed with the red);
    // lit from within: brighter and whiter towards its middle, the pure colour at its rim (light, not paint)
    float w = 0.3 + 0.7 * smoothstep(0.02, 0.7, v);
    float r = length(vec2(vU / w, (pk - 1.0) * 1.1));
    float shape = smoothstep(1.0, 0.7, r);
    col = c * (0.95 + 0.45 * v) * (0.85 + 0.3 * pk) * (0.82 + 0.3 * smoothstep(0.8, 0.0, r));
    col = mix(col, vec3(max(col.r, max(col.g, col.b))), 0.45 * smoothstep(0.34, 0.0, r) * v);
    a = shape * smoothstep(0.015, 0.05, v) * ends;
  }
  a *= uDim;
  if (a < 0.004) discard;
  col *= 0.6 + 0.4 * uDim;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// beams in the air: a cylinder, bright along its axis, with the same flashes (the pump's in many shades of red); a
// new colour's beam carries only its own flashes (every uEvery-th, from uSlot) over a steady glow, whiter on its axis.
// uSoft: short soft ends (fractions of its length) where a beam meets the light on the chip - an additive beam over
// the pale chip turned pale pink, with a hard edge where it began
const BEAM_VS = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const BEAM_FS = /* glsl */ `
uniform vec3 uColor, uRedA, uRedB;
uniform float uTime, uFlow, uDash, uLen, uS0, uFadeIn, uFadeOut, uDim, uShaded, uPower, uAlpha, uEvery, uSlot, uBase, uWhite;
uniform vec2 uSoft;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${PULSE_GLSL}
${SHADE_GLSL}
void main() {
  float y = vUv.y;
  float f = mix(1.0, smoothstep(0.0, 0.55, y), uFadeIn) * mix(1.0, 1.0 - smoothstep(0.3, 1.0, y), uFadeOut);
  if (uSoft.x > 0.0) f *= smoothstep(0.0, uSoft.x, y);
  if (uSoft.y > 0.0) f *= smoothstep(1.0, 1.0 - uSoft.y, y);
  float n;
  float pk = flash(uS0 + y * uLen, n);
  pk *= 1.0 - step(0.5, abs(imod(n, uEvery) - uSlot));
  vec3 c = mix(uColor, redShade(uS0 + y * uLen), uShaded);
  float core = pow(abs(dot(vN, vV)), 1.5);
  float b = f * core * (uBase + 0.95 * pk) * uPower * uDim;
  vec3 col = c * b * 1.35;
  col = mix(col, vec3(max(col.r, max(col.g, col.b))), uWhite * core * core);
  float a = clamp(b * 1.4, 0.0, 1.0);
  if (uAlpha > 0.5) { if (a < 0.004) discard; gl_FragColor = vec4(col / max(a, 0.04), a); }
  else gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// the new colours after the chip (a single beam: they go on riding the red beam as flashes of each colour in turn,
// as on the chip): a thinner cylinder inside the red beam, on the same axis, whose flashes take the chosen colours
// in turn as the band's do (flash n: the (n mod k)-th of uSel, the colours the chip's last flashes carry); each a
// bead of light as wide as the beam when its colour is fully grown (the distance from the axis on the screen is the
// sine of the angle between the surface and the view), lit from within.
// Drawn over the red beam (alpha-blended), so that a colour stays its colour; it fades out before the red does.
const BEADS_FS = /* glsl */ `
uniform vec3 uC1, uC2, uC3, uSel, uAmp;
uniform float uTime, uFlow, uDash, uLen, uS0, uDim, uSoft;
varying vec2 vUv; varying vec3 vN; varying vec3 vV;
${PULSE_GLSL}
void main() {
  float k = uSel.x + uSel.y + uSel.z;
  if (k < 0.5) discard;
  float y = vUv.y, n;
  float pk = flash(uS0 + y * uLen, n);
  float m = imod(n, k), j;
  if (uSel.x > 0.5 && m < 0.5) j = 0.0;
  else j = (uSel.y > 0.5 && m - uSel.x < 0.5) ? 1.0 : 2.0;
  vec3 c = j < 0.5 ? uC1 : (j < 1.5 ? uC2 : uC3);
  float v = j < 0.5 ? uAmp.x : (j < 1.5 ? uAmp.y : uAmp.z);
  float cv = abs(dot(vN, vV)), side = sqrt(max(0.0, 1.0 - cv * cv));
  float w = 0.45 + 0.55 * smoothstep(0.02, 0.7, v);
  float r = length(vec2(side / w, (pk - 1.0) * 1.1));
  float shape = smoothstep(1.0, 0.7, r);
  vec3 col = c * (0.95 + 0.45 * v) * (0.85 + 0.3 * pk) * (0.82 + 0.3 * smoothstep(0.8, 0.0, r));
  col = mix(col, vec3(max(col.r, max(col.g, col.b))), 0.45 * smoothstep(0.34, 0.0, r) * v);
  float f = smoothstep(0.0, uSoft, y) * (1.0 - smoothstep(0.5, 0.92, y));
  float a = shape * smoothstep(0.015, 0.05, v) * f * uDim;
  if (a < 0.004) discard;
  col *= 0.6 + 0.4 * uDim;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// glints: star-like sparkles (a core, a soft glow and four rays), twinkling in size and brightness
const GLINT_VS = /* glsl */ `
attribute vec4 aColor; attribute float aSize; attribute float aRot; attribute float aKind;
uniform float uScale;
varying vec4 vColor; varying float vRot; varying float vKind;
void main() {
  vColor = aColor; vRot = aRot; vKind = aKind;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.001, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const GLINT_FS = /* glsl */ `
uniform float uDim;
varying vec4 vColor; varying float vRot; varying float vKind;
void main() {
  vec2 d = (gl_PointCoord - 0.5) * 2.0;
  float c = cos(vRot), s = sin(vRot);
  vec2 q = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  float r2 = dot(q, q);
  float core = exp(-r2 * 30.0);
  float glow = exp(-r2 * 7.0);
  float rays = exp(-abs(q.y) * 16.0) * (1.0 - smoothstep(0.05, 1.0, abs(q.x)))
             + exp(-abs(q.x) * 16.0) * (1.0 - smoothstep(0.05, 1.0, abs(q.y)));
  // added to what is below (a glint is brighter than the light it sits on): coloured rays and glow, a whiter core -
  // pinkish white in the red's glints (kind 0, 1: hot), its own colour whitened in a new colour's (kind 2: a pink
  // core would turn blue lavender and violet pink)
  float k = (core + 0.25 * glow + 0.7 * rays) * vColor.a * uDim;
  if (k < 0.004) discard;
  float m = max(vColor.r, max(vColor.g, vColor.b));
  float own = step(1.5, vKind), hot = step(0.5, vKind) * (1.0 - own);
  vec3 tint = mix(vec3(1.0, 0.78, 0.84), mix(vColor.rgb / max(m, 1e-4), vec3(1.0), 0.4), own);
  vec3 col = vColor.rgb * (0.3 * glow + 0.7 * rays) + m * tint * core * (0.55 + 0.45 * hot);
  gl_FragColor = vec4(col * vColor.a * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// the writing front of a new pattern: a bright scan line across the stripes with a short glow behind it
const SCAN_VS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SCAN_FS = /* glsl */ `
uniform float uLevel, uDim, uLead, uLen;
varying vec2 vUv;
void main() {
  float d = (vUv.x - uLead) * uLen;                      // units from the front (+: ahead)
  float line = exp(-d * d / 0.0005) + 0.4 * exp(-d * d / 0.05) * step(d, 0.0);
  float ends = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
  vec3 col = vec3(0.75, 1.0, 0.82) * line * ends * uLevel * uDim * 1.8;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function create(kit) {
  const { THREE } = kit;
  const reduced = !!kit.reduced;
  const R = kit.rand;
  kit.chip({ w: W, d: meta.size.d, platform: 'sin' });

  // ---- the program: the stripes, drawn into the bench's mask (the green light on the chip and in the projector's
  // beam) through a plane over the stripes that carries the pattern as its picture
  const maskData = new Uint8Array(NP * 4);
  const maskTex = new THREE.DataTexture(maskData, NP, 1, THREE.RGBAFormat);
  maskTex.magFilter = THREE.LinearFilter; maskTex.minFilter = THREE.LinearFilter;
  maskTex.wrapS = maskTex.wrapT = THREE.ClampToEdgeWrapping;
  const stripes = new THREE.Mesh(new THREE.PlaneGeometry(L, 2 * ZS).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: maskTex }));
  stripes.position.set((XA + XB) / 2, 0.002, 0);
  stripes.userData.maskMap = maskTex;
  kit.group.add(stripes);

  // ---- the state: what is chosen, the pattern written now (the new one behind a moving front while it is rewritten,
  // the old one ahead of it)
  const sel = [false, true, false], selOld = sel.slice();
  let target = grating(sel);
  const shown = new Uint8Array(NP), old = new Uint8Array(NP);
  const mk = () => [0, 1, 2].map(() => new Float32Array(NP + 1));
  const Ere = mk(), Eim = mk(), Ore = mk(), Oim = mk();          // the new pattern's field, the old one's
  let front = Infinity, writing = false;
  const FRONT0 = XA - 0.45, FRONT1 = W / 2 + 0.3;               // where the front starts and ends

  // the light along the chip (LT texels from -W/2 to W/2): row 0 the red's power, rows 1-3 each colour's field
  // (amplitude, 1 = its own stripes at the end, times the pump's share), what the shaders and the glints read
  const light = [0, 1, 2, 3].map(() => new Float32Array(LT));
  const texData = new Uint8Array(LT * 4 * 4);
  const lightTex = new THREE.DataTexture(texData, LT, 4, THREE.RGBAFormat);
  lightTex.magFilter = THREE.LinearFilter; lightTex.minFilter = THREE.LinearFilter;
  lightTex.wrapS = lightTex.wrapT = THREE.ClampToEdgeWrapping;
  const exitAmp = [0, 0, 0];            // each colour's field leaving the chip
  const outP = [0, 0, 0];               // ... and its power
  let exitRed = 1;
  const SQ = SHARE.map(Math.sqrt);
  const xOfT = i => -W / 2 + W * i / (LT - 1);
  const nfNow = () => (writing ? Math.max(0, Math.min(NP, Math.round((front - XA) / DZ))) : NP);
  // the field at sample n with the new pattern behind the front (sample nf) and the old one ahead of it
  const field = (j, n, nf) => {
    if (n <= nf) return Math.hypot(Ere[j][n], Eim[j][n]);
    return Math.hypot(Ere[j][nf] + Ore[j][n] - Ore[j][nf], Eim[j][nf] + Oim[j][n] - Oim[j][nf]);
  };
  function profile() {
    const nf = nfNow();
    for (let i = 0; i < LT; i++) {
      const n = Math.max(0, Math.min(NP, Math.round((xOfT(i) - XA) / DZ)));
      let used = 0;
      for (let j = 0; j < 3; j++) {
        const a = field(j, n, nf) / REF[j] * SQ[j];
        light[j + 1][i] = a;
        used += a * a;
      }
      light[0][i] = 1 - ETA * used;
    }
    for (let j = 0; j < 3; j++) { exitAmp[j] = light[j + 1][LT - 1]; outP[j] = exitAmp[j] * exitAmp[j]; }
    exitRed = light[0][LT - 1];
    for (let r = 0; r < 4; r++) for (let i = 0; i < LT; i++) texData[(r * LT + i) * 4] = Math.round(255 * clamp01(light[r][i]));
    lightTex.needsUpdate = true;
  }
  // the mask: the new pattern behind the front, the old one ahead
  function paintMask() {
    const nf = nfNow();
    for (let i = 0; i < NP; i++) {
      shown[i] = i < nf ? target[i] : old[i];
      const v = shown[i] ? 255 : 0, o = 4 * i;
      maskData[o] = maskData[o + 1] = maskData[o + 2] = v; maskData[o + 3] = 255;
    }
    maskTex.needsUpdate = true;
  }

  // ---- the light on the chip: one mesh, two strips (the red band; the new colours' flashes on it)
  const SEG = 110;
  const EDGE = 0.2;                              // (the bench's slate reaches a little beyond the chip's facets)
  const strips = [{ x0: -W / 2 - EDGE, x1: W / 2 + EDGE, half: HW, y: 0.03 }, { x0: XA, x1: W / 2 + EDGE, half: SW, y: 0.038 }];
  const pos = [], aRow = [], aU = [], idx = [];
  strips.forEach((st, r) => {
    const base = pos.length / 3;
    for (let k = 0; k <= SEG; k++) {
      const x = st.x0 + (st.x1 - st.x0) * k / SEG;
      for (const u of [-1, 1]) { pos.push(x, st.y, u * st.half); aRow.push(r); aU.push(u); }
      if (k < SEG) { const a = base + 2 * k; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
  });
  const bandGeo = new THREE.BufferGeometry();
  bandGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  bandGeo.setAttribute('aRow', new THREE.Float32BufferAttribute(aRow, 1));
  bandGeo.setAttribute('aU', new THREE.Float32BufferAttribute(aU, 1));
  bandGeo.setIndex(idx);
  const L3 = (c, k = 1) => new THREE.Vector3(...lin(c)).multiplyScalar(k);
  const RED_A = SHADE(PUMP.lo + 0.07), RED_B = SHADE(PUMP.hi - 0.06);      // the pump's shades of red (display rgb)
  const bandU = {
    uTex: { value: lightTex }, uC1: { value: L3(COLOURS[0].rgb, GAIN[0]) }, uC2: { value: L3(COLOURS[1].rgb, GAIN[1]) }, uC3: { value: L3(COLOURS[2].rgb, GAIN[2]) },
    uRedA: { value: L3(RED_A) }, uRedB: { value: L3(RED_B) }, uTime: { value: 0 }, uFlow: { value: FLOW }, uDash: { value: DASH },
    uDim: { value: 1 }, uX0: { value: -W / 2 }, uLen: { value: W }, uS0: { value: XIN },
    uSelA: { value: new THREE.Vector3() }, uSelB: { value: new THREE.Vector3() }, uFront: { value: 1e3 },
    uE0: { value: -W / 2 - EDGE }, uE1: { value: W / 2 + EDGE },
  };
  const band = new THREE.Mesh(bandGeo, new THREE.ShaderMaterial({ uniforms: bandU, vertexShader: BAND_VS, fragmentShader: BAND_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
  band.renderOrder = 7; band.frustumCulled = false;
  kit.group.add(band);

  // ---- beams in the air: the red coming in; the red leaving, with the new colours riding on it as flashes in turn.
  // Each meets the band on the chip where the band fades out, just past the facet (XJ), and fades in or out over SOFT
  // units there - never over the pale chip (an additive red over it read as a pale pink, hard-edged block)
  const XJ = W / 2 + EDGE - 0.1, YJ = Y * 0.6, SOFT = 0.25, XE = W / 2 + AIR;
  const beams = [];
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), UPV = new THREE.Vector3(0, 1, 0);
  function beam({ r0, r1, rgb = [1, 1, 1], gain = 1, shaded = 0, fadeIn = 0, fadeOut = 0, alpha = false, base = 0.38, white = 0, order = 7, soft = [0, 0] }) {
    const U = {
      uColor: { value: L3(rgb, gain) }, uRedA: { value: bandU.uRedA.value }, uRedB: { value: bandU.uRedB.value }, uTime: { value: 0 },
      uFlow: { value: FLOW }, uDash: { value: DASH }, uLen: { value: 1 }, uS0: { value: 0 }, uFadeIn: { value: fadeIn }, uFadeOut: { value: fadeOut },
      uDim: { value: 1 }, uShaded: { value: shaded }, uPower: { value: 1 }, uAlpha: { value: alpha ? 1 : 0 },
      uEvery: { value: 1 }, uSlot: { value: 0 }, uBase: { value: base }, uWhite: { value: white }, uSoft: { value: new THREE.Vector2() },
    };
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, 20, 1, true), new THREE.ShaderMaterial({
      uniforms: U, vertexShader: BEAM_VS, fragmentShader: BEAM_FS, transparent: true, depthWrite: false,
      blending: alpha ? THREE.NormalBlending : THREE.AdditiveBlending,
    }));
    m.renderOrder = order; m.frustumCulled = false;
    kit.group.add(m);
    const b = {
      U, m,
      ends(ax, ay, az, bx, by, bz) {
        tmpA.set(ax, ay, az); tmpB.set(bx - ax, by - ay, bz - az);
        const len = tmpB.length();
        m.position.copy(tmpA).addScaledVector(tmpB, 0.5);
        m.quaternion.setFromUnitVectors(UPV, tmpB.multiplyScalar(1 / len));
        m.scale.set(1, len, 1);
        U.uLen.value = bx - ax; U.uS0.value = ax - XIN;           // (the flashes counted along x, as on the chip)
        U.uSoft.value.set(soft[0] / len, soft[1] / len);
      },
      set(power) { U.uPower.value = power; m.visible = power > 0.004; },
    };
    beams.push(b);
    return b;
  }
  const inBeam = beam({ r0: 0.18, r1: 0.3, shaded: 1, fadeIn: 1, base: 0.5, soft: [0, SOFT] });
  inBeam.ends(XIN, Y, 0, -XJ, YJ, 0);
  const redOut = beam({ r0: 0.3, r1: 0.2, shaded: 1, fadeOut: 1, base: 0.5, soft: [SOFT, 0] });
  redOut.ends(XJ, YJ, 0, XE, Y, 0);
  // the new colours on it: a thinner cylinder on the same axis (BEADS_FS), drawn after the red
  const beadU = {
    uC1: { value: bandU.uC1.value }, uC2: { value: bandU.uC2.value }, uC3: { value: bandU.uC3.value },
    uSel: { value: new THREE.Vector3() }, uAmp: { value: new THREE.Vector3() }, uTime: { value: 0 }, uFlow: { value: FLOW }, uDash: { value: DASH },
    uLen: { value: XE - XJ }, uS0: { value: XJ - XIN }, uDim: { value: 1 }, uSoft: { value: SOFT / (XE - XJ) },
  };
  const beads = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1, 24, 1, true), new THREE.ShaderMaterial({
    uniforms: beadU, vertexShader: BEAM_VS, fragmentShader: BEADS_FS, transparent: true, depthWrite: false,
  }));
  beads.position.copy(redOut.m.position); beads.quaternion.copy(redOut.m.quaternion); beads.scale.copy(redOut.m.scale);
  beads.renderOrder = 8; beads.frustumCulled = false;
  kit.group.add(beads);
  // where the light in the air runs (its axis), for the glints riding on it
  const airY = x => YJ + (Y - YJ) * clamp01((x - XJ) / (XE - XJ));
  // the colours the chip's last flashes carry (during a rewrite whose front has not reached the exit: the new choice
  // and the old one, as on the chip ahead of the front): the beads take them in turn, each as bright as its colour's
  // light at the exit (a colour chosen but not made yet stays dark)
  const outSel = [false, false, false];
  function placeOut() {
    const ahead = writing && front <= W / 2;
    let k = 0;
    for (let j = 0; j < 3; j++) { outSel[j] = sel[j] || (ahead && selOld[j]); if (outSel[j]) k++; }
    beadU.uSel.value.set(+outSel[0], +outSel[1], +outSel[2]);
    beadU.uAmp.value.set(exitAmp[0], exitAmp[1], exitAmp[2]);
    beads.visible = k > 0 && Math.max(exitAmp[0], exitAmp[1], exitAmp[2]) > 0.015;
    redOut.set(exitRed);
  }
  function setSelUniforms() {
    bandU.uSelA.value.set(+sel[0], +sel[1], +sel[2]);
    bandU.uSelB.value.set(+selOld[0], +selOld[1], +selOld[2]);
    bandU.uFront.value = writing ? front : 1e3;
  }

  // ---- the scan line of a rewrite
  const SCAN_W = 1.0, LEAD = 0.92;              // (its plane: SCAN_W long, the line LEAD of the way along)
  const scanU = { uLevel: { value: 0 }, uDim: { value: 1 }, uLead: { value: LEAD }, uLen: { value: SCAN_W } };
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(SCAN_W, 2 * ZS + 0.3).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: scanU, vertexShader: SCAN_VS, fragmentShader: SCAN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scan.position.y = 0.05; scan.renderOrder = 9; scan.visible = false;
  kit.group.add(scan);

  // ---- glints: star-like sparkles riding with the light, twinkling (most of them below the bloom; a few glint).  A
  // new colour's glints sit on that colour's own flashes; where new colours ride on the red, the red's glitter keeps
  // to the gaps between the flashes (a red sparkle added on a blue flash turned it violet, on violet pink)
  const gPos = new Float32Array(GMAX * 3), gCol = new Float32Array(GMAX * 4), gSize = new Float32Array(GMAX), gRot = new Float32Array(GMAX), gKind = new Float32Array(GMAX);
  const gx = new Float32Array(GMAX), gy = new Float32Array(GMAX), gz = new Float32Array(GMAX), gt = new Float32Array(GMAX), gLife = new Float32Array(GMAX);
  const gS = new Float32Array(GMAX), gB = new Float32Array(GMAX), gK = new Int8Array(GMAX), gR = new Float32Array(GMAX), gG = new Float32Array(GMAX), gBl = new Float32Array(GMAX);
  const gGeo = new THREE.BufferGeometry();
  const gaPos = new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage), gaCol = new THREE.BufferAttribute(gCol, 4).setUsage(THREE.DynamicDrawUsage);
  const gaSize = new THREE.BufferAttribute(gSize, 1).setUsage(THREE.DynamicDrawUsage), gaRot = new THREE.BufferAttribute(gRot, 1).setUsage(THREE.DynamicDrawUsage);
  const gaKind = new THREE.BufferAttribute(gKind, 1).setUsage(THREE.DynamicDrawUsage);
  gGeo.setAttribute('position', gaPos); gGeo.setAttribute('aColor', gaCol); gGeo.setAttribute('aSize', gaSize); gGeo.setAttribute('aRot', gaRot); gGeo.setAttribute('aKind', gaKind);
  gGeo.setDrawRange(0, 0);
  const glintU = { uScale: { value: 600 }, uDim: { value: 1 } };
  const glints = new THREE.Points(gGeo, new THREE.ShaderMaterial({ uniforms: glintU, vertexShader: GLINT_VS, fragmentShader: GLINT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glints.frustumCulled = false; glints.renderOrder = 10;
  glints.onBeforeRender = (renderer, scene, camera) => {
    if (camera && camera.isPerspectiveCamera) glintU.uScale.value = (renderer.domElement.height / 2) / Math.tan(camera.fov * Math.PI / 360);
  };
  kit.group.add(glints);
  const LRED = [SHADE(0.82), SHADE(0.9), SHADE(1.0)].map(lin),          // (crimson to red: added on the red, never orange)
    LCOL = COLOURS.map((c, j) => lin(c.rgb).map(v => v * GAIN[j]));
  let gn = 0, clock = 0, gAcc = 0, cAcc = 0;
  const gauss = () => (R() + R() + R() - 1.5) * 0.8;
  // how strong the light of row r is at x (r = 0: the red, 1-3: the new colours), in the air as it leaves
  const amp = (r, x) => {
    if (x >= W / 2) return r ? exitAmp[r - 1] : exitRed;
    const s = (x + W / 2) / W * (LT - 1), i = Math.max(0, Math.min(LT - 2, Math.floor(s)));
    return light[r][i] + (light[r][i + 1] - light[r][i]) * (s - i);
  };
  // the flashes as the shaders draw them this frame: flash n fills [n, n + 1) DASH from XIN + tNow FLOW, its middle at
  // n + 0.5 (the glints move with them, at FLOW, so a glint put on a flash stays on it)
  let tNow = 0;
  const flashOf = x => Math.floor((x - XIN - tNow * FLOW) / DASH);
  const flashX = (n, ph) => XIN + tNow * FLOW + (n + ph) * DASH;
  // the slot of colour j among the colours the flashes take in turn at x (-1: none of its flashes there); slotK: how many
  let slotK = 1;
  function slotAt(x, j) {
    let k = 0, slot = -1;
    for (let q = 0; q < 3; q++) {
      const on = x > W / 2 ? outSel[q] : sel[q] || (writing && x >= front && selOld[q]);
      if (on) { if (q === j) slot = k; k++; }
    }
    slotK = Math.max(1, k);
    return slot;
  }
  const modK = (n, k) => ((n % k) + k) % k;
  function spawn(kind) {
    if (gn >= GMAX) return;
    let x, y, z;
    if (kind === 0) {
      // the red: along the beam in the air, in the band on the chip, a few in the red leaving
      const w = R();
      if (w < 0.34) { x = XIN + 0.3 + (AIR - 0.3) * R(); y = Y + gauss() * 0.1; z = gauss() * 0.13; }
      else if (w < 0.9) { x = -W / 2 + W * R(); y = 0.08; z = gauss() * HW * 0.55; if (R() > amp(0, x)) return; }
      else { x = W / 2 + AIR * 0.75 * R(); y = Y + gauss() * 0.08; z = gauss() * 0.1; if (R() > exitRed) return; }
      if (x >= XA) x = flashX(flashOf(x), 0.24 * (R() - 0.5));                      // (in the gap between two flashes)
    } else {
      // a new colour: on one of its own flashes, where it grows along the band, then on its beads on the red beam in the air
      const j = kind - 1;
      x = XA + (W / 2 + AIR * 0.55 - XA) * R();
      const slot = slotAt(x, j);
      if (slot < 0) return;
      let n = flashOf(x);
      n += modK(slot - n, slotK);                                                   // (its next flash)
      x = flashX(n, 0.5 + 0.16 * (R() - 0.5));
      if (x > W / 2 + AIR * 0.55 || slotAt(x, j) !== slot || modK(n, slotK) !== slot) return;
      const a = amp(kind, x);
      if (R() > a) return;
      if (x <= W / 2) { y = 0.085; z = gauss() * SW * 0.35 * (0.3 + 0.7 * smooth(0.02, 0.7, a)); }
      else { y = airY(x) + gauss() * 0.03; z = gauss() * 0.05; }                      // (on its bead, on the red beam)
    }
    const i = gn++;
    gx[i] = x; gy[i] = y; gz[i] = z; gt[i] = clock;
    gLife[i] = reduced ? 1.6 + 1.2 * R() : 0.3 + 0.45 * R();
    const hot = !reduced && kind === 0 && R() < 0.08;
    gS[i] = hot ? 0.55 + 0.3 * R() : (kind ? 0.3 : 0.26) + 0.24 * R();
    gB[i] = hot ? 2.1 + 0.6 * R() : (reduced ? 0.4 : 0.5) + 0.5 * R();
    gKind[i] = kind ? 2 : hot ? 1 : 0;
    gRot[i] = R() * Math.PI;
    gK[i] = kind;
    const c = kind ? LCOL[kind - 1] : LRED[Math.floor(R() * 2.999)];
    gR[i] = c[0]; gG[i] = c[1]; gBl[i] = c[2];
  }
  function tickGlints(dt) {
    clock += dt;
    const k = reduced ? 0.35 : 1;
    // the red glitters all the time; the new colours as much as they are made
    gAcc += dt * 150 * k;
    while (gAcc >= 1) { gAcc -= 1; spawn(0); }
    cAcc += dt * 60 * k;
    while (cAcc >= 1) {
      cAcc -= 1;
      const tot = exitAmp[0] + exitAmp[1] + exitAmp[2];
      if (tot < 0.05) continue;
      let r = R() * tot, j = 0;
      while (j < 2 && r > exitAmp[j]) { r -= exitAmp[j]; j++; }
      spawn(j + 1);
    }
    const v = (reduced ? 0.3 : 1) * FLOW * dt;                 // (as the flashes move: kit.onTick below)
    for (let i = gn - 1; i >= 0; i--) {
      if (clock - gt[i] >= gLife[i] || gx[i] > W / 2 + AIR) {
        const l = --gn;                                  // (the last one takes this place)
        gx[i] = gx[l]; gy[i] = gy[l]; gz[i] = gz[l]; gt[i] = gt[l]; gLife[i] = gLife[l]; gS[i] = gS[l]; gB[i] = gB[l];
        gKind[i] = gKind[l]; gRot[i] = gRot[l]; gK[i] = gK[l]; gR[i] = gR[l]; gG[i] = gG[l]; gBl[i] = gBl[l];
        continue;
      }
      gx[i] += v;
    }
    for (let i = 0; i < gn; i++) {
      const s = Math.sin(Math.PI * (clock - gt[i]) / gLife[i]), e = reduced ? s : s * s;
      gPos[3 * i] = gx[i]; gPos[3 * i + 1] = gy[i]; gPos[3 * i + 2] = gz[i];
      const b = gB[i] * (0.35 + 0.65 * e);
      gCol[4 * i] = gR[i] * b; gCol[4 * i + 1] = gG[i] * b; gCol[4 * i + 2] = gBl[i] * b; gCol[4 * i + 3] = e;
      gSize[i] = gS[i] * (0.45 + 0.55 * e);
    }
    gGeo.setDrawRange(0, gn);
    gaPos.needsUpdate = gaCol.needsUpdate = gaSize.needsUpdate = gaRot.needsUpdate = gaKind.needsUpdate = true;
  }

  kit.onTick((dt, t, dim) => {
    tNow = reduced ? t * 0.3 : t;
    bandU.uTime.value = tNow; bandU.uDim.value = dim;
    for (const b of beams) { b.U.uTime.value = tNow; b.U.uDim.value = dim; }
    beadU.uTime.value = tNow; beadU.uDim.value = dim;
    glintU.uDim.value = dim; scanU.uDim.value = dim;
  });

  // ---- plates: one frequency axis (increasing to the right) on both; the pump's red hump near f = 1, made of many
  // fine lines (many shades at once), and on OUT the new colours near F = 2f, as bold bars spread over the plate's
  // right half (a stretch of the axis, as the colours themselves are stretched: as thin lines they bunched up)
  const AX = { lo: 0.62, hi: 2.4 };
  const uAx = f => (f - AX.lo) / (AX.hi - AX.lo);
  const uBar = F => 0.48 + 0.9 * (F - COLOURS[0].F);        // yellow 0.48, blue 0.70, violet 0.88
  const NLINE = 25;
  const lineF = Array.from({ length: NLINE }, (_, i) => PUMP.lo + (PUMP.hi - PUMP.lo) * i / (NLINE - 1));
  const lineRGB = lineF.map(f => kit.colour.css(SHADE(f))), lineGlow = lineF.map(f => kit.colour.css(SHADE(f), 0.22));
  const lineS = lineF.map(pumpAt);
  const flick = new Float32Array(NLINE);
  let sparkLine = -1;
  const MUTED = [0.62, 0.68, 0.74];
  const axisRow = (g, box) => {
    const fs = Math.round(box.h * 0.14), y = box.y + box.h - fs - 8;
    g.save();
    g.strokeStyle = 'rgba(160,185,210,0.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(box.x, y); g.lineTo(box.x + box.w, y); g.stroke();
    g.beginPath(); g.moveTo(box.x + box.w, y); g.lineTo(box.x + box.w - 11, y - 6); g.lineTo(box.x + box.w - 11, y + 6); g.closePath();
    g.fillStyle = 'rgba(160,185,210,0.7)'; g.fill();
    g.restore();
    kit.draw.text(g, kit.word('colour'), box.x + box.w, box.y + box.h, { size: fs, rgb: MUTED, align: 'right', weight: 600 });
    return { x: box.x, w: box.w, base: y - 3, top: box.y + 4 };
  };
  const hump = (g, A, scale, cut) => {
    const H = A.base - A.top;
    g.save(); g.lineCap = 'butt';
    for (let i = 0; i < NLINE; i++) {
      const h = H * scale * lineS[i] * (1 - cut(lineF[i])) * (1 + flick[i]);
      if (h < 1) continue;
      const x = A.x + A.w * uAx(lineF[i]);
      g.strokeStyle = lineGlow[i]; g.lineWidth = 8;
      g.beginPath(); g.moveTo(x, A.base); g.lineTo(x, A.base - h); g.stroke();
      g.strokeStyle = lineRGB[i]; g.lineWidth = 3;
      g.beginPath(); g.moveTo(x, A.base); g.lineTo(x, A.base - h); g.stroke();
      if (i === sparkLine) {                              // a glint at the tip of one line now and then
        g.fillStyle = 'rgba(255,236,236,0.95)';
        g.beginPath(); g.arc(x, A.base - h, 4.5, 0, Math.PI * 2); g.fill();
        g.fillRect(x - 11, A.base - h - 1, 22, 2); g.fillRect(x - 1, A.base - h - 11, 2, 22);
      }
    }
    g.restore();
  };
  const noCut = () => 0;
  const inPlate = kit.plate({ w: 3.0, h: 1.7, at: [-(W / 2 - 1.7), 1.85, -meta.size.d / 2 - 1.3], title: 'in' });
  inPlate.draw((g, box) => { const A = axisRow(g, box); hump(g, A, 0.86, noCut); });
  // OUT: the leftover red (a little less at half the frequency of each colour made), a bar per new colour (its power,
  // from the model)
  const cutOut = f => {
    let c = 0;
    for (let j = 0; j < 3; j++) { const d = (f - COLOURS[j].F / 2) / 0.022; c += 0.55 * outP[j] * Math.exp(-d * d); }
    return Math.min(0.9, c);
  };
  const colCss = COLOURS.map(c => kit.colour.css(c.rgb)), colGlow = COLOURS.map(c => kit.colour.css(c.rgb, 0.3));
  const BAR = 50;                                             // (canvas pixels: about 15 px on the screen at the bench's view)
  const outPlate = kit.plate({ w: 3.0, h: 1.7, at: [W / 2 - 1.7, 1.85, -meta.size.d / 2 - 1.3], title: 'out' });
  outPlate.draw((g, box) => {
    const A = axisRow(g, box), H = A.base - A.top;
    hump(g, A, 0.86 * exitRed, cutOut);
    g.save();
    for (let j = 0; j < 3; j++) {
      const h = H * 0.95 * outP[j];
      if (h < 2) continue;
      const x = A.x + A.w * uBar(COLOURS[j].F);
      g.fillStyle = colGlow[j];
      g.beginPath(); g.roundRect(x - BAR * 0.68, A.base - h - 6, BAR * 1.36, h + 6, [12, 12, 0, 0]); g.fill();
      g.fillStyle = colCss[j];
      g.beginPath(); g.roundRect(x - BAR / 2, A.base - h, BAR, h, [7, 7, 0, 0]); g.fill();
    }
    g.restore();
  });
  let plateAcc = 0, plateSig = '';
  function refreshPlates(dt) {
    plateAcc += dt;
    if (plateAcc < 1 / 12) return;
    plateAcc = 0;
    if (reduced) {                                    // (no flicker: redraw only when something changed)
      const sig = `${kit.lang()}|${+sel[0]}${+sel[1]}${+sel[2]}|${outP[0].toFixed(3)}|${outP[1].toFixed(3)}|${outP[2].toFixed(3)}|${exitRed.toFixed(3)}`;
      if (sig === plateSig) return;
      plateSig = sig;
    } else {                                          // the pump's lines flicker a little, a glint now and then
      for (let i = 0; i < NLINE; i++) flick[i] = 0.1 * (R() - 0.5);
      sparkLine = R() < 0.35 ? Math.floor(R() * NLINE) : -1;
    }
    inPlate.draw(null); outPlate.draw(null);
  }

  // ---- choosing: a new pattern is written along the chip behind a moving front (about a second); the colours change
  // behind it.  When the visitor asked for less motion it is written at once (the bench's own writing still shows the
  // program arriving), as the other programs on this tab switch their patterns
  function choose(s, { instant = false } = {}) {
    if (writing) {
      // (a rewrite already under way: what is written now becomes the old pattern, which then carries the colours of
      // the choice that was being written as well as of the one before it, once the front has written any of it)
      const nf = nfNow();
      for (let j = 0; j < 3; j++) selOld[j] = nf >= NP ? sel[j] : nf > 0 ? selOld[j] || sel[j] : selOld[j];
      old.set(shown); cumulate(old, Ore, Oim);
    } else {
      old.set(target);
      for (let j = 0; j < 3; j++) { Ore[j].set(Ere[j]); Oim[j].set(Eim[j]); selOld[j] = sel[j]; }
    }
    for (let j = 0; j < 3; j++) sel[j] = !!s[j];
    target = grating(sel);
    cumulate(target, Ere, Eim);
    if (instant) settle();
    else { writing = true; front = FRONT0; }
    paintMask(); profile(); placeOut(); setSelUniforms();
    plateAcc = 1;
  }
  function settle() {
    writing = false; front = Infinity;
    old.set(target);
    for (let j = 0; j < 3; j++) { Ore[j].set(Ere[j]); Oim[j].set(Eim[j]); selOld[j] = sel[j]; }
    scan.visible = false;
  }
  const SWEEP_V = (FRONT1 - FRONT0) / 1.05;                          // units per second
  function stepWrite(dt) {
    front += SWEEP_V * dt;
    if (front >= FRONT1) settle();
    else {
      scan.visible = front < XB + 0.5;
      scan.position.x = front - (LEAD - 0.5) * SCAN_W;
      scanU.uLevel.value = smooth(FRONT0, XA, front) * (1 - smooth(XB, XB + 0.5, front));
    }
    paintMask(); profile(); placeOut(); setSelUniforms();
  }

  // ---- left alone, the chip is rewritten with one choice after another (never with the stripes already there)
  const SLOW = reduced ? 2 : 1;
  let cyc = 0, cycT = 0, idleUser = 0;
  const same = s => s.every((v, j) => !!v === sel[j]);
  const startCycle = () => { cyc = 0; cycT = (STEP - FIRST) * SLOW; if (!same(CYCLE[0])) choose(CYCLE[0], { instant: reduced }); };
  choose(CYCLE[0], { instant: true });

  const ID = COLOURS.map(c => c.id);
  return {
    anchors: {
      in: [XIN + 1.2, Y + 0.05, 0],
      stripes: [XA + 1.6, 0.05, -ZS + 0.2],
      out: [W / 2 + 1.4, Y + 0.05, 0],
    },
    // (rgb: the colour each button makes, for a dot on the button once app.js draws one)
    controls: COLOURS.map(c => ({ id: c.id, type: 'toggle', rgb: c.rgb })),
    act(id, v) {
      const j = ID.indexOf(id);
      if (j < 0) return;
      const s = sel.slice();
      s[j] = v === undefined ? !s[j] : !!v;
      // at least one colour stays chosen: with no stripes the chip would be blank under the bench's "Circuit written
      // by light" (the catalog's "No program" shows the blank chip)
      if (s.some(Boolean) && !same(s)) choose(s, { instant: reduced });
      idleUser = IDLE; cycT = STEP * SLOW;            // (the cycle goes on IDLE s after the last touch)
    },
    value(id) { const j = ID.indexOf(id); return j >= 0 ? sel[j] : undefined; },
    status() {
      const n = sel.filter(Boolean).length;
      if (writing) return { key: 'status.write', vars: {} };
      return { key: n === 0 ? 'status.none' : n === 1 ? 'status' : `status.${n}`, vars: {} };
    },
    focus(on) { if (on && idleUser <= 0) startCycle(); },
    reset() {
      idleUser = 0; cyc = 0; cycT = 0; gn = 0; gGeo.setDrawRange(0, 0);
      choose(CYCLE[0], { instant: true });
      plateSig = ''; inPlate.draw(null); outPlate.draw(null);
    },
    update(dt) {
      idleUser = Math.max(0, idleUser - dt);
      if (idleUser <= 0) {
        cycT += dt;
        if (cycT >= STEP * SLOW) {
          cycT = 0;
          do cyc = (cyc + 1) % CYCLE.length; while (same(CYCLE[cyc]));
          choose(CYCLE[cyc], { instant: reduced });
        }
      }
      if (writing) stepWrite(dt);
      tickGlints(dt);
      refreshPlates(dt);
    },
    // read-only, for dev/interact.html and dev/devcheck.js: what is chosen, the pattern on the chip (a number), what
    // comes out, the colours the light leaves with (exit: during a rewrite also those made behind the front)
    get state() {
      return {
        colours: ID.filter((_, j) => sel[j]), pattern: patternId(shown), target: patternId(target), writing,
        front: writing ? clamp01((front - XA) / L) : 1, out: { red: exitRed, yellow: outP[0], blue: outP[1], violet: outP[2] },
        exit: ID.filter((_, j) => outSel[j]), glints: gn, cycle: idleUser <= 0,
      };
    },
  };
}

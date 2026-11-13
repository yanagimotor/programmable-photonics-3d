// Colour language of the whole table (every device uses it, so that a colour means the same thing everywhere):
//
//   colour = frequency of the light.  Redder = lower frequency, bluer = higher.
//   Most of these chips work with infrared light, which is invisible.  We paint it, and we stretch the
//   differences between frequencies so that you can see them (the page says so in its small print).
//
//   ramp(u): u = 0 is telecom infrared (about 1550 nm), painted red, as the papers draw it.
//            u = 0.82 is light at twice that frequency (about 775 nm), painted blue.
//            u < 0 is lower than telecom (deep crimson), u = 1 violet.
//   A device that spreads light over many colours (a comb, a spectrometer, white light) chooses its own
//   u-range; keep it monotonic (higher frequency -> larger u) and keep its telecom light near u = 0.
//
// Colours here are DISPLAY colours (sRGB, 0..1), the way they look on screen.  The 3D materials convert them to
// linear light with lin() (kit/light.js does it for you); the 2D plates use css().
const STOPS = [
  [-0.30, [0.40, 0.02, 0.12]],
  [-0.14, [0.78, 0.02, 0.14]],
  [0.00, [1.00, 0.10, 0.05]],
  [0.15, [1.00, 0.40, 0.05]],
  [0.30, [1.00, 0.78, 0.10]],
  [0.45, [0.42, 1.00, 0.22]],
  [0.62, [0.10, 0.88, 1.00]],
  [0.82, [0.22, 0.45, 1.00]],
  [1.00, [0.58, 0.28, 1.00]],
];

export function ramp(u) {
  if (u <= STOPS[0][0]) return STOPS[0][1].slice();
  for (let i = 1; i < STOPS.length; i++) {
    const [u1, c1] = STOPS[i];
    if (u <= u1) {
      const [u0, c0] = STOPS[i - 1];
      const k = (u - u0) / (u1 - u0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return STOPS[STOPS.length - 1][1].slice();
}

export const IR = ramp(0);            // telecom infrared (about 1550 nm), painted red
export const SH = ramp(0.82);         // twice the frequency (about 775 nm), painted blue
export const WHITE = [1, 0.96, 0.9];  // many colours at once
export const UI = {                   // interface colours (not light)
  text: [0.93, 0.95, 0.97], muted: [0.62, 0.67, 0.72], gold: [0.89, 0.73, 0.30], line: [0.2, 0.25, 0.3],
};

// sum of colours weighted by power, then scaled so that the brightest channel is 1 (hue of a mixture)
export function mix(list) {
  let r = 0, g = 0, b = 0;
  for (const [rgb, w] of list) { r += rgb[0] * w; g += rgb[1] * w; b += rgb[2] * w; }
  const m = Math.max(r, g, b, 1e-9);
  return [r / m, g / m, b / m];
}

// sRGB display value (0..1) -> linear light (for 3D materials and shaders)
const toLin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const lin = rgb => [toLin(rgb[0]), toLin(rgb[1]), toLin(rgb[2])];
export const css = (rgb, a = 1) => `rgba(${Math.round(255 * clamp01(rgb[0]))},${Math.round(255 * clamp01(rgb[1]))},${Math.round(255 * clamp01(rgb[2]))},${a})`;
export const hexNum = rgb => (Math.round(255 * clamp01(rgb[0])) << 16) | (Math.round(255 * clamp01(rgb[1])) << 8) | Math.round(255 * clamp01(rgb[2]));
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

// categories of the jobs (interface tags, not light)
export const CATEGORY = {
  comm: '#5aa9ff',      // communication
  compute: '#4fd17a',   // computing
  sense: '#39d0c4',     // sensing
  metro: '#e3b94d',     // measuring (rulers of light)
  quantum: '#ff7ad9',   // quantum
  convert: '#a98bff',   // colour conversion
};

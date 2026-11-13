// The super glass of tab 3's optical computation, second look.  It takes the place of apps/glass.js, with the same
// interface: the spectacles' lens grows into a clear, gem-like sculpture full of
// bubbles and of holes that open at its surface, which later thins and spreads into a plate exactly over the chip's
// slab.  A picture: the shapes, the bubbles, the veins (the chip's trained 2-D pattern, stacked in layers) and every
// morph are drawn, not computed - a squashed glass would not keep its function.
//
// How it is drawn.  There is no transmission pass (behind the glass there is only the dark room: a second render of
// the scene every frame would buy almost nothing), and no environment texture:
//   - the shell: one icosphere mapped onto three shapes - the lens; the sculpture; the slab - with the positions and
//     normals of all three as attributes, blended in the vertex shader (uMorph, uFlat).  The sculpture is a cut
//     crystal: the solid inside 64 planes tangent to a block that is lobed and twisted along the light (its facets
//     follow the twist), with 22 craters cut into it where bubbles open at its surface (real geometry), on the sides
//     the visitor sees in its pose (turned a little and tipped towards the camera: square on, it read as a flat
//     lozenge).  Its shader finds each pixel's facet among the same planes (exact flat facets, straight edges that
//     catch the light) and lights it with a studio of its own, given as directions: a wall of soft panels all round,
//     each its own brightness, some dark - so that every facet mirrors, or shows through it, a piece of a different one,
//     a mosaic of light and shade as a cut gem shows (with a few lamps only, every facet mirrored the dark room
//     and the glass read as a dark lozenge) - and the key softbox where the scene's key light is, strip lights and small
//     lamps: the reflection (Fresnel, as for a dense glass), the studio seen through
//     it, bent at the surface (red bent a little less than blue: a hint of rainbow at the rims), and on the far side
//     the light reflected inside (totally, beyond the critical angle: a gem's sparkle).  Back faces first, then front
//     faces; premultiplied alpha: it adds its light and hides a little of what lies behind it.
//   - the bubbles: one instanced mesh of small spheres, drawn as air in glass - a bright ring where the light is
//     reflected totally, a clear middle.  They grow while the lens becomes the sculpture, and flatten with the slab.
//   - the sparkles: a dozen small four-pointed stars just outside its surface (one instanced mesh of quads turned to
//     the camera), each flashing now and then in its own rhythm - the glint of a gem; with reduced motion still and
//     faint.  They come with the sculpture and go as it flattens.
//   - the veins: as in glass.js (five layers of the pattern, which land on the chip's pattern when the glass is flat).
//   - the rest of the spectacles: as in glass.js.
// Colours: clear, cool white; the rainbow only as thin fringes (orange means heat on this page, green the programming
// light: neither appears as an area).  The cheap path (quality 'low', or lower() on a slow computer): a coarser shell,
// front faces only, facet normals from the screen, no rainbow, 16 bubbles, a little more of the room seen through the
// body (it has no far side); the same studio and sparkles.
//
//   const glass = createGlass(THREE, { at, slabAt, slabHalf, patternTex, quality, dropH, outline, reduced, selfLower })
//                     (createGem is the same function)
//                     at: the lens's centre on the axis; slabAt, slabHalf: the chip's slab (world centre, half-sizes)
//                     where the flattened glass lies; patternTex: the trained pattern (programs/freeform.js's patTex,
//                     u along the light, v across) for the veins; quality 'low': a coarser shell, front faces only,
//                     fewer bubbles, one refraction sample; outline (optional): { at, half } - the flat glass's own
//                     footprint, if it should spread beyond the slab (the veins still land on the slab); reduced: no
//                     glint sweeping over the glass; selfLower (default true): false keeps the high path on a slow
//                     computer (a dev switch, for frames of the high path under a software renderer)
//   glass.group       add it to the scene (world frame)
//   glass.drop(k)     0: the spectacles hang dropH above the axis (out of view); 1: on the axis (eased)
//   glass.specs(k)    the frame, the temples and the second lens (0..1)
//   glass.shape(morph, flat)   morph: lens -> sculpture (it turns into its pose: yaw -40 deg -> -24, tipped 12 deg
//                     towards the camera); flat: -> slab (it turns square, thins and spreads, and comes down onto the chip)
//   glass.veins(k)    the pale veins inside (0..1)
//   glass.fade(k)     the whole glass (0..1)
//   glass.tick(t, dim)  optional, every frame (kit.onTick): now and then a glint sweeps over the glass (never with
//                     reduced motion), the sparkles; dim: the kit's dim; and after 2 s of frames slower than 50 ms
//                     within the first 12 s that the sculpture is drawn it calls lower() (as app.js drops the bloom on
//                     a weak computer; later slow frames keep the high path).  Without it the glass is still and
//                     undimmed.
//   glass.lower()     the cheap path from now on, as quality 'low' (the coarser shell is made then, once);
//   glass.lowered     true once it is on the cheap path (read-only)
//   glass.state       { drop, specs, morph, flat, veins, fade } (read-only)
//   glass.lensToWorld(x, y, z, out)   a point in the lens's frame -> world (the glasses' rays use it)
//   glass.sculptToWorld(x, y, z, out)   a point in the sculpture's frame, in its pose at morph 1 -> world (the
//                     digits' light in it)
//   glass.info        { vertices, triangles, craters, bubbles, drawn (bubbles drawn), lowered } (the dev page, tests)
//   glass.LENS, glass.BLOCK   the lens's and the sculpture's half-sizes (the light enters the sculpture at x -2.3 and
//                     leaves it at +2.3 of its own frame, within about 0.9 of its axis)
const LENS = [0.14, 0.62, 0.78];                    // the spectacle lens: thin along the light (x)
const BLOCK = [2.4, 1.35, 1.55];                    // the sculpture's reach, lobes included
const BASE = [2.3, 1.2, 1.4], P_BASE = 2.4;         // the sculpture before its lobes, twist and craters
const TWIST = 0.42;                                  // rad, from the middle to each end, about the light's axis
const P_SLAB = 4;                                    // the slab's rounding through its thickness
const YAW0 = -40;                                    // the spectacles: the lens's thin axis to azimuth 50 deg
// the sculpture's pose (degrees): turned a little and tipped towards the visitor, so that its depth, its twist and its
// end show - seen square on it read as a flat lozenge; it turns square again as it flattens
const YAW1 = -24, PITCH1 = 12;
// the camera of the story's part 4 looks from the front (+z), 15 degrees down: the craters open mostly on the sides it
// sees, few on the outline (there, they notched it like bubble wrap)
const CAM_DIR = [0, Math.sin(15 * Math.PI / 180), Math.cos(15 * Math.PI / 180)];
const N_STAR = 12;
const PAIR = 1.9;                                    // the second lens, to the side away from the camera
const VEIN_Y = [-0.8, -0.4, 0, 0.4, 0.8];
const IOR = 1.75, F0 = ((IOR - 1) / (IOR + 1)) ** 2, DISP = 0.03;
const N_CRATER = 22;
const N_BUBBLE = { high: 38, low: 16 };

const f3 = v => `vec3(${v.map(x => x.toFixed(4)).join(', ')})`;
const f1 = x => x.toFixed(4);

// ---------------------------------------------------------------- the studio (world directions)
// rectangles of light round the glass, each given by its direction, its half-sizes on the tangent plane, a soft edge
// and its colour (linear, above 1: they make the glints that bloom)
const LIGHTS = [
  { dir: [-0.38, 0.77, 0.5], half: [0.14, 0.09], soft: 0.025, rgb: [3.3, 3.2, 3.0] },      // the key softbox
  { dir: [0.84, 0.14, 0.52], half: [0.028, 0.8], soft: 0.012, rgb: [2.2, 2.3, 2.6] },      // a strip, front right
  { dir: [-0.88, 0.1, 0.46], half: [0.028, 0.8], soft: 0.012, rgb: [1.9, 2.0, 2.3] },      // a strip, front left
  { dir: [0.05, 1, -0.12], half: [0.32, 0.12], soft: 0.04, rgb: [1.1, 1.15, 1.25] },       // overhead
  { dir: [0.28, 0.32, -0.9], half: [0.3, 0.07], soft: 0.03, rgb: [1.4, 1.45, 1.6] },       // behind: seen through it
];
// the wall of panels round the glass (STUDIO): cells of az x el radians, the share of them left dark (a hash below
// off), their colour (linear; the brightest cells about 1.4 x this)
const WALL = { az: 0.4, el: 0.3, off: 0.42, rgb: [1.15, 1.2, 1.3] };
// and small round lamps all round (above all): each lights a facet now and then - the sparkle; white, a little cool or
// warm (a disc 0.06 rad across, cheaper than a rectangle; small, so that a flat facet seldom takes in the whole lamp)
const LAMPS = [[0.3, 0.9, 0.3], [-0.7, 0.55, -0.45], [0.75, 0.5, -0.4], [-0.15, 0.6, 0.8], [0.55, 0.3, 0.78], [-0.6, 0.25, 0.75],
  [0.1, 0.45, -0.9], [-0.95, 0.3, -0.05], [0.95, 0.25, 0.1], [-0.3, 0.95, -0.2], [0.4, 0.05, 0.92], [-0.45, 0.02, -0.89]]
  .map((dir, i) => ({ dir, rgb: i % 3 === 0 ? [3.4, 3.3, 3.1] : i % 3 === 1 ? [3.0, 3.1, 3.4] : [3.2, 3.2, 3.2] }));
const norm = v => { const L = Math.hypot(...v) || 1; return v.map(x => x / L); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const STUDIO = (() => {
  const terms = LIGHTS.map(L => {
    const c = norm(L.dir), u = norm(cross(Math.abs(c[1]) > 0.9 ? [0, 0, 1] : [0, 1, 0], c)), v = cross(c, u);
    return `  c += ${f3(L.rgb)} * softRect(d, ${f3(c)}, ${f3(u)}, ${f3(v)}, vec2(${f1(L.half[0])}, ${f1(L.half[1])}), ${f1(L.soft)});`;
  }).concat(LAMPS.map(L => `  c += ${f3(L.rgb)} * smoothstep(${f1(Math.cos(0.04))}, ${f1(Math.cos(0.028))}, dot(d, ${f3(norm(L.dir))}));`)).join('\n');
  return /* glsl */ `
uniform float uSweep, uSweepK;
float hash12(vec2 p) { return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453); }
float softRect(vec3 d, vec3 c, vec3 u, vec3 v, vec2 h, float s) {
  float k = dot(d, c);
  if (k < 0.05) return 0.0;
  vec2 p = abs(vec2(dot(d, u), dot(d, v)) / k) - h;
  float e = length(max(p, 0.0)) + min(max(p.x, p.y), 0.0);
  // (brighter in the middle than at the rim: a flat facet that mirrors it shows a gradient, not a plate)
  vec2 q = (p + h) / h;
  return (1.0 - smoothstep(-s, s, e)) * (0.4 + 0.6 * (1.0 - max(q.x * q.x, q.y * q.y)));
}
// the room: dark, a little lighter above; the table below; a faint horizon; the lights; and now and then a strip of
// light that sweeps round in front (uSweep: its azimuth, uSweepK: how bright)
vec3 studio(vec3 d) {
  vec3 c = mix(vec3(0.010, 0.012, 0.017), vec3(0.030, 0.036, 0.048), smoothstep(0.0, 0.9, d.y));
  c = mix(vec3(0.018, 0.019, 0.022), c, smoothstep(-0.08, 0.02, d.y));
  c += vec3(0.05, 0.055, 0.065) * exp(-d.y * d.y * 900.0) + vec3(0.05, 0.055, 0.06) * smoothstep(0.55, 1.0, d.y);
  // a wall of soft panels all round, as a photographer lights glass: each its own brightness (some dark), each brighter
  // in its middle - every facet mirrors, or shows through it, a piece of another one: a mosaic of light and shade,
  // as a cut gem shows (with only a few lamps every facet mirrored the dark room, a dark lozenge)
  float az = atan(d.x, d.z), el = asin(clamp(d.y, -1.0, 1.0));
  vec2 gp = vec2(az / ${f1(WALL.az)}, (el + 0.12) / ${f1(WALL.el)});
  vec2 cell = floor(gp), fq = fract(gp) - 0.5;
  float hh = hash12(cell);
  float lit = step(${f1(WALL.off)}, hh) * (0.3 + 1.1 * hh * hh * hh);
  float pan = (1.0 - smoothstep(0.27, 0.38, max(abs(fq.x), abs(fq.y)))) * (0.55 + 0.45 * (1.0 - 3.0 * dot(fq, fq)));
  float wall = smoothstep(-0.62, -0.2, el) * (1.0 - smoothstep(0.95, 1.3, el));
  c += ${f3(WALL.rgb)} * lit * pan * wall;
${terms}
  if (uSweepK > 0.0) {
    vec3 sc = vec3(sin(uSweep), 0.18, cos(uSweep)) / 1.0161;
    c += vec3(3.4, 3.45, 3.6) * uSweepK * softRect(d, sc, vec3(cos(uSweep), 0.0, -sin(uSweep)), vec3(0.0, 1.0, 0.0), vec2(0.035, 0.9), 0.02);
  }
  return c;
}`;
})();

// ---------------------------------------------------------------- the shell's shaders
const SHELL_VS = /* glsl */ `
#ifdef MORPH
attribute vec3 aMid, aEnd, nMid, nEnd;
attribute float aHole;
uniform float uMorph, uFlat;
varying vec3 vMid;
#endif
varying vec3 vW, vN;
varying float vHole;
void main() {
#ifdef MORPH
  vec3 p = mix(mix(position, aMid, uMorph), aEnd, uFlat);
  vec3 n = mix(mix(normal, nMid, uMorph), nEnd, uFlat);
  vHole = aHole;
  vMid = aMid;
#else
  vec3 p = position;
  vec3 n = normal;
  vHole = 0.0;
#endif
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = mat3(modelMatrix) * n;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const CRIT = 1 / IOR;                                  // sin of the critical angle, glass to air
const SHELL_FS = /* glsl */ `
uniform float uFade, uDisp, uDim, uFacet, uHole, uThru;
varying vec3 vW, vN;
varying float vHole;
#ifdef FACETS
uniform mat4 modelMatrix;              // (the vertex stage's: three declares it there only)
uniform vec4 uPlanes[FACETS];
uniform float uFlat, uExact;
varying vec3 vMid;
#endif
${STUDIO}
// the room seen through the glass: bent at this face, and about as much again where it leaves the body
vec3 through(vec3 V, vec3 N, float ior) {
  vec3 T = refract(V, N, 1.0 / ior);
  return studio(normalize(T + 1.3 * (T - V)));
}
void main() {
  vec3 V = normalize(vW - cameraPosition);
  vec3 Ns = normalize(vN), N = Ns;
  float edge = 0.0, h = vHole * uHole;
#ifdef FACETS
  // the cut crystal: each facet one flat mirror - the face's own normal (from the screen derivatives); at the facets'
  // edges and the craters' rims the vertices' normals (averaged over both sides) depart from it: there the edge catches
  // the light.  Front faces, high quality (uExact): the facet is found exactly - the first of the planes on the ray
  // from the centre through this point of the sculpture (as the mesh was cut) - so its edges are straight lines (the
  // mesh's triangles straddle them in steps), and how much farther the next plane is gives the edge line.  A crater's
  // wall keeps its own curve, and so does the whole glass while it flattens.
  if (uFacet > 0.0) {
    vec3 dn = normalize(cross(dFdx(vW), dFdy(vW)));
    if (dot(dn, Ns) < 0.0) dn = -dn;
    vec3 fN = dn;
    edge = smoothstep(0.1, 0.35, length(Ns - dn));
#ifndef BACK
    if (uExact > 0.5) {
      vec3 u = normalize(vMid);
      float t1 = 1e9, t2 = 1e9;
      int k1 = 0;
      for (int k = 0; k < FACETS; k++) {
        float c = dot(uPlanes[k].xyz, u);
        if (c > 1e-4) { float t = uPlanes[k].w / c; if (t < t1) { t2 = t1; t1 = t; k1 = k; } else if (t < t2) t2 = t; }
      }
      float own = max(smoothstep(0.0, 0.6, vHole), smoothstep(0.0, 0.35, uFlat));
      fN = mix(normalize(mat3(modelMatrix) * uPlanes[k1].xyz), dn, own);
      float gap = (t2 - t1) / t1;
      edge = max((1.0 - smoothstep(0.0, 1.6 * fwidth(gap) + 1e-5, gap)) * (1.0 - own), edge * smoothstep(0.0, 0.3, vHole));
    }
#endif
    N = normalize(mix(Ns, fN, uFacet));
    edge *= uFacet;
  }
#endif
#ifdef BACK
  // the far side, from inside: the light reflected back inside (all of it beyond the critical angle - the sparkle of a
  // gem); what leaves through it, the front faces show
  float c = clamp(dot(V, N), 0.0, 1.0);
  float s = sqrt(1.0 - c * c);
  float tir = smoothstep(${f1(CRIT - 0.03)}, ${f1(CRIT + 0.03)}, s);
  float F = mix(${f1(F0)} + ${f1(1 - F0)} * pow(1.0 - c, 5.0), 1.0, tir);
  vec3 col = studio(reflect(V, -N)) * F * 0.12;
  float a = 0.04;
#else
  float c = abs(dot(V, N));   // (abs: a normal that disagrees with the surface mid-morph must not turn it into a mirror)
  float F = ${f1(F0)} + ${f1(1 - F0)} * pow(1.0 - c, 5.0);
  vec3 refl = studio(reflect(V, N));
  // (a hint of rainbow: red bent a little less, blue a little more, green between them)
  vec3 thru;
  if (uDisp > 0.0) { vec3 r = through(V, N, ${f1(IOR)} - uDisp), b = through(V, N, ${f1(IOR)} + uDisp); thru = vec3(r.r, 0.5 * (r.g + b.g), b.b); }
  else thru = through(V, N, ${f1(IOR)});
  vec3 col = refl * F + thru * (1.0 - F) * uThru * vec3(1.0, 1.08, 1.18);
  // the wall of an opened bubble, lit as a bubble's: bright where it is seen at a slant
  col += h * (refl * smoothstep(0.3, 0.8, 1.0 - c) * 0.5 + vec3(0.32, 0.37, 0.46) * pow(1.0 - c, 2.0) * 0.5);
  col += edge * (vec3(0.04, 0.045, 0.055) + refl * 0.6);
  float a = 0.05 + 0.45 * F + 0.2 * h + 0.08 * edge;
#endif
  gl_FragColor = vec4(col * uDim, a) * uFade;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- the bubbles' shaders (instanced)
const BUBBLE_VS = /* glsl */ `
varying vec3 vW, vN;
void main() {
  vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
  // (each bubble is only moved and scaled: its normals are scaled by the inverse)
  vec3 s = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vN = mat3(modelMatrix) * (normal / max(s, vec3(1e-5)));
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BUBBLE_FS = /* glsl */ `
uniform float uLevel, uDim;
varying vec3 vW, vN;
${STUDIO}
void main() {
  vec3 V = normalize(vW - cameraPosition);
  vec3 N = normalize(vN);
  float c = clamp(-dot(V, N), 0.0, 1.0);
  float s = sqrt(1.0 - c * c);
  // glass to air: beyond the critical angle the bubble's wall reflects all the light (a bright ring); inside it the
  // light goes through (a clear middle)
  float ring = smoothstep(${f1(CRIT - 0.07)}, ${f1(CRIT + 0.05)}, s);
  vec3 col = studio(reflect(V, N)) * (0.1 + 0.9 * ring) + vec3(0.5, 0.58, 0.72) * pow(s, 12.0) * 0.55;
  float a = 0.03 + 0.3 * ring;
  gl_FragColor = vec4(col * uDim, a) * uLevel;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- the sparkles (instanced, turned to the camera)
// a four-pointed star of light where an edge of the gem catches a lamp: one now and then, each in its own rhythm (with
// reduced motion: still and faint, no flashing)
const STAR_VS = /* glsl */ `
attribute float aPhase;
uniform float uTime, uLevel, uSize;
varying vec2 vUv;
varying float vK;
void main() {
  vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float k = uTime > 0.0 ? pow(max(0.0, sin(uTime * 1.7 + aPhase)), 14.0) : 0.35;
  vK = k * uLevel;
  mv.xy += position.xy * uSize * (0.45 + 0.55 * k);
  vUv = position.xy * 2.0;
  gl_Position = projectionMatrix * mv;
}`;
const STAR_FS = /* glsl */ `
uniform float uDim;
varying vec2 vUv;
varying float vK;
void main() {
  vec2 p = abs(vUv);
  float r2 = dot(vUv, vUv);
  float rays = exp(-p.x * 9.0) * exp(-p.y * p.y * 600.0) + exp(-p.y * 9.0) * exp(-p.x * p.x * 600.0);
  vec2 q = abs(vec2(vUv.x + vUv.y, vUv.x - vUv.y)) * 0.7071;
  rays += 0.35 * (exp(-q.x * 16.0) * exp(-q.y * q.y * 900.0) + exp(-q.y * 16.0) * exp(-q.x * q.x * 900.0));
  float s = (rays + 1.6 * exp(-r2 * 60.0)) * (1.0 - smoothstep(0.7, 1.0, sqrt(r2)));
  gl_FragColor = vec4(vec3(1.0, 1.0, 1.08) * s * vK * 2.2 * uDim, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- the veins (glass.js's, inside the twisted sculpture)
const VEIN_VS = /* glsl */ `
attribute vec2 aC;
attribute float aL;
uniform vec3 uBlock, uSlab;
uniform float uFlat;
varying vec2 vUv;
varying vec3 vP;
void main() {
  float hx = mix(uBlock.x, uSlab.x, uFlat), hz = mix(uBlock.z, uSlab.z, uFlat);
  vec3 p = vec3(aC.x * hx, mix(aL, uSlab.y + 0.004, uFlat), aC.y * hz);
  vUv = vec2(0.5 + 0.5 * aC.x, 0.5 - 0.5 * aC.y);
  vP = vec3(aC.x * uBlock.x, aL, aC.y * uBlock.z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
// pale veins: the pattern's bright lines, inside the sculpture's cross-section at the layer's height (its twist undone,
// a soft edge); flat, the five layers lie on the slab, each a fifth as bright
const VEIN_FS = /* glsl */ `
uniform sampler2D uPat;
uniform vec3 uCol;
uniform float uLevel, uFlat;
varying vec2 vUv;
varying vec3 vP;
void main() {
  float u = vP.x / ${f1(BASE[0])}, tw = -${f1(TWIST)} * u, ct = cos(tw), st = sin(tw), tp = 1.0 - 0.1 * u * u;
  float y = (vP.y * ct - vP.z * st) / (${f1(BASE[1])} * tp), z = (vP.y * st + vP.z * ct) / (${f1(BASE[2])} * tp);
  float m = pow(abs(u), ${f1(P_BASE)}) + pow(abs(y), ${f1(P_BASE)}) + pow(abs(z), ${f1(P_BASE)});
  float mask = mix(1.0 - smoothstep(0.55, 0.78, m), 1.0, uFlat);
  float v = texture2D(uPat, vUv).g;
  float k = mix(1.0, 0.2, uFlat);
  gl_FragColor = vec4(uCol * smoothstep(0.25, 0.95, v) * mask * uLevel * k, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- geometry helpers
// a sphere direction d onto a superquadric of half-sizes h and exponent p (|x/hx|^p + ... = 1): x_i = h_i sgn(d_i)
// |d_i|^(2/p) - the same angular place on every shape, so that the morphs stay smooth
const onShape = (d, h, p, out) => { for (let i = 0; i < 3; i++) out[i] = h[i] * Math.sign(d[i]) * Math.pow(Math.abs(d[i]), 2 / p); return out; };
// the sculpture's lobes, twist, taper and arch, applied to a point of the plain superquadric (on it or inside it)
const deform = (q, out) => {
  const x = q[0], y = q[1], z = q[2], u = x / BASE[0], ang = Math.atan2(z, y);
  const lobe = 1 + 0.07 * Math.sin(3 * ang + 1.6 * u + 0.5) + 0.045 * Math.sin(5 * ang - 2.2 * u + 1.3);
  const tw = TWIST * u, c = Math.cos(tw), s = Math.sin(tw), k = lobe * (1 - 0.1 * u * u);
  out[0] = x * (1 + 0.03 * Math.sin(2 * ang));
  out[1] = (y * c - z * s) * k + 0.1 * (1 - u * u) - 0.05;
  out[2] = (y * s + z * c) * k;
  return out;
};
// an icosphere (unit directions, indexed): even vertices everywhere, so that the craters come out round
function icosphere(detail) {
  const t = (1 + Math.sqrt(5)) / 2;
  const P = [];
  for (const p of [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]) {
    const L = Math.hypot(...p); P.push(p[0] / L, p[1] / L, p[2] / L);
  }
  let F = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
  for (let k = 0; k < detail; k++) {
    const cache = new Map(), next = [];
    const mid = (a, b) => {
      const key = a < b ? a * 1048576 + b : b * 1048576 + a;
      let i = cache.get(key);
      if (i === undefined) {
        const x = P[3 * a] + P[3 * b], y = P[3 * a + 1] + P[3 * b + 1], z = P[3 * a + 2] + P[3 * b + 2], L = Math.hypot(x, y, z);
        i = P.length / 3; P.push(x / L, y / L, z / L); cache.set(key, i);
      }
      return i;
    };
    for (let f = 0; f < F.length; f += 3) {
      const a = F[f], b = F[f + 1], c = F[f + 2], ab = mid(a, b), bc = mid(b, c), ca = mid(c, a);
      next.push(a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca);
    }
    F = next;
  }
  return { dirs: Float32Array.from(P), index: F };
}
// a seeded random generator (the sculpture looks the same every time)
const rng = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

export function createGlass(THREE, { at = [6, 2.9, 0], slabAt = [5.796, 0.57, 0], slabHalf = [3.671, 0.015, 2.594], patternTex = null,
  quality = 'high', dropH = 6, outline = null, reduced = false, facets = 64, selfLower = true } = {}) {
  const low = quality === 'low';
  const group = new THREE.Group(), turn = new THREE.Group();
  group.add(turn);
  const deg = THREE.MathUtils.degToRad;
  // the flat glass's footprint (relative to slabAt) and half-sizes: the slab's, unless an outline is given
  const OFF = outline ? [0, 1, 2].map(i => outline.at[i] - slabAt[i]) : [0, 0, 0];
  const OUT_H = outline ? [outline.half[0], slabHalf[1], outline.half[2]] : slabHalf;

  // ---------------------------------------------------------------- the materials (shared uniforms: one tick)
  // (thruU: how much of the room shows through the body - a little more on the cheap path, which has no far side)
  const sweepU = { uSweep: { value: 0 }, uSweepK: { value: 0 } }, dimU = { value: 1 }, dispU = { value: low ? 0 : DISP }, thruU = { value: low ? 0.5 : 0.38 };
  const morphU = { value: 0 }, flatU = { value: 0 }, facetU = { value: 0 }, holeU = { value: 0 }, exactU = { value: low ? 0 : 1 };
  const shellMat = (back, fadeU, morph) => new THREE.ShaderMaterial({
    uniforms: { ...sweepU, uFade: fadeU, uDisp: dispU, uDim: dimU, uThru: thruU, uMorph: morphU, uFlat: flatU, uFacet: morph ? facetU : { value: 0 }, uHole: morph ? holeU : { value: 0 }, ...(morph && planes.length ? { uPlanes: planeU, uExact: exactU } : {}) },
    defines: { ...(back ? { BACK: '' } : {}), ...(morph ? { MORPH: '' } : {}), ...(morph && planes.length ? { FACETS: planes.length } : {}) },
    vertexShader: SHELL_VS, fragmentShader: SHELL_FS,
    transparent: true, premultipliedAlpha: true, depthWrite: false, side: back ? THREE.BackSide : THREE.FrontSide,
  });
  const fadeU = { value: 1 }, specU = { value: 1 };
  const pairOf = (geo, fU, parent, morph, name) => {
    const out = [];
    if (!low) { const b = new THREE.Mesh(geo, shellMat(true, fU, morph)); b.renderOrder = 4; b.name = name + '-back'; parent.add(b); out.push(b); }
    const f = new THREE.Mesh(geo, shellMat(false, fU, morph)); f.renderOrder = 5; f.name = name + '-front'; parent.add(f); out.push(f);
    return out;
  };
  const normalsOf = (arr, index) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    const out = g.attributes.normal.array;
    g.dispose();
    return out;
  };

  // ---------------------------------------------------------------- the shape: facets and craters
  // (from the shape itself - the sculpted body's point for a direction, and its outward normal by finite differences -
  // so that either quality, and the shell lower() makes, get the same facets, craters and bubbles)
  const d = [0, 0, 0], q = [0, 0, 0], r3 = [0, 0, 0];
  const R = rng(20261030);
  const smoothAt = (dir, out) => deform(onShape(dir, BASE, P_BASE, q), out);
  const frameAt = (dir, S, N) => {
    smoothAt(dir, S);
    const t1 = norm(cross(Math.abs(dir[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], dir)), t2 = cross(dir, t1), S1 = [0, 0, 0], S2 = [0, 0, 0];
    smoothAt(norm(dir.map((v, i) => v + 1e-3 * t1[i])), S1);
    smoothAt(norm(dir.map((v, i) => v + 1e-3 * t2[i])), S2);
    const m = norm(cross([S1[0] - S[0], S1[1] - S[1], S1[2] - S[2]], [S2[0] - S[0], S2[1] - S[1], S2[2] - S[2]]));
    const sg = m[0] * S[0] + m[1] * S[1] + m[2] * S[2] < 0 ? -1 : 1;
    N[0] = sg * m[0]; N[1] = sg * m[1]; N[2] = sg * m[2];
  };
  // the facets: planes tangent to the sculpted body at `facets` directions, spread evenly and a little irregularly; the
  // sculpture is the solid inside all of them - a cut crystal whose facets follow the twist and the lobes
  const planes = [];
  for (let k = 0; k < facets; k++) {
    const y = 1 - 2 * (k + 0.5) / facets, r = Math.sqrt(1 - y * y), ph = k * 2.399963;
    const dir = norm([r * Math.cos(ph) + 0.24 * (R() - 0.5), y + 0.24 * (R() - 0.5), r * Math.sin(ph) + 0.24 * (R() - 0.5)]);
    const S = [0, 0, 0], N = [0, 0, 0];
    frameAt(dir, S, N);
    planes.push([N[0], N[1], N[2], N[0] * S[0] + N[1] * S[1] + N[2] * S[2]]);
  }
  const planeU = { value: planes.map(p => new THREE.Vector4(p[0], p[1], p[2], p[3])) };
  // (a point of the body -> the crystal's surface on the ray from the centre through it; -> the plane's index, or -1)
  const cut = (P, out) => {
    const L = Math.hypot(P[0], P[1], P[2]) || 1, ux = P[0] / L, uy = P[1] / L, uz = P[2] / L;
    let t = Infinity, best = -1;
    for (let k = 0; k < planes.length; k++) {
      const p = planes[k], c = p[0] * ux + p[1] * uy + p[2] * uz;
      if (c > 1e-4 && p[3] / c < t) { t = p[3] / c; best = k; }
    }
    if (best < 0) { out[0] = P[0]; out[1] = P[1]; out[2] = P[2]; return -1; }
    out[0] = ux * t; out[1] = uy * t; out[2] = uz * t;
    return best;
  };
  // the craters: spheres that cut the sculpture's surface (bubbles opened by it), on the sides the visitor sees in the
  // sculpture's pose (facing the camera), few where the surface turns away into the outline (there they notched it)
  const craters = [];
  const camL = (() => {          // the camera's direction in the sculpture's own frame (its pose undone: Rx then Ry)
    const p = THREE.MathUtils.degToRad(-PITCH1), y = THREE.MathUtils.degToRad(-YAW1), c = CAM_DIR;
    const a = [c[0], c[1] * Math.cos(p) - c[2] * Math.sin(p), c[1] * Math.sin(p) + c[2] * Math.cos(p)];
    return [a[0] * Math.cos(y) + a[2] * Math.sin(y), a[1], -a[0] * Math.sin(y) + a[2] * Math.cos(y)];
  })();
  {
    const cand = [0, 0, 0], S = [0, 0, 0], N = [0, 0, 0], tries = 6000;
    for (let k = 0; k < tries && craters.length < N_CRATER; k++) {
      const z = 2 * R() - 1, ph = 2 * Math.PI * R(), rr = Math.sqrt(1 - z * z);
      cand[0] = rr * Math.cos(ph); cand[1] = rr * Math.sin(ph); cand[2] = z;
      frameAt(cand, S, N);
      const pk = planes.length ? cut(S, S) : -1;
      if (pk >= 0) { N[0] = planes[pk][0]; N[1] = planes[pk][1]; N[2] = planes[pk][2]; }
      const facing = N[0] * camL[0] + N[1] * camL[1] + N[2] * camL[2];
      if (facing < 0.42 && R() > 0.06) continue;
      // (the bubble's centre just under the surface: a round bowl, as a bubble cut open at its middle - no wall)
      const r = 0.13 + 0.26 * Math.pow(R(), 1.4), depth = 0.12 * R() * r;
      if (craters.some(c => Math.hypot(c.s[0] - S[0], c.s[1] - S[1], c.s[2] - S[2]) < (c.r + r) * 1.08)) continue;
      craters.push({ s: [...S], r, c: [S[0] - N[0] * depth, S[1] - N[1] * depth, S[2] - N[2] * depth] });
    }
  }

  // ---------------------------------------------------------------- the shell: lens, sculpture, slab
  // the slab: the sculpture's footprint (its plain superquadric's) stretched out radially onto the rectangle - the
  // vertices keep their places, so that the glass thins and spreads evenly; 0.03 thick, rounded through its thickness
  const toSlab = (dx, dy, dz, out) => {
    const a = Math.sign(dx) * Math.pow(Math.abs(dx), 2 / P_BASE), b = Math.sign(dz) * Math.pow(Math.abs(dz), 2 / P_BASE);
    const rp = Math.pow(Math.pow(Math.abs(a), P_BASE) + Math.pow(Math.abs(b), P_BASE), 1 / P_BASE), ri = Math.max(Math.abs(a), Math.abs(b));
    const k = ri > 1e-9 ? rp / ri : 1;
    out[0] = OFF[0] + OUT_H[0] * a * k;
    out[1] = OFF[1] + OUT_H[1] * Math.sign(dy) * Math.pow(Math.abs(dy), 2 / P_SLAB);
    out[2] = OFF[2] + OUT_H[2] * b * k;
    return out;
  };
  // the shell at one resolution (an icosphere of that detail): built once, and once more by lower() (a coarser one)
  const shellGeo = detail => {
    const ico = icosphere(detail), dirs = ico.dirs, n = dirs.length / 3;
    const lensP = new Float32Array(3 * n), midP = new Float32Array(3 * n), endP = new Float32Array(3 * n), hole = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      d[0] = dirs[3 * i]; d[1] = dirs[3 * i + 1]; d[2] = dirs[3 * i + 2];
      onShape(d, LENS, 2, q); lensP.set(q, 3 * i);
      deform(onShape(d, BASE, P_BASE, q), r3);
      if (planes.length) cut(r3, r3);
      midP.set(r3, 3 * i);
      toSlab(d[0], d[1], d[2], q); endP.set(q, 3 * i);
    }
    // (in a crater the vertices move along the surface's inward normal onto its far wall)
    const midN0 = normalsOf(midP, ico.index);
    for (let i = 0; i < n; i++) {
      let x = midP[3 * i], y = midP[3 * i + 1], z = midP[3 * i + 2];
      const nx = midN0[3 * i], ny = midN0[3 * i + 1], nz = midN0[3 * i + 2];
      for (const c of craters) {
        const ex = x - c.c[0], ey = y - c.c[1], ez = z - c.c[2], e2 = ex * ex + ey * ey + ez * ez;
        if (e2 >= c.r * c.r) continue;
        const b = nx * ex + ny * ey + nz * ez, t = b + Math.sqrt(b * b - e2 + c.r * c.r);
        x -= nx * t; y -= ny * t; z -= nz * t; hole[i] = 1;
      }
      midP[3 * i] = x; midP[3 * i + 1] = y; midP[3 * i + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setIndex(n < 65536 ? new THREE.Uint16BufferAttribute(ico.index, 1) : new THREE.Uint32BufferAttribute(ico.index, 1));
    geo.setAttribute('position', new THREE.Float32BufferAttribute(lensP, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normalsOf(lensP, ico.index), 3));
    geo.setAttribute('aMid', new THREE.Float32BufferAttribute(midP, 3));
    geo.setAttribute('nMid', new THREE.Float32BufferAttribute(normalsOf(midP, ico.index), 3));
    geo.setAttribute('aEnd', new THREE.Float32BufferAttribute(endP, 3));
    geo.setAttribute('nEnd', new THREE.Float32BufferAttribute(normalsOf(endP, ico.index), 3));
    geo.setAttribute('aHole', new THREE.Float32BufferAttribute(hole, 1));
    return geo;
  };
  const SHELL_LOW = 5, SHELL_HIGH = 6;
  const shell = pairOf(shellGeo(low ? SHELL_LOW : SHELL_HIGH), fadeU, turn, true, 'gem');
  for (const m of shell) m.frustumCulled = false;

  // ---------------------------------------------------------------- the bubbles inside
  // points inside the plain superquadric (clear of its surface and of the craters, apart from each other), carried
  // by the sculpture's deformation; in the lens they shrink to nothing, in the slab they lie flat in its footprint
  const NB = N_BUBBLE[low ? 'low' : 'high'], bub = [];
  {
    const u = [0, 0, 0], P = [0, 0, 0];
    for (let k = 0; k < 6000 && bub.length < N_BUBBLE.high; k++) {
      u[0] = 2 * R() - 1; u[1] = 2 * R() - 1; u[2] = 2 * R() - 1;
      const r = 0.06 + 0.24 * Math.pow(R(), 2.2);
      const m = Math.pow(Math.pow(Math.abs(u[0]), P_BASE) + Math.pow(Math.abs(u[1]), P_BASE) + Math.pow(Math.abs(u[2]), P_BASE), 1 / P_BASE);
      if (m > 0.86 - r / 1.2) continue;
      q[0] = u[0] * BASE[0]; q[1] = u[1] * BASE[1]; q[2] = u[2] * BASE[2];
      deform(q, P);
      if (bub.some(b => Math.hypot(b.mid[0] - P[0], b.mid[1] - P[1], b.mid[2] - P[2]) < (b.r + r) * 1.15)) continue;
      if (craters.some(c => Math.hypot(c.c[0] - P[0], c.c[1] - P[1], c.c[2] - P[2]) < c.r + r + 0.05)) continue;
      // (its place in the slab: its footprint stretched as the shell's, flat in the middle of the thickness)
      const a = u[0], b = u[2], rp = Math.pow(Math.pow(Math.abs(a), P_BASE) + Math.pow(Math.abs(b), P_BASE), 1 / P_BASE), ri = Math.max(Math.abs(a), Math.abs(b));
      const ks = ri > 1e-9 ? rp / ri : 1;
      bub.push({ r, lens: [u[0] * LENS[0], u[1] * LENS[1], u[2] * LENS[2]], mid: [...P],
        end: [OFF[0] + OUT_H[0] * a * ks * 0.92, OFF[1] + u[1] * OUT_H[1] * 0.4, OFF[2] + OUT_H[2] * b * ks * 0.92] });
    }
  }
  const bubU = { ...sweepU, uLevel: { value: 0 }, uDim: dimU };
  const bubGeo = (() => {
    const s = icosphere(low ? 1 : 2), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(s.dirs, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(s.dirs, 3));
    g.setIndex(s.index);
    return g;
  })();
  const bubbles = new THREE.InstancedMesh(bubGeo, new THREE.ShaderMaterial({ uniforms: bubU, vertexShader: BUBBLE_VS, fragmentShader: BUBBLE_FS,
    transparent: true, premultipliedAlpha: true, depthWrite: false }), bub.length);
  bubbles.count = Math.min(NB, bub.length);
  bubbles.name = 'gem-bubbles'; bubbles.renderOrder = 4.3; bubbles.frustumCulled = false; bubbles.visible = false;
  turn.add(bubbles);
  const M4 = new THREE.Matrix4(), Q4 = new THREE.Quaternion(), V3 = new THREE.Vector3(), S3 = new THREE.Vector3();
  let bubKey = -1;
  // the bubbles' places and sizes for the shape now (only when it changes)
  const placeBubbles = () => {
    const g = smooth(0.3, 1.0, st.morph), m = st.morph, f = st.flat;
    const key = m * 1e4 + f;
    if (key === bubKey) return;
    bubKey = key;
    // (as the glass flattens they spread with it and thin to discs)
    const sx = 1 + f * (OUT_H[0] / BASE[0] - 1), sy = 1 - f * 0.985, sz = 1 + f * (OUT_H[2] / BASE[2] - 1);
    for (let i = 0; i < bubbles.count; i++) {
      const b = bub[i], k = b.r * g;
      V3.set(b.lens[0] + (b.mid[0] - b.lens[0]) * m, b.lens[1] + (b.mid[1] - b.lens[1]) * m, b.lens[2] + (b.mid[2] - b.lens[2]) * m);
      V3.set(V3.x + (b.end[0] - V3.x) * f, V3.y + (b.end[1] - V3.y) * f, V3.z + (b.end[2] - V3.z) * f);
      M4.compose(V3, Q4, S3.set(Math.max(1e-4, k * sx), Math.max(1e-4, k * sy), Math.max(1e-4, k * sz)));
      bubbles.setMatrixAt(i, M4);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  };

  // ---------------------------------------------------------------- the sparkles
  // (at points of the cut surface on the sides the visitor sees in the sculpture's pose, just outside it; one instanced
  // mesh of small quads turned to the camera, added to the picture)
  const starU = { uTime: { value: 0 }, uLevel: { value: 0 }, uSize: { value: 0.62 }, uDim: dimU };
  const stars = (() => {
    const geo = new THREE.PlaneGeometry(1, 1), at = [], ph = [];
    const S = [0, 0, 0], N = [0, 0, 0], u = [0, 0, 0];
    for (let k = 0; k < 2000 && at.length < N_STAR; k++) {
      u[0] = 2 * R() - 1; u[1] = 2 * R() - 1; u[2] = 2 * R() - 1;
      const L = Math.hypot(u[0], u[1], u[2]);
      if (L < 0.2 || L > 1) continue;
      u[0] /= L; u[1] /= L; u[2] /= L;
      frameAt(u, S, N);
      const pk = planes.length ? cut(S, S) : -1;
      if (pk >= 0) { N[0] = planes[pk][0]; N[1] = planes[pk][1]; N[2] = planes[pk][2]; }
      if (N[0] * camL[0] + N[1] * camL[1] + N[2] * camL[2] < 0.25) continue;
      if (at.some(a => Math.hypot(a[0] - S[0], a[1] - S[1], a[2] - S[2]) < 0.75)) continue;
      at.push([S[0] + 0.04 * N[0], S[1] + 0.04 * N[1], S[2] + 0.04 * N[2]]);
      ph.push(2 * Math.PI * at.length * 0.618 + 0.7 * R());
    }
    const m = new THREE.InstancedMesh(geo, new THREE.ShaderMaterial({ uniforms: starU, vertexShader: STAR_VS, fragmentShader: STAR_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), at.length);
    at.forEach((a, i) => m.setMatrixAt(i, M4.makeTranslation(a[0], a[1], a[2])));
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(Float32Array.from(ph), 1));
    m.name = 'gem-stars'; m.renderOrder = 6; m.frustumCulled = false; m.visible = false;
    turn.add(m);
    return m;
  })();

  // ---------------------------------------------------------------- the rest of the spectacles
  const specs = new THREE.Group();
  specs.name = 'specs';
  turn.add(specs);
  const lens2 = new THREE.Group();
  lens2.position.z = -PAIR;
  specs.add(lens2);
  const lens2Geo = (() => {
    const s = icosphere(3), m = s.dirs.length / 3, p = new Float32Array(3 * m);
    for (let i = 0; i < m; i++) { d[0] = s.dirs[3 * i]; d[1] = s.dirs[3 * i + 1]; d[2] = s.dirs[3 * i + 2]; p.set(onShape(d, LENS, 2, q), 3 * i); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normalsOf(p, s.index), 3));
    g.setIndex(s.index);
    return g;
  })();
  const lens2Mesh = pairOf(lens2Geo, specU, lens2, false, 'lens2');
  // (the same small lens stands in for the shell while it is only the lens - parts 1 to 3: the 41 k vertices of the
  // shell are not drawn for it)
  const lens1 = pairOf(lens2Geo, fadeU, turn, false, 'lens1');
  // (a light metal with a faint glow of its own: a dark frame vanished against the dark room)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xaab4bf, roughness: 0.3, metalness: 0.5, transparent: true,
    emissive: new THREE.Color(0.32, 0.36, 0.42), emissiveIntensity: 0.35 });
  const tube = (pts, r, closed = false, seg = 48) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), closed, 'centripetal');
    const m = new THREE.Mesh(new THREE.TubeGeometry(c, seg, r, 8, closed), frameMat);
    specs.add(m);
    return m;
  };
  // a rim around each lens, the bridge, the temples back towards the wearer (the screen), hooked down at the end
  const rim = z0 => tube(Array.from({ length: 24 }, (_, i) => { const a = i / 24 * Math.PI * 2; return [0, (LENS[1] + 0.03) * Math.sin(a), z0 + (LENS[2] + 0.03) * Math.cos(a)]; }), 0.055, true, 72);
  rim(0); rim(-PAIR);
  tube([[0, 0.2, -LENS[2] - 0.02], [0, 0.34, -PAIR / 2], [0, 0.2, -PAIR + LENS[2] + 0.02]], 0.05);
  // (short, and opened outwards: they must stay clear of the light behind the lens)
  const temple = (z0, s) => tube([[0, 0.24, z0], [0.16, 0.27, z0 + 0.08 * s], [1.0, 0.27, z0 + 0.22 * s], [1.6, 0.24, z0 + 0.3 * s], [1.8, 0.06, z0 + 0.32 * s], [1.86, -0.16, z0 + 0.31 * s]], 0.045);
  temple(LENS[2] + 0.04, 1); temple(-PAIR - LENS[2] - 0.04, -1);

  // ---------------------------------------------------------------- the veins: the trained pattern, in five layers
  let veinMesh = null;
  const veinU = { uPat: { value: patternTex }, uBlock: { value: new THREE.Vector3(BASE[0] * 0.92, BASE[1], BASE[2] * 0.92) }, uSlab: { value: new THREE.Vector3(...slabHalf) },
    uFlat: flatU, uLevel: { value: 0 }, uCol: { value: new THREE.Vector3(0.75, 0.85, 1.0).multiplyScalar(0.12) } };
  if (patternTex) {
    const C = [], L = [], idx = [];
    VEIN_Y.forEach((y, k) => {
      for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { C.push(cx, cz); L.push(y); }
      const o = 4 * k; idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    });
    const vg = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(3 * C.length / 2), 3));
    vg.setAttribute('aC', new THREE.Float32BufferAttribute(C, 2));
    vg.setAttribute('aL', new THREE.Float32BufferAttribute(L, 1));
    vg.setIndex(idx);
    veinMesh = new THREE.Mesh(vg, new THREE.ShaderMaterial({ uniforms: veinU, vertexShader: VEIN_VS, fragmentShader: VEIN_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    veinMesh.name = 'gem-veins'; veinMesh.renderOrder = 4.5; veinMesh.frustumCulled = false; veinMesh.visible = false;
    turn.add(veinMesh);
  }

  // ---------------------------------------------------------------- the controls
  const st = { drop: 1, specs: 1, morph: 0, flat: 0, veins: 0, fade: 1 };
  const AT = new THREE.Vector3(...at), SLAB = new THREE.Vector3(...slabAt);
  const POSE1 = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(deg(PITCH1), deg(YAW1), 0, 'XYZ'));
  const place = () => {
    const k = st.drop, e = 1 - (1 - k) * (1 - k) * (1 - k);          // (ease-out: it settles onto the axis)
    group.position.lerpVectors(AT, SLAB, st.flat);
    group.position.y += (1 - e) * dropH;
  };
  const opac = () => {
    const f = st.fade, s = st.specs * f;
    fadeU.value = f; specU.value = s;
    const lensOnly = st.morph < 1e-4 && st.flat < 1e-4;
    for (const m of shell) m.visible = f > 0.003 && !lensOnly;
    for (const m of lens1) m.visible = f > 0.003 && lensOnly;
    specs.visible = s > 0.003;
    frameMat.opacity = s; frameMat.depthWrite = s > 0.98;
    for (const m of lens2Mesh) m.visible = s > 0.003;
    if (veinMesh) { veinU.uLevel.value = st.veins * f; veinMesh.visible = st.veins * f > 0.003; }
    // (the bubbles: there once the lens has grown, gone as the glass gets thin)
    const b = smooth(0.3, 0.75, st.morph) * (1 - smooth(0.5, 0.9, st.flat)) * f;
    bubU.uLevel.value = b; bubbles.visible = b > 0.003;
    const sk = smooth(0.7, 1.0, st.morph) * (1 - smooth(0.0, 0.3, st.flat)) * f;
    starU.uLevel.value = sk; stars.visible = sk > 0.003;
    if (bubbles.visible) placeBubbles();
  };
  const clamp01 = x => Math.max(0, Math.min(1, x));
  let lowered = low, lastT = performance.now(), slowT = 0, seenT = 0;
  const api = {
    group,
    drop(k) { st.drop = clamp01(k); place(); },
    specs(k) { st.specs = clamp01(k); opac(); },
    shape(morph, flat) {
      st.morph = clamp01(morph); st.flat = clamp01(flat);
      morphU.value = st.morph; flatU.value = st.flat;
      // (the lens turns to face the light and grows into the sculpture in its pose; flattening, it turns square)
      turn.rotation.y = deg(YAW0 * (1 - st.morph) + YAW1 * st.morph * (1 - st.flat));
      turn.rotation.x = deg(PITCH1 * st.morph * (1 - st.flat));
      facetU.value = planes.length ? smooth(0.15, 0.85, st.morph) : 0;
      holeU.value = smooth(0.4, 1.0, st.morph) * (1 - st.flat);
      // (the facet search and the rainbow only while the facets show: flat from 0.35 on the true surface takes over)
      const hi = !lowered && !low;
      exactU.value = hi && st.flat < 0.35 ? 1 : 0;
      dispU.value = hi ? DISP * (1 - smooth(0.3, 0.6, st.flat)) : 0;

      place(); opac();
    },
    veins(k) { st.veins = clamp01(k); opac(); },
    fade(k) { st.fade = clamp01(k); opac(); },
    tick(t, dim = 1) {
      dimU.value = dim;
      // now and then (every 7 s) a strip of light sweeps round in front in 1.6 s: a glint runs over the glass
      const ph = reduced ? 1 : (t % 7) / 1.6;
      sweepU.uSweepK.value = ph < 1 ? Math.sin(Math.PI * ph) : 0;
      sweepU.uSweep.value = -1.15 + 2.3 * Math.min(1, ph);
      starU.uTime.value = reduced ? 0 : t;
      // a weak computer (as the page drops its bloom, app.js): after 2 s of frames slower than 50 ms, the cheap path.
      // Only in the first 12 s that the sculpture is drawn (as app.js looks only at its first frames): a computer that
      // draws it fast then keeps it, whatever slows it down later
      const now = performance.now(), raw = (now - lastT) / 1000;
      lastT = now;
      if (!lowered && selfLower && raw < 1 && shell[shell.length - 1].visible && seenT < 12) {
        seenT += raw;
        slowT = raw > 0.05 ? slowT + raw : 0;
        if (slowT > 2) api.lower();
      }
    },
    lower() {
      if (lowered) return;
      lowered = true;
      dispU.value = 0; exactU.value = 0; thruU.value = 0.5;   // (and shape() keeps them so)
      for (const m of [...shell, ...lens1, ...lens2Mesh]) if (m.material.side === THREE.BackSide) { m.material.visible = false; }
      // (and the coarser shell, made now, once: under a software renderer the triangles are most of the cost)
      if (!low) { const old = shell[0].geometry, g = shellGeo(SHELL_LOW); for (const m of shell) m.geometry = g; old.dispose(); }
      bubbles.count = Math.min(N_BUBBLE.low, bub.length); bubKey = -1; opac();
    },
    get state() { return st; },
    get lowered() { return lowered; },
    // the lens's frame (its centre and the turn), for the light through it: a point in the lens's own frame -> world
    lensToWorld(x, y, z, out) { group.updateWorldMatrix(true, true); return turn.localToWorld(out.set(x, y, z)); },
    LENS, BLOCK,
    // (for the dev page: how it is built)
    get info() { const g = shell[0].geometry; return { vertices: g.attributes.position.count, triangles: g.index.count / 3, craters: craters.length, bubbles: bub.length, drawn: bubbles.count, lowered }; },
    // a point of the sculpture's own frame (its pose at morph 1, centred at 'at') -> world: the story's light in it
    sculptToWorld(x, y, z, out) { return out.set(x, y, z).applyMatrix4(POSE1).add(AT); },
  };
  api.shape(0, 0); api.drop(1); opac();
  return api;
}
export const createGem = createGlass;

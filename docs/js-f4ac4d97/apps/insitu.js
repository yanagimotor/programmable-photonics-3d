// Tab 3, "In situ inverse design and error correction" (after Zhao et al., arXiv:2610.10404, 2026): one story of
// eleven parts, about 61 s.  The chip first finds its own colour router from the dark; then the same feedback repairs
// it after a fire and after snow; then the camera draws back: conventional chips stop a system that chips written by
// light keep working.  The close-up camera does not move until the zoom-out, and the board's step count and match
// curve run on from the design into both repairs.
//   (first entry, about 2.5 s: the projector writes the colour router - the bench's green scan line)
//   1. goal (4.5 s): four colours of light enter together; the pattern is dark, so the light spreads as one
//      yellow-white fan: the middle two outputs get every colour, the outer two too little to show (a dotted line),
//      and every output has a cross on the board; the target - which colour leaves through which output - draws
//      itself on the board as arrows;
//   2. learn (about 12.4 s; 20-27 steps by target): the outputs are measured, compared with the target, and the error
//      runs up the feedback cable to the projector (a gold packet), which changes the pattern a little - 3 slow steps,
//      6 medium, then quick - until the match reaches 95 % (the board turns green);
//   3. learned (3.5 s): every colour at its own output; the chip glows; the thermometer appears, mild;
//   4. fire (4.0 s): a little fire at the chip's back edge heats the chip there: the colours go astray, the match falls
//      to about 30 %, the chip goes dark, and the curve's new last point falls like a cliff;
//   5. fireFix (about 4.8 s, 8-10 steps): the same loop at the learning's medium beat, in the heat, back to 95 %;
//   6. fireOk (2.5 s);  7. snow (3.2 s): the fire dies down while snow chills the chip's front (the outputs' side) -
//      astray again;  8. snowFix (about 3.6 s, 6-8 steps): the same loop;  9. snowOk (2.0 s);
//   10. conv (8.5 s): the camera draws back to a grid of conventional chips (apps/grid.js); the fire and the snow walk
//      through it, each chip they reach fails, and at the 8th the whole system stops;
//   11. many (9.5 s): the same grid with chips written by light: each chip they reach corrects itself;
//   then the camera flies back (the first 3 s of the next goal): the heat and the cold are gone, and the chip starts
//   from the dark again, with a new target.
// "New target": back to the goal from the dark with another target, from any part; "From the start": the same with
// the first round's target.  ?app=correct (the old link of the error-correction entry) opens the story at the fire
// (apps/index.js, ALIASES).
//
// Real, and pictures:
//   Real (programs/wdmlab.js, live in the browser; = tools/wdm_ref.py): the learning, and both corrections - the same
//   feedback (the error sent back through the chip and overlapped with the light, then one Adam step) on the same
//   pattern; and what the surroundings do: a change of the slab's refractive index (wdmlab.js surroundings(): a hot
//   spot of +6e-4, about 18 K, next to the fire; a cold front side of -7e-4 under the snow) that nobody tells the chip
//   about.  The light, the pattern, the detectors and the board show the measured result (drawn simplified:
//   programs/wdm.js, apps/rig.js).
//   Pictures: the fire, the heat glow on the chip, the snow, the frost and the thermometer (no numbers on it); the
//   grid of the zoom-out and everything in it (apps/grid.js).
//
// The scene (apps/index.js): create(ctx) -> { program: 'wdm', view, caption, controls ("New target", "From the start"),
// act, value, state, go(part, { target }), enter, leave, update }.  The story's clock runs on real time (raw).
// go(part) poses a part at once (tests, the alias, screenshots); the story itself only moves forward.  A part after
// learn needs the target learned from the dark (and, from fireOk on, fixed in the fire; for snowOk also in the snow):
// a twin of the lab does that off-screen, a few milliseconds of each frame, once per target, and the part's clock
// starts when it is done and the router is on the chip (state.ready) - from the zoom-out, once the camera is back.
// On a portrait screen (a phone) the board stands above the set-up (apps/rig.js, layout).
//   state: { part, t, ready, target ('2031': colour c leaves through output target[c]), step, curve (the match curve's
//   points), match, health (the chip's glow), heat, cold (0..1), thermo (the thermometer shown), fixing, wide (0..1:
//   how far the camera has drawn back), near (the close-up's set-up shown), failed, down, cycling (the zoom-out's),
//   loops (how often the story has started over by itself) }
import * as THREE from 'three';
import { WdmLab, surroundings, SURROUNDINGS } from '../programs/wdmlab.js';
import { css } from '../kit/colour.js';
import { createRig } from './rig.js';
import { createFire, createSnow } from './weather.js';
import { createGrid, canvasTex } from './grid.js';

const PARTS = ['goal', 'learn', 'learned', 'fire', 'fireFix', 'fireOk', 'snow', 'snowFix', 'snowOk', 'conv', 'many'];
// seconds per part (learn and the fixes run until the match is back: their beats below)
const DUR = { goal: 4.5, learned: 3.5, fire: 4.0, fireOk: 2.5, snow: 3.2, snowOk: 2.0, conv: 8.5, many: 9.5 };
const LOOP = 3.0;                            // the flight back to the close-up: the first seconds of the next goal
const RAMP = 1.6;                            // how long the fire (and the snow) takes to come
const THERMO_AT = 2.5;                       // (learned) when the thermometer appears, still mild
// the beat of the learning (tf: the packet's run up the cable, ts: the pause before the next measurement): slow at
// first, so that the loop can be followed, then quicker.  The fixes use its medium beat: the same loop, the same pace.
const BEAT = [{ until: 3, tf: 0.75, ts: 0.55 }, { until: 9, tf: 0.4, ts: 0.2 }, { until: Infinity, tf: 0.25, ts: 0.1 }];
const FIX_BEAT = BEAT[1];
const GOAL = 0.95;                           // the match where the learning and the fixes stop (the board turns green)
const MAXSTEP = 40, FIX_MAX = 20;            // (a learning or a fix that takes longer is cut short: the story goes on)
const FIRST = [2, 0, 3, 1];                  // the first round's target (also the tour's and "From the start"'s)
// the zoom-out: when the fire starts walking (s), its speed (units/s), how much later the snow follows; conventional
// chips failed when the whole system stops
const WALK = { conv: { t0: 1.6, v: 16, lag: 0.4 }, many: { t0: 1.2, v: 14, lag: 0.5 } };
const DOWN_AT = 8;
// the twin's results a posed part needs: 1 the learned pattern, 2 also fixed in the fire, 3 also fixed in the snow
const NEED = { learned: 1, fire: 1, fireFix: 1, fireOk: 2, snow: 2, snowFix: 2, snowOk: 3 };
// (the surroundings as a posed part finds them: [heat, cold])
const ENV_OF = { learned: [0, 0], fire: [0, 0], fireFix: [1, 0], fireOk: [1, 0], snow: [1, 0], snowFix: [0, 1], snowOk: [0, 1] };
const CAP = { goal: 'app.insitu.cap.goal', learn: 'app.insitu.cap.learn', learned: 'app.insitu.cap.learned',
  fire: 'app.insitu.cap.fire', fireFix: 'app.insitu.cap.fix', fireOk: 'app.insitu.cap.fixed',
  snow: 'app.insitu.cap.snow', snowFix: 'app.insitu.cap.fix', snowOk: 'app.insitu.cap.fixed2',
  conv: 'app.insitu.cap.conv', many: 'app.insitu.cap.many' };
const PERMS = [];
(function perms(a, k) { if (k === a.length) { PERMS.push(a.slice()); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perms(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } })([0, 1, 2, 3], 0);

const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

// an elliptical soft spot on a canvas (cx, cy, rx, ry in px)
function spot(g, cx, cy, rx, ry, stops) {
  g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
  g.restore();
}

// the thermometer: lying down, cold at the left (a snowflake), hot at the right (a flame); the liquid's length and
// colour show the temperature
function drawThermo(g, W, H, v) {
  const cy = H * 0.5, x0 = W * 0.2, x1 = W * 0.84, th = H * 0.22, br = H * 0.19;
  // the ends of the scale
  g.save(); g.strokeStyle = '#8fd0ff'; g.lineWidth = Math.max(3, H * 0.025); g.lineCap = 'round';
  const fx = W * 0.075, fr = H * 0.16;
  g.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + i * Math.PI / 3, dx = Math.cos(a) * fr, dy = Math.sin(a) * fr;
    g.moveTo(fx - dx, cy - dy); g.lineTo(fx + dx, cy + dy);
    for (const s of [-1, 1]) {
      const bx = fx + s * dx * 0.6, by = cy + s * dy * 0.6;
      for (const t of [-1, 1]) { const b = a + (s > 0 ? 0 : Math.PI) + t * 0.75; g.moveTo(bx, by); g.lineTo(bx + Math.cos(b) * fr * 0.38, by + Math.sin(b) * fr * 0.38); }
    }
  }
  g.stroke(); g.restore();
  const hx = W * 0.93, hy = cy + H * 0.18, hh = H * 0.42;
  const flame = (s, col) => {
    g.beginPath(); g.moveTo(hx, hy - hh * s);
    g.bezierCurveTo(hx + hh * 0.42 * s, hy - hh * 0.55 * s, hx + hh * 0.4 * s, hy - hh * 0.02 * s, hx, hy);
    g.bezierCurveTo(hx - hh * 0.4 * s, hy - hh * 0.02 * s, hx - hh * 0.42 * s, hy - hh * 0.55 * s, hx, hy - hh * s);
    g.fillStyle = col; g.fill();
  };
  flame(1, '#f2541f'); flame(0.62, '#ffb02a'); flame(0.3, '#ffe27a');
  // the glass
  g.save();
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.strokeStyle = 'rgba(200,215,230,0.85)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(x0, cy - th / 2, x1 - x0, th, th / 2); g.fill(); g.stroke();
  g.beginPath(); g.arc(x0, cy, br, 0, Math.PI * 2); g.fill(); g.stroke();
  // the liquid
  const cold = [0.4, 0.72, 1], mild = [0.8, 0.85, 0.9], hot = [1, 0.36, 0.13];
  const u = clamp01(v), col = u < 0.45 ? cold.map((c, i) => c + (mild[i] - c) * (u - 0.12) / 0.33) : mild.map((c, i) => c + (hot[i] - c) * (u - 0.45) / 0.45);
  const cc = col.map(clamp01);
  g.fillStyle = css(cc); g.shadowColor = css(cc, 0.9); g.shadowBlur = 14;
  g.beginPath(); g.arc(x0, cy, br - 5, 0, Math.PI * 2); g.fill();
  const len = (x1 - x0 - th * 0.5) * u + th * 0.3;
  g.beginPath(); g.roundRect(x0, cy - th / 2 + 5, len, th - 10, (th - 10) / 2); g.fill();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(200,215,230,0.55)'; g.lineWidth = 2;
  for (let i = 1; i <= 6; i++) { const x = x0 + br * 0.6 + (x1 - x0 - br * 0.9) * i / 6.5; g.beginPath(); g.moveTo(x, cy - th / 2 - 5); g.lineTo(x, cy - th / 2 - 14); g.stroke(); }
  g.restore();
}

export function create(ctx) {
  const { kit, bench, chipAt } = ctx;
  const g = kit.group;
  // (the order things are made in keeps the error-correction entry's random pictures - the snow, the frost, the
  // grid - as they were: this scene's kit has that entry's seed, apps/index.js)
  const rig = createRig(ctx, { goal: GOAL });
  const Y = rig.Y, S = bench.S;
  const SC = Math.min((S.w - 0.3) / 8.8, (S.d - 1.2) / 7.5);    // the colour router's scale on the slate (bench.make)
  // a point of the slab (mm: x across, z along the light) on the table (world x, z); across the slab the program
  // draws SXd units per mm (programs/wdm.js; read from it once it is built, see update)
  let SXd = 9.0;
  const slabX = zmm => chipAt.x + (-4.35 + 8.7 * zmm / 10) * SC, slabZ = xmm => -xmm * SXd * SC;
  const HOT = SURROUNDINGS.hot;

  // ---------------------------------------------------------------- the surroundings in the slab (dn, wdmlab.js):
  // the heat (w.sun) and the cold (w.snow), 0..1 each, added to the lab's env whenever they change
  let env = null;
  const w = { sun: 0, snow: 0 }, wShown = { sun: -1, snow: -1 };
  const applyEnv = lab => {
    if (!env) env = surroundings(lab);
    if (Math.abs(w.sun - wShown.sun) < 1e-4 && Math.abs(w.snow - wShown.snow) < 1e-4) return false;
    for (let i = 0; i < lab.env.length; i++) lab.env[i] = w.sun * env.sun[i] + w.snow * env.snow[i];
    wShown.sun = w.sun; wShown.snow = w.snow;
    lab.fresh = false;
    return true;
  };
  const setEnv = (lab, sun, snow) => { w.sun = sun; w.snow = snow; wShown.sun = wShown.snow = -1; applyEnv(lab); };

  // ---------------------------------------------------------------- the close-up: heat
  // a little fire on the table at the chip's back edge, next to the hot spot
  const hotAt = { x: slabX(HOT.z), z: slabZ(HOT.x) };
  const fire = createFire({ height: 4.0, ground: 2.2 });
  fire.group.position.set(hotAt.x, ctx.y, -S.d / 2 - 0.75);
  g.add(fire.group);
  // the heat on the chip: from the fire's edge into the hot spot (the dn above); under the light in the slab (the
  // program draws it at renderOrder 5), so that the colours stay readable.  Laid over the slate (not added: on the
  // pale, green-lit slate an added orange turned white or yellow-green once a slow computer drops the post-processing)
  const HEAT = 0.85;                          // its opacity at full heat
  const TW = 384, TH = Math.round(384 * S.d / S.w), U = TW / S.w;
  const px = x => (x - chipAt.x) * U + TW / 2, pz = z => z * U + TH / 2;
  const heatTex = canvasTex(TW, TH, () => {});
  const drawHeat = () => {
    const gg = heatTex.image.getContext('2d');
    gg.clearRect(0, 0, TW, TH);
    spot(gg, px(hotAt.x), pz(hotAt.z), 2.6 * HOT.sz * 0.87 * SC * U, 2.4 * HOT.sx * SXd * SC * U, [[0, 'rgba(255,120,40,0.8)'], [0.5, 'rgba(255,95,30,0.38)'], [1, 'rgba(255,80,25,0)']]);
    spot(gg, px(hotAt.x), 0, 3.4 * U, 2.9 * U, [[0, 'rgba(255,115,40,0.85)'], [0.55, 'rgba(255,90,30,0.35)'], [1, 'rgba(255,70,25,0)']]);
    heatTex.needsUpdate = true;
  };
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, opacity: 0, depthWrite: false }));
  heat.position.set(chipAt.x, Y + 0.012, 0); heat.renderOrder = 4.5; g.add(heat);

  // ---------------------------------------------------------------- the close-up: cold
  // the snow sign above the front of the chip (towards the outputs), the flakes falling onto that side only
  const snow = createSnow({ fall: 4.45, rx: 1.35, rz: 0.9, count: 58, flake: 0.56, cloud: 4.2, speed: 0.36, rand: () => kit.rand() });
  g.add(snow.group);
  // frost and a cool blue tint on that side
  const specks = Array.from({ length: 340 }, () => [2 * Math.PI * kit.rand(), Math.sqrt(kit.rand()), kit.rand(), kit.rand()]);
  const frostTex = canvasTex(TW, TH, () => {});
  const drawFrost = () => {
    const gg = frostTex.image.getContext('2d');
    gg.clearRect(0, 0, TW, TH);
    spot(gg, px(slabX(8.2)), pz(slabZ(-0.33)), 4.6 * U, 3.0 * U, [[0, 'rgba(205,232,255,0.9)'], [0.55, 'rgba(160,205,255,0.5)'], [1, 'rgba(140,190,255,0)']]);
    spot(gg, px(slabX(6.6)), pz(slabZ(-0.18)), 3.4 * U, 1.9 * U, [[0, 'rgba(190,225,255,0.55)'], [1, 'rgba(160,205,255,0)']]);
    const cx = px(slabX(8.0)), cz = pz(slabZ(-0.3));
    for (const [a, r, k1, k2] of specks) {
      gg.fillStyle = `rgba(255,255,255,${(0.25 + 0.6 * k1 * (1 - 0.6 * r)).toFixed(2)})`;
      gg.beginPath(); gg.arc(cx + Math.cos(a) * r * 4.4 * U, cz + Math.sin(a) * r * 2.6 * U, 0.8 + 1.8 * k2, 0, 6.3); gg.fill();
    }
    frostTex.needsUpdate = true;
  };
  const frost = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.d).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: frostTex, transparent: true, opacity: 0, depthWrite: false }));
  frost.position.set(chipAt.x, Y + 0.014, 0); frost.renderOrder = 4.6; g.add(frost);
  // (where the heat and the cold sit on the slab, in the program's drawing)
  const layout = () => {
    hotAt.z = slabZ(HOT.x);
    drawHeat(); drawFrost();
    snow.group.position.set(slabX(7.9), Y + 4.5, slabZ(-0.27));
  };
  layout();

  // ---------------------------------------------------------------- the thermometer, at the chip's near corner
  // (shown with mesh.visible: the kit sets a plate's opacity every frame; drawn again only when it changes)
  let temp = 0.45, tempShown = temp, tempAcc = 0;
  const thermo = kit.plate({ w: 3.6, h: 1.45, at: [chipAt.x - S.w / 2 - 0.1, Y + 0.72, S.d / 2 + 1.15], title: '', res: 512 });
  thermo.draw((gg, b, W, H) => drawThermo(gg, W, H, temp));
  thermo.mesh.visible = false;

  // ---------------------------------------------------------------- the zoom-out (pictures: apps/grid.js)
  const grid = createGrid(ctx, { walk: WALK, downAt: DOWN_AT });
  const gridArgs = { part: 'back', partT: 0, manyK: 0, near: true, tw: 0 };      // (reused every frame)

  // ---------------------------------------------------------------- the cameras
  // the close-up: the whole set-up (the source, the chip under its projector, the detectors, the board), with the
  // fire, the snow, the frost and the thermometer inside it; maxDist: a narrow screen (a phone) fits it from farther
  // away than the orbit's usual limit.  TALL, a portrait screen (a phone): the board stands above the set-up
  // (rig.layout), and the box runs from the table to the board's top, plus room for the page's top bar (the title and
  // its buttons sit over the view there) and, at the front, the thermometer.  FAR: the grid of the zoom-out.
  const box = rig.box, bt = rig.boxTall, TOPBAR = 4.0;
  const VIEW = { target: [(box[0][0] + box[1][0]) / 2, 4.4, 0], elev: 34, dist: 27, box, maxDist: 60 };
  const TALL = { ...VIEW, target: [(bt[0][0] + bt[1][0]) / 2, (bt[0][1] + bt[1][1]) / 2, 0],
    box: [bt[0], [bt[1][0], bt[1][1] + TOPBAR, S.d / 2 + 1.35]] };
  const portrait = () => innerWidth < innerHeight;
  const FAR = { target: [chipAt.x, 2.0, 1.0], elev: 46, dist: 96, box: [[chipAt.x - 40, 0, -18.5], [chipAt.x + 40, 12, 19.5]], fog: [170, 380], maxDist: 220, dur: 3.6 };
  // (the views asked for, made again only when the serial changes; the close-up after the zoom-out flies back in LOOP
  // seconds: table.js's usual 1.3 s would be abrupt from 96 units away)
  const views = { serial: -1, near: null, tall: null, far: null };
  const viewNow = () => {
    if (views.serial !== st.serial) {
      views.serial = st.serial;
      const dur = st.back ? LOOP : undefined;
      views.near = { ...VIEW, serial: st.serial, dur }; views.tall = { ...TALL, serial: st.serial, dur };
      views.far = { ...FAR, serial: st.serial };
    }
    const tall = portrait();
    rig.layout(tall);
    return st.view === 'far' ? views.far : tall ? views.tall : views.near;
  };

  // ---------------------------------------------------------------- the story
  // (want: the part asked for - by enter(), go() or a button - until it is posed; restartTo: the target to start
  // from once the set-up shows again, on the flight back from the zoom-out; fixN: the steps of the fix under way;
  // back: the close-up's view is a flight back from the zoom-out; nearW: the close-up's weather, fading as the camera
  // draws back)
  const st = { part: 'goal', t: 0, ready: false, want: null, target: FIRST.slice(), restartTo: null, fixing: false, fixN: 0,
    fwd: 0, view: 'near', serial: 0, back: false, manyK: 0, near: true, nearW: 1, wide: false, loops: 0, laid: false };
  const benchReady = () => { const p = rig.prog(); return !!p && bench.phase === 'run' && bench.task > 0.6; };
  const nearView = () => { if (st.view !== 'near') { st.view = 'near'; st.back = true; st.serial++; } };
  // the close-up's set-up (our chip under its projector, the source, detectors, board): hidden in the zoom-out, where
  // a picture of a chip takes the bench's place
  const showNear = (on, force = false) => {
    if (st.near === on && !force) return;
    st.near = on;
    bench.group.visible = on;
    rig.show(on);
  };
  // the close-up's weather and thermometer off at once (the frame's update would only fade the weather out)
  const clearWeather = () => {
    fire.set(0); snow.set(0); heat.material.opacity = 0; frost.material.opacity = 0; heat.visible = frost.visible = false;
    thermo.mesh.visible = false;
  };
  // from the dark with a target: the heat and the cold gone (the fire, the snow and the thermometer too), the pattern
  // dark, the board cleared (Step 0, one point), the target's arrows drawn in
  const restartNow = (lab, target) => {
    setEnv(lab, 0, 0);
    clearWeather();
    st.target = target.slice();
    rig.restart({ target: st.target, draw: true });
    st.fixing = false;
  };
  // back from the zoom-out to the goal: the camera flies back; the chip starts from the dark once the set-up shows
  const loopBack = target => {
    if (!(st.part === 'goal' && st.t < 0)) st.t = -LOOP;
    st.part = 'goal'; st.restartTo = target.slice(); st.fixing = false;
    nearView();
  };
  // any order of the four colours but the identity and the one shown now
  const nextTarget = () => {
    let tg;
    do { tg = PERMS[Math.floor(kit.rand() * PERMS.length)]; } while (tg.join() === st.target.join() || tg.join() === '0,1,2,3');
    return tg;
  };
  // the story moves on.  The board goes on: from learn to snowOk nothing here restarts the rig or resets its step or
  // its curve - each disturbance adds one point to the curve, which falls with the match (rig.js draws the last
  // point at the live match), and its fix writes the dip into that point, then goes on with the same feedback
  const advance = (part, lab) => {
    st.part = part; st.t = 0;
    if (part === 'fire' || part === 'snow') rig.st.hist.push(lab.match);
    else if (part === 'fireFix' || part === 'snowFix') {
      const h = rig.st.hist;
      h[h.length - 1] = lab.match;
      lab.restart();                                    // (Adam's memory starts afresh; the pattern is kept)
      st.fixing = true; st.fixN = 0;
    } else if (part === 'conv' || part === 'many') {
      if (st.view !== 'far') { st.view = 'far'; st.back = false; st.serial++; }
      grid.begin(part);
    }
  };
  const fix = (raw, lab, next) => {
    if (rig.correct(raw, FIX_BEAT)) st.fixN++;
    if (lab.match >= GOAL || st.fixN >= FIX_MAX) { st.fixing = false; rig.idle(); advance(next, lab); }
  };

  // ---------------------------------------------------------------- the twin: go(part) learns off-screen
  // (a lab of its own, so that the chip and the board stay as they are while it works: the same learning, from the
  // dark, then the same fixes - Adam afresh, the surroundings at full strength - as the story runs them; the results
  // are kept per target: [learned, fixed in the fire, fixed in the snow], each { p, step, hist }.  It works about
  // TWIN_MS of each frame, at least one step - a step costs about 8 ms - so that the frames stay smooth, also while the
  // bench writes the router, as on the old link ?app=correct)
  const snaps = new Map();
  let twin = null;
  const twinSt = { key: '', stage: -1, step: 0, n: 0, hist: null };
  const TWIN_MS = 6;
  const prepared = () => {
    const want = st.want, need = NEED[want.part] || 0;
    if (!need) return true;
    const key = want.target.join('');
    let list = snaps.get(key);
    if (!list) { list = []; snaps.set(key, list); if (snaps.size > 4) snaps.delete(snaps.keys().next().value); }
    if (list.length >= need) return true;
    if (!twin) twin = new WdmLab();
    if (!env) env = surroundings(twin);
    const stage = list.length, ts = twinSt;
    if (ts.key !== key || ts.stage !== stage) {
      ts.key = key; ts.stage = stage; ts.n = 0;
      twin.target = want.target.slice();
      if (stage === 0) { twin.env.fill(0); twin.reset(); twin.forward(); ts.step = 0; ts.hist = [twin.match]; }
      else {
        const s = list[stage - 1];
        twin.p.set(s.p); twin.env.set(stage === 1 ? env.sun : env.snow); twin.fresh = false; twin.forward();
        ts.step = s.step; ts.hist = s.hist.slice(); ts.hist.push(twin.match);
        twin.restart();
      }
    }
    const t0 = performance.now();
    do {
      twin.learn(); twin.forward();
      ts.step++; ts.n++; ts.hist.push(twin.match);
      if (twin.match >= GOAL || (stage === 0 ? ts.step >= MAXSTEP : ts.n >= FIX_MAX)) {
        list.push({ p: Float64Array.from(twin.p), step: ts.step, hist: ts.hist });
        ts.stage = -1;
        return list.length >= need;
      }
    } while (performance.now() - t0 < TWIN_MS);
    return false;
  };
  // the part asked for, posed (the router on the chip, the twin done)
  const apply = (lab, p) => {
    const { part, target } = st.want;
    st.want = null; st.ready = true;
    st.fixing = false; rig.idle();
    if (part === 'goal') {
      // (from the zoom-out the camera flies back first; while the set-up still shows, at once)
      if (st.near) { st.restartTo = null; restartNow(lab, target); st.part = 'goal'; st.t = 0; nearView(); }
      else loopBack(target);
      return;
    }
    // (the zoom-out needs only the far view and a grid of working conventional chips: posed, many turns them into
    // ours at once - in the story it turns the failed ones of conv)
    if (part === 'conv' || part === 'many') { grid.reset(); advance(part, lab); return; }
    st.restartTo = null;
    // (from the zoom-out the camera flies back first: the part's clock starts when it arrives, as the loop's goal's)
    const flying = !st.near;
    nearView();
    if (part === 'learn') { restartNow(lab, target); advance('learn', lab); if (flying) st.t = -LOOP; return; }
    // learned and on: the twin's pattern on the chip, the board as the story would have it, the surroundings as the
    // part finds them (the pattern fades in from the dark)
    const s = snaps.get(target.join(''))[NEED[part] - 1], e = ENV_OF[part];
    st.target = target.slice();
    rig.restart({ target: st.target, fade: 0 });
    lab.p.set(s.p);
    setEnv(lab, e[0], e[1]);
    lab.forward();
    rig.st.step = s.step; rig.st.hist = s.hist.slice();
    p.inst.showPattern({ fade: 0.5 }); p.inst.showLight({ fade: 0.4 });
    if (part === 'fireFix' || part === 'snowFix') rig.st.hist.push(lab.match);      // (the disturbance's point)
    advance(part, lab);
    if (flying) st.t = -LOOP;
  };
  // go: a part at once (tests, the alias, screenshots, the buttons), with a target (else the one shown now)
  const go = (part, { target } = {}) => {
    if (!PARTS.includes(part)) return;
    st.want = { part, target: (target || st.target).slice() };
    st.ready = false;
    if (benchReady() && prepared()) apply(rig.lab(), rig.prog());
  };

  return {
    program: 'wdm',
    get view() { return viewNow(); },
    caption: () => CAP[st.part],
    get state() {
      const lab = rig.lab();
      return { part: st.part, t: st.t, ready: st.ready, target: rig.st.target.join(''), step: rig.st.step, curve: rig.st.hist.length,
        match: lab ? lab.match : 0, health: bench.healthNow, heat: w.sun, cold: w.snow, thermo: thermo.mesh.visible, fixing: st.fixing,
        wide: st.manyK, near: st.near, failed: grid.failed, down: grid.down, cycling: grid.cycling, loops: st.loops };
    },
    // "New target" (ignored while the bench writes the router, as before) and "From the start"
    controls: [{ type: 'button', id: 'target', key: 'btn.newTarget' }, { type: 'button', id: 'restart', key: 'btn.fromStart', plain: true }],
    act(id) {
      if (id === 'target') { if (benchReady()) go('goal', { target: nextTarget() }); }
      else if (id === 'restart') go('goal', { target: FIRST });
    },
    value() { return null; },
    go,
    enter() {
      // the first round: the router is written, then the goal from the dark with the first target
      st.serial++; st.view = 'near'; st.back = false; st.manyK = 0; st.wide = false; st.nearW = 1; st.fixing = false;
      st.part = 'goal'; st.t = 0; st.loops = 0; st.restartTo = null;
      st.target = FIRST.slice(); st.want = { part: 'goal', target: FIRST.slice() }; st.ready = false;
      w.sun = w.snow = 0; wShown.sun = wShown.snow = -1;
      // (the board while the router is written: the first target, Step 0, no curve, nothing measured - drawn at once,
      // not the last visit's result)
      rig.st.target = FIRST.slice(); rig.st.step = 0; rig.st.hist = [];
      rig.layout(portrait()); rig.blank();
      showNear(true, true); grid.reset(); grid.hide();
      bench.setHealth(null); rig.idle(); rig.labels(true); bench.hideLabels(false);
    },
    leave() {
      bench.setHealth(null); rig.idle(); bench.hideLabels(false);
      // the bench and the set-up shown again (the next scene uses the bench); this scene's labels stay hidden (they
      // live outside the scene's group); the lab without the fire's or the snow's dn
      showNear(true, true); rig.labels(false);
      const lab = rig.lab();
      if (lab) { lab.env.fill(0); lab.fresh = false; }
      w.sun = w.snow = 0; wShown.sun = wShown.snow = -1;
      st.view = 'near'; st.back = false; st.manyK = 0; st.fixing = false; st.wide = false; st.nearW = 1;
      st.want = null; st.ready = false; st.restartTo = null;
      grid.hide();
      clearWeather();
    },
    update(dt, t, camera, pointScale, raw = dt) {
      // (the first frame's raw can be negative: its timestamp is older than the clock's start)
      raw = Math.max(0, raw);
      rig.layout(portrait());                           // (the board's place follows the screen's orientation)
      const p = rig.prog(), lab = p ? p.inst.lab : null, ready = benchReady();
      // a part asked for: the twin works on it (also while the router is being written), and it is posed once the
      // router is on the chip
      if (st.want && prepared() && ready) apply(lab, p);
      if (!ready) {
        if (st.ready) { st.ready = false; st.want = st.want || { part: 'goal', target: st.target.slice() }; }
        rig.tick(t);
        return;
      }
      if (!st.laid) {
        // the program's drawing scale across the slab, from where it draws its outputs
        st.laid = true;
        const sx = p.inst.portZ ? -p.inst.portZ(0) / lab.cfg.ports[0] : SXd;
        if (Number.isFinite(sx) && sx > 0 && Math.abs(sx - SXd) > 0.01) { SXd = sx; layout(); }
      }
      // the story (its clock runs once the part asked for is posed; below 0 while the camera flies back)
      if (st.ready) {
        st.t += raw;
        if (st.t >= 0) switch (st.part) {
          case 'goal': if (st.t >= DUR.goal) advance('learn', lab); break;
          case 'learn': {
            let i = 0;
            while (rig.st.step >= BEAT[i].until) i++;
            rig.correct(raw, BEAT[i]);
            if (lab.match >= GOAL || rig.st.step >= MAXSTEP) { rig.idle(); advance('learned', lab); }
            break;
          }
          case 'learned': if (st.t >= DUR.learned) advance('fire', lab); break;
          case 'fire': w.sun = ease(st.t / RAMP); if (st.t >= DUR.fire) advance('fireFix', lab); break;
          case 'fireFix': fix(raw, lab, 'fireOk'); break;
          case 'fireOk': if (st.t >= DUR.fireOk) advance('snow', lab); break;
          case 'snow': w.sun = 1 - ease(st.t / RAMP); w.snow = ease(st.t / RAMP); if (st.t >= DUR.snow) advance('snowFix', lab); break;
          case 'snowFix': fix(raw, lab, 'snowOk'); break;
          case 'snowOk': if (st.t >= DUR.snowOk) advance('conv', lab); break;
          case 'conv': if (st.t >= DUR.conv) advance('many', lab); break;
          case 'many': if (st.t >= DUR.many) { st.loops++; loopBack(nextTarget()); } break;
          default: break;
        }
      }
      // the surroundings change the slab: the light follows (at most ~8 times a second; not while a fix runs - its
      // own steps measure the light)
      st.fwd += raw;
      applyEnv(lab);
      if (!lab.fresh && !st.fixing && st.fwd > 0.12) { st.fwd = 0; lab.forward(); p.inst.showLight({ fade: 0.12 }); }
      const P = PARTS.indexOf(st.part);
      // the chip's glow follows the match from learned on (none while it learns)
      if (st.near) bench.setHealth(P >= 2 ? clamp01((lab.match - 0.5) / 0.42) : null);
      // the thermometer: with the set-up, from learned (2.5 s in) until the next goal
      const thermoOn = st.near && (P > 2 || (P === 2 && st.t >= THERMO_AT));
      thermo.mesh.visible = thermoOn;
      temp = 0.45 + 0.45 * w.sun - 0.33 * w.snow;
      tempAcc += raw;
      if (thermoOn && Math.abs(temp - tempShown) > 0.003 && tempAcc >= 0.1) { tempAcc = 0; tempShown = temp; thermo.draw(null); }

      // the weather of the close-up (it fades away as the camera draws back)
      st.nearW += ((st.near && st.manyK < 0.4 ? 1 : 0) - st.nearW) * Math.min(1, raw * 4);
      const nw = st.nearW, tw = ctx.reduced ? 0.4 * t : t;      // (less motion asked for: a calmer flicker and snowfall)
      fire.set(nw * w.sun); fire.tick(tw, camera);
      heat.material.opacity = HEAT * nw * w.sun * (0.92 + 0.08 * Math.sin(t * 2.3)); heat.visible = heat.material.opacity > 0.003;
      snow.set(nw * w.snow); snow.tick(tw, camera, pointScale);
      frost.material.opacity = 0.75 * nw * w.snow; frost.visible = frost.material.opacity > 0.003;

      // the zoom-out: the camera draws back (FAR), the set-up gives way to the grid; and back (less motion asked for:
      // the camera jumps - table.js - and so does this, so that the set-up is there when the close-up is)
      const far = st.view === 'far' ? 1 : 0;
      st.manyK = ctx.reduced ? far : st.manyK + (far - st.manyK) * Math.min(1, raw * 1.2);
      if (st.view === 'far' && st.near && st.manyK > 0.85) showNear(false);
      if (st.view === 'near' && !st.near && st.manyK < 0.5) {
        showNear(true);
        if (st.restartTo) { restartNow(lab, st.restartTo); st.restartTo = null; }
      }
      const wide = st.manyK > 0.3;
      if (wide !== st.wide) { st.wide = wide; rig.labels(!wide); bench.hideLabels(wide); }
      gridArgs.part = st.part === 'conv' || st.part === 'many' ? st.part : 'back';
      gridArgs.partT = st.t; gridArgs.manyK = st.manyK; gridArgs.near = st.near; gridArgs.tw = tw;
      grid.update(raw, t, camera, pointScale, gridArgs);
      rig.tick(t);
    },
  };
}

// Program "Twin-photon source" (tab 3, the quantum internet): the light-programmable chip writes a
// waveguide with a periodic poling profile (the stripes, written by the programming light - as in Yanagimoto et
// al., programmable on-chip nonlinear photonics); blue pump light runs through it, and now and then a pump photon
// splits into two photons born at the same instant (spontaneous parametric down-conversion).  The twins leave the
// stripes together - drawn side by side, a pair - and a splitter sends them along two different paths, to the
// chip's two outputs.  The scene (apps/quantum.js) draws the pump laser where the blue light begins (PUMP_X) and
// takes the twins on from the chip's edge.
//
//   inst.emit(at)          a pair now, born at 'at' (0..1 along the stripes; random if left out); returns the seconds
//                          until the twins reach the chip's edge (inst.lastId: the pair's id)
//   inst.auto              pairs by themselves, at random, every inst.gap[0] + inst.gap[1] * random seconds
//   inst.size              the twins' size (scene units; the scene keeps them visible when the camera draws back)
//   inst.onExit(fn)        fn(branch 0 | 1, pair id) when a twin reaches the chip's edge (branch 0: the back output)
//   inst.edges[b]          where branch b leaves the chip (chip-local [x, y, z])
export const meta = { id: 'qsource', platform: 'ln', category: 'quantum', size: { w: 8.8, d: 7.5 }, app: true };   // app: tab 3's

export const PUMP = [0.42, 0.5, 1.0];      // blue pump light
export const TWIN = [1.0, 0.36, 0.3];      // the twins (infrared, drawn red)
export const PUMP_X = -5.6;                // chip-local x where the pump light begins (the pump laser's window)

// the twins' dots, fading to nothing at the edge of their square (kit/photons.js stops at ~4 %, which shows as a
// square around a bright dot once the dots are big); drawn over the pale chip (the kit's 'over' mode)
const DOT_FS = /* glsl */ `
uniform float uDim;
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d) * 4.0;
  float a = (exp(-r2 * 3.2) + 0.6 * exp(-r2 * 18.0)) * (1.0 - smoothstep(0.5, 1.0, r2));
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * uDim, clamp(a * 1.3, 0.0, 1.0) * clamp(max(max(vColor.r, vColor.g), vColor.b) * 2.0, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export const text = {
  en: {
    name: 'Twin-photon source',
    tech: 'Periodically poled waveguide written by light · lithium niobate',
    what: 'Splits blue photons into twin photons and sends the twins different ways.',
    in: 'Blue pump light',
    out: 'Twin photons, along two paths',
    how: 'Stripes written by light keep the splitting of the blue photons in step; a splitter sends the two twins of each pair to different outputs.',
    use: 'Twins sent to distant places can be used to share entanglement: the links of a quantum internet.',
    fixed: 'The stripes are light: their spacing, and so the twins\' colours, can be rewritten.',
    c: { pump: 'Pump laser', pairs: 'Twin photons' },
  },
  ja: {
    name: 'ふたご光子の光源',
    tech: '光で書いた周期分極導波路・ニオブ酸リチウム',
    what: '青い光子をふたごの光子に分け、別々の道へ送ります。',
    in: '青いポンプ光',
    out: '2つの道を行くふたごの光子',
    how: '光で書いた縞模様が、青い光子の分かれ方の歩調をそろえます。分岐でふたごは別々の出口へ向かいます。',
    use: '遠くへ送ったふたごで、もつれを分け合えます。量子インターネットのつながりです。',
    fixed: '縞模様は光なので、間隔を、つまりふたごの色を書き換えられます。',
    c: { pump: 'ポンプレーザー', pairs: 'ふたごの光子' },
  },
};

export function create(kit) {
  const { THREE, P } = kit;
  const W = 8.8, D = 7.5, X0 = -W / 2 + 0.1, X1 = W / 2 - 0.1, XP0 = -3.1, XP1 = 0.8, XS = 1.25, ZB = 1.45, FAR = -PUMP_X;
  // the twins of a pair travel side by side, a little staggered (seen from the front and above, a pair of dots)
  const DX = 0.16, DZ = 0.2;
  kit.chip({ w: W, d: D, platform: 'ln' });
  // the waveguide and the splitter (written by light), the stripes of the poling (written by light too)
  const main = P.line(X0, 0, XS, 0);
  const branch = [-1, 1].map(sg => P.chain(P.line(XS, 0, XS + 0.25, 0), P.sbend(XS + 0.25, 0, X1 - 0.6, sg * ZB), P.line(X1 - 0.6, sg * ZB, X1, sg * ZB)));
  kit.ridges([main, ...branch], 'ln', { w: 0.14 });
  kit.poling({ x0: XP0, x1: XP1, z: 0, width: 1.0, period: 0.2, duty: 0.5 });

  // the pump: blue pulses from the laser's window on the left, through the stripes; what is left of it fades after
  // the splitter
  const tr = kit.pulses({ width: 0.24, spacing: 0.5, length: 0.11, speed: 3.2, y: kit.RIDGE.h + 0.03, gain: 2.0, over: true });
  tr.net.rgb = [PUMP, PUMP, PUMP, PUMP];
  const kp = [tr.add(P.line(-FAR, 0, X0, 0), { s0: 0 }), tr.add(main, { s0: FAR + X0 })];
  tr.build();
  for (const k of kp) tr.mix(k, [0.85, 0, 0, 0]);

  // the twins: two dots born together, side by side, travelling together to the splitter, then each along its
  // branch; a faint line joins them while they are on the chip
  const ph = kit.photons({ max: 40, size: 0.5, over: true });
  ph.object.material.fragmentShader = DOT_FS; ph.object.material.needsUpdate = true;
  const MAXP = 8, lpos = new Float32Array(MAXP * 6), ldist = new Float32Array(MAXP * 2);
  const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute('position', new THREE.BufferAttribute(lpos, 3));
  lgeo.setAttribute('lineDistance', new THREE.BufferAttribute(ldist, 1));      // (filled here: no new buffer per frame)
  lgeo.setDrawRange(0, 0);
  const links = new THREE.LineSegments(lgeo, new THREE.LineDashedMaterial({ color: new THREE.Color(1.0, 0.6, 0.55), dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.95, toneMapped: false }));
  links.frustumCulled = false; links.renderOrder = 9; links.userData.role = 'light';
  kit.group.add(links);
  const pairs = [];
  let id = 0, exitFn = null, timer = 0.4;
  const y = kit.RIDGE.h + 0.06;
  const emit = at => {
    const f = Number.isFinite(at) ? Math.min(1, Math.max(0, at)) : 0.15 + 0.85 * kit.rand();
    const xb = XP0 + (XP1 - XP0) * f, pid = ++id;
    const l1 = XS - xb, L = l1 + branch[0].len, dur = L / 2.6;
    const pair = { id: pid, p: [null, null] };
    for (let b = 0; b < 2; b++) {
      const br = branch[b], sg = b === 0 ? -1 : 1, o = [0, y, 0];
      pair.p[b] = ph.emit({
        along: u => {
          const s = u * L;
          if (s < l1) { o[0] = xb + s + sg * DX; o[2] = sg * DZ; return o; }
          const q = br.at(s - l1), k = Math.max(0, 1 - (s - l1) / 0.9);
          o[0] = q[0] + sg * DX * k; o[2] = q[1] + sg * DZ * k; return o;
        },
        dur, rgb: TWIN, power: 0.9, size: inst.size, fade: 0.04,
        onEnd: () => { pair.done = (pair.done || 0) + 1; if (exitFn) exitFn(b, pid); },
      });
    }
    pairs.push(pair);
    if (pairs.length > MAXP) pairs.shift();
    inst.lastId = pid;
    return dur;                     // seconds until the twins reach the chip's edge
  };
  kit.onTick(() => {
    let n = 0;
    for (const pr of pairs) {
      const a = pr.p[0], b = pr.p[1];
      a.size = b.size = inst.size;
      if (pr.done || a.t < 0 || a.t >= a.dur) continue;
      const pa = a.along(a.t / a.dur);
      lpos[6 * n] = pa[0]; lpos[6 * n + 1] = pa[1]; lpos[6 * n + 2] = pa[2];
      const pb = b.along(b.t / b.dur);
      lpos[6 * n + 3] = pb[0]; lpos[6 * n + 4] = pb[1]; lpos[6 * n + 5] = pb[2];
      ldist[2 * n] = 0; ldist[2 * n + 1] = Math.hypot(pb[0] - lpos[6 * n], pb[1] - lpos[6 * n + 1], pb[2] - lpos[6 * n + 2]);
      if (++n >= MAXP) break;
    }
    lgeo.setDrawRange(0, 2 * n);
    lgeo.attributes.position.needsUpdate = true;
    lgeo.attributes.lineDistance.needsUpdate = true;
  });

  const inst = {
    auto: true,
    gap: [1.0, 0.9],
    size: 0.5,
    lastId: 0,
    edges: [[X1, y, -ZB], [X1, y, ZB]],
    anchors: { pump: [-FAR - 0.75, 0.45, 0], pairs: [XP1 + 0.25, y, 0] },
    controls: [],
    emit,
    onExit(fn) { exitFn = fn; },
    reset() { ph.clear(); pairs.length = 0; timer = 0.4; },
    update(dt) {
      if (!inst.auto) return;
      timer -= dt;
      if (timer <= 0) { emit(); timer = inst.gap[0] + inst.gap[1] * kit.rand(); }
    },
  };
  return inst;
}

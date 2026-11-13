// Plates: small floating displays that show what goes into a chip and what comes out (a spectrum, a time
// trace, a row of numbers, a counter).  Each plate is a canvas drawn with the 2D canvas API and shown as a
// texture on a little panel that always faces the camera.
//
//   const pl = kit.plate({ w: 2.6, h: 1.46, at: [x, y, z], title: 'in' });   // title: a kit word ('in', 'out') or text
//   pl.draw((g, box, W, H) => kit.draw.spectrum(g, box, lines));             // draw now (and after a language change)
//   pl.live((g, box, W, H, t) => { ... }, 12);                                // redraw continuously, ~12 times a second
//   The frame and title are drawn for you; box = {x, y, w, h} is the free area inside, in canvas pixels.
//
// kit.draw helpers (all coordinates in canvas pixels; colours are display rgb arrays 0..1):
//   spectrum(g, box, lines, { axis: true })        lines: [{ u: 0..1 position (frequency), h: 0..1, rgb, w }]
//   curve(g, box, f, { rgbAt: u => rgb, fill: true, line: rgb })   f(u) -> 0..1, u = 0..1
//   bars(g, box, values, { labels, rgb | rgbs, highlight: index, signed: false, max: 1 })
//   trace(g, box, f, { rgb, digital: false })       f(u) -> 0..1 over the time window u = 0..1 (newest at the right)
//   marker(g, box, u, rgb, text)                    vertical marker line at u with a small label
//   text(g, s, x, y, { size: 22, rgb, align: 'left', weight: 600 })
//   axis(g, box, word)                              the axis word under the box, with an arrow ('colour', 'time')
//   thermo(g, box, level, { rgb })                  a thermometer filled to level (0..1)
import * as THREE from 'three';
import { css } from './colour.js';

const FONT = '"Segoe UI", "Yu Gothic UI", "Meiryo", system-ui, sans-serif';
const BG = 'rgba(9, 13, 19, 0.93)', EDGE = 'rgba(160, 185, 210, 0.28)', MUTED = [0.62, 0.68, 0.74];

export class Plate {
  constructor({ w = 2.6, h = 1.46, at = [0, 1.4, 0], title = '', res = 512, words = k => k } = {}) {
    this.w = w; this.h = h; this.title = title; this.words = words;
    this.W = res; this.H = Math.round(res * h / w);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.W; this.canvas.height = this.H;
    this.g = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    // (just under the bloom's threshold: the plates' words stay crisp instead of glowing)
    const mat = new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: true, color: new THREE.Color(0.9, 0.9, 0.9) });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    this.mesh.renderOrder = 3;
    this.object = new THREE.Group();
    this.object.add(this.mesh);
    this.object.position.set(...at);
    this.fn = null; this.fps = 0; this.acc = 0; this.t = 0;
    this.visibleWhen = 'always';            // 'always' | 'focus' (shown only when its chip is in focus)
    this.draw(null);
  }
  frame() {
    const g = this.g, W = this.W, H = this.H, r = Math.round(H * 0.09);
    g.clearRect(0, 0, W, H);
    g.save();
    g.beginPath(); g.roundRect(2, 2, W - 4, H - 4, r);
    g.fillStyle = BG; g.fill();
    g.lineWidth = 2; g.strokeStyle = EDGE; g.stroke();
    g.restore();
    const title = this.title ? this.words(this.title) : '';
    const top = Math.round(H * 0.07);
    if (title) text(g, title, Math.round(W * 0.05), top + Math.round(H * 0.09), { size: Math.round(H * 0.105), rgb: MUTED, weight: 700, spacing: 1 });
    const pad = Math.round(W * 0.05);
    return { x: pad, y: top + Math.round(H * (title ? 0.17 : 0.04)), w: W - 2 * pad, h: H - top - Math.round(H * (title ? 0.17 : 0.04)) - Math.round(H * 0.17) };
  }
  draw(fn) {
    if (fn) this.fn = fn;
    const box = this.frame();
    if (this.fn) this.fn(this.g, box, this.W, this.H, this.t);
    this.tex.needsUpdate = true;
  }
  live(fn, fps = 12) { this.fn = fn; this.fps = fps; this.draw(null); }
  // called by the kit every frame
  tick(dt, rateScale = 1) {
    this.t += dt;
    if (!this.fps || !this.fn) return;
    this.acc += dt;
    const every = 1 / Math.max(0.5, this.fps * rateScale);
    if (this.acc >= every) { this.acc = 0; this.draw(null); }
  }
}

// --------------------------------------------------------------------------------------------- drawing helpers
export function text(g, s, x, y, { size = 22, rgb = [0.93, 0.95, 0.97], align = 'left', weight = 600, spacing = 0, baseline = 'alphabetic' } = {}) {
  g.save();
  g.font = `${weight} ${size}px ${FONT}`;
  g.fillStyle = css(rgb);
  g.textAlign = align; g.textBaseline = baseline;
  if (spacing && 'letterSpacing' in g) g.letterSpacing = spacing + 'px';
  g.fillText(s, x, y);
  g.restore();
}

export function axis(g, box, word) {
  const H = g.canvas.height;
  const y = Math.min(box.y + box.h + Math.round(box.h * 0.08), H - Math.round(H * 0.15));
  g.save();
  g.strokeStyle = 'rgba(160,185,210,0.45)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(box.x, y); g.lineTo(box.x + box.w, y); g.stroke();
  g.beginPath(); g.moveTo(box.x + box.w, y); g.lineTo(box.x + box.w - 10, y - 5); g.lineTo(box.x + box.w - 10, y + 5); g.closePath();
  g.fillStyle = 'rgba(160,185,210,0.6)'; g.fill();
  g.restore();
  const size = Math.max(14, Math.round(H * 0.085));
  if (word) text(g, word, box.x + box.w, Math.min(H - 6, y + size + 4), { size, rgb: MUTED, align: 'right', weight: 600 });
}

export function spectrum(g, box, lines, { axisWord = null, glow = true } = {}) {
  const base = box.y + box.h;
  g.save();
  g.lineCap = 'round';
  for (const L of lines) {
    if (!(L.h > 0.003)) continue;
    const x = box.x + Math.min(1, Math.max(0, L.u)) * box.w;
    const hh = Math.min(1, L.h) * box.h;
    g.strokeStyle = css(L.rgb);
    g.lineWidth = L.w ?? Math.max(3, box.w * 0.008);
    if (glow) { g.shadowColor = css(L.rgb, 0.9); g.shadowBlur = 10; }
    g.beginPath(); g.moveTo(x, base); g.lineTo(x, base - hh); g.stroke();
  }
  g.restore();
  if (axisWord !== false) axis(g, box, axisWord);
}

export function curve(g, box, f, { rgbAt = null, fill = true, line = null, n = 160, axisWord = null } = {}) {
  const base = box.y + box.h;
  const X = u => box.x + u * box.w, Y = u => base - Math.min(1, Math.max(0, f(u))) * box.h;
  g.save();
  if (fill) {
    const grad = g.createLinearGradient(box.x, 0, box.x + box.w, 0);
    for (let k = 0; k <= 12; k++) { const u = k / 12; grad.addColorStop(u, css(rgbAt ? rgbAt(u) : (line || [1, 1, 1]), 0.85)); }
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(X(0), base);
    for (let i = 0; i <= n; i++) { const u = i / n; g.lineTo(X(u), Y(u)); }
    g.lineTo(X(1), base); g.closePath(); g.fill();
  }
  if (line || !fill) {
    g.strokeStyle = css(line || [1, 1, 1]); g.lineWidth = 3; g.shadowColor = css(line || [1, 1, 1], 0.8); g.shadowBlur = 8;
    g.beginPath();
    for (let i = 0; i <= n; i++) { const u = i / n; if (i) g.lineTo(X(u), Y(u)); else g.moveTo(X(u), Y(u)); }
    g.stroke();
  }
  g.restore();
  if (axisWord !== false) axis(g, box, axisWord);
}

export function bars(g, box, values, { labels = null, rgb = [1, 0.3, 0.2], rgbs = null, highlight = -1, signed = false, max = 1, gap = 0.28 } = {}) {
  const n = values.length, slot = box.w / n, bw = slot * (1 - gap);
  const labH = labels ? Math.round(box.h * 0.22) : 0;
  const top = box.y, bottom = box.y + box.h - labH, mid = signed ? (top + bottom) / 2 : bottom;
  const span = signed ? (bottom - top) / 2 : bottom - top;
  g.save();
  g.strokeStyle = 'rgba(160,185,210,0.35)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(box.x, mid); g.lineTo(box.x + box.w, mid); g.stroke();
  for (let i = 0; i < n; i++) {
    const v = Math.max(signed ? -1 : 0, Math.min(1, values[i] / max));
    const c = rgbs ? rgbs[i] : rgb;
    const x = box.x + slot * i + (slot - bw) / 2;
    const hgt = Math.abs(v) * span;
    g.fillStyle = css(c, i === highlight || highlight < 0 ? 1 : 0.55);
    if (i === highlight) { g.shadowColor = css(c, 0.9); g.shadowBlur = 14; } else g.shadowBlur = 0;
    g.fillRect(x, v >= 0 ? mid - hgt : mid, bw, Math.max(2, hgt));
    if (labels) text(g, String(labels[i]), x + bw / 2, box.y + box.h - 2, { size: Math.round(labH * 0.82), align: 'center', rgb: i === highlight ? [1, 0.86, 0.45] : MUTED, weight: i === highlight ? 800 : 600 });
  }
  g.restore();
}

export function trace(g, box, f, { rgb = [1, 0.3, 0.2], n = 200, axisWord = null, digital = false } = {}) {
  const base = box.y + box.h;
  g.save();
  g.strokeStyle = css(rgb); g.lineWidth = 3.5; g.lineJoin = digital ? 'miter' : 'round';
  g.shadowColor = css(rgb, 0.85); g.shadowBlur = 9;
  g.beginPath();
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = Math.min(1, Math.max(0, f(u)));
    const x = box.x + u * box.w, y = base - v * box.h;
    if (i === 0) g.moveTo(x, y);
    else { if (digital && prev !== null && Math.abs(prev - y) > 0.5) g.lineTo(x, prev); g.lineTo(x, y); }
    prev = y;
  }
  g.stroke();
  g.restore();
  if (axisWord !== false) axis(g, box, axisWord);
}

export function marker(g, box, u, rgb = [1, 1, 1], label = '') {
  const x = box.x + u * box.w;
  g.save();
  g.setLineDash([6, 6]); g.strokeStyle = css(rgb, 0.8); g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, box.y); g.lineTo(x, box.y + box.h); g.stroke();
  g.restore();
  if (label) text(g, label, x, box.y + Math.round(box.h * 0.16), { size: Math.round(box.h * 0.16), align: 'center', rgb });
}

// a thermometer: a column filled to level (0..1) in rgb, a bulb, a few ticks (no numbers)
export function thermo(g, box, level, { rgb = [1, 0.32, 0.15] } = {}) {
  const tw = Math.min(box.w * 0.3, 40), r = tw * 0.95, cx = box.x + box.w * 0.42;
  const top = box.y + 4, base = box.y + box.h - r * 1.15, cy = base + r * 0.15;
  g.save();
  g.fillStyle = 'rgba(255,255,255,0.07)'; g.strokeStyle = 'rgba(200,215,230,0.75)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(cx - tw / 2, top, tw, base - top, tw / 2); g.fill(); g.stroke();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = css(rgb); g.shadowColor = css(rgb, 0.9); g.shadowBlur = 16;
  g.beginPath(); g.arc(cx, cy, r - 5, 0, Math.PI * 2); g.fill();
  const span = base - top - 8, h = span * Math.max(0, Math.min(1, level));
  g.beginPath(); g.roundRect(cx - tw / 2 + 6, base - h, tw - 12, h + r * 0.5, (tw - 12) / 2); g.fill();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(200,215,230,0.55)'; g.lineWidth = 2;
  for (let i = 1; i <= 5; i++) { const y = base - span * i / 5.4; g.beginPath(); g.moveTo(cx + tw / 2 + 5, y); g.lineTo(cx + tw / 2 + 16, y); g.stroke(); }
  g.restore();
}

// The App: the presentation buttons, the story at the bottom left, the chip in focus (its name, one sentence, its
// controls and the way back), the tour, keyboard shortcuts, the kiosk's idle reset.  The 3D table itself is
// table.js; the chips are devices/*.js.  No side panel in this presentation - zooming in and
// seeing the chip work is the explanation.  The detailed panel (how it works, where it is used, what is fixed,
// a real example) is still there behind ?panel=1, for preparing a kiosk or a presentation.
//
// Tab 2: "Programmable photonics" - one blank, light-grey chip; green light from a projector
// carries the program, a green circuit appears, the chip does its job; a catalog of programs on the side.
// Tab 3: "Potential applications" - one application per button (apps/); the first, optical computation: how light
// can compute - a GPU that sharpens blurry pictures of cartoon animals and heats up as they stream through it, a lens
// that sharpens the same pictures and stays cold, a "super glass" that reads handwritten digits, flattened into our
// chip, whose pattern is then written by light and rewritten for spoken vowels.
// Tab 4: "Further details" (RY, 2026-11-13), the last tab (after the applications), four parts chosen on the right:
// "How it works" (how.js) - the chip's layers, the voltage and the light, step by step - "Journal references"
// (refs.js) - the two papers this page builds on, each with its issue's cover and a QR code to read with a phone -
// and (2026-11-14) "Press release and news coverage" (refs.js) - articles about the work, each with a QR code - and
// "This exhibition" (refs.js) - a QR code of this page itself, to take it away on a phone.
//
// Stepping (RY, 2026-11-13): the visitor steps with Back and Next - a chip, a program, a part of an application's
// story, a step of how it works - and nothing moves on by itself.  "Auto-play", the switch in the top bar (off by
// default), plays the steps by itself instead (the tour) and leads on from tab to tab; a step by hand turns it off.
// The kiosk still falls back to its own loop after IDLE_S seconds without input.
//
// URL parameters: tab=prog|apps|how (open on tab 2, 3 or 4; tab=refs|press|exhibit: tab 4's cards), lang=ja|en, kiosk=1 (a screen left running on its own: Japanese unless lang=en, larger text, idle reset and tour), dev=<id> (open with
// that chip in focus), only=<id,id> (load only these chips - for development), tour=1 (auto-play on), labels=0,
// quality=low, motion=reduce|full, scale=<ui scale>, panel=1 (the detailed panel), debug (show the error log);
// for tests: dwell=<s>, idle=<s>, hold=0 (tab 3's stories run on by themselves without auto-play, as before).
import { Table } from './table.js';
import { loadDevices } from './devices/index.js';
import { loadPrograms } from './programs/index.js';
import { APPS } from './apps/index.js';
import { STEPS } from './how.js';
import { renderCard } from './refs.js';
import { t, setLang, getLang, applyDom, fill } from './i18n.js';
import { CATEGORY, css } from './kit/colour.js';

const params = new URLSearchParams(location.search);
const $ = s => document.querySelector(s);
const KIOSK = params.has('kiosk');
const PANEL = params.get('panel') === '1';
const TOUR_DWELL = +params.get('dwell') || 12;   // seconds per chip on the tour (dwell= for tests)
const TOUR_REST = 8;                              // seconds on the overview between two rounds of the kiosk's tour
const IDLE_S = +params.get('idle') || 90;         // kiosk: seconds without input before the page resets itself and tours
const TABS = [
  { id: 'conv', key: 'tab.conv',
    icon: '<svg class="ico" viewBox="0 0 34 34" fill="none" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="12" height="10" rx="2" stroke="#9fb3c8"/><rect x="19" y="5" width="12" height="10" rx="2" stroke="#9fb3c8"/><rect x="3" y="19" width="12" height="10" rx="2" stroke="#9fb3c8"/><rect x="19" y="19" width="12" height="10" rx="2" stroke="#9fb3c8"/><path d="M5 10h8M21 10c3 0 3-3 6-3M7 24a2 2 0 1 0 4 0a2 2 0 1 0-4 0M21 24h8" stroke="#ff5a4e"/></svg>' },
  { id: 'prog', key: 'tab.prog',
    icon: '<svg class="ico" viewBox="0 0 34 34" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="12" y="2" width="10" height="5" rx="1" stroke="#9fb3c8"/><path d="M17 7L7 23h20Z" fill="rgba(63,255,106,0.22)" stroke="#3fff6a"/><rect x="3" y="23" width="28" height="8" rx="2" fill="#c9d0d8" stroke="#c9d0d8"/><path d="M7 27h7l3-2h10" stroke="#16b83a"/></svg>' },
  { id: 'apps', key: 'tab.apps',
    icon: '<svg class="ico" viewBox="0 0 34 34" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="17" width="13" height="12" rx="2" stroke="#9fb3c8"/><path d="M5 14c1.4-1.6-1.4-3.2 0-4.8M8.5 14c1.4-1.6-1.4-3.2 0-4.8M12 14c1.4-1.6-1.4-3.2 0-4.8" stroke="#ff7a3c"/><rect x="19" y="17" width="13" height="12" rx="2" fill="#c9d0d8" stroke="#c9d0d8"/><path d="M21 21h9M21 25l4-2 5 2" stroke="#16b83a"/></svg>' },
  { id: 'how', key: 'tab.how',
    icon: '<svg class="ico" viewBox="0 0 34 34" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M29 2l-5 8" stroke="#3fff6a"/><path d="M4 12h20l5-3H9z" stroke="#f6e7a0"/><path d="M4 19h20l5-3H9z" fill="rgba(237,165,102,0.35)" stroke="#eda566"/><path d="M4 27h20l5-3H9z" fill="#c9d0d8" stroke="#c9d0d8"/></svg>' },
];
// tab 2: the programs of the light-programmable chip, most of them the circuit of a chip of tab 1.
// The tab is a conceptual picture - no "shown in the lab" / "planned" tags; the catalog starts with "No program";
// the AI program is two, image and voice recognition, each a free-form pattern like the paper's (programs/*.js).
// The light router, image recognition and spectrometer show the 2D Waveguide Studio's simulations:
// programs/router.js and awg.js take the place of tab 1's router and spectrometer here (same ids).
// The quantum light source is not in the catalog (it stays on tab 1 and in tab 3's quantum internet).
// The light computer (programs/compute.js) is not on the page: its file stays (unused; dev/devcheck still checks it).
// Tab 3 tells optical computation as a story of its own.
const CATALOG = ['router', 'image', 'voice', 'awg', 'shg'].map(id => ({ id }));
const TOUR_DWELL_PROG = +params.get('dwell') || 13;   // seconds per program on the tour
const TOUR_DWELL_APPS = +params.get('dwell') || 0;    // seconds per application on the tour (0: each its own, APPS)
// seconds on one item of the tour: its own, else an application's whole story (its zoom-outs too), a program, a chip
const HOW_S = +params.get('dwell') || 7;              // seconds per step of "How it works" (on its own, and on the tour)
const REFS_S = +params.get('dwell') || 15;            // seconds on each card of tab 4 (papers, press, exhibition), auto-play's last items
// tab 4's four parts (the catalog on the right): the steps of how it works, then three cards over the empty view
// (refs.js: the papers, the press coverage, this exhibition); each its dot's colour
const DETAILS = [{ id: 'how', color: '#3fff6a' }, { id: 'refs', color: '#e3b94d' }, { id: 'press', color: '#ff9a5c' }, { id: 'exhibit', color: '#73c8ff' }];
const CARDS = ['refs', 'press', 'exhibit'];
const dwellOf = it => it.dwell ?? (it.tab === 'apps' ? TOUR_DWELL_APPS || (APPS.find(a => a.id === it.id) || {}).dwell || 18 : it.tab === 'prog' ? TOUR_DWELL_PROG : it.tab === 'how' ? HOW_S : TOUR_DWELL);
// stepping by hand, each part of tab 3's stories waits at its end for Next (apps/index.js hold); hold=0, for tests,
// lets the stories run on by themselves as they did before
const HOLD = params.get('hold') !== '0';
// auto-play leads on from a tab to the next; on tab 4 after the steps of how it works and its cards, it ends
const NEXT_TAB = { conv: 'prog', prog: 'apps', apps: 'how' };
// the kiosk's idle loop, a trailer: the table, three etched chips, the same three jobs written on the blank chip
// (within about 40 s), then the applications, how it works, the papers, the press coverage and this exhibition
const TRAILER = [{ tab: 'conv', id: null, dwell: 6 }, ...['router', 'awg', 'shg'].map(id => ({ tab: 'conv', id, dwell: 9 })),
  ...['router', 'awg', 'shg'].map(id => ({ tab: 'prog', id, dwell: 10 }))];

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

export class App {
  constructor() { this.ready = this.init(); }

  async init() {
    if (KIOSK) document.documentElement.classList.add('kiosk');
    if (params.get('scale')) document.documentElement.style.setProperty('--s', params.get('scale'));
    setLang(params.get('lang') || (KIOSK ? 'ja' : 'en'));
    this.reduced = params.get('motion') === 'reduce' || (params.get('motion') !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const only = params.get('only') ? params.get('only').split(',') : null;
    this.entries = await loadDevices(only);
    for (const e of this.entries) if (e.error) window.dispatchEvent(new ErrorEvent('error', { message: `device ${e.mod.meta.id}: ${e.error.message || e.error}` }));
    const progs = await loadPrograms(message => window.dispatchEvent(new ErrorEvent('error', { message })));
    this.catalog = CATALOG.map(c => ({ ...c, mod: progs[c.id] || (this.entries.find(e => e.mod.meta.id === c.id && !e.error) || {}).mod })).filter(c => c.mod);
    this.table = new Table($('#stage'), { entries: this.entries, catalog: this.catalog, programs: progs, lang: getLang, quality: params.get('quality') || 'high', kiosk: KIOSK, reduced: this.reduced });
    this.tab = 'conv';
    this.detail = 'how';                 // tab 4: 'how' (how it works) | a card: 'refs' (papers), 'press', 'exhibit' (this page)
    for (const msg of this.table.errors) window.dispatchEvent(new ErrorEvent('error', { message: msg }));
    this.order = this.table.devices.map(d => d.id);
    this.focusId = null;
    this.tour = null;
    this.lastInput = performance.now();
    this.statusAcc = 0;
    this.buildModes();
    // the kiosk's idle loop invites a touch (otherwise nothing says the screen can be used)
    this.invite = el('div', 'invite'); this.invite.hidden = true; $('#stage').append(this.invite);
    this.bindUi();
    this.refreshTexts();
    this.table.on('pick', id => {
      this.touch();
      if (id && id !== this.focusId) this.focus(id);
      else if (!id && this.focusId) this.overview();
    });
    const dev = params.get('dev');
    if (params.get('app')) this.table.apps.load(params.get('app'));      // ?tab=apps&app=insitu: that application
    const tab0 = params.get('tab');
    if (['prog', 'apps', 'how', ...CARDS].includes(tab0)) { this.setTab(CARDS.includes(tab0) ? 'how' : tab0, { instant: true }); if (CARDS.includes(tab0)) this.setDetail(tab0); }
    else if (dev && this.table.byId[dev]) this.focus(dev, { instant: true });
    else this.overview({ instant: true });
    if (params.get('labels') === '0') this.setLabels(false);
    if (params.has('tour')) this.startTour();
    if (KIOSK) this.kioskSetup();
    window.addEventListener('resize', () => this.layout());
    this.loop();
  }

  // ------------------------------------------------------------------ the presentation buttons (one for now)
  buildModes() {
    const nav = $('#modes');
    nav.innerHTML = '';
    TABS.forEach((tab, i) => {
      const b = el('button', 'mode', `${tab.icon}<span class="mname"></span><span class="mkey">${i + 1}</span>`);
      b.type = 'button';
      b.dataset.tab = tab.id;
      b.setAttribute('aria-pressed', String(tab.id === this.tab));
      b.addEventListener('click', () => { this.touch(); this.pickTab(tab.id); b.blur(); });
      nav.append(b);
    });
  }
  syncModes() { for (const b of document.querySelectorAll('.mode')) b.setAttribute('aria-pressed', String(b.dataset.tab === this.tab)); }
  // a tab button (or key 1-4): auto-play stays on and plays the new tab from its start (the kiosk's loop stops);
  // tab 1's own button takes the table back to the overview
  pickTab(id) {
    if (id === this.tab && id !== 'conv') return;
    const auto = !!this.tour && !this.tour.loop;
    this.stopTour();
    if (id !== this.tab) this.setTab(id); else this.overview();
    if (auto) this.startTour({ fromStart: true });
  }

  // tab 1 (the table of chips), tab 2 (the programmable chip), tab 3 (the applications) or tab 4 (how it works)
  setTab(tab, { instant = false } = {}) {
    if (tab === this.tab) return;
    if (this.focusId) this.overview({ instant: true });
    this.tab = tab;
    $('#catalog').hidden = tab === 'conv';
    document.body.dataset.tab = tab;
    this.layout();                       // (the catalog and the story's place first: the camera is fitted to them)
    this.table.setTab(tab, { instant });
    // stepping by hand, tab 2 opens on the blank chip and waits for Next (bench.enter() asks for the first program,
    // which the light would write by itself); auto-play asks for its program at once
    if (tab === 'prog' && !this.tour) this.table.bench.load(null);
    this.detail = 'how';                 // (tab 4 opens on how it works, at its first step: table.setTab -> how.enter())
    this.syncModes();
    this.refreshTexts();
  }
  // tab 4: "How it works" (the chip's layers in 3D, step by step; back from a card, from its first step), or a card
  // over the empty 3D view: "Journal references", "Press release and news coverage" or "This exhibition" (refs.js)
  setDetail(d) {
    if (this.tab !== 'how' || d === this.detail) return;
    const was = this.detail;
    this.detail = d;
    if (d === 'how') this.table.how.enter(); else if (was === 'how') this.table.how.leave();
    this.refreshTexts();
  }
  syncDetail() {
    const on = this.tab === 'how' && CARDS.includes(this.detail), box = $('#refs');
    document.body.dataset.detail = this.tab === 'how' ? this.detail : '';
    box.hidden = !on;
    if (on) renderCard(box, this.detail, { kiosk: KIOSK });
  }

  // ------------------------------------------------------------------ tabs 2 and 3: the catalog on the right
  // tab 2: "No program" first (no light: the chip is blank), then the programs; tab 3: the applications; tab 4: how
  // it works and its three cards
  buildCatalog() {
    const list = $('#catalog .cat-list');
    list.innerHTML = '';
    $('#cat-title').textContent = t(this.tab === 'apps' ? 'apps.title' : this.tab === 'how' ? 'more.title' : 'cat.title');
    // (tab 3: under each application's name, what it means in a few words - the names themselves stay)
    const items = this.tab === 'apps'
      ? APPS.map(a => ({ id: a.id, name: t('app.' + a.id), sub: t('app.' + a.id + '.sub'), cls: 'prog app', cat: 'compute', go: () => this.table.apps.load(a.id) }))
      : this.tab === 'how'
      ? DETAILS.map(d => ({ id: d.id, name: t('more.' + d.id), sub: t('more.' + d.id + '.sub'), cls: 'prog app', color: d.color, go: () => this.setDetail(d.id) }))
      : [{ id: null }, ...this.catalog].map(c => ({ id: c.id, name: c.id ? this.textOf(c).name || c.id : t('cat.none'), cls: c.id ? 'prog' : 'prog none', cat: c.id && c.mod.meta.category, go: () => this.table.bench.load(c.id) }));
    for (const c of items) {
      const b = el('button', c.cls, '<i></i><span class="pname"></span>'); b.type = 'button';
      b.dataset.id = c.id || '';
      if (c.cat || c.color) b.style.setProperty('--cat', c.color || CATEGORY[c.cat] || '#9fb3c8');
      b.querySelector('.pname').textContent = c.name;
      if (c.sub) { const s = el('span', 'psub'); s.textContent = c.sub; b.querySelector('.pname').append(s); }
      b.addEventListener('click', () => { this.touch(); this.stopTour(); c.go(); this.syncCatalog(); this.renderStory(); });
      list.append(b);
    }
    this.pillKey = null;
    this.syncCatalog();
  }
  syncCatalog() {
    // (tab 2 opens on the blank chip: nothing is pressed until the first program is being written)
    const bench = this.table.bench, opening = bench.phase === 'blank' && !bench.current && !bench.erased;
    const sel = this.tab === 'apps' ? this.table.apps.selected || '' : this.tab === 'how' ? this.detail : opening ? null : bench.selected || '';
    let on = null;
    for (const b of document.querySelectorAll('#catalog .prog')) { const p = b.dataset.id === sel; b.setAttribute('aria-pressed', String(p)); if (p) on = b; }
    // phones: the catalog is one row of pills running off the screen; whenever the program (or application) changes,
    // the pressed pill is scrolled to the middle of the row - only then, so that a visitor can scroll the row by hand
    const key = `${this.tab}|${sel}`;
    if (on && key !== this.pillKey && innerWidth <= 600) {
      const cat = $('#catalog');
      cat.scrollTo({ left: Math.max(0, on.offsetLeft - (cat.clientWidth - on.offsetWidth) / 2), behavior: this.reduced ? 'auto' : 'smooth' });
    }
    this.pillKey = key;
  }
  // the arrow keys go round the catalog ("No program" included on tab 2)
  stepProgram(d) {
    if (this.tab === 'apps') {
      const ids = APPS.map(a => a.id), n = ids.length;
      this.table.apps.load(ids[(ids.indexOf(this.table.apps.selected) + d + n) % n]);
    } else {
      const ids = [null, ...this.catalog.map(c => c.id)], n = ids.length;
      this.table.bench.load(ids[(ids.indexOf(this.table.bench.selected) + d + n) % n]);
    }
    this.syncCatalog();
    this.renderStory();
  }

  bindUi() {
    $('#btn-auto').addEventListener('click', () => { this.touch(); if (this.tour) this.stopTour(); else this.startTour(); });
    $('#btn-lang').addEventListener('click', () => { this.touch(); this.setLanguage(getLang() === 'en' ? 'ja' : 'en'); });
    $('#btn-labels').addEventListener('click', () => { this.touch(); this.setLabels(!this.table.labelsOn); });
    $('#btn-reset').addEventListener('click', () => { this.touch(); this.table.applyFit(false); });
    $('#p-back').addEventListener('click', () => { this.touch(); this.stopTour(); this.overview(); });
    $('#p-prev').addEventListener('click', () => { this.touch(); this.stopTour(); this.step(-1); });
    $('#p-next').addEventListener('click', () => { this.touch(); this.stopTour(); this.step(1); });
    window.addEventListener('keydown', e => this.onKey(e));
    for (const ev of ['pointerdown', 'wheel', 'touchstart']) window.addEventListener(ev, () => this.touch(), { passive: true });
    // a touch on the view ends the kiosk's loop; auto-play, turned on with its switch, keeps going while the visitor
    // turns the view (a chip picked, or a step by hand, ends it)
    $('#stage').addEventListener('pointerdown', e => { if (this.tour && this.tour.loop && !e.target.closest('#story, #viewbtns')) this.stopTour(); });
  }
  syncAuto() { $('#btn-auto').setAttribute('aria-pressed', String(!!this.tour)); }

  setLanguage(l) {
    setLang(l);
    this.table.setLang();
    this.refreshTexts();
  }
  setLabels(on) {
    this.table.setLabelsVisible(on);
    $('#btn-labels').setAttribute('aria-pressed', String(on));
  }

  refreshTexts() {
    applyDom();
    $('#btn-lang').textContent = t('btn.lang');
    this.invite.textContent = t('tour.invite');
    $('#tabsub').textContent = t(this.tab === 'how' && CARDS.includes(this.detail) ? `tab.${this.detail}.sub` : `tab.${this.tab}.sub`);
    this.syncDetail();
    this.buildCatalog();
    this.table.bench.setLabelText(t);
    this.table.apps.setLabelText(t);
    this.table.how.setLabelText(t);
    for (const b of document.querySelectorAll('.mode')) b.querySelector('.mname').textContent = t(TABS.find(x => x.id === b.dataset.tab).key);
    if (this.focusId && PANEL) this.fillPanel(this.table.byId[this.focusId]);
    this.renderStory();
    this.layout();
  }

  // ------------------------------------------------------------------ overview and focus
  overview({ instant = false } = {}) {
    if (this.focusId) {
      const p = $('#panel');
      p.classList.add('closing');
      clearTimeout(this.closeTimer);
      this.closeTimer = setTimeout(() => { if (!this.focusId) { p.hidden = true; p.classList.remove('closing'); this.layout(); } }, instant || this.reduced ? 0 : 320);
    } else $('#panel').hidden = true;
    this.focusId = null;
    document.body.dataset.focus = '';
    this.table.setPanel(0);
    this.table.overview({ instant });
    this.renderStory();
    this.layout();
  }

  focus(id, { instant = false, fromTour = false } = {}) {
    const rec = this.table.byId[id];
    if (!rec) return;
    if (!fromTour) this.stopTour();
    clearTimeout(this.closeTimer);
    this.focusId = id;
    document.body.dataset.focus = id;
    if (PANEL) {
      const p = $('#panel');
      p.hidden = false;
      p.classList.remove('closing');
      this.fillPanel(rec);
      p.querySelector('.p-body').scrollTop = 0;
    }
    this.table.setPanel(this.panelWidth());
    this.renderStory();
    this.layout();
    this.table.focus(id, { instant });
  }

  step(d) {
    const n = this.order.length;
    const i = this.focusId ? this.order.indexOf(this.focusId) : (d > 0 ? -1 : 0);
    this.focus(this.order[(i + d + n) % n]);
  }

  panelWidth() {
    const p = $('#panel');
    if (!PANEL || p.hidden || innerWidth <= 600) return 0;
    return p.getBoundingClientRect().width + 16;
  }

  // texts of a device in the current language, falling back to English key by key
  textOf(rec) {
    const text = (rec.mod || rec).text;
    const T = (text && text[getLang()]) || {}, E = (text && text.en) || {};
    return new Proxy(T, { get: (o, k) => (o[k] !== undefined && o[k] !== '' ? o[k] : E[k]) });
  }

  fillPanel(rec) {
    const T = this.textOf(rec), meta = rec.meta, p = $('#panel');
    p.style.setProperty('--cat', CATEGORY[meta.category] || '#9fb3c8');
    p.querySelector('.p-cat span').textContent = t('cat.' + meta.category);
    $('#p-name').textContent = T.name || rec.id;
    p.querySelector('.p-tech').textContent = T.tech || '';
    p.querySelector('.p-what').innerHTML = T.what || '';
    p.querySelector('.io.in span').textContent = T.in || '';
    p.querySelector('.io.out span').textContent = T.out || '';
    p.querySelector('.p-io').hidden = !T.in && !T.out;
    p.querySelector('.p-how').innerHTML = T.how || '';
    p.querySelector('.p-use').innerHTML = T.use || '';
    p.querySelector('.p-fixed').innerHTML = T.fixed || '';
    p.querySelector('.p-how').parentElement.hidden = !T.how;
    p.querySelector('.p-use').parentElement.hidden = !T.use;
    p.querySelector('.p-fixedbox').hidden = !T.fixed;
    p.querySelector('.p-ref').textContent = T.ref ? `${t('panel.example')}: ${T.ref}` : '';
    p.querySelector('.p-note').textContent = T.note || '';
    p.querySelector('.p-count').textContent = t('panel.count', { i: this.order.indexOf(rec.id) + 1, n: this.order.length });
    $('.p-controls').innerHTML = '';
    $('.p-try').hidden = !this.buildControls(rec, T, $('.p-controls'));
  }

  // the chip's controls (buttons, choices, toggles, sliders) into a container; returns how many
  buildControls(rec, T, box, onBench = false) {
    const ctrls = (rec.inst && rec.inst.controls) || [];
    this.syncers = [];
    const call = (fn, ...a) => (onBench ? this.table.bench.call(rec, fn, ...a) : this.table.callInst(rec, fn, ...a));
    const act = (id, v) => { this.touch(); this.stopTour(); call('act', id, v); this.syncControls(); this.statusAcc = 1; };
    const value = id => call('value', id);
    const lab = id => (T.ctl && T.ctl[id]) || id;
    const labOf = c => lab(c.label || c.id);           // (a control may name its own label: c.label)
    const optLab = (id, o) => (T.opt && T.opt[id] && T.opt[id][o]) ?? String(o);
    // (a control that makes a colour - c.rgb, the colour converter's - shows a dot of that colour, as the catalog's
    // programs do; its words go into a span beside the dot)
    const words = (b, c) => {
      if (!c.rgb) return b;
      const dot = el('i', 'dot'); dot.style.setProperty('--dot', css(c.rgb));
      const s = el('span');
      b.append(dot, s);
      return s;
    };
    for (const c of ctrls) {
      const row = el('div', 'row');
      if (c.type === 'button') {
        // (plain: a quiet button - tab 3's "From the start", which as a filled one looked like a chosen state)
        const b = el('button', 'cbtn' + (c.plain ? '' : ' primary')); b.type = 'button'; words(b, c).textContent = labOf(c);
        b.addEventListener('click', () => act(c.id));
        row.append(b);
      } else if (c.type === 'toggle') {
        const b = el('button', 'cbtn'); b.type = 'button';
        const w = words(b, c);
        const sync = () => { const v = !!value(c.id); b.setAttribute('aria-pressed', String(v)); w.textContent = `${labOf(c)}${getLang() === 'ja' ? '：' : ': '}${t(v ? 'on' : 'off')}`; };
        b.addEventListener('click', () => act(c.id, !value(c.id)));
        this.syncers.push(sync); sync();
        row.append(b);
      } else if (c.type === 'choice') {
        row.append(el('span', 'glabel', '')); row.lastChild.textContent = labOf(c);
        const btns = (c.options || []).map(o => {
          const b = el('button', 'cbtn'); b.type = 'button'; b.textContent = optLab(c.id, o);
          b.addEventListener('click', () => act(c.id, o));
          row.append(b);
          return [o, b];
        });
        const sync = () => { const v = value(c.id); for (const [o, b] of btns) b.setAttribute('aria-pressed', String(o === v)); };
        this.syncers.push(sync); sync();
      } else if (c.type === 'slider') {
        const id = `ctl-${rec.id}-${c.id}`;
        const l = el('label', 'glabel'); l.htmlFor = id; l.textContent = labOf(c);
        const inp = el('input'); inp.type = 'range'; inp.id = id;
        inp.min = c.min ?? 0; inp.max = c.max ?? 1; inp.step = c.step ?? 0.01;
        const val = el('span', 'val');
        const show = v => { val.textContent = `${(+v).toFixed(c.digits ?? 0)}${c.unit ? (/^[°%]/.test(c.unit) ? '' : ' ') + c.unit : ''}`; };   // (21°, 75%)
        inp.addEventListener('input', () => { act(c.id, +inp.value); show(inp.value); });
        const sync = () => { if (document.activeElement === inp) return; const v = value(c.id); if (v != null) { inp.value = v; show(v); } };
        this.syncers.push(sync); sync();
        row.append(l, inp);
        if (!c.noValue) row.append(val);     // (noValue: the picture shows the setting; a number would only puzzle)
      }
      box.append(row);
    }
    return ctrls.length;
  }
  syncControls() { for (const s of this.syncers || []) s(); }

  // the caption at the bottom left: the overview's story, or the chip's live status
  renderStory() {
    if (this.tab === 'prog') { this.renderProgStory(); return; }
    if (this.tab === 'apps') { this.renderAppsStory(); return; }
    if (this.tab === 'how') { if (CARDS.includes(this.detail)) this.renderCardStory(); else this.renderHowStory(); return; }
    const cap = $('#caption'), ctl = $('#controls'), note = $('#note');
    ctl.innerHTML = '';
    if (!this.focusId) {
      cap.innerHTML = t('cap.conv');
      note.textContent = '';
      // (the category tags were taken out for the general public: as little text as possible; kept with ?panel=1)
      const row = el('div', 'legendrow');
      const cats = [...new Set(this.table.devices.map(d => d.meta.category))];
      for (const c of ['comm', 'compute', 'sense', 'convert', 'quantum', 'metro'].filter(x => cats.includes(x))) {
        const b = el('button', 'legend'); b.type = 'button';
        b.style.setProperty('--cat', CATEGORY[c]);
        b.innerHTML = '<i></i><span></span>';
        b.querySelector('span').textContent = t('cat.' + c);
        b.setAttribute('aria-pressed', String(this.table.highlight === c));
        b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') this.table.setHighlight(c); });
        b.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && b.getAttribute('aria-pressed') !== 'true') this.table.setHighlight(null); });
        b.addEventListener('click', () => {
          this.touch();
          const on = b.getAttribute('aria-pressed') !== 'true';
          for (const o of row.children) o.setAttribute('aria-pressed', 'false');
          b.setAttribute('aria-pressed', String(on));
          this.table.setHighlight(on ? c : null);
        });
        row.append(b);
      }
      this.legendRow = PANEL ? row : null;
    } else {
      this.legendRow = null;
      this.table.setHighlight(null);
      note.textContent = '';
      if (PANEL) this.renderStatus();
      else {
        // the chip in focus: its kind of job, its name, one sentence; its controls; the way back and on
        const rec = this.table.byId[this.focusId], T = this.textOf(rec);
        cap.innerHTML = '';
        const head = el('span', 'fhead', '<i></i><span></span>');
        head.style.setProperty('--cat', CATEGORY[rec.meta.category] || '#9fb3c8');
        head.querySelector('span').textContent = t('cat.' + rec.meta.category);
        const name = el('span', 'fname'); name.textContent = T.name || rec.id;
        const what = el('span', 'fwhat', T.what || '');
        cap.append(head, name, what);
        const crow = el('div', 'frow');
        if (this.buildControls(rec, T, crow)) ctl.append(crow);
        // the way back and on: the last row, so that it stays in one place from chip to chip (the story is anchored
        // at the bottom)
        const nav = el('div', 'frow fnav');
        const mk = (cls, key, f, glyph) => {
          const b = el('button', 'navbtn ' + cls); b.type = 'button';
          b.innerHTML = glyph; b.title = t(key); b.setAttribute('aria-label', t(key));
          b.addEventListener('click', () => { this.touch(); this.stopTour(); f(); });
          return b;
        };
        const back = el('button', 'navbtn back'); back.type = 'button';
        back.innerHTML = '<span aria-hidden="true">←</span> <span class="l"></span>';
        back.querySelector('.l').textContent = t('panel.back');
        back.addEventListener('click', () => { this.touch(); this.stopTour(); this.overview(); });
        nav.append(mk('prev', 'panel.prev', () => this.step(-1), '‹'), mk('next', 'panel.next', () => this.step(1), '›'), back);
        ctl.append(nav);
      }
    }
    // the overview: Next opens the first chip (in focus, its own buttons go on from chip to chip); while auto-play
    // runs, when it moves on - in focus in the last row
    if (!this.focusId) {
      const next = el('button', 'cbtn primary'); next.type = 'button'; next.id = 'btn-next';
      next.textContent = t('btn.next') + ' ›';
      next.addEventListener('click', () => { this.touch(); this.stopTour(); this.step(1); });
      ctl.append(next);
    }
    if (this.tour) this.addTourHint(this.focusId && !PANEL ? (ctl.querySelector('.fnav') || ctl.appendChild(el('div', 'frow'))) : ctl);
    if (this.legendRow) ctl.append(this.legendRow);
  }
  // Back (‹) and Next: one step on the tab shown; a step by hand ends auto-play
  addStepButtons(row, { back, next, first = false, nextLabel = t('btn.next') + ' ›' }) {
    const go = f => () => { this.touch(); this.stopTour(); f(); this.renderStory(); };
    const b = el('button', 'navbtn prev', '‹'); b.type = 'button'; b.id = 'btn-back';
    b.title = t('btn.prev'); b.setAttribute('aria-label', t('btn.prev'));
    b.disabled = first;
    b.addEventListener('click', go(back));
    const n = el('button', 'cbtn primary'); n.type = 'button'; n.id = 'btn-next';
    n.textContent = nextLabel;
    n.addEventListener('click', go(next));
    row.append(b, n);
  }
  // while auto-play runs: in how many seconds it moves on
  addTourHint(host) { const h = el('span', 'tourhint'); h.id = 'tourhint'; host.append(h); this.renderTourHint(); }
  // tab 2: what the chip is doing now (blank, being written, running a program, its program turned off); Back and
  // Next (the catalog's order, "No program" first), then the program's controls
  progState() {
    const b = this.table.bench, p = b.current;
    const st = b.phase === 'run' ? 'run'
      : !b.selected ? (b.erased || p ? 'none' : 'blank')
      : b.phase === 'blank' && !b.erased ? 'blank' : 'write';
    return `${st}|${p ? p.id : ''}|${getLang()}|${this.tour ? 1 : 0}`;
  }
  renderProgStory() {
    const cap = $('#caption'), ctl = $('#controls'), note = $('#note');
    const bench = this.table.bench, prog = bench.current;
    this.progKey = this.progState();
    const st = this.progKey.split('|')[0];
    ctl.innerHTML = '';
    this.syncers = [];
    this.legendRow = null;
    const T = prog ? this.textOf(prog) : null;
    cap.innerHTML = t({ blank: 'prog.blank', none: 'prog.none', write: 'prog.writing' }[st] || 'prog.running', { name: T && T.name });
    note.textContent = '';
    // one row: Back and Next first (they stay in one place from program to program), then the program's controls
    const row = el('div', 'frow nav');
    this.addStepButtons(row, { back: () => this.stepProgram(-1), next: () => this.stepProgram(1), first: !bench.selected });
    if (prog && st === 'run') this.buildControls(prog, T, row, true);
    if (this.tour) this.addTourHint(row);
    ctl.append(row);
    this.syncCatalog();
  }
  // tab 3: one line for the part of the story shown (each part has its own), Back and Next over the parts (Next at
  // the last part: the next application), the part's number, then the scene's buttons
  appsState() { const a = this.table.apps; return `${a.selected}|${a.partIndex}|${a.caption}|${getLang()}|${this.tour ? 1 : 0}`; }
  renderAppsStory() {
    const cap = $('#caption'), ctl = $('#controls'), apps = this.table.apps;
    ctl.innerHTML = '';
    this.syncers = [];
    this.legendRow = null;
    $('#note').textContent = '';
    this.appsKey = this.appsState();
    cap.innerHTML = t(apps.caption);
    const row = el('div', 'frow nav'), n = apps.parts.length, i = apps.partIndex;
    if (n) {
      this.addStepButtons(row, { back: () => apps.prev(), next: () => { if (!apps.next()) this.stepProgram(1); }, first: i <= 0 });
      const c = el('span', 'tourhint'); c.textContent = t('how.step', { i: i + 1, n }); row.append(c);
    }
    const sc = apps.current;
    if (sc && sc.controls && sc.controls.length) {
      const rec = { id: 'app:' + apps.selected, inst: sc };
      const T = { ctl: Object.fromEntries(sc.controls.map(c => [c.id, t(c.key || c.id)])) };
      this.buildControls(rec, T, row);
    }
    if (this.tour) this.addTourHint(row);
    if (row.children.length) ctl.append(row);
    this.syncCatalog();
  }
  // "How it works": the step's caption; Back, Next (from the start, at the last step), the step's number
  renderHowStory() {
    const cap = $('#caption'), ctl = $('#controls'), how = this.table.how;
    ctl.innerHTML = '';
    this.syncers = [];
    this.legendRow = null;
    $('#note').textContent = '';
    this.howKey = this.howState();
    cap.innerHTML = t(how.caption);
    const row = el('div', 'frow nav'), last = how.step === STEPS - 1;
    this.addStepButtons(row, { back: () => how.prev(), next: () => (last ? how.go(0) : how.next()), first: how.step === 0,
      nextLabel: last ? t('btn.again') : t('btn.next') + ' ›' });
    const n = el('span', 'tourhint'); n.textContent = t('how.step', { i: how.step + 1, n: STEPS });
    row.append(n);
    if (this.tour) this.addTourHint(row);
    ctl.append(row);
  }
  // tab 4's cards: the card says it all (refs.js); the story keeps only auto-play's countdown
  renderCardStory() {
    const ctl = $('#controls');
    ctl.innerHTML = '';
    this.syncers = [];
    this.legendRow = null;
    $('#caption').innerHTML = '';
    $('#note').textContent = '';
    this.howKey = this.howState();
    if (this.tour) { const row = el('div', 'frow nav'); this.addTourHint(row); ctl.append(row); }
  }
  howState() { return `${this.detail}|${this.table.how.step}|${getLang()}|${this.tour ? 1 : 0}`; }
  renderStatus() {
    if (this.tab === 'how') { if (this.howState() !== this.howKey) this.renderStory(); return; }
    if (this.tab === 'apps') { if (this.appsState() !== this.appsKey) this.renderAppsStory(); return; }
    if (this.tab === 'prog') { if (this.progState() !== this.progKey) this.renderProgStory(); else this.syncCatalog(); return; }
    if (!this.focusId || !PANEL) return;
    const rec = this.table.byId[this.focusId], T = this.textOf(rec);
    const s = this.table.callInst(rec, 'status');
    const html = s && s.key && T[s.key] ? fill(T[s.key], s.vars) : (T.what || '');
    const cap = $('#caption');
    if (cap.innerHTML !== html) cap.innerHTML = html;
  }

  // ------------------------------------------------------------------ the tour: auto-play (and the kiosk's loop)
  // (from the item shown, or with fromStart - auto-play led on to another tab - from the tab's first)
  startTour({ loop = false, fromStart = false } = {}) {
    const chips = this.order.map(id => ({ tab: 'conv', id })), progs = this.catalog.map(c => ({ tab: 'prog', id: c.id }));
    const apps = APPS.map(a => ({ tab: 'apps', id: a.id })), hows = Array.from({ length: STEPS }, (_, i) => ({ tab: 'how', id: i }));
    // (tab 4: the steps of how it works, then its cards - the papers, the press, this exhibition: auto-play ends on the
    // last, and the kiosk's loop shows each a while)
    const cards = CARDS.map(id => ({ tab: 'how', id, dwell: REFS_S }));
    const items = loop ? [...TRAILER, ...apps, ...hows.map(h => ({ ...h, dwell: 6 })), ...cards.map(c => ({ ...c, dwell: 12 }))]
      : this.tab === 'prog' ? progs : this.tab === 'apps' ? apps : this.tab === 'how' ? [...hows, ...cards] : chips;
    let i = 0;
    if (!loop && !fromStart) { const cur = this.tab === 'prog' ? this.table.bench.selected : this.tab === 'apps' ? this.table.apps.selected : this.tab === 'how' ? (CARDS.includes(this.detail) ? this.detail : this.table.how.step) : this.focusId; const j = items.findIndex(it => it.id === cur); if (j >= 0) i = j; }
    this.tour = { items, i, t: 0, loop, rest: false };
    this.syncAuto();
    this.tourGo();
    this.renderStory();
  }
  tourGo() {
    const tr = this.tour, it = tr.items[tr.i];
    if (it.tab !== this.tab) { this.setTab(it.tab); this.tour = tr; }
    if (it.tab === 'conv') { if (it.id) this.focus(it.id, { fromTour: true }); else if (this.focusId) this.overview(); }
    else if (it.tab === 'prog') { this.table.bench.load(it.id); this.syncCatalog(); }
    else if (it.tab === 'how') { if (CARDS.includes(it.id)) this.setDetail(it.id); else { this.setDetail('how'); this.table.how.go(it.id); } }
    else { this.table.apps.load(it.id); this.syncCatalog(); }
  }
  stopTour() {
    if (!this.tour) return;
    this.tour = null;
    this.syncAuto();
    this.renderStory();
  }
  tickTour(dt) {
    const tr = this.tour;
    if (!tr) return;
    tr.t += dt;
    if (tr.rest) {
      if (tr.t >= TOUR_REST) { tr.rest = false; tr.t = 0; tr.i = 0; this.tourGo(); this.renderStory(); }
      return;
    }
    const dwell = dwellOf(tr.items[tr.i]);
    if (tr.t >= dwell) {
      tr.t = 0;
      tr.i++;
      if (tr.i >= tr.items.length) {
        if (tr.loop) { tr.rest = true; if (this.tab !== 'conv') { this.setTab('conv'); this.tour = tr; } this.overview(); this.renderStory(); return; }
        // auto-play leads on to the next tab, from its start: today's chips -> the chip written by light -> what it
        // can do -> further details; after its cards it ends there, on this exhibition (the switch goes off)
        const next = NEXT_TAB[this.tab];
        this.tour = null;
        if (this.tab === 'conv') this.overview();
        if (next) { this.setTab(next); this.startTour({ fromStart: true }); }
        else { this.syncAuto(); this.renderStory(); }
        return;
      }
      this.tourGo();
      this.renderStory();
    }
    this.renderTourHint();
  }
  renderTourHint() {
    const h = $('#tourhint');
    if (!h || !this.tour) return;
    const it = this.tour.items[this.tour.i];
    const s = Math.max(1, Math.ceil((this.tour.rest ? TOUR_REST : dwellOf(it)) - this.tour.t));
    const txt = this.tour.rest ? '' : t({ prog: 'tour.nextProg', apps: 'tour.nextApp', how: 'tour.nextApp' }[it.tab] || 'tour.next', { s });
    if (h.textContent !== txt) h.textContent = txt;
  }

  // ------------------------------------------------------------------ keyboard, layout, kiosk
  onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    this.touch();
    const k = (e.key || '').toLowerCase();
    if ((k === ' ' || k === 'enter') && tag === 'BUTTON') return;
    if (k === 'escape') { this.stopTour(); if (this.tab === 'conv') this.overview(); }
    else if (k === 'arrowright') { this.stopTour(); this.stepBy(1); e.preventDefault(); }
    else if (k === 'arrowleft') { this.stopTour(); this.stepBy(-1); e.preventDefault(); }
    else if (['1', '2', '3', '4'].includes(k)) this.pickTab(TABS[+k - 1].id);
    else if (k === 'l' && !e.repeat) this.setLabels(!this.table.labelsOn);
    else if (k === 'r' && !e.repeat) this.table.applyFit(false);
    else if (k === 't' && !e.repeat) { if (this.tour) this.stopTour(); else this.startTour(); }
  }
  // the arrow keys: Back (d = -1) and Next (d = 1) of the tab shown, as its buttons (tab 2's wrap round the catalog;
  // tab 3's Next at a story's last part opens the next application)
  stepBy(d) {
    if (this.tab === 'conv') { this.step(d); return; }
    if (this.tab === 'prog') { this.stepProgram(d); return; }
    if (this.tab === 'apps') { const a = this.table.apps; if (d > 0 && !a.next()) this.stepProgram(1); else if (d < 0) a.prev(); }
    else if (CARDS.includes(this.detail)) return;          // (tab 4's cards: nothing to step through)
    else if (d > 0) this.table.how.next(); else this.table.how.prev();
    this.renderStory();
  }

  layout() {
    // panel width for the camera, and the interface rectangles that labels must not cover
    if (this.tab !== 'conv') {
      const c = $('#catalog');
      this.table.setPanel(c.hidden || innerWidth <= 600 ? 0 : c.getBoundingClientRect().width + 16);
    } else if (this.focusId) this.table.setPanel(this.panelWidth());
    const st = $('#stage').getBoundingClientRect();
    const rel = r => ({ left: r.left - st.left, right: r.right - st.left, top: r.top - st.top, bottom: r.bottom - st.top });
    const rects = [];
    for (const s of ['#brand', '#topright', '#story']) { const e = $(s); if (e && e.offsetParent !== null) rects.push(rel(e.getBoundingClientRect())); }
    for (const s of ['#panel', '#catalog']) { const p = $(s); if (!p.hidden) rects.push(rel(p.getBoundingClientRect())); }
    this.table.setBlockers(rects);
    // the free part of the view ends above the story; on tabs 2 and 3 two lines of caption and a row of buttons are
    // always kept free, so that the camera stays put while the story's caption changes
    const sr = rel($('#story').getBoundingClientRect());
    const keep = this.tab === 'conv' ? 0 : 2 * (parseFloat(getComputedStyle($('#caption')).lineHeight) || 28) + 10 + 46 * this.uiScale();
    this.table.setFreeBottom(Math.min(sr.top, sr.bottom - keep));
  }
  uiScale() { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1; }

  touch() { this.lastInput = performance.now(); }

  kioskSetup() {
    try { navigator.wakeLock?.request('screen').catch(() => {}); } catch { /* not supported */ }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') try { navigator.wakeLock?.request('screen').catch(() => {}); } catch { /* ignore */ }
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }
  resetForNextVisitor() {
    this.setLanguage(params.get('lang') || 'ja');     // the language the kiosk was started in
    this.setLabels(true);
    for (const rec of this.table.devices) this.table.callInst(rec, 'reset');
    this.setTab('conv');
    this.overview();
    this.startTour({ loop: true });
  }

  loop() {
    let last = performance.now(), slow = 0, frames = 0, layoutAcc = 0;
    const frame = now => {
      requestAnimationFrame(frame);
      const raw = (now - last) / 1000, dt = Math.min(0.05, raw);
      last = now;
      if (document.hidden) return;
      // a weak computer: after 2 s of slow frames in the first half minute, drop the post-processing
      if (frames++ > 30 && frames < 1800 && !this.table.lowered) { slow = raw > 0.05 ? slow + raw : 0; if (slow > 2) this.table.lowerQuality(); }
      // (unless auto-play - or the kiosk's loop - runs, tab 3's stories stay on each part and tab 4 on each step, each
      // going round what it shows)
      this.table.apps.hold = this.table.how.hold = HOLD && !this.tour;
      this.table.update(dt, Math.min(0.5, raw));
      this.tickTour(Math.min(0.5, raw));          // the tour runs on real time (a slow computer still keeps its pace)
      const inviting = !!(KIOSK && this.tour && this.tour.loop);
      if (this.invite.hidden === inviting) this.invite.hidden = !inviting;
      this.statusAcc += dt;
      if (this.statusAcc > 0.25) { this.statusAcc = 0; this.renderStatus(); this.syncControls(); }
      layoutAcc += dt;
      if (layoutAcc > 1) { layoutAcc = 0; this.layout(); }
      if (KIOSK && !this.tour && performance.now() - this.lastInput > IDLE_S * 1000) { this.touch(); this.resetForNextVisitor(); }
      this.table.render();
      if (frames === 3) document.body.dataset.frames = '3';
    };
    requestAnimationFrame(frame);
  }
}

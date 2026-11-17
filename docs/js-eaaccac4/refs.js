// Tab 4, "Further details": two cards shown over the (empty) view, chosen on the right (RY).
//   "Journal references" (2026-11-13): the two papers this page builds on, each with the cover of its issue
//     (2026-11-14) and a QR code of its DOI link, to be read with a phone's camera (a kiosk screen cannot open a link).
//   "Press release and news coverage" (2026-11-14): articles about the work, each with a QR code of its link.
//   "This exhibition" (2026-11-14): a QR code of this page itself, to take it away on a phone.
// The codes are qr.js, made by tools/make_qr.py from the same links (keep the lists the same).  The covers are img/,
// the issue covers from nature.com (Springer Nature; credits below and in each image's tooltip).
//
//   renderCard(box, which, { kiosk })   fills box (#refs) with 'refs', 'press' or 'exhibit' in the current language;
//                                       kiosk: the links as text (a click would take the kiosk away from the page)
import { QR } from './qr.js';
import { t, getLang } from './i18n.js';

export const REFS = [
  { id: 'nature', journal: 'Nature', title: 'Programmable on-chip nonlinear photonics', authors: 'R. Yanagimoto et al.',
    cite: '<i>Nature</i> <b>649</b>, 330–337 (2026)', doi: '10.1038/s41586-025-09620-9',
    // issue 8096, 8 January 2026 (its cover is another paper of the issue: a 3D-printed network)
    cover: { src: 'img/cover-nature-649-8096.jpg', vol: 649, no: 8096, onCover: false,
      issue: 'https://www.nature.com/nature/volumes/649/issues/8096', credit: 'Cover image: Péter Puklus' } },
  // (the first two authors contributed equally, RY 2026-11-14)
  { id: 'natphys', journal: 'Nature Physics', title: 'Arbitrary control over multimode wave propagation for machine learning',
    authors: 'T. Onodera* and M. M. Stein* et al.', equal: true,
    cite: '<i>Nature Physics</i> <b>22</b>, 164–171 (2026)', doi: '10.1038/s41567-025-03094-2',
    // issue 1, January 2026, with this paper on its cover ("Machine learning with light")
    cover: { src: 'img/cover-nphys-22-1.jpg', vol: 22, no: 1, onCover: true,
      issue: 'https://www.nature.com/nphys/volumes/22/issues/1', credit: 'Image: Martin Stein, Cornell University. Cover design: Laoise Mac Gabhann' } },
];

// (RY's list and titles, in its order; outlets and dates as the articles give them, checked 2026-11-14)
export const PRESS = [
  { id: 'nttj', lang: 'ja', outlet: { en: 'NTT Technical Journal', ja: 'NTT技術ジャーナル' },
    title: '白紙のデバイスに光で機能を書き込む\u200bプログラマブルフォトニクス',   // (\u200b: may wrap there, not inside the word)
    date: { en: 'August 2026 issue', ja: '2026年8月号' }, url: 'https://doi.org/10.60249/26085003' },
  { id: 'nv', lang: 'en', outlet: { en: 'Nature · News & Views', ja: 'Nature · News & Views' },
    title: 'Shape-shifting electrodes tune optical-frequency converter',
    date: { en: '26 November 2025', ja: '2025年11月26日' }, url: 'https://doi.org/10.1038/d41586-025-03452-3' },
  { id: 'cornell', lang: 'en', outlet: { en: 'Cornell Chronicle', ja: 'Cornell Chronicle（コーネル大学）' },
    title: 'Programmable optical chip merges photons to change color',
    date: { en: '8 October 2025', ja: '2025年10月8日' },
    url: 'https://news.cornell.edu/stories/2025/10/programmable-optical-chip-merges-photons-change-color' },
  { id: 'asahi', lang: 'ja', outlet: { en: 'The Asahi Shimbun', ja: '朝日新聞' },
    title: 'データセンターの電力消費問題を解決？　光の集積回路、NTTが開発',
    date: { en: '14 December 2025', ja: '2025年12月14日' }, url: 'https://www.asahi.com/articles/ASTDD3K68TDDUHBI00XM.html' },
];

// this page on GitHub Pages; it opens in English unless ?lang=ja, so the Japanese card's code asks for Japanese
export const SITE = 'https://yanagimotor.github.io/programmable-photonics-3d/';
export const siteLink = L => L === 'ja' ? SITE + '?lang=ja' : SITE;

// the code dark on white, four modules of quiet zone round it (scanners need both)
function qrSvg(url, label) {
  const q = QR[url];
  if (!q) return '';
  const m = 4, s = q.n + 2 * m;
  return `<svg class="qr" viewBox="${-m} ${-m} ${s} ${s}" role="img" aria-label="${label}" shape-rendering="crispEdges">` +
    `<rect x="${-m}" y="${-m}" width="${s}" height="${s}" rx="1.5" fill="#fff"/><path d="${q.d}" fill="#000"/></svg>`;
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// a link, or (kiosk) the same words as text
const link = (cls, url, html, kiosk) => kiosk ? `<span class="${cls}">${html}</span>`
  : `<a class="${cls}" href="${url}" target="_blank" rel="noopener">${html}</a>`;
// the link as shown: doi.org/... for a DOI, else the site's name
const shown = url => url.startsWith('https://doi.org/') ? url.slice(8) : new URL(url).hostname.replace(/^www\./, '');

function refItem(r, kiosk) {
  const url = 'https://doi.org/' + r.doi, c = r.cover;
  const alt = esc(t('refs.coverAlt', { journal: r.journal, vol: c.vol, no: c.no }));
  const img = `<img src="${c.src}" width="330" height="437" alt="${alt}" title="${esc(c.credit)}" decoding="async">`;
  const cover = `<figure class="rcover${c.onCover ? ' ours' : ''}">${link('rissue', c.issue, img, kiosk)}` +
    `<figcaption>${esc(t(c.onCover ? 'refs.onCover' : 'refs.issueCover'))}</figcaption></figure>`;
  return `<li class="ref" data-id="${r.id}">${cover}` +
    `<div class="rtext"><span class="rjournal">${r.journal}</span><span class="rtitle">${esc(r.title)}</span>` +
    `<span class="rauth">${esc(r.authors)}</span>${r.equal ? `<span class="rnote">${esc(t('refs.equal'))}</span>` : ''}` +
    `<span class="rcite">${r.cite}</span>${link('rdoi', url, shown(url), kiosk)}</div>` +
    `${qrSvg(url, esc(t('refs.qr', { journal: r.journal })))}</li>`;
}

function pressItem(p, kiosk) {
  const L = getLang() === 'ja' ? 'ja' : 'en', outlet = p.outlet[L];
  const date = p.date[L] + (p.lang !== L ? ' · ' + t('press.in.' + p.lang) : '');
  return `<li class="ref news" data-id="${p.id}">` +
    `<div class="rtext"><span class="rjournal">${esc(outlet)}</span><span class="rtitle" lang="${p.lang}">${esc(p.title)}</span>` +
    `<span class="rcite">${esc(date)}</span>${link('rdoi', p.url, shown(p.url), kiosk)}</div>` +
    `${qrSvg(p.url, esc(t('press.qr', { outlet })))}</li>`;
}

// (the page's address as text, not a link: a link to the page it is on would only open it again)
function siteItem() {
  const url = siteLink(getLang());
  return `<li class="ref site" data-id="site"><div class="rtext"><span class="rjournal">${esc(t('exhibit.kicker'))}</span>` +
    `<span class="rtitle">${esc(t('title'))}</span><span class="rcite">${esc(t('exhibit.what'))}</span>` +
    `<span class="rdoi">${SITE.slice(8).replace(/\/$/, '')}</span></div>${qrSvg(url, esc(t('exhibit.qr')))}</li>`;
}

export function renderCard(box, which, { kiosk = false } = {}) {
  // (drawn again only when something it shows changes: the covers are not reloaded, a scrolled card stays put)
  const key = `${which}|${getLang()}|${kiosk ? 1 : 0}`;
  if (box.dataset.key === key) return;
  box.dataset.key = key;
  const items = which === 'press' ? PRESS.map(p => pressItem(p, kiosk)) : which === 'exhibit' ? [siteItem()]
    : REFS.map(r => refItem(r, kiosk));
  box.setAttribute('aria-label', t(which + '.title'));
  box.innerHTML = `<div class="refcard ${which}"><h2 class="rhead">${esc(t(which + '.title'))}</h2>` +
    `<p class="rhint">${esc(t(which + '.hint'))}</p><ol class="reflist">${items.join('')}</ol></div>`;
}

// Tab 4, "Further details" -> "Journal references" (RY, 2026-11-13): the two papers this page builds on, each with
// a QR code of its DOI link, to be read with a phone's camera (a kiosk screen cannot open a link itself).  The
// codes are qr.js, made by tools/make_qr.py from the same links (keep the two lists the same).
//
//   renderRefs(box, { kiosk })   fills box (#refs) in the current language; kiosk: the DOI as text, not as a link
//                                (a click would take the kiosk away from the page)
import { QR } from './qr.js';
import { t } from './i18n.js';

export const REFS = [
  { id: 'nature', journal: 'Nature', title: 'Programmable on-chip nonlinear photonics', authors: 'R. Yanagimoto et al.',
    cite: '<i>Nature</i> <b>649</b>, 330–337 (2026)', doi: '10.1038/s41586-025-09620-9' },
  { id: 'natphys', journal: 'Nature Physics', title: 'Arbitrary control over multimode wave propagation for machine learning',
    authors: 'T. Onodera et al.', cite: '<i>Nature Physics</i> <b>22</b>, 164–171 (2026)', doi: '10.1038/s41567-025-03094-2' },
];
const link = r => 'https://doi.org/' + r.doi;

// the code dark on white, four modules of quiet zone round it (scanners need both)
function qrSvg(url, label) {
  const q = QR[url];
  if (!q) return '';
  const m = 4, s = q.n + 2 * m;
  return `<svg class="qr" viewBox="${-m} ${-m} ${s} ${s}" role="img" aria-label="${label}" shape-rendering="crispEdges">` +
    `<rect x="${-m}" y="${-m}" width="${s}" height="${s}" rx="1.5" fill="#fff"/><path d="${q.d}" fill="#000"/></svg>`;
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export function renderRefs(box, { kiosk = false } = {}) {
  const items = REFS.map(r => {
    const url = link(r), shown = 'doi.org/' + r.doi;
    const doi = kiosk ? `<span class="rdoi">${shown}</span>`
      : `<a class="rdoi" href="${url}" target="_blank" rel="noopener">${shown}</a>`;
    return `<li class="ref" data-id="${r.id}">${qrSvg(url, esc(t('refs.qr', { journal: r.journal })))}` +
      `<div class="rtext"><span class="rjournal">${r.journal}</span><span class="rtitle">${esc(r.title)}</span>` +
      `<span class="rauth">${esc(r.authors)}</span><span class="rcite">${r.cite}</span>${doi}</div></li>`;
  }).join('');
  box.innerHTML = `<div class="refcard"><h2 class="rhead">${esc(t('refs.title'))}</h2><p class="rhint">${esc(t('refs.hint'))}</p>` +
    `<ol class="reflist">${items}</ol></div>`;
}

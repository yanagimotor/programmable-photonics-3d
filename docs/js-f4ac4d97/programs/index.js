// Programs of tab 2 that have no chip of their own on the table of tab 1: they exist only as patterns of light on
// the programmable chip (the AI program as two, image and voice recognition, with a free-form pattern like the one
// in Onodera et al., Nature Physics 22, 164 (2026)).  Same module contract as devices/*.js.
// router and awg share their id with a chip of tab 1 and take its place on tab 2 only (app.js prefers
// a program to a chip of the same id): the programmable chip's own light router and spectrometer, patterns found
// by inverse design in the 2D Waveguide Studio's simulation, instead of tab 1's circuits written in green.  shg
// likewise replaces tab 1's poled converter: the visitor chooses the new colours, and each choice is another
// pattern of stripes written by light.
// compute (the light computer) was tab 3's, then tab 2's sixth program; no catalog lists it any more (app.js) - it
// is still loaded and checked (dev/devcheck); wdm and qsource are tab 3's (apps/); image and voice take options for
// another look (tab 3's optical computation: programs/image.js)
export const PROGRAMS = ['router', 'image', 'voice', 'awg', 'shg', 'compute', 'wdm', 'qsource'];

// { id: module } for the programs that loaded; errors are reported, not thrown (the catalog then leaves them out)
export async function loadPrograms(onError = () => {}) {
  const out = {};
  await Promise.all(PROGRAMS.map(async id => {
    try {
      const mod = await import(`./${id}.js`);
      if (!mod.meta || mod.meta.id !== id || typeof mod.create !== 'function') throw new Error(`programs/${id}.js: meta.id or create() missing`);
      out[id] = mod;
    } catch (e) { onError(`program ${id}: ${e && (e.message || e)}`); }
  }));
  return out;
}

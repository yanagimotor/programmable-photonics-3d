# Software written with light: interactive 3D

An interactive 3D page for the general public, in English and Japanese, about a programmable photonic chip: its
circuit is written with light instead of being etched, so the same chip can be rewritten for another job.

**Open the page: https://yanagimotor.github.io/programmable-photonics-3d/**

Made by Ryotatsu Yanagimoto, https://yanagimotor.github.io . The chip written with light builds on
R. Yanagimoto et al., "Programmable on-chip nonlinear photonics", Nature 649, 330-337 (2026),
https://doi.org/10.1038/s41586-025-09620-9 .

Four tabs along the bottom (keys 1-4):

1. **Conventional photonics** - twelve of today's photonic chips on a table, each etched for one job and shown
   doing it (light router, data modulator, AI calculator, beam steerer, spectrometer, ring biosensor, colour
   converter, ring colour converter, quantum light source, light ruler, microwave light ruler, white-light
   source). Click a chip to zoom in; its buttons appear at the bottom left.
2. **This work: Programmable photonics** - one blank chip under a projector. The projector's green light writes a
   circuit into the chip, its "program", and the chip runs it. Five programs: light router, image recognition,
   voice recognition, spectrometer, colour converter. Left alone, the chip runs each program for about 10 s, then
   light rewrites it with the next. The light router, image recognition and spectrometer show recorded
   simulations made with the 2D Waveguide Studio, a waveguide simulator: patterns found by inverse design (4 x 4
   routings; an MNIST digit classifier; a wavelength splitter for 1310, 1410, 1510 and 1610 nm) and the light
   computed through them.
3. **Potential applications** - optical computation; in situ inverse design and error correction (the chip learns its
   own design, then keeps it working when heat or cold disturbs it); quantum internet.
4. **How it works** - the chip's layers (waveguide, photoconductor, transparent electrodes), the voltage across
   them and the pattern of light, in seven steps.

"Take the tour" plays a tab by itself. The light follows the physics where that was cheap to compute;
elsewhere the pictures are illustrations.

## View it on this computer

Double-click **`View-locally.bat`** (Windows). It starts a small local web server (a minimised window; close it
to stop) and opens the page in Edge at http://127.0.0.1:8139/ . Anywhere with Python 3: run `python serve.py`
(or `python3 serve.py`) in this folder and open http://127.0.0.1:8000/ . No internet connection is needed.

For a screen left running on its own, **`View-kiosk.bat`** opens the page full-screen in Japanese with larger
text (kiosk mode); after 90 s without input it goes back to Japanese and plays a loop of about five minutes
through the four tabs, again and again, until someone touches the screen. Exit with Alt+F4.

URL options: `?lang=ja`; `?kiosk=1` (kiosk mode); `?tab=prog`; `?tab=apps&app=insitu` (or `compute`, `quantum`;
`correct` opens the in situ story at the fire); `?dev=router` (tab 1 with that chip in focus); `?tour=1`;
`?scale=1.6` (larger text); `?quality=low` (slower computers); `?motion=full` (the camera flies even where the
computer asks for reduced motion, as over remote desktop) or `?motion=reduce`.
Keys: 1-4 tabs, left/right arrows previous/next, Esc back to the table from a chip (tab 1), T tour, L labels,
R reset the view.

## Publish with GitHub Pages

The site is the `docs/` folder, published by GitHub Pages (Settings -> Pages -> "Deploy from a branch", branch
`main`, folder `/docs`) at https://yanagimotor.github.io/programmable-photonics-3d/ . Every link in it is relative.

## Contents

- `docs/index.html`, `docs/css/`, `docs/js-<version>/` - the page (plain JavaScript modules, no build step; the
  script folder's name changes with each update so browsers never mix versions)
- `docs/vendor/three-0.186.1/` - three.js r186 (MIT licence), minified, copied so the page works offline
- `docs/js-<version>/programs/data/mnist28.js` and the samples in `image.js` - 30 handwritten digits of the MNIST
  test set (Y. LeCun, C. Cortes and C. J. C. Burges, http://yann.lecun.com/exdb/mnist/), as they are and averaged
  to 7 x 7. MNIST is made available under CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/), and so
  are these digits.
- `serve.py`, `View-locally.bat`, `View-kiosk.bat` - local viewing only

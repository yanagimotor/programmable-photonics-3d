# Software written with light: interactive 3D

An interactive 3D page for the general public, in English and Japanese, about a programmable photonic chip: its
circuit is written with light instead of being etched, so the same chip can be rewritten for another job.

**Open the page: https://yanagimotor.github.io/programmable-photonics-3d/**

Made by Ryotatsu Yanagimoto, https://yanagimotor.github.io . The chip written with light builds on
R. Yanagimoto et al., "Programmable on-chip nonlinear photonics", Nature 649, 330-337 (2026),
https://doi.org/10.1038/s41586-025-09620-9 , and T. Onodera and M. M. Stein (equal contribution) et al.,
"Arbitrary control over multimode wave propagation for machine learning", Nature Physics 22, 164-171 (2026),
https://doi.org/10.1038/s41567-025-03094-2 .

Four tabs along the bottom (keys 1-4):

1. **Conventional photonics** - twelve of today's photonic chips on a table, each etched for one job and shown
   doing it (light router, data modulator, AI calculator, beam steerer, spectrometer, ring biosensor, colour
   converter, ring colour converter, quantum light source, light ruler, microwave light ruler, white-light
   source). Click a chip to zoom in; its buttons appear at the bottom left.
2. **This work: Programmable photonics** - one blank chip under a projector. The projector's green light writes a
   circuit into the chip, its "program", and the chip runs it. Five programs: light router, image recognition,
   voice recognition, spectrometer, colour converter; Next has the light rewrite the same chip with the next one.
   The light router, image recognition and spectrometer show recorded simulations made with the 2D Waveguide
   Studio, a waveguide simulator: patterns found by inverse design (4 x 4 routings; an MNIST digit classifier; a
   wavelength splitter for 1310, 1410, 1510 and 1610 nm) and the light computed through them.
3. **Potential applications** - optical computation (ending on a graph of the energy per calculation: a GPU's (NVIDIA B300)
   0.2 pJ x N^2 against the light's 10 pJ x 2N for converting its N inputs and N outputs, with the hot GPU and the
   chip standing on it); in situ inverse design and error correction (the chip learns its
   own design, then keeps it working when heat or cold disturbs it); quantum internet.
4. **Further details** - four parts, chosen on the right: **How it works**, the chip's layers (waveguide,
   photoconductor, transparent electrodes), the voltage across them and the pattern of light, in seven steps;
   **Journal references**, the Nature and Nature Physics papers above, each with the cover of its issue and a QR
   code of its DOI link to read with a phone; **Press release and news coverage**, four articles about the work
   (NTT Technical Journal, Nature News & Views, Cornell Chronicle, The Asahi Shimbun), each with a QR code of its
   link; and **This exhibition**, a QR code of this page itself on GitHub Pages, to open it on a phone (on the
   Japanese screen the code opens the page in Japanese). The covers are Springer Nature's: Nature 649, issue 8096
   (cover image: Peter Puklus) and Nature Physics 22, issue 1, with the Nature Physics paper on it (image: Martin
   Stein, Cornell University; cover design: Laoise Mac Gabhann).

Back and Next (or the arrow keys) step through each tab - a chip, a program, a part of an application's story, a
step of how it works - and nothing moves on by itself: left alone, a step keeps going round what it shows (the next
digit read, the learning again, a new pair of photons), so that it can stay on screen as an explanation.
**Auto-play**, the switch at the top right, plays the steps by itself instead and leads on from tab to tab, ending
on the journal references, the press coverage and this exhibition's QR code. The light follows the physics where
that was cheap to compute; elsewhere the pictures are illustrations.

## View it on this computer

Double-click **`View-locally.bat`** (Windows). It starts a small local web server (a minimised window; close it
to stop) and opens the page in Edge at http://127.0.0.1:8139/ . Anywhere with Python 3: run `python serve.py`
(or `python3 serve.py`) in this folder and open http://127.0.0.1:8000/ . No internet connection is needed.

For a screen left running on its own, **`View-kiosk.bat`** opens the page full-screen in Japanese with larger
text (kiosk mode); after 90 s without input it goes back to Japanese and plays a loop of about five minutes
through the four tabs, again and again, until someone touches the screen. Exit with Alt+F4.

URL options: `?lang=ja`; `?kiosk=1` (kiosk mode); `?tab=prog`; `?tab=apps&app=insitu` (or `compute`, `quantum`;
`correct` opens the in situ story at the fire, `energy` optical computation at its energy graph); `?tab=how`; `?tab=refs` (tab 4 on the journal references);
`?tab=press` (tab 4 on the press coverage); `?tab=exhibit` (tab 4 on this exhibition's QR code);
`?dev=router` (tab 1 with that chip in focus); `?tour=1` (auto-play on); `?scale=1.6` (larger text);
`?quality=low` (slower computers); `?motion=full` (the camera flies even where the computer asks for reduced
motion, as over remote desktop) or `?motion=reduce`.
Keys: Tab / Shift+Tab the next / previous tab (1-4 a tab directly); up/down arrows the list on the right (tab 1's
chips, tab 2's programs, tab 3's applications, tab 4's parts); left/right arrows Back/Next (the steps of an
application's story or of how it works; on tabs 1 and 2 the next chip or program); Esc back to the table from a chip
(tab 1), T auto-play, L labels, R reset the view.

## Publish with GitHub Pages

The site is the `docs/` folder, published by GitHub Pages (Settings -> Pages -> "Deploy from a branch", branch
`main`, folder `/docs`) at https://yanagimotor.github.io/programmable-photonics-3d/ . Every link in it is relative.

## Contents

- `docs/index.html`, `docs/css/`, `docs/js-<version>/` - the page (plain JavaScript modules, no build step; the
  script folder's name changes with each update so browsers never mix versions)
- `docs/img/ntt-research-logo.png` - the NTT Research logo (white), at the top right of every tab, above the view
  buttons; cropped from `NTTResearch_A1_white2025.png` and scaled to 120 px tall
- `docs/vendor/three-0.186.1/` - three.js r186 (MIT licence), minified, copied so the page works offline
- `docs/js-<version>/programs/data/mnist28.js` and the samples in `image.js` - 30 handwritten digits of the MNIST
  test set (Y. LeCun, C. Cortes and C. J. C. Burges, http://yann.lecun.com/exdb/mnist/), as they are and averaged
  to 7 x 7. MNIST is made available under CC BY-SA 3.0 (https://creativecommons.org/licenses/by-sa/3.0/), and so
  are these digits.
- `serve.py`, `View-locally.bat`, `View-kiosk.bat` - local viewing only

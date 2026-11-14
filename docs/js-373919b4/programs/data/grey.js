// Reads the grey PNG of a simulated program (router.png, image.png, awg.png, written by the 2D Waveguide Studio's
// tools/export_ryo_programs.py) into bytes.  A PNG is a quarter of the size of the same bytes in base64, and the
// browser decodes it natively.  The maps are stacked from the top, every one as wide as the sheet (cols bytes per
// row); a data module names each map by [first row, rows].
//
//   const sheet = await loadGrey(url, cols)
//   sheet.map([row0, rows])        Uint8Array of rows x cols (a view, not a copy)
//   sheet.floats([row0, rows])     the same as Float32Array 0..1
export async function loadGrey(url, cols) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const blob = await res.blob();
  // (no colour management: a grey PNG without a colour profile is drawn byte for byte)
  let img;
  try { img = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); }
  catch (e) { img = await createImageBitmap(blob); }
  if (img.width !== cols) throw new Error(`${url}: ${img.width} columns, expected ${cols}`);
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const rgba = g.getImageData(0, 0, c.width, c.height).data, bytes = new Uint8Array(c.width * c.height);
  for (let i = 0; i < bytes.length; i++) bytes[i] = rgba[4 * i];
  return {
    cols, rows: c.height, bytes,
    map: ([r0, n]) => bytes.subarray(r0 * cols, (r0 + n) * cols),
    floats: ([r0, n]) => Float32Array.from(bytes.subarray(r0 * cols, (r0 + n) * cols), v => v / 255),
  };
}

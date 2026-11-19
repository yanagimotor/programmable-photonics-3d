// Program "Single waveguide" (tab 2): the simplest program there is - one straight line of green light across the
// chip.  Where the light falls, the refractive index rises a little, and that line guides the infrared light from
// one facet to the other.  "No program" (bench.js: the diffracting beam on the blank chip) shows the same beam with
// nothing written: it spreads out; here it stays in one narrow line.
export const meta = { id: 'waveguide', platform: 'ln', category: 'comm', size: { w: 11.4, d: 7.0 } };

export const text = {
  en: {
    name: 'Single waveguide',
    tech: 'Waveguide written by light · lithium niobate',
    what: 'Guides light in a straight line across the chip.',
    in: 'A beam of infrared light',
    out: 'The same beam, still narrow, at the far side',
    how: 'One line of green light raises the refractive index of the chip a little where it falls. The infrared light stays inside that line, as in an optical fibre. Without it (No program), the same beam spreads out.',
    use: 'The building block of every circuit on the chip: longer programs are many such lines, and patterns between them.',
    fixed: 'Nothing is etched: turn the green light off and the waveguide is gone.',
    c: { in: 'Light in', guide: 'One line of green light', out: 'Light out, still confined' },
    ref: 'Onodera et al., Nature Physics 22, 164 (2026).',
    note: '',
  },
  ja: {
    name: '1本の導波路',
    tech: '光で書いた導波路・ニオブ酸リチウム',
    what: 'チップの端から端まで、光をまっすぐ導きます。',
    in: '赤外光のビーム',
    out: '細いままの同じビームが、反対側から',
    how: '1本の緑の光の線が当たったところだけ、チップの屈折率が少し上がります。赤外光は光ファイバーの中のように、その線の中を進みます。線がなければ（プログラムなし）、同じビームは広がってしまいます。',
    use: 'チップ上のあらゆる回路の基本の部品。複雑なプログラムも、このような線と、その間のパターンでできています。',
    fixed: '何も刻まれていません。緑の光を消せば、導波路も消えます。',
    c: { in: '入力光', guide: '1本の緑の光の線', out: '広がらずに出る光' },
    ref: 'Onodera ほか、Nature Physics 22, 164 (2026)。',
    note: '',
  },
};

const X0 = -5.55, X1 = 5.55, Y = 0.085, BEAM = 2.4;

export function create(kit) {
  const { P, colour } = kit;
  const RGB = colour.IR;
  kit.chip({ w: meta.size.w, d: meta.size.d, platform: 'ln' });
  const path = P.line(X0, 0, X1, 0);
  kit.ridges([path], 'ln');
  const net = kit.lightNet({ width: 0.3 });
  const seg = net.add(path, { s0: BEAM });
  net.build();
  net.set(seg, RGB, 1.1);
  kit.beam({ from: [X0 - BEAM, Y, 0], to: [X0, Y, 0], rgb: RGB, power: 1.1, r0: 0.08, fade: 'in' });
  kit.beam({ from: [X1, Y, 0], to: [X1 + BEAM, Y, 0], rgb: RGB, power: 1.1, r0: 0.08, fade: 'out' });
  return {
    anchors: { in: [X0 - 1.2, Y + 0.05, 0], guide: [0, Y + 0.05, -0.5], out: [X1 + 1.2, Y + 0.05, 0] },
    controls: [],
    reset() {},
    update() {},
  };
}

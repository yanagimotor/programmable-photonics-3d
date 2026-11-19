// Program "Y-splitter" (tab 2): one line of green light that forks into two.  The infrared light that the single
// waveguide carries straight across the chip divides here at the fork: half leaves through each arm.
export const meta = { id: 'ysplit', platform: 'ln', category: 'comm', size: { w: 11.4, d: 7.0 } };

export const text = {
  en: {
    name: 'Y-splitter',
    tech: 'Waveguides written by light · lithium niobate',
    what: 'Splits one beam of light into two equal halves.',
    in: 'A beam of infrared light',
    out: 'Two beams, each with half of the light',
    how: 'A line of green light forks into two, like the letter Y. The infrared light follows the line and divides at the fork: half of it goes into each arm.',
    use: 'Sharing one laser among many places on a chip, and the first step of interferometers and switches.',
    fixed: 'Nothing is etched: the projector can move the fork, or write another circuit.',
    c: { in: 'Light in', fork: 'The fork', out: 'Half the light in each arm' },
    ref: 'Onodera et al., Nature Physics 22, 164 (2026).',
    note: '',
  },
  ja: {
    name: 'Y分岐',
    tech: '光で書いた導波路・ニオブ酸リチウム',
    what: '1本の光を、等しい2本に分けます。',
    in: '赤外光のビーム',
    out: '2本のビーム。それぞれ光の半分',
    how: '緑の光の線が、Yの字のように二つに分かれます。赤外光はその線に沿って進み、分かれ目で半分ずつ二つの腕に入ります。',
    use: '1つのレーザーの光をチップ上の多くの場所で分け合うこと、また干渉計やスイッチの最初の一歩。',
    fixed: '何も刻まれていません。プロジェクターで分かれ目を動かしたり、別の回路を書き込んだりできます。',
    c: { in: '入力光', fork: '分かれ目', out: 'それぞれの腕に光の半分' },
    ref: 'Onodera ほか、Nature Physics 22, 164 (2026)。',
    note: '',
  },
};

const X0 = -5.55, X1 = 5.55, XS = -1.8, XE = 1.8, ZA = 1.1, Y = 0.085, BEAM = 2.4;

export function create(kit) {
  const { P, colour } = kit;
  const RGB = colour.IR;
  kit.chip({ w: meta.size.w, d: meta.size.d, platform: 'ln' });
  const pIn = P.line(X0, 0, XS, 0);
  const pBend = [-1, 1].map(sg => P.sbend(XS, 0, XE, sg * ZA));
  const pArm = [-1, 1].map(sg => P.line(XE, sg * ZA, X1, sg * ZA));
  kit.ridges([pIn, ...pBend, ...pArm], 'ln');
  const net = kit.lightNet({ width: 0.3 });
  const sIn = net.add(pIn, { s0: BEAM });
  const s1 = BEAM + pIn.len, s2 = s1 + pBend[0].len;
  const sBend = pBend.map(p => net.add(p, { s0: s1 }));
  const sArm = pArm.map(p => net.add(p, { s0: s2 }));
  net.build();
  net.set(sIn, RGB, 1.1);
  for (const s of [...sBend, ...sArm]) net.set(s, RGB, 0.6);
  kit.beam({ from: [X0 - BEAM, Y, 0], to: [X0, Y, 0], rgb: RGB, power: 1.1, r0: 0.08, fade: 'in' });
  for (const sg of [-1, 1]) kit.beam({ from: [X1, Y, sg * ZA], to: [X1 + BEAM, Y, sg * ZA], rgb: RGB, power: 0.6, r0: 0.08, fade: 'out' });
  return {
    anchors: { in: [X0 - 1.2, Y + 0.05, 0], fork: [XS, Y + 0.05, -0.4], out: [X1 + 1.2, Y + 0.05, -ZA] },
    controls: [],
    reset() {},
    update() {},
  };
}

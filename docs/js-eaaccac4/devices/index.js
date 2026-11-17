// The chips on the table, in tour order (the order of the panel's "3 of 12" and of the tour), and where each one
// sits: slot 0-3 is the back row (left to right), 4-7 the middle row, 8-11 the front row.
//
// Every device module (devices/<id>.js) exports meta, text and create(kit) - see planning/DESIGN.md.
export const DEVICES = [
  { id: 'router', slot: 8 },          // communication: MZI switch network
  { id: 'modulator', slot: 9 },       // communication: electro-optic modulator (data onto light)
  { id: 'mlmesh', slot: 10 },         // computing: MZI mesh for machine learning
  { id: 'opa', slot: 11 },            // sensing: optical phased array, steers a beam (LiDAR)
  { id: 'awg', slot: 4 },             // sensing: arrayed waveguide grating spectrometer
  { id: 'biosensor', slot: 5 },       // sensing: ring resonator biosensor
  { id: 'shg', slot: 6 },             // changing colour: PPLN waveguide, frequency doubling
  { id: 'ringshg', slot: 7 },         // changing colour: poled ring resonator, efficient doubling
  { id: 'spdc', slot: 2 },            // quantum: PPLN waveguide, photon pairs
  { id: 'kerrcomb', slot: 0 },        // measuring: Kerr soliton microcomb (ring)
  { id: 'eocomb', slot: 1 },          // measuring: electro-optic comb (ring + electrodes)
  { id: 'supercontinuum', slot: 3 },  // measuring: white light from a pulse (dispersion-engineered spiral)
];

// what each chip will be (shown by the grey placeholder while a module is missing or failed to load)
const PLAN = {
  router: ['comm', 'Light router', '光ルーター', 'Sends each channel of light to the exit you choose.', '光の信号を、選んだ出口へ送ります。'],
  modulator: ['comm', 'Data modulator', '光変調器', 'Puts data onto light: switches a beam on and off, following an electrical signal.', '電気の信号どおりに光をオン・オフして、データを光に乗せます。'],
  mlmesh: ['compute', 'AI calculator', 'AI計算チップ', 'Does the main sum of AI while the light flows through.', '光が通り抜けるあいだに、AIの中心となる計算を行います。'],
  opa: ['sense', 'Beam steerer', 'ビーム走査チップ', 'Steers a beam of light without moving parts, as in lidar.', '動く部品なしで光のビームの向きを変えます（ライダー）。'],
  awg: ['sense', 'Spectrometer', '分光器', 'Splits light into its colours, like a prism on a chip.', 'チップの上のプリズムのように、光を色ごとに分けます。'],
  biosensor: ['sense', 'Ring biosensor', 'リング型バイオセンサー', 'Detects molecules: a ring whose colour shifts when they stick to it.', '分子がくっつくとリングの色がずれる、分子のセンサーです。'],
  shg: ['convert', 'Colour converter', '色変換器', 'Turns infrared light into light at twice the frequency.', '赤外光を、周波数が2倍の光に変えます。'],
  ringshg: ['convert', 'Ring colour converter', 'リング型色変換器', 'The same colour change inside a ring, where the light circles and builds up.', '光が周回して強まるリングの中で、同じように色を変えます。'],
  spdc: ['quantum', 'Quantum light source', '量子光源', 'Splits a blue photon into a pair of red ones: quantum light.', '青い光子1つを赤い光子2つに分けます。量子の光です。'],
  kerrcomb: ['metro', 'Light ruler', '光のものさし', 'Turns one laser colour into many evenly spaced colours: a ruler made of light.', '1色のレーザーを、等間隔に並んだたくさんの色に変えます。光のものさしです。'],
  eocomb: ['metro', 'Microwave light ruler', '電気で作る光のものさし', 'Makes a comb of evenly spaced colours with a microwave signal and a ring.', 'マイクロ波とリングで、等間隔に並んだ色のくし（コム）を作ります。'],
  supercontinuum: ['metro', 'White-light source', '白色光源', 'Turns short infrared pulses into light of all colours.', '短い赤外のパルスを、あらゆる色を含む光に変えます。'],
};

// a grey placeholder for a module that is missing or failed to load
function stub(id) {
  const [category, en, ja, wEn, wJa] = PLAN[id] || ['comm', id, id, '', ''];
  return {
    meta: { id, platform: 'si', category, size: { w: 7, d: 4 } },
    text: {
      en: { name: en, tech: 'Being built', what: wEn },
      ja: { name: ja, tech: '準備中', what: wJa },
    },
    create(kit) {
      kit.chip({ w: 7, d: 4, platform: 'si' });
      return { stub: true };
    },
  };
}

export async function loadDevices(only = null) {
  const list = only ? DEVICES.filter(d => only.includes(d.id)) : DEVICES;
  return Promise.all(list.map(async d => {
    try {
      const mod = await import(`./${d.id}.js`);
      if (!mod.meta || mod.meta.id !== d.id || typeof mod.create !== 'function') throw new Error(`devices/${d.id}.js: meta.id or create() missing`);
      return { mod, slot: d.slot };
    } catch (e) {
      return { mod: stub(d.id), slot: d.slot, error: e };
    }
  }));
}

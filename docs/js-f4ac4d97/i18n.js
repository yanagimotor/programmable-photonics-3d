// Text of the page around the chips, English and Japanese.  Each chip's own text lives in its device module
// (devices/*.js, export const text).  t(key, vars) substitutes {name} placeholders; a missing key returns the
// key itself (the smoke test looks for raw keys on the page).
export const NB = ' ';
const WB = '\u200b';     // where a Japanese tab name may wrap on a phone (css: .mode .mname keeps words whole)
const EN = {
  'title': 'Software written with light',
  'btn.labels': 'Labels', 'btn.reset': 'Reset view', 'btn.lang': '日本語',
  'aria.stage': '3D view of the chips', 'aria.modes': 'Presentations', 'aria.panel': 'About this chip',
  'loading': 'Loading the 3D view…',
  'noWebGL': 'This page needs WebGL 2. Please open it in a recent version of Edge, Chrome, Firefox or Safari.',
  'hint': 'Drag to look around · scroll or pinch to zoom',

  'tab.conv': 'Conventional photonics',
  'tab.conv.sub': 'Today’s light chips: one chip, one job',
  'cap.conv': 'Each chip here was made for <b>one job</b>; a new job needs a new chip. Tap a chip to see it work.',
  'note.conv': 'Chips are drawn much larger than life, and simplified. Most of them work with infrared light, which is invisible: colours show the frequency of the light (redder = lower), with the differences exaggerated so that you can see them.',
  'btn.tour': 'Take the tour', 'btn.tourStop': 'Stop the tour', 'tour.invite': 'Touch the screen to explore',
  'tour.next': 'Next in {s} s',

  'panel.in': 'In', 'panel.out': 'Out',
  'panel.how': 'How it works', 'panel.use': 'Where it is used', 'panel.fixed': 'Made for this one job',
  'panel.try': 'Try it', 'panel.back': 'All chips', 'panel.prev': 'Previous chip', 'panel.next': 'Next chip',
  'panel.count': '{i} of {n}', 'panel.example': 'A real example',
  'on': 'on', 'off': 'off',

  'cat.comm': 'Communication', 'cat.compute': 'Computing', 'cat.sense': 'Sensing', 'cat.metro': 'Measuring',
  'cat.quantum': 'Quantum', 'cat.convert': 'Changing colour',
  'pf.si': 'silicon', 'pf.sin': 'silicon nitride', 'pf.ln': 'lithium niobate', 'pf.silica': 'silica glass',
  'stub': 'This chip is still being built.',

  'tab.prog': 'This work: Programmable photonics',
  'tab.prog.sub': 'One chip, any job: light writes its circuit',
  'prog.blank': 'A blank chip. Nothing is etched into it.',
  'prog.writing': 'Green light from above writes the <b>program</b>.',
  'prog.running': 'Now running: <b>{name}</b>. The same chip can take another job: pick one.',
  'prog.none': 'No light, no circuit: the chip is blank again.',
  'lbl.program': 'Program (green light)', 'lbl.blank': 'Blank chip', 'lbl.written': 'Circuit written by light',
  'cat.title': 'Programs', 'cat.none': 'No program',
  'tab.apps': 'Potential applications',
  'tab.apps.sub': 'What a chip programmed by light could do',
  'apps.title': 'Potential applications',
  'app.compute': 'Optical computation', 'app.compute.sub': 'Computing as light passes through',
  'app.compute.cap.gpu': 'A GPU sharpens a blurry picture.',
  'app.compute.cap.stream': 'Picture after picture, the GPU works hard and heats up.',
  'app.compute.cap.optics': 'How can light compute? A lens sharpens the same pictures without heating up.',
  'app.compute.cap.super': 'A more complex glass can read handwritten digits: each digit lights up its own spot.',
  'app.compute.cap.flat': 'Flattened, the glass becomes a chip. The picture now enters as one line of light.',
  'app.compute.cap.program': 'On our chip, green light from above writes this pattern: a program.',
  'app.compute.cap.rewrite': 'Write another program, and the same chip recognises spoken vowels.',
  'lbl.prog.image': 'Image recognition', 'lbl.prog.voice': 'Voice recognition', 'btn.fromStart': 'From the start',
  'lbl.gpu': 'GPU', 'lbl.lightchip': 'Our light chip',
  'lbl.input': 'Input', 'lbl.output': 'Output', 'lbl.feedback': 'Feedback',
  'lbl.target': 'Target', 'lbl.now': 'Now', 'lbl.step': 'Step', 'lbl.match': 'Match',
  'app.insitu': 'In situ inverse design and error correction', 'app.insitu.sub': 'The chip designs itself, then fixes itself',
  'app.insitu.cap.goal': 'The goal: each colour to its own exit. No pattern yet, so the colours mix.',
  'app.insitu.cap.learn': 'The chip measures its outputs and feeds the error back: step by step, it writes its own program.',
  'app.insitu.cap.learned': 'Learned: every colour now leaves through its own exit.',
  'app.insitu.cap.fire': 'A fire heats the chip, and the colours go astray.',
  'app.insitu.cap.fix': 'With the same feedback, the chip rewrites its program.',
  'app.insitu.cap.fixed': 'Working again, even in the heat.',
  'app.insitu.cap.snow': 'Now snow chills the chip, and the colours go astray again.',
  'app.insitu.cap.fixed2': 'Fixed again, in the cold.',
  'app.insitu.cap.conv': 'Conventional chips can’t fix themselves: one' + NB + 'by' + NB + 'one they fail, and the whole system stops.',
  'app.insitu.cap.many': 'Chips written by light correct themselves, and the whole system keeps working.',
  'btn.newTarget': 'New target',
  'lbl.conv': 'Conventional chips', 'lbl.ours': 'Chips written by light', 'lbl.sysDown': 'System down', 'lbl.sysOk': 'System working',
  'app.quantum': 'Quantum internet', 'app.quantum.sub': 'Linking distant chips',
  'app.quantum.cap.chip': 'The program writes stripes of light into our chip; there, blue photons split into twins. One twin waits in a memory.',
  'app.quantum.cap.pair': 'One twin from each chip meets in the middle. When both detectors click, the two twins waiting in the memories become entangled.',
  'app.quantum.cap.web': 'More chips, more meeting points: entanglement spreads like a web. A quantum internet.',
  'lbl.pump': 'Blue laser', 'lbl.twins': 'Twin photons', 'lbl.meet': 'Meeting point', 'lbl.entangled': 'Entangled', 'lbl.memory': 'Memory',
  'btn.tourApps': 'Take the tour', 'tour.nextApp': 'Next in {s} s',
  'btn.tourProg': 'Take the tour',
  'tour.nextProg': 'Next in {s} s',
  'tab.how': 'How it works',
  'tab.how.sub': 'Light writes the circuit: step by step',
  'how.s1': 'The chip is a stack of thin layers: a waveguide that guides light, a photoconductor and transparent electrodes.',
  'how.s2': 'A voltage is applied across the layers. In the dark, the photoconductor takes it all: no field reaches the waveguide.',
  'how.s3': 'A projector shines a pattern of light. Where the light falls, the photoconductor starts to conduct.',
  'how.s4': 'So the electric field reaches the waveguide only where the light shines.',
  'how.s5': 'There, the material changes: the pattern of light is written into the waveguide.',
  'how.s6': 'Light sent into the chip follows the written pattern: a circuit made by light.',
  'how.s7': 'Change the pattern of light, and the circuit changes with it. Nothing is etched.',
  'how.electrode': 'Transparent electrodes', 'how.pc': 'Photoconductor', 'how.wg': 'Optical waveguide', 'how.sub': 'Substrate',
  'how.volt': 'Voltage source', 'how.proj': 'Projector',
  'btn.prev': 'Back', 'btn.next': 'Next', 'btn.again': 'From the start', 'how.step': 'Step {i} of {n}',
  'note.prog': 'Shown in the lab: routing light and separating colours (Zhao et al. 2026), AI (Onodera et al. 2026), frequency doubling (Yanagimoto et al., Nature 2026); photon pairs proposed. On the real chips a program is a free-form pattern found by optimisation; here each is drawn as the circuit it replaces.',
};
const JA = {
  'title': '光で書き込むソフトウェア',
  'btn.labels': 'ラベル', 'btn.reset': '視点を戻す', 'btn.lang': 'English',
  'aria.stage': 'チップの3D表示', 'aria.modes': 'プレゼンテーション', 'aria.panel': 'このチップについて',
  'loading': '3D表示を読み込み中…',
  'noWebGL': 'このページにはWebGL 2が必要です。最新のEdge、Chrome、Firefox、Safariで開いてください。',
  'hint': 'ドラッグで見回す・スクロールやピンチで拡大',

  'tab.conv': '従来の' + WB + '光チップ',
  'tab.conv.sub': '今の光チップ：一つのチップに一つの仕事',
  'cap.conv': 'どのチップも、<b>一つの仕事</b>専用に作られています。<br>新しい仕事には、新しいチップが要ります。<br>チップをタップすると、動くところが見られます。',
  'note.conv': 'チップは実物よりずっと大きく、簡単にして描いています。ほとんどのチップは目に見えない赤外光を使います。色は光の周波数を表し（赤いほど低い）、違いがわかるように誇張しています。',
  'btn.tour': '順番に見る', 'btn.tourStop': 'ここで止める', 'tour.invite': '画面にタッチして、自由にご覧ください',
  'tour.next': 'あと' + NB + '{s}' + NB + '秒で次へ',

  'panel.in': '入力', 'panel.out': '出力',
  'panel.how': 'しくみ', 'panel.use': '使われているところ', 'panel.fixed': 'この仕事専用',
  'panel.try': 'さわってみる', 'panel.back': 'すべてのチップ', 'panel.prev': '前のチップ', 'panel.next': '次のチップ',
  'panel.count': '{i}' + NB + '/' + NB + '{n}', 'panel.example': '実際の例',
  'on': 'オン', 'off': 'オフ',

  'cat.comm': '通信', 'cat.compute': '計算', 'cat.sense': 'センシング', 'cat.metro': '計測',
  'cat.quantum': '量子', 'cat.convert': '色を変える',
  'pf.si': 'シリコン', 'pf.sin': '窒化シリコン', 'pf.ln': 'ニオブ酸リチウム', 'pf.silica': '石英ガラス',
  'stub': 'このチップは準備中です。',

  'tab.prog': '本研究：' + WB + 'プログラム' + WB + 'できる' + WB + '光チップ',
  'tab.prog.sub': '1枚のチップで、どんな仕事も。光が回路を書き込みます',
  'prog.blank': 'まっさらなチップ。何も刻まれていません。',
  'prog.writing': '上からの緑の光が、<b>プログラム</b>を書き込みます。',
  'prog.running': 'いま動いているのは<b>{name}</b>です。<br>同じチップに、別の仕事も書き込めます。',
  'prog.none': '光を消すと回路も消え、まっさらなチップに戻ります。',
  'lbl.program': 'プログラム（緑の光）', 'lbl.blank': 'まっさらなチップ', 'lbl.written': '光で書いた回路',
  'cat.title': 'プログラム', 'cat.none': 'プログラムなし',
  'tab.apps': '応用の可能性',
  'tab.apps.sub': '光で書き換えるチップで、将来できること',
  'apps.title': '応用の可能性',
  'app.compute': '光で計算', 'app.compute.sub': '光が通り抜けるあいだに計算',
  'app.compute.cap.gpu': 'GPUが、ぼやけた画像をくっきりさせます。',
  'app.compute.cap.stream': '画像を次々に処理するうちに、GPUは熱くなっていきます。',
  'app.compute.cap.optics': '光は、どうやって計算するのでしょうか？<br>レンズは熱くならずに、同じ画像をくっきりさせます。',
  'app.compute.cap.super': 'もっと複雑なガラスなら、手書きの数字を読み取れます。<br>数字ごとに、決まった場所が明るくなります。',
  'app.compute.cap.flat': 'ガラスを平らにすると、チップになります。<br>画像は、一列に並んだ光として入ります。',
  'app.compute.cap.program': 'このチップでは、緑の光が上からパターンを書き込みます。<br>これが、光で書いたプログラムです。',
  'app.compute.cap.rewrite': '別のプログラムを書き込みます。<br>同じチップが、今度は母音を聞き分けます。',
  'lbl.prog.image': '画像認識', 'lbl.prog.voice': '音声認識', 'btn.fromStart': '最初から',
  'lbl.gpu': 'GPU', 'lbl.lightchip': '私たちの光チップ',
  'lbl.input': '入力', 'lbl.output': '出力', 'lbl.feedback': 'フィードバック',
  'lbl.target': '目標', 'lbl.now': '現在', 'lbl.step': 'ステップ', 'lbl.match': '一致',
  'app.insitu': 'その場で逆設計と誤差補正', 'app.insitu.sub': 'チップが自分で設計し、自分で直す',
  'app.insitu.cap.goal': '目標は、色ごとに決まった出口へ送ることです。<br>まだパターンがないので、色は混ざっています。',
  'app.insitu.cap.learn': 'チップが出力を測り、ずれをフィードバックします。<br>少しずつ、自分でプログラムを書いていきます。',
  'app.insitu.cap.learned': '覚えました。<br>どの色も、決まった出口から出ていきます。',
  'app.insitu.cap.fire': '火でチップが熱くなり、色が出口からずれてしまいます。',
  'app.insitu.cap.fix': '同じフィードバックで、チップはプログラムを書き直します。',
  'app.insitu.cap.fixed': '熱いままでも、また正しく働きます。',
  'app.insitu.cap.snow': '今度は雪でチップが冷え、また色がずれてしまいます。',
  'app.insitu.cap.fixed2': '寒くても、また直りました。',
  'app.insitu.cap.conv': '従来のチップは自分で直せません。<br>熱さや寒さで次々に働かなくなり、全体が止まります。',
  'app.insitu.cap.many': '光で書き込むチップなら、一つ一つが自分で直します。<br>システム全体が動き続けます。',
  'btn.newTarget': '新しい目標',
  'lbl.conv': '従来のチップ', 'lbl.ours': '光で書き込むチップ', 'lbl.sysDown': 'システム停止', 'lbl.sysOk': 'システム稼働中',
  'app.quantum': '量子インターネット', 'app.quantum.sub': '遠くのチップをつなぐ',
  'app.quantum.cap.chip': 'プログラムの光でチップに縞模様を書き込むと、青い光子がふたごの光子に分かれます。<br>片方はメモリで待ちます。',
  'app.quantum.cap.pair': '2つのチップから来たふたごの片方ずつが、真ん中で出会います。<br>2つの検出器が同時に反応すると、メモリで待つ2つの光子が量子もつれでつながります。',
  'app.quantum.cap.web': 'チップと出会いの場所が増えると、量子もつれが網の目のように広がります。<br>量子インターネットです。',
  'lbl.pump': '青いレーザー', 'lbl.twins': 'ふたごの光子', 'lbl.meet': '出会いの場所', 'lbl.entangled': '量子もつれ', 'lbl.memory': 'メモリ',
  'btn.tourApps': '順番に見る', 'tour.nextApp': 'あと' + NB + '{s}' + NB + '秒で次へ',
  'btn.tourProg': '順番に見る',
  'tour.nextProg': 'あと' + NB + '{s}' + NB + '秒で次へ',
  'tab.how': 'しくみ',
  'tab.how.sub': '光が回路を書き込むしくみ',
  'how.s1': 'チップは薄い層を重ねたものです。<br>光の通り道（導波路）、光導電体、そして透明な電極です。',
  'how.s2': '層の上下に電圧をかけます。<br>暗いところでは光導電体が電圧を受け止め、導波路には電界が届きません。',
  'how.s3': 'プロジェクターが光のパターンを当てます。<br>光が当たったところだけ、光導電体が電気を通すようになります。',
  'how.s4': 'そのため、電界は光が当たったところだけ、導波路に届きます。',
  'how.s5': 'そこで材料の性質が変わり、光のパターンが導波路に書き込まれます。',
  'how.s6': 'チップに入った光は、書き込まれたパターンに沿って進みます。<br>光でできた回路です。',
  'how.s7': '光のパターンを変えれば、回路も変わります。<br>何も削っていません。',
  'how.electrode': '透明電極', 'how.pc': '光導電体', 'how.wg': '光導波路', 'how.sub': '基板',
  'how.volt': '電源', 'how.proj': 'プロジェクター',
  'btn.prev': '戻る', 'btn.next': '次へ', 'btn.again': '最初から', 'how.step': 'ステップ' + NB + '{i}' + NB + '/' + NB + '{n}',
  'note.prog': '実験で実証：光の経路の切り替えと色の分離（Zhao ほか 2026）、AI（Onodera ほか 2026）、周波数の倍増（Yanagimoto ほか、Nature 2026）。光子対は提案段階。実際のチップのプログラムは最適化で見つけた自由な形のパターンで、ここでは置き換える回路の形で描いています。',
};

const DICT = { en: EN, ja: JA };
let lang = 'en';

export function setLang(l) {
  lang = DICT[l] ? l : 'en';
  document.documentElement.lang = lang;
  document.title = t('title');
  applyDom();
}
export const getLang = () => lang;
export function fill(s, vars) {
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export function t(key, vars) { return fill(DICT[lang][key] ?? EN[key] ?? key, vars); }
export function applyDom(root = document) {
  for (const e of root.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
  for (const e of root.querySelectorAll('[data-i18n-aria]')) e.setAttribute('aria-label', t(e.dataset.i18nAria));
}
export const keysOf = l => Object.keys(DICT[l] || {});

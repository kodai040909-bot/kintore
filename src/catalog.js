// 種目・部位グループ・分割・マッチョ度の表（実装計画書 §5.1・§5.3）

/** 能力 */
export const ABILITIES = [
  { id: 'punch', name: 'パンチ力' },
  { id: 'guard', name: 'ガード' },
  { id: 'speed', name: 'スピード' },
  { id: 'stamina', name: '体力' },
];

/** 3分割（本人決定）。順番は「今日の分割」の提案に使う */
export const SPLITS = [
  { id: 'chest', name: '胸・腕' },
  { id: 'back', name: '背中・腕' },
  { id: 'shoulder', name: '肩・脚' },
];
export const splitName = id => (SPLITS.find(s => s.id === id) || {}).name || '';

/** 部位グループ → 入る能力の割合と、ひと回りで数える分割 */
export const GROUPS = {
  push:     { name: '胸押し',   to: { punch: 1.0 },                split: 'chest' },
  tri:      { name: '三頭',     to: { punch: 0.8, stamina: 0.2 },  split: 'chest' },
  pull:     { name: '背中引き', to: { guard: 1.0 },                split: 'back' },
  curl:     { name: 'カール',   to: { guard: 0.8, stamina: 0.2 },  split: 'back' },
  shoulder: { name: '肩',       to: { speed: 1.0 },                split: 'shoulder' },
  leg:      { name: '脚',       to: { speed: 0.6, stamina: 0.6 },  split: 'shoulder' },
  other:    { name: 'その他',   to: { stamina: 0.5 },              split: null },
};

/**
 * いつもの種目の仮リスト（本人のリストが届いたら差し替える）
 * bw: 自重の種目（初めて記録するときの重さを 0 にする）
 */
export const DEFAULT_EXERCISES = [
  { id: 'bench',      name: 'ベンチプレス',         group: 'push' },
  { id: 'db-press',   name: 'ダンベルプレス',       group: 'push' },
  { id: 'db-fly',     name: 'ダンベルフライ',       group: 'push' },
  { id: 'dips',       name: 'ディップス',           group: 'tri', bw: true },
  { id: 'french',     name: 'フレンチプレス',       group: 'tri' },
  { id: 'chin',       name: '懸垂',                 group: 'pull', bw: true },
  { id: 'lat-pull',   name: 'ラットプルダウン',     group: 'pull' },
  { id: 'row',        name: 'ベントオーバーロウ',   group: 'pull' },
  { id: 'curl',       name: 'バーベルカール',       group: 'curl' },
  { id: 'hammer',     name: 'ハンマーカール',       group: 'curl' },
  { id: 'sh-press',   name: 'ショルダープレス',     group: 'shoulder' },
  { id: 'side-raise', name: 'サイドレイズ',         group: 'shoulder' },
  { id: 'rear-raise', name: 'リアレイズ',           group: 'shoulder' },
  { id: 'squat',      name: 'スクワット',           group: 'leg' },
  { id: 'leg-press',  name: 'レッグプレス',         group: 'leg' },
];

/** マッチョ度：全部の点の累計で8段階（§5.3。数字は M3 で見直す） */
export const MACHO = [
  { at: 0,   name: 'ひょろ' },
  { at: 15,  name: 'ふつう' },
  { at: 40,  name: '引きしまった' },
  { at: 75,  name: 'がっしり' },
  { at: 115, name: '筋肉質' },
  { at: 160, name: 'たくましい' },
  { at: 210, name: 'ムキムキ' },
  { at: 265, name: '鋼の体' },
];

/**
 * 技（design.md §4.2）。routes はどれか1つを満たせば覚える
 *   能力のしきい値（表示レベル）／ beat: 相手 n に勝つ（または3回戦う）／ has + rounds: 技を持ってひと回り n 回
 * 試合での中身：kind 'atk'（打つ）・'def'（受ける）・'util'
 *   atk: base ダメージ、acc 命中、hits 連打数、guardPierce ガードを無視する割合、drain 当たると相手のスピードを下げる、once 1試合1回
 * 数字は M3 の釣り合いのシミュレーター（tools/balance.js）で合わせた
 */
export const MOVES = [
  { id: 'jab',      name: 'ジャブ',       kind: 'atk', base: 4,  acc: 0.88, routes: [{}], desc: '速くて弱い。手数で削る' },
  { id: 'straight', name: 'ストレート',   kind: 'atk', base: 8,  acc: 0.78, routes: [{ punch: 3 }, { speed: 3, guard: 2 }], desc: 'まっすぐ打ち抜く基本の一撃' },
  { id: 'hook',     name: 'フック',       kind: 'atk', base: 9,  acc: 0.72, guardPierce: 0.5, routes: [{ punch: 4, guard: 2 }, { beat: 1 }], desc: '横から。ガードの上からも効く' },
  { id: 'body',     name: 'ボディブロー', kind: 'atk', base: 6,  acc: 0.8,  drain: 0.4, routes: [{ punch: 4, stamina: 3 }, { beat: 4 }], desc: '当たるたびに相手の足が鈍る' },
  { id: 'upper',    name: 'アッパー',     kind: 'atk', base: 13, acc: 0.6,  routes: [{ punch: 7, speed: 3 }, { punch: 9 }, { beat: 2 }], desc: '大きいが当てにくい' },
  { id: 'onetwo',   name: 'ワンツー',     kind: 'atk', base: 5,  acc: 0.82, hits: 2, routes: [{ has: ['jab', 'straight'], rounds: 2 }], desc: 'ジャブからストレートの2連打' },
  { id: 'weave',    name: 'ウィービング', kind: 'def', evade: 0.14, routes: [{ speed: 4 }, { guard: 4, speed: 2 }], desc: '上体を振ってパンチをかわす' },
  { id: 'block',    name: 'ブロッキング', kind: 'def', block: 0.45, routes: [{ guard: 3 }, { stamina: 5 }], desc: '腕で受けてダメージを減らす' },
  { id: 'clinch',   name: 'クリンチ',     kind: 'util', routes: [{ guard: 5, stamina: 3 }, { beat: 3 }], desc: 'ピンチで組みついて休む（1ラウンド1回）' },
  { id: 'counter',  name: 'カウンター',   kind: 'def', counter: 9, routes: [{ speed: 7, guard: 4 }, { beat: 5 }], desc: 'かわした直後に打ち返す' },
  { id: 'ace',      name: '奥の手',       kind: 'atk', base: 22, acc: 0.72, once: true, routes: [{ punch: 8, guard: 8, speed: 8 }, { beat: 6 }], desc: '1試合1回の大技。相手が弱ってから' },
];
export const moveById = id => MOVES.find(m => m.id === id);

/** 章（design.md §6.2）。会場の名前は架空 */
export const CHAPTERS = [
  { id: 1, name: 'クラブ戦',       venue: '港町のボクシングクラブ', rounds: 4 },
  { id: 2, name: '州タイトル',     venue: '州の体育館',             rounds: 8 },
  { id: 3, name: '全米タイトル',   venue: '大きなアリーナ',         rounds: 12 },
  { id: 4, name: '世界ランカー',   venue: '砂漠の街の大会場',       rounds: 12 },
  { id: 5, name: '世界王者',       venue: '砂漠の街の大会場',       rounds: 12 },
];

/**
 * 相手7人（名前はすべて仮・オリジナル）。ab は能力、moves は持ち込む技
 * target はこの相手に勝てるようになる累計ジム回数の目安（週3回のふつうの人で勝率5割）
 * ab は tools/balance.js で target に合わせて決めた数字
 */
export const OPPONENTS = [
  { id: 1, chapter: 1, name: 'ダイナーで働く新人',     style: '打ち合い',         target: 1,  purse: 50,   sig: 'hook',    moves: ['jab'], mult: { punch: 1.0, guard: 0.9, speed: 1.0, stamina: 1.0 }, ab: { punch: 1, guard: 0, speed: 0, stamina: 0.5 } },
  { id: 2, chapter: 1, name: 'レンガ割りのブルーノ',   style: 'ハードパンチャー', target: 4,  purse: 120,  sig: 'upper',   moves: ['jab', 'straight', 'upper'], mult: { punch: 1.35, guard: 0.9, speed: 0.75, stamina: 1.1 }, ab: { punch: 3.9, guard: 1.4, speed: 1.1, stamina: 3.7 }, boss: true },
  { id: 3, chapter: 2, name: '細身のアウトボクサー、リオ', style: 'アウトボクサー', target: 6,  purse: 150,  sig: 'clinch',  moves: ['jab', 'onetwo', 'weave'], mult: { punch: 0.8, guard: 0.95, speed: 1.4, stamina: 0.9 }, ab: { punch: 2.1, guard: 2.5, speed: 3.8, stamina: 4.4 } },
  { id: 4, chapter: 2, name: '元アメフト選手',         style: 'タフ',             target: 9,  purse: 300,  sig: 'body',    moves: ['straight', 'body', 'block'], mult: { punch: 1.05, guard: 1.3, speed: 0.75, stamina: 1.4 }, ab: { punch: 3.8, guard: 4.9, speed: 2.8, stamina: 9.7 }, boss: true },
  { id: 5, chapter: 3, name: 'サウスポーの技巧派',     style: 'カウンター',       target: 12, purse: 500,  sig: 'counter', moves: ['straight', 'weave', 'counter'], mult: { punch: 1.0, guard: 1.05, speed: 1.2, stamina: 0.95 }, ab: { punch: 4.8, guard: 5.1, speed: 5.9, stamina: 8.6 }, boss: true },
  { id: 6, chapter: 4, name: '世界ランキング1位',      style: 'バランス',         target: 16, purse: 800,  sig: 'ace',     moves: ['onetwo', 'upper', 'weave'], mult: { punch: 1.05, guard: 1.05, speed: 1.05, stamina: 1.05 }, ab: { punch: 8.1, guard: 6.9, speed: 7, stamina: 13.5 }, boss: true },
  { id: 7, chapter: 5, name: '世界チャンピオン',       style: '総合',             target: 21, purse: 1500, sig: null,      moves: ['onetwo', 'upper', 'counter'], mult: { punch: 1.1, guard: 1.1, speed: 1.1, stamina: 1.1 }, ab: { punch: 9.6, guard: 9.8, speed: 9.9, stamina: 18.3 }, boss: true },
];
export const oppById = id => OPPONENTS.find(o => o.id === id);

/**
 * 店の品（design.md §7）。kind: 'gear' 用具（部屋に置かれ、能力の伸びが増える）／'room' 内装（見た目だけ）／'wear' 服（色。着替えられる）
 * 用具の上乗せは、1つの能力につき合わせて +15% まで。買った日より後のジムから効く
 * 値段：7人の初勝利の賞金の合計（$3,420）とひと回りのお金で、終わるころにだいたい全部そろう
 */
export const SHOP = [
  { id: 'bench',    kind: 'gear', name: 'ベンチ台',         price: 80,  bonus: { punch: 0.05 },   desc: 'パンチ力の伸び +5%' },
  { id: 'pullup',   kind: 'gear', name: '懸垂バー',         price: 80,  bonus: { guard: 0.05 },   desc: 'ガードの伸び +5%' },
  { id: 'rack',     kind: 'gear', name: 'ダンベルラック',   price: 120, bonus: { speed: 0.05 },   desc: 'スピードの伸び +5%' },
  { id: 'bag',      kind: 'gear', name: 'サンドバッグ',     price: 150, bonus: { stamina: 0.05, punch: 0.05 }, desc: '体力とパンチ力の伸び +5%' },
  { id: 'speedbag', kind: 'gear', name: 'パンチングボール', price: 250, bonus: { speed: 0.05, guard: 0.05 }, desc: 'スピードとガードの伸び +5%' },
  { id: 'poster',   kind: 'room', name: 'こぶしのポスター', price: 40,  desc: '壁に貼る' },
  { id: 'radio',    kind: 'room', name: 'ラジカセ',         price: 60,  desc: '窓辺に置く' },
  { id: 'plant',    kind: 'room', name: '観葉植物',         price: 70,  desc: '部屋の隅に' },
  { id: 'rug',      kind: 'room', name: '赤いラグ',         price: 90,  desc: 'マットを替える' },
  { id: 'neon',     kind: 'room', name: 'ネオンの看板',     price: 250, desc: '壁が光る' },
  { id: 'shelf',    kind: 'room', name: 'ベルトの棚',       price: 300, desc: '勝ち取ったベルトを飾る' },
  { id: 'trunks-red',   kind: 'wear', slot: 'trunks', color: 'red',   name: '赤いトランクス',   price: 60,  desc: 'リングでもジムでも' },
  { id: 'trunks-black', kind: 'wear', slot: 'trunks', color: 'black', name: '黒と金のトランクス', price: 120, desc: 'リングでもジムでも' },
  { id: 'trunks-white', kind: 'wear', slot: 'trunks', color: 'white', name: '白と金のトランクス', price: 200, desc: 'リングでもジムでも' },
  { id: 'gloves-red',   kind: 'wear', slot: 'gloves', color: 'red',   name: '赤いグローブ',     price: 80,  desc: '試合で使う' },
  { id: 'gloves-black', kind: 'wear', slot: 'gloves', color: 'black', name: '黒いグローブ',     price: 100, desc: '試合で使う' },
  { id: 'gloves-gold',  kind: 'wear', slot: 'gloves', color: 'gold',  name: '金のグローブ',     price: 400, desc: '試合で使う' },
  { id: 'wraps-black',  kind: 'wear', slot: 'wraps',  color: 'black', name: '黒いバンテージ',   price: 30,  desc: 'ジムで巻く' },
  { id: 'wraps-red',    kind: 'wear', slot: 'wraps',  color: 'red',   name: '赤いバンテージ',   price: 30,  desc: 'ジムで巻く' },
];
export const shopById = id => SHOP.find(x => x.id === id);
/** 最初から部屋にあるもの（買わなくてよい） */
export const STARTER_ITEMS = ['dumbbell'];
/** 最初から着ているもの */
export const DEFAULT_WEAR = { trunks: 'blue', gloves: 'blue', wraps: 'white' };

// 扑克牌的编码：card = rank * 4 + suit。rank 0–12 对应 2…A，suit 0–3 对应 ♠ ♥ ♦ ♣。
// 用整数是为了让估算胜率时的大量比牌又快又不产生垃圾对象。

export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];

export const makeCard = (rank, suit) => rank * 4 + suit;
export const rankOf = card => card >> 2;
export const suitOf = card => card & 3;

export function parseCard(text) {
  const rank = RANKS.indexOf(String(text)[0]?.toUpperCase());
  const suit = SUITS.indexOf(String(text)[1]?.toLowerCase());
  if (String(text).length !== 2 || rank < 0 || suit < 0) throw new Error('Bad card: ' + text);
  return makeCard(rank, suit);
}

export const parseCards = text => String(text).trim().split(/\s+/).filter(Boolean).map(parseCard);
export const cardToString = card => RANKS[rankOf(card)] + SUITS[suitOf(card)];
export const isCard = value => Number.isInteger(value) && value >= 0 && value < 52;

export const freshDeck = () => Array.from({ length: 52 }, (_, index) => index);

/** 发牌用的随机数：浏览器和 Node 都有 crypto.getRandomValues，拒绝采样保证没有取模偏差 */
export const cryptoRandom = {
  int(n) {
    const buffer = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    let value;
    do {
      globalThis.crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % n;
  },
  float() {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0] / 0x100000000;
  }
};

/** AI 的随机决定不需要密码学强度 */
export const mathRandom = { float: () => Math.random(), int: n => Math.floor(Math.random() * n) };

/** 可复现的随机数（mulberry32），测试和回放用 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  const float = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { float, int: n => Math.floor(float() * n) };
}

/** Fisher–Yates 洗牌，原地打乱并返回 */
export function shuffle(cards, random = cryptoRandom) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = random.int(i + 1);
    const swap = cards[i];
    cards[i] = cards[j];
    cards[j] = swap;
  }
  return cards;
}

// 5～7 张牌里最大的五张牌的牌力。返回一个整数，越大越强，相等就是平分：
//   category << 20 | r1 << 16 | r2 << 12 | r3 << 8 | r4 << 4 | r5
// category 0–8 见 CATEGORIES；r1…r5 是决定大小的点数（0 = 2 … 12 = A），按重要性排。
// 七张牌里同花不可能同时有四条或葫芦（同一花色最多从每个点数里拿一张），所以先查同花。

export const CATEGORIES = ['highCard', 'pair', 'twoPair', 'trips', 'straight', 'flush', 'fullHouse', 'quads', 'straightFlush'];
export const HIGH_CARD = 0, PAIR = 1, TWO_PAIR = 2, TRIPS = 3, STRAIGHT = 4, FLUSH = 5, FULL_HOUSE = 6, QUADS = 7, STRAIGHT_FLUSH = 8;

const counts = new Uint8Array(13);

/** 顺子的最大点数，没有顺子返回 -1。A 也可以当 1 用（A2345，最大点是 5） */
function straightHigh(mask) {
  const m = (mask << 1) | ((mask >> 12) & 1);
  for (let high = 13; high >= 4; high--) {
    if (((m >> (high - 4)) & 31) === 31) return high - 1;
  }
  return -1;
}

/** 从点数集合里从大到小取 k 个，打包到 r1… 的位置上 */
function topRanks(mask, k) {
  let packed = 0, shift = 16;
  for (let rank = 12; rank >= 0 && k > 0; rank--) {
    if (mask & (1 << rank)) {
      packed |= rank << shift;
      shift -= 4;
      k--;
    }
  }
  return packed;
}

export function evaluate(cards, n = cards.length) {
  counts.fill(0);
  let all = 0, s0 = 0, s1 = 0, s2 = 0, s3 = 0, n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  for (let i = 0; i < n; i++) {
    const card = cards[i], rank = card >> 2, bit = 1 << rank;
    counts[rank]++;
    all |= bit;
    switch (card & 3) {
      case 0: s0 |= bit; n0++; break;
      case 1: s1 |= bit; n1++; break;
      case 2: s2 |= bit; n2++; break;
      default: s3 |= bit; n3++;
    }
  }

  const flush = n0 >= 5 ? s0 : n1 >= 5 ? s1 : n2 >= 5 ? s2 : n3 >= 5 ? s3 : 0;
  if (flush) {
    const high = straightHigh(flush);
    return high >= 0 ? (STRAIGHT_FLUSH << 20) | (high << 16) : (FLUSH << 20) | topRanks(flush, 5);
  }

  let quads = -1, trips = -1, trips2 = -1, pair = -1, pair2 = -1;
  for (let rank = 12; rank >= 0; rank--) {
    const c = counts[rank];
    if (c === 4) quads = rank;
    else if (c === 3) { if (trips < 0) trips = rank; else if (trips2 < 0) trips2 = rank; }
    else if (c === 2) { if (pair < 0) pair = rank; else if (pair2 < 0) pair2 = rank; }
  }

  if (quads >= 0) return (QUADS << 20) | (quads << 16) | (topRanks(all & ~(1 << quads), 1) >> 4);
  if (trips >= 0 && (trips2 >= 0 || pair >= 0)) {
    return (FULL_HOUSE << 20) | (trips << 16) | (Math.max(trips2, pair) << 12);
  }
  const high = straightHigh(all);
  if (high >= 0) return (STRAIGHT << 20) | (high << 16);
  if (trips >= 0) return (TRIPS << 20) | (trips << 16) | (topRanks(all & ~(1 << trips), 2) >> 4);
  if (pair2 >= 0) {
    return (TWO_PAIR << 20) | (pair << 16) | (pair2 << 12) | (topRanks(all & ~(1 << pair) & ~(1 << pair2), 1) >> 8);
  }
  if (pair >= 0) return (PAIR << 20) | (pair << 16) | (topRanks(all & ~(1 << pair), 3) >> 4);
  return (HIGH_CARD << 20) | topRanks(all, 5);
}

export const categoryOf = score => score >>> 20;

/** 牌力里决定大小的点数，按重要性排（个数随牌型不同） */
export function scoreRanks(score) {
  const used = [1, 4, 3, 3, 1, 5, 2, 2, 1][categoryOf(score)];
  const ranks = [];
  for (let i = 0; i < used; i++) ranks.push((score >> (16 - 4 * i)) & 15);
  return ranks;
}

/** 组成最大牌型的那五张（亮牌时高亮用） */
export function bestFive(cards) {
  const target = evaluate(cards);
  const n = cards.length;
  if (n <= 5) return { score: target, cards: cards.slice() };
  const pick = new Array(5);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) {
    for (let d = c + 1; d < n; d++) for (let e = d + 1; e < n; e++) {
      pick[0] = cards[a]; pick[1] = cards[b]; pick[2] = cards[c]; pick[3] = cards[d]; pick[4] = cards[e];
      if (evaluate(pick, 5) === target) return { score: target, cards: pick.slice() };
    }
  }
  return { score: target, cards: cards.slice(0, 5) };
}

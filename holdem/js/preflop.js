// 169 种起手牌：单挑对一手随机牌的胜率（千分比，蒙特卡洛 20 万次/种，误差约 ±0.2%）。
// 表格按 13×13 排：第 r1 行第 r2 列，r1 > r2 是同花，r1 < r2 是不同花（存在 [小][大]），r1 = r2 是对子。
// AI 和「练习助手」翻牌前用它，比每次现算快得多；percentile 是这手牌在 1326 种组合里排前百分之几。
import { RANKS, rankOf, suitOf } from './cards.js';

const EQUITY = [503,323,333,342,341,347,368,393,415,445,473,504,550,360,537,353,363,360,365,374,401,425,454,481,514,558,370,387,569,381,378,387,395,406,433,462,492,523,565,378,397,414,604,400,406,414,427,444,472,501,532,576,376,395,413,432,632,423,432,444,461,477,509,544,577,382,401,418,438,453,662,450,463,481,495,517,550,590,404,409,427,445,461,480,692,481,498,514,534,560,598,424,433,437,457,472,490,509,720,515,534,552,577,608,449,456,465,471,491,506,525,538,750,551,572,597,630,474,482,491,498,505,522,540,558,575,774,582,606,636,501,509,519,528,538,543,558,577,595,602,800,614,643,532,541,548,560,566,576,583,601,619,626,633,825,655,574,582,591,598,599,610,620,628,645,655,661,670,853];

const COMBOS = index => {
  const r1 = Math.floor(index / 13), r2 = index % 13;
  return r1 === r2 ? 6 : r1 > r2 ? 4 : 12;
};

/** 起手牌在 13×13 表里的位置 */
export function handClass(a, b) {
  const ra = rankOf(a), rb = rankOf(b);
  const hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  if (hi === lo) return hi * 13 + hi;
  return suitOf(a) === suitOf(b) ? hi * 13 + lo : lo * 13 + hi;
}

export function classLabel(index) {
  const r1 = Math.floor(index / 13), r2 = index % 13;
  if (r1 === r2) return RANKS[r1] + RANKS[r1];
  return r1 > r2 ? RANKS[r1] + RANKS[r2] + 's' : RANKS[r2] + RANKS[r1] + 'o';
}

// 按胜率从高到低排，累计组合数 ÷ 1326：AA ≈ 0.005，72o ≈ 1
const PERCENTILE = new Float64Array(169);
{
  const order = Array.from({ length: 169 }, (_, i) => i).sort((x, y) => EQUITY[y] - EQUITY[x]);
  let total = 0;
  for (const index of order) {
    total += COMBOS(index);
    PERCENTILE[index] = total / 1326;
  }
}

export const preflopEquity = (a, b) => EQUITY[handClass(a, b)] / 1000;
export const preflopPercentile = (a, b) => PERCENTILE[handClass(a, b)];
export const handLabel = (a, b) => classLabel(handClass(a, b));

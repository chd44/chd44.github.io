// 蒙特卡洛估胜率：随机补完对手的底牌和剩下的公共牌，数自己赢了几次（平分按份数算）。
// ranges[i] 是第 i 个对手的大致范围：只考虑起手牌排前 ranges[i] 的那些（1 = 任意两张）。
// 用拒绝采样实现：抽到范围外的就放回重抽，最多 12 次，免得范围太窄时卡住。
import { mathRandom } from './cards.js';
import { evaluate } from './evaluator.js';
import { preflopPercentile } from './preflop.js';

export function estimateEquity({ hole, board = [], opponents = 1, ranges = null, iterations = 1000, random = mathRandom }) {
  if (opponents < 1) return { equity: 1, win: 1, tie: 0 };
  const used = new Uint8Array(52);
  for (const card of hole) used[card] = 1;
  for (const card of board) used[card] = 1;
  const pool = [];
  for (let card = 0; card < 52; card++) if (!used[card]) pool.push(card);

  const missing = 5 - board.length;
  const hero = new Array(7);
  const villain = new Array(7);
  const villains = new Array(opponents * 2);
  const runout = new Array(missing);
  hero[0] = hole[0];
  hero[1] = hole[1];
  for (let i = 0; i < board.length; i++) hero[2 + i] = board[i];

  let wins = 0, ties = 0;
  for (let it = 0; it < iterations; it++) {
    let n = pool.length;
    const draw = () => {
      const i = random.int(n);
      const card = pool[i];
      pool[i] = pool[n - 1];
      pool[n - 1] = card;
      n--;
      return card;
    };
    for (let o = 0; o < opponents; o++) {
      const limit = ranges ? ranges[o] ?? 1 : 1;
      let a, b;
      for (let tries = 0; ; tries++) {
        a = draw();
        b = draw();
        if (limit >= 1 || tries >= 12 || preflopPercentile(a, b) <= limit) break;
        n += 2;  // 放回：这两张还在 pool 里，只是挪到了末尾
      }
      villains[o * 2] = a;
      villains[o * 2 + 1] = b;
    }
    for (let k = 0; k < missing; k++) runout[k] = draw();
    for (let k = 0; k < missing; k++) hero[2 + board.length + k] = runout[k];

    const mine = evaluate(hero, 7);
    let best = -1, tied = 0;
    for (let o = 0; o < opponents; o++) {
      villain[0] = villains[o * 2];
      villain[1] = villains[o * 2 + 1];
      for (let k = 2; k < 7; k++) villain[k] = hero[k];
      const theirs = evaluate(villain, 7);
      if (theirs > best) { best = theirs; tied = 0; }
      if (theirs === mine) tied++;
    }
    if (mine > best) wins++;
    else if (mine === best) ties += 1 / (tied + 1);
  }
  return { equity: (wins + ties) / iterations, win: wins / iterations, tie: ties / iterations };
}

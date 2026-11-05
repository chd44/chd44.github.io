// AI 对手。只看得到公开信息（公共牌、下注记录、筹码）和自己的两张底牌。
// 翻牌前查起手牌强度表；翻牌后用蒙特卡洛估胜率，对手的范围按他们翻牌前的行动粗略收窄，
// 再和底池赔率比较决定跟、加还是弃。风格参数让每个 AI 打法不一样，难度决定估算精度和随机噪声。
import { mathRandom } from './cards.js';
import { estimateEquity } from './equity.js';
import { preflopPercentile } from './preflop.js';

export const STYLES = {
  tag: { loose: 0.21, aggression: 0.66, bluff: 0.10, sticky: 0.00, trap: 0.15 },
  lag: { loose: 0.34, aggression: 0.76, bluff: 0.20, sticky: 0.02, trap: 0.10 },
  station: { loose: 0.48, aggression: 0.24, bluff: 0.04, sticky: 0.10, trap: 0.05 },
  rock: { loose: 0.13, aggression: 0.42, bluff: 0.03, sticky: -0.04, trap: 0.25 },
  maniac: { loose: 0.58, aggression: 0.90, bluff: 0.30, sticky: 0.04, trap: 0.05 },
  solid: { loose: 0.26, aggression: 0.58, bluff: 0.12, sticky: 0.00, trap: 0.15 }
};

export const DIFFICULTY = {
  easy: { iterations: 260, noise: 0.12, ranges: false, styles: ['station', 'maniac', 'rock', 'station', 'lag', 'rock', 'maniac'] },
  normal: { iterations: 600, noise: 0.07, ranges: true, styles: ['tag', 'station', 'lag', 'rock', 'solid', 'maniac', 'tag'] },
  hard: { iterations: 1100, noise: 0.035, ranges: true, styles: ['tag', 'lag', 'solid', 'tag', 'lag', 'solid', 'rock'] }
};

const between = (random, lo, hi) => lo + (hi - lo) * random.float();

/** 把加注额整理成好看的数（大盲 ≥ 20 时取 5 的倍数），并限制在合法范围内；离全下很近就直接全下 */
export function shapeRaise(to, legal, bigBlind) {
  const unit = bigBlind >= 20 ? 5 : 1;
  let amount = Math.round(to / unit) * unit;
  amount = Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, amount));
  if (amount - legal.committed >= legal.stack * 0.85) amount = legal.maxRaiseTo;
  return amount;
}

/** 从下注记录里推一个对手翻牌前的大致范围（起手牌前百分之几） */
export function preflopRange(log, id) {
  let raises = 0, range = 1;
  for (const e of log) {
    if (e.t !== 'action' || e.street !== 'preflop') continue;
    if (e.action === 'raise' || e.action === 'bet') {
      raises++;
      if (e.id === id) range = raises === 1 ? 0.22 : raises === 2 ? 0.09 : 0.045;
    } else if (e.action === 'call' && e.id === id) {
      range = Math.min(range, raises === 0 ? 0.55 : raises === 1 ? 0.3 : 0.12);
    }
  }
  return range;
}

/** AI 能看到的信息。不读别人的底牌 */
export function decisionContext(table, id) {
  const hand = table.hand;
  const me = hand.players[id];
  const legal = table.legalActions(id);
  const live = hand.order.filter(x => !hand.players[x].folded);
  const opponents = live.filter(x => x !== id);
  const streetLog = hand.log.filter(e => e.t === 'action' && e.street === hand.street);
  const preflopActions = hand.log.filter(e => e.t === 'action' && e.street === 'preflop');
  const preflopRaiser = [...preflopActions].reverse().find(e => e.action === 'raise')?.id ?? null;
  // 本轮还要在我后面行动的人数：越少位置越好。翻牌前从大盲左边开始说话，翻牌后从按钮左边
  const bbIndex = hand.order.indexOf(table.seats[hand.bbSeat]?.id);
  const actionOrder = hand.street === 'preflop'
    ? hand.order.slice(bbIndex + 1).concat(hand.order.slice(0, bbIndex + 1))
    : hand.order;
  const behind = actionOrder.slice(actionOrder.indexOf(id) + 1)
    .filter(x => !hand.players[x].folded && !hand.players[x].allIn).length;
  return {
    id,
    hole: me.hole.slice(),
    board: hand.board.slice(),
    street: hand.street,
    legal,
    bigBlind: hand.bigBlind,
    pot: table.totalPot(),
    stack: table.player(id).stack,
    opponents: opponents.map(x => ({
      id: x,
      allIn: hand.players[x].allIn,
      stack: table.player(x).stack,
      range: preflopRange(hand.log, x),
      aggressive: hand.log.filter(e => e.t === 'action' && e.id === x && e.street !== 'preflop' && (e.action === 'bet' || e.action === 'raise')).length
    })),
    players: hand.order.length,
    behind,
    raisesThisStreet: streetLog.filter(e => e.action === 'raise' || e.action === 'bet').length,
    limpers: preflopActions.filter(e => e.action === 'call').length,
    preflopRaises: preflopActions.filter(e => e.action === 'raise').length,
    wasPreflopRaiser: preflopRaiser === id,
    isSmallBlind: table.seats[hand.sbSeat]?.id === id,
    isBigBlind: table.seats[hand.bbSeat]?.id === id
  };
}

export function decide(ctx, { style = 'solid', difficulty = 'normal', random = mathRandom } = {}) {
  const s = STYLES[style] || STYLES.solid;
  const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const { legal } = ctx;
  const check = { type: 'check' }, call = { type: 'call' }, fold = { type: 'fold' };
  const passive = legal.canCheck ? check : fold;
  const raiseTo = to => ({ type: 'raise', to: shapeRaise(to, legal, ctx.bigBlind) });
  const allIn = () => (legal.canRaise ? { type: 'raise', to: legal.maxRaiseTo } : legal.canCheck ? check : call);
  const bbs = (ctx.stack + legal.committed) / ctx.bigBlind;

  if (ctx.street === 'preflop') {
    const pct = preflopPercentile(ctx.hole[0], ctx.hole[1]);
    const n = ctx.players;
    const tableFactor = n <= 2 ? 2.1 : n === 3 ? 1.6 : n <= 5 ? 1.2 : 1;
    const posFactor = 1 - ctx.behind / Math.max(1, n - 1);
    const open = Math.min(0.92, s.loose * (0.72 + 0.6 * posFactor) * tableFactor * (1 + (random.float() - 0.5) * d.noise * 2));

    // 短码：只推或弃
    if (bbs <= 12) {
      const push = Math.min(0.75, Math.max(0.06, open * (13 / Math.max(2, bbs)) * 0.55));
      if (pct <= push) return allIn();
      if (!legal.canCheck && legal.toCall <= ctx.bigBlind * 0.5 && pct <= push * 1.6) return call;
      return passive;
    }
    if (ctx.preflopRaises === 0) {
      if (legal.canRaise && (pct <= open * 0.55 || (pct <= open && random.float() < 0.3 + s.aggression * 0.45))) {
        return raiseTo(ctx.bigBlind * between(random, 2.3, 3.1) + ctx.limpers * ctx.bigBlind);
      }
      if (legal.canCheck) return check;
      if (pct <= open * 1.25 && random.float() < 0.65 - s.aggression * 0.45) return call;
      if (ctx.isSmallBlind && legal.toCall <= ctx.bigBlind / 2 && pct <= open * 1.6) return call;
      return fold;
    }
    const facing = legal.toCall / ctx.bigBlind;
    const tighten = Math.pow(0.45, ctx.preflopRaises - 1);
    const threeBet = open * 0.22 * tighten;
    let callRange = open * 0.6 * tighten * (facing <= 3 ? 1.25 : facing > 10 ? 0.6 : 1) + s.sticky;
    const cheap = legal.toCall <= ctx.pot * 0.22;
    if (legal.canRaise && pct <= threeBet) {
      const target = legal.currentBet * between(random, 2.7, 3.4);
      return target >= (ctx.stack + legal.committed) * 0.4 ? allIn() : raiseTo(target);
    }
    if (legal.toCall >= ctx.stack * 0.5) callRange *= 0.6;  // 跟注就基本投入全部筹码：要更强
    if (pct <= callRange || (cheap && pct <= open * 1.4)) return legal.canCheck ? check : call;
    return passive;
  }

  // 翻牌后
  const opponents = ctx.opponents.length;
  const ranges = d.ranges
    ? ctx.opponents.map(o => Math.max(0.03, o.range * Math.pow(0.72, Math.min(3, o.aggressive))))
    : null;
  const { equity } = estimateEquity({ hole: ctx.hole, board: ctx.board, opponents, ranges, iterations: d.iterations, random });
  const eq = equity + (random.float() - 0.5) * d.noise * 2;
  const pot = ctx.pot;

  if (legal.canCheck) {
    const valueLine = 0.56 + 0.06 * (opponents - 1);
    if (eq > valueLine + 0.25 && random.float() < s.trap) return check;  // 慢打
    if (legal.canRaise && eq > valueLine && random.float() < 0.45 + s.aggression * 0.5) {
      return raiseTo(legal.currentBet + pot * (eq > 0.8 ? between(random, 0.6, 0.95) : between(random, 0.45, 0.7)));
    }
    if (legal.canRaise && ctx.wasPreflopRaiser && ctx.street === 'flop' && opponents <= 2 && random.float() < s.aggression * 0.55) {
      return raiseTo(pot * between(random, 0.33, 0.55));  // 持续下注
    }
    if (legal.canRaise && opponents === 1 && eq < 0.32 && random.float() < s.bluff) {
      return raiseTo(pot * between(random, 0.5, 0.75));  // 诈唬
    }
    return check;
  }

  const potOdds = legal.toCall / (pot + legal.toCall);
  const required = potOdds + 0.03 - s.sticky + (ctx.raisesThisStreet >= 2 ? 0.05 : 0) + (legal.toCall > pot * 0.75 ? 0.03 : 0);
  const raiseLine = 0.7 + 0.05 * (opponents - 1);
  if (legal.canRaise && eq > raiseLine && random.float() < 0.35 + s.aggression * 0.6) {
    const target = legal.currentBet + (pot + legal.toCall) * between(random, 0.6, 1.0);
    return target >= (ctx.stack + legal.committed) * 0.6 ? allIn() : raiseTo(target);
  }
  if (legal.toCall >= ctx.stack * 0.7) return eq >= potOdds - 0.01 ? call : fold;  // 跟就是全下：按赔率
  if (eq >= required) return call;
  if (legal.canRaise && opponents === 1 && ctx.street !== 'river' && random.float() < s.bluff * 0.3) {
    return raiseTo(legal.minRaiseTo + pot * 0.3);
  }
  return fold;
}

/** 给 AI 起名字和分配风格（中英文都能读的名字） */
export const BOT_NAMES = ['Mika', 'Leo', 'Nova', 'Kai', 'Iris', 'Theo', 'Luna', 'Ray', 'Juno', 'Milo'];

export function makeBots(count, difficulty = 'normal', random = mathRandom, taken = []) {
  const d = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  const names = BOT_NAMES.filter(name => !taken.includes(name));
  for (let i = names.length - 1; i > 0; i--) {
    const j = random.int(i + 1);
    [names[i], names[j]] = [names[j], names[i]];
  }
  return Array.from({ length: count }, (_, i) => ({ name: names[i % names.length], style: d.styles[i % d.styles.length], difficulty }));
}

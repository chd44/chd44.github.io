import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCards, seededRandom, freshDeck, shuffle } from '../holdem/js/cards.js';
import { evaluate, categoryOf, CATEGORIES, bestFive, scoreRanks } from '../holdem/js/evaluator.js';
import { HoldemTable, buildPots } from '../holdem/js/engine.js';
import { handLabel, preflopEquity, preflopPercentile } from '../holdem/js/preflop.js';
import { estimateEquity } from '../holdem/js/equity.js';

// 独立写的「笨办法」比牌：五张牌按点数分组排序，七张牌取 21 种组合里最大的。用来核对快的那个。
function oracle5(cards) {
  const ranks = cards.map(c => c >> 2).sort((a, b) => b - a);
  const flush = cards.every(c => (c & 3) === (cards[0] & 3));
  let straight = -1;
  if (new Set(ranks).size === 5) {
    if (ranks[0] - ranks[4] === 4) straight = ranks[0];
    else if (ranks.join() === '12,3,2,1,0') straight = 3;
  }
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.entries(counts).map(([r, c]) => [c, Number(r)]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const shape = groups.map(g => g[0]).join('');
  let category;
  if (straight >= 0 && flush) category = 8;
  else if (shape === '41') category = 7;
  else if (shape === '32') category = 6;
  else if (flush) category = 5;
  else if (straight >= 0) category = 4;
  else if (shape === '311') category = 3;
  else if (shape === '221') category = 2;
  else if (shape === '2111') category = 1;
  else category = 0;
  return [category, ...(category === 8 || category === 4 ? [straight] : groups.map(g => g[1]))];
}
const compare = (a, b) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? -1) !== (b[i] ?? -1)) return (a[i] ?? -1) - (b[i] ?? -1);
  return 0;
};
function oracle7(cards) {
  let best = null;
  for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) {
    const five = cards.filter((_, i) => i !== a && i !== b);
    const value = oracle5(five);
    if (!best || compare(value, best) > 0) best = value;
  }
  return best;
}
const score = text => evaluate(parseCards(text));

// Catches category mistakes anywhere in the fast evaluator: every five-card hand, against the known totals.
test('every 5-card hand lands in the right category, with 7462 distinct strengths', () => {
  const counts = new Array(9).fill(0);
  const distinct = new Set();
  const hand = new Array(5);
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) for (let c = b + 1; c < 52; c++) for (let d = c + 1; d < 52; d++) {
    for (let e = d + 1; e < 52; e++) {
      hand[0] = a; hand[1] = b; hand[2] = c; hand[3] = d; hand[4] = e;
      const s = evaluate(hand, 5);
      counts[categoryOf(s)]++;
      distinct.add(s);
    }
  }
  assert.deepEqual(Object.fromEntries(CATEGORIES.map((name, i) => [name, counts[i]])), {
    highCard: 1302540, pair: 1098240, twoPair: 123552, trips: 54912, straight: 10200,
    flush: 5108, fullHouse: 3744, quads: 624, straightFlush: 40
  });
  assert.equal(distinct.size, 7462);
});

// Catches kicker and best-five selection errors in 7-card hands that the 5-card totals cannot see.
test('7-card hands order exactly like a brute-force best-of-21 comparison', () => {
  const random = seededRandom(7);
  for (let i = 0; i < 4000; i++) {
    const deck = shuffle(freshDeck(), random);
    const a = deck.slice(0, 7), b = deck.slice(7, 14);
    const fast = Math.sign(evaluate(a) - evaluate(b));
    const slow = Math.sign(compare(oracle7(a), oracle7(b)));
    assert.equal(fast, slow, `${a} vs ${b}`);
    assert.equal(categoryOf(evaluate(a)), oracle7(a)[0]);
  }
});

test('edge cases: wheel, steel wheel, two trips, three pairs, board plays', () => {
  assert.ok(score('Ah 2c 3d 4s 5h 9c Kd') < score('2c 3d 4s 5h 6d 9c Kd'), 'wheel is the lowest straight');
  assert.equal(categoryOf(score('Ah 2h 3h 4h 5h 9c Kd')), 8);
  assert.deepEqual(scoreRanks(score('Ah 2h 3h 4h 5h 9c Kd')), [3]);
  assert.equal(categoryOf(score('Kh Kd Kc 9s 9h 9d 2c')), 6, 'two sets make a full house');
  assert.deepEqual(scoreRanks(score('Kh Kd Kc 9s 9h 9d 2c')), [11, 7]);
  assert.deepEqual(scoreRanks(score('Ah Ad 9s 9h 4d 4c Kc')), [12, 7, 11], 'third pair can lose to a higher kicker');
  assert.equal(score('3s 4d 2h 2d 2c 2s Kh'), score('5s 6d 2h 2d 2c 2s Kh'), 'quads on board: the board K plays as kicker, so it is a chop');
  assert.ok(score('As 4d 2h 2d 2c 2s Kh') > score('5s 6d 2h 2d 2c 2s Kh'), 'an ace in hand beats the board kicker');
  assert.ok(score('2h 3h 9h Th Jh As Ks') > score('9c Tc Js Qd Kd 2s 3s'), 'flush beats straight');
  const best = bestFive(parseCards('Ah Kh Qh Jh 9c Th 2d'));
  assert.equal(categoryOf(best.score), 8);
  assert.deepEqual(best.cards.sort((x, y) => x - y), parseCards('Ah Kh Qh Jh Th').sort((x, y) => x - y));
});

test('preflop table and Monte Carlo equity agree with well-known numbers', () => {
  const [a, b] = parseCards('As Ah');
  assert.equal(handLabel(a, b), 'AA');
  assert.ok(Math.abs(preflopEquity(a, b) - 0.852) < 0.006);
  assert.ok(preflopPercentile(a, b) < 0.005);
  assert.ok(preflopPercentile(...parseCards('7c 2d')) > 0.9);
  assert.equal(handLabel(...parseCards('Kd As')), 'AKo');
  assert.equal(handLabel(...parseCards('9s Ts')), 'T9s');
  const random = seededRandom(11);
  const aa = estimateEquity({ hole: [a, b], opponents: 1, iterations: 20000, random });
  assert.ok(Math.abs(aa.equity - 0.852) < 0.012, 'AA vs one random hand ≈ 85%: ' + aa.equity);
  // Nut flush draw + overcards on the flop vs one random hand
  const draw = estimateEquity({ hole: parseCards('Ah Kh'), board: parseCards('7h 2h 9c'), opponents: 1, iterations: 20000, random });
  assert.ok(draw.equity > 0.6 && draw.equity < 0.75, 'AhKh on 7h2h9c ≈ 67%: ' + draw.equity);
  // Narrow ranges make a medium hand weaker
  const wide = estimateEquity({ hole: parseCards('Jc Td'), opponents: 2, iterations: 12000, random }).equity;
  const tight = estimateEquity({ hole: parseCards('Jc Td'), opponents: 2, ranges: [0.1, 0.1], iterations: 12000, random }).equity;
  assert.ok(tight < wide - 0.05, `vs tight ranges ${tight} < vs any ${wide}`);
});

// ---- engine helpers ----
function table(stacks, { sb = 10, bb = 20, button = null } = {}) {
  const t = new HoldemTable({ smallBlind: sb, bigBlind: bb, random: seededRandom(1) });
  stacks.forEach((stack, i) => t.addPlayer({ id: 'p' + i, name: 'P' + i, stack }));
  t.buttonSeat = button === null ? stacks.length - 1 : button - 1;  // 下一手的按钮落在 button（默认 p0）
  return t;
}
/** 按发牌顺序（先每人一张、再每人一张、烧一张、翻牌三张、烧、转牌、烧、河牌）摆好牌 */
function deck(draws) {
  const order = parseCards(draws);
  const rest = freshDeck().filter(c => !order.includes(c));
  return rest.concat(order.slice().reverse());
}
const total = t => t.players.reduce((sum, p) => sum + p.stack, 0) + (t.hand && t.hand.phase !== 'complete' ? t.totalPot() : 0);

test('heads-up: the button posts the small blind, acts first preflop and last after the flop', () => {
  const t = table([1000, 1000]);
  t.startHand();
  const h = t.hand;
  assert.equal(h.buttonSeat, 0);
  assert.equal(h.sbSeat, 0);
  assert.equal(h.bbSeat, 1);
  assert.equal(h.toAct, 'p0');
  assert.deepEqual(t.legalActions('p0'), { toCall: 10, canCheck: false, callAmount: 10, canRaise: true, minRaiseTo: 40, maxRaiseTo: 1000, currentBet: 20, committed: 10, stack: 990, isOpening: false });
  t.act('p0', { type: 'call' });
  assert.equal(h.toAct, 'p1', 'big blind gets the option');
  assert.equal(t.legalActions('p1').canCheck, true);
  t.act('p1', { type: 'check' });
  assert.equal(h.street, 'flop');
  assert.equal(h.toAct, 'p1', 'big blind acts first after the flop');
});

test('three-handed: blinds rotate, the button is first to act preflop, the big blind keeps its option', () => {
  const t = table([1000, 1000, 1000]);
  t.startHand();
  assert.deepEqual([t.hand.buttonSeat, t.hand.sbSeat, t.hand.bbSeat, t.hand.toAct], [0, 1, 2, 'p0']);
  t.act('p0', { type: 'call' });
  t.act('p1', { type: 'call' });
  assert.equal(t.hand.toAct, 'p2');
  assert.equal(t.legalActions('p2').canRaise, true);
  t.act('p2', { type: 'raise', to: 60 });
  assert.equal(t.hand.toAct, 'p0', 'a raise from the big blind reopens the action');
  t.act('p0', { type: 'fold' });
  t.act('p1', { type: 'call' });
  assert.equal(t.hand.street, 'flop');
  assert.equal(t.hand.toAct, 'p1', 'first live player left of the button acts first');
  t.act('p1', { type: 'fold' });
  assert.equal(t.hand.phase, 'complete');
  assert.deepEqual(t.players.map(p => p.stack), [980, 940, 1080]);
  t.startHand();
  assert.deepEqual([t.hand.buttonSeat, t.hand.sbSeat, t.hand.bbSeat], [1, 2, 0]);
});

test('minimum raise is the size of the last full bet or raise', () => {
  const t = table([5000, 5000, 5000]);
  t.startHand();
  t.act('p0', { type: 'call' }); t.act('p1', { type: 'call' }); t.act('p2', { type: 'check' });
  t.act('p1', { type: 'raise', to: 100 });          // bet 100
  assert.equal(t.legalActions('p2').minRaiseTo, 200);
  assert.throws(() => t.act('p2', { type: 'raise', to: 150 }), /between 200/);
  t.act('p2', { type: 'raise', to: 350 });          // raise by 250
  assert.equal(t.legalActions('p0').minRaiseTo, 600);
  assert.equal(t.hand.log.at(-1).action, 'raise');
  assert.equal(t.hand.log.at(-2).action, 'bet');
});

// Catches the classic bug of letting a player re-raise after a short all-in that was not a full raise.
test('a short all-in does not reopen betting for someone who already acted', () => {
  const t = table([5000, 5000, 5000, 170]);
  t.startHand();                                   // button p0, sb p1, bb p2, p3 first
  t.act('p3', { type: 'call' }); t.act('p0', { type: 'call' }); t.act('p1', { type: 'call' }); t.act('p2', { type: 'check' });
  assert.equal(t.hand.street, 'flop');
  t.act('p1', { type: 'raise', to: 100 });          // p1 bets 100
  t.act('p2', { type: 'call' });
  t.act('p3', { type: 'allin' });                   // p3 all-in for 150 in total: +50, not a full raise
  assert.equal(t.hand.currentBet, 150);
  const fresh = t.legalActions('p0');               // p0 has not acted on this street: may raise
  assert.equal(fresh.canRaise, true);
  assert.equal(fresh.minRaiseTo, 250);
  t.act('p0', { type: 'call' });
  const back = t.legalActions('p1');                // p1 bet and faces only +50: call or fold
  assert.equal(back.canRaise, false);
  assert.equal(back.callAmount, 50);
  assert.throws(() => t.act('p1', { type: 'raise', to: 400 }), /Cannot raise/);
  t.act('p1', { type: 'call' });
  t.act('p2', { type: 'call' });
  assert.equal(t.hand.street, 'turn');
});

test('two short all-ins that add up to a full raise do reopen the betting', () => {
  const t = table([5000, 5000, 170, 240]);
  t.startHand();                                   // button p0, sb p1, bb p2, p3 first
  t.act('p3', { type: 'call' }); t.act('p0', { type: 'call' }); t.act('p1', { type: 'call' }); t.act('p2', { type: 'check' });
  t.act('p1', { type: 'raise', to: 100 });
  t.act('p2', { type: 'allin' });                   // 150: +50
  t.act('p3', { type: 'allin' });                   // 220: +70, but p1 now faces +120 ≥ 100
  t.act('p0', { type: 'call' });
  const legal = t.legalActions('p1');
  assert.equal(legal.canRaise, true);
  assert.equal(legal.minRaiseTo, 320);
});

test('uncalled bets go back, folding around gives the big blind the blinds', () => {
  const t = table([1000, 1000, 1000]);
  t.startHand();
  t.act('p0', { type: 'raise', to: 500 });
  t.act('p1', { type: 'fold' });
  t.act('p2', { type: 'fold' });
  assert.equal(t.hand.phase, 'complete');
  assert.deepEqual(t.players.map(p => p.stack), [1030, 990, 980]);
  assert.ok(t.hand.log.some(e => e.t === 'uncalled' && e.id === 'p0' && e.amount === 480));
  assert.deepEqual(t.hand.result.net, { p0: 30, p1: -10, p2: -20 });
  t.startHand();                                   // button p1, sb p2, bb p0, p1 first
  t.act('p1', { type: 'fold' }); t.act('p2', { type: 'fold' });
  assert.deepEqual(t.players.map(p => p.stack), [1040, 990, 970]);
});

test('a short big blind still has to be called in full; the excess comes back', () => {
  const t = table([1000, 1000, 5]);
  t.startHand();                                   // bb p2 is all-in for 5
  assert.equal(t.hand.currentBet, 20);
  assert.equal(t.legalActions('p0').toCall, 20);
  t.act('p0', { type: 'call' }); t.act('p1', { type: 'call' });
  assert.equal(t.hand.street, 'flop');
  const pots = buildPots(t.hand.order.map(id => t.hand.players[id]));
  assert.deepEqual(pots, [{ amount: 15, eligible: ['p1', 'p2', 'p0'] }, { amount: 30, eligible: ['p1', 'p0'] }]);
});

// Catches side-pot leaks: three different all-in sizes, the shortest stack has the best hand, the other two split.
test('side pots, split pots and odd chips are paid to the right players', () => {
  const t = table([300, 700, 1000, 1000], { sb: 5, bb: 10 });
  // order after button p0: p1 (sb), p2 (bb), p3, p0
  t.startHand({ deck: deck('Kc Jc Jd As Ks Js Jh Ah  4s Qd Qh 9c  5s 7d  6s 2h') });
  // holes: p1 Kc Ks, p2 Jc Js, p3 Jd Jh, p0 As Ah — board Qd Qh 9c 7d 2h: p0 > p1 > p2 = p3
  t.act('p3', { type: 'raise', to: 1000 });
  t.act('p0', { type: 'allin' });
  t.act('p1', { type: 'allin' });
  t.act('p2', { type: 'allin' });
  while (t.hand.phase === 'runout') t.step();
  assert.equal(t.hand.phase, 'complete');
  assert.deepEqual(t.hand.board, parseCards('Qd Qh 9c 7d 2h'));
  const [main, side1, side2] = t.hand.result.pots;
  assert.deepEqual(main, { amount: 1200, eligible: ['p1', 'p2', 'p3', 'p0'], winners: [{ id: 'p0', amount: 1200 }], score: main.score });
  assert.deepEqual(side1.eligible, ['p1', 'p2', 'p3']);
  assert.equal(side1.amount, 1200);
  assert.deepEqual(side1.winners, [{ id: 'p1', amount: 1200 }]);
  assert.deepEqual(side2.winners, [{ id: 'p2', amount: 300 }, { id: 'p3', amount: 300 }]);
  assert.deepEqual(t.players.map(p => p.stack), [1200, 1200, 300, 300]);
});

test('an odd chip in a split pot goes to the first winner left of the button', () => {
  const t = table([1000, 1000, 1000], { sb: 5, bb: 10 });
  // order: p1 (sb), p2 (bb), p0 (button). Royal flush on the board: everyone still in chops
  t.startHand({ deck: deck('2c 3c 7d 2d 3d 8h  4s As Ks Qs  5s Js  6s Ts') });
  t.act('p0', { type: 'raise', to: 25 });
  t.act('p1', { type: 'call' }); t.act('p2', { type: 'call' });
  t.act('p1', { type: 'check' }); t.act('p2', { type: 'check' }); t.act('p0', { type: 'raise', to: 10 });
  t.act('p1', { type: 'call' }); t.act('p2', { type: 'call' });
  t.act('p1', { type: 'check' }); t.act('p2', { type: 'check' }); t.act('p0', { type: 'raise', to: 11 });
  t.act('p1', { type: 'call' }); t.act('p2', { type: 'fold' });
  t.act('p1', { type: 'check' }); t.act('p0', { type: 'check' });
  // board As Ks Qs Js Ts: royal flush on board, p1 and p0 chop 25*3 + 10*3 + 11*2 = 127
  const [pot] = t.hand.result.pots;
  assert.equal(pot.amount, 127);
  assert.deepEqual(pot.winners, [{ id: 'p1', amount: 64 }, { id: 'p0', amount: 63 }]);
});

// Catches any chip leak, stuck hand or illegal-state crash under arbitrary legal play.
test('random legal play never creates or loses chips and every hand finishes', () => {
  const random = seededRandom(2024);
  for (let session = 0; session < 40; session++) {
    const n = 2 + random.int(7);
    const t = new HoldemTable({ smallBlind: 5, bigBlind: 10, random });
    for (let i = 0; i < n; i++) t.addPlayer({ id: 'p' + i, name: 'P' + i, stack: 1 + random.int(800) });
    const chips = t.players.reduce((s, p) => s + p.stack, 0);
    for (let handNo = 0; handNo < 60 && t.canStartHand(); handNo++) {
      t.startHand();
      for (let steps = 0; t.hand.phase !== 'complete'; steps++) {
        assert.ok(steps < 500, 'hand did not finish');
        if (t.hand.phase === 'runout') { t.step(); continue; }
        const id = t.hand.toAct;
        const legal = t.legalActions(id);
        const roll = random.float();
        if (roll < 0.15) t.act(id, { type: 'fold' });
        else if (roll < 0.55) t.act(id, { type: legal.canCheck ? 'check' : 'call' });
        else if (legal.canRaise && roll < 0.9) {
          const to = legal.minRaiseTo + random.int(legal.maxRaiseTo - legal.minRaiseTo + 1);
          t.act(id, { type: 'raise', to });
        } else t.act(id, { type: 'allin' });
        assert.equal(total(t), chips);
      }
      assert.equal(total(t), chips);
      assert.ok(t.players.every(p => p.stack >= 0 && Number.isInteger(p.stack)));
      const net = Object.values(t.hand.result.net).reduce((a, b) => a + b, 0);
      assert.equal(net, 0);
    }
  }
});

test('an all-in before the flop runs the board out street by street', () => {
  const t = table([500, 500]);
  t.startHand();
  t.act('p0', { type: 'allin' });
  t.act('p1', { type: 'call' });
  assert.equal(t.hand.phase, 'runout');
  assert.equal(t.hand.board.length, 0);
  t.step(); assert.equal(t.hand.board.length, 3);
  t.step(); assert.equal(t.hand.board.length, 4);
  t.step(); assert.equal(t.hand.board.length, 5);
  t.step(); assert.equal(t.hand.phase, 'complete');
  assert.equal(t.players.reduce((s, p) => s + p.stack, 0), 1000);
});

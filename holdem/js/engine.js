// 无限注德州扑克的规则引擎。纯逻辑、不碰界面和网络，单人练习和好友房的房主都用它。
//
// 下注规则按常见的现金局规则（TDA）：
// - 最小加注额 = 本轮上一次完整下注或加注的增量，起始为大盲。
// - 全下不足一个完整加注时，不会给已经行动过的玩家重新打开加注；面对的总增量够一个完整加注才会。
//   做法：记下每个玩家上次行动时的下注线（acted），当前下注线比它高出至少一个最小加注额才能再加注。
// - 大盲短码全下时，其他人仍要跟到完整的大盲；多出来没人跟的部分在本轮结束时退回。
// - 单挑时按钮位下小盲、翻牌前先行动，翻牌后大盲先行动。
// 筹码都是整数。
import { freshDeck, shuffle, cryptoRandom } from './cards.js';
import { bestFive } from './evaluator.js';

export const STREETS = ['preflop', 'flop', 'turn', 'river'];

export class HoldemTable {
  constructor({ maxSeats = 8, smallBlind = 10, bigBlind = 20, random = cryptoRandom } = {}) {
    this.maxSeats = maxSeats;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.random = random;
    this.seats = new Array(maxSeats).fill(null);
    this.buttonSeat = -1;
    this.handNumber = 0;
    this.hand = null;
  }

  get players() { return this.seats.filter(Boolean); }

  player(id) { return this.seats.find(p => p && p.id === id) || null; }

  addPlayer({ id, name, stack, seat = null, ...meta }) {
    if (this.player(id)) throw new Error('Player already seated: ' + id);
    if (!Number.isInteger(stack) || stack < 0) throw new Error('Stack must be a non-negative integer');
    const index = seat ?? this.seats.findIndex(s => s === null);
    if (index < 0 || index >= this.maxSeats || this.seats[index]) throw new Error('No free seat');
    const player = { id, name, stack, seat: index, sittingOut: false, ...meta };
    this.seats[index] = player;
    return player;
  }

  /** 牌局进行中、还没弃牌的玩家不能直接离座：先弃牌（控制器负责） */
  removePlayer(id) {
    const player = this.player(id);
    if (!player) return null;
    const hp = this.hand?.players[id];
    if (hp && this.hand.phase !== 'complete' && !hp.folded) throw new Error('Player is still in the hand');
    this.seats[player.seat] = null;
    return player;
  }

  setBlinds(smallBlind, bigBlind) {
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
  }

  /** 从 seat 往后（顺时针）找第一个满足条件的玩家 */
  nextPlayer(seat, predicate) {
    for (let step = 1; step <= this.maxSeats; step++) {
      const player = this.seats[(seat + step + this.maxSeats) % this.maxSeats];
      if (player && predicate(player)) return player;
    }
    return null;
  }

  canStartHand() {
    return this.players.filter(p => p.stack > 0 && !p.sittingOut).length >= 2;
  }

  /** 开始新的一手。deck 只给测试用（指定牌序） */
  startHand({ deck = null } = {}) {
    if (this.hand && this.hand.phase !== 'complete') throw new Error('Hand in progress');
    const dealt = this.players.filter(p => p.stack > 0 && !p.sittingOut);
    if (dealt.length < 2) throw new Error('Need at least two players with chips');
    const inHand = new Set(dealt.map(p => p.id));
    const eligible = p => inHand.has(p.id);

    const start = this.buttonSeat < 0 ? dealt[this.random.int(dealt.length)].seat - 1 : this.buttonSeat;
    this.buttonSeat = this.nextPlayer(start, eligible).seat;
    const button = this.seats[this.buttonSeat];
    const headsUp = dealt.length === 2;
    const sb = headsUp ? button : this.nextPlayer(button.seat, eligible);
    const bb = this.nextPlayer(sb.seat, eligible);

    this.handNumber += 1;
    const hand = {
      number: this.handNumber,
      phase: 'betting',
      street: 'preflop',
      buttonSeat: button.seat,
      sbSeat: sb.seat,
      bbSeat: bb.seat,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      deck: deck ? deck.slice() : shuffle(freshDeck(), this.random),
      board: [],
      currentBet: 0,
      minRaise: this.bigBlind,
      toAct: null,
      players: {},
      order: [],
      log: [],
      result: null
    };
    this.hand = hand;
    for (let step = 1; step <= this.maxSeats; step++) {
      const p = this.seats[(button.seat + step) % this.maxSeats];
      if (!p || !inHand.has(p.id)) continue;
      hand.order.push(p.id);
      hand.players[p.id] = {
        id: p.id, seat: p.seat, startStack: p.stack, committed: 0, contributed: 0,
        folded: false, allIn: false, acted: null, hole: [], lastAction: null
      };
    }
    hand.log.push({
      t: 'hand', number: hand.number, button: button.seat, smallBlind: hand.smallBlind, bigBlind: hand.bigBlind,
      players: hand.order.map(id => ({ id, seat: hand.players[id].seat, stack: hand.players[id].startStack }))
    });

    this.postBlind(sb, hand.smallBlind, 'sb');
    this.postBlind(bb, hand.bigBlind, 'bb');
    hand.currentBet = hand.bigBlind;
    for (let round = 0; round < 2; round++) {
      for (const id of hand.order) hand.players[id].hole.push(hand.deck.pop());
    }
    this.moveTo(bb.seat);
    return hand;
  }

  postBlind(player, amount, kind) {
    const hp = this.hand.players[player.id];
    const paid = Math.min(amount, player.stack);
    this.commit(player, hp, paid);
    this.hand.log.push({ t: 'blind', id: player.id, kind, amount: paid, allIn: hp.allIn });
  }

  commit(player, hp, amount) {
    player.stack -= amount;
    hp.committed += amount;
    hp.contributed += amount;
    if (player.stack === 0) hp.allIn = true;
  }

  liveIds() { return this.hand.order.filter(id => !this.hand.players[id].folded); }

  /** 除了 id 以外还有几个人能行动（没弃牌、没全下） */
  othersAbleToAct(id) {
    let count = 0;
    for (const other of this.hand.order) {
      const hp = this.hand.players[other];
      if (other !== id && !hp.folded && !hp.allIn) count++;
    }
    return count;
  }

  needsToAct(hp) {
    if (hp.folded || hp.allIn) return false;
    if (hp.committed < this.hand.currentBet) return true;
    if (hp.acted !== null) return false;
    return this.othersAbleToAct(hp.id) > 0;
  }

  /** 从 seat 之后找下一个要行动的人；没有就结束这一轮 */
  moveTo(seat) {
    const hand = this.hand;
    const next = this.nextPlayer(seat, p => hand.players[p.id] && this.needsToAct(hand.players[p.id]));
    if (next) {
      hand.toAct = next.id;
      return;
    }
    hand.toAct = null;
    this.closeRound();
  }

  legalActions(id) {
    const hand = this.hand;
    if (!hand || hand.phase !== 'betting' || hand.toAct !== id) return null;
    const hp = hand.players[id];
    const stack = this.player(id).stack;
    const toCall = Math.max(0, hand.currentBet - hp.committed);
    const maxRaiseTo = hp.committed + stack;
    const reopened = hp.acted === null || hand.currentBet - hp.acted >= hand.minRaise;
    const canRaise = stack > toCall && reopened && this.othersAbleToAct(id) > 0;
    return {
      toCall,
      canCheck: toCall === 0,
      callAmount: Math.min(toCall, stack),
      canRaise,
      minRaiseTo: Math.min(maxRaiseTo, hand.currentBet + hand.minRaise),
      maxRaiseTo,
      currentBet: hand.currentBet,
      committed: hp.committed,
      stack,
      isOpening: hand.currentBet === 0
    };
  }

  /** action: { type: 'fold' | 'check' | 'call' | 'raise' | 'allin', to?: 本轮总下注额 } */
  act(id, action) {
    const legal = this.legalActions(id);
    if (!legal) throw new Error('Not your turn');
    const hand = this.hand;
    const hp = hand.players[id];
    const player = this.player(id);
    let type = action?.type;
    let to = action?.to;
    if (type === 'allin') {
      if (legal.canRaise && legal.maxRaiseTo > hand.currentBet) {
        type = 'raise';
        to = legal.maxRaiseTo;
      } else type = legal.canCheck ? 'check' : 'call';
    }
    const entry = { t: 'action', id, street: hand.street };
    if (type === 'fold') {
      hp.folded = true;
      entry.action = 'fold';
    } else if (type === 'check') {
      if (!legal.canCheck) throw new Error('Cannot check');
      hp.acted = hand.currentBet;
      entry.action = 'check';
    } else if (type === 'call') {
      if (legal.canCheck) throw new Error('Nothing to call');
      this.commit(player, hp, legal.callAmount);
      hp.acted = hand.currentBet;
      Object.assign(entry, { action: 'call', amount: legal.callAmount, to: hp.committed });
    } else if (type === 'raise') {
      if (!legal.canRaise) throw new Error('Cannot raise');
      if (!Number.isInteger(to)) throw new Error('Raise amount must be an integer');
      const allIn = to === legal.maxRaiseTo;
      if (to > legal.maxRaiseTo || to <= hand.currentBet || (!allIn && to < legal.minRaiseTo)) {
        throw new Error(`Raise must be between ${legal.minRaiseTo} and ${legal.maxRaiseTo}`);
      }
      const increment = to - hand.currentBet;
      const amount = to - hp.committed;
      this.commit(player, hp, amount);
      if (increment >= hand.minRaise) hand.minRaise = increment;
      Object.assign(entry, { action: legal.isOpening ? 'bet' : 'raise', amount, to });
      hand.currentBet = to;
      hp.acted = to;
    } else {
      throw new Error('Unknown action: ' + type);
    }
    entry.allIn = hp.allIn;
    hp.lastAction = entry.action;
    hand.log.push(entry);

    if (this.liveIds().length === 1) {
      this.finishByFold();
      return;
    }
    this.moveTo(hp.seat);
  }

  /** 本轮下得最多的人比第二多的多出来的部分没人跟，退回去 */
  refundUncalled() {
    const hand = this.hand;
    const list = hand.order.map(id => hand.players[id]).sort((a, b) => b.committed - a.committed);
    const top = list[0];
    const second = list[1] ? list[1].committed : 0;
    if (top && top.committed > second) {
      const refund = top.committed - second;
      top.committed -= refund;
      top.contributed -= refund;
      const player = this.player(top.id);
      player.stack += refund;
      if (player.stack > 0) top.allIn = false;
      hand.log.push({ t: 'uncalled', id: top.id, amount: refund });
    }
  }

  closeRound() {
    const hand = this.hand;
    this.refundUncalled();
    for (const id of hand.order) {
      hand.players[id].committed = 0;
      hand.players[id].acted = null;
    }
    hand.currentBet = 0;
    hand.minRaise = hand.bigBlind;
    hand.toAct = null;
    if (hand.street === 'river') {
      this.showdown();
      return;
    }
    const ableToAct = this.liveIds().filter(id => !hand.players[id].allIn);
    if (ableToAct.length <= 1) {
      hand.phase = 'runout';  // 没人能再下注了：由控制器一条街一条街地发完（step）
      return;
    }
    this.dealStreet();
    this.moveTo(hand.buttonSeat);
  }

  dealStreet() {
    const hand = this.hand;
    const next = STREETS[STREETS.indexOf(hand.street) + 1];
    hand.deck.pop();  // 烧一张
    const count = next === 'flop' ? 3 : 1;
    const cards = [];
    for (let i = 0; i < count; i++) cards.push(hand.deck.pop());
    hand.board.push(...cards);
    hand.street = next;
    for (const id of hand.order) hand.players[id].lastAction = null;
    hand.log.push({ t: 'street', street: next, cards, board: hand.board.slice() });
  }

  /** 全下之后发下一条街；发完河牌再调一次就摊牌 */
  step() {
    const hand = this.hand;
    if (!hand || hand.phase !== 'runout') throw new Error('Nothing to run out');
    if (hand.street === 'river') this.showdown();
    else this.dealStreet();
  }

  finishByFold() {
    const hand = this.hand;
    this.refundUncalled();
    const [winnerId] = this.liveIds();
    const amount = hand.order.reduce((sum, id) => sum + hand.players[id].contributed, 0);
    this.player(winnerId).stack += amount;
    for (const id of hand.order) hand.players[id].committed = 0;
    hand.toAct = null;
    hand.phase = 'complete';
    hand.result = { byFold: true, pots: [{ amount, eligible: [winnerId], winners: [{ id: winnerId, amount }] }], hands: {} };
    hand.log.push({ t: 'award', pot: 0, amount, winners: [{ id: winnerId, amount }], byFold: true });
    this.finishResult();
  }

  showdown() {
    const hand = this.hand;
    hand.street = 'showdown';
    hand.toAct = null;
    const live = this.liveIds();
    const hands = {};
    for (const id of live) {
      const cards = hand.players[id].hole.concat(hand.board);
      const best = bestFive(cards);
      hands[id] = { hole: hand.players[id].hole.slice(), score: best.score, best: best.cards };
    }
    hand.log.push({ t: 'showdown', hands: Object.fromEntries(live.map(id => [id, { hole: hands[id].hole, score: hands[id].score }])) });

    const pots = buildPots(hand.order.map(id => hand.players[id]));
    pots.forEach((pot, index) => {
      const top = Math.max(...pot.eligible.map(id => hands[id].score));
      // 分池按位置排：从按钮左边开始，余下的零头先给前面的人
      const winners = hand.order.filter(id => pot.eligible.includes(id) && hands[id].score === top);
      const share = Math.floor(pot.amount / winners.length);
      let odd = pot.amount - share * winners.length;
      pot.winners = winners.map(id => {
        const amount = share + (odd > 0 ? 1 : 0);
        if (odd > 0) odd--;
        this.player(id).stack += amount;
        return { id, amount };
      });
      pot.score = top;
      hand.log.push({ t: 'award', pot: index, amount: pot.amount, winners: pot.winners, score: top });
    });
    hand.result = { byFold: false, pots, hands };
    hand.phase = 'complete';
    this.finishResult();
  }

  finishResult() {
    const hand = this.hand;
    hand.result.net = Object.fromEntries(hand.order.map(id => [id, this.player(id).stack - hand.players[id].startStack]));
    hand.log.push({ t: 'end', net: hand.result.net });
  }

  /** 底池：已经收进去的（不含本轮还摆在面前的下注） */
  collectedPot() {
    if (!this.hand) return 0;
    return this.hand.order.reduce((sum, id) => sum + this.hand.players[id].contributed - this.hand.players[id].committed, 0);
  }

  totalPot() {
    if (!this.hand) return 0;
    return this.hand.order.reduce((sum, id) => sum + this.hand.players[id].contributed, 0);
  }
}

/**
 * 按每人投入的总额分出主池和边池。players: [{ id, contributed, folded }]
 * 弃牌的人投入的筹码照样进池，但不能赢。返回 [{ amount, eligible: [id] }]，eligible 按传入顺序。
 */
export function buildPots(players) {
  const left = new Map(players.map(p => [p.id, p.contributed]));
  const pots = [];
  for (;;) {
    const live = players.filter(p => !p.folded && left.get(p.id) > 0);
    if (!live.length) break;
    const level = Math.min(...live.map(p => left.get(p.id)));
    let amount = 0;
    for (const p of players) {
      const take = Math.min(level, left.get(p.id));
      amount += take;
      left.set(p.id, left.get(p.id) - take);
    }
    const eligible = live.map(p => p.id);
    const last = pots[pots.length - 1];
    if (last && last.eligible.length === eligible.length && last.eligible.every((id, i) => id === eligible[i])) last.amount += amount;
    else pots.push({ amount, eligible });
  }
  // 弃牌的人比所有还在的人投得都多（正常情况下退还未跟注部分后不会发生）：归到最后一个池
  const rest = [...left.values()].reduce((a, b) => a + b, 0);
  if (rest > 0 && pots.length) pots[pots.length - 1].amount += rest;
  return pots;
}

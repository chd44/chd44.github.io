// 给某一个玩家看的牌桌状态（JSON，可以直接发给好友房里的其他人）。
// 只放这个玩家该看到的东西：别人的底牌只在全下摊牌和最后摊牌时出现，弃掉的牌永远不给。
// 单人练习和好友房的每个人都用同一个函数生成画面数据，所以界面只认这一种格式。
import { categoryOf, scoreRanks } from './evaluator.js';

export const HIDDEN = -1;

export function buildView(table, viewerId, extra = {}) {
  const hand = table.hand;
  const phase = hand ? hand.phase : 'idle';
  const reveal = hand && (phase === 'runout' || (phase === 'complete' && !hand.result.byFold));
  const players = table.players.map(p => {
    const hp = hand?.players[p.id];
    let cards = null;
    if (hp) {
      if (p.id === viewerId) cards = hp.hole.slice();
      else if (!hp.folded) cards = reveal ? hp.hole.slice() : [HIDDEN, HIDDEN];
    }
    return {
      id: p.id,
      name: p.name,
      seat: p.seat,
      stack: p.stack,
      kind: p.kind || 'human',
      style: p.kind === 'bot' ? p.style : undefined,
      connected: p.connected !== false,
      sittingOut: !!p.sittingOut,
      eliminated: !!p.eliminated,
      leaving: !!p.leaving,
      inHand: !!hp,
      folded: !!hp?.folded,
      allIn: !!hp?.allIn,
      committed: hp ? hp.committed : 0,
      lastAction: hp ? hp.lastAction : null,
      cards,
      net: phase === 'complete' && hp ? hand.result.net[p.id] : undefined
    };
  });

  const view = {
    v: 1,
    you: viewerId,
    handNumber: hand ? hand.number : 0,
    phase,
    street: hand ? hand.street : null,
    board: hand ? hand.board.slice() : [],
    buttonSeat: hand ? hand.buttonSeat : table.buttonSeat,
    sbSeat: hand ? hand.sbSeat : -1,
    bbSeat: hand ? hand.bbSeat : -1,
    blinds: hand ? { sb: hand.smallBlind, bb: hand.bigBlind } : { sb: table.smallBlind, bb: table.bigBlind },
    nextBlinds: { sb: table.smallBlind, bb: table.bigBlind },
    pot: table.collectedPot(),
    totalPot: table.totalPot(),
    toAct: hand && phase === 'betting' ? hand.toAct : null,
    legal: hand && phase === 'betting' && hand.toAct === viewerId ? table.legalActions(viewerId) : null,
    maxSeats: table.maxSeats,
    players,
    log: hand ? publicLog(hand.log) : [],
    result: null,
    ...extra
  };

  if (phase === 'complete') {
    const result = hand.result;
    const hands = {};
    if (!result.byFold) {
      for (const [id, info] of Object.entries(result.hands)) {
        hands[id] = { hole: info.hole, best: info.best, category: categoryOf(info.score), ranks: scoreRanks(info.score), score: info.score };
      }
    }
    view.result = {
      byFold: result.byFold,
      pots: result.pots.map(pot => ({
        amount: pot.amount,
        eligible: pot.eligible,
        winners: pot.winners,
        category: pot.score === undefined ? null : categoryOf(pot.score),
        ranks: pot.score === undefined ? null : scoreRanks(pot.score)
      })),
      hands,
      net: result.net
    };
  }
  return view;
}

/** 牌局记录里公开的部分：引擎的记录本来就不含底牌（摊牌时亮的牌除外），这里只是复制一份 */
function publicLog(log) {
  return log.map(entry => (entry.t === 'showdown'
    ? { t: 'showdown', hands: Object.fromEntries(Object.entries(entry.hands).map(([id, h]) => [id, { hole: h.hole.slice(), score: h.score }])) }
    : { ...entry }));
}

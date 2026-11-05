// 把一份 view（见 view.js）画到牌桌上。好友房里 view 是从房主那里收到的，按不可信数据处理：
// 名字一律用 textContent，数字和牌先校验再用。
import { t, chips, cardName, handName, styleName, describeEvent, rankText, suitGlyph } from './i18n.js';
import { HIDDEN } from './view.js';
import { rankOf, suitOf, isCard } from './cards.js';
import { estimateEquity } from './equity.js';
import { preflopEquity, preflopPercentile, handLabel } from './preflop.js';
import { evaluate, categoryOf, scoreRanks } from './evaluator.js';
import { preflopRange } from './ai.js';

const $ = id => document.getElementById(id);
export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
// 只认真正的数字和字符串：JSON 里可以带 {"toString": 5} 这种对象，直接 String()/Number() 会抛错
const int = (value, fallback = 0) => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};
const str = (value, max = 40) => (typeof value === 'string' ? value : typeof value === 'number' && Number.isFinite(value) ? String(value) : '').slice(0, max);
const cardValue = value => (value === HIDDEN ? HIDDEN : isCard(value) ? value : null);

const STREET_NAMES = ['preflop', 'flop', 'turn', 'river'];
const ACTION_NAMES = ['fold', 'check', 'call', 'bet', 'raise'];
const STYLE_NAMES = ['tag', 'lag', 'station', 'rock', 'maniac', 'solid'];
const cards = (list, max) => (Array.isArray(list) ? list.slice(0, max).filter(isCard) : []);
const category = value => Math.min(8, Math.max(0, int(value)));
const ranks = list => (Array.isArray(list) ? list.slice(0, 5).map(r => Math.min(12, Math.max(0, int(r)))) : []);
const score = value => (Number.isInteger(value) && value >= 0 && value < (9 << 20) ? value : null);

/** 牌局记录里的一条：只认识的类型和字段，其余丢掉（房主发来的数据不可信） */
function sanitizeEvent(e) {
  if (!e || typeof e !== 'object') return null;
  switch (e.t) {
    case 'hand': return { t: 'hand', number: int(e.number), button: int(e.button, -1), smallBlind: int(e.smallBlind), bigBlind: int(e.bigBlind),
      players: Array.isArray(e.players) ? e.players.slice(0, 10).map(p => ({ id: str(p?.id), seat: int(p?.seat, -1), stack: int(p?.stack) })) : [] };
    case 'blind': return { t: 'blind', id: str(e.id), kind: e.kind === 'sb' ? 'sb' : 'bb', amount: int(e.amount), allIn: !!e.allIn };
    case 'action': return ACTION_NAMES.includes(e.action) && STREET_NAMES.includes(e.street)
      ? { t: 'action', id: str(e.id), street: e.street, action: e.action, amount: int(e.amount), to: int(e.to), allIn: !!e.allIn } : null;
    case 'street': return STREET_NAMES.includes(e.street) ? { t: 'street', street: e.street, cards: cards(e.cards, 3), board: cards(e.board, 5) } : null;
    case 'uncalled': return { t: 'uncalled', id: str(e.id), amount: int(e.amount) };
    case 'showdown': return { t: 'showdown', hands: Object.fromEntries(Object.entries(e.hands && typeof e.hands === 'object' ? e.hands : {}).slice(0, 10)
      .map(([id, h]) => [str(id), { hole: cards(h?.hole, 2), score: score(h?.score) }])) };
    case 'award': return { t: 'award', pot: int(e.pot), amount: int(e.amount), byFold: !!e.byFold,
      winners: Array.isArray(e.winners) ? e.winners.slice(0, 10).map(w => ({ id: str(w?.id), amount: int(w?.amount) })) : [] };
    case 'end': return { t: 'end' };
    default: return null;
  }
}

/** 收到的 view 先过一遍：类型不对的字段丢掉或改成安全值 */
export function sanitizeView(view) {
  if (!view || typeof view !== 'object') return null;
  const players = Array.isArray(view.players) ? view.players.slice(0, 10).map(p => ({
    id: str(p?.id), name: str(p?.name, 24), seat: int(p?.seat, -1), stack: Math.max(0, int(p?.stack)),
    kind: p?.kind === 'bot' ? 'bot' : 'human', style: STYLE_NAMES.includes(p?.style) ? p.style : undefined,
    connected: p?.connected !== false, sittingOut: !!p?.sittingOut, eliminated: !!p?.eliminated, leaving: !!p?.leaving, inHand: !!p?.inHand,
    folded: !!p?.folded, allIn: !!p?.allIn, committed: Math.max(0, int(p?.committed)), lastAction: ACTION_NAMES.includes(p?.lastAction) ? p.lastAction : null,
    cards: Array.isArray(p?.cards) ? p.cards.slice(0, 2).map(cardValue) : null,
    net: p?.net === undefined ? undefined : int(p.net)
  })) : [];
  const legal = view.legal && typeof view.legal === 'object' ? {
    toCall: int(view.legal.toCall), canCheck: !!view.legal.canCheck, callAmount: int(view.legal.callAmount), canRaise: !!view.legal.canRaise,
    minRaiseTo: int(view.legal.minRaiseTo), maxRaiseTo: int(view.legal.maxRaiseTo), currentBet: int(view.legal.currentBet),
    committed: int(view.legal.committed), stack: int(view.legal.stack), isOpening: !!view.legal.isOpening
  } : null;
  const result = view.result && typeof view.result === 'object' ? {
    byFold: !!view.result.byFold,
    pots: Array.isArray(view.result.pots) ? view.result.pots.slice(0, 10).map(pot => ({
      amount: int(pot?.amount), eligible: Array.isArray(pot?.eligible) ? pot.eligible.map(x => str(x)) : [],
      winners: Array.isArray(pot?.winners) ? pot.winners.slice(0, 10).map(w => ({ id: str(w?.id), amount: int(w?.amount) })) : [],
      category: pot?.category === null || pot?.category === undefined ? null : category(pot.category),
      ranks: pot?.category === null || pot?.category === undefined ? null : ranks(pot.ranks)
    })) : [],
    hands: Object.fromEntries(Object.entries(view.result.hands && typeof view.result.hands === 'object' ? view.result.hands : {}).slice(0, 10).map(([id, h]) => [str(id), {
      hole: Array.isArray(h?.hole) ? h.hole.slice(0, 2).map(cardValue) : [], best: Array.isArray(h?.best) ? h.best.slice(0, 5).map(cardValue) : [],
      category: category(h?.category), ranks: ranks(h?.ranks)
    }])),
    net: Object.fromEntries(Object.entries(view.result.net && typeof view.result.net === 'object' ? view.result.net : {}).slice(0, 10).map(([id, n]) => [str(id), int(n)]))
  } : null;
  const log = Array.isArray(view.log) ? view.log.slice(-200).map(sanitizeEvent).filter(Boolean) : [];
  const game = view.game && typeof view.game === 'object' ? view.game : {};
  return {
    you: str(view.you), handNumber: int(view.handNumber), phase: ['idle', 'betting', 'runout', 'complete'].includes(view.phase) ? view.phase : 'idle',
    street: typeof view.street === 'string' ? view.street : null,
    board: Array.isArray(view.board) ? view.board.slice(0, 5).map(cardValue).filter(c => c !== null && c !== HIDDEN) : [],
    buttonSeat: int(view.buttonSeat, -1), sbSeat: int(view.sbSeat, -1), bbSeat: int(view.bbSeat, -1),
    blinds: { sb: int(view.blinds?.sb), bb: int(view.blinds?.bb) }, nextBlinds: { sb: int(view.nextBlinds?.sb), bb: int(view.nextBlinds?.bb) },
    pot: int(view.pot), totalPot: int(view.totalPot), toAct: view.toAct ? str(view.toAct) : null, legal,
    maxSeats: Math.min(10, Math.max(2, int(view.maxSeats, 6))), players, log, result,
    turn: view.turn && typeof view.turn === 'object' ? { id: str(view.turn.id), remainingMs: Math.max(0, int(view.turn.remainingMs)), totalMs: Math.max(1, int(view.turn.totalMs, 30000)) } : null,
    game: {
      state: ['lobby', 'playing', 'waiting', 'over'].includes(game.state) ? game.state : 'playing',
      mode: game.mode === 'tournament' ? 'tournament' : 'cash', level: int(game.level, 1),
      handsToNextLevel: game.handsToNextLevel === null || game.handsToNextLevel === undefined ? null : int(game.handsToNextLevel),
      standings: Array.isArray(game.standings) ? game.standings.slice(0, 10).map(s => ({ id: str(s?.id), name: str(s?.name, 24), stack: int(s?.stack), place: int(s?.place) })) : null,
      canRebuy: !!game.canRebuy, away: !!game.away, startingStack: int(game.startingStack), turnSeconds: int(game.turnSeconds), helper: game.helper !== false
    },
    notices: Array.isArray(view.notices) ? view.notices.slice(0, 10) : []
  };
}

export function cardElement(card, extra = '') {
  if (card === null || card === undefined) {
    const slot = el('div', 'card slot ' + extra);
    slot.setAttribute('aria-hidden', 'true');
    return slot;
  }
  if (card === HIDDEN) {
    const back = el('div', 'card back ' + extra);
    back.setAttribute('aria-hidden', 'true');
    return back;
  }
  const suit = suitOf(card);
  const node = el('div', `card s${suit}${suit === 1 || suit === 2 ? ' red' : ''} ${extra}`);
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', cardName(card));
  node.dataset.card = String(card);
  node.append(el('span', 'rank', rankText(rankOf(card))), el('span', 'pip', suitGlyph(suit)), el('span', 'suit', suitGlyph(suit)));
  return node;
}

const hueFor = text => [...String(text)].reduce((h, c) => (h * 31 + c.codePointAt(0)) % 360, 17);

export class TableRenderer {
  constructor(handlers) {
    this.handlers = handlers;
    this.view = null;
    this.ctx = {};
    this.seatNodes = new Map();
    this.lastBoardKey = '';
    this.raiseOpen = false;
    this.helperKey = '';
    this.turnTimer = null;
    this.announced = '';
    this.bind();
  }

  bind() {
    $('act-fold').addEventListener('click', () => this.send({ type: 'fold' }));
    $('act-call').addEventListener('click', () => {
      const legal = this.view?.legal;
      if (legal) this.send({ type: legal.canCheck ? 'check' : 'call' });
    });
    $('act-raise').addEventListener('click', () => this.openRaise());
    $('raise-cancel').addEventListener('click', () => this.closeRaise());
    $('raise-go').addEventListener('click', () => this.confirmRaise());
    const slider = $('raise-slider'), input = $('raise-input');
    // 滑杆按 step 走格子，筹码不是格子整数倍时拉到头也到不了最大值：最后一格直接算全下
    slider.addEventListener('input', () => {
      input.value = Number(slider.value) + (Number(slider.step) || 1) > Number(slider.max) ? slider.max : slider.value;
      this.updateRaiseLabel();
    });
    input.addEventListener('input', () => { slider.value = input.value; this.updateRaiseLabel(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this.confirmRaise(); } });
    document.addEventListener('keydown', e => this.shortcut(e));
    window.addEventListener('resize', () => this.view && this.layoutSeats());
  }

  send(action) {
    if (!this.view?.legal) return;
    this.closeRaise();
    this.handlers.onAction(action, this.view.handNumber);
  }

  shortcut(e) {
    if (!this.view?.legal || e.altKey || e.ctrlKey || e.metaKey || $('screen-table').hidden) return;
    if (document.querySelector('dialog[open]')) return;
    const typing = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName) && document.activeElement.id !== 'raise-slider';
    if (e.key === 'Escape' && this.raiseOpen) { this.closeRaise(); return; }
    if (typing) return;
    const key = e.key.toLowerCase();
    if (key === 'f') this.send({ type: 'fold' });
    else if (key === 'c' || key === 'k') this.send({ type: this.view.legal.canCheck ? 'check' : 'call' });
    else if ((key === 'r' || key === 'b') && this.view.legal.canRaise) this.openRaise();
    else return;
    e.preventDefault();
  }

  render(raw, ctx) {
    const view = raw;
    this.view = view;
    this.ctx = ctx;
    document.body.classList.toggle('four', !!ctx.fourColor);
    if (!view) return;
    this.renderInfo();
    this.layoutSeats();
    this.renderBoard();
    this.renderActions();
    this.renderFeed();
    this.renderHelper();
    this.announce();
  }

  renderInfo() {
    const v = this.view;
    const info = $('table-info');
    info.replaceChildren();
    if (v.handNumber) info.append(el('strong', '', t('handNo', { n: v.handNumber })));
    info.append(el('span', '', t('blindsShort', { sb: chips(v.blinds.sb || v.nextBlinds.sb), bb: chips(v.blinds.bb || v.nextBlinds.bb) })));
    if (v.game.mode === 'tournament') {
      info.append(el('span', '', t('level', { n: v.game.level })));
      if (v.game.handsToNextLevel !== null) info.append(el('span', '', t('nextLevel', { n: v.game.handsToNextLevel })));
    }
  }

  /** 座位绕着椭圆排，自己永远在正下方 */
  layoutSeats() {
    const v = this.view;
    const container = $('seats');
    const n = v.maxSeats;
    const felt = $('felt');
    const portrait = felt.clientHeight > felt.clientWidth;
    const me = v.players.find(p => p.id === v.you);
    const heroSeat = me ? me.seat : 0;
    const bySeat = new Map(v.players.map(p => [p.seat, p]));
    const result = v.phase === 'complete' ? v.result : null;
    const winners = new Map();
    if (result) for (const pot of result.pots) for (const w of pot.winners) winners.set(w.id, (winners.get(w.id) || 0) + w.amount);
    const keep = new Set();

    for (let seat = 0; seat < n; seat++) {
      const index = (seat - heroSeat + n) % n;
      const angle = Math.PI / 2 + index * 2 * Math.PI / n;
      const rx = portrait ? 50 : 50.5, ry = portrait ? 50 : 52;
      const x = 50 + rx * Math.cos(angle), y = 50 + ry * Math.sin(angle);
      const player = bySeat.get(seat);
      const key = 'seat-' + seat;
      keep.add(key);
      let node = this.seatNodes.get(key);
      if (!node) {
        node = el('div', 'seat');
        node.innerHTML = '<div class="hole"></div><div class="plate"><div class="avatar"></div><div class="who"><span class="name"></span><span class="stack"></span><span class="meta"></span></div></div><div class="tag"></div>';
        container.append(node);
        this.seatNodes.set(key, node);
      }
      node.style.setProperty('--x', x + '%');
      node.style.setProperty('--y', y + '%');
      this.fillSeat(node, player, { seat, winners, result });

      // 面前的下注
      const betKey = 'bet-' + seat;
      let bet = this.seatNodes.get(betKey);
      const committed = player && v.phase !== 'complete' ? player.committed : 0;
      if (committed > 0) {
        keep.add(betKey);
        if (!bet) {
          bet = el('div', 'bet');
          container.append(bet);
          this.seatNodes.set(betKey, bet);
        }
        // 窄的竖屏牌桌上，两侧座位的下注要更靠中间，免得压到名牌
        const kx = portrait ? 0.42 : 0.6, ky = portrait ? 0.62 : 0.58;
        bet.style.setProperty('--x', 50 + rx * kx * Math.cos(angle) + '%');
        bet.style.setProperty('--y', 50 + ry * ky * Math.sin(angle) + (index === 0 ? -6 : 0) + '%');
        bet.textContent = chips(committed);
      }
    }
    for (const [key, node] of this.seatNodes) {
      if (!keep.has(key)) {
        node.remove();
        this.seatNodes.delete(key);
      }
    }
  }

  fillSeat(node, player, { seat, winners, result }) {
    const v = this.view;
    const [hole, plate, tag] = node.children;
    const avatar = plate.querySelector('.avatar'), name = plate.querySelector('.name'), stack = plate.querySelector('.stack'), meta = plate.querySelector('.meta');
    plate.querySelector('.badge')?.remove();
    plate.querySelector('.timer')?.remove();
    node.className = 'seat';
    if (!player) {
      node.classList.add('empty');
      hole.replaceChildren();
      avatar.textContent = '';
      avatar.style.removeProperty('--hue');
      name.textContent = t('emptySeat');
      stack.textContent = '';
      meta.textContent = '';
      tag.textContent = '';
      tag.className = 'tag';
      return;
    }
    const me = player.id === v.you;
    if (me) node.classList.add('me');
    if (player.folded) node.classList.add('folded');
    if (!player.inHand && v.phase !== 'idle') node.classList.add('out');
    if (v.toAct === player.id) node.classList.add('acting');
    if (winners.has(player.id)) node.classList.add('winner');

    avatar.textContent = Array.from(player.name)[0]?.toUpperCase() || '?';
    avatar.style.setProperty('--hue', String(hueFor(player.name)));
    name.textContent = player.name;
    plate.title = me ? t('nameYou', { name: player.name }) : player.name;
    stack.textContent = chips(player.stack);
    const metaParts = [];
    if (player.kind === 'bot') metaParts.push(t('bot') + (player.style ? ' · ' + styleName(player.style) : ''));
    if (player.eliminated) metaParts.push(t('eliminated'));
    else if (!player.connected) metaParts.push(t('offline'));
    else if (player.sittingOut) metaParts.push(t('away'));
    meta.textContent = metaParts.join(' · ');
    meta.classList.toggle('offline', !player.connected);

    if (seat === v.buttonSeat && v.phase !== 'idle') plate.append(el('span', 'badge', t('dealer')));

    // 牌：结束时只给赢家的最好五张高亮
    hole.replaceChildren();
    const best = this.bestCards();
    if (player.cards) {
      for (const card of player.cards) {
        const extra = best && card !== HIDDEN ? (best.has(card) ? 'best' : 'dim') : '';
        hole.append(cardElement(card, extra));
      }
    }

    let text = '', kind = '';
    const shown = result && !result.byFold ? result.hands[player.id] : null;
    if (result && winners.has(player.id)) { text = '+' + chips(winners.get(player.id)); kind = 'win'; }
    else if (shown) text = t('cat' + shown.category);
    else if (player.folded) { text = t('fold'); kind = 'fold'; }
    else if (player.allIn) { text = t('allInTag'); kind = 'allin'; }
    else if (v.toAct === player.id && player.kind === 'bot') text = t('thinking');
    else if (player.lastAction) text = t('tag_' + player.lastAction);
    tag.textContent = text;
    tag.className = 'tag' + (kind ? ' ' + kind : '');

    if (v.turn && v.turn.id === player.id && v.phase === 'betting') {
      const timer = el('div', 'timer');
      const bar = el('span');
      timer.append(bar);
      plate.append(timer);
      const fraction = Math.max(0, Math.min(1, v.turn.remainingMs / v.turn.totalMs));
      bar.style.transform = `scaleX(${fraction})`;
      bar.animate([{ transform: `scaleX(${fraction})` }, { transform: 'scaleX(0)' }], { duration: v.turn.remainingMs, fill: 'forwards' });
    }
  }

  /** 摊牌后赢下主池的那手最好的五张牌 */
  bestCards() {
    const v = this.view;
    if (v.phase !== 'complete' || !v.result || v.result.byFold) return null;
    const main = v.result.pots[0];
    if (!main) return null;
    const set = new Set();
    for (const w of main.winners) for (const c of v.result.hands[w.id]?.best || []) set.add(c);
    return set;
  }

  renderBoard() {
    const v = this.view;
    const board = $('board');
    const best = this.bestCards();
    const key = v.handNumber + ':' + v.board.join(',');
    const previous = this.lastBoardKey.startsWith(v.handNumber + ':') ? this.lastBoardKey.split(':')[1].split(',').filter(Boolean).length : 0;
    board.replaceChildren();
    for (let i = 0; i < 5; i++) {
      const card = v.board[i];
      if (card === undefined) board.append(cardElement(null));
      else board.append(cardElement(card, (i >= previous && key !== this.lastBoardKey ? 'deal ' : '') + (best ? (best.has(card) ? 'best' : 'dim') : '')));
    }
    this.lastBoardKey = key;

    const pot = $('pot');
    pot.replaceChildren();
    if (v.phase === 'complete' && v.result) {
      const total = v.result.pots.reduce((s, p) => s + p.amount, 0);
      pot.append(t('potN', { n: chips(total) }));
    } else if (v.phase !== 'idle' && v.totalPot > 0) {
      pot.append(t('potN', { n: chips(v.totalPot) }));
    }

    const line = $('result-line');
    line.textContent = v.phase === 'complete' && v.result ? this.resultText() : '';
  }

  nameOf(id) {
    const v = this.view;
    if (id === v.you) return t('you');
    return v.players.find(p => p.id === id)?.name || '?';
  }

  resultText() {
    const r = this.view.result;
    return r.pots.map((pot, index) => {
      const names = pot.winners.map(w => this.nameOf(w.id));
      const head = pot.winners.length > 1 ? t('split', { names: names.join(' / '), n: chips(pot.amount) })
        : t(index === 0 ? 'winsPot' : 'winsSidePot', { name: names[0], n: chips(pot.amount) });
      return head + (pot.category !== null && !r.byFold ? ' · ' + handName(pot.category, pot.ranks || []) : '');
    }).join('　');
  }

  renderActions() {
    const v = this.view;
    const legal = v.legal;
    const actions = $('actions');
    const status = $('status-line');
    const extra = $('extra-actions');
    extra.replaceChildren();
    if (legal) {
      actions.hidden = false;
      actions.classList.toggle('covered', this.raiseOpen);
      const label = (node, text, key) => { node.replaceChildren(text); if (key) node.append(el('span', 'kbd', key)); };
      label($('act-fold'), t('fold'), 'F');
      label($('act-call'), legal.canCheck ? t('check') : (legal.callAmount >= legal.stack ? t('callAllIn', { n: chips(legal.callAmount) }) : t('call', { n: chips(legal.callAmount) })), 'C');
      const raise = $('act-raise');
      raise.disabled = !legal.canRaise;
      label(raise, legal.isOpening ? t('bet') : t('raise'), legal.canRaise ? 'R' : '');
      status.replaceChildren(el('strong', '', t('yourTurn')));
      if (!legal.canCheck) status.append(' · ' + t('toCallN', { n: chips(legal.toCall) }));
      if (this.raiseOpen) this.syncRaise();
    } else {
      this.closeRaise();
      actions.hidden = true;
      status.textContent = this.statusText();
    }
    const me = v.players.find(p => p.id === v.you);
    if (v.game.canRebuy && me && me.stack === 0 && this.ctx.kind !== 'solo') {
      const button = el('button', 'chip-btn', t('rebuy', { n: chips(v.game.startingStack) }));
      button.type = 'button';
      button.addEventListener('click', () => this.handlers.onRebuy());
      extra.append(button);
    }
    if (this.ctx.kind !== 'solo' && me && me.stack > 0) {
      const button = el('button', 'chip-btn', v.game.away ? t('comeBack') : t('takeBreak'));
      button.type = 'button';
      button.addEventListener('click', () => this.handlers.onAway(!v.game.away));
      extra.append(button);
    }
  }

  statusText() {
    const v = this.view;
    const me = v.players.find(p => p.id === v.you);
    if (v.game.state === 'lobby') return this.ctx.kind === 'host' ? '' : t('waitingHost');
    if (v.game.state === 'waiting') return me && me.stack === 0 ? t('busted') : t('waitingPlayers');
    if (me && me.sittingOut && me.stack > 0) return t('sittingOutNote');
    if (v.phase === 'complete' || v.phase === 'idle') return t('waitingNext');
    if (me && me.folded) return t('youFolded');
    if (v.toAct) return t('waitingFor', { name: this.nameOf(v.toAct) });
    return '';
  }

  raiseUnit() { return this.view.blinds.bb >= 20 ? 5 : 1; }

  raisePresets() {
    const v = this.view, legal = v.legal;
    const potAfterCall = v.totalPot + legal.toCall;
    const clamp = x => Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(x / this.raiseUnit()) * this.raiseUnit()));
    const base = legal.currentBet;
    const list = [
      [t('minRaise'), legal.minRaiseTo],
      [t('halfPot'), clamp(base + potAfterCall * 0.5)],
      [t('threeQuarterPot'), clamp(base + potAfterCall * 0.75)],
      [t('pot'), clamp(base + potAfterCall)],
      [t('allInShort'), legal.maxRaiseTo]
    ];
    return list;
  }

  openRaise() {
    const legal = this.view?.legal;
    if (!legal || !legal.canRaise) return;
    this.raiseOpen = true;
    $('actions').classList.add('covered');
    $('raise-panel').hidden = false;
    const presets = $('presets');
    presets.replaceChildren();
    for (const [label, amount] of this.raisePresets()) {
      const button = el('button', '', label);
      button.type = 'button';
      button.addEventListener('click', () => { $('raise-slider').value = amount; $('raise-input').value = amount; this.updateRaiseLabel(); });
      presets.append(button);
    }
    this.syncRaise(true);
    $('raise-slider').focus();
  }

  syncRaise(reset = false) {
    const legal = this.view.legal;
    const slider = $('raise-slider'), input = $('raise-input');
    slider.min = input.min = String(legal.minRaiseTo);
    slider.max = input.max = String(legal.maxRaiseTo);
    slider.step = String(this.raiseUnit());
    input.step = '1';
    if (reset || !input.value) {
      const initial = this.raisePresets()[legal.isOpening ? 1 : 0][1];
      slider.value = input.value = String(initial);
    }
    this.updateRaiseLabel();
  }

  raiseAmount() {
    const legal = this.view.legal;
    const value = Math.round(Number($('raise-input').value));
    if (!Number.isFinite(value)) return legal.minRaiseTo;
    return Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, value));
  }

  updateRaiseLabel() {
    const legal = this.view?.legal;
    if (!legal) return;
    const amount = this.raiseAmount();
    $('raise-go').textContent = amount >= legal.maxRaiseTo ? t('allIn', { n: chips(amount) }) : legal.isOpening ? t('betN', { n: chips(amount) }) : t('raiseTo', { n: chips(amount) });
  }

  confirmRaise() {
    if (!this.raiseOpen || !this.view?.legal) return;
    this.send({ type: 'raise', to: this.raiseAmount() });
  }

  closeRaise() {
    this.raiseOpen = false;
    $('raise-panel').hidden = true;
    $('actions').classList.remove('covered');
  }

  renderFeed() {
    const list = $('feed-list');
    if ($('feed').hidden) return;
    const v = this.view;
    const nameOf = id => this.nameOf(id);
    list.replaceChildren();
    const items = [];
    for (const entry of v.log) {
      if (entry.t === 'street') items.push(['street', describeEvent(entry, nameOf)]);
      else if (entry.t === 'blind' || entry.t === 'action' || entry.t === 'uncalled') items.push(['', describeEvent(entry, nameOf)]);
      else if (entry.t === 'showdown' && entry.hands) {
        for (const [id, h] of Object.entries(entry.hands)) {
          const hole = Array.isArray(h.hole) ? h.hole.filter(isCard) : [];
          if (hole.length !== 2 || h.score === null) continue;
          items.push(['', t('shows', { name: nameOf(id), cards: hole.map(c => rankText(rankOf(c)) + suitGlyph(suitOf(c))).join(' '), hand: handName(categoryOf(h.score), scoreRanks(h.score)) })]);
        }
      }
    }
    if (v.phase === 'complete' && v.result) items.push(['win', this.resultText()]);
    for (const [kind, text] of items.slice(-60)) list.append(el('li', kind, text));
    list.scrollTop = list.scrollHeight;
  }

  renderHelper() {
    const box = $('helper');
    if (box.hidden) return;
    const body = $('helper-body');
    const v = this.view;
    if (this.ctx.kind === 'client' && !v.game.helper) { body.replaceChildren(el('p', 'fine', t('helperDisabled'))); return; }
    const me = v.players.find(p => p.id === v.you);
    if (!me || !me.inHand || me.folded || !me.cards || me.cards.some(c => !isCard(c)) || v.phase === 'idle' || v.phase === 'complete') {
      const nodes = [];
      if (v.phase === 'complete' && me?.inHand && !me.folded && me.cards?.every(isCard) && v.board.length >= 3) {
        const score = evaluate([...me.cards, ...v.board]);
        const dl = el('dl');
        dl.append(el('dt', '', t('helperHand')), el('dd', '', handName(categoryOf(score), scoreRanks(score))));
        nodes.push(dl);
      }
      nodes.push(el('p', 'fine', v.phase === 'complete' ? t('waitingNext') : t('helperIdle')));
      body.replaceChildren(...nodes);
      this.helperKey = '';
      return;
    }
    const opponents = v.players.filter(p => p.id !== v.you && p.inHand && !p.folded);
    const legal = v.legal;
    const key = [v.handNumber, v.board.join(','), opponents.length, legal ? legal.toCall : '-', v.totalPot].join('|');
    if (key === this.helperKey) return;
    this.helperKey = key;
    const [a, b] = me.cards;
    const ranges = opponents.map(p => preflopRange(v.log, p.id));
    const { equity } = estimateEquity({ hole: [a, b], board: v.board, opponents: Math.max(1, opponents.length), ranges, iterations: v.board.length ? 3000 : 2000 });
    const dl = el('dl');
    const row = (term, value, node) => { dl.append(el('dt', '', term)); const dd = el('dd', '', value); if (node) dd.append(node); dl.append(dd); };
    if (v.board.length >= 3) {
      const score = evaluate([a, b, ...v.board]);
      row(t('helperHand'), handName(categoryOf(score), scoreRanks(score)));
    } else {
      row(t('helperHand'), t('helperStart', { label: handLabel(a, b), pct: Math.max(1, Math.round(preflopPercentile(a, b) * 100)) }));
    }
    const meter = el('div', 'meter');
    const fill = el('span');
    fill.style.width = Math.round(equity * 100) + '%';
    meter.append(fill);
    let need = null;
    if (legal && legal.toCall > 0) {
      need = legal.callAmount / (v.totalPot + legal.callAmount);
      const mark = el('i');
      mark.style.left = Math.round(need * 100) + '%';
      meter.append(mark);
    }
    row(t('helperEquity'), t('helperEquityText', { pct: Math.round(equity * 100), n: Math.max(1, opponents.length) }), meter);
    if (legal) {
      row(t('helperOdds'), legal.toCall > 0
        ? t('helperOddsText', { call: chips(legal.callAmount), pot: chips(v.totalPot + legal.callAmount), pct: Math.round(need * 100) })
        : t('helperNoBet'));
      let advice;
      const pct = preflopPercentile(a, b);
      if (v.board.length < 3) {
        // 翻牌前看起手牌强度：后面的人多半会弃牌，按赔率算会严重低估好牌
        advice = pct <= 0.08 ? t('advicePreStrong') : pct <= 0.22 ? t('advicePreGood') : pct <= 0.45 ? t('advicePreMedium') : t('advicePreWeak');
        if (legal.toCall === 0 && pct > 0.22) advice = t('advicePreFree');
      } else if (legal.toCall === 0) advice = t('adviceFree');
      else if (equity > need + 0.2) advice = t('adviceStrong');
      else if (equity > need + 0.05) advice = t('adviceCall');
      else if (equity > need - 0.04) advice = t('adviceClose');
      else advice = t('adviceFold');
      dl.append(el('dd', 'advice', advice));
    }
    if (v.board.length < 3) dl.append(el('dd', 'fine', t('helperPreflopNote', { pct: Math.round(preflopEquity(a, b) * 100) })));
    body.replaceChildren(dl);
  }

  announce() {
    const v = this.view;
    let text = '';
    if (v.legal) text = t('yourTurn') + (v.legal.canCheck ? '' : ' · ' + t('toCallN', { n: chips(v.legal.toCall) }));
    else if (v.phase === 'complete' && v.result) text = this.resultText();
    const key = v.handNumber + ':' + v.phase + ':' + (v.legal ? v.log.length : '') + ':' + text;
    if (text && key !== this.announced) {
      this.announced = key;
      $('announcer').textContent = text;
    }
  }
}

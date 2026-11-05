import test from 'node:test';
import assert from 'node:assert/strict';
import { TableController, niceChips } from '../holdem/js/controller.js';
import { buildView, HIDDEN } from '../holdem/js/view.js';
import { seededRandom } from '../holdem/js/cards.js';
import { recordFromView, stats, recordText } from '../holdem/js/history.js';
import { setLanguage } from '../holdem/js/i18n.js';
import { sanitizeAction, normalizeCode, cleanName, newRoomCode } from '../holdem/js/net.js';

/** 假时钟：控制器的定时器排队，按时间先后一个个执行，跑上百手也只要几百毫秒 */
function fakeClock() {
  let now = 0, id = 0;
  const queue = new Map();
  return {
    now: () => now,
    timers: {
      set: (fn, ms) => { queue.set(++id, { at: now + ms, fn }); return id; },
      clear: key => queue.delete(key)
    },
    runNext() {
      let next = null;
      for (const [key, item] of queue) if (!next || item.at < next[1].at) next = [key, item];
      if (!next) return false;
      queue.delete(next[0]);
      now = Math.max(now, next[1].at);
      next[1].fn();
      return true;
    }
  };
}

function controller(settings, seed = 1) {
  const clock = fakeClock();
  const c = new TableController(settings, { random: seededRandom(seed), aiRandom: seededRandom(seed + 1), now: clock.now, timers: clock.timers });
  return { c, clock };
}

// Catches chip leaks through rebuys and a solo game that keeps dealing after you go broke.
test('practice table: a local player and bots play on, bots rebuy, chips add up to all buy-ins', () => {
  const { c, clock } = controller({ maxSeats: 4, startingStack: 500, smallBlind: 10, bigBlind: 20 });
  c.addPlayer({ id: 'me', name: 'Me', agent: 'local' });
  for (let i = 0; i < 3; i++) c.addPlayer({ id: 'b' + i, name: 'B' + i, agent: 'bot', style: ['maniac', 'station', 'lag'][i], difficulty: 'easy' });
  c.start();
  const random = seededRandom(5);
  let rebuys = 0;
  for (let step = 0; step < 20000 && c.table.handNumber < 80; step++) {
    const hand = c.table.hand;
    if (hand?.phase === 'betting' && hand.toAct === 'me') {
      const legal = c.table.legalActions('me');
      const roll = random.float();
      c.submit('me', roll < 0.2 ? { type: 'fold' } : roll < 0.85 ? { type: legal.canCheck ? 'check' : 'call' } : { type: 'allin' }, hand.number);
      continue;
    }
    if (c.state === 'waiting' && c.table.player('me').stack === 0) {
      assert.ok(c.canRebuy('me'));
      c.rebuy('me');
      rebuys++;
      continue;
    }
    assert.ok(clock.runNext(), 'controller stalled');
    const inPlay = c.table.hand && c.table.hand.phase !== 'complete' ? c.table.totalPot() : 0;
    const buyIns = c.players.reduce((s, p) => s + p.buyIns, 0) * 500;
    assert.equal(c.players.reduce((s, p) => s + p.stack, 0) + inPlay, buyIns);
  }
  assert.ok(c.table.handNumber >= 80);
  assert.ok(rebuys > 0, 'went broke and rebought at least once');
  assert.ok(c.players.some(p => p.agent === 'bot' && p.buyIns > 1), 'a bot rebought by itself');
});

test('knockout: blinds rise every 8 hands, busted players are ranked, the winner holds every chip', () => {
  const { c, clock } = controller({ maxSeats: 5, startingStack: 400, smallBlind: 10, bigBlind: 20, mode: 'tournament', levelHands: 8 }, 3);
  for (let i = 0; i < 5; i++) c.addPlayer({ id: 'b' + i, name: 'B' + i, agent: 'bot', style: 'maniac', difficulty: 'easy' });
  c.start();
  let maxLevel = 0;
  for (let step = 0; step < 200000 && c.state !== 'over'; step++) {
    assert.ok(clock.runNext(), 'tournament stalled');
    maxLevel = Math.max(maxLevel, c.level);
  }
  assert.equal(c.state, 'over');
  assert.ok(maxLevel >= 1, 'blinds went up');
  const standings = c.standings();
  assert.deepEqual(standings.map(s => s.place), [1, 2, 3, 4, 5]);
  assert.equal(standings[0].stack, 2000);
  assert.equal(new Set(standings.map(s => s.id)).size, 5);
  assert.deepEqual([niceChips(15), niceChips(37.5), niceChips(240), niceChips(1150)], [15, 40, 250, 1000]);
});

test('a remote player who times out is checked or folded, then sat out after two timeouts', () => {
  const { c, clock } = controller({ maxSeats: 3, turnSeconds: 30 });
  c.addPlayer({ id: 'r1', name: 'Remote', agent: 'remote' });
  c.addPlayer({ id: 'b1', name: 'Bot1', agent: 'bot', style: 'station' });
  c.addPlayer({ id: 'b2', name: 'Bot2', agent: 'bot', style: 'station' });
  c.start();
  let timeouts = 0;
  for (let step = 0; step < 5000 && !c.table.player('r1').away; step++) {
    const before = c.table.hand?.toAct === 'r1' ? c.table.hand.log.length : null;
    clock.runNext();
    if (before !== null && c.table.hand?.log.length > before) timeouts++;
  }
  assert.equal(c.table.player('r1').away, true);
  assert.equal(c.table.player('r1').sittingOut, true);
  assert.ok(timeouts >= 2);
  c.setAway('r1', false);
  assert.equal(c.table.player('r1').sittingOut, false);
});

test('leaving in the middle of a hand folds when it is your turn and frees the seat afterwards', () => {
  const { c, clock } = controller({ maxSeats: 3 });
  c.addPlayer({ id: 'me', name: 'Me', agent: 'local' });
  c.addPlayer({ id: 'r1', name: 'Remote', agent: 'remote' });
  c.addPlayer({ id: 'b1', name: 'Bot', agent: 'bot', style: 'rock' });
  c.start();
  while (!c.table.hand) clock.runNext();
  c.removePlayer('r1');
  assert.equal(c.table.player('r1').leaving, true);
  for (let step = 0; step < 500 && c.table.player('r1'); step++) {
    const hand = c.table.hand;
    if (hand.phase === 'betting' && hand.toAct === 'me') c.submit('me', { type: c.table.legalActions('me').canCheck ? 'check' : 'call' });
    else clock.runNext();
  }
  assert.equal(c.table.player('r1'), null);
});

// Catches the worst online bug: sending someone else's hole cards before they are shown.
test('views never reveal other players\' hole cards before an all-in or the showdown', () => {
  const { c, clock } = controller({ maxSeats: 6, startingStack: 300 }, 9);
  for (let i = 0; i < 6; i++) c.addPlayer({ id: 'p' + i, name: 'P' + i, agent: 'bot', style: 'maniac', difficulty: 'easy' });
  c.start();
  let revealed = 0;
  for (let step = 0; step < 6000; step++) {
    clock.runNext();
    const hand = c.table.hand;
    if (!hand) continue;
    for (const viewer of c.players) {
      const view = buildView(c.table, viewer.id);
      for (const p of view.players) {
        if (p.id === viewer.id || !p.cards) continue;
        const shown = p.cards.some(card => card !== HIDDEN);
        if (shown) revealed++;
        if (hand.phase === 'betting') assert.ok(!shown, 'hole cards leaked during betting');
        if (shown) assert.ok(!p.folded && (hand.phase === 'runout' || (hand.phase === 'complete' && !hand.result.byFold)));
      }
      assert.ok(!JSON.stringify(view.log).includes('"hole"') || hand.phase === 'complete');
    }
  }
  assert.ok(revealed > 0, 'showdowns did reveal cards');
});

test('hand history records only what this player saw, and its numbers add up', () => {
  setLanguage('en');
  const { c, clock } = controller({ maxSeats: 3, startingStack: 1000 }, 4);
  c.addPlayer({ id: 'me', name: 'Me', agent: 'bot', style: 'station' });
  c.addPlayer({ id: 'b1', name: 'B1', agent: 'bot', style: 'maniac' });
  c.addPlayer({ id: 'b2', name: 'B2', agent: 'bot', style: 'tag' });
  c.start();
  const records = [];
  let last = 0;
  for (let step = 0; step < 4000 && records.length < 30; step++) {
    clock.runNext();
    const view = buildView(c.table, 'me');
    if (view.phase === 'complete' && view.handNumber !== last) {
      last = view.handNumber;
      const record = recordFromView(view, { mode: 'solo', at: 1730000000000 + step });
      records.push(record);
      for (const id of Object.keys(record.shown)) assert.ok(id === 'me' || !record.byFold);
      assert.ok(recordText(record).includes('Hand ' + record.hand));
    }
  }
  const s = stats(records);
  assert.equal(s.hands, records.length);
  assert.equal(s.net, records.reduce((sum, r) => sum + r.net, 0));
  assert.ok(s.vpip >= s.pfr);
  setLanguage('zh');
});

test('network input is sanitised: actions, room codes and names', () => {
  assert.deepEqual(sanitizeAction({ type: 'raise', to: 120, extra: 'x' }), { type: 'raise', to: 120 });
  assert.equal(sanitizeAction({ type: 'raise', to: 12.5 }), null);
  assert.equal(sanitizeAction({ type: 'steal' }), null);
  assert.equal(normalizeCode(' k7q-2mx '), 'K7Q2MX');
  assert.equal(normalizeCode('O0I1abc'), 'ABC');
  assert.equal(cleanName('  Ann‮\u0007   Lee  '), 'Ann Lee');
  assert.equal(cleanName('一二三四五六七八九十一二三四五六七八'), '一二三四五六七八九十一二三四五六');
  assert.equal(cleanName('   '), 'Guest');
  assert.match(newRoomCode(seededRandom(1)), /^[A-HJ-NP-Z2-9]{6}$/);
});

// A guest renders whatever the host sends. Garbage or hostile views must not crash the page
// or smuggle markup through: everything is coerced to plain numbers, known words and short strings.
test('views from the network are sanitised before rendering', async () => {
  const { sanitizeView } = await import('../holdem/js/ui.js');
  const { describeEvent, handName, styleName, streetName } = await import('../holdem/js/i18n.js');
  const { recordFromView, recordText } = await import('../holdem/js/history.js');
  const random = seededRandom(77);
  const junk = () => {
    const pick = [() => null, () => undefined, () => random.int(1e6) - 5e5, () => 'x'.repeat(random.int(200)), () => '<img src=x onerror=alert(1)>',
      () => ({}), () => [], () => [random.int(60) - 5, 'A', null], () => true, () => NaN, () => ({ toString: 5 })];
    return pick[random.int(pick.length)]();
  };
  for (let i = 0; i < 3000; i++) {
    const raw = {
      you: junk(), handNumber: junk(), phase: ['betting', 'complete', junk()][random.int(3)], board: junk(), players: [junk(), { id: junk(), name: junk(), cards: junk(), lastAction: junk(), style: junk(), kind: 'bot' }],
      legal: random.float() < 0.5 ? junk() : { toCall: junk(), canRaise: junk(), minRaiseTo: junk() },
      result: { pots: [{ amount: junk(), winners: [junk(), { id: junk(), amount: junk() }], category: junk(), ranks: junk() }], hands: { a: { hole: junk(), best: junk(), category: 99, ranks: [99, -4] } }, net: junk() },
      log: [junk(), { t: 'hand', players: junk() }, { t: 'action', action: junk(), street: junk() }, { t: 'street', street: 5, cards: junk() }, { t: 'showdown', hands: junk() }, { t: 'blind', id: junk() }],
      game: { state: junk(), standings: [junk(), { name: junk() }] }, turn: junk(), maxSeats: junk()
    };
    const view = sanitizeView(raw);
    assert.ok(view && Array.isArray(view.players) && Array.isArray(view.board) && Array.isArray(view.log));
    assert.ok(view.maxSeats >= 2 && view.maxSeats <= 10);
    for (const p of view.players) {
      assert.equal(typeof p.name, 'string');
      assert.ok(p.name.length <= 24);
      assert.ok(p.cards === null || p.cards.every(c => c === -1 || c === null || (Number.isInteger(c) && c >= 0 && c < 52)));
      styleName(p.style);
    }
    for (const e of view.log) { describeEvent(e, () => 'n'); if (e.street) streetName(e.street); }
    for (const pot of view.result?.pots || []) if (pot.category !== null) handName(pot.category, pot.ranks || []);
    for (const h of Object.values(view.result?.hands || {})) { assert.ok(h.category >= 0 && h.category <= 8); handName(h.category, h.ranks); }
    const record = recordFromView({ ...view, phase: 'complete', result: view.result || { pots: [], hands: {}, net: {} }, log: [{ t: 'hand', players: [], button: 0 }, ...view.log] });
    if (record) recordText(record);
  }
  assert.equal(sanitizeView(null), null);
  assert.equal(sanitizeView('nope'), null);
});

test('a hostile client message cannot crash the host', async () => {
  const { RoomHost } = await import('../holdem/js/net.js');
  const { c } = controller({ maxSeats: 3 });
  c.addPlayer({ id: 'host', name: 'Host', agent: 'local' });
  let accept;
  const transport = { host: async () => ({ onConnection: fn => { accept = fn; }, close() {} }) };
  const room = new RoomHost({ controller: c, transport, code: 'ABCDEF' });
  await room.open();
  clearInterval(room.heartbeat);
  const sent = [];
  const handlers = { message: [], close: [] };
  accept({ send: m => sent.push(m), onMessage: fn => handlers.message.push(fn), onClose: fn => handlers.close.push(fn), close() {} });
  const deliver = m => handlers.message.forEach(fn => fn(m));
  for (const message of [null, 'x', { t: 'hello', v: 1, name: { toString: 5 }, token: { toString: 5 } }, { t: 'action', action: { type: 'raise', to: { valueOf: 1 } } }, { t: 'action', action: 'fold' }, { t: 'ping' }, { t: 'rebuy' }]) {
    assert.doesNotThrow(() => deliver(message));
  }
  assert.equal(c.players.length, 2);
  assert.equal(c.players.find(p => p.agent === 'remote').name, 'Guest');
  assert.ok(sent.some(m => m.t === 'welcome'));
  assert.ok(sent.some(m => m.t === 'view'));
});

test('with no time limit, a disconnected player on the clock is auto-acted after a grace period', () => {
  const { c, clock } = controller({ maxSeats: 3, turnSeconds: 0 });
  c.addPlayer({ id: 'r1', name: 'Remote', agent: 'remote' });
  c.addPlayer({ id: 'b1', name: 'Bot', agent: 'bot', style: 'station' });
  c.start();
  while (c.table.hand?.toAct !== 'r1') assert.ok(clock.runNext());
  const before = c.table.hand.log.length;
  c.setConnected('r1', false);
  const start = clock.now();
  assert.ok(clock.runNext(), 'a grace timer is armed');
  assert.ok(c.table.hand.log.length > before || c.table.hand.number > 1, 'the offline player was checked or folded');
  assert.ok(clock.now() - start <= 20000);
});

test('joining a full room while someone is still leaving gets a clean "full" reply', async () => {
  const { RoomHost } = await import('../holdem/js/net.js');
  const { c, clock } = controller({ maxSeats: 2 });
  c.addPlayer({ id: 'host', name: 'Host', agent: 'local' });
  let accept;
  const room = new RoomHost({ controller: c, transport: { host: async () => ({ onConnection: fn => { accept = fn; }, close() {} }) }, code: 'ABCDEF' });
  await room.open();
  clearInterval(room.heartbeat);
  const connect = () => {
    const sent = [], handlers = [];
    accept({ send: m => sent.push(m), onMessage: fn => handlers.push(fn), onClose() {}, close() {} });
    return { sent, say: m => handlers.forEach(fn => fn(m)) };
  };
  const first = connect();
  first.say({ t: 'hello', v: 1, name: 'A', token: 'tokA' });
  c.start();
  while (!c.table.hand) clock.runNext();
  first.say({ t: 'leave' });                        // still seated until the hand ends
  assert.equal(c.table.player('r1').leaving, true);
  const second = connect();
  assert.doesNotThrow(() => second.say({ t: 'hello', v: 1, name: 'B', token: 'tokB' }));
  assert.deepEqual(second.sent.map(m => m.t), ['reject']);
  assert.equal(second.sent[0].reason, 'full');
});

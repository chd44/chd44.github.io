// 牌局记录：每一手结束时，按「这个玩家看到的」画面数据存一份，所以好友房里也不会记下别人没亮的牌。
// 只存在本机浏览器（localStorage），最多 200 手。
import { t, chips, cardsText, handName, describeEvent, streetName, getLanguage } from './i18n.js';

const KEY = 'holdem.history.v1';
export const LIMIT = 200;

export function recordFromView(view, { mode = 'solo', room = null, at = Date.now(), id = null } = {}) {
  if (view.phase !== 'complete' || !view.result) return null;
  const start = view.log.find(e => e.t === 'hand');
  if (!start) return null;
  const names = Object.fromEntries(view.players.map(p => [p.id, p.name]));
  const me = view.players.find(p => p.id === view.you);
  const inHand = start.players.some(p => p.id === view.you);
  return {
    id: id || `${mode}-${room || 'local'}-${view.handNumber}-${at}`,
    at,
    mode,
    room,
    hand: view.handNumber,
    blinds: view.blinds,
    you: view.you,
    button: start.button,
    players: start.players.map(p => ({ id: p.id, name: names[p.id] ?? p.id, seat: p.seat, stack: p.stack })),
    hole: inHand && me?.cards ? me.cards.slice() : null,
    board: view.board.slice(),
    events: view.log.filter(e => ['blind', 'action', 'street', 'uncalled'].includes(e.t)),
    shown: Object.fromEntries(Object.entries(view.result.hands).map(([id, h]) => [id, { hole: h.hole, category: h.category, ranks: h.ranks }])),
    pots: view.result.pots.map(p => ({ amount: p.amount, winners: p.winners, category: p.category, ranks: p.ranks })),
    byFold: view.result.byFold,
    net: inHand ? (view.result.net[view.you] ?? 0) : null
  };
}

// 浏览器禁止存储时，读 localStorage 这个属性本身就会抛 SecurityError，所以要在 try 里取，不能写成默认参数。
// 存不了的时候记录先放在内存里，这次访问里「牌局记录」页照样能看
let memory = [];
let memoryOnly = false;  // 写入失败过（比如空间满了）就一直用内存里的
function storageOf(storage) {
  try {
    return storage ?? globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadHistory(storage) {
  const store = storageOf(storage);
  if (!store || memoryOnly) return memory.slice();
  try {
    const list = JSON.parse(store.getItem(KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return memory.slice();
  }
}

export function saveHistory(list, storage) {
  memory = list.slice(-LIMIT);
  const store = storageOf(storage);
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify(memory));
    return true;
  } catch {
    memoryOnly = true;
    return false;
  }
}

export function addRecord(record, storage) {
  if (!record) return loadHistory(storage);
  const list = loadHistory(storage).filter(r => r.id !== record.id);
  list.push(record);
  saveHistory(list, storage);
  return list.slice(-LIMIT);
}

export function clearHistory(storage) {
  memory = [];
  memoryOnly = false;
  try { storageOf(storage)?.removeItem(KEY); } catch { /* 忽略 */ }
}

/** 只统计自己坐在里面的那些手 */
export function stats(records) {
  const mine = records.filter(r => r.net !== null && r.net !== undefined);
  let vpip = 0, pfr = 0, won = 0, net = 0, biggest = 0;
  for (const r of mine) {
    const pre = r.events.filter(e => e.t === 'action' && e.street === 'preflop' && e.id === r.you);
    if (pre.some(e => e.action === 'call' || e.action === 'raise' || e.action === 'bet')) vpip++;
    if (pre.some(e => e.action === 'raise' || e.action === 'bet')) pfr++;
    if (r.net > 0) won++;
    net += r.net;
    biggest = Math.max(biggest, r.pots.reduce((sum, p) => sum + p.amount, 0));
  }
  const n = mine.length;
  return { hands: n, net, won, vpip: n ? vpip / n : 0, pfr: n ? pfr / n : 0, biggest };
}

/** 一手牌的文字记录（导出、详情页用） */
export function recordText(r) {
  const nameOf = id => (id === r.you ? t('you') : r.players.find(p => p.id === id)?.name ?? id);
  const time = new Date(r.at).toLocaleString(getLanguage() === 'zh' ? 'zh-CN' : 'en-AU', { hour12: false });
  const lines = [`${t('brand')} · ${t('handNo', { n: r.hand })} · ${r.mode === 'online' ? t('onlineMode') + ' ' + (r.room || '') : t('soloMode')} · ${time} · ${t('blindsShort', { sb: r.blinds.sb, bb: r.blinds.bb })}`];
  const [open, close] = getLanguage() === 'zh' ? ['（', '）'] : [' (', ')'];
  for (const p of r.players) {
    lines.push(`  ${nameOf(p.id)}${open}${chips(p.stack)}${close}${p.seat === r.button ? ' [' + t('buttonTag') + ']' : ''}`);
  }
  if (r.hole) lines.push(`${t('holeCards')}: ${cardsText(r.hole)}`);
  lines.push(`— ${streetName('preflop')} —`);
  for (const e of r.events) {
    if (e.t === 'street') lines.push(`— ${streetName(e.street)} ${cardsText(e.board)} —`);
    else lines.push('  ' + describeEvent(e, nameOf));
  }
  if (!r.byFold) {
    lines.push(`— ${t('showdown')} —`);
    for (const [id, h] of Object.entries(r.shown)) lines.push('  ' + t('shows', { name: nameOf(id), cards: cardsText(h.hole), hand: handName(h.category, h.ranks) }));
  }
  r.pots.forEach((pot, index) => {
    const names = pot.winners.map(w => nameOf(w.id));
    const text = pot.winners.length > 1 ? t('split', { names: names.join(' / '), n: chips(pot.amount) })
      : t(index === 0 ? 'winsPot' : 'winsSidePot', { name: names[0], n: chips(pot.amount) });
    lines.push('  ' + text + (pot.category !== null && pot.category !== undefined ? ' · ' + handName(pot.category, pot.ranks) : ''));
  });
  if (r.net !== null && r.net !== undefined) lines.push(`${t('net')}: ${r.net > 0 ? '+' : ''}${chips(r.net)}`);
  return lines.join('\n');
}

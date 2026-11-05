// 页面：大厅、牌桌、牌局记录，以及单人练习 / 房主 / 加入者三种会话。
import { t, setLanguage, getLanguage, detectLanguage, chips, handName, cardsText } from './i18n.js';
import { TableController } from './controller.js';
import { makeBots } from './ai.js';
import { parseCards } from './cards.js';
import { TableRenderer, sanitizeView, cardElement, el } from './ui.js';
import { recordFromView, addRecord, loadHistory, clearHistory, stats, recordText } from './history.js';
import { RoomHost, RoomClient, pickTransport, newRoomCode, normalizeCode, cleanName, newToken } from './net.js';

const $ = id => document.getElementById(id);
const SETTINGS_KEY = 'holdem.settings';

const settings = (() => {
  const defaults = { lang: null, name: '', fourColor: false, helper: true, speed: 'normal', solo: null, host: null };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch { return defaults; }
})();
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* 无痕模式可能存不了 */ } };

let session = null;      // { kind: 'solo' | 'host' | 'client', controller?, host?, client?, you, room, view, recorded }
let ui = { helper: settings.helper, log: false };
const renderer = new TableRenderer({
  onAction: (action, hand) => {
    if (!session) return;
    if (session.kind === 'client') session.client.act(action, hand);
    else session.controller.submit(session.you, action, hand);
  },
  onRebuy: () => {
    if (!session) return;
    if (session.kind === 'client') session.client.send({ t: 'rebuy' });
    else session.controller.rebuy(session.you);
  },
  onAway: away => {
    if (!session) return;
    if (session.kind === 'client') session.client.send({ t: 'away', value: away });
    else session.controller.setAway(session.you, away);
  }
});

// ---------- 语言 ----------
function applyLanguage() {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(node => node.setAttribute('aria-label', t(node.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder)));
  document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === getLanguage())));
  renderRanking();
  refresh();
  if (!$('screen-history').hidden) renderHistory();
}
document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
  settings.lang = button.dataset.lang;
  setLanguage(settings.lang);
  saveSettings();
  applyLanguage();
}));

// ---------- 小工具 ----------
let toastTimer;
function toast(message) {
  const node = $('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t('copied'));
  } catch {
    toast(t('copyFailed', { text }));
  }
}

function showScreen(name) {
  for (const id of ['lobby', 'table', 'history']) $('screen-' + id).hidden = id !== name;
  window.scrollTo(0, 0);
}

function openDialog(id) {
  const dialog = $(id);
  if (!dialog.open) dialog.showModal();
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
});

function inviteLink(code) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  const params = new URLSearchParams(location.search);
  const next = new URLSearchParams({ room: code });
  for (const key of ['peer', 'transport']) if (params.get(key)) next.set(key, params.get(key));
  url.search = next.toString();
  return url.toString();
}

// ---------- 画面刷新 ----------
function currentView() {
  if (!session) return null;
  if (session.kind === 'client') return session.view;
  return sanitizeView(session.controller.viewFor(session.you));
}

function refresh() {
  if (!session) return;
  const view = currentView();
  $('toggle-helper').setAttribute('aria-pressed', String(ui.helper));
  $('toggle-log').setAttribute('aria-pressed', String(ui.log));
  $('helper').hidden = !ui.helper;
  $('feed').hidden = !ui.log;
  $('side-panel').parentElement.classList.toggle('with-panel', ui.helper || ui.log);
  renderRoomStrip();
  if (view) {
    renderer.render(view, { kind: session.kind, fourColor: settings.fourColor });
    record(view);
    notices(view);
  }
  renderOverlay(view);
}

function record(view) {
  if (view.phase !== 'complete' || session.recorded.has(view.handNumber)) return;
  session.recorded.add(view.handNumber);
  // 好友房里按「房间 + 座位 + 第几手」去重：重新打开链接回到房间时，正在显示结果的那一手不会记两次
  const mode = session.kind === 'solo' ? 'solo' : 'online';
  const id = mode === 'online' ? `online-${session.room}-${view.you}-${view.handNumber}` : `solo-${session.id}-${view.handNumber}`;
  const entry = recordFromView(view, { mode, room: session.room, id });
  if (entry) addRecord(entry);
}

function notices(view) {
  for (const notice of view.notices || []) {
    const name = view.players.find(p => p.id === notice.id)?.name || '';
    if (notice.t === 'rebuy' && notice.id !== view.you) toast(t('noticeRebuy', { name, n: chips(notice.amount) }));
    if (notice.t === 'away') toast(t('noticeAway', { name }));
    if (notice.t === 'level') toast(t('noticeLevel', { sb: chips(notice.sb), bb: chips(notice.bb) }));
  }
}

function renderRoomStrip() {
  const strip = $('room-strip');
  strip.hidden = !session || session.kind === 'solo' || !session.room;
  if (strip.hidden) return;
  $('room-code').textContent = session.room;
  $('copy-invite').hidden = false;
  let manage = $('manage-room');
  if (session.kind === 'host' && !manage) {
    manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'chip-btn';
    manage.id = 'manage-room';
    manage.addEventListener('click', () => { session.showRoster = true; refresh(); });
    strip.insertBefore(manage, $('room-status'));
  }
  if (manage) {
    manage.hidden = session.kind !== 'host';
    manage.textContent = t('players');
  }
  $('room-status').textContent = session.status ? t(session.status) : '';
}

// ---------- 覆盖层：房间大厅、等待、补码、结束 ----------
function renderOverlay(view) {
  const overlay = $('overlay');
  const card = $('overlay-card');
  const content = overlayContent(view);
  overlay.hidden = !content;
  if (!content) return;
  card.replaceChildren(...content);
}

function heading(text) {
  const h = el('h2', '', text);
  h.id = 'overlay-title';
  return h;
}
const para = (text, className = '') => el('p', className, text);
function button(text, onClick, className = 'act raise') {
  const b = el('button', className, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}
function row(...children) {
  const div = el('div', 'row');
  div.append(...children);
  return div;
}

function overlayContent(view) {
  if (!session) return null;
  if (session.fatal) {
    return [heading(t('connectionLost')), para(t(session.fatal)), row(button(t('toLobby'), () => endSession(false)))];
  }
  if (session.kind === 'client' && !view) return [heading(t('connecting')), para(session.room ? t('roomCode') + ' ' + session.room : '')];
  if (!view) return null;
  const me = view.players.find(p => p.id === view.you);
  const state = view.game.state;

  if (session.kind === 'host' && (state === 'lobby' || session.showRoster)) return hostRoster(view, state === 'lobby');
  if (session.kind === 'client' && state === 'lobby') {
    return [heading(t('hostLobbyTitle')), para(t('waitingHost')), rosterList(view, false)];
  }
  if (state === 'over') {
    const standings = view.game.standings || [];
    const mine = standings.find(s => s.id === view.you);
    const nodes = [heading(t('gameOver'))];
    const alive = standings.filter(s => s.stack > 0).length;
    if (standings[0]?.id === view.you) nodes.push(para(t('championText')));
    else {
      if (mine) nodes.push(para(t('placeText', { n: mine.place })));
      // 你出局时比赛就结束了；如果还剩不止一个人，只能说谁暂时领先
      if (standings[0]) nodes.push(para(alive > 1 ? t('leaderText', { name: standings[0].name }) : t('winnerText', { name: standings[0].name })));
    }
    nodes.push(standingsTable(standings));
    nodes.push(row(button(t('toLobby'), () => endSession(false), 'chip-btn'), ...(session.kind === 'solo' ? [button(t('playAgain'), () => restartSolo())] : [])));
    return nodes;
  }
  if (session.kind === 'solo' && me && me.stack === 0 && view.phase !== 'betting' && view.phase !== 'runout' && view.game.canRebuy) {
    return [heading(t('busted')), para(t('bustedText')), row(button(t('toLobby'), () => endSession(false), 'chip-btn'), button(t('rebuy', { n: chips(view.game.startingStack) }), () => session.controller.rebuy(session.you)))];
  }
  return null;
}

function rosterList(view, manage) {
  const list = document.createElement('ul');
  list.className = 'roster';
  for (const p of view.players.slice().sort((a, b) => a.seat - b.seat)) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'grow';
    name.textContent = p.id === view.you ? t('nameYou', { name: p.name }) : p.name;
    li.append(name);
    const small = document.createElement('small');
    small.textContent = p.kind === 'bot' ? t('bot') : p.id === 'host' ? t('host') : p.connected ? chips(p.stack) : t('offline');
    li.append(small);
    if (manage && p.id !== view.you) {
      li.append(button(p.kind === 'bot' ? t('removeBot') : t('kick'), () => {
        if (p.kind === 'bot') session.controller.removePlayer(p.id);
        else session.host.kick(p.id);
      }, 'chip-btn'));
    }
    list.append(li);
  }
  return list;
}

function hostRoster(view, lobby) {
  const nodes = [heading(lobby ? t('hostLobbyTitle') : t('players'))];
  if (lobby) nodes.push(para(t('hostLobbyText')));
  const code = document.createElement('div');
  code.className = 'big-code';
  code.textContent = session.room;
  nodes.push(code, row(button(t('copyLink'), () => copyText(inviteLink(session.room)), 'chip-btn')));
  nodes.push(rosterList(view, true));
  const seated = view.players.length;
  const addBot = button(t('addBot'), () => {
    const taken = session.controller.players.map(p => p.name);
    const [bot] = makeBots(1, 'normal', undefined, taken);
    session.controller.addPlayer({ id: 'b' + (++session.bots), name: bot.name, agent: 'bot', style: bot.style, difficulty: 'normal' });
  }, 'chip-btn');
  addBot.disabled = seated >= view.maxSeats;
  if (lobby) {
    const start = button(t('startGame'), () => { session.controller.start(); });
    start.disabled = seated < 2;
    nodes.push(row(addBot, start));
    if (seated < 2) nodes.push(para(t('needTwo'), 'fine'));
    nodes.push(para(t('hostKeepOpen'), 'fine'));
  } else {
    nodes.push(row(addBot, button(t('close'), () => { session.showRoster = false; refresh(); })));
  }
  return nodes;
}

function standingsTable(standings) {
  const table = document.createElement('table');
  table.className = 'standings';
  const head = table.createTHead().insertRow();
  for (const text of ['#', t('players'), t('chips')]) {
    const th = document.createElement('th');
    th.textContent = text;
    head.append(th);
  }
  const body = table.createTBody();
  for (const s of standings) {
    const tr = body.insertRow();
    tr.insertCell().textContent = String(s.place);
    tr.insertCell().textContent = s.name;
    tr.insertCell().textContent = chips(s.stack);
  }
  return table;
}

// ---------- 会话 ----------
function newSession(kind, extra) {
  session = { kind, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), recorded: new Set(), bots: 0, status: null, fatal: null, showRoster: false, ...extra };
}

function startSolo(options) {
  endSession(true);
  const [sb, bb] = options.blinds.split('/').map(Number);
  const controller = new TableController({
    maxSeats: options.bots + 1, smallBlind: sb, bigBlind: bb, startingStack: options.stack,
    mode: options.mode, botSpeed: settings.speed, turnSeconds: 0
  }, { onChange: () => refresh() });
  newSession('solo', { controller, you: 'me', room: null, options });
  controller.addPlayer({ id: 'me', name: options.name, agent: 'local' });
  makeBots(options.bots, options.difficulty, undefined, [options.name]).forEach((bot, i) => {
    controller.addPlayer({ id: 'b' + i, name: bot.name, agent: 'bot', style: bot.style, difficulty: options.difficulty });
  });
  showScreen('table');
  controller.start();
}

function restartSolo() {
  if (session?.kind === 'solo') startSolo(session.options);
}

async function startHost(options) {
  const [sb, bb] = options.blinds.split('/').map(Number);
  let host = null, code = null, lastError = null;
  // 只在牌局状态变化时发给其他人；本机切换助手、语言之类不用发
  const changed = () => { refresh(); if (session?.host === host) host?.broadcast(); };
  const controller = new TableController({
    maxSeats: options.seats, smallBlind: sb, bigBlind: bb, startingStack: options.stack,
    mode: 'cash', botSpeed: 'normal', turnSeconds: options.timer, helper: options.helper
  }, { onChange: changed });
  controller.addPlayer({ id: 'host', name: options.name, agent: 'local' });
  const transport = pickTransport();
  for (let attempt = 0; attempt < 3 && !host; attempt++) {
    code = newRoomCode();
    const candidate = new RoomHost({ controller, transport, code, onChange: changed });
    try {
      await candidate.open();
      host = candidate;
    } catch (error) {
      lastError = error;
      if (error.message !== 'taken') break;
    }
  }
  if (!host) throw lastError || new Error('network');
  endSession(true);
  newSession('host', { controller, host, you: 'host', room: code });
  showScreen('table');
  changed();
}

async function joinRoom(code, name) {
  endSession(true);
  const tokenKey = 'holdem.token.' + code;
  let token;
  try { token = localStorage.getItem(tokenKey); } catch { token = null; }
  if (!token) {
    token = newToken();
    try { localStorage.setItem(tokenKey, token); } catch { /* 没有存储就每次当新玩家 */ }
  }
  const client = new RoomClient({
    transport: pickTransport(), code, name, token,
    onView: raw => {
      if (session?.client !== client) return;
      const view = sanitizeView(raw);
      if (!view) return;
      session.view = view;
      session.you = view.you;
      session.status = null;
      refresh();
    },
    onStatus: status => {
      if (session?.client !== client) return;
      const map = { joined: null, reconnecting: 'reconnecting', unstable: 'reconnecting', lost: 'connectionLost', kicked: 'kicked', closed: 'hostLeft', full: 'roomFull', version: 'versionMismatch', rejected: 'roomNotFound' };
      if (['kicked', 'closed', 'lost', 'full', 'version', 'rejected'].includes(status)) session.fatal = map[status];
      else session.status = map[status] ?? null;
      refresh();
    }
  });
  newSession('client', { client, you: null, room: code, view: null });
  showScreen('table');
  refresh();
  await client.connect();
}

function endSession(silent) {
  if (!session) {
    if (!silent) showScreen('lobby');
    return;
  }
  if (session.kind === 'client') session.client.leave();
  if (session.kind === 'host') session.host.close();
  session.controller?.stop();
  session = null;
  $('overlay').hidden = true;
  if (!silent) {
    showScreen('lobby');
    if (location.search.includes('room=')) history.replaceState(null, '', location.pathname + (new URLSearchParams(location.search).get('transport') ? '?transport=' + new URLSearchParams(location.search).get('transport') : ''));
  }
}

$('leave-table').addEventListener('click', () => {
  if (session && (session.kind !== 'solo' || session.controller.table.hand?.phase === 'betting') && !confirm(t('leaveConfirm'))) return;
  endSession(false);
});
$('toggle-helper').addEventListener('click', () => { ui.helper = !ui.helper; refresh(); });
$('toggle-log').addEventListener('click', () => { ui.log = !ui.log; refresh(); });
$('copy-invite').addEventListener('click', () => session?.room && copyText(inviteLink(session.room)));
// 关掉页面时先告诉房主自己断开了（座位保留，重新打开链接能回到原位），不用等心跳超时
window.addEventListener('pagehide', () => {
  if (session?.kind === 'client') {
    session.client.closedByUs = true;
    session.client.connection?.close();
  }
});
window.addEventListener('pageshow', event => {
  if (event.persisted && session?.kind === 'client' && !session.fatal) session.client.resume();
});
window.addEventListener('beforeunload', event => {
  if (session?.kind === 'host') {
    event.preventDefault();
    event.returnValue = '';
  }
});

// ---------- 大厅和对话框 ----------
function fillName(form) {
  if (settings.name && !form.elements.name.value) form.elements.name.value = settings.name;
}

$('go-solo').addEventListener('click', () => {
  const form = $('form-solo');
  fillName(form);
  const last = settings.solo;
  if (last) {
    form.elements.bots.value = last.bots;
    form.elements.difficulty.value = last.difficulty;
    form.elements.mode.value = last.mode;
    form.elements.stack.value = String(last.stack);
    form.elements.blinds.value = last.blinds;
  }
  form.elements.botsOut.value = form.elements.bots.value;
  openDialog('dialog-solo');
});
$('form-solo').elements.bots.addEventListener('input', event => { $('form-solo').elements.botsOut.value = event.target.value; });
$('form-solo').addEventListener('submit', event => {
  event.preventDefault();
  const f = event.target.elements;
  const options = {
    name: cleanName(f.name.value, getLanguage() === 'zh' ? '我' : 'Me'),
    bots: Math.max(1, Math.min(7, Number(f.bots.value) || 5)),
    difficulty: f.difficulty.value,
    mode: f.mode.value,
    stack: Number(f.stack.value),
    blinds: f.blinds.value
  };
  if (f.name.value.trim()) settings.name = options.name;
  settings.solo = { ...options, name: undefined };
  saveSettings();
  $('dialog-solo').close();
  startSolo(options);
});

$('go-host').addEventListener('click', () => {
  const form = $('form-host');
  fillName(form);
  $('host-error').textContent = '';
  openDialog('dialog-host');
});
$('form-host').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.target.elements;
  const options = {
    name: cleanName(f.name.value, 'Host'), seats: Number(f.seats.value), timer: Number(f.timer.value),
    stack: Number(f.stack.value), blinds: f.blinds.value, helper: f.helper.checked
  };
  settings.name = options.name;
  saveSettings();
  const submit = event.target.querySelector('[type="submit"]');
  submit.disabled = true;
  $('host-error').textContent = t('connecting');
  try {
    await startHost(options);
    $('dialog-host').close();
  } catch (error) {
    $('host-error').textContent = error.message === 'peer-load' ? t('peerLoadFailed') : t('networkFailed');
  } finally {
    submit.disabled = false;
  }
});

$('go-join').addEventListener('click', () => openJoin(''));
function openJoin(code) {
  const form = $('form-join');
  fillName(form);
  if (code) form.elements.code.value = code;
  $('join-error').textContent = '';
  openDialog('dialog-join');
  (code ? form.elements.name : form.elements.code).focus();
}
$('form-join').elements.code.addEventListener('input', event => { event.target.value = normalizeCode(event.target.value); });
$('form-join').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.target.elements;
  const code = normalizeCode(f.code.value);
  if (code.length !== 6) {
    $('join-error').textContent = t('roomNotFound');
    return;
  }
  const name = cleanName(f.name.value, 'Guest');
  settings.name = name;
  saveSettings();
  const submit = event.target.querySelector('[type="submit"]');
  submit.disabled = true;
  $('join-error').textContent = t('connecting');
  try {
    await joinRoom(code, name);
    $('dialog-join').close();
  } catch (error) {
    const key = { 'peer-load': 'peerLoadFailed', network: 'networkFailed', full: 'roomFull', version: 'versionMismatch' }[error.message] || 'roomNotFound';
    endSession(false);
    openJoin(code);
    $('join-error').textContent = t(key);
  } finally {
    submit.disabled = false;
  }
});

$('go-rules').addEventListener('click', () => openDialog('dialog-rules'));
$('open-settings').addEventListener('click', () => {
  const f = $('form-settings').elements;
  f.fourColor.checked = settings.fourColor;
  f.helper.checked = settings.helper;
  f.speed.value = settings.speed;
  openDialog('dialog-settings');
});
$('form-settings').addEventListener('change', () => {
  const f = $('form-settings').elements;
  settings.fourColor = f.fourColor.checked;
  settings.helper = f.helper.checked;
  settings.speed = f.speed.value;
  saveSettings();
  if (session?.controller && session.kind === 'solo') session.controller.settings.botSpeed = settings.speed;
  refresh();
});
$('form-settings').addEventListener('submit', event => { event.preventDefault(); $('dialog-settings').close(); });

// ---------- 玩法说明里的牌型 ----------
const EXAMPLES = [
  [8, '9s 8s 7s 6s 5s'], [7, 'Kh Kd Kc Ks 3d'], [6, 'Qs Qh Qd 8c 8h'], [5, 'Ah Jh 8h 6h 2h'], [4, 'Td 9c 8h 7s 6d'],
  [3, '7c 7d 7h Ks 2d'], [2, 'Jh Jc 4s 4d As'], [1, 'Ad Ac 9h 6s 3c'], [0, 'Ac Kd 9s 5h 3c']
];
function renderRanking() {
  const list = $('ranking');
  list.replaceChildren();
  for (const [category, text] of EXAMPLES) {
    const li = document.createElement('li');
    const cards = document.createElement('div');
    cards.className = 'cards';
    for (const card of parseCards(text)) cards.append(cardElement(card));
    const label = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = t('cat' + category);
    const small = document.createElement('small');
    small.textContent = t('exampleCat' + category);
    label.append(strong, small);
    li.append(cards, label);
    list.append(li);
  }
}

// ---------- 牌局记录页 ----------
let selectedRecord = null;
function renderHistory() {
  const records = loadHistory().slice().reverse();
  const s = stats(records);
  const statsBox = $('stats');
  statsBox.replaceChildren();
  const tile = (label, value, cls = '') => {
    const div = document.createElement('div');
    div.className = 'stat';
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = value;
    if (cls) strong.className = cls;
    div.append(span, strong);
    statsBox.append(div);
  };
  tile(t('statHands'), String(s.hands));
  tile(t('statNet'), (s.net > 0 ? '+' : '') + chips(s.net), s.net > 0 ? 'up' : s.net < 0 ? 'down' : '');
  tile(t('statWon'), String(s.won));
  tile(t('statVpip'), Math.round(s.vpip * 100) + '%');
  tile(t('statPfr'), Math.round(s.pfr * 100) + '%');
  tile(t('statBiggest'), chips(s.biggest));

  const list = $('history-list');
  list.replaceChildren();
  const detail = $('history-detail');
  if (!records.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = t('noHistory');
    detail.replaceChildren(p);
    return;
  }
  if (!selectedRecord || !records.some(r => r.id === selectedRecord)) selectedRecord = records[0].id;
  for (const r of records) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-current', String(r.id === selectedRecord));
    const title = document.createElement('span');
    title.className = 'h-title';
    title.textContent = t('handNo', { n: r.hand }) + ' · ' + (r.mode === 'online' ? t('onlineMode') : t('soloMode'));
    if (r.hole) {
      const cards = document.createElement('span');
      cards.className = 'cards';
      for (const c of r.hole) cards.append(cardElement(c));
      title.append(cards);
    }
    const net = document.createElement('span');
    net.className = 'h-net ' + (r.net > 0 ? 'up' : r.net < 0 ? 'down' : '');
    net.textContent = r.net === null ? '—' : (r.net > 0 ? '+' : '') + chips(r.net);
    const sub = document.createElement('span');
    sub.className = 'h-sub';
    sub.textContent = new Date(r.at).toLocaleString(getLanguage() === 'zh' ? 'zh-CN' : 'en-AU', { hour12: false }) + (r.board.length ? ' · ' + cardsText(r.board) : '');
    b.append(title, net, sub);
    b.addEventListener('click', () => { selectedRecord = r.id; renderHistory(); });
    li.append(b);
    list.append(li);
  }
  const record = records.find(r => r.id === selectedRecord);
  const pre = document.createElement('pre');
  pre.textContent = recordText(record);
  detail.replaceChildren(pre);
}
$('go-history').addEventListener('click', () => { renderHistory(); showScreen('history'); });
$('history-back').addEventListener('click', () => showScreen(session ? 'table' : 'lobby'));
$('history-clear').addEventListener('click', () => {
  if (!confirm(t('clearConfirm'))) return;
  clearHistory();
  renderHistory();
});
$('history-export').addEventListener('click', () => {
  const records = loadHistory();
  if (!records.length) return;
  const text = records.map(recordText).join('\n\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'holdem-friends-history.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// ---------- 启动 ----------
$('hero-cards').append(...parseCards('As Kh').map(card => cardElement(card)));
setLanguage(settings.lang || detectLanguage());
applyLanguage();
const roomParam = normalizeCode(new URLSearchParams(location.search).get('room'));
if (roomParam.length === 6) openJoin(roomParam);

// 调试和测试用：在控制台看当前会话
Object.defineProperty(window, '__holdem', { get: () => ({ session, view: currentView(), handName }) });

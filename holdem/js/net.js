// 好友房的网络部分。房主的浏览器就是裁判：发牌、算牌都在房主那里，
// 每个人只收到自己能看的画面数据（buildView），所以看不到别人的底牌。
//
// 连接方式：WebRTC 点对点（PeerJS）。配对要先经过 PeerJS 的免费公共信令服务器（0.peerjs.com），
// 连上之后数据直接在浏览器之间传；直连不通时走 PeerJS 提供的 TURN 中继。
// 地址里加 ?peer=host:port/path 可以换成自建的 PeerJS 服务器；?transport=local 用同一浏览器里的
// BroadcastChannel，开两个标签页就能测试（开发用）。
import { cryptoRandom } from './cards.js';

export const PROTOCOL = 1;
export const ROOM_PREFIX = 'chd44-holdem-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const HEARTBEAT_MS = 4000;
const SILENT_MS = 15000;

export function newRoomCode(random = cryptoRandom) {
  let code = '';
  for (let i = 0; i < 6; i++) code += ALPHABET[random.int(ALPHABET.length)];
  return code;
}

/** 用户输入的房间码：转大写、去掉空格和横线、只留字母表里的字符（链接里带的也一样处理） */
export function normalizeCode(input) {
  return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '').split('').filter(c => ALPHABET.includes(c)).join('').slice(0, 6);
}

export const isRoomCode = code => normalizeCode(code).length === 6 && normalizeCode(code) === String(code);

/** 名字：去掉控制字符、合并空白，最多 16 个字符 */
export function cleanName(input, fallback = 'Guest') {
  const name = Array.from((typeof input === 'string' ? input : '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()).slice(0, 16).join('');
  return name || fallback;
}

export function newToken(random = cryptoRandom) {
  let token = '';
  for (let i = 0; i < 24; i++) token += ALPHABET[random.int(ALPHABET.length)];
  return token;
}

const ACTIONS = new Set(['fold', 'check', 'call', 'raise', 'allin']);
export function sanitizeAction(action) {
  if (!action || !ACTIONS.has(action.type)) return null;
  const clean = { type: action.type };
  if (action.type === 'raise') {
    if (!Number.isInteger(action.to) || action.to < 0) return null;
    clean.to = action.to;
  }
  return clean;
}

/** 一个连接：send(obj)、onMessage(fn)、onClose(fn)、close() */
function makeConnection(sendRaw, closeRaw) {
  const handlers = { message: [], close: [] };
  let closed = false;
  return {
    send(message) { if (!closed) sendRaw(message); },
    onMessage(fn) { handlers.message.push(fn); },
    onClose(fn) { handlers.close.push(fn); },
    close() { if (!closed) { closed = true; closeRaw(); handlers.close.forEach(fn => fn()); } },
    deliver(message) { if (!closed) handlers.message.forEach(fn => fn(message)); },
    lost() { if (!closed) { closed = true; handlers.close.forEach(fn => fn()); } },
    get closed() { return closed; }
  };
}

// ---------- PeerJS ----------
let peerLibrary = null;
export function loadPeerLibrary() {
  if (globalThis.Peer) return Promise.resolve(globalThis.Peer);
  peerLibrary ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../vendor/peerjs.min.js', import.meta.url).href;
    script.onload = () => (globalThis.Peer ? resolve(globalThis.Peer) : reject(new Error('peer-load')));
    script.onerror = () => { peerLibrary = null; reject(new Error('peer-load')); };
    document.head.appendChild(script);
  });
  return peerLibrary;
}

export function peerOptions(search = globalThis.location?.search || '') {
  const custom = new URLSearchParams(search).get('peer');
  if (!custom) return { debug: 0 };
  const url = new URL(/^https?:\/\//.test(custom) ? custom : 'http://' + custom);
  const secure = url.protocol === 'https:';
  return { host: url.hostname, port: Number(url.port) || (secure ? 443 : 80), path: url.pathname || '/', secure, debug: 0 };
}

function waitOpen(peer, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network')), timeoutMs);
    peer.once('open', id => { clearTimeout(timer); resolve(id); });
    peer.once('error', error => { clearTimeout(timer); reject(error); });
  });
}

function wrapPeer(dataConnection) {
  const connection = makeConnection(message => dataConnection.send(message), () => dataConnection.close());
  dataConnection.on('data', message => connection.deliver(message));
  dataConnection.on('close', () => connection.lost());
  dataConnection.on('error', () => connection.lost());
  return connection;
}

export const peerTransport = {
  async host(code) {
    const Peer = await loadPeerLibrary();
    const peer = new Peer(ROOM_PREFIX + code, peerOptions());
    try {
      await waitOpen(peer);
    } catch (error) {
      peer.destroy();
      throw error.type === 'unavailable-id' ? new Error('taken') : error.type === 'browser-incompatible' ? error : new Error('network');
    }
    const listeners = [];
    peer.on('connection', dataConnection => {
      dataConnection.on('open', () => {
        const connection = wrapPeer(dataConnection);
        listeners.forEach(fn => fn(connection));
      });
    });
    // 和信令服务器断开不影响已经连上的人，但新的人进不来：自动重连
    peer.on('disconnected', () => { if (!peer.destroyed) setTimeout(() => peer.reconnect(), 1500); });
    peer.on('error', () => { /* 单个连接的错误在 connection 上处理 */ });
    return { onConnection: fn => listeners.push(fn), close: () => peer.destroy() };
  },
  async connect(code) {
    const Peer = await loadPeerLibrary();
    const peer = new Peer(peerOptions());
    let dataConnection;
    try {
      await waitOpen(peer).catch(() => { throw new Error('network'); });
      dataConnection = peer.connect(ROOM_PREFIX + code, { reliable: true, serialization: 'json' });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('not-found')), 15000);
        dataConnection.on('open', () => { clearTimeout(timer); resolve(); });
        peer.on('error', error => { clearTimeout(timer); reject(new Error(error.type === 'peer-unavailable' ? 'not-found' : 'network')); });
      });
    } catch (error) {
      peer.destroy();
      throw error;
    }
    const connection = wrapPeer(dataConnection);
    connection.onClose(() => setTimeout(() => peer.destroy(), 100));
    return connection;
  }
};

// ---------- 同一浏览器里的测试用连接 ----------
export const localTransport = {
  async host(code) {
    const channel = new BroadcastChannel('holdem-room-' + code);
    const connections = new Map();
    const listeners = [];
    channel.onmessage = ({ data }) => {
      if (!data || data.to !== 'host') return;
      if (data.kind === 'connect') {
        const connection = makeConnection(
          message => channel.postMessage({ to: data.from, kind: 'data', message }),
          () => channel.postMessage({ to: data.from, kind: 'close' })
        );
        connections.set(data.from, connection);
        channel.postMessage({ to: data.from, kind: 'accept' });
        listeners.forEach(fn => fn(connection));
      } else if (data.kind === 'data') connections.get(data.from)?.deliver(data.message);
      else if (data.kind === 'close') { connections.get(data.from)?.lost(); connections.delete(data.from); }
    };
    return { onConnection: fn => listeners.push(fn), close: () => { connections.forEach(c => c.close()); channel.close(); } };
  },
  async connect(code) {
    const channel = new BroadcastChannel('holdem-room-' + code);
    const id = 'c' + newToken().slice(0, 10);
    const connection = makeConnection(
      message => channel.postMessage({ to: 'host', from: id, kind: 'data', message }),
      () => { channel.postMessage({ to: 'host', from: id, kind: 'close' }); channel.close(); }
    );
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { channel.close(); reject(new Error('not-found')); }, 2500);
      channel.onmessage = ({ data }) => {
        if (!data || data.to !== id) return;
        if (data.kind === 'accept') { clearTimeout(timer); resolve(); } else if (data.kind === 'data') connection.deliver(data.message);
        else if (data.kind === 'close') connection.lost();
      };
      channel.postMessage({ to: 'host', from: id, kind: 'connect' });
    });
    return connection;
  }
};

export function pickTransport(search = globalThis.location?.search || '') {
  return new URLSearchParams(search).get('transport') === 'local' ? localTransport : peerTransport;
}

// ---------- 房主 ----------
export class RoomHost {
  constructor({ controller, transport, code, onChange = () => {} }) {
    this.controller = controller;
    this.transport = transport;
    this.code = code;
    this.onChange = onChange;
    this.connections = new Map();  // playerId → connection
    this.tokens = new Map();       // token → playerId
    this.lastSeen = new Map();
    this.counter = 0;
    this.server = null;
    this.heartbeat = null;
  }

  async open() {
    this.server = await this.transport.host(this.code);
    this.server.onConnection(connection => this.accept(connection));
    this.heartbeat = setInterval(() => this.checkAlive(), HEARTBEAT_MS);
  }

  accept(connection) {
    let playerId = null;
    let budget = 40, budgetAt = Date.now();
    connection.onMessage(message => {
      // 简单限流：每秒最多 40 条，多的丢掉
      const now = Date.now();
      if (now - budgetAt > 1000) { budget = 40; budgetAt = now; }
      if (--budget < 0 || !message || typeof message !== 'object') return;
      if (playerId) this.markSeen(playerId);
      if (message.t === 'hello') playerId = this.hello(connection, message) ?? playerId;
      else if (playerId) this.handle(playerId, message, connection);
    });
    connection.onClose(() => {
      if (playerId && this.connections.get(playerId) === connection) {
        this.connections.delete(playerId);
        this.controller.setConnected(playerId, false);
        this.onChange();
      }
    });
  }

  hello(connection, message) {
    if (message.v !== PROTOCOL) {
      connection.send({ t: 'reject', reason: 'version' });
      setTimeout(() => connection.close(), 200);
      return null;
    }
    const token = typeof message.token === 'string' ? message.token.slice(0, 64) : '';
    const name = cleanName(message.name);
    let id = this.tokens.get(token);
    if (id && this.controller.table.player(id)) {
      const old = this.connections.get(id);
      if (old && old !== connection) old.close();
    } else {
      // 正在离座的人这一手结束前还占着座位，所以看有没有真正空着的座位
      if (!this.controller.table.seats.includes(null)) {
        connection.send({ t: 'reject', reason: 'full' });
        setTimeout(() => connection.close(), 200);
        return null;
      }
      id = 'r' + (++this.counter);
      if (token) this.tokens.set(token, id);
      this.controller.addPlayer({ id, name, agent: 'remote' });
    }
    this.connections.set(id, connection);
    this.markSeen(id);
    this.controller.setConnected(id, true);
    connection.send({ t: 'welcome', id, code: this.code });
    this.sendView(id);
    this.onChange();
    return id;
  }

  handle(id, message, connection) {
    switch (message.t) {
      case 'action': {
        const action = sanitizeAction(message.action);
        if (action) this.controller.submit(id, action, Number.isInteger(message.hand) ? message.hand : undefined);
        break;
      }
      case 'rebuy': this.controller.rebuy(id); break;
      case 'away': this.controller.setAway(id, !!message.value); break;
      case 'leave':
        this.forget(id);
        this.controller.removePlayer(id);
        connection.close();
        break;
      case 'ping': connection.send({ t: 'pong', at: message.at }); break;
      default: break;
    }
  }

  markSeen(id) {
    this.lastSeen.set(id, Date.now());
    const player = this.controller.table.player(id);
    if (player && !player.connected && this.connections.has(id)) this.controller.setConnected(id, true);
  }

  /** 很久没收到心跳的当成掉线（关掉标签页时 WebRTC 不一定马上报告断开） */
  checkAlive() {
    const now = Date.now();
    for (const [id] of this.connections) {
      const player = this.controller.table.player(id);
      if (player && player.connected && now - (this.lastSeen.get(id) || 0) > SILENT_MS) this.controller.setConnected(id, false);
    }
  }

  forget(id) {
    for (const [token, owner] of this.tokens) if (owner === id) this.tokens.delete(token);
    this.connections.delete(id);
  }

  kick(id) {
    const connection = this.connections.get(id);
    if (connection) {
      connection.send({ t: 'kicked' });
      setTimeout(() => connection.close(), 200);
    }
    this.forget(id);
    this.controller.removePlayer(id);
  }

  sendView(id) {
    const connection = this.connections.get(id);
    if (connection) connection.send({ t: 'view', view: this.controller.viewFor(id) });
  }

  broadcast() {
    for (const id of this.connections.keys()) this.sendView(id);
  }

  close() {
    clearInterval(this.heartbeat);
    for (const connection of this.connections.values()) {
      connection.send({ t: 'closed' });
    }
    setTimeout(() => this.server?.close(), 300);
  }
}

// ---------- 加入的人 ----------
export class RoomClient {
  constructor({ transport, code, name, token, onView = () => {}, onStatus = () => {} }) {
    Object.assign(this, { transport, code, name, token, onView, onStatus });
    this.id = null;
    this.connection = null;
    this.closedByUs = false;
    this.retries = 0;
    this.lastMessage = Date.now();
    this.heartbeat = null;
  }

  async connect() {
    const connection = await this.transport.connect(this.code);
    this.connection = connection;
    this.lastMessage = Date.now();
    const welcome = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('not-found')), 10000);
      this.resolveWelcome = id => { clearTimeout(timer); resolve(id); };
      this.rejectWelcome = reason => { clearTimeout(timer); reject(new Error(reason)); };
    });
    connection.onMessage(message => this.handle(message));
    connection.onClose(() => this.lost(connection));
    connection.send({ t: 'hello', v: PROTOCOL, name: this.name, token: this.token });
    let id;
    try {
      id = await welcome;
    } catch (error) {
      // 没等到欢迎就放弃这条连接；先解绑，免得它的关闭事件再触发一轮重连
      this.connection = null;
      connection.close();
      throw error;
    }
    clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      this.connection?.send({ t: 'ping', at: Date.now() });
      if (Date.now() - this.lastMessage > SILENT_MS) this.onStatus('unstable');
    }, HEARTBEAT_MS);
    this.retries = 0;
    return id;
  }

  handle(message) {
    if (!message || typeof message !== 'object') return;
    this.lastMessage = Date.now();
    switch (message.t) {
      case 'welcome': this.id = typeof message.id === 'string' ? message.id.slice(0, 40) : ''; this.resolveWelcome?.(this.id); this.onStatus('joined'); break;
      case 'view': if (message.view && typeof message.view === 'object') this.onView(message.view); break;
      case 'reject': this.closedByUs = true; this.rejectWelcome?.(message.reason === 'full' ? 'full' : message.reason === 'version' ? 'version' : 'rejected'); break;
      case 'kicked': this.closedByUs = true; this.onStatus('kicked'); break;
      case 'closed': this.closedByUs = true; this.onStatus('closed'); break;
      default: break;
    }
  }

  lost(connection) {
    if (connection !== this.connection || this.closedByUs) return;
    this.connection = null;
    clearInterval(this.heartbeat);
    this.retry();
  }

  /** 按 1.5、3、6… 秒退避重连，最多 6 次；同一个 token 会回到原来的座位 */
  retry() {
    if (this.retries >= 6) { this.onStatus('lost'); return; }
    this.onStatus('reconnecting');
    const delay = Math.min(15000, 1500 * Math.pow(2, this.retries++));
    setTimeout(async () => {
      if (this.closedByUs) return;
      try { await this.connect(); } catch (error) {
        if (['full', 'version', 'rejected'].includes(error.message)) this.onStatus(error.message);
        else this.retry();
      }
    }, delay);
  }

  /** 页面从往返缓存里恢复（比如按了返回）：连接已经在 pagehide 时关掉了，重新连 */
  resume() {
    this.closedByUs = false;
    this.retries = 0;
    this.connection = null;
    this.retry();
  }

  send(message) { this.connection?.send(message); }
  act(action, hand) { this.send({ t: 'action', action, hand }); }

  leave() {
    this.closedByUs = true;
    clearInterval(this.heartbeat);
    this.send({ t: 'leave' });
    setTimeout(() => this.connection?.close(), 150);
  }
}

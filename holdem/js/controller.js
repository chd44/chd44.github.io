// 牌桌控制器：拿着规则引擎，负责「轮到谁、等多久、下一手什么时候开始」。
// 座位上的人分三种：local（这台设备上的玩家）、bot（AI，在这台设备上算）、remote（好友房里连进来的人）。
// 单人练习只有 local + bot；好友房的房主再加上 remote，房主的控制器就是整张桌子的裁判。
import { HoldemTable } from './engine.js';
import { buildView } from './view.js';
import { decide, decisionContext } from './ai.js';
import { cryptoRandom, mathRandom } from './cards.js';

export const DEFAULTS = {
  maxSeats: 8,
  smallBlind: 10,
  bigBlind: 20,
  startingStack: 2000,
  mode: 'cash',        // cash：输光了可以补码；tournament：淘汰赛，盲注定时上涨，剩最后一人结束
  levelHands: 8,       // 淘汰赛每几手升一级盲注
  turnSeconds: 0,      // 0 = 不限时（单人练习）；好友房默认 30 秒
  botSpeed: 'normal',  // fast / normal / slow
  helper: true,        // 好友房里是否允许「练习助手」
  resultMs: 3400,
  runoutMs: 1000
};

// 盲注级别：在起始盲注基础上的倍数
const LEVELS = [1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256];
const DISCONNECT_GRACE = 20000;
const THINK = { fast: [180, 420], normal: [480, 1150], slow: [1000, 2200] };

export class TableController {
  constructor(settings = {}, { onChange = () => {}, random = cryptoRandom, aiRandom = mathRandom, now = () => Date.now(), timers = null } = {}) {
    this.settings = { ...DEFAULTS, ...settings };
    this.onChange = onChange;
    this.aiRandom = aiRandom;
    this.now = now;
    this.timers = timers || { set: (fn, ms) => setTimeout(fn, ms), clear: id => clearTimeout(id) };
    this.table = new HoldemTable({
      maxSeats: this.settings.maxSeats,
      smallBlind: this.settings.smallBlind,
      bigBlind: this.settings.bigBlind,
      random
    });
    this.state = 'lobby';  // lobby → playing ⇄ waiting → over
    this.timer = null;
    this.stage = null;     // 当前在等什么：{ key, at }
    this.level = 0;
    this.handsAtLevel = 0;
    this.finished = [];    // 淘汰赛被淘汰的顺序（先出局的在前）
    this.notices = [];     // 给界面的一次性提示：补码、离座、升盲
  }

  get players() { return this.table.players; }

  addPlayer({ id, name, agent = 'local', style, difficulty, stack }) {
    const player = this.table.addPlayer({
      id, name, stack: stack ?? this.settings.startingStack,
      kind: agent === 'bot' ? 'bot' : 'human', agent, style, difficulty,
      connected: true, buyIns: 1, timeouts: 0
    });
    this.changed();
    return player;
  }

  /** 离座：不在这一手里就马上走；在这一手里（弃了牌也算）就等这一手结算完，轮到他时自动弃牌 */
  removePlayer(id) {
    const player = this.table.player(id);
    if (!player) return;
    const hand = this.table.hand;
    if (hand && hand.phase !== 'complete' && hand.players[id]) player.leaving = true;
    else this.table.removePlayer(id);
    this.changed();
  }

  setConnected(id, connected) {
    const player = this.table.player(id);
    if (!player || player.connected === connected) return;
    player.connected = connected;
    // 掉线被自动设成离开的人，连回来就回到牌桌；自己点了「暂时离开」的不动
    if (connected && player.away && !player.awayByChoice && player.stack > 0) {
      player.away = false;
      player.sittingOut = false;
    }
    this.changed();
  }

  /** 暂时离开 / 回到牌桌（下一手生效） */
  setAway(id, away) {
    const player = this.table.player(id);
    if (!player) return;
    player.away = away;
    player.awayByChoice = away;
    player.timeouts = 0;
    player.sittingOut = away || player.stack === 0;
    this.changed();
  }

  canRebuy(id) {
    const player = this.table.player(id);
    return !!player && this.settings.mode === 'cash' && player.stack === 0
      && !(this.table.hand?.players[id] && this.table.hand.phase !== 'complete');
  }

  rebuy(id) {
    if (!this.canRebuy(id)) return false;
    const player = this.table.player(id);
    player.stack = this.settings.startingStack;
    player.buyIns += 1;
    player.sittingOut = false;
    player.away = false;
    player.awayByChoice = false;
    player.busted = false;
    this.notices.push({ t: 'rebuy', id, amount: player.stack });
    this.changed();
    return true;
  }

  start() {
    if (this.state === 'lobby') this.state = 'playing';
    this.changed();
  }

  stop() {
    this.state = 'over';
    this.timers.clear(this.timer);
    this.timer = null;
  }

  /** 玩家（本机或远端）提交行动。handNumber 用来丢掉过时的点击 */
  submit(id, action, handNumber) {
    const hand = this.table.hand;
    if (!hand || hand.phase !== 'betting' || hand.toAct !== id) return false;
    if (handNumber !== undefined && handNumber !== hand.number) return false;
    try {
      this.table.act(id, action);
    } catch {
      return false;
    }
    const player = this.table.player(id);
    if (player) player.timeouts = 0;
    this.changed();
    return true;
  }

  changed() {
    this.schedule();
    this.emit();
  }

  /** 通知界面；提示只发一次 */
  emit() {
    this.onChange(this);
    this.notices = [];
  }

  /** 安排下一件事：AI 思考、超时、全下后发牌、下一手。每次状态变化都会重新算，但同一件事的截止时间不变 */
  schedule() {
    this.timers.clear(this.timer);
    this.timer = null;
    if (this.state === 'lobby' || this.state === 'over') return;
    const hand = this.table.hand;
    const now = this.now();
    let key, wait, run;

    if (!hand || hand.phase === 'complete') {
      key = 'next:' + (hand ? hand.number : 0) + ':' + this.state;
      wait = hand && this.state === 'playing' ? this.settings.resultMs : 600;
      run = () => this.nextHand();
    } else if (hand.phase === 'runout') {
      key = 'run:' + hand.number + ':' + hand.board.length;
      wait = this.settings.runoutMs;
      run = () => { this.table.step(); this.changed(); };
    } else {
      const id = hand.toAct;
      const player = this.table.player(id);
      key = 'turn:' + hand.number + ':' + hand.log.length + ':' + id;
      if (player.leaving) {
        wait = 250;
        run = () => this.autoAct(id, false);
      } else if (player.agent === 'bot') {
        const [lo, hi] = THINK[this.settings.botSpeed] || THINK.normal;
        wait = lo + Math.floor(this.aiRandom.float() * (hi - lo));
        run = () => this.botAct(id);
      } else {
        // 真人：回合的截止时间在轮到他时就定下（不限时就没有）。掉线的人最多再等 DISCONNECT_GRACE，免得整桌卡住；
        // 连回来恢复原来的截止时间。断开再连不会多出时间，不然就能一直拖着不行动
        const offline = player.agent === 'remote' && !player.connected;
        if (!this.stage || this.stage.key !== key) {
          const limit = this.settings.turnSeconds > 0 ? this.settings.turnSeconds * 1000 : null;
          this.stage = { key, deadline: limit === null ? null : now + limit, turnStart: now, offlineAt: null };
        }
        const stage = this.stage;
        if (offline) stage.offlineAt ??= now;
        else stage.offlineAt = null;
        const grace = stage.offlineAt === null ? null : stage.offlineAt + DISCONNECT_GRACE;
        stage.at = stage.deadline === null ? grace : grace === null ? stage.deadline : Math.min(stage.deadline, grace);
        stage.started = stage.deadline === null ? stage.offlineAt : stage.turnStart;  // 倒计时圈从哪里算起
        if (stage.at === null) return;  // 不限时、人也在：等他自己点
        this.timer = this.timers.set(() => this.autoAct(id, true), Math.max(0, this.stage.at - now));
        return;
      }
    }
    if (!this.stage || this.stage.key !== key) this.stage = { key, at: now + wait, started: now };
    this.timer = this.timers.set(run, Math.max(0, this.stage.at - now));
  }

  botAct(id) {
    const table = this.table;
    if (table.hand?.phase !== 'betting' || table.hand.toAct !== id) return;
    const player = table.player(id);
    let action;
    try {
      action = decide(decisionContext(table, id), { style: player.style, difficulty: player.difficulty, random: this.aiRandom });
      table.act(id, action);
    } catch {
      // 兜底：AI 万一给出不合法的行动，就过牌或弃牌，不让牌局卡住
      const legal = table.legalActions(id);
      table.act(id, { type: legal.canCheck ? 'check' : 'fold' });
    }
    this.changed();
  }

  /** 超时或离座：能过牌就过牌，不然弃牌。连续超时两次就算暂时离开 */
  autoAct(id, timedOut) {
    const table = this.table;
    if (table.hand?.phase !== 'betting' || table.hand.toAct !== id) return;
    const legal = table.legalActions(id);
    table.act(id, { type: legal.canCheck ? 'check' : 'fold' });
    const player = table.player(id);
    if (timedOut && player) {
      player.timeouts = (player.timeouts || 0) + 1;
      if (player.timeouts >= 2) {
        player.away = true;
        player.sittingOut = true;
        this.notices.push({ t: 'away', id });
      }
    }
    this.changed();
  }

  nextHand() {
    const table = this.table;
    if (this.state === 'over') return;
    for (const player of table.players) if (player.leaving) table.removePlayer(player.id);

    // 同一手里出局的几个人，这一手开始时筹码少的先算出局（名次靠后），不按座位顺序
    const startStack = id => table.hand?.players[id]?.startStack ?? 0;
    const busted = table.players.filter(p => p.stack === 0).sort((a, b) => startStack(a.id) - startStack(b.id));
    for (const player of busted) {
      if (this.settings.mode === 'tournament') {
        if (!player.eliminated) {
          player.eliminated = true;
          player.sittingOut = true;
          this.finished.push({ id: player.id, name: player.name, hand: table.handNumber });
        }
      } else if (player.agent === 'bot') {
        player.stack = this.settings.startingStack;
        player.buyIns += 1;
        this.notices.push({ t: 'rebuy', id: player.id, amount: player.stack });
      } else {
        player.busted = true;
        player.sittingOut = true;
      }
    }
    for (const player of table.players) {
      if (player.agent === 'remote' && !player.connected && !player.sittingOut) {
        player.away = true;
        player.sittingOut = true;
      }
    }

    if (this.settings.mode === 'tournament') {
      const alive = table.players.filter(p => !p.eliminated);
      const human = table.players.find(p => p.agent === 'local');
      if (alive.length <= 1 || (human && human.eliminated && !table.players.some(p => p.agent === 'remote' && !p.eliminated))) {
        this.state = 'over';
        this.timers.clear(this.timer);
        this.emit();
        return;
      }
      if (table.handNumber > 0) this.handsAtLevel += 1;
      if (this.handsAtLevel >= this.settings.levelHands && this.level < LEVELS.length - 1) {
        this.level += 1;
        this.handsAtLevel = 0;
        table.setBlinds(...levelBlinds(this.settings.smallBlind, this.settings.bigBlind, this.level));
        this.notices.push({ t: 'level', level: this.level + 1, sb: table.smallBlind, bb: table.bigBlind });
      }
    }

    // 单人练习里自己输光了：等你补码，不让 AI 自己接着打
    const solo = !table.players.some(p => p.agent === 'remote');
    const local = table.players.find(p => p.agent === 'local');
    if (!table.canStartHand() || (solo && local && local.busted)) {
      this.state = 'waiting';
      this.emit();
      return;
    }
    this.state = 'playing';
    table.startHand();
    this.changed();
  }

  /** 名次：淘汰赛里按出局顺序倒过来，还在的按筹码 */
  standings() {
    const alive = this.table.players.filter(p => !p.eliminated).sort((a, b) => b.stack - a.stack)
      .map(p => ({ id: p.id, name: p.name, stack: p.stack }));
    const out = this.finished.slice().reverse().map(f => ({ id: f.id, name: f.name, stack: 0 }));
    return alive.concat(out).map((entry, index) => ({ ...entry, place: index + 1 }));
  }

  viewFor(id) {
    const stage = this.stage;
    const hand = this.table.hand;
    let turn = null;
    if (hand && hand.phase === 'betting' && stage && stage.at && stage.key.startsWith('turn:')) {
      const player = this.table.player(hand.toAct);
      if (player && player.agent !== 'bot') {
        turn = { id: hand.toAct, remainingMs: Math.max(0, stage.at - this.now()), totalMs: stage.at - stage.started };
      }
    }
    const me = this.table.player(id);
    return buildView(this.table, id, {
      turn,
      game: {
        state: this.state,
        mode: this.settings.mode,
        level: this.level + 1,
        handsToNextLevel: this.settings.mode === 'tournament' ? Math.max(0, this.settings.levelHands - this.handsAtLevel) : null,
        standings: this.settings.mode === 'tournament' ? this.standings() : null,
        canRebuy: this.canRebuy(id),
        away: !!me?.away,
        buyIns: me?.buyIns ?? 0,
        startingStack: this.settings.startingStack,
        turnSeconds: this.settings.turnSeconds,
        helper: this.settings.helper
      },
      notices: this.notices.slice()
    });
  }
}

/** 第 level 级（从 0 开始）的盲注：小盲取整到好看的数，大盲按起始的比例跟着小盲走，免得出现 80/150、100/250 这种 */
export function levelBlinds(smallBlind, bigBlind, level) {
  const sb = niceChips(smallBlind * LEVELS[Math.min(level, LEVELS.length - 1)]);
  return [sb, Math.round(sb * bigBlind / smallBlind)];
}

/** 盲注取整到好看的数：10、15、25、30、40、50、60、75、100、150… */
export function niceChips(value) {
  if (value < 10) return Math.max(1, Math.round(value));
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10];
  let best = steps[0] * magnitude;
  for (const step of steps) if (Math.abs(step * magnitude - value) < Math.abs(best - value)) best = step * magnitude;
  return Math.round(best);
}

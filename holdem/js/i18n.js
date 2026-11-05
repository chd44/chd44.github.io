// 界面文字（中 / 英）和牌、牌型、行动的说法。默认跟随主页保存的语言，其次看浏览器语言。
import { rankOf, suitOf } from './cards.js';

const zh = {
  pageTitle: '好友牌桌 · Hold\'em Friends',
  skip: '跳到主要内容', backHome: 'Jefferson 的主页', language: '语言', brand: '好友牌桌',
  heroKicker: 'HOLD\'EM FRIENDS', heroTitle: '好友牌桌', heroText: '和 AI 对手练手，或者开个房间和朋友一起玩。只用虚拟筹码，不涉及任何真钱。',
  soloTitle: '单人练习', soloText: '和 1～7 个打法各异的 AI 对手同桌，附带练习助手和牌局记录。',
  hostTitle: '创建好友房', hostText: '生成房间码发给朋友，打开链接就能入座，不用注册。',
  joinTitle: '加入好友房', joinText: '输入朋友给你的 6 位房间码。',
  historyTitle: '牌局记录', rulesTitle: '玩法说明', settingsTitle: '设置',
  lobbyNote: '非官方练习项目 · 仅虚拟筹码 · 好友房通过 WebRTC 点对点连接',
  start: '开始', create: '创建房间', join: '加入', cancel: '取消', close: '关闭', back: '返回', confirm: '确定',
  yourName: '你的名字', namePlaceholder: '例如：Jefferson', opponents: 'AI 对手', difficulty: '难度',
  easy: '轻松', normal: '标准', hard: '挑战', mode: '玩法', modeCash: '练习桌（输光可补码）', modeTournament: '淘汰赛（盲注每 8 手上涨）',
  startingStack: '起始筹码', blinds: '盲注', seats: '座位数', turnTimer: '每步限时', seconds: '{n} 秒', noLimit: '不限时',
  allowHelper: '允许大家用练习助手', roomCode: '房间码', roomCodePlaceholder: '例如 K7Q2MX', addBots: '开局时加 AI',
  botSpeed: 'AI 出牌速度', speedFast: '快', speedNormal: '正常', speedSlow: '慢', fourColor: '四色牌（方块蓝、梅花绿）',
  helperDefault: '默认打开练习助手',
  handNo: '第 {n} 手', blindsShort: '盲注 {sb}/{bb}', level: '第 {n} 级', nextLevel: '{n} 手后升盲',
  leave: '离开', leaveConfirm: '确定离开这张牌桌吗？', helper: '练习助手', log: '记录', copyLink: '复制邀请链接', copied: '已复制',
  copyFailed: '复制失败，请手动复制：{text}',
  fold: '弃牌', check: '过牌', call: '跟注 {n}', callAllIn: '全下跟注 {n}', bet: '下注', raise: '加注', raiseTo: '加注到 {n}', betN: '下注 {n}', allIn: '全下 {n}',
  minRaise: '最小', halfPot: '½ 底池', threeQuarterPot: '¾ 底池', pot: '底池', potN: '底池 {n}', amount: '金额',
  yourTurn: '轮到你了', waitingFor: '等待 {name} 行动…', waitingNext: '下一手马上开始…', youFolded: '你已弃牌，看看其他人怎么打。',
  sittingOutNote: '你暂时离开了牌桌。', comeBack: '回到牌桌', takeBreak: '暂时离开',
  busted: '筹码输光了', bustedText: '练习桌可以免费补码，继续练。', rebuy: '补码 {n} 继续', toLobby: '返回大厅',
  gameOver: '比赛结束', placeText: '你获得第 {n} 名', winnerText: '{name} 拿下了冠军', playAgain: '再来一局',
  standings: '名次', chips: '筹码',
  hostLobbyTitle: '房间已创建', hostLobbyText: '把邀请链接或房间码发给朋友。人齐了就开始；开局后进来的人从下一手入座。',
  players: '玩家', addBot: '加一个 AI', removeBot: '移除', kick: '请出', startGame: '开始游戏', needTwo: '至少要 2 个人才能开始',
  waitingHost: '已加入房间，等房主开始…', waitingPlayers: '等待更多玩家入座…',
  connecting: '正在连接…', reconnecting: '连接断了，正在重连…', hostLeft: '房主已关闭房间。', kicked: '你被房主请出了房间。',
  roomFull: '房间已经满了。', roomNotFound: '找不到这个房间：房间码不对，或者房主已经关闭页面。', versionMismatch: '房主用的版本不一样，请双方刷新页面。',
  peerLoadFailed: '连接组件加载失败，请检查网络后重试。', networkFailed: '连不上配对服务器。可能是网络屏蔽了 WebRTC，换个网络（比如手机热点）试试。',
  connectionLost: '和房主的连接断开了。', offline: '掉线', bot: 'AI', you: '你', host: '房主', away: '暂离',
  hostKeepOpen: '你是房主：牌局在你的浏览器里运行，关掉这个页面房间就结束了。',
  sb: '小盲', bbShort: '大盲', dealer: '庄', buttonTag: '按钮',
  winsPot: '{name} 赢得 {n}', winsSidePot: '{name} 赢得边池 {n}', split: '{names} 平分 {n}', withHand: '{text}', uncalled: '未被跟注的 {n} 退还给 {name}',
  actFold: '{name} 弃牌', actCheck: '{name} 过牌', actCall: '{name} 跟注 {n}', actBet: '{name} 下注 {n}', actRaise: '{name} 加注到 {n}', actAllIn: '（全下）',
  actSb: '{name} 下小盲 {n}', actBb: '{name} 下大盲 {n}', streetFlop: '翻牌', streetTurn: '转牌', streetRiver: '河牌', streetPreflop: '翻牌前', showdown: '摊牌',
  shows: '{name} 亮出 {cards}（{hand}）', noticeRebuy: '{name} 补了 {n} 筹码', noticeAway: '{name} 超时两次，暂时离开', noticeLevel: '升盲：{sb}/{bb}',
  helperHand: '你的牌型', helperStart: '起手牌 {label}：排在所有起手牌的前 {pct}%', helperEquity: '胜率估计', helperEquityText: '约 {pct}%（对 {n} 名对手）',
  helperOdds: '底池赔率', helperOddsText: '跟注 {call} 去争 {pot}，需要约 {pct}% 的胜率才不亏', helperNoBet: '现在可以免费过牌',
  adviceStrong: '胜率明显高于需要的胜率：可以考虑加注拿价值。', adviceCall: '胜率高于需要的胜率：跟注是有利可图的。',
  adviceClose: '胜率和需要的差不多：跟不跟都说得过去，看对手风格。', adviceFold: '胜率低于需要的胜率：除非想诈唬，弃牌更稳。',
  adviceFree: '可以免费看下一张牌；牌力强时下注拿价值。', helperCalculating: '计算中…', helperOff: '在设置或桌面工具栏里打开练习助手。',
  helperDisabled: '房主关闭了练习助手。',
  stats: '统计', statHands: '手数', statNet: '总盈亏', statWon: '赢下', statVpip: '入池率', statPfr: '翻前加注率', statBiggest: '最大底池',
  noHistory: '还没有记录。打几手之后这里会出现每一手的详情。', export: '导出文本', clearHistory: '清空记录', clearConfirm: '确定清空所有牌局记录吗？',
  historyHint: '记录只保存在这台设备的浏览器里，最多保留最近 200 手。', soloMode: '单人', onlineMode: '好友房',
  holeCards: '你的底牌', board: '公共牌', result: '结果', net: '本手', none: '无',
  rulesIntro: '每人两张底牌，加上五张公共牌，用其中任意五张组成最大的牌型。翻牌前、翻牌、转牌、河牌各有一轮下注。',
  rulesRanking: '牌型从大到小', rulesTerms: '常用说法',
  termBlinds: '盲注：每手开始前，按钮左边两位被迫下的小盲和大盲。', termCall: '跟注：补到和当前最高下注一样多。',
  termRaise: '加注：至少要比上一次加注多出同样的额度。', termAllIn: '全下：押上全部筹码。筹码不够跟注时也可以全下，只争自己投入那部分对应的底池。',
  termSidePot: '边池：有人全下后，其他人继续下的筹码另成一池，全下的人赢不到。',
  termPosition: '位置：越晚行动看到的信息越多，按钮位（庄）最后行动。',
  styleTag: '紧凶', styleLag: '松凶', styleStation: '跟注站', styleRock: '稳如石', styleManiac: '疯狂', styleSolid: '均衡',
  cat0: '高牌', cat1: '一对', cat2: '两对', cat3: '三条', cat4: '顺子', cat5: '同花', cat6: '葫芦', cat7: '四条', cat8: '同花顺', royal: '皇家同花顺',
  exampleCat0: 'A K 9 5 3 不同花', exampleCat1: '两张同点', exampleCat2: '两个对子', exampleCat3: '三张同点', exampleCat4: '五张连续点数',
  exampleCat5: '五张同花色', exampleCat6: '三条加一对', exampleCat7: '四张同点', exampleCat8: '同花色的顺子',
  noscript: '这个小游戏需要启用 JavaScript。', virtualOnly: '只用虚拟筹码，不能充值，也没有任何奖励。',
  helperShort: '助手', fourColorShort: '四色', tableSettings: '牌桌设置',
  emptySeat: '空位', allInTag: '全下', thinking: '思考中…', toCallN: '要跟 {n}', allInShort: '全下', nameYou: '{name}（你）',
  tag_check: '过牌', tag_call: '跟注', tag_bet: '下注', tag_raise: '加注', tag_fold: '弃牌',
  helperIdle: '下一手发牌后，这里会显示你的牌型、胜率估计和底池赔率。',
  helperPreflopNote: '这手牌单挑一手随机牌的胜率约 {pct}%。胜率是按对手大致范围随机模拟估的，只作参考。',
  advicePreStrong: '顶级起手牌：通常加注入池，面对加注也可以再加注。', advicePreGood: '不错的起手牌：可以加注入池；前面有人加注时，跟注或弃牌要看位置。',
  advicePreMedium: '一般的起手牌：位置靠后、没人加注时可以玩；面对加注多半弃牌。', advicePreWeak: '偏弱的起手牌：通常弃牌，除非能免费看牌。',
  advicePreFree: '可以免费看翻牌，不用再投入筹码。',
  tableTitle: '好友牌桌 · 牌桌', eliminated: '出局', leaderText: '目前筹码领先：{name}', championText: '你拿下了冠军！'
};

const en = {
  pageTitle: 'Hold\'em Friends',
  skip: 'Skip to main content', backHome: 'Jefferson\'s homepage', language: 'Language', brand: 'Hold\'em Friends',
  heroKicker: 'HOLD\'EM FRIENDS', heroTitle: 'Hold\'em Friends', heroText: 'Practise against AI opponents, or open a room and play with friends. Virtual chips only — no real money, ever.',
  soloTitle: 'Practice table', soloText: 'Sit with 1–7 AI opponents who all play differently, with a practice helper and hand history.',
  hostTitle: 'Create a room', hostText: 'Share a room code; friends join from the link, no sign-up.',
  joinTitle: 'Join a room', joinText: 'Enter the 6-character code your friend sent you.',
  historyTitle: 'Hand history', rulesTitle: 'How to play', settingsTitle: 'Settings',
  lobbyNote: 'Unofficial practice project · virtual chips only · rooms connect peer-to-peer over WebRTC',
  start: 'Start', create: 'Create room', join: 'Join', cancel: 'Cancel', close: 'Close', back: 'Back', confirm: 'OK',
  yourName: 'Your name', namePlaceholder: 'e.g. Jefferson', opponents: 'AI opponents', difficulty: 'Difficulty',
  easy: 'Relaxed', normal: 'Standard', hard: 'Tough', mode: 'Format', modeCash: 'Practice table (free rebuys)', modeTournament: 'Knockout (blinds rise every 8 hands)',
  startingStack: 'Starting chips', blinds: 'Blinds', seats: 'Seats', turnTimer: 'Time per move', seconds: '{n} s', noLimit: 'No limit',
  allowHelper: 'Let everyone use the practice helper', roomCode: 'Room code', roomCodePlaceholder: 'e.g. K7Q2MX', addBots: 'AI players to start with',
  botSpeed: 'AI speed', speedFast: 'Fast', speedNormal: 'Normal', speedSlow: 'Slow', fourColor: 'Four-colour deck (blue diamonds, green clubs)',
  helperDefault: 'Show the practice helper by default',
  handNo: 'Hand {n}', blindsShort: 'Blinds {sb}/{bb}', level: 'Level {n}', nextLevel: 'blinds up in {n}',
  leave: 'Leave', leaveConfirm: 'Leave this table?', helper: 'Practice helper', log: 'Log', copyLink: 'Copy invite link', copied: 'Copied',
  copyFailed: 'Could not copy automatically. Copy this: {text}',
  fold: 'Fold', check: 'Check', call: 'Call {n}', callAllIn: 'Call all-in {n}', bet: 'Bet', raise: 'Raise', raiseTo: 'Raise to {n}', betN: 'Bet {n}', allIn: 'All-in {n}',
  minRaise: 'Min', halfPot: '½ pot', threeQuarterPot: '¾ pot', pot: 'Pot', potN: 'Pot {n}', amount: 'Amount',
  yourTurn: 'Your turn', waitingFor: 'Waiting for {name}…', waitingNext: 'Next hand starting…', youFolded: 'You folded — watch how the others play it.',
  sittingOutNote: 'You are sitting out.', comeBack: 'Sit back in', takeBreak: 'Sit out',
  busted: 'Out of chips', bustedText: 'Rebuys are free at the practice table.', rebuy: 'Rebuy {n} and continue', toLobby: 'Back to lobby',
  gameOver: 'Game over', placeText: 'You finished #{n}', winnerText: '{name} wins the knockout', playAgain: 'Play again',
  standings: 'Standings', chips: 'Chips',
  hostLobbyTitle: 'Room created', hostLobbyText: 'Send the invite link or room code to your friends. Start when everyone is in; late arrivals are dealt in from the next hand.',
  players: 'Players', addBot: 'Add an AI', removeBot: 'Remove', kick: 'Remove', startGame: 'Start game', needTwo: 'You need at least 2 players to start',
  waitingHost: 'You\'re in. Waiting for the host to start…', waitingPlayers: 'Waiting for more players…',
  connecting: 'Connecting…', reconnecting: 'Connection lost, reconnecting…', hostLeft: 'The host closed the room.', kicked: 'The host removed you from the room.',
  roomFull: 'The room is full.', roomNotFound: 'Room not found: the code is wrong or the host has closed the page.', versionMismatch: 'You and the host are on different versions. Both of you, please reload.',
  peerLoadFailed: 'Could not load the connection library. Check your network and try again.', networkFailed: 'Could not reach the matchmaking server. Your network may block WebRTC — try another one, such as a phone hotspot.',
  connectionLost: 'Lost the connection to the host.', offline: 'offline', bot: 'AI', you: 'You', host: 'Host', away: 'away',
  hostKeepOpen: 'You are the host: the game runs in your browser, so the room closes if you close this page.',
  sb: 'SB', bbShort: 'BB', dealer: 'D', buttonTag: 'button',
  winsPot: '{name} wins {n}', winsSidePot: '{name} wins side pot {n}', split: '{names} split {n}', withHand: '{text}', uncalled: '{n} uncalled returned to {name}',
  actFold: '{name} folds', actCheck: '{name} checks', actCall: '{name} calls {n}', actBet: '{name} bets {n}', actRaise: '{name} raises to {n}', actAllIn: ' (all-in)',
  actSb: '{name} posts small blind {n}', actBb: '{name} posts big blind {n}', streetFlop: 'Flop', streetTurn: 'Turn', streetRiver: 'River', streetPreflop: 'Preflop', showdown: 'Showdown',
  shows: '{name} shows {cards} ({hand})', noticeRebuy: '{name} rebought {n}', noticeAway: '{name} timed out twice and is sitting out', noticeLevel: 'Blinds up: {sb}/{bb}',
  helperHand: 'Your hand', helperStart: 'Starting hand {label}: top {pct}% of all starting hands', helperEquity: 'Equity estimate', helperEquityText: 'about {pct}% (vs {n} opponents)',
  helperOdds: 'Pot odds', helperOddsText: 'Call {call} to win {pot}: you need about {pct}% to break even', helperNoBet: 'You can check for free',
  adviceStrong: 'Well ahead of the equity you need: consider raising for value.', adviceCall: 'Above the equity you need: calling is profitable.',
  adviceClose: 'Close to the equity you need: either is fine — think about this opponent.', adviceFold: 'Below the equity you need: folding is the safer play unless you are bluffing.',
  adviceFree: 'You can see the next card for free; bet when you are strong.', helperCalculating: 'Calculating…', helperOff: 'Turn the practice helper on from the table toolbar or settings.',
  helperDisabled: 'The host has turned the practice helper off.',
  stats: 'Stats', statHands: 'Hands', statNet: 'Net', statWon: 'Won', statVpip: 'VPIP', statPfr: 'PFR', statBiggest: 'Biggest pot',
  noHistory: 'No hands yet. Play a few and each one shows up here.', export: 'Export as text', clearHistory: 'Clear history', clearConfirm: 'Clear all saved hands?',
  historyHint: 'Saved only in this browser, up to the latest 200 hands.', soloMode: 'Solo', onlineMode: 'Room',
  holeCards: 'Your cards', board: 'Board', result: 'Result', net: 'This hand', none: 'none',
  rulesIntro: 'Everyone gets two private cards and shares five board cards; your best five of the seven make your hand. There is a betting round preflop, on the flop, the turn and the river.',
  rulesRanking: 'Hands from best to worst', rulesTerms: 'Terms',
  termBlinds: 'Blinds: forced bets from the two players left of the button before each hand.', termCall: 'Call: match the current highest bet.',
  termRaise: 'Raise: you must raise by at least as much as the previous raise.', termAllIn: 'All-in: bet all your chips. You can go all-in for less than a call and play for the part of the pot you matched.',
  termSidePot: 'Side pot: once someone is all-in, further bets go into a separate pot they cannot win.',
  termPosition: 'Position: acting later gives you more information; the button (dealer) acts last after the flop.',
  styleTag: 'Tight-aggressive', styleLag: 'Loose-aggressive', styleStation: 'Calling station', styleRock: 'Rock', styleManiac: 'Maniac', styleSolid: 'Balanced',
  cat0: 'High card', cat1: 'Pair', cat2: 'Two pair', cat3: 'Three of a kind', cat4: 'Straight', cat5: 'Flush', cat6: 'Full house', cat7: 'Four of a kind', cat8: 'Straight flush', royal: 'Royal flush',
  exampleCat0: 'A K 9 5 3, mixed suits', exampleCat1: 'Two cards of a rank', exampleCat2: 'Two different pairs', exampleCat3: 'Three of a rank', exampleCat4: 'Five ranks in a row',
  exampleCat5: 'Five of one suit', exampleCat6: 'Three of a kind plus a pair', exampleCat7: 'Four of a rank', exampleCat8: 'A straight in one suit',
  noscript: 'This game needs JavaScript.', virtualOnly: 'Virtual chips only: no purchases, no prizes.',
  helperShort: 'Helper', fourColorShort: '4-colour', tableSettings: 'Table settings',
  emptySeat: 'Empty', allInTag: 'All-in', thinking: 'Thinking…', toCallN: '{n} to call', allInShort: 'All-in', nameYou: '{name} (you)',
  tag_check: 'Check', tag_call: 'Call', tag_bet: 'Bet', tag_raise: 'Raise', tag_fold: 'Fold',
  helperIdle: 'Once the next hand is dealt, this shows your hand, an equity estimate and the pot odds.',
  helperPreflopNote: 'Heads-up against one random hand this wins about {pct}%. Equity is a simulation against rough opponent ranges — a guide, not gospel.',
  advicePreStrong: 'A premium starting hand: raise to enter the pot, and re-raise is fine when someone has raised.', advicePreGood: 'A good starting hand: open with a raise; facing a raise, calling or folding depends on position.',
  advicePreMedium: 'A middling hand: playable late with no raise in front; usually a fold against a raise.', advicePreWeak: 'A weak starting hand: usually fold unless you can see the flop for free.',
  advicePreFree: 'You can see the flop for free, no more chips needed.',
  tableTitle: 'Hold\'em Friends · Table', eliminated: 'out', leaderText: '{name} leads on chips', championText: 'You won the knockout!'
};

export const DICTIONARY = { zh, en };
let language = 'zh';

export function detectLanguage(storage = globalThis.localStorage) {
  try {
    const own = JSON.parse(storage.getItem('holdem.settings') || '{}');
    if (own.lang === 'zh' || own.lang === 'en') return own.lang;
    const home = JSON.parse(storage.getItem('jefferson.preferences') || '{}');
    if (home.lang === 'zh' || home.lang === 'en') return home.lang;
  } catch { /* 没有存储也能用 */ }
  return (globalThis.navigator?.language || 'zh').toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export const setLanguage = lang => { language = lang === 'en' ? 'en' : 'zh'; };
export const getLanguage = () => language;

export function t(key, params = {}) {
  const text = DICTIONARY[language][key] ?? DICTIONARY.zh[key] ?? String(key);
  return text.replace(/\{(\w+)\}/g, (_, name) => (params[name] ?? ''));
}

export const chips = n => Number(n || 0).toLocaleString('en-US');

const RANK_TEXT = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_EN = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
const RANK_EN_PLURAL = ['Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens', 'Jacks', 'Queens', 'Kings', 'Aces'];
// U+FE0E：按文字样式显示，不然有的字体会把 ♥ 画成红色表情符号
const SUIT_GLYPH = ['♠\uFE0E', '♥\uFE0E', '♦\uFE0E', '♣\uFE0E'];
const SUIT_ZH = ['黑桃', '红心', '方块', '梅花'];
const SUIT_EN = ['spades', 'hearts', 'diamonds', 'clubs'];

export const rankText = rank => RANK_TEXT[rank];
export const suitGlyph = suit => SUIT_GLYPH[suit];
export const cardText = card => RANK_TEXT[rankOf(card)] + SUIT_GLYPH[suitOf(card)];
export const cardsText = cards => cards.map(cardText).join(' ');
export const cardName = card => (language === 'zh'
  ? SUIT_ZH[suitOf(card)] + ' ' + RANK_TEXT[rankOf(card)]
  : RANK_EN[rankOf(card)] + ' of ' + SUIT_EN[suitOf(card)]);

/** 牌型的完整说法：一对 K、两对 A 和 9、顺子（到 Q）… / Pair of Kings, Two pair, Aces and Nines… */
export function handName(category, rankList = []) {
  const ranks = Array.isArray(rankList) ? rankList : [];
  const r = ranks.map(x => RANK_TEXT[x] ?? '?');
  if (language === 'zh') {
    switch (category) {
      case 0: return `高牌 ${r[0]}`;
      case 1: return `一对 ${r[0]}`;
      case 2: return `两对 ${r[0]} 和 ${r[1]}`;
      case 3: return `三条 ${r[0]}`;
      case 4: return `顺子（到 ${r[0]}）`;
      case 5: return `同花（${r[0]} 大）`;
      case 6: return `葫芦（${r[0]} 带 ${r[1]}）`;
      case 7: return `四条 ${r[0]}`;
      case 8: return ranks[0] === 12 ? '皇家同花顺' : `同花顺（到 ${r[0]}）`;
      default: return '';
    }
  }
  const one = x => RANK_EN[x] ?? '?', many = x => RANK_EN_PLURAL[x] ?? '?';
  switch (category) {
    case 0: return `High card, ${one(ranks[0])}`;
    case 1: return `Pair of ${many(ranks[0])}`;
    case 2: return `Two pair, ${many(ranks[0])} and ${many(ranks[1])}`;
    case 3: return `Three of a kind, ${many(ranks[0])}`;
    case 4: return `Straight, ${one(ranks[0])}-high`;
    case 5: return `Flush, ${one(ranks[0])}-high`;
    case 6: return `Full house, ${many(ranks[0])} full of ${many(ranks[1])}`;
    case 7: return `Four of a kind, ${many(ranks[0])}`;
    case 8: return ranks[0] === 12 ? 'Royal flush' : `Straight flush, ${one(ranks[0])}-high`;
    default: return '';
  }
}

export const styleName = style => (typeof style === 'string' && style ? t('style' + style[0].toUpperCase() + style.slice(1)) : '');
export const streetName = street => (typeof street === 'string' && street ? t('street' + street[0].toUpperCase() + street.slice(1)) : '');

/** 记录里的一条事件 → 一句话。nameOf(id) 给出名字 */
export function describeEvent(entry, nameOf) {
  const name = nameOf(entry.id);
  switch (entry.t) {
    case 'blind': return t(entry.kind === 'sb' ? 'actSb' : 'actBb', { name, n: chips(entry.amount) }) + (entry.allIn ? t('actAllIn') : '');
    case 'action': {
      const key = { fold: 'actFold', check: 'actCheck', call: 'actCall', bet: 'actBet', raise: 'actRaise' }[entry.action];
      if (!key) return '';
      const n = entry.action === 'raise' ? entry.to : entry.amount;
      return t(key, { name, n: chips(n) }) + (entry.allIn ? t('actAllIn') : '');
    }
    case 'street': return streetName(entry.street) + (language === 'zh' ? '：' : ': ') + cardsText(entry.cards);
    case 'uncalled': return t('uncalled', { name, n: chips(entry.amount) });
    default: return '';
  }
}

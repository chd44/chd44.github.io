# Jefferson Cai · Personal Space

中英双语个人主页与作品集，使用 BLUE LOCK 主题、原创项目封面，以及已确认公开的社交联系方式和中英简历。

在线访问：https://chd44.github.io/

## 内容与功能

- 个人介绍、项目作品集、技术工具箱、兴趣与喜欢的动漫。
- 好友牌桌在线版（`/holdem/`）：浏览器里的德州扑克练习，可以和 AI 对战，也可以开好友房一起玩。
- LinkedIn、小红书主页与邮箱入口。
- 中文、英文单页简历预览及 PDF 下载，随网站语言同步切换。
- 浅色、深色、系统主题及主题色调节。
- 响应式布局、柔和滚动动效、本地保存偏好。

## 自动发布

GitHub Pages 从 main 分支的根目录直接发布；每次推送后自动更新。仓库已包含完整 HTML、CSS、JavaScript、图片、简历和本地动效库，不依赖线上打包。`.nojekyll` 保持静态文件原样发布。

更新内容后，先运行 `npm test` 和 `npm run build`，检查本地预览，再提交并推送到 main。Pages 设置保持为 Deploy from a branch → main → /(root)。构建与部署状态可在仓库 Actions 页面查看。

## 本地预览

网页资源全部位于仓库中，可以直接打开 index.html。使用本地 HTTP 预览时，需要 Node.js 22.13 或更高版本：

```sh
npm ci
npm run dev
```

默认地址为 http://localhost:4173。

验证和生产构建：

```sh
npm test
npm run build
npm run preview
```

## 图标

页面只打包实际用到的 Lucide 图标（`vendor/lucide-icons.js`，约 8 KB；完整的 Lucide 包约 360 KB）。在 index.html 里新增或更换 `data-lucide` 图标后，运行：

```sh
npm run icons
```

`npm test` 会检查页面上的每个图标都在这个子集里。

## 分享卡片与搜索

- `assets/og-image.jpg`（1200 × 630）是链接分享到微信、LinkedIn、X 等处时显示的预览图，用横幅加网页同款文字排版生成。
- `<head>` 里有 canonical、Open Graph、Twitter 卡片和 schema.org `Person` 结构化数据；根目录的 `robots.txt`、`sitemap.xml` 供搜索引擎使用。
- 改了网址、名字或社交链接时，记得同步改这几处。

## 素材与许可

版式参考 Fuwari，独立实现。GSAP、Lucide 及动漫同人素材说明见 THIRD_PARTY_NOTICES.md；图片来源与生成记录见 ASSETS.md、PROJECT_COVERS.md。简历公开副本仅保留已确认公开的联系邮箱。

## 好友牌桌（holdem/）

在线地址：https://chd44.github.io/holdem/ 。纯静态页面，没有构建步骤，和主页一起由 GitHub Pages 发布。只用虚拟筹码，没有充值，也没有任何奖励。

- **单人练习**：可以选 1～7 个 AI 对手、三种难度，玩法有练习桌（输光可补码）和淘汰赛（盲注每 8 手上涨）两种。AI 有紧凶、松凶、跟注站、稳如石、疯狂、均衡六种风格。翻牌前查起手牌强度表，翻牌后用蒙特卡洛模拟估胜率，再和底池赔率比较决定怎么打；它只看得到公开信息和自己的底牌。
- **好友房**：房主的浏览器负责发牌和裁判，其他人通过 WebRTC 点对点连进来。每个人只收到自己能看的画面数据，所以看不到别人的底牌。配对用 PeerJS 的免费公共信令服务器；直连不通时，走 PeerJS 提供的 TURN 中继。房主关掉页面，房间就结束了；其他人掉线后重新打开邀请链接，会回到原来的座位。
- **练习助手**：显示当前牌型、按对手大致范围估算的胜率、底池赔率和简单建议。房主可以在好友房里关闭它。
- **牌局记录**：每一手都按自己看到的内容保存在本机浏览器里，最多保存 200 手，可以导出成文本；另外会统计入池率、翻前加注率等数据。

代码在 `holdem/js/`，都是浏览器和 Node 通用的 ES 模块：`engine.js`（规则：最小加注、不完整加注、边池、未跟注退回）、`evaluator.js`（比牌）、`ai.js`、`controller.js`（轮到谁、超时、盲注升级）、`view.js`（决定每个人能看到什么）、`net.js`（好友房），以及界面代码 `ui.js` 和 `app.js`。`npm test` 会跑 `tests/holdem-*.test.mjs`，其中包括：遍历全部 2,598,960 种五张牌的组合核对比牌结果、边池分配、加注规则、随机对局里筹码总数守恒，以及好友房的视图在摊牌前不泄露别人的底牌。

本地测试好友房：

- 同一台电脑上开两个标签页，地址后面加 `?transport=local`（用 BroadcastChannel 通信，不联网）。
- 想走真正的 WebRTC，可以在本机运行 PeerJS 服务器（`npx peer --port 9000 --host 127.0.0.1`），然后在地址后面加 `?peer=127.0.0.1:9000/`。

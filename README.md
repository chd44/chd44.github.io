# Jefferson Cai · Personal Space

中英双语个人主页与作品集，使用 BLUE LOCK 主题、原创项目封面，以及已确认公开的社交联系方式和中英简历。

在线访问：https://chd44.github.io/

## 内容与功能

- 个人介绍、项目作品集、技术工具箱、兴趣与喜欢的动漫。
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

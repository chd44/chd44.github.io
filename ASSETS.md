# 图片与视觉素材

## 简历

assets/resume/resume-zh.pdf 与 resume-en.pdf 来自用户本地的中、英文单页简历。网页副本仅将联系方式改为用户已公开的 caihaodong44chd@gmail.com，并移除原电话号码和另一邮箱；程序核对了其余正文一致。两个 PDF 保留可选择文字和邮箱链接。

同目录下的 resume-zh.webp、resume-en.webp 是对应 PDF 的整页渲染图，供页面直接预览。切换网站语言时，预览、打开链接与下载文件同步切换。

## 作品集图片

- assets/projects/quotapet-cover.webp：参考项目实际橙发宠物图标，生成深蓝与暖橙色的桌宠主题插画。
- assets/projects/reze-cover.webp：参考公开下载包的 Reze 桌宠造型，生成紫色花瓣与角色主题插画。
- assets/projects/holdem-cover.webp：生成深绿桌面、纸牌与虚拟筹码的主题插画。
- assets/projects/pixel-mv-cover.webp：参考本地五条悟对伏黑甚尔 MV 的像素画面，生成像素格斗主题插画。

四张封面使用内置 image_gen 工具分别生成，随后仅进行 WebP 格式转换与缩小。它们是项目主题封面，不是应用截图或视频的实际帧。标题由网页原生文字叠加，保持小尺寸下的清晰度。完整提示词见 PROJECT_COVERS.md。角色相关作品为非官方同人创作。

## 头像

路径：assets/avatar.jpg（原图）、assets/avatar.webp（网页显示用）

avatar.jpg 是你提供的原始 JPG（1152 × 1152），没有改变角色、表情或配色，结构化数据里引用它。页面上头像最大只显示 250 像素宽，所以网页显示的是缩小到 512 × 512 的 WebP 副本（约 50 KB，原图约 310 KB），只做了缩放和格式转换。页面仅通过 CSS 控制展示尺寸与裁切。

## 分享预览图

路径：assets/og-image.jpg

1200 × 630，链接分享时的预览卡片。用 assets/banner.webp 作底图，在浏览器里按网页横幅的样式叠上 HTML 文字（Inter 字体）后截图，再压缩为 JPEG。没有用图像生成工具，也没有改动横幅画面本身。

## 最终横幅

路径：assets/banner.webp

使用内置 image_gen 工具生成，原始尺寸为 2172 × 724。交付版本仅进行 WebP 格式压缩以减少网页加载体积，未用代码重绘或修改画面。

最终方向：无人像、黑蓝色、神秘氛围、BLUE LOCK 主题海报、锁链与拼图碎片。较早的风景、人物和训练设施草稿均未使用。

### 最终生成提示词

Use case: stylized-concept. Create an unmistakably BLUE LOCK anime-themed graphic poster wallpaper, NO PEOPLE, NO CHARACTERS, NO FACES, NO HEADS. Ultra-wide 3:1 landscape hero banner. Abstract BLACK AND ELECTRIC BLUE graphic composition inspired by BLUE LOCK anime opening / key visual design: multiple very prominent heavy dark steel CHAINS with sharp blue reflective edges stretch diagonally across the scene at different depths, with one huge taut chain coming from lower left toward upper right and another curving behind. Several chains shatter dramatically toward the RIGHT half, their broken links turning into many clearly recognizable jigsaw PUZZLE PIECES with interlocking tabs and sockets; floating dark-blue and brilliant cobalt puzzle fragments form a large incomplete angular pentagonal soccer-ball/lock emblem on the RIGHT third. Sharp cracked glass-like blue fissures and tiny electric blue sparks define the energy, while inky black brushwork and subtle halftone textures give authentic manga / anime title-sequence graphic feeling. Composition must be stylized high contrast 2D anime poster artwork, NOT a photo of chains, NOT photorealistic, NOT a hallway, NOT a stadium, NOT a landscape. Very dark navy / black negative space on LEFT 40% so website text can be overlaid there, rich luminous BLUE puzzle storm and chains on RIGHT 60%. Sophisticated mysterious ominous mood, tightly controlled sharp icy blue highlights, blue aura smoke around the broken chains, moody layered depth and tasteful bloom. NO purple, NO pink, NO sunset, NO decorative scenery. Strong BLUE LOCK visual motifs: BROKEN BLUE CHAINS, JIGSAW PUZZLE FRAGMENTS, ANGULAR BLUE LOCK EMBLEM. Empty graphic background with absolutely no humanoid forms, no portraits, no heads. No text, no logos with lettering, no watermark, no UI, no numbers. Professional anime poster quality.

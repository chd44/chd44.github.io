(() => {
  'use strict';
  const dictionary = {
    zh: {
      skip: '跳至主要内容', navHome: '首页', navAbout: '关于我', navInterests: '兴趣', navContact: '联系', navMaking: '作品精选', navWorks: '作品', navToolbox: '技术与工具',
      homeLabel: 'Jefferson Cai · 首页', mainNavigation: '主导航', mobileNavigation: '手机导航', languageLabel: '网站语言',
      appearanceLabel: '外观设置', menuLabel: '导航菜单', appearance: '外观设置', reset: '重置', modeLabel: '显示模式',
      light: '浅色', dark: '深色', system: '系统', accentColor: '主题颜色', presetColors: '预设颜色',
      indigo: '靛蓝', sky: '天蓝', mint: '薄荷绿', violet: '紫色', rose: '玫瑰色',
      appearanceNote: '挑一个喜欢的颜色，让这里更像你。',
      heroLabel: '主页横幅', bannerAlt: '黑蓝色锁链与发光拼图碎片构成的神秘动漫风背景',
      heroDescription: '在代码、游戏与想象之间。', explore: '走进我的小世界',
      profileLabel: '个人资料', avatarAlt: 'Jefferson 选择的 BLUE LOCK 动漫头像',
      profileRole: 'UNSW · IT 一年级', profileBio: '自制工具、小游戏，<br>还有一点动漫脑洞。',
      emailJefferson: '给 Jefferson 发邮件', copyXhs: '复制小红书号 5569016579', copyEmail: '复制邮箱',
      openLinkedin: '打开 LinkedIn 主页', openXhs: '打开小红书主页', navResume: '简历', viewResume: '查看我的简历',
      resumeHeading: '更多关于我的经历。', resumeDescription: '教育背景、工作经历与技术积累，整理在这一页。',
      downloadResume: '下载简历', openResume: '打开 PDF', resumeFilename: '中文简历 · 蔡灏东', resumePages: 'PDF · 1 页',
      resumePreviewLabel: '简历整页预览', resumePreviewAlt: '蔡灏东的中文简历整页预览',
      resumeHint: '可滚动查看整页；打开 PDF 后可放大阅读。中 / EN 会同步切换简历语言。',
      pageNavigation: '页内导航', here: '在这里', keywords: '一些关键词',
      tagPlugins: '小插件', tagGames: '小游戏', tagFootball: '足球', littleCorner: '一个属于自己的小角落。',
      aboutHeading: '你好，我是 Jefferson。', aiLearning: '人工智能学习中',
      aboutText: '我正在 UNSW 读 IT 一年级，学习人工智能。<br>喜欢借助 AI 与代码，把日常需要和动漫灵感做成小工具、桌宠、网页游戏与像素视频，在实际项目里边学边做。',
      maker: 'AI 协作 · 边学边做',
      makingHeading: '把想法，做成作品。', makingDescription: '实用的小工具、好玩的网页，和喜欢的动漫世界。',
      publicProject: '公开项目', playableOnline: '在线可玩', playNow: '在线试玩', localPrototype: '本地原型', creativeExperiment: '创作实验', projectHome: '项目主页',
      quotaTitle: 'QuotaPet · 额度宠物', quotaText: '把 Claude 和 Codex 的额度信息，做成有表情的 macOS 菜单栏伙伴。', quotaAlt: '以 QuotaPet 橙发桌宠形象设计的项目封面',
      rezeTitle: '蕾塞 Reze · 动画桌宠', rezeText: '为 Codex 制作的非官方同人桌宠，围绕待机、拿花和拔环变身打磨角色动作。', rezeAlt: '以蕾塞 Reze 桌宠形象设计的紫色项目封面',
      holdemTitle: '好友牌桌 · 网页小游戏', holdemText: '浏览器里的德扑练习：和打法各异的 AI 对手练手，或者开好友房一起玩，附带练习助手和牌局记录。仅使用虚拟筹码。', holdemAlt: '好友牌桌的纸牌与虚拟筹码主题封面',
      pixelTitle: '像素格斗 MV', pixelText: '把动漫对决做成街机风格短片，尝试像素角色、分镜与音乐卡点；包括五条悟对伏黑甚尔的创作实验。', pixelAlt: '以五条悟像素形象设计的格斗 MV 主题封面',
      prototypeNote: '在本地开发与迭代', renderNote: '代码渲染 · 本地视频作品', portfolioNote: '这些项目都在边做边学，也都有 AI 协作的参与。',
      toolboxHeading: '边学边做的工具箱。', toolboxDescription: '在这些项目里接触和使用的技术。', webTools: '网页与小游戏', desktopTools: '桌面与小工具', visualTools: '图像与动画',
      plugins: '小插件', pluginsText: '自己动手做点实用的小工具。',
      games: '小游戏', gamesText: '喜欢玩，也想做自己的游戏。',
      videos: '视频', videosText: '想把脑海里的画面变成视频。',
      websites: '网页', websitesText: '想把自己的想法带到网页上。',
      loveMaking: '喜欢自制', wantToExplore: '想要探索',
      interestsHeading: '代码之外，也有热爱。', football: '足球', gaming: '游戏', billiards: '台球', anime: '动漫',
      animeFavorites: '喜欢的动漫', animeBluelock: '蓝色监狱', animeAot: '进击的巨人', animeOnePiece: '海贼王', animeEva: 'EVA', animeJjk: '咒术回战', animeGrandBlue: '碧蓝之海', animeConan: '名侦探柯南',
      contactHeading: '很高兴，在这里遇见你。', contactDescription: '聊聊游戏、网页，或者只是打个招呼。',
      email: '电子邮箱', xiaohongshu: '小红书', writeEmail: '给我写封邮件',
      footerNote: '保持好奇，继续创造。', inspiredBy: '设计灵感来自', backTop: '回到顶部',
      switchDark: '切换深色模式', switchLight: '切换浅色模式',
      copiedEmail: '邮箱已复制', copiedXhs: '小红书号已复制：5569016579',
      copyManually: '暂时无法自动复制，请长按或选中文字后手动复制。',
      title: 'Jefferson Cai · 个人主页',
      description: '你好，我是 Jefferson，在 UNSW 读 IT 一年级，正在学人工智能。这里放着我借助 AI 和代码做的小东西：会提醒 AI 额度的菜单栏宠物 QuotaPet、蕾塞 Codex 桌宠、能和朋友在线玩的德扑小游戏「好友牌桌」，还有几支像素格斗 MV。'
    },
    en: {
      skip: 'Skip to main content', navHome: 'Home', navAbout: 'About', navInterests: 'Interests', navContact: 'Contact', navMaking: 'Selected work', navWorks: 'Work', navToolbox: 'My toolbox',
      homeLabel: 'Jefferson Cai · Home', mainNavigation: 'Main navigation', mobileNavigation: 'Mobile navigation', languageLabel: 'Website language',
      appearanceLabel: 'Appearance settings', menuLabel: 'Navigation menu', appearance: 'Appearance', reset: 'Reset', modeLabel: 'Display mode',
      light: 'Light', dark: 'Dark', system: 'System', accentColor: 'Accent color', presetColors: 'Preset colors',
      indigo: 'Indigo', sky: 'Sky blue', mint: 'Mint', violet: 'Violet', rose: 'Rose',
      appearanceNote: 'A little color to make this space your own.',
      heroLabel: 'Homepage banner', bannerAlt: 'A mysterious anime-inspired background of black and blue chains and glowing puzzle fragments',
      heroDescription: 'Somewhere between code, games & imagination.', explore: 'Step into my little world',
      profileLabel: 'Personal profile', avatarAlt: "Jefferson's chosen BLUE LOCK anime avatar",
      profileRole: 'UNSW · First-year IT student', profileBio: 'Little tools, small games,<br>and a little anime imagination.',
      emailJefferson: 'Email Jefferson', copyXhs: 'Copy Xiaohongshu ID 5569016579', copyEmail: 'Copy email address',
      openLinkedin: 'Open LinkedIn profile', openXhs: 'Open Xiaohongshu profile', navResume: 'Resume', viewResume: 'View my resume',
      resumeHeading: 'A little more about my journey.', resumeDescription: 'My education, professional experience and technical background, on one page.',
      downloadResume: 'Download resume', openResume: 'Open PDF', resumeFilename: 'English resume · Haodong Cai', resumePages: 'PDF · 1 page',
      resumePreviewLabel: 'Full-page resume preview', resumePreviewAlt: "A full-page preview of Haodong Cai's English resume",
      resumeHint: 'Scroll to see the full page, or open the PDF to zoom in. The resume follows your chosen language.',
      pageNavigation: 'On this page', here: 'Around here', keywords: 'A few keywords',
      tagPlugins: 'Plugins', tagGames: 'Small games', tagFootball: 'Football', littleCorner: 'A little corner of my own.',
      aboutHeading: "Hi, I'm Jefferson.", aiLearning: 'Learning artificial intelligence',
      aboutText: "I'm a first-year IT student at UNSW, studying artificial intelligence.<br>I use AI and code to turn everyday needs and anime ideas into little tools, desktop companions, web games and pixel videos, learning through each project.",
      maker: 'AI-assisted · Learning by making',
      makingHeading: 'Little ideas, real projects.', makingDescription: 'Useful tools, playful websites, and the anime worlds I love.',
      publicProject: 'Public project', playableOnline: 'Playable online', playNow: 'Play online', localPrototype: 'Local prototype', creativeExperiment: 'Creative experiment', projectHome: 'Project page',
      quotaTitle: 'QuotaPet · Usage companion', quotaText: 'A macOS menu bar companion that gives Claude and Codex usage information a little personality.', quotaAlt: 'A project cover inspired by the orange-haired QuotaPet companion',
      rezeTitle: 'Reze · Animated companion', rezeText: 'An unofficial fan-made Codex pet, exploring idle, flower-holding and transformation animations.', rezeAlt: 'A purple project cover featuring the Reze desktop companion',
      holdemTitle: "Hold'em Friends · Web game", holdemText: "Browser poker practice: play AI opponents with their own styles, or open a room with friends — with a practice helper and hand history. Virtual chips only.", holdemAlt: "A themed cover of playing cards and virtual chips for Hold'em Friends",
      pixelTitle: 'Pixel Fighter MV', pixelText: 'Anime battles reimagined as arcade-style shorts, exploring pixel characters, storyboards and music timing, including a Gojo vs. Toji experiment.', pixelAlt: 'A pixel-art Gojo illustration designed for the fighter MV project cover',
      prototypeNote: 'Developing and iterating locally', renderNote: 'Code-rendered · Local video project', portfolioNote: 'Learning as I build, with AI collaboration across these projects.',
      toolboxHeading: 'Learning through my toolbox.', toolboxDescription: "Technologies I've used and explored in these projects.", webTools: 'Web & small games', desktopTools: 'Desktop & little tools', visualTools: 'Images & animation',
      plugins: 'Little plugins', pluginsText: 'Small, useful tools made by hand.',
      games: 'Small games', gamesText: 'I like playing games — and making my own.',
      videos: 'Videos', videosText: 'Turning the pictures in my head into videos.',
      websites: 'Websites', websitesText: 'Giving my ideas a home on the web.',
      loveMaking: 'Love making', wantToExplore: 'Want to explore',
      interestsHeading: 'Life beyond the screen.', football: 'Football', gaming: 'Gaming', billiards: 'Billiards', anime: 'Anime',
      animeFavorites: 'Anime I like', animeBluelock: 'BLUE LOCK', animeAot: 'Attack on Titan', animeOnePiece: 'One Piece', animeEva: 'EVANGELION', animeJjk: 'Jujutsu Kaisen', animeGrandBlue: 'Grand Blue', animeConan: 'Detective Conan',
      contactHeading: 'Glad our paths crossed.', contactDescription: 'Games, websites, or just a friendly hello.',
      email: 'Email', xiaohongshu: 'Xiaohongshu', writeEmail: 'Write me an email',
      footerNote: 'Stay curious. Keep creating.', inspiredBy: 'Design inspired by', backTop: 'Back to top',
      switchDark: 'Switch to dark mode', switchLight: 'Switch to light mode',
      copiedEmail: 'Email address copied', copiedXhs: 'Xiaohongshu ID copied: 5569016579',
      copyManually: 'Unable to copy automatically. Please select the text and copy it manually.',
      title: 'Jefferson Cai · Personal Space',
      description: "Hi, I'm Jefferson, a first-year IT student at UNSW learning AI. This is where I keep the little things I make with AI and code: QuotaPet, a menu bar pet that keeps an eye on your AI usage; a Reze pet for Codex; Hold'em Friends, a poker game to play online with friends; and a few pixel-art fighting music videos."
    }
  };
  const root = document.documentElement;
  const get = selector => document.querySelector(selector);
  const every = selector => Array.from(document.querySelectorAll(selector));
  const storageKey = 'jefferson.preferences';
  const preferences = { lang: 'zh', mode: 'light', hue: 230 };
  const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved && typeof saved === 'object') {
      if (saved.lang === 'zh' || saved.lang === 'en') preferences.lang = saved.lang;
      if (['light', 'dark', 'system'].includes(saved.mode)) preferences.mode = saved.mode;
      if (typeof saved.hue === 'number' && Number.isFinite(saved.hue) && saved.hue >= 0 && saved.hue <= 359) preferences.hue = Math.round(saved.hue);
    }
  } catch { /* Preferences are optional; the page remains usable without storage. */ }
  const t = key => dictionary[preferences.lang][key] || dictionary.zh[key] || '';
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Private browsing may deny storage. */ }
  };
  function applyAppearance() {
    const dark = preferences.mode === 'dark' || (preferences.mode === 'system' && systemDark && systemDark.matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.setProperty('--hue', String(preferences.hue));
    every('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === preferences.mode)));
    every('[data-hue]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.hue) === preferences.hue)));
    const slider = get('#hue-slider');
    if (slider) slider.value = String(preferences.hue);
    const output = get('#hue-value');
    if (output) output.textContent = preferences.hue + '°';
    get('#theme-toggle')?.setAttribute('aria-label', t(dark ? 'switchLight' : 'switchDark'));
    const colorMeta = get('meta[name="theme-color"]');
    if (colorMeta) colorMeta.content = dark ? '#0f1420' : '#f0f3fa';
  }
  function applyLanguage() {
    root.lang = preferences.lang === 'zh' ? 'zh-CN' : 'en';
    every('[data-i18n]').forEach(element => {
      // These are static first-party strings, never visitor input.
      element.innerHTML = t(element.dataset.i18n);
    });
    every('[data-i18n-aria]').forEach(element => element.setAttribute('aria-label', t(element.dataset.i18nAria)));
    every('[data-i18n-alt]').forEach(element => element.alt = t(element.dataset.i18nAlt));
    const resumeBase = './assets/resume/resume-' + preferences.lang;
    const resumePreview = get('#resume-preview-image');
    if (resumePreview) resumePreview.src = resumeBase + '.webp';
    const resumeOpen = get('#resume-open');
    if (resumeOpen) resumeOpen.href = resumeBase + '.pdf';
    const resumeDownload = get('#resume-download');
    if (resumeDownload) {
      resumeDownload.href = resumeBase + '.pdf';
      resumeDownload.download = 'Jefferson-Cai-Resume-' + preferences.lang.toUpperCase() + '.pdf';
    }
    every('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === preferences.lang)));
    document.title = t('title');
    const description = get('meta[name="description"]');
    if (description) description.content = t('description');
    const ogTitle = get('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = t('title');
    const ogDescription = get('meta[property="og:description"]');
    if (ogDescription) ogDescription.content = t('description');
    applyAppearance();
  }
  every('[data-language]').forEach(button => button.addEventListener('click', () => {
    preferences.lang = button.dataset.language;
    applyLanguage();
    save();
  }));
  every('[data-mode]').forEach(button => button.addEventListener('click', () => {
    preferences.mode = button.dataset.mode;
    applyAppearance();
    save();
  }));
  every('[data-hue]').forEach(button => button.addEventListener('click', () => {
    preferences.hue = Number(button.dataset.hue);
    applyAppearance();
    save();
  }));
  get('#hue-slider')?.addEventListener('input', event => {
    preferences.hue = Number(event.target.value);
    applyAppearance();
    save();
  });
  get('#theme-toggle')?.addEventListener('click', () => {
    preferences.mode = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyAppearance();
    save();
  });
  get('#reset-appearance')?.addEventListener('click', () => {
    preferences.mode = 'light';
    preferences.hue = 230;
    applyAppearance();
    save();
  });
  systemDark?.addEventListener('change', () => {
    if (preferences.mode === 'system') applyAppearance();
  });
  const panels = [
    { panel: get('#appearance-panel'), toggle: get('#appearance-toggle') },
    { panel: get('#mobile-menu'), toggle: get('#menu-toggle') }
  ].filter(item => item.panel && item.toggle);
  function closePanel(item, returnFocus = false) {
    const wasOpen = !item.panel.hidden;
    item.panel.hidden = true;
    item.toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus && wasOpen) item.toggle.focus();
  }
  panels.forEach(item => {
    item.toggle.addEventListener('click', () => {
      const open = item.panel.hidden;
      panels.forEach(other => closePanel(other));
      item.panel.hidden = !open;
      item.toggle.setAttribute('aria-expanded', String(open));
      if (open) item.panel.querySelector('button, a, input')?.focus();
    });
    item.panel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closePanel(item)));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') panels.forEach(item => closePanel(item, true));
  });
  document.addEventListener('click', event => {
    panels.forEach(item => {
      if (!item.panel.contains(event.target) && !item.toggle.contains(event.target)) closePanel(item);
    });
  });
  let toastTimer;
  function showToast(message) {
    const toast = get('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3800);
  }
  every('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const value = button.dataset.copy;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(value);
      } else {
        const field = document.createElement('textarea');
        field.value = value;
        field.readOnly = true;
        field.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
        document.body.appendChild(field);
        let copied = false;
        try {
          field.select();
          copied = typeof document.execCommand === 'function' && document.execCommand('copy');
        } finally {
          field.remove();
          button.focus();
        }
        if (!copied) throw new Error('Clipboard not available');
      }
      showToast(t(value.includes('@') ? 'copiedEmail' : 'copiedXhs'));
    } catch {
      showToast(t('copyManually'));
    }
  }));
  function syncScroll() {
    const distance = window.scrollY || 0;
    document.body.classList.toggle('scrolled', distance > 30);
    get('#back-to-top')?.classList.toggle('is-visible', distance > 440);
    const range = root.scrollHeight - window.innerHeight;
    const progress = get('.reading-progress span');
    if (progress) progress.style.transform = 'scaleX(' + (range > 0 ? Math.min(1, distance / range) : 0) + ')';
    let active = 'home';
    every('#home, main section[id]').forEach(section => {
      if (section.getBoundingClientRect().top <= 170) active = section.id;
    });
    every('[data-section]').forEach(link => {
      const selected = link.dataset.section === active;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let scrollQueued = false;
  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(() => {
      syncScroll();
      scrollQueued = false;
    });
  }, { passive: true });
  window.addEventListener('resize', () => {
    syncScroll();
    if (window.innerWidth > 780) {
      const mobile = panels.find(item => item.panel.id === 'mobile-menu');
      if (mobile) closePanel(mobile);
    }
  }, { passive: true });
  applyLanguage();
  window.lucide?.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true' } });
  syncScroll();
  // All content is visible without animation libraries or JavaScript.
  if (window.gsap && !reducedMotion?.matches) {
    const entrance = window.gsap.matchMedia();
    entrance.add('(prefers-reduced-motion: no-preference)', () => {
      window.gsap.from('.hero-copy > *', { opacity: 0, y: 14, duration: .8, stagger: .09, ease: 'power2.out', clearProps: 'all' });
      const cards = every('.reveal');
      const aboveFold = cards.filter(card => card.getBoundingClientRect().top < window.innerHeight);
      if (aboveFold.length) window.gsap.from(aboveFold, { opacity: 0, y: 20, duration: .65, stagger: .07, delay: .12, ease: 'power2.out', clearProps: 'all' });
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            window.gsap.from(entry.target, { y: 17, opacity: 0, duration: .6, ease: 'power2.out', clearProps: 'all' });
            observer.unobserve(entry.target);
          });
        }, { threshold: .08 });
        cards.filter(card => !aboveFold.includes(card)).forEach(card => observer.observe(card));
        return () => observer.disconnect();
      }
    });
  }
})();

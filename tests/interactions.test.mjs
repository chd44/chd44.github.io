import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const script = await readFile(new URL('app.js', root), 'utf8').catch(() => '');

async function boot({ stored, storageUnavailable = false, clipboardFails = false } = {}) {
  const dom = new JSDOM(html, { url: 'https://example.test/portfolio/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  if (stored) window.localStorage.setItem('jefferson.preferences', stored);
  if (storageUnavailable) Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage disabled'); } });
  const copied = [];
  Object.defineProperty(window.navigator, 'clipboard', { value: { async writeText(value) {
    if (clipboardFails) throw new Error('Clipboard denied');
    copied.push(value);
  } } });
  window.eval(script);
  await new Promise(resolve => setTimeout(resolve, 0));
  return { dom, window, document: window.document, copied };
}

// Catches a language handler that updates the label but leaves the page in Chinese,
// fails to update accessibility labels, or forgets the visitor's choice.
test('language switch translates content and labels and survives a reload', async () => {
  const first = await boot();
  first.document.querySelector('[data-language="en"]').click();
  assert.equal(first.document.documentElement.lang, 'en');
  assert.equal(first.document.querySelector('[data-i18n="navAbout"]').textContent.trim(), 'About');
  assert.equal(first.document.querySelector('[data-language="en"]').getAttribute('aria-pressed'), 'true');
  assert.match(first.document.querySelector('#copy-email').getAttribute('aria-label'), /copy email/i);
  const stored = first.window.localStorage.getItem('jefferson.preferences');
  const reloaded = await boot({ stored });
  assert.equal(reloaded.document.documentElement.lang, 'en');
  assert.equal(reloaded.document.querySelector('[data-language="en"]').getAttribute('aria-pressed'), 'true');
  reloaded.dom.window.close(); first.dom.window.close();
});

// Catches theme controls that change a swatch without changing the rendered palette.
test('dark mode and accent persist without erasing the selected language', async () => {
  const first = await boot();
  first.document.querySelector('[data-language="en"]').click();
  first.document.querySelector('[data-mode="dark"]').click();
  first.document.querySelector('[data-hue="285"]').click();
  assert.equal(first.document.documentElement.dataset.theme, 'dark');
  assert.equal(first.document.documentElement.style.getPropertyValue('--hue'), '285');
  const reloaded = await boot({ stored: first.window.localStorage.getItem('jefferson.preferences') });
  assert.equal(reloaded.document.documentElement.lang, 'en');
  assert.equal(reloaded.document.documentElement.dataset.theme, 'dark');
  assert.equal(reloaded.document.documentElement.style.getPropertyValue('--hue'), '285');
  reloaded.dom.window.close(); first.dom.window.close();
});

// Catches unsanitized saved values and a storage exception aborting the whole app.
test('invalid saved preferences and unavailable storage preserve usable controls', async () => {
  for (const options of [
    { stored: '{"lang":"bad","mode":"purple","hue":"oops"}' },
    { stored: 'broken json' },
    { storageUnavailable: true }
  ]) {
    const page = await boot(options);
    assert.equal(page.document.documentElement.lang, 'zh-CN');
    assert.equal(page.document.documentElement.dataset.theme, 'light');
    page.document.querySelector('[data-language="en"]').click();
    assert.equal(page.document.documentElement.lang, 'en');
    page.dom.window.close();
  }
});

// Catches copy buttons sending the wrong contact value, and false success on denial.
test('copy controls copy the actual contact and report a denied clipboard honestly', async () => {
  const page = await boot();
  page.document.querySelector('#copy-email').click();
  page.document.querySelector('#copy-xhs').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(page.copied, ['caihaodong44chd@gmail.com', '5569016579']);
  page.dom.window.close();
  const denied = await boot({ clipboardFails: true });
  denied.document.querySelector('#copy-email').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.match(denied.document.querySelector('#toast').textContent, /长按|手动|select|manually/i);
  denied.dom.window.close();
});

// Catches an inaccessible menu or settings panel that traps touch/keyboard users.
test('mobile navigation and appearance panels close with Escape or navigation', async () => {
  const page = await boot();
  const { document, window } = page;
  document.querySelector('#menu-toggle').click();
  assert.equal(document.querySelector('#mobile-menu').hidden, false);
  assert.equal(document.querySelector('#menu-toggle').getAttribute('aria-expanded'), 'true');
  document.querySelector('#mobile-menu a').click();
  assert.equal(document.querySelector('#mobile-menu').hidden, true);
  document.querySelector('#appearance-toggle').click();
  assert.equal(document.querySelector('#appearance-panel').hidden, false);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert.equal(document.querySelector('#appearance-panel').hidden, true);
  assert.equal(document.querySelector('#appearance-toggle').getAttribute('aria-expanded'), 'false');
  page.dom.window.close();
});

// Catches a language switch that translates the page while leaving visitors
// previewing or downloading a resume in the wrong language.
test('resume preview and PDF links follow the selected and saved language', async () => {
  const page = await boot();
  const preview = page.document.querySelector('#resume-preview-image');
  const download = page.document.querySelector('#resume-download');
  const open = page.document.querySelector('#resume-open');
  assert.ok(preview && download && open, 'Resume preview, open and download are available');
  assert.match(preview.getAttribute('src'), /resume-zh\.webp$/);
  assert.match(download.getAttribute('href'), /resume-zh\.pdf$/);
  page.document.querySelector('[data-language="en"]').click();
  assert.match(preview.getAttribute('src'), /resume-en\.webp$/);
  assert.match(download.getAttribute('href'), /resume-en\.pdf$/);
  assert.equal(open.getAttribute('href'), download.getAttribute('href'));
  const stored = page.window.localStorage.getItem('jefferson.preferences');
  page.document.querySelector('[data-language="zh"]').click();
  assert.match(preview.getAttribute('src'), /resume-zh\.webp$/);
  assert.match(download.getAttribute('href'), /resume-zh\.pdf$/);
  const reloaded = await boot({ stored });
  assert.match(reloaded.document.querySelector('#resume-preview-image').getAttribute('src'), /resume-en\.webp$/);
  assert.match(reloaded.document.querySelector('#resume-download').getAttribute('href'), /resume-en\.pdf$/);
  await readFile(new URL(reloaded.document.querySelector('#resume-download').getAttribute('href'), root));
  reloaded.dom.window.close(); page.dom.window.close();
});

// Catches an icon added to index.html without regenerating the subset (npm run icons):
// it would silently render as an empty <i> on the live site.
test('every data-lucide icon in index.html is in the bundled subset and renders as SVG', async () => {
  const subset = await readFile(new URL('vendor/lucide-icons.js', root), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only' });
  const warnings = [];
  dom.window.console.warn = message => warnings.push(message);
  dom.window.eval(subset);
  const used = [...new Set([...html.matchAll(/data-lucide="([^"]+)"/g)].map(match => match[1]))];
  const missing = used.filter(name => !dom.window.lucide.icons.includes(name));
  assert.deepEqual(missing, [], 'Run npm run icons to add: ' + missing.join(', '));
  dom.window.lucide.createIcons({ attrs: { 'stroke-width': 1.8, 'aria-hidden': 'true' } });
  assert.deepEqual(warnings, []);
  assert.equal(dom.window.document.querySelectorAll('i[data-lucide]').length, 0);
  const house = dom.window.document.querySelector('.brand-icon svg');
  assert.equal(house.getAttribute('class'), 'lucide lucide-house');
  assert.equal(house.getAttribute('stroke-width'), '1.8');
  assert.ok(house.querySelector('path'));
  dom.window.close();
});

// Catches a pre-paint script that disagrees with app.js and flashes or keeps the wrong theme.
test('the inline pre-paint script applies a saved dark theme and accent before app.js runs', async () => {
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.equal(inline.length, 1);
  for (const [stored, theme, hue] of [
    ['{"mode":"dark","hue":285}', 'dark', '285'],
    ['{"mode":"light","hue":160}', 'light', '160'],
    ['{"mode":"purple","hue":"oops"}', 'light', ''],
    ['broken json', 'light', '']
  ]) {
    const dom = new JSDOM(html, { url: 'https://example.test/', runScripts: 'outside-only' });
    dom.window.matchMedia = () => ({ matches: false });
    dom.window.localStorage.setItem('jefferson.preferences', stored);
    dom.window.eval(inline[0]);
    assert.equal(dom.window.document.documentElement.dataset.theme, theme, stored);
    assert.equal(dom.window.document.documentElement.style.getPropertyValue('--hue'), hue, stored);
    dom.window.close();
  }
});

// Catches broken share previews (missing image) and a 404 page whose link 404s again on nested paths.
test('share metadata points at real files and the 404 page links home absolutely', async () => {
  const dom = new JSDOM(html);
  const meta = property => dom.window.document.querySelector(`meta[property="${property}"], meta[name="${property}"]`)?.content;
  for (const key of ['og:image', 'twitter:image']) {
    const url = new URL(meta(key));
    assert.equal(url.origin, 'https://chd44.github.io');
    await readFile(new URL('.' + url.pathname, root));
  }
  assert.equal(meta('twitter:card'), 'summary_large_image');
  JSON.parse(dom.window.document.querySelector('script[type="application/ld+json"]').textContent);
  const notFound = new JSDOM(await readFile(new URL('404.html', root), 'utf8'));
  assert.equal(notFound.window.document.querySelector('a').getAttribute('href'), '/');
  dom.window.close(); notFound.window.close();
});

// Catches a description too short for share previews (LinkedIn warns under 100 characters), and a
// static description that the language script then swaps for different text in the browser.
test('page descriptions are long enough for share previews and match the language dictionary', async () => {
  const fresh = new JSDOM(html).window.document;
  const staticDescription = fresh.querySelector('meta[name="description"]').content;
  assert.ok(Array.from(staticDescription).length >= 100, 'meta description has at least 100 characters');
  assert.equal(fresh.querySelector('meta[property="og:description"]').content, staticDescription);
  assert.equal(fresh.querySelector('meta[name="author"]')?.content, 'Jefferson Cai', 'share previews can show the author');
  const page = await boot();
  const meta = selector => page.document.querySelector(selector).content;
  assert.equal(meta('meta[name="description"]'), staticDescription, 'the Chinese script text equals the static text');
  page.document.querySelector('[data-language="en"]').click();
  assert.ok(Array.from(meta('meta[property="og:description"]')).length >= 100, 'English description has at least 100 characters');
  assert.equal(meta('meta[name="description"]'), meta('meta[property="og:description"]'));
  page.dom.window.close();
});

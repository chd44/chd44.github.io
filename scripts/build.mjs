import { mkdir, cp, access, writeFile, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const destination = path.join(root, 'dist');
const files = ['index.html', 'styles.css', 'app.js', 'assets', 'vendor', '.nojekyll', 'THIRD_PARTY_NOTICES.md'];
for (const name of files) {
  try { await access(path.join(root, name)); } catch { throw new Error('Missing required website asset: ' + name); }
}
for (const name of ['assets/banner.webp', 'assets/avatar.jpg', 'vendor/gsap.min.js', 'vendor/lucide.min.js']) {
  const info = await stat(path.join(root, name));
  if (!info.isFile() || info.size === 0) throw new Error('Empty or missing website asset: ' + name);
}
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const name of files) await cp(path.join(root, name), path.join(destination, name), { recursive: true });
await writeFile(path.join(destination, '404.html'), '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Jefferson Cai · 404</title><style>body{font:16px/1.8 system-ui;background:#f0f3fa;color:#222b41;display:grid;place-content:center;min-height:90vh;text-align:center}a{color:#4c64db}h1{font-size:64px;margin:0}</style><h1>404</h1><p>这个页面暂时没有找到。<br>This page could not be found.</p><a href="./">返回主页 / Back home</a></html>');
console.log('Built dist/ — standalone static site, GitHub Pages subpaths supported.');

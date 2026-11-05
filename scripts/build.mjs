import { mkdir, cp, access, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const destination = path.join(root, 'dist');
const files = ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'styles.css', 'app.js', 'assets', 'vendor', '.nojekyll', 'THIRD_PARTY_NOTICES.md'];
for (const name of files) {
  try { await access(path.join(root, name)); } catch { throw new Error('Missing required website asset: ' + name); }
}
for (const name of ['assets/banner.webp', 'assets/avatar.webp', 'assets/og-image.jpg', 'vendor/gsap.min.js', 'vendor/lucide-icons.js']) {
  const info = await stat(path.join(root, name));
  if (!info.isFile() || info.size === 0) throw new Error('Empty or missing website asset: ' + name);
}
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const name of files) await cp(path.join(root, name), path.join(destination, name), { recursive: true });
console.log('Built dist/ — standalone static site, GitHub Pages subpaths supported.');

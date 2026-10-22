import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const project = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const root = process.argv[2] === 'dist' ? path.join(project, 'dist') : project;
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf', '.woff2': 'font/woff2' };
const server = http.createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = urlPath.replace(/^\/+/, '');
    const filename = path.resolve(root, relative || 'index.html');
    const allowed = filename.startsWith(root + path.sep) && !relative.split('/').some(part => part.startsWith('.'));
    if (!allowed || relative.startsWith('node_modules/') || relative.startsWith('tests/') || relative.startsWith('scripts/')) {
      response.writeHead(403).end('Forbidden'); return;
    }
    const file = (await stat(filename)).isDirectory() ? path.join(filename, 'index.html') : filename;
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log('Local: http://localhost:' + port));
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? 'Port ' + port + ' is in use. Run with a different PORT.' : error.message);
  process.exitCode = 1;
});

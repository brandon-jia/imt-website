// Serve the built Astro/Vercel output on loopback without deploying it.
import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

const root = resolve('.vercel/output/static');
const { default: app } = await import(pathToFileURL(resolve('.vercel/output/_functions/entry.mjs')).href);
const port = Number(process.env.LOCAL_PREVIEW_PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let staticFile = false;
    try { staticFile = (await stat(file)).isFile(); } catch {}
    if (staticFile && (req.method === 'GET' || req.method === 'HEAD')) {
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : await readFile(file));
      return;
    }
    const request = new Request(url, { method: req.method, headers: req.headers, ...(!['GET', 'HEAD'].includes(req.method || 'GET') ? { body: Readable.toWeb(req), duplex: 'half' } : {}) });
    const response = await app.fetch(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (req.method === 'HEAD' || !response.body) res.end();
    else Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    console.error(error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Local preview could not load this page.');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local built preview: http://127.0.0.1:${port}`));

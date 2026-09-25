// No packages required: this serves only the compiled local game on loopback.
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'game');
const port = 4186;
const url = `http://127.0.0.1:${port}/`;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff':'font/woff', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wav':'audio/wav', '.glb':'model/gltf-binary', '.webmanifest':'application/manifest+json', '.md':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8' };
try { statSync(path.join(root, 'index.html')); } catch { console.error('The game folder is missing. Extract the complete ZIP before launching.'); process.exit(1); }
const server = http.createServer((req, res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let decoded;
  try { decoded = decodeURIComponent(new URL(req.url, url).pathname); } catch { res.writeHead(400); res.end(); return; }
  const file = path.resolve(root, '.' + (decoded === '/' ? '/index.html' : decoded));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  let stat;
  try { stat = statSync(file); if (!stat.isFile()) throw new Error(); } catch { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file).pipe(res);
});
server.on('error', (err) => { console.error(`Could not start Alderwick: ${err.message}\nClose another Alderwick launcher and try again. The fixed port preserves your local saves.`); process.exit(1); });
server.listen(port, '127.0.0.1', () => {
  console.log(`\nALDERWICK\nOpen ${url} in a current desktop browser.\nKeep this window open while playing. Press Ctrl+C to stop.\n`);
  if (process.env.ALDERWICK_NO_BROWSER !== '1') {
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
    const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
    const browser = spawn(command, args, { detached:true, stdio:'ignore' });
    browser.on('error', () => console.log(`Open ${url} manually.`));
    browser.unref();
  }
});
process.on('SIGINT', () => { server.close(); process.exit(); });

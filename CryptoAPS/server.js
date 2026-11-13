import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/src/app.js', ['src/app.js', 'text/javascript; charset=utf-8']],
  ['/src/crypto.js', ['src/crypto.js', 'text/javascript; charset=utf-8']],
  ['/src/validation.js', ['src/validation.js', 'text/javascript; charset=utf-8']]
]);
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const entry = files.get(pathname);
  if (!entry) { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Não encontrado'); return; }
  try {
    const body = await readFile(resolve(root, entry[0]));
    response.writeHead(200, { 'Content-Type': entry[1], 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Falha ao abrir o arquivo');
  }
});
server.listen(4173, '127.0.0.1', () => console.log('CryptoAPS disponível em http://localhost:4173'));

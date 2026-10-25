const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { HEADERS, reject } = require('./response.cjs');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };

async function serveStatic(request, response, { webRoot, assetRoot }) {
  let url;
  try { url = decodeURIComponent(request.url.split('?')[0]); } catch { throw reject(400, 'La ruta no es válida.'); }
  if (url.includes('..') || url.includes('\\') || url.includes('\0') || /\/(\.[^/]+)/.test(url)) {
    throw reject(404, 'No se encontró el recurso.');
  }
  const assets = url.startsWith('/assets/');
  const base = assets ? assetRoot : webRoot;
  let relative = assets ? url.slice(8) : url.replace(/^\/(web\/)?/, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  if (['blockchain_architecture_multi_industry_simulators.html', 'simulador-visual.html'].includes(relative)) relative = 'index.html';
  const target = path.resolve(base, relative);
  if (!target.startsWith(path.resolve(base) + path.sep)) throw reject(404, 'No se encontró el recurso.');
  let bytes;
  try { bytes = await readFile(target); } catch { throw reject(404, 'No se encontró el recurso.'); }
  response.writeHead(200, { ...HEADERS, 'content-type': (MIME[path.extname(target)] || 'application/octet-stream') + '; charset=utf-8' });
  response.end(request.method === 'HEAD' ? undefined : bytes);
}

module.exports = { serveStatic };

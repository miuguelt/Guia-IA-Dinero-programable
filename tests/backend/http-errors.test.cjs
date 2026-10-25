const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { createHandler } = require('../../backend/http/handler.cjs');
const { createSessions } = require('../../backend/http/sessions.cjs');
const { readJson } = require('../../backend/http/request.cjs');
const { createRunService } = require('../../backend/labs/runs.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aula-boundaries-'));
  await fs.writeFile(path.join(root, 'index.html'), '<main>Aula</main>');
  await fs.writeFile(path.join(root, 'result.bin'), 'observado');
  await fs.mkdir(path.join(root, 'assets'));
  await fs.writeFile(path.join(root, 'assets', 'diagram.svg'), '<svg></svg>');
  const pending = [];
  let closing = false;
  const runs = createRunService(() => closing ? {} : new Promise(resolve => pending.push(resolve)));
  const dependencies = { webRoot: root, assetRoot: path.join(root, 'assets'), runs, runtime: async () => ({ api: true }),
    webAuthn: { registrationOptions: async () => { throw new Error('dato reservado'); } } };
  const server = http.createServer(createHandler(dependencies));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  t.after(async () => {
    closing = true;
    for (const resolve of pending) resolve({});
    await runs.idle();
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true });
  });
  async function request(url, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: url, method: options.method || 'GET', headers: options.headers || {} }, response => {
        let body = '';
        response.on('data', chunk => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
      });
      req.on('error', reject);
      req.end(options.body);
    });
  }
  const response = await request('/api/runtime');
  const headers = { cookie: response.headers['set-cookie'][0].split(';')[0], 'content-type': 'application/json', 'x-csrf-token': JSON.parse(response.body).csrfToken };
  return { request, headers, dependencies, port, pending };
}

test('HTTP: archivos, rutas codificadas, HEAD, métodos y límite real de entrada', async t => {
  const { request, headers } = await fixture(t);
  const head = await request('/', { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(head.body, '');
  assert.equal((await request('/assets/diagram.svg')).headers['content-type'], 'image/svg+xml; charset=utf-8');
  assert.match((await request('/result.bin')).headers['content-type'], /application\/octet-stream/);
  assert.equal((await request('/web/')).status, 200);
  assert.equal((await request('/simulador-visual.html')).status, 200);
  assert.equal((await request('/', { method: 'POST' })).status, 405);
  assert.equal((await request('/%')).status, 400);
  for (const url of ['/assets/%2e%2e/secret', '/%5csecret', '/%00', '/.git/config', '/missing', '/folder/']) {
    assert.equal((await request(url)).status, 404, url);
  }
  for (const body of ['[]', 'null', '"texto"']) {
    assert.equal((await request('/api/labs/evm/runs', { method: 'POST', headers, body })).status, 400);
  }
  assert.equal((await request('/api/labs/evm/runs', { method: 'POST', headers: { ...headers, 'content-type': 'text/plain' }, body: '{}' })).status, 415);
  const large = await request('/api/labs/evm/runs', { method: 'POST', headers, body: JSON.stringify({ input: 'a'.repeat(70000) }) });
  assert.equal(large.status, 413);
  const error = await request('/api/auth/register/options', { method: 'POST', headers, body: '{}' });
  assert.equal(error.status, 500); assert.equal(error.body.includes('dato reservado'), false);
});

test('HTTP: rechaza Host externo, origen cruzado, tokens alterados y exceso de prácticas', async t => {
  const { request, headers, port } = await fixture(t);
  assert.equal((await request('/api/runtime', { headers: { host: 'example.com' } })).status, 403);
  assert.equal((await request('/api/labs/evm/runs', { method: 'POST', headers: { ...headers, origin: `http://localhost:${port}` }, body: '{}' })).status, 403);
  const altered = headers['x-csrf-token'].replace(/^./, headers['x-csrf-token'][0] === 'a' ? 'b' : 'a');
  assert.equal((await request('/api/labs/evm/runs', { method: 'POST', headers: { ...headers, 'x-csrf-token': altered }, body: '{}' })).status, 403);
  for (let index = 0; index < 20; index++) {
    assert.equal((await request('/api/labs/evm/runs', { method: 'POST', headers, body: '{}' })).status, 202);
  }
  assert.equal((await request('/api/labs/evm/runs', { method: 'POST', headers, body: '{}' })).status, 429);
});

test('el controlador rechaza dirección remota ajena antes de ejecutar dependencias', async () => {
  let status, output;
  const response = { writeHead(value) { status = value; }, end(value) { output = value; } };
  await createHandler({})({ socket: { remoteAddress: '203.0.113.1' }, url: '/' }, response);
  assert.equal(status, 403);
  assert.match(JSON.parse(output).error.message, /locales/);
});

test('sesiones: caducidad y capacidad acotada sin reutilizar identidades expulsadas', () => {
  const sessions = createSessions();
  const response = { setHeader() {} };
  const first = sessions.get({ headers: {} }, response);
  assert.equal(sessions.get({ headers: { cookie: `aula_session=${first.id}` } }, response).id, first.id);
  first.touched = Date.now() - 28800001;
  assert.notEqual(sessions.get({ headers: { cookie: `aula_session=${first.id}` } }, response).id, first.id);
  const victim = sessions.get({ headers: {} }, response);
  for (let index = 0; index < 500; index++) sessions.get({ headers: {} }, response);
  assert.notEqual(sessions.get({ headers: { cookie: `aula_session=${victim.id}` } }, response).id, victim.id);
});

test('lectura JSON: cuerpo vacío, fragmentado y validaciones de objeto', async () => {
  const empty = Readable.from([]); empty.headers = { 'content-type': 'application/json' };
  assert.deepEqual(await readJson(empty), {});
  const fragmented = Readable.from(['{"input":', '{"value":5}}']); fragmented.headers = { 'content-type': 'application/json; charset=utf-8' };
  assert.deepEqual(await readJson(fragmented), { input: { value: 5 } });
  const invalid = Readable.from(['null']); invalid.headers = { 'content-type': 'application/json' };
  await assert.rejects(readJson(invalid), { status: 400 });
});

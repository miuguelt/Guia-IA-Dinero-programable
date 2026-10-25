const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { mkdtemp, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { createHandler } = require('../../backend/http/handler.cjs');

test('API: sesión, CSRF, aislamiento, errores y archivos públicos', async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), 'aula-http-'));
  await writeFile(path.join(root, 'index.html'), '<h1>Aula</h1>');
  const jobs = new Map();
  const runs = {
    create(labId, input, sessionId) {
      if (labId === 'unknown') throw Object.assign(new Error('Laboratorio no disponible.'), { status: 404 });
      const job = { id: crypto.randomUUID(), labId, input, sessionId, mode: 'real', status: 'queued' };
      jobs.set(job.id, job); return job;
    },
    get(id, sessionId) { const job = jobs.get(id); return job?.sessionId === sessionId ? job : null; }
  };
  const webAuthn = Object.fromEntries(['registrationOptions', 'register', 'authenticationOptions', 'authenticate']
    .map(name => [name, async (sessionId, input) => ({ name, ok: true, input: input ?? null })]));
  const server = createServer(createHandler({ webRoot: root, assetRoot: root, runs,
    runtime: async () => ({ api: true }), revision: async () => ({ revision: 'build-1' }), webAuthn }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const state = await fetch(base + '/api/runtime');
  const cookie = state.headers.get('set-cookie').split(';')[0];
  const { csrfToken } = await state.json();
  const headers = { cookie, 'content-type': 'application/json', 'x-csrf-token': csrfToken };
  assert.ok(csrfToken); assert.match(cookie, /aula_session=/);
  assert.equal((await fetch(base + '/')).status, 200);
  assert.deepEqual(await (await fetch(base + '/api/revision')).json(), { revision: 'build-1' });
  assert.equal((await fetch(base + '/missing')).status, 404);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/api/labs/evm/runs', { method: 'POST', body: '{}' })).status, 403);
  const invalidOrigin = await fetch(base + '/api/labs/evm/runs', {
    method: 'POST', headers: { ...headers, origin: 'https://example.org' }, body: '{}' });
  assert.equal(invalidOrigin.status, 403);
  const bad = await fetch(base + '/api/labs/evm/runs', { method: 'POST', headers, body: '{' });
  assert.equal(bad.status, 400);
  const runResponse = await fetch(base + '/api/labs/evm/runs', {
    method: 'POST', headers, body: JSON.stringify({ input: { amountEth: '1' } }) });
  assert.equal(runResponse.status, 202);
  const job = await runResponse.json();
  assert.equal((await fetch(base + '/api/runs/' + job.id, { headers: { cookie } })).status, 200);
  assert.equal((await fetch(base + '/api/runs/' + job.id)).status, 404);
  assert.equal((await fetch(base + '/api/unknown')).status, 404);
  for (const route of ['register/options', 'register/verify', 'login/options', 'login/verify']) {
    const response = await fetch(base + '/api/auth/' + route, { method: 'POST', headers, body: '{}' });
    assert.equal(response.status, 200); assert.equal((await response.json()).ok, true);
  }
  assert.equal((await fetch(base + '/api/auth/unknown', { method: 'POST', headers, body: '{}' })).status, 404);
  assert.equal((await fetch(base + '/api/labs/unknown/runs', { method: 'POST', headers, body: '{}' })).status, 404);
});

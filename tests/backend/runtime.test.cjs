const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const { createRuntime } = require('../../backend/runtime.cjs');
const { startServer, runCli } = require('../../backend/server.cjs');

test('runtime real: PostgreSQL, nodo local, firma y transacción con indexación observable', async t => {
  const dependencies = await createRuntime();
  t.after(() => dependencies.close());
  const status = await dependencies.runtime();
  assert.equal(status.api, true);
  assert.equal(status.database.connected, true);
  assert.equal(status.chain.connected, true, 'Inicia el nodo local y despliega los contratos antes de la integración.');
  assert.equal(Number(status.chain.chainId), 31337);
  const owner = crypto.randomUUID();
  const signature = dependencies.runs.create('signatures', { reading: 4.2 }, owner);
  await dependencies.runs.idle();
  const signed = dependencies.runs.get(signature.id, owner);
  assert.equal(signed.status, 'completed');
  assert.equal(signed.result.verification.verified, true);
  const deposit = dependencies.runs.create('evm', { action: 'deposit', amountEth: '0.0001' }, owner);
  await dependencies.runs.idle();
  const recorded = dependencies.runs.get(deposit.id, owner);
  assert.equal(recorded.status, 'completed', recorded.error?.message);
  assert.match(recorded.result.receipt.hash, /^0x[\da-f]{64}$/i);
  assert.equal(recorded.result.indexing.status, 'indexed');
});

test('servidor real sirve la guía y API del mismo origen y permite cierre controlado', async t => {
  const instance = await startServer({ port: 0 });
  t.after(() => instance.close());
  const base = `http://127.0.0.1:${instance.server.address().port}`;
  const response = await fetch(base + '/api/runtime');
  const status = await response.json();
  assert.equal(response.status, 200);
  assert.equal(status.database.connected, true);
  assert.ok(status.csrfToken);
  const revision = await fetch(base + '/api/revision');
  assert.equal(revision.status, 200);
  assert.match((await revision.json()).revision, /:/);
  const page = await fetch(base + '/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(await page.text(), /<html[^>]*lang="es-CO"/);
});

test('el puerto definido por entorno se aplica y un puerto ocupado falla de forma explícita', async t => {
  const old = process.env.GUIA_PORT;
  process.env.GUIA_PORT = '0';
  const instance = await startServer();
  if (old === undefined) delete process.env.GUIA_PORT;
  else process.env.GUIA_PORT = old;
  t.after(() => instance.close());
  assert.ok(instance.server.address().port > 0);
  const dependencies = await createRuntime();
  t.after(() => dependencies.close());
  await assert.rejects(startServer({ port: instance.server.address().port, dependencies }), { code: 'EADDRINUSE' });
});

test('CLI: inicia un servidor real y la señal controlada cierra sus conexiones', async () => {
  const operator = new EventEmitter();
  const messages = [];
  let exitCode;
  const exited = new Promise(resolve => { operator.exit = code => { exitCode = code; resolve(); }; });
  const cli = await runCli({ operator, logger: { log: message => messages.push(message), error: message => messages.push(message) }, options: { port: 0 } });
  assert.ok(cli.instance.server.listening);
  const response = await fetch(`http://127.0.0.1:${cli.instance.server.address().port}/api/runtime`);
  assert.equal((await response.json()).database.connected, true);
  operator.emit('SIGTERM');
  await exited;
  assert.equal(exitCode, 0);
  assert.equal(cli.instance.server.listening, false);
  assert.match(messages[0], /Aula disponible/);
});

test('CLI: un puerto ocupado comunica el fallo y devuelve código de salida no exitoso', async t => {
  const instance = await startServer({ port: 0 });
  t.after(() => instance.close());
  const dependencies = await createRuntime();
  t.after(() => dependencies.close());
  const operator = new EventEmitter();
  const errors = [];
  const result = await runCli({ operator, logger: { log() {}, error: message => errors.push(message) }, options: { port: instance.server.address().port, dependencies } });
  assert.equal(result, null);
  assert.equal(operator.exitCode, 1);
  assert.match(errors[0], /No se pudo iniciar/);
});

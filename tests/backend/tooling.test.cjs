const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { buildWeb, runBuildCli } = require('../../scripts/build-web.cjs');
const { startDevelopment, runDevelopmentCli } = require('../../scripts/dev.cjs');
const { provisionDatabase, runProvisionCli } = require('../../scripts/provision-database.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aula-development-'));
  await fs.mkdir(path.join(root, 'frontend/web'), { recursive: true });
  await fs.mkdir(path.join(root, 'js/vendor'), { recursive: true });
  await fs.mkdir(path.join(root, 'css/vendor'), { recursive: true });
  await fs.mkdir(path.join(root, 'backend'), { recursive: true });
  await fs.mkdir(path.join(root, 'artifacts'), { recursive: true });
  await fs.writeFile(path.join(root, 'frontend/web/index.html'), '<main>Aula de prueba</main>');
  await fs.writeFile(path.join(root, 'frontend/web/styles.css'), 'body { color: green; }');
  await fs.writeFile(path.join(root, 'frontend/web/main.js'), 'document.title="Valor inicial";');
  await fs.writeFile(path.join(root, 'frontend/web/devbrain-prose.js'), 'globalThis.DevBrainProseLayout = {};');
  await fs.writeFile(path.join(root, 'frontend/web/devbrain-prose.css'), '.prose {}');
  await fs.writeFile(path.join(root, 'js/vendor/devbrain-learner-sdk.js'), 'window.DevBrainSDK = {};');
  await fs.writeFile(path.join(root, 'css/vendor/devbrain-learner-sdk.css'), '.sdk {}');
  await fs.writeFile(path.join(root, 'css/vendor/devbrain-reader.css'), '.reader {}');
  await fs.mkdir(path.join(root, 'taller/inicio'), { recursive: true });
  await fs.writeFile(path.join(root, 'taller/inicio/package.json'), '{}');
  await fs.writeFile(path.join(root, 'backend/server.cjs'), `
const http=require('node:http'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>res.end(JSON.stringify({pid:process.pid,root})));
server.listen(0,'127.0.0.1',()=>fs.writeFileSync(path.join(root,'artifacts/server-info.json'),JSON.stringify({port:server.address().port,pid:process.pid})));
`);
  t.after(async () => {
    try {
      const info = JSON.parse(await fs.readFile(path.join(root, 'artifacts/server-info.json'), 'utf8'));
      process.kill(info.pid);
    } catch (error) { if (!['ESRCH', 'ENOENT'].includes(error.code)) throw error; }
    await fs.rm(root, { recursive: true, force: true });
  });
  return root;
}

async function waitFor(action, timeout = 6000) {
  const limit = Date.now() + timeout;
  let last;
  while (Date.now() < limit) {
    try { const result = await action(); if (result) return result; } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw last || new Error('La condición observable no se cumplió dentro del plazo.');
}

test('CLI de compilación comunica éxito y falla sin alterar fuentes', async t => {
  const root = await fixture(t);
  const messages = [];
  const logger = { log: message => messages.push(message), error: message => messages.push(message) };
  const operator = {};
  assert.equal(await runBuildCli({ root, operator, logger }), true);
  assert.match(await fs.readFile(path.join(root, 'web/main.js'), 'utf8'), /Valor inicial/);
  await fs.writeFile(path.join(root, 'frontend/web/main.js'), 'const = ;');
  assert.equal(await runBuildCli({ root, operator, logger }), false);
  assert.equal(operator.exitCode, 1);
  assert.match(messages[1], /No se pudo compilar/);
});

test('recarga nativa recompila al guardar, se recupera de errores y cierra su proceso', async t => {
  const root = await fixture(t);
  const output = path.join(root, 'web/main.js');
  const source = path.join(root, 'frontend/web/main.js');
  const messages = [];
  const original = console.error;
  console.error = value => messages.push(value);
  t.after(() => { console.error = original; });
  const instance = await startDevelopment(root);
  t.after(() => instance.close());
  const info = await waitFor(async () => JSON.parse(await fs.readFile(path.join(root, 'artifacts/server-info.json'), 'utf8')));
  const origin = `http://127.0.0.1:${info.port}`;
  assert.equal((await (await fetch(origin)).json()).root, root);
  await fs.writeFile(source, 'document.title="Valor actualizado";');
  await waitFor(async () => (await fs.readFile(output, 'utf8')).includes('Valor actualizado'));
  await fs.writeFile(source, 'const = ;');
  await waitFor(() => messages.some(message => /recarga no pudo compilar/.test(message)));
  assert.match(await fs.readFile(output, 'utf8'), /Valor actualizado/);
  await fs.writeFile(source, 'document.title="Recuperado";');
  await waitFor(async () => (await fs.readFile(output, 'utf8')).includes('Recuperado'));
  await fs.writeFile(source, 'document.title="Cambio final";');
  await new Promise(resolve => setTimeout(resolve, 200));
  await instance.close();
  assert.match(await fs.readFile(output, 'utf8'), /Cambio final/);
  await fs.access(path.join(root, 'web/descargas/taller-agropay.zip'));
  await fs.rm(path.join(root, 'web'), { recursive: true });
  await new Promise(resolve => setTimeout(resolve, 300));
  await assert.rejects(fs.access(path.join(root, 'web')), { code: 'ENOENT' });
  await waitFor(async () => {
    try { await fetch(origin); return false; } catch { return true; }
  }, 3000);
  assert.match(await fs.readFile(source, 'utf8'), /Cambio final/);
});

test('CLI de desarrollo registra la señal de cierre y rechaza fuentes inválidas', async t => {
  const root = await fixture(t);
  const operator = new EventEmitter();
  const messages = [];
  const logger = { log() {}, error: message => messages.push(message) };
  const instance = await runDevelopmentCli({ root, operator, logger });
  assert.ok(instance);
  await waitFor(async () => fs.readFile(path.join(root, 'artifacts/server-info.json'), 'utf8'));
  operator.emit('SIGINT');
  await fs.writeFile(path.join(root, 'frontend/web/main.js'), 'const = ;');
  const failed = await runDevelopmentCli({ root, operator, logger });
  assert.equal(failed, null);
  assert.equal(operator.exitCode, 1);
  assert.match(messages[0], /No se pudo iniciar/);
});

test('aprovisionamiento real es idempotente y limita la escritura a la guía', async () => {
  const result = await provisionDatabase();
  assert.deepEqual(result, { database: 'guia_dinero_programable', role: 'guia_dinero_programable' });
  const messages = [];
  const operator = {};
  const logger = { log: message => messages.push(message), error: message => messages.push(message) };
  assert.equal(await runProvisionCli({ operator, logger }), true);
  await assert.rejects(provisionDatabase({}), /GUIA_ADMIN_USER/);
  await assert.rejects(provisionDatabase({ ...process.env, GUIA_DB_USER: 'outside_scope' }), /no pertenece/);
  assert.equal(await runProvisionCli({ env: {}, operator, logger }), false);
  assert.equal(operator.exitCode, 1);
  assert.match(messages[1], /No se pudo preparar/);
});

test('cierre de la recarga espera la compilación en curso y descarta guardados posteriores', async t => {
  const root = await fixture(t);
  const source = path.join(root, 'frontend/web/main.js');
  const builds = [];
  let release;
  const build = target => {
    builds.push(target);
    if (builds.length === 1) return buildWeb(target);
    return new Promise(resolve => { release = resolve; });
  };
  const instance = await startDevelopment(root, { build });
  t.after(() => { release?.(); return instance.close(); });
  await fs.writeFile(source, 'document.title="Pendiente";');
  await waitFor(() => builds.length === 2);
  let settled = false;
  const closing = instance.close().then(() => { settled = true; });
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(settled, false);
  release();
  await closing;
  assert.equal(settled, true);
  await fs.writeFile(source, 'document.title="Tras el cierre";');
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.equal(builds.length, 2);
});

test('la CI se detiene con un mensaje claro si la cadena o la API no responden a tiempo', async () => {
  const script = await fs.readFile(path.join(__dirname, '../../scripts/ci-native.ps1'), 'utf8');
  const esperas = script.match(/for \(\$attempt = 0; \$attempt -lt 40; \$attempt\+\+\)/g) ?? [];
  const cortes = script.match(/if \(\$attempt -ge 40\) \{ throw '[^']+' \}/g) ?? [];
  assert.equal(esperas.length, 2);
  assert.equal(cortes.length, esperas.length);
});

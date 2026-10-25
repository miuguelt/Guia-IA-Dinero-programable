import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { createLiveReload } from '../../frontend/web/navigation/live.mjs';
import { createAula } from '../../frontend/web/main.js';

function createClock() {
  const handlers = new Map();
  let identifier = 0;
  return {
    delays: [],
    setInterval(callback, delay) { this.delays.push(delay); handlers.set(++identifier, callback); return identifier; },
    clearInterval(id) { handlers.delete(id); },
    async tick() { for (const callback of [...handlers.values()]) await callback(); },
    get active() { return handlers.size; }
  };
}
function fixture(host = 'localhost') {
  const dom = new JSDOM('<div id="aula"></div>', { url: 'http://' + host + ':8153/#m3/2', pretendToBeVisual: true, runScripts: 'outside-only' });
  dom.window.eval(readFileSync('js/vendor/devbrain-learner-sdk.js', 'utf8'));
  dom.window.scrollTo = () => {};
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  return { dom, window: dom.window, document: dom.window.document, clock: createClock() };
}

test('consulta cada dos segundos y recarga solo cuando cambia la revisión, conservando el enlace', async () => {
  const context = fixture();
  const calls = [];
  let revision = 'build-1', reloads = 0;
  const live = createLiveReload({ ...context, fetcher: async (path, options) => { calls.push({ path, options }); return Response.json({ revision }); }, reload: () => reloads++ });
  await live.ready;
  assert.equal(calls.length, 1);
  assert.deepEqual(context.clock.delays, [2000]);
  assert.equal(calls[0].path, '/api/revision');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(reloads, 0);
  await context.clock.tick();
  assert.equal(reloads, 0);
  revision = 'build-2';
  await context.clock.tick();
  assert.equal(reloads, 1);
  assert.equal(context.window.location.hash, '#m3/2');
  await context.clock.tick();
  assert.equal(reloads, 1);
  live.destroy();
  assert.equal(context.clock.active, 0);
  context.window.close();
});

test('no consulta mientras la página está oculta y no se activa en un host remoto', async () => {
  const context = fixture('127.0.0.1');
  let visibility = 'hidden', requests = 0;
  Object.defineProperty(context.document, 'visibilityState', { get: () => visibility });
  const live = createLiveReload({ ...context, fetcher: async () => { requests++; return Response.json({ revision: 1 }); } });
  await live.ready;
  await context.clock.tick();
  assert.equal(requests, 0);
  visibility = 'visible';
  await context.clock.tick();
  assert.equal(requests, 1);
  live.destroy();
  const remote = fixture('example.org');
  const disabled = createLiveReload({ ...remote, fetcher: async () => { throw new Error('No debe consultar.'); } });
  await disabled.ready;
  assert.equal(remote.clock.active, 0);
  disabled.destroy();
  const unsupported = createLiveReload(context);
  await unsupported.ready;
  assert.equal(context.clock.active, 0);
  unsupported.destroy();
  context.window.close();
  remote.window.close();
});

test('un servidor estático sin la API detiene el sondeo; las respuestas inválidas no anuncian éxito', async () => {
  const context = fixture();
  const missing = createLiveReload({ ...context, fetcher: async () => new Response('not found', { status: 404 }) });
  await missing.ready;
  assert.equal(context.clock.active, 0);
  missing.destroy();
  let response = Response.json({ revision: 'stable' }), reloads = 0;
  const live = createLiveReload({ ...context, fetcher: async () => response, reload: () => reloads++ });
  await live.ready;
  response = new Response('invalid', { status: 500 });
  await context.clock.tick();
  response = new Response('not JSON', { status: 200 });
  await context.clock.tick();
  response = Response.json({ revision: {} });
  await context.clock.tick();
  assert.equal(reloads, 0);
  live.destroy();
  const offline = createLiveReload({ ...context, fetcher: async () => { throw new Error('offline'); } });
  await offline.ready;
  assert.equal(reloads, 0);
  offline.destroy();
  context.window.close();
});

test('destroy evita una recarga pendiente y la consulta nunca se solapa', async () => {
  const context = fixture();
  let finish, requests = 0, reloads = 0;
  const pending = new Promise(resolve => { finish = resolve; });
  const live = createLiveReload({ ...context, fetcher: async () => { requests++; return pending; }, reload: () => reloads++ });
  await context.clock.tick();
  assert.equal(requests, 1);
  live.destroy();
  finish(Response.json({ revision: 'late' }));
  await live.ready;
  assert.equal(reloads, 0);
  assert.equal(context.clock.active, 0);
  context.window.close();
});

test('createAula conecta el reloj local y destroy lo libera', async () => {
  const context = fixture();
  const app = createAula({ ...context, storage: context.window.localStorage, api: { runtime: async () => ({}) }, liveReload: { clock: context.clock, fetcher: async () => Response.json({ revision: 'first' }), reload: () => {} } });
  await app.ready;
  assert.equal(context.clock.active, 1);
  app.destroy();
  assert.equal(context.clock.active, 0);
  const disabled = createAula({ ...context, storage: context.window.localStorage, api: { runtime: async () => ({}) }, liveReload: false });
  disabled.destroy();
  context.window.close();
});

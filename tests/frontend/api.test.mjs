import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from '../../frontend/web/labs/api.mjs';
import { practiceWebAuthn } from '../../frontend/web/labs/auth.mjs';

test('solicita sesión y envía CSRF antes de ejecutar; conserva fases observadas', async () => {
  const calls = [];
  const statuses = ['running', 'confirmed', 'indexed', 'completed'];
  const fetcher = async (path, options) => {
    calls.push({ path, options });
    if (path === '/api/runtime') return Response.json({ api: true, csrfToken: 'ephemeral-test-value' });
    if (options.method === 'POST') return Response.json({ id: 'run-1', status: 'queued' }, { status: 202 });
    return Response.json({ id: 'run-1', status: statuses.shift(), mode: 'real', result: { accepted: true } });
  };
  const api = createApi(fetcher);
  const updates = [];
  const result = await api.run('pharma', { temperature: 4 }, record => updates.push(record.status));
  assert.equal(result.status, 'completed');
  assert.deepEqual(updates, ['queued', 'running', 'confirmed', 'indexed', 'completed']);
  assert.equal(calls[1].options.headers['X-CSRF-Token'], 'ephemeral-test-value');
  assert.deepEqual(JSON.parse(calls[1].options.body), { input: { temperature: 4 } });
  assert.ok(calls.every(call => call.options.credentials === 'same-origin'));
});

test('un fallo de red o una respuesta inválida se informa sin simular éxito', async () => {
  await assert.rejects(createApi(async () => { throw new Error('unavailable'); }).runtime(), /servicio local/);
  await assert.rejects(createApi(async () => new Response('no JSON', { status: 500 })).runtime(), /no se puede leer/);
  await assert.rejects(createApi(async () => Response.json({}, { status: 400 })).runtime(), /no pudo completarse/);
  await assert.rejects(createApi(async () => Response.json({ error: { message: 'Firma inválida.' } }, { status: 400 })).runtime(), /Firma inválida/);
  const api = createApi(async path => Response.json(path === '/api/runtime' ? { csrfToken: 'local-only' } : { status: 'failed', error: { message: 'Dependencia ausente.' } }));
  const record = await api.run('audit', {}, () => {});
  assert.equal(record.status, 'failed');
  assert.equal(record.error.message, 'Dependencia ausente.');
});

test('una copia publicada sin servicio local orienta a la Simulación sin ocultar errores de la API', async () => {
  const staticHost = async () => new Response('<h1>404</h1>', { status: 404, headers: { 'content-type': 'text/html' } });
  await assert.rejects(createApi(staticHost).runtime(), /no incluye el servicio local.*start-windows\.ps1.*Simulación/);
  await assert.rejects(createApi(staticHost).run('evm', {}, () => {}), /no incluye el servicio local/);
  const apiNotFound = async () => Response.json({ error: { message: 'La ejecución no existe.' } }, { status: 404 });
  await assert.rejects(createApi(apiNotFound).runtime(), /La ejecución no existe/);
});

test('cancelar la consulta o alcanzar el límite no confirma una operación pendiente', async () => {
  const api = createApi(async path => Response.json(path === '/api/runtime' ? { csrfToken: 'local-only' } : { id: 'pending', status: 'running' }));
  await assert.rejects(api.run('evm', {}, () => {}, { aborted: true }), /dejó de consultar/);
  const previous = Date.now;
  let call = 0;
  Date.now = () => call++ === 0 ? 0 : 180001;
  try { await assert.rejects(api.run('evm', {}, () => {}), /sigue sin terminar/); }
  finally { Date.now = previous; }
  assert.ok(createApi());
});

test('WebAuthn usa opciones del servidor y solo anuncia verificación aprobada', async () => {
  const paths = [];
  const api = { post: async (path, body) => { paths.push({ path, body }); return path.endsWith('options') ? { challenge: 'challenge' } : { verified: true }; } };
  const client = { register: async input => ({ registered: input.optionsJSON.challenge }), authenticate: async input => ({ authenticated: input.optionsJSON.challenge }) };
  assert.match(await practiceWebAuthn('register', api, { credentials: {} }, client), /registrada/);
  assert.match(await practiceWebAuthn('login', api, { credentials: {} }, client), /verificada/);
  assert.deepEqual(paths.map(item => item.path), ['/api/auth/register/options', '/api/auth/register/verify', '/api/auth/login/options', '/api/auth/login/verify']);
  assert.equal(paths[1].body.registered, 'challenge');
  await assert.rejects(practiceWebAuthn('register', api, {}, client), /no dispone/);
  await assert.rejects(practiceWebAuthn('login', { post: async () => ({ verified: false }) }, { credentials: {} }, client), /no pudo verificar/);
});

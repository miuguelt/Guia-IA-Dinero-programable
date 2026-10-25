const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../../backend/persistence/store.cjs');

function database() {
  const statements = [];
  const pool = {
    async query(sql, values) {
      statements.push([sql, values]);
      if (sql.includes('current_database')) return { rows: [{ name: 'guia_dinero_programable' }] };
      if (sql.startsWith('SELECT id,')) return { rows: [] };
      if (sql.startsWith('SELECT deployment_id')) return { rows: [{ deployment_id: 'd1', tx_hash: '0x1', log_index: 0, block_number: '5', name: 'Lectura', args: { value: '3' } }] };
      return { rows: [], rowCount: 1 };
    },
    async connect() { return { query: pool.query, release() { statements.push(['RELEASE']); } }; },
    async end() { statements.push(['END']); }
  };
  return { pool, statements };
}

test('inicializa solo la base dedicada, informa salud y cierra conexiones', async () => {
  const { pool, statements } = database();
  const store = createStore({ pool });
  await store.initialize();
  assert.equal((await store.health()).connected, true);
  assert.ok(statements.some(([sql]) => sql.includes('CREATE TABLE IF NOT EXISTS guide_events')));
  await store.close();
  assert.ok(statements.some(([sql]) => sql === 'END'));
});

test('registra e indexa eventos idempotentes y reconstruye dentro de transacción', async () => {
  const { pool, statements } = database();
  const store = createStore({ pool });
  const event = { txHash: '0x1', logIndex: 0, blockNumber: 5, name: 'Lectura', args: { value: '3' } };
  assert.equal((await store.recordEvents('d1', [event])).indexed, 1);
  assert.deepEqual((await store.readEvents('d1'))[0], { deploymentId: 'd1', ...event, blockNumber: '5' });
  assert.equal((await store.rebuild('d1', [event])).indexed, 1);
  assert.ok(statements.some(([sql]) => sql.startsWith('DELETE FROM guide_projections')));
  assert.ok(statements.some(([sql]) => sql === 'COMMIT'));
  await assert.rejects(store.recordEvents('', [event]), { code: 'EVENT_INVALID' });
  await assert.rejects(store.recordEvents('d1', [{ ...event, logIndex: -1 }]), { code: 'EVENT_INVALID' });
  await assert.rejects(store.recordEvents('d1', [{ ...event, args: { invalid: 1n } }]), { code: 'EVENT_INVALID' });
});

test('revierte el bloque de eventos ante fallo SQL y conserva el error', async () => {
  const { pool, statements } = database();
  const query = pool.query;
  pool.query = async (sql, args) => {
    if (sql.startsWith('INSERT INTO guide_events')) throw new Error('fallo de escritura');
    return query(sql, args);
  };
  const store = createStore({ pool });
  await assert.rejects(store.recordEvents('d1', [{ txHash: '0x1', logIndex: 0, blockNumber: 1, name: 'E', args: {} }]), /fallo de escritura/);
  assert.ok(statements.some(([sql]) => sql === 'ROLLBACK'));
});

test('credenciales públicas: almacena, obtiene, actualiza y valida', async () => {
  const { pool, statements } = database();
  const store = createStore({ pool });
  const credential = { id: 'public-id', sessionId: 'session', publicKey: new Uint8Array([1, 2]), counter: 0, transports: ['internal'] };
  await store.saveCredential(credential);
  assert.equal(await store.getCredential('missing'), null);
  const query = pool.query;
  pool.query = async (sql, args) => sql.startsWith('SELECT id,') ? { rows: [{ id: 'public-id', session_id: 'session', public_key: Buffer.from([1, 2]), counter: '1', transports: ['internal'] }] } : query(sql, args);
  assert.deepEqual((await store.getCredential('public-id')).publicKey, new Uint8Array([1, 2]));
  assert.equal((await store.listCredentials('session'))[0].id, 'public-id');
  await store.updateCredential('public-id', 2);
  assert.ok(statements.some(([sql]) => sql.startsWith('UPDATE guide_credentials')));
  await assert.rejects(store.saveCredential({ ...credential, privateKey: 'forbidden' }), { code: 'CREDENTIAL_INVALID' });
  await assert.rejects(store.updateCredential('public-id', -1), { code: 'CREDENTIAL_INVALID' });
});

test('rechaza otra base e informa desconexión sin filtrar mensajes de autenticación', async () => {
  const { pool } = database();
  pool.query = async () => ({ rows: [{ name: 'postgres' }] });
  await assert.rejects(createStore({ pool }).initialize(), { code: 'DATABASE_SCOPE' });
  pool.query = async () => { throw new Error('dato reservado'); };
  const health = await createStore({ pool }).health();
  assert.equal(health.connected, false);
  assert.equal(JSON.stringify(health).includes('dato reservado'), false);
  const configured = createStore({ host: '127.0.0.1', port: 1, user: 'example', connectionTimeoutMillis: 20 });
  assert.equal((await configured.health()).connected, false);
  await configured.close();
});

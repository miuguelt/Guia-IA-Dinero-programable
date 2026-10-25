const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { Pool } = require('pg');
const { createStore } = require('../../backend/persistence/store.cjs');

test('PostgreSQL real: eventos idempotentes, reconstrucción aislada y credenciales públicas', async () => {
  const pool = new Pool({ host: '127.0.0.1', port: 5434, database: 'guia_dinero_programable', user: process.env.GUIA_DB_USER, password: process.env.GUIA_DB_PASSWORD, connectionTimeoutMillis: 2000 });
  const store = createStore({ pool });
  const deployment = `test-${crypto.randomUUID()}`;
  const second = `test-${crypto.randomUUID()}`;
  const id = crypto.randomUUID();
  const event = { txHash: `0x${crypto.randomBytes(32).toString('hex')}`, logIndex: 0, blockNumber: 12, name: 'LecturaRegistrada', args: { temperatura: '4.2', lote: 'L1' } };
  try {
    assert.equal((await store.initialize()).initialized, true);
    assert.equal((await store.health()).connected, true);
    await store.recordEvents(deployment, [event, event]);
    await store.recordEvents(second, [event]);
    assert.equal((await store.readEvents(deployment)).length, 1);
    const restored = { ...event, logIndex: 1, name: 'Cuarentena' };
    await store.rebuild(deployment, [restored]);
    assert.equal((await store.readEvents(deployment))[0].name, 'Cuarentena');
    assert.equal((await store.readEvents(second))[0].name, 'LecturaRegistrada');
    await store.saveCredential({ id, sessionId: deployment, publicKey: new Uint8Array([1, 2, 3]), counter: 0, transports: ['internal'] });
    await store.updateCredential(id, 4);
    assert.equal((await store.getCredential(id)).counter, 4);
    assert.equal((await store.listCredentials(deployment)).length, 1);
    assert.equal(await store.getCredential('inexistente'), null);
    await assert.rejects(store.saveCredential({ id, sessionId: deployment, publicKey: new Uint8Array([1]), counter: 0 }), { code: '23505' });
  } finally {
    await pool.query('DELETE FROM guide_projections WHERE deployment_id = ANY($1::text[])', [[deployment, second]]);
    await pool.query('DELETE FROM guide_events WHERE deployment_id = ANY($1::text[])', [[deployment, second]]);
    await pool.query('DELETE FROM guide_credentials WHERE id=$1', [id]);
    await store.close();
  }
});

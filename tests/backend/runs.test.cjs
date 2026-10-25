const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRunService } = require('../../backend/labs/runs.cjs');
const { createLabExecutor } = require('../../backend/labs/execute.cjs');
const { normalizeInput } = require('../../backend/labs/input.cjs');

test('La entrada no permite falsificar el dictamen del evaluador ni compartir identificadores de lote', () => {
  const value = normalizeInput('pipeline', { temperature: 12, acidity: 16, score: 100, batchId: 'lote' }, 'session');
  assert.equal(value.score, undefined);
  assert.equal(value.batchId, 'session:lote');
  assert.throws(() => normalizeInput('pharma', { temperature: '4.2' }, 's'), /número/);
});

test('Ejecuciones serializadas conservan dueño, resultado y error observable', async () => {
  const service = createRunService(async (id, input) => {
    if (input.fail) throw new Error('Nodo desconectado.');
    return { lab: id, value: input.value };
  });
  const one = service.create('evm', { value: 7 }, 'owner');
  const two = service.create('evm', { fail: true }, 'owner');
  await service.idle();
  assert.equal(service.get(one.id, 'owner').result.value, 7);
  assert.equal(service.get(one.id, 'owner').status, 'completed');
  assert.equal(service.get(one.id, 'other'), null);
  assert.equal(service.get(two.id, 'owner').status, 'failed');
  assert.match(service.get(two.id, 'owner').error.message, /Nodo/);
  assert.throws(() => service.create('unknown', {}, 'owner'), /Laboratorio/);
  assert.throws(() => service.create('evm', null, 'owner'), /entrada/);
});

test('El fallo de una herramienta conserva el diagnóstico y no anuncia práctica completada', async () => {
  const service = createRunService(async () => ({ success: false, exitCode: 1, stderr: 'La compilación falló.' }));
  const job = service.create('pc', {}, 'owner');
  await service.idle();
  assert.equal(job.status, 'failed');
  assert.equal(job.result.exitCode, 1);
  assert.equal(job.error.code, 'TOOL_FAILED');
  assert.deepEqual(job.evidenceRefs, undefined);
});

test('Una transacción con indexación pendiente conserva su recibo y no verifica la práctica completa', async () => {
  const service = createRunService(async () => ({ receipt: { hash: 'tx-confirmada', status: 1 }, indexing: { status: 'pending' } }));
  const job = service.create('pipeline', {}, 'owner');
  await service.idle();
  assert.equal(job.status, 'completed');
  assert.equal(job.verificationComplete, false);
  assert.equal(job.result.receipt.hash, 'tx-confirmada');
});

test('Orquestador usa firmas, tareas y persistencia; no anuncia indexación fallida', async () => {
  const recorded = [];
  const chain = { execute: async (id, input) => ({ id, input, receipt: { hash: 'tx', gasUsed: '20', status: 1 } }),
    events: async () => [{ deploymentId: 'd', txHash: 'tx', logIndex: 0, blockNumber: 1, name: 'Event', args: {} }],
    health: async () => ({ connected: true, deploymentId: 'd' }) };
  const store = { recordEvents: async (id, events) => recorded.push(...events),
    readEvents: async () => recorded, rebuild: async (id, events) => ({ count: events.length }),
    health: async () => ({ connected: true }) };
  let verified = 0;
  const signatures = { sign: async input => ({ payload: input }), verify: async value => {
    if (value.payload.bad) throw new Error('Firma alterada.'); verified++; return { verified: true }; } };
  const executor = createLabExecutor({ chain, store, signatures, tasks: { run: async task => ({ task, success: true }) } });
  assert.equal((await executor('signatures', { reading: 4.2 }, 's')).verification.verified, true);
  assert.equal((await executor('pc', { task: 'compile' }, 's')).task, 'compile');
  assert.equal((await executor('audit', {}, 's')).task, 'audit');
  const result = await executor('pipeline', { temperature: 3.5, acidity: 16, amountEth: '0.01' }, 's');
  assert.equal(result.indexing.status, 'indexed'); assert.ok(recorded.length); assert.ok(verified > 0);
  assert.equal((await executor('database', { action: 'rebuild' }, 's')).rebuild.count, 1);
  assert.ok((await executor('database', {}, 's')).records.length);
  await assert.rejects(executor('evm', { amountEth: '-1' }, 's'), /monto/);
  store.recordEvents = async () => { throw new Error('BD desconectada.'); };
  const partial = await executor('evm', {}, 's');
  assert.equal(partial.indexing.status, 'pending'); assert.equal(partial.receipt.hash, 'tx');
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../../backend/server.cjs');

test('Los trece laboratorios reales producen resultados observados mediante la API', { timeout: 240000 }, async t => {
  const instance = await startServer({ port: 0 });
  t.after(() => instance.close());
  const base = `http://127.0.0.1:${instance.server.address().port}`;
  const initial = await fetch(base + '/api/runtime');
  const state = await initial.json();
  assert.equal(state.chain.connected, true, 'Se requiere un nodo local desplegado, no un sustituto.');
  assert.equal(state.database.connected, true, 'Se requiere PostgreSQL real.');
  const cookie = initial.headers.get('set-cookie').split(';')[0];
  const headers = { cookie, 'x-csrf-token': state.csrfToken, 'content-type': 'application/json' };
  const cases = {
    signatures: { reading: 4.2 }, pipeline: { temperature: 3.5, acidity: 16, amountEth: '0.01' },
    pharma: { batchId: 'F-' + crypto.randomUUID(), temperature: 4.2 },
    honey: { batchId: 'M-' + crypto.randomUUID(), humidity: 17.2, hmf: 14, deltaC13: -26.4 },
    evm: { action: 'deposit', amountEth: '0.01' }, myths: { prediction: 'approved', temperature: 3.5, acidity: 16 },
    comparison: { amountEth: '0.01' }, architecture: {}, elections: { candidate: 1 },
    database: { action: 'sync' }, pc: { task: 'compile' }, audit: {}, blocks: {}
  };
  const durations = {};
  for (const [labId, input] of Object.entries(cases)) {
    const began = performance.now();
    const response = await fetch(base + `/api/labs/${labId}/runs`, { method: 'POST', headers, body: JSON.stringify({ input }) });
    assert.equal(response.status, 202);
    const { id } = await response.json();
    let job;
    do {
      await new Promise(resolve => setTimeout(resolve, 100));
      job = await (await fetch(base + '/api/runs/' + id, { headers: { cookie } })).json();
      assert.ok(performance.now() - began < 150000, `La actividad ${labId} excedió el tiempo permitido.`);
    } while (['queued', 'running'].includes(job.status));
    assert.equal(job.status, 'completed', `${labId}: ${job.error?.message}`);
    assert.equal(job.mode, 'real'); assert.ok(job.result);
    if (['pipeline', 'pharma', 'honey', 'evm', 'comparison', 'architecture', 'elections'].includes(labId)) {
      assert.match(job.result.receipt.hash, /^0x[a-f0-9]{64}$/i);
      assert.equal(job.result.indexing.status, 'indexed');
    }
    if (labId === 'database') assert.ok(job.result.records.length > 0);
    if (labId === 'blocks') { assert.equal(job.result.chainId, 31337); assert.equal(job.result.intact, true); assert.ok(job.result.blocks.length > 0); }
    if (labId === 'audit') assert.equal(job.result.analysisCompleted, true);
    if (labId === 'signatures') assert.equal(job.result.verification.verified, true);
    durations[labId] = Math.round(performance.now() - began);
  }
  await require('node:fs/promises').mkdir('test-results', { recursive: true });
  await require('node:fs/promises').writeFile('test-results/laboratorios-reales.json', JSON.stringify({ measuredAt: new Date().toISOString(), durationsMs: durations }, null, 2));
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRuntime } = require('../../backend/runtime.cjs');

test('El flujo real explica las seis etapas con firma, dictamen, recibos e indexación observados', async t => {
  const runtime = await createRuntime();
  t.after(() => runtime.close());
  for (const temperature of [3.5, 9]) {
    const job = runtime.runs.create('pipeline', { temperature, acidity: 16, amountEth: '0.001' }, 'etapas-' + crypto.randomUUID());
    await runtime.runs.idle();
    assert.equal(job.status, 'completed', job.error?.message);
    const stages = job.result.stages;
    assert.deepEqual(stages.map(stage => stage.id), ['capture', 'sign', 'verify', 'evaluate', 'transaction', 'index']);
    assert.equal(stages[0].result.temperature, temperature);
    assert.match(stages[1].result.signature, /^[A-Za-z0-9_-]+$/);
    assert.equal(stages[2].result.verified, true);
    assert.equal(stages[3].result.approved, temperature === 3.5);
    assert.equal(stages[4].status, temperature === 3.5 ? 'confirmed' : 'skipped');
    assert.equal(stages[4].result.receipts.length, temperature === 3.5 ? 3 : 0);
    assert.equal(stages[5].status, 'indexed');
    assert.ok(stages[5].result.position.blockNumber > 0);
    assert.deepEqual(job.timeline.map(entry => entry.phase), temperature === 3.5
      ? ['pending', 'confirmed', 'pending', 'confirmed', 'pending', 'confirmed', 'indexing', 'indexed']
      : ['indexing', 'indexed']);
    if (temperature === 3.5) assert.equal(job.timeline[0].hash, job.result.receipts[0].hash);
    assert.equal(job.phase.phase, 'indexed');
  }
});

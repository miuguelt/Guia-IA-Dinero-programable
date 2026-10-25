const { normalizeInput } = require('./input.cjs');
const { indexEvents } = require('./index-events.cjs');
const { pipelineStages } = require('./pipeline.cjs');
const { reject } = require('../http/response.cjs');

function createLabExecutor({ chain, store, signatures, tasks }) {
  async function signaturePractice(input) {
    const envelope = await signatures.sign({ reading: input.reading ?? 4.2, batchId: input.batchId || 'LOTE-01' });
    if (input.tamper) envelope.payload.reading = Number(envelope.payload.reading) + 1;
    const verification = await signatures.verify(envelope);
    if (input.replay) await signatures.verify(envelope);
    return { envelope, verification };
  }

  async function databasePractice(input) {
    const events = await chain.events();
    const status = await chain.health();
    const id = status.deploymentId || status.deployment?.id || events[0]?.deploymentId;
    if (!id) throw reject(503, 'Despliega los contratos antes de sincronizar la base.');
    const rebuild = input.action === 'rebuild' ? await store.rebuild(id, events) : null;
    if (!rebuild) await store.recordEvents(id, events);
    return { deploymentId: id, rebuild, records: await store.readEvents(id), status: 'indexed' };
  }

  return async function execute(labId, input, sessionId, observe) {
    const data = normalizeInput(labId, input, sessionId);
    if (labId === 'signatures') return signaturePractice(data);
    if (['pc', 'audit'].includes(labId)) return tasks.run(labId === 'audit' ? 'audit' : data.task || 'compile');
    if (labId === 'database') return databasePractice(data);
    let signature, envelope;
    if (['pipeline', 'pharma', 'honey'].includes(labId)) {
      envelope = await signatures.sign(data);
      signature = await signatures.verify(envelope);
    }
    const result = await chain.execute(labId, data, observe);
    observe?.({ phase: 'indexing' });
    const indexing = await indexEvents(chain, store);
    observe?.({ phase: indexing.status === 'pending' ? 'index-pending' : 'indexed' });
    return { ...result, ...(signature ? { signature } : {}), indexing,
      ...(labId === 'pipeline' ? { stages: pipelineStages(envelope, signature, result, indexing) } : {}) };
  };
}

module.exports = { createLabExecutor };

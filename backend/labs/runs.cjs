const { randomUUID } = require('node:crypto');
const { reject } = require('../http/response.cjs');
const LAB_IDS = ['elections', 'signatures', 'pipeline', 'pharma', 'honey', 'audit', 'evm', 'myths', 'comparison', 'pc', 'architecture', 'database'];

function createRunService(execute) {
  const jobs = new Map();
  let queue = Promise.resolve();
  async function perform(job, input) {
    job.status = 'running';
    try {
      job.result = await execute(job.labId, input, job.sessionId, phase => {
        job.phase = phase;
        job.timeline.push(phase);
      });
      if (job.result?.success === false) throw Object.assign(new Error('La herramienta no pudo completar la práctica. Revisa el diagnóstico y corrige el problema antes de reintentar.'), { code: 'TOOL_FAILED' });
      job.verificationComplete = job.result?.indexing?.status !== 'pending';
      job.status = 'completed';
      job.evidenceRefs = [job.id];
    } catch (error) {
      job.status = 'failed';
      job.error = { code: error.code || 'LAB_FAILED', message: error.shortMessage || error.message, retryable: true };
    }
    job.finishedAt = new Date().toISOString();
  }
  function create(labId, input, sessionId) {
    if (!LAB_IDS.includes(labId)) throw reject(404, 'Laboratorio no disponible.');
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw reject(400, 'La entrada debe ser un objeto.');
    if ([...jobs.values()].filter(job => ['queued', 'running'].includes(job.status)).length >= 20) {
      throw reject(429, 'Hay varias prácticas en curso. Espera a que terminen.');
    }
    const job = { id: randomUUID(), labId, sessionId, mode: 'real', status: 'queued', timeline: [], createdAt: new Date().toISOString() };
    if (jobs.size >= 1000) jobs.delete(jobs.keys().next().value);
    jobs.set(job.id, job);
    queue = queue.then(() => perform(job, input));
    return job;
  }
  function get(id, owner) { const job = jobs.get(id); return job?.sessionId === owner ? job : null; }
  function idle() { return queue; }
  return { create, get, idle };
}

module.exports = { createRunService, LAB_IDS };

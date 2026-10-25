const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTaskRunner } = require('../../backend/audit/runner.cjs');
const { createRunService } = require('../../backend/labs/runs.cjs');

test('un proceso de compilación fallido conserva el diagnóstico y marca la práctica real como fallida', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'aula-tool-failure-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const cli = path.join(root, 'node_modules/hardhat/internal/cli');
  await fs.mkdir(cli, { recursive: true });
  await fs.writeFile(path.join(cli, 'cli.js'), 'console.error("Compilación rechazada: entrada inválida.");process.exitCode=3;');
  const runner = createTaskRunner({ root });
  const runs = createRunService(() => runner.run('compile'));
  const created = runs.create('pc', {}, 'owner');
  await runs.idle();
  const result = runs.get(created.id, 'owner');
  assert.equal(result.status, 'failed');
  assert.equal(result.mode, 'real');
  assert.equal(result.result.success, false);
  assert.equal(result.result.exitCode, 3);
  assert.match(result.result.stderr, /Compilación rechazada/);
  assert.ok(result.error.message);
});

test('un informe completado con hallazgos conserva su resultado sin certificar ausencia de riesgos', async () => {
  const runs = createRunService(async () => ({ success: true, analysisCompleted: true, passed: false, findings: [{ impact: 'Low', description: 'Evento posterior a llamada externa.' }] }));
  const created = runs.create('audit', {}, 'owner');
  await runs.idle();
  const result = runs.get(created.id, 'owner');
  assert.equal(result.status, 'completed');
  assert.equal(result.result.passed, false);
  assert.equal(result.result.findings.length, 1);
});

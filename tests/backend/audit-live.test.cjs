const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createTaskRunner } = require('../../backend/audit/runner.cjs');

test('auditoría nativa real compila y analiza los contratos actuales sin simular resultados', async () => {
  const runner = createTaskRunner({ root: process.cwd(), timeoutMs: 120000 });
  const result = await runner.run('audit');
  assert.equal(result.analysisCompleted, true, result.stderr);
  assert.equal(result.attackTests?.success, true, result.attackTests?.stderr);
  assert.match(result.attackTests.stdout, /Retiro seguro con receptor adversarial real/);
  assert.equal(result.timedOut, false);
  assert.ok(Array.isArray(result.findings));
  for (const finding of result.findings) {
    assert.equal(typeof finding.detector, 'string');
    assert.equal(typeof finding.description, 'string');
    assert.ok(Array.isArray(finding.locations));
  }
  const directory = path.resolve('test-results/audit');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'slither-report.json'), JSON.stringify(result, null, 2));
});

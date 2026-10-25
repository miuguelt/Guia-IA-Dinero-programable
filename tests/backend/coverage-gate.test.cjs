const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyFunctions } = require('../../scripts/check-solidity-coverage.cjs');
const { runCoverageGate } = require('../../scripts/check-solidity-coverage.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');

test('La compuerta rechaza cobertura ausente o funciones sin ejecutar', () => {
  assert.throws(() => verifyFunctions({}), /cobertura/);
  assert.throws(() => verifyFunctions({ 'Contrato.sol': { fnMap: { 0: { name: 'retirar' } }, f: { 0: 0 } } }), /retirar/);
  const result = verifyFunctions({ 'Contrato.sol': { fnMap: { 0: { name: 'retirar' } }, f: { 0: 3 } } });
  assert.deepEqual(result, { total: 1, covered: 1, pct: 100 });
});

test('La compuerta publica la métrica nativa y falla cuando el reporte no existe', async t => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'solidity-gate-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const messages = [];
  const operator = {};
  const logger = { log: value => messages.push(value), error: value => messages.push(value) };
  await fs.writeFile(path.join(root, 'coverage.json'), JSON.stringify({ 'Contrato.sol': { fnMap: { 0: { name: 'retirar' } }, f: { 0: 2 } } }));
  const result = await runCoverageGate({ root, operator, logger });
  assert.equal(result.pct, 100);
  assert.match(await fs.readFile(path.join(root, 'test-results/solidity/functions.json'), 'utf8'), /100/);
  assert.equal(await runCoverageGate({ root, operator, logger }), null);
  assert.equal(operator.exitCode, 1);
});

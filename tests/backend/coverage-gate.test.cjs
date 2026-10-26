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

test('La compuerta exige líneas completas y un mínimo de ramas', () => {
  const { verifyLinesAndBranches } = require('../../scripts/check-solidity-coverage.cjs');
  const linea = n => ({ start: { line: n }, end: { line: n } });
  const completo = { 'A.sol': { statementMap: { 0: linea(3), 1: linea(3), 2: linea(5) }, s: { 0: 1, 1: 0, 2: 4 }, b: { 0: [1, 1], 1: [2, 0] } } };
  assert.deepEqual(verifyLinesAndBranches(completo, { lines: 100, branches: 75 }), { lines: 100, branches: 75 });
  assert.throws(() => verifyLinesAndBranches(completo, { lines: 100, branches: 80 }), /ramas: 75 % < 80 %/);
  const lineaSinEjecutar = { 'B.sol': { statementMap: { 0: linea(2), 1: linea(9) }, s: { 0: 1, 1: 0 }, b: {} } };
  assert.throws(() => verifyLinesAndBranches(lineaSinEjecutar, { lines: 100, branches: 0 }), /líneas: 50 % < 100 %.*B\.sol:9/);
  assert.deepEqual(verifyLinesAndBranches({ 'C.sol': {} }), { lines: 100, branches: 100 });
});

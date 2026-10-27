const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createTaskRunner, summarizeAudit } = require('../../backend/audit/runner.cjs');
const { executeProcess, redact } = require('../../backend/audit/process.cjs');

test('ejecuta solo tareas enumeradas en un proceso real, sin interpolar comandos', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'guia-tools-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const cli = path.join(root, 'node_modules', 'hardhat', 'internal', 'cli');
  await fs.mkdir(cli, { recursive: true });
  await fs.writeFile(path.join(cli, 'cli.js'), `console.log(JSON.stringify(process.argv.slice(2))); console.error('diagnóstico');`);
  const runner = createTaskRunner({ root });
  const compiled = await runner.run('compile');
  assert.equal(compiled.success, true);
  assert.deepEqual(JSON.parse(compiled.stdout), ['compile']);
  assert.ok(compiled.stderr.includes('diagnóstico'));
  assert.equal((await runner.run('test')).task, 'test');
  await assert.rejects(runner.run('compile; whoami'), { code: 'TASK_UNKNOWN' });
  const health = await runner.health();
  assert.equal(health.hardhat, true);
  assert.equal(typeof health.slither, 'boolean');
});

test('informa salida no exitosa, ausencia, timeout y salida limitada', async () => {
  const options = { root: process.cwd(), timeoutMs: 1000, maxOutput: 100 };
  const failed = await executeProcess(process.execPath, ['-e', 'console.error("falló");process.exit(2)'], options);
  assert.equal(failed.success, false);
  assert.equal(failed.exitCode, 2);
  const oversized = await executeProcess(process.execPath, ['-e', 'console.log("a".repeat(1000))'], options);
  assert.equal(oversized.truncated, true);
  assert.equal(oversized.stdout.length, 100);
  const timeout = await executeProcess(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { ...options, timeoutMs: 25 });
  assert.equal(timeout.timedOut, true);
  const missing = await executeProcess(path.join(os.tmpdir(), 'missing-guide-command'), [], options);
  assert.equal(missing.success, false);
  assert.equal(missing.code, 'TOOL_UNAVAILABLE');
  assert.equal(redact('privateKey=reserved\npassword: reserved').includes('reserved'), false);
  assert.equal(redact('resultado público'), 'resultado público');
});

test('reserva un proceso por ejecutor y libera la reserva al terminar', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'guia-busy-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const cli = path.join(root, 'node_modules', 'hardhat', 'internal', 'cli');
  await fs.mkdir(cli, { recursive: true });
  await fs.writeFile(path.join(cli, 'cli.js'), 'setTimeout(()=>process.exit(0),100)');
  const runner = createTaskRunner({ root });
  const running = runner.run('compile');
  await assert.rejects(runner.run('test'), { code: 'TASK_BUSY' });
  assert.equal((await running).success, true);
  assert.equal((await runner.run('test')).success, true);
});

test('interpreta hallazgos sin convertir advertencias en garantías de seguridad', () => {
  const audit = summarizeAudit({ exitCode: 255, stdout: JSON.stringify({ success: true, results: { detectors: [{ check: 'reentrancy', impact: 'High', confidence: 'Medium', description: 'Llamada externa', elements: [{ source_mapping: { filename_relative: 'contracts/Lab.sol', lines: [10] } }] }] } }) });
  assert.equal(audit.success, true);
  assert.equal(audit.passed, false);
  assert.equal(audit.findings[0].detector, 'reentrancy');
  assert.equal(summarizeAudit({ exitCode: 0, stdout: JSON.stringify({ success: true, results: { detectors: [{ impact: 'High' }] } }) }).passed, false);
  const fixture = summarizeAudit({ exitCode: 0, stdout: JSON.stringify({ success: true, results: { detectors: [{ impact: 'High', elements: [{ source_mapping: { filename_relative: 'contracts/fixtures/Attack.sol' } }] }] } }) });
  assert.equal(fixture.findings[0].scope, 'fixture');
  assert.equal(fixture.passed, true);
  assert.equal(summarizeAudit({ stdout: 'salida inválida' }).analysisCompleted, false);
  assert.equal(summarizeAudit({ success: true, exitCode: 0, stdout: 'salida inválida' }).success, false);
  assert.ok(summarizeAudit({ stdout: JSON.stringify({ success: false, error: 'fallo' }) }).toolError);
  assert.equal(summarizeAudit({ exitCode: 0, stdout: JSON.stringify({ success: true }) }).findings.length, 0);
  assert.equal(summarizeAudit({ stdout: JSON.stringify({ success: false, error: null }) }).toolError, null);
  const counted = summarizeAudit({ exitCode: 0, stdout: JSON.stringify({ success: true, contractsAnalyzed: 9 }) });
  assert.equal(counted.contractsAnalyzed, 9);
  assert.equal(counted.stdout, 'Slither analizó 9 contratos.');
  assert.equal(summarizeAudit({ exitCode: 0, stdout: JSON.stringify({ success: true }) }).contractsAnalyzed, 0);
  assert.equal(summarizeAudit({ success: false, code: 'TOOL_UNAVAILABLE', stdout: '' }).code, 'TOOL_UNAVAILABLE');
  assert.equal(summarizeAudit({ success: false, code: 'OTRO', stdout: '' }).code, 'AUDIT_OUTPUT_INVALID');
});

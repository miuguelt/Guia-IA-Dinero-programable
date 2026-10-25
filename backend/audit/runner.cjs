const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { executeProcess } = require('./process.cjs');

function summarizeAudit(result) {
  let report;
  try { report = JSON.parse(result.stdout); } catch { return { ...result, success: false, passed: false, analysisCompleted: false, findings: [], code: 'AUDIT_OUTPUT_INVALID' }; }
  const findings = (report.results?.detectors || []).map(item => ({
    detector: item.check, impact: item.impact, confidence: item.confidence, description: item.description,
    scope: (item.elements || []).every(element => /contracts[\\/]fixtures[\\/]/.test(element.source_mapping?.filename_relative || '')) && item.elements?.length ? 'fixture' : 'production',
    locations: (item.elements || []).map(element => ({ file: element.source_mapping?.filename_relative, lines: element.source_mapping?.lines }))
  }));
  return { ...result, stdout: `Slither analizó ${report.contractsAnalyzed || 0} contratos.`, success: report.success === true, analysisCompleted: report.success === true,
    passed: result.exitCode === 0 && !findings.some(item => item.scope === 'production' && ['High', 'Medium'].includes(item.impact)), findings,
    toolError: report.success ? null : redactError(report.error) };
}

function redactError(error) { return error ? 'Slither no pudo completar el análisis. Revisa la compilación y vuelve a ejecutarlo.' : null; }

function createTaskRunner({ root, timeoutMs = 120000 }) {
  const cli = path.join(root, 'node_modules', 'hardhat', 'internal', 'cli', 'cli.js');
  const slither = process.env.GUIA_SLITHER_BIN || path.join(os.homedir(), '.local', 'bin', process.platform === 'win32' ? 'slither.exe' : 'slither');
  const python = process.env.GUIA_AUDIT_PYTHON || (process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'uv', 'tools', 'slither-analyzer', 'Scripts', 'python.exe')
    : path.join(os.homedir(), '.local', 'share', 'uv', 'tools', 'slither-analyzer', 'bin', 'python'));
  let active = false;
  async function run(task) {
    if (!['compile', 'test', 'audit'].includes(task)) throw Object.assign(new Error('Selecciona compilar, probar o auditar. No se aceptan comandos libres.'), { code: 'TASK_UNKNOWN' });
    if (active) throw Object.assign(new Error('Hay una herramienta en ejecución. Espera su resultado.'), { code: 'TASK_BUSY', retryable: true });
    active = true;
    try {
      const options = { root, timeoutMs };
      const result = await executeProcess(process.execPath, [cli, task === 'test' ? 'test' : 'compile'], options);
      if (task !== 'audit' || !result.success) return { task, ...result };
      const attackTests = await executeProcess(process.execPath, [cli, 'test', '--no-compile', 'test/WithdrawalSecurity.test.js'], options);
      const audit = await executeProcess(python, [path.join(__dirname, 'slither_driver.py'), root], options);
      const analysis = summarizeAudit(audit);
      return { task, ...analysis, attackTests, staticPassed: analysis.passed,
        success: analysis.success && attackTests.success, passed: analysis.passed && attackTests.success,
        code: !attackTests.success ? 'ATTACK_TESTS_FAILED' : analysis.code,
        toolError: !attackTests.success ? 'La comprobación de ataque falló. Revisa su salida antes de continuar.' : analysis.toolError };
    } finally { active = false; }
  }
  async function health() {
    return { node: process.version, hardhat: fs.existsSync(cli), slither: fs.existsSync(slither), busy: active };
  }
  return { run, health };
}

module.exports = { createTaskRunner, summarizeAudit };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs/promises');
const { executeProcess } = require('../../backend/audit/process.cjs');

test('Slither real sobre build-info: análisis, errores y cobertura de funciones Python', async () => {
  const python = process.env.GUIA_AUDIT_PYTHON || (process.platform === 'win32'
    ? path.join(process.env.APPDATA, 'uv', 'tools', 'slither-analyzer', 'Scripts', 'python.exe')
    : path.join(os.homedir(), '.local', 'share', 'uv', 'tools', 'slither-analyzer', 'bin', 'python'));
  const script = `
import ast, importlib.util, json, sys, tempfile
from pathlib import Path
driver = Path(sys.argv[1]).resolve()
spec = importlib.util.spec_from_file_location('guide_slither', driver)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
visited = set()
driver_name = str(driver)
def record(frame, event, arg):
    if event == 'call' and frame.f_code.co_filename == driver_name:
        visited.add(frame.f_code.co_name)
sys.setprofile(record)
good = module.analyze(sys.argv[2])
with tempfile.TemporaryDirectory() as missing:
    bad = module.analyze(missing)
sys.setprofile(None)
functions = [n.name for n in ast.walk(ast.parse(driver.read_text(encoding='utf-8'))) if isinstance(n, (ast.FunctionDef,ast.AsyncFunctionDef))]
print(json.dumps({'success':good['success'],'errorType':good.get('errorType'),'contracts':good.get('contractsAnalyzed'), 'errorHandled':bad['success'] is False,'functions':functions,'covered':sorted(visited),'findings':len(good['results']['detectors'])}))
`;
  const result = await executeProcess(python, ['-c', script, path.resolve('backend/audit/slither_driver.py'), process.cwd()], { root: process.cwd(), timeoutMs: 120000 });
  assert.equal(result.success, true, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.success, true, JSON.stringify(report));
  assert.ok(report.contracts > 0);
  assert.equal(report.errorHandled, true);
  assert.deepEqual(report.functions.sort(), report.covered.sort());
  const coverage = {
    source: 'backend/audit/slither_driver.py',
    metric: 'Funciones Python por AST y llamadas observadas con sys.setprofile',
    total: report.functions.length,
    covered: report.covered.length,
    functionCoverage: 100 * report.covered.length / report.functions.length,
    functions: report.functions,
    coveredFunctions: report.covered,
    analysisCompleted: report.success,
    errorHandled: report.errorHandled,
    contractsAnalyzed: report.contracts,
    findings: report.findings
  };
  assert.ok(coverage.total > 0);
  assert.equal(coverage.functionCoverage, 100);
  const directory = path.resolve('test-results');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'python-functions.json'), JSON.stringify(coverage, null, 2));
});

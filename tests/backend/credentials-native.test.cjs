const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const execute = promisify(execFile);
const expectedFunctions = ['Get-GuideCredentialTarget', 'Import-GuideAdminCredentials', 'Import-GuideCredentials', 'Initialize-GuideDatabase',
  'Read-GuideCredential', 'Read-GuideSetting', 'Save-GuideCredential', 'Test-GuideDatabaseConnection', 'Use-GuideCredentialStore'];

test('credenciales nativas: compuerta AST verifica todas las funciones y los efectos del almacén de Windows', async () => {
  const root = path.resolve(__dirname, '../..');
  const result = await execute('pwsh', ['-NoProfile', '-File', path.join(root, 'tests/lifecycle/measure-credentials.ps1'),
    '-ModulePath', path.join(root, 'scripts/guide-credentials.ps1'), '-GuideRoot', root], { cwd: root, windowsHide: true, timeout: 60000 });
  const report = JSON.parse(result.stdout.trim());
  assert.equal(report.functionCoverage, 100);
  assert.deepEqual(report.missing, []);
  assert.deepEqual([...report.functions].sort(), expectedFunctions);
  assert.deepEqual([...report.functions].sort(), [...report.covered].sort());
  assert.ok(report.assertions.length >= 11);
  assert.ok(['verified', 'accessRejected'].includes(report.credentialManager));
  assert.equal(report.localLevel, report.credentialManager === 'verified' ? 'verified' : 'accessRejected');
  assert.ok(['idempotent', 'localOnly'].includes(report.database));
  const directory = path.join(root, 'test-results');
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'credentials-coverage.json'), JSON.stringify(report, null, 2));
});

test('credenciales nativas: fuera del workspace el nivel completo usa solo los destinos GuiaDinero de Credential Manager', async () => {
  const root = path.resolve(__dirname, '../..');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'guide-credentials-native-'));
  try {
    const modulePath = path.join(temporary, 'guide-credentials.ps1');
    await fs.copyFile(path.join(root, 'scripts/guide-credentials.ps1'), modulePath);
    const result = await execute('pwsh', ['-NoProfile', '-File', path.join(root, 'tests/lifecycle/measure-credentials.ps1'),
      '-ModulePath', modulePath, '-GuideRoot', root], { cwd: root, windowsHide: true, timeout: 60000 });
    const report = JSON.parse(result.stdout.trim());
    assert.equal(report.database, 'localOnly');
    assert.equal(report.functionCoverage, 100);
    assert.deepEqual(report.missing, []);
    assert.deepEqual([...report.functions].sort(), expectedFunctions);
    assert.deepEqual([...report.functions].sort(), [...report.covered].sort());
    assert.ok(['verified', 'accessRejected'].includes(report.credentialManager));
    assert.equal(report.localLevel, report.credentialManager === 'verified' ? 'verified' : 'accessRejected');
    assert.ok(!report.assertions.some(text => text.includes('DevBrain idempotente')), 'Fuera del workspace no se toca la base DevBrain.');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

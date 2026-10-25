const { spawnSync } = require('node:child_process');
const path = require('node:path');
require('./load-env.cjs');
const root = path.resolve(__dirname, '..');
const commands = [
  ['--require', path.join(root, 'scripts/load-env.cjs'), '--test', '--test-concurrency=2', 'tests/backend/*.test.cjs', 'tests/frontend/*.test.mjs', 'tests/integration/*.test.cjs', 'tests/browser/*.test.cjs', 'tests/taller/*.test.cjs'],
  [path.join(root, 'node_modules/hardhat/internal/cli/cli.js'), 'test']
];
for (const args of commands) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.status !== 0) { process.exitCode = result.status || 1; break; }
}

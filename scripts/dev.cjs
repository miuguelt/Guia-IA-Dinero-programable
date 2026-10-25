const { watch } = require('node:fs');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { buildWeb } = require('./build-web.cjs');

async function startDevelopment(root = path.resolve(__dirname, '..')) {
  await buildWeb(root);
  const api = spawn(process.execPath, ['--watch', path.join(root, 'backend/server.cjs')], { cwd: root, stdio: 'inherit', windowsHide: true });
  let timer;
  let queue = Promise.resolve();
  const watcher = watch(path.join(root, 'frontend/web'), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      queue = queue.then(() => buildWeb(root)).catch(() => console.error('La recarga no pudo compilar las fuentes. Revisa el último cambio.'));
    }, 150);
  });
  function close() { clearTimeout(timer); watcher.close(); api.kill(); }
  return { close };
}

async function runDevelopmentCli({ root, operator = process, logger = console } = {}) {
  try {
    const instance = await startDevelopment(root);
    for (const signal of ['SIGINT', 'SIGTERM']) operator.once(signal, instance.close);
    return instance;
  } catch { logger.error('No se pudo iniciar la recarga local.'); operator.exitCode = 1; return null; }
}

if (require.main === module) void runDevelopmentCli();

module.exports = { startDevelopment, runDevelopmentCli };

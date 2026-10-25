const { build } = require('esbuild');
const { mkdir, copyFile } = require('node:fs/promises');
const path = require('node:path');
const { empaquetarTaller } = require('./package-taller.cjs');

async function buildWeb(root = path.resolve(__dirname, '..')) {
  const source = path.join(root, 'frontend', 'web');
  const target = path.join(root, 'web');
  await mkdir(target, { recursive: true });
  await mkdir(path.join(target, 'vendor'), { recursive: true });
  await build({ entryPoints: [path.join(source, 'main.js')], bundle: true, format: 'esm', target: 'es2022',
    outfile: path.join(target, 'main.js'), sourcemap: false, logLevel: 'silent' });
  await copyFile(path.join(source, 'index.html'), path.join(target, 'index.html'));
  await copyFile(path.join(source, 'styles.css'), path.join(target, 'styles.css'));
  for (const asset of ['devbrain-learner-sdk.js', 'devbrain-learner-sdk.css', 'devbrain-reader.css']) {
    const sourceDirectory = asset.endsWith('.js') ? 'js' : 'css';
    await copyFile(path.join(root, sourceDirectory, 'vendor', asset), path.join(target, 'vendor', asset));
  }
  const starter = path.join(root, 'taller', 'inicio');
  const download = await empaquetarTaller({ origen: starter, destino: path.join(target, 'descargas', 'taller-agropay.zip') });
  return { directory: target, download: download.destino };
}

async function runBuildCli({ root, operator = process, logger = console } = {}) {
  try { await buildWeb(root); logger.log('Web compilada en web/.'); return true; }
  catch { logger.error('No se pudo compilar la web. Revisa las fuentes y dependencias.'); operator.exitCode = 1; return false; }
}

if (require.main === module) void runBuildCli();

module.exports = { buildWeb, runBuildCli };

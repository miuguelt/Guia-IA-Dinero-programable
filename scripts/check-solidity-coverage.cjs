const fs = require('node:fs/promises');
const path = require('node:path');

function verifyFunctions(coverage) {
  const missing = [];
  let total = 0;
  for (const [file, data] of Object.entries(coverage)) {
    for (const [id, info] of Object.entries(data.fnMap || {})) {
      total++;
      if (!(data.f?.[id] > 0)) missing.push(file + ':' + info.name);
    }
  }
  if (!total) throw new Error('No hay cobertura de funciones Solidity para verificar.');
  if (missing.length) throw new Error('Hay funciones sin alcanzar: ' + missing.join(', '));
  return { total, covered: total, pct: 100 };
}

async function runCoverageGate({ root = path.resolve(__dirname, '..'), operator = process, logger = console } = {}) {
  try {
    const source = path.join(root, 'coverage.json');
    const coverage = JSON.parse(await fs.readFile(source, 'utf8'));
    const result = verifyFunctions(coverage);
    await fs.mkdir(path.join(root, 'test-results/solidity'), { recursive: true });
    await fs.writeFile(path.join(root, 'test-results/solidity/functions.json'), JSON.stringify(result, null, 2));
    await fs.rename(source, path.join(root, 'test-results/solidity/coverage.json'));
    logger.log(`Solidity: ${result.covered}/${result.total} funciones verificadas.`);
    return result;
  } catch (error) { logger.error(error.message); operator.exitCode = 1; return null; }
}

if (require.main === module) void runCoverageGate();
module.exports = { verifyFunctions, runCoverageGate };

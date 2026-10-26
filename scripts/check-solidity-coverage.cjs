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

// Umbrales actuales del proyecto: líneas completas y ramas al 80 % (medido: 81,55 %).
const THRESHOLDS = { lines: 100, branches: 80 };

function verifyLinesAndBranches(coverage, thresholds = THRESHOLDS) {
  const lines = new Map();
  let branches = 0, takenBranches = 0;
  for (const [file, data] of Object.entries(coverage)) {
    for (const [id, location] of Object.entries(data.statementMap || {})) {
      const key = file + ':' + location.start.line;
      lines.set(key, lines.get(key) || data.s?.[id] > 0);
    }
    for (const counts of Object.values(data.b || {})) {
      branches += counts.length;
      takenBranches += counts.filter(count => count > 0).length;
    }
  }
  const missing = [...lines].filter(([, covered]) => !covered).map(([key]) => key);
  const pct = (covered, total) => total ? Math.floor(covered / total * 10000) / 100 : 100;
  const result = { lines: pct(lines.size - missing.length, lines.size), branches: pct(takenBranches, branches) };
  const failures = [];
  if (result.lines < thresholds.lines) failures.push(`líneas: ${result.lines} % < ${thresholds.lines} % (${missing.join(', ')})`);
  if (result.branches < thresholds.branches) failures.push(`ramas: ${result.branches} % < ${thresholds.branches} %`);
  if (failures.length) throw new Error('Cobertura Solidity insuficiente: ' + failures.join('; '));
  return result;
}

async function runCoverageGate({ root = path.resolve(__dirname, '..'), operator = process, logger = console } = {}) {
  try {
    const source = path.join(root, 'coverage.json');
    const coverage = JSON.parse(await fs.readFile(source, 'utf8'));
    const result = { ...verifyFunctions(coverage), ...verifyLinesAndBranches(coverage) };
    await fs.mkdir(path.join(root, 'test-results/solidity'), { recursive: true });
    await fs.writeFile(path.join(root, 'test-results/solidity/functions.json'), JSON.stringify(result, null, 2));
    await fs.rename(source, path.join(root, 'test-results/solidity/coverage.json'));
    logger.log(`Solidity: ${result.covered}/${result.total} funciones verificadas; líneas ${result.lines} %, ramas ${result.branches} %.`);
    return result;
  } catch (error) { logger.error(error.message); operator.exitCode = 1; return null; }
}

if (require.main === module) void runCoverageGate();
module.exports = { verifyFunctions, verifyLinesAndBranches, runCoverageGate };

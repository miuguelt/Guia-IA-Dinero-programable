const { parseEther } = require('ethers');
const { reject } = require('../http/response.cjs');

function normalizeInput(id, input, sessionId) {
  const normalized = { ...input };
  delete normalized.score;
  if (input.batchId) normalized.batchId = sessionId + ':' + String(input.batchId).slice(0, 100);
  for (const key of ['temperature', 'acidity', 'humidity', 'hmf', 'deltaC13', 'reading']) {
    if (key in normalized && (typeof normalized[key] !== 'number' || !Number.isFinite(normalized[key]))) {
      throw reject(400, `El campo ${key} debe ser un número finito.`);
    }
  }
  if ('amountEth' in input) {
    try {
      const wei = parseEther(String(input.amountEth));
      if (wei <= 0n || wei > parseEther('10')) throw new Error();
      normalized.amountWei = wei.toString();
    } catch { throw reject(400, 'El monto debe estar entre más de cero y 10 ETH de práctica.'); }
  }
  normalized.voterId = sessionId + ':' + (input.voterId || 'aprendiz');
  if (input.scenario === 'invalid') normalized.tamper = true;
  if (['pipeline', 'architecture'].includes(id)) normalized.action ??= 'agropay';
  return normalized;
}

module.exports = { normalizeInput };

function pipelineStages(envelope, verification, result, indexing) {
  return [
    { id: 'capture', label: 'Captura', status: 'completed', result: envelope.payload },
    { id: 'sign', label: 'Firma', status: 'completed', result: { signature: envelope.signature, publicKey: envelope.publicKey, nonce: envelope.nonce } },
    { id: 'verify', label: 'Verificación', status: 'completed', result: verification },
    { id: 'evaluate', label: 'Evaluación', status: 'completed', result: { approved: result.approved, score: result.score, evaluator: 'Reglas del ejercicio' } },
    { id: 'transaction', label: 'Transacción', status: result.approved ? 'confirmed' : 'skipped', result: { receipts: result.receipts, reason: result.approved ? 'Operaciones confirmadas.' : 'El dictamen no autoriza el pago.' } },
    { id: 'index', label: 'Indexación', status: indexing.status, result: indexing }
  ];
}

module.exports = { pipelineStages };

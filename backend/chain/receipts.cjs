async function confirmed(transaction, observe) {
  const submitted = await transaction;
  observe?.({ phase: 'pending', hash: submitted.hash });
  const receipt = await submitted.wait();
  if (!receipt || receipt.status !== 1) throw new Error('La transacción no fue confirmada. Consulta el estado antes de reintentar.');
  observe?.({ phase: 'confirmed', hash: receipt.hash, blockNumber: receipt.blockNumber });
  return {hash:receipt.hash,blockNumber:receipt.blockNumber,gasUsed:receipt.gasUsed.toString(),gasPrice:receipt.gasPrice.toString(),status:receipt.status};
}

module.exports = {confirmed};

// snarkjs conserva el grupo BN128 global de ffjavascript para reutilizar sus trabajadores.
// Este cierre se ejecuta después de vaciar la cola del runtime, sin crear una curva nueva.
async function closeProofResources() {
  const curve = globalThis.curve_bn128;
  if (curve) await curve.terminate();
}

module.exports = {closeProofResources};

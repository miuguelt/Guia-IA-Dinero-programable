/**
 * ============================================================================
 * AGENTE AUTÓNOMO DE IA (ORÁCULO CRIPTOGRÁFICO EN NODE.JS)
 * Tecnólogo ADSO SENA — Dinero Programable & Smart Contracts
 * ============================================================================
 * 
 * ¿Qué hace este archivo?
 * 1. Simula el pipeline de un Agente de IA (ej. Gemini o modelo de visión).
 * 2. Analiza un lote de entrega agrícola o hito de contratación estatal.
 * 3. Si la IA certifica calidad >= 90%, firma y emite la transacción on-chain
 *    como "Oráculo Autorizado" para desbloquear el pago condicional.
 * 4. Si la calidad es deficiente, rechaza el lote y previene la fuga de fondos.
 * ============================================================================
 */

const { CONTRACT_ADDRESS, CONTRACT_ABI } = require("./ejemplo-cliente-frontend");

let ethers;
try {
  ethers = require("ethers");
} catch {
  ethers = globalThis.ethers;
}

/**
 * 1. SIMULACIÓN DE LA INFERENCIA DE IA
 * En un sistema productivo real, esta función llama a la API de Gemini,
 * a un modelo de visión artificial o a un clasificador de aprendizaje automático.
 */
async function evaluarCalidadConIA(loteDatos) {
  console.log("🧠 1. Ejecutando análisis de Inteligencia Artificial...");
  console.log(`• Inspeccionando Lote #${loteDatos.idLote}: ${loteDatos.producto}`);
  console.log(`• Datos del sensor/laboratorio: Humedad=${loteDatos.humedad}%, Temp=${loteDatos.temperatura}°C`);

  // Reglas del modelo de IA:
  // Para leche: Temperatura <= 4°C y Acidez dentro de norma.
  // Para miel: Humedad <= 20% y sin adulteración de azúcares C4.
  let puntaje = 0;

  if (loteDatos.tipo === "LECHE") {
    const tempOptima = loteDatos.temperatura <= 4.0;
    const acidezOptima = loteDatos.acidez >= 14 && loteDatos.acidez <= 18;
    puntaje = (tempOptima ? 60 : 20) + (acidezOptima ? 38 : 10);
  } else if (loteDatos.tipo === "MIEL") {
    const humedadOptima = loteDatos.humedad <= 20.0;
    const c4Pura = loteDatos.deltaC13 <= -24.5;
    puntaje = (humedadOptima ? 50 : 15) + (c4Pura ? 48 : 10);
  } else {
    puntaje = 92; // Valor por defecto para pruebas
  }

  const veredictoAprobado = puntaje >= 90;
  console.log(`📊 Veredicto IA: Puntaje calculado = ${puntaje}/100 [${veredictoAprobado ? "APROBADO ✅" : "RECHAZADO ❌"}]`);

  return {
    puntaje,
    aprobado: veredictoAprobado,
    timestamp: Date.now()
  };
}

/**
 * 2. EJECUCIÓN DEL ORÁCULO CRIPTOGRÁFICO
 * Conecta la decisión de la IA con la máquina virtual de Ethereum.
 */
async function procesarLoteYAutorizarPago({
  lote,
  cuentaOraculoPrivKey,
  beneficiarioAddress,
  montoEth,
  rpcUrl = "http://127.0.0.1:8545",
  provider = new ethers.JsonRpcProvider(rpcUrl),
  direccionContrato = CONTRACT_ADDRESS
}) {
  console.log("\n============================================================");
  console.log("🤖 INICIANDO PIPELINE DE AGENTE IA & DINERO PROGRAMABLE");
  console.log("============================================================");

  // Paso A: Inferencia del modelo de IA
  const evaluacion = await evaluarCalidadConIA(lote);

  if (!evaluacion.aprobado) {
    console.warn(`⛔ [PAGO DENEGADO] La IA no certificó el umbral mínimo (obtuvo ${evaluacion.puntaje}/100, requerido >= 90).`);
    console.warn("🛡️ Los fondos permanecen seguros bajo custodia (Escrow). No se emite transacción.");
    return {
      autorizado: false,
      motivo: "CALIDAD_INSUFICIENTE",
      puntaje: evaluacion.puntaje
    };
  }

  // Paso B: Conectar con la Blockchain como Oráculo
  console.log("\n🔑 2. Inicializando credenciales del Oráculo Criptográfico...");

  // La clave privada del oráculo DEBE provenir de variables de entorno seguras (process.env.ORACLE_PRIVATE_KEY)
  const oraculoSigner = new ethers.Wallet(cuentaOraculoPrivKey, provider);
  console.log("• Dirección pública del Oráculo:", oraculoSigner.address);

  const contrato = new ethers.Contract(direccionContrato, CONTRACT_ABI, oraculoSigner);

  // Verificamos si este firmante es realmente el oráculo autorizado en el contrato
  const oraculoEsperado = await contrato.oraculoIA();
  if (oraculoEsperado.toLowerCase() !== oraculoSigner.address.toLowerCase()) {
    throw new Error(`Cuenta firmante (${oraculoSigner.address}) no coincide con el oráculo registrado en el contrato (${oraculoEsperado}).`);
  }

  // Paso C: Emitir la transacción on-chain
  const montoWei = ethers.parseEther(montoEth.toString());
  console.log(`\n⚡ 3. Emitiendo autorización on-chain para ${beneficiarioAddress}...`);
  console.log(`• Monto a autorizar: ${montoEth} ETH`);
  console.log(`• Puntaje certificado: ${evaluacion.puntaje}`);

  const tx = await contrato.autorizarPagoCondicional(
    lote.idLote,
    beneficiarioAddress,
    montoWei,
    evaluacion.puntaje
  );

  console.log("🚀 Transacción enviada. Hash:", tx.hash);
  console.log("⏳ Esperando confirmación de los validadores...");

  const receipt = await tx.wait(1);
  console.log("✅ ¡Autorización confirmada en bloque:", receipt.blockNumber);
  console.log("💸 El campesino o beneficiario ya puede retirar su dinero con el patrón Pull.");

  return {
    autorizado: true,
    puntaje: evaluacion.puntaje,
    txHash: tx.hash,
    bloque: receipt.blockNumber
  };
}

module.exports = {
  evaluarCalidadConIA,
  procesarLoteYAutorizarPago
};

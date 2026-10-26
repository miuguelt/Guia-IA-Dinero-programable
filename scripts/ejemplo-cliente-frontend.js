/**
 * ============================================================================
 * EJEMPLO DE INTEGRACIÓN EN APLICACIONES (FRONTEND / CLIENTE JAVASCRIPT)
 * Tecnólogo ADSO SENA — Guía de Dinero Programable & Smart Contracts
 * ============================================================================
 * 
 * Este archivo demuestra paso a paso cómo una aplicación web (React, Vue,
 * Svelte o Vanilla JS) interactúa con un contrato inteligente de dinero
 * programable utilizando ethers.js (v6) o viem.
 * 
 * Tres operaciones esenciales:
 * 1. LECTURAS (View Calls): Gratuitas, no gastan gas ni requieren firma.
 * 2. ESCRITURAS (Transactions): Modifican estado, requieren firma y pagan gas.
 * 3. EVENTOS (Real-Time Listeners): Reciben notificaciones push de la red.
 * ============================================================================
 */

// Si estás en Node.js para pruebas, puedes requerir ethers; en navegador viene por bundler o CDN
let ethers;
try {
  ethers = require("ethers");
} catch {
  // En entorno de navegador: window.ethers
  ethers = globalThis.ethers;
}

// 1. LA DIRECCIÓN DEL CONTRATO (Obtenida tras desplegar en la red)
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// 2. LA ABI (Application Binary Interface):
// Es el "contrato OpenAPI / Swagger" que describe qué funciones y eventos existen.
const CONTRACT_ABI = [
  // Funciones de lectura (view)
  "function administrador() view returns (address)",
  "function oraculoIA() view returns (address)",
  "function totalEnGarantia() view returns (uint256)",
  "function saldosPendientes(address beneficiario) view returns (uint256)",
  "function consultarBalanceContrato() view returns (uint256)",
  
  // Funciones de escritura
  "function depositarGarantia() payable",
  "function autorizarPagoCondicional(uint256 _idLote, address _beneficiario, uint256 _monto, uint256 _puntajeCalidadIA)",
  "function retirarMiDinero()",

  // Eventos para escucha en tiempo real
  "event FondosDepositados(address indexed depositante, uint256 monto, uint256 nuevoTotal)",
  "event PagoAutorizadoPorIA(uint256 indexed idLote, address indexed beneficiario, uint256 monto, uint256 puntaje)",
  "event FondosRetirados(address indexed beneficiario, uint256 monto)"
];

/**
 * Función principal de inicialización del cliente Web3.
 * `opciones` permite usar otro proveedor o la dirección de un despliegue distinto.
 */
async function inicializarClienteWeb3(rpcUrl = "http://127.0.0.1:8545", opciones = {}) {
  console.log("🔌 1. Conectando con la red Blockchain en:", rpcUrl);

  // A. Proveedor de lectura (Provider): Solo lee datos de los nodos
  const provider = opciones.provider ?? new ethers.JsonRpcProvider(rpcUrl);

  // B. Instancia del contrato solo para lectura
  const contratoLectura = new ethers.Contract(opciones.direccion ?? CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  // ==========================================================================
  // OPERACIÓN 1: LECTURAS OFF-CHAIN (GRATIS, CERO GAS, RESPUESTA INSTANTÁNEA)
  // ==========================================================================
  console.log("\n📖 Consultando estado del contrato (Operación gratuita)...");
  try {
    const admin = await contratoLectura.administrador();
    const oraculo = await contratoLectura.oraculoIA();
    const balanceGarantia = await contratoLectura.totalEnGarantia();

    console.log("• Administrador registrado:", admin);
    console.log("• Oráculo de IA registrado:", oraculo);
    console.log("• Total en garantía:", ethers.formatEther(balanceGarantia), "ETH");
  } catch (error) {
    console.warn("Aviso de lectura (nodo no conectado aún):", error.message);
  }

  // ==========================================================================
  // OPERACIÓN 2: ESCUCHA DE EVENTOS EN TIEMPO REAL (WEBSOCKET / POLLING)
  // ==========================================================================
  console.log("\n🎧 2. Configurando escucha reactiva de eventos on-chain...");

  // La interfaz gráfica se entera cuando la IA autoriza un pago sin recargar la página
  contratoLectura.on("PagoAutorizadoPorIA", (idLote, beneficiario, monto, puntaje, event) => {
    console.log("🔔 [EVENTO EN VIVO] ¡Pago Autorizado por IA!");
    console.log(`• Lote ID:       ${idLote}`);
    console.log(`• Beneficiario:  ${beneficiario}`);
    console.log(`• Monto:         ${ethers.formatEther(monto)} ETH`);
    console.log(`• Puntaje de IA: ${puntaje}%`);
    // En una aplicación React/Vue, aquí actualizarías el estado de tu componente:
    // setNotificacion({ lote: idLote, monto: ethers.formatEther(monto) });
  });

  contratoLectura.on("FondosRetirados", (beneficiario, monto) => {
    console.log(`💸 [EVENTO EN VIVO] Retiro completado para: ${beneficiario} por ${ethers.formatEther(monto)} ETH`);
  });

  return { provider, contratoLectura };
}

/**
 * OPERACIÓN 3: ESCRITURA ON-CHAIN CON BILLETERA (PAGA GAS Y REQUIERE FIRMA)
 * Ejemplo: El beneficiario retira su dinero programado cuando la IA lo aprobó.
 */
async function ejecutarRetiroBeneficiario(signerOrPrivateKey, rpcUrl = "http://127.0.0.1:8545", direccion = CONTRACT_ADDRESS) {
  console.log("\n✍️ 3. Ejecutando transacción de retiro...");

  let signer;
  if (typeof signerOrPrivateKey === "string") {
    // Si se pasa una llave privada (ej. en backend seguro o testing)
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    signer = new ethers.Wallet(signerOrPrivateKey, provider);
  } else {
    // En navegador con MetaMask: const provider = new ethers.BrowserProvider(window.ethereum); const signer = await provider.getSigner();
    signer = signerOrPrivateKey;
  }

  const direccionBeneficiario = await signer.getAddress();
  console.log("• Cuenta del usuario:", direccionBeneficiario);

  // Conectamos el contrato con la cuenta firmante
  const contratoEscritura = new ethers.Contract(direccion, CONTRACT_ABI, signer);

  // Verificamos primero si tiene saldo antes de gastar gas (Check en cliente)
  const saldoDisponible = await contratoEscritura.saldosPendientes(direccionBeneficiario);
  console.log("• Saldo pendiente por cobrar:", ethers.formatEther(saldoDisponible), "ETH");

  if (saldoDisponible === 0n) {
    console.log("ℹ️ No hay saldo pendiente para retirar en este momento.");
    return { exito: false, motivo: "SIN_SALDO" };
  }

  // Enviamos la transacción a la red
  console.log("🚀 Enviando transacción a la red blockchain...");
  const tx = await contratoEscritura.retirarMiDinero();
  console.log("• Hash de la transacción emitida:", tx.hash);

  // Esperamos la confirmación del bloque (Mined confirmation)
  console.log("⏳ Esperando validación del bloque...");
  const receipt = await tx.wait(1); // 1 confirmación
  console.log("✅ ¡Transacción confirmada en el bloque:", receipt.blockNumber);
  console.log("• Gas total consumido:", receipt.gasUsed.toString());

  return { exito: true, hash: tx.hash, bloque: receipt.blockNumber };
}

module.exports = {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  inicializarClienteWeb3,
  ejecutarRetiroBeneficiario
};

if (require.main === module) {
  inicializarClienteWeb3().catch(console.error);
}

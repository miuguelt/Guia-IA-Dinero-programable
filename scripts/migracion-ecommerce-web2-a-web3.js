/**
 * ============================================================================
 * GUÍA DE MIGRACIÓN: DE APLICACIÓN WEB2 A ARQUITECTURA HÍBRIDA WEB3
 * Tecnólogo ADSO SENA — Dinero Programable & Smart Contracts
 * ============================================================================
 * 
 * CASO REAL: El aprendiz ya tiene un e-commerce o sistema de gestión en Express/PostgreSQL.
 * ¿Cómo le añade la capa de dinero programable sin tirar a la basura su backend existente?
 * 
 * Este script demuestra:
 * 1. El Backend tradicional (Express) que gestiona el catálogo de productos e inventario.
 * 2. La capa Web3 (Contrato TiendaEscrowWeb3) que custodia el dinero de forma autónoma.
 * 3. El indexador en tiempo real que escucha eventos de la blockchain y sincroniza PostgreSQL.
 * ============================================================================
 */

let ethers;
try {
  ethers = require("ethers");
} catch {
  ethers = globalThis.ethers;
}

// 1. Simulación de la base de datos existente en PostgreSQL
const baseDatosPostgreSQL = {
  pedidos: new Map(),
  productos: [
    { id: 1, nombre: "Kit Sensor IoT Suelos", precioCop: 250000, precioEth: "0.08" },
    { id: 2, nombre: "Miel Cruda de Bosque (Caja 12u)", precioCop: 180000, precioEth: "0.05" }
  ]
};

// 2. ABI mínima del contrato TiendaEscrowWeb3
const ESCROW_ABI = [
  "function pagarYBloquearEnEscrow(uint256 _idPedido, address _vendedor) payable",
  "function marcarDespachado(uint256 _idPedido)",
  "function confirmarRecibidoYLiberarPago(uint256 _idPedido)",
  "function reembolsarComprador(uint256 _idPedido)",
  "function pedidos(uint256) view returns (uint256 idPedido, address comprador, address vendedor, uint256 monto, uint8 estado)",
  "event PedidoCreado(uint256 indexed idPedido, address indexed comprador, address indexed vendedor, uint256 monto)",
  "event PagoLiberadoAlVendedor(uint256 indexed idPedido, uint256 monto)"
];

const ESCROW_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

/**
 * SERVICIO BACKEND 1: CREACIÓN DE PEDIDO EN LA APP EXISTENTE
 * El cliente agrega productos al carrito y solicita pagar.
 */
function backendCrearPedidoWeb2({ clienteId, productoId, vendedorAddress }) {
  const idPedido = Date.now();
  const producto = baseDatosPostgreSQL.productos.find(p => p.id === productoId);

  // Registro en la base de datos relacional (Web2)
  const nuevoPedido = {
    idPedido,
    clienteId,
    productoId: producto.id,
    productoNombre: producto.nombre,
    precioEth: producto.precioEth,
    vendedorAddress,
    estadoWeb2: "PENDIENTE_PAGO_BLOCKCHAIN",
    txHash: null,
    creadoEn: new Date().toISOString()
  };

  baseDatosPostgreSQL.pedidos.set(idPedido, nuevoPedido);
  console.log(`📦 [Backend Web2] Pedido #${idPedido} creado en PostgreSQL. Esperando pago on-chain...`);

  // Le respondemos al frontend los datos necesarios para interactuar con la blockchain
  return {
    idPedido,
    contratoEscrow: ESCROW_ADDRESS,
    montoEthRequerido: producto.precioEth,
    vendedorAddress
  };
}

/**
 * SERVICIO BACKEND 2: INDEXADOR REACTIVO (SINCRONIZA BLOCKCHAIN -> POSTGRESQL)
 * Escucha la red blockchain para actualizar la base de datos automáticamente.
 */
function iniciarSincronizadorEventos(contratoEscrowMock) {
  console.log("🔌 [Indexador CQRS] Escuchando eventos de la red Blockchain en tiempo real...");

  // Cuando el contrato emite PedidoCreado, el backend actualiza PostgreSQL
  contratoEscrowMock.on("PedidoCreado", (idPedido, comprador, vendedor, montoWei) => {
    const pedido = baseDatosPostgreSQL.pedidos.get(Number(idPedido));
    if (pedido) {
      pedido.estadoWeb2 = "CUSTODIADO_EN_ESCROW";
      pedido.compradorAddress = comprador;
      console.log(`✅ [Sincronización SQL] ¡Fondos verificados en blockchain para Pedido #${idPedido}!`);
      console.log(`   Estado en PostgreSQL mutó a: ${pedido.estadoWeb2}`);
      console.log(`   El vendedor ya puede despachar el producto con certeza absoluta de pago.`);
    }
  });

  // Cuando el contrato emite PagoLiberadoAlVendedor
  contratoEscrowMock.on("PagoLiberadoAlVendedor", (idPedido, montoWei) => {
    const pedido = baseDatosPostgreSQL.pedidos.get(Number(idPedido));
    if (pedido) {
      pedido.estadoWeb2 = "ENTREGADO_Y_PAGADO";
      console.log(`💸 [Sincronización SQL] Pedido #${idPedido} cerrado. Fondos transferidos al vendedor.`);
    }
  });
}

/**
 * CLIENTE FRONTEND: EL USUARIO EJECUTA EL PAGO DESDE SU NAVEGADOR
 */
async function clientePagarPedidoWeb3({ idPedido, vendedorAddress, montoEth, signer, direccionEscrow = ESCROW_ADDRESS }) {
  console.log(`\n🦊 [Frontend Web3] Cliente conectando billetera para pagar Pedido #${idPedido}...`);
  const contrato = new ethers.Contract(direccionEscrow, ESCROW_ABI, signer);

  const montoWei = ethers.parseEther(montoEth.toString());
  const tx = await contrato.pagarYBloquearEnEscrow(idPedido, vendedorAddress, { value: montoWei });
  console.log(`🚀 [Frontend Web3] Transacción enviada a la mempool. Hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`⛓️ [Frontend Web3] Transacción confirmada en el bloque ${receipt.blockNumber}. Dinero en custodia.`);
  return receipt;
}

module.exports = {
  baseDatosPostgreSQL,
  backendCrearPedidoWeb2,
  iniciarSincronizadorEventos,
  clientePagarPedidoWeb3,
  ESCROW_ABI,
  ESCROW_ADDRESS
};

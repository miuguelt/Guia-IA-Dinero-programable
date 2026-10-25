// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TiendaEscrowWeb3
 * @dev Caso de uso práctico para aprendices ADSO:
 * Cómo coger una tienda virtual existente (Web2) y agregarle la capa de dinero programable.
 * 
 * Flujo de Negocio:
 * 1. El cliente compra un producto y el dinero queda congelado en el contrato (Escrow).
 * 2. El vendedor despacha el producto (registrado off-chain en la base de datos).
 * 3. Al confirmar la entrega (o mediante oráculo de mensajería), el dinero se libera al vendedor.
 * 4. Si hay disputa no resuelta, el mediador/árbitro puede reembolsar al cliente.
 */
contract TiendaEscrowWeb3 {

    // --- ERRORES PERSONALIZADOS ---
    error NoAutorizado();
    error EstadoInvalido();
    error MontoIncorrecto(uint256 enviado, uint256 esperado);
    error FalloTransferencia();
    error DireccionInvalida();

    enum EstadoPedido { NO_EXISTE, FONDOS_BLOQUEADOS, DESPACHADO, ENTREGADO_PAGADO, REEMBOLSADO }

    struct Pedido {
        uint256 idPedido;
        address comprador;
        address vendedor;
        uint256 monto;
        EstadoPedido estado;
    }

    address public immutable arbitroPlataforma; // El backend de la tienda o jurado
    mapping(uint256 => Pedido) public pedidos;

    // --- EVENTOS ---
    event PedidoCreado(uint256 indexed idPedido, address indexed comprador, address indexed vendedor, uint256 monto);
    event PedidoDespachado(uint256 indexed idPedido);
    event PagoLiberadoAlVendedor(uint256 indexed idPedido, uint256 monto);
    event PedidoReembolsado(uint256 indexed idPedido, uint256 monto);

    modifier soloArbitro() {
        if (msg.sender != arbitroPlataforma) revert NoAutorizado();
        _;
    }

    constructor() {
        arbitroPlataforma = msg.sender;
    }

    /**
     * @notice Paso 1: El cliente paga el pedido Web2 pero los fondos quedan bloqueados en el Smart Contract.
     */
    function pagarYBloquearEnEscrow(uint256 _idPedido, address _vendedor) external payable {
        if (_vendedor == address(0)) revert DireccionInvalida();
        if (msg.value == 0) revert MontoIncorrecto(0, 1);
        if (pedidos[_idPedido].estado != EstadoPedido.NO_EXISTE) revert EstadoInvalido();

        pedidos[_idPedido] = Pedido({
            idPedido: _idPedido,
            comprador: msg.sender,
            vendedor: _vendedor,
            monto: msg.value,
            estado: EstadoPedido.FONDOS_BLOQUEADOS
        });

        emit PedidoCreado(_idPedido, msg.sender, _vendedor, msg.value);
    }

    /**
     * @notice Paso 2: El vendedor notifica el despacho.
     */
    function marcarDespachado(uint256 _idPedido) external {
        Pedido storage pedido = pedidos[_idPedido];
        if (msg.sender != pedido.vendedor) revert NoAutorizado();
        if (pedido.estado != EstadoPedido.FONDOS_BLOQUEADOS) revert EstadoInvalido();

        pedido.estado = EstadoPedido.DESPACHADO;
        emit PedidoDespachado(_idPedido);
    }

    /**
     * @notice Paso 3: El cliente confirma recibido o el árbitro libera fondos al vendedor (CEI).
     */
    function confirmarRecibidoYLiberarPago(uint256 _idPedido) external {
        Pedido storage pedido = pedidos[_idPedido];
        if (msg.sender != pedido.comprador && msg.sender != arbitroPlataforma) revert NoAutorizado();
        if (pedido.estado != EstadoPedido.DESPACHADO && pedido.estado != EstadoPedido.FONDOS_BLOQUEADOS) revert EstadoInvalido();

        uint256 monto = pedido.monto;
        address vendedor = pedido.vendedor;

        // 1. Effects
        pedido.estado = EstadoPedido.ENTREGADO_PAGADO;
        pedido.monto = 0;

        // 2. Interactions
        (bool exito, ) = vendedor.call{value: monto}("");
        if (!exito) revert FalloTransferencia();

        emit PagoLiberadoAlVendedor(_idPedido, monto);
    }

    /**
     * @notice Paso 4: Reembolso al comprador en caso de disputa justificada (CEI).
     */
    function reembolsarComprador(uint256 _idPedido) external soloArbitro {
        Pedido storage pedido = pedidos[_idPedido];
        if (pedido.estado == EstadoPedido.NO_EXISTE) revert EstadoInvalido();
        if (pedido.estado == EstadoPedido.ENTREGADO_PAGADO || pedido.estado == EstadoPedido.REEMBOLSADO) revert EstadoInvalido();

        uint256 monto = pedido.monto;
        address comprador = pedido.comprador;

        // 1. Effects
        pedido.estado = EstadoPedido.REEMBOLSADO;
        pedido.monto = 0;

        // 2. Interactions
        (bool exito, ) = comprador.call{value: monto}("");
        if (!exito) revert FalloTransferencia();

        emit PedidoReembolsado(_idPedido, monto);
    }
}

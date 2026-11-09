// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title DispensadorDigital (Ejercicio de Práctica Paso a Paso)
/// @notice Tu primer contrato inteligente. Simula una máquina dispensadora con precio fijo.
/// Sigue las instrucciones y completa cada sección. La solución de referencia está en taller/solucion.
contract DispensadorDigital {
    // --- ERRORES PERSONALIZADOS ---
    error PagoInsuficiente(uint256 enviado, uint256 requerido);
    error SoloDuenoPuedeRetirar(address llamador);
    error SinSaldoParaRetirar();
    error FalloAlRetirar();
    error PrecioInvalido();

    // --- VARIABLES DE ESTADO Y CONSTANTES ---
    uint256 public immutable precioArticulo;
    address public immutable dueno;
    uint256 public totalVentas;

    // --- EVENTOS ---
    event CompraExitosa(address indexed comprador, uint256 montoPagado, uint256 idVenta);
    event FondosRetirados(address indexed dueno, uint256 montoRetirado);

    /// @notice Constructor: inicializa el precio y guarda quién desplegó el contrato.
    constructor(uint256 precioInicial) {
        if (precioInicial == 0) revert PrecioInvalido();
        precioArticulo = precioInicial;
        dueno = msg.sender;
    }

    /// @notice Función para comprar: recibe fondos y valida que alcancen para el precio.
    function comprar() external payable {
        if (msg.value < precioArticulo) {
            revert PagoInsuficiente(msg.value, precioArticulo);
        }

        totalVentas += 1;
        emit CompraExitosa(msg.sender, msg.value, totalVentas);
    }

    /// @notice Retiro seguro de ganancias por parte del dueño.
    function retirarGanancias() external {
        if (msg.sender != dueno) revert SoloDuenoPuedeRetirar(msg.sender);

        uint256 saldoTotal = address(this).balance;
        if (saldoTotal == 0) revert SinSaldoParaRetirar();

        (bool exito, ) = dueno.call{value: saldoTotal}("");
        if (!exito) revert FalloAlRetirar();

        emit FondosRetirados(dueno, saldoTotal);
    }

    /// @notice Consulta el balance de la cuenta del contrato.
    function obtenerBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

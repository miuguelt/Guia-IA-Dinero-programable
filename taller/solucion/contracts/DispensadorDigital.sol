// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title DispensadorDigital
/// @notice Contrato introductorio para aprendices ADSO.
/// Simula una máquina dispensadora de bebidas o artículos digitales con precio fijo,
/// custodia atómica de fondos en la EVM y retiro seguro por parte del dueño.
contract DispensadorDigital {
    // --- ERRORES PERSONALIZADOS (Ahorro de gas y diagnóstico claro) ---
    error PagoInsuficiente(uint256 enviado, uint256 requerido);
    error SoloDuenoPuedeRetirar(address llamador);
    error SinSaldoParaRetirar();
    error FalloAlRetirar();
    error PrecioInvalido();

    // --- VARIABLES DE ESTADO Y CONSTANTES ---
    uint256 public immutable precioArticulo;
    address public immutable dueno;
    uint256 public totalVentas;

    // --- EVENTOS (Bitácora inmutable leída por el backend o indexador) ---
    event CompraExitosa(address indexed comprador, uint256 montoPagado, uint256 idVenta);
    event FondosRetirados(address indexed dueno, uint256 montoRetirado);

    /// @notice Despliega el contrato asignando el precio por artículo y registrando al dueño.
    /// @param precioInicial Precio requerido en wei por cada compra.
    constructor(uint256 precioInicial) {
        if (precioInicial == 0) revert PrecioInvalido();
        precioArticulo = precioInicial;
        dueno = msg.sender;
    }

    /// @notice Permite a cualquier usuario comprar un artículo enviando fondos.
    /// @dev La palabra clave 'payable' permite recibir ethers nativos en la cuenta del contrato.
    function comprar() external payable {
        if (msg.value < precioArticulo) {
            revert PagoInsuficiente(msg.value, precioArticulo);
        }

        totalVentas += 1;
        emit CompraExitosa(msg.sender, msg.value, totalVentas);
    }

    /// @notice Permite al dueño retirar todos los fondos acumulados por las ventas.
    /// @dev Aplica el patrón Checks-Effects-Interactions (CEI).
    function retirarGanancias() external {
        if (msg.sender != dueno) revert SoloDuenoPuedeRetirar(msg.sender);

        uint256 saldoTotal = address(this).balance;
        if (saldoTotal == 0) revert SinSaldoParaRetirar();

        (bool exito, ) = dueno.call{value: saldoTotal}("");
        if (!exito) revert FalloAlRetirar();

        emit FondosRetirados(dueno, saldoTotal);
    }

    /// @notice Devuelve el balance actual custodiado en la cuenta del contrato.
    function obtenerBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

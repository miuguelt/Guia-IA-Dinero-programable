// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICustodiaPrueba { function retirarMiDinero() external; }

/// @notice Actor adversarial exclusivo de las pruebas automatizadas.
contract AdversarioRetiro {
    ICustodiaPrueba public immutable custodia;
    bool public rechazar;
    bool public reentradaExitosa;

    constructor(ICustodiaPrueba destino) { custodia = destino; }

    function retirar(bool bloquearRecepcion) external {
        rechazar = bloquearRecepcion;
        custodia.retirarMiDinero();
    }

    receive() external payable {
        require(!rechazar, unicode"Receptor de prueba bloqueado");
        (reentradaExitosa,) = address(custodia).call(abi.encodeWithSignature("retirarMiDinero()"));
    }
}

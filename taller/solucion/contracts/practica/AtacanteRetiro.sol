// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

// Archivo de práctica entregado: no lo modifiques. Intenta retirar dos veces
// el mismo saldo volviendo a llamar a retirar() mientras recibe el pago.
interface IGarantia {
    function retirar() external;
}

contract AtacanteRetiro {
    IGarantia public immutable garantia;
    uint256 public intentosReentrada;
    bool public reentradaExitosa;

    constructor(address garantia_) {
        garantia = IGarantia(garantia_);
    }

    function atacar() external {
        garantia.retirar();
    }

    receive() external payable {
        if (intentosReentrada == 0) {
            intentosReentrada = 1;
            try garantia.retirar() {
                reentradaExitosa = true;
            } catch {
                reentradaExitosa = false;
            }
        }
    }
}

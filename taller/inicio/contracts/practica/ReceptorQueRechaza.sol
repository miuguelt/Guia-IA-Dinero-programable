// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

// Archivo de práctica entregado: no lo modifiques. Representa un destinatario
// que rechaza cualquier pago, para comprobar que retirar() no pierde el saldo.
interface IGarantiaRetiro {
    function retirar() external;
}

contract ReceptorQueRechaza {
    function retirarDe(address garantia) external {
        IGarantiaRetiro(garantia).retirar();
    }

    receive() external payable {
        revert("No acepto pagos");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @notice Registro educativo: el intervalo no es una certificación sanitaria.
contract RegistroTelemetria {
    error NoAutorizado();
    error DatoInvalido();
    error LecturaDuplicada();
    struct Lote { int256 temperaturaX10; bool cuarentena; uint256 lecturas; }
    address public immutable oraculo;
    mapping(bytes32 => Lote) public lotes;
    mapping(bytes32 => bool) public lecturasRegistradas;
    event TelemetriaRegistrada(bytes32 indexed lote, int256 temperaturaX10, bool cuarentena, bytes32 lectura);

    constructor(address evaluador) {
        if (evaluador == address(0)) revert DatoInvalido();
        oraculo = evaluador;
    }

    function registrar(bytes32 lote, int256 temperaturaX10, bytes32 lectura) external {
        if (msg.sender != oraculo) revert NoAutorizado();
        if (lote == bytes32(0) || lectura == bytes32(0) || temperaturaX10 < -1000 || temperaturaX10 > 1000) revert DatoInvalido();
        if (lecturasRegistradas[lectura]) revert LecturaDuplicada();
        lecturasRegistradas[lectura] = true;
        Lote storage dato = lotes[lote];
        dato.temperaturaX10 = temperaturaX10;
        dato.cuarentena = dato.cuarentena || temperaturaX10 < 20 || temperaturaX10 > 80;
        dato.lecturas++;
        emit TelemetriaRegistrada(lote, temperaturaX10, dato.cuarentena, lectura);
    }
}

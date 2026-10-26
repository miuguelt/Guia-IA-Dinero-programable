// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @notice Certifica cumplimiento de reglas del ejercicio, no pureza física de una muestra.
contract CertificacionMiel {
    error NoAutorizado();
    error LoteInvalido();
    error ParametrosInvalidos();
    error CondicionesIncumplidas();
    address public immutable oraculo;
    mapping(bytes32 => bytes32) public certificados;
    event MielCertificada(bytes32 indexed lote, bytes32 documento, uint256 humedadX10, uint256 hmfX10, int256 deltaX10);

    constructor(address evaluador) {
        if (evaluador == address(0)) revert ParametrosInvalidos();
        oraculo = evaluador;
    }

    function certificar(bytes32 lote, bytes32 documento, uint256 humedadX10, uint256 hmfX10, int256 deltaX10) external {
        if (msg.sender != oraculo) revert NoAutorizado();
        if (lote == bytes32(0) || documento == bytes32(0) || certificados[lote] != bytes32(0)) revert LoteInvalido();
        if (humedadX10 > 1000 || hmfX10 > 10000 || deltaX10 < -1000 || deltaX10 > 1000) revert ParametrosInvalidos();
        if (humedadX10 > 200 || hmfX10 > 400 || deltaX10 > -245) revert CondicionesIncumplidas();
        certificados[lote] = documento;
        emit MielCertificada(lote, documento, humedadX10, hmfX10, deltaX10);
    }
}

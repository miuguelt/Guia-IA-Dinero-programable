// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Semaphore} from "@semaphore-protocol/contracts/Semaphore.sol";
import {ISemaphore} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";
import {ISemaphoreVerifier} from "@semaphore-protocol/contracts/interfaces/ISemaphoreVerifier.sol";
import {SemaphoreVerifier} from "@semaphore-protocol/contracts/base/SemaphoreVerifier.sol";

/// @notice Elección educativa: una identidad admite un mensaje por elección.
contract EleccionesSemaphore {
    error NoAutorizado();
    error OpcionInvalida();
    error AmbitoInvalido();
    address public immutable administrador;
    ISemaphore public immutable semaphore;
    uint256 public immutable grupo;
    uint256 public immutable ambito;
    mapping(uint256 => uint256) public votos;
    event VotoRegistrado(uint256 indexed opcion, uint256 nullifier);

    constructor(ISemaphore servicio, uint256 identificadorEleccion) {
        administrador = msg.sender;
        semaphore = servicio;
        grupo = servicio.createGroup(address(this), 0);
        ambito = identificadorEleccion;
    }

    function registrarElector(uint256 compromiso) external {
        if (msg.sender != administrador) revert NoAutorizado();
        semaphore.addMember(grupo, compromiso);
    }

    function emitirVoto(ISemaphore.SemaphoreProof calldata prueba) external {
        if (prueba.scope != ambito) revert AmbitoInvalido();
        if (prueba.message < 1 || prueba.message > 3) revert OpcionInvalida();
        semaphore.validateProof(grupo, prueba);
        votos[prueba.message]++;
        emit VotoRegistrado(prueba.message, prueba.nullifier);
    }
}

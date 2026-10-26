// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @notice Token de prueba que mueve saldos pero no devuelve `bool`, como USDT en Ethereum.
contract TokenSinRetorno {
    mapping(address => uint256) public balanceOf;

    constructor(uint256 suministro) { balanceOf[msg.sender] = suministro; }

    function transfer(address destino, uint256 monto) external {
        balanceOf[msg.sender] -= monto;
        balanceOf[destino] += monto;
    }

    function transferFrom(address origen, address destino, uint256 monto) external {
        balanceOf[origen] -= monto;
        balanceOf[destino] += monto;
    }
}

/// @notice Token de prueba que rechaza transferencias devolviendo `false` sin revertir.
/// @dev `aceptaDepositos` permite llegar al retiro y comprobar que también se rechaza.
contract TokenQueRetornaFalso {
    bool public immutable aceptaDepositos;

    constructor(bool aceptar) { aceptaDepositos = aceptar; }

    function balanceOf(address) external pure returns (uint256) { return 0; }
    function transfer(address, uint256) external pure returns (bool) { return false; }
    function transferFrom(address, address, uint256) external view returns (bool) { return aceptaDepositos; }
}

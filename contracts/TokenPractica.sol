// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @notice Token sin valor financiero para los ejercicios ERC-20 locales.
contract TokenPractica {
    string public constant name = unicode"Token de práctica ADSO";
    string public constant symbol = "PRA";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    error SaldoInsuficiente();
    error PermisoInsuficiente();
    error DireccionInvalida();

    constructor(uint256 supply) {
        totalSupply = supply;
        balanceOf[msg.sender] = supply;
        emit Transfer(address(0), msg.sender, supply);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert DireccionInvalida();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        mover(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        if (allowance[sender][msg.sender] < amount) revert PermisoInsuficiente();
        allowance[sender][msg.sender] -= amount;
        mover(sender, recipient, amount);
        return true;
    }

    function mover(address sender, address recipient, uint256 amount) private {
        if (recipient == address(0)) revert DireccionInvalida();
        if (balanceOf[sender] < amount) revert SaldoInsuficiente();
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }
}

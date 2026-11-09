// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Mock BOT Dollar", "mUSD") {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}

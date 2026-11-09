// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PermissionTarget {
    uint256 public value;

    function setValue(uint256 nextValue) external {
        value = nextValue;
    }
}

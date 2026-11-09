// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentRegistry.sol";

contract AgentPermissions is Ownable, ReentrancyGuard {
    AgentRegistry public immutable registry;
    mapping(uint256 => address) public agentWallet;
    mapping(uint256 => uint256) public agentWalletOwnerNonce;
    mapping(uint256 => mapping(address => mapping(bytes4 => uint64))) public permissionExpiry;
    mapping(uint256 => mapping(address => mapping(bytes4 => uint256))) private permissionNonce;

    event AgentWalletUpdated(uint256 indexed agentId, address indexed wallet);
    event PermissionUpdated(uint256 indexed agentId, address indexed target, bytes4 indexed selector, uint64 expiresAt);
    event PermissionRevoked(uint256 indexed agentId, address indexed target, bytes4 indexed selector);
    event AgentCallExecuted(uint256 indexed agentId, address indexed target, bytes4 indexed selector);

    constructor(address registryAddress, address initialOwner) Ownable(initialOwner) {
        require(registryAddress != address(0), "Invalid registry");
        registry = AgentRegistry(registryAddress);
    }

    function setAgentWallet(uint256 agentId, address wallet) external onlyAgentOwner(agentId) {
        require(wallet != address(0), "Invalid wallet");
        agentWallet[agentId] = wallet;
        agentWalletOwnerNonce[agentId] = registry.ownershipNonce(agentId);
        emit AgentWalletUpdated(agentId, wallet);
    }

    function grantPermission(
        uint256 agentId,
        address target,
        bytes4 selector,
        uint64 expiresAt
    ) external onlyAgentOwner(agentId) {
        require(target.code.length > 0, "Target must be a contract");
        require(selector != bytes4(0), "Invalid selector");
        require(expiresAt > block.timestamp, "Expiry must be in the future");
        permissionExpiry[agentId][target][selector] = expiresAt;
        permissionNonce[agentId][target][selector] = registry.ownershipNonce(agentId);
        emit PermissionUpdated(agentId, target, selector, expiresAt);
    }

    function revokePermission(uint256 agentId, address target, bytes4 selector) external onlyAgentOwner(agentId) {
        permissionExpiry[agentId][target][selector] = 0;
        emit PermissionRevoked(agentId, target, selector);
    }

    function isPermissionActive(uint256 agentId, address target, bytes4 selector) public view returns (bool) {
        return permissionExpiry[agentId][target][selector] > block.timestamp
            && permissionNonce[agentId][target][selector] == registry.ownershipNonce(agentId);
    }

    function execute(uint256 agentId, address target, bytes calldata data) external nonReentrant returns (bytes memory) {
        require(agentWallet[agentId] == msg.sender, "Not agent wallet");
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.active, "Agent inactive");
        require(data.length >= 4, "Invalid call data");
        bytes4 selector;
        assembly {
            selector := calldataload(data.offset)
        }
        require(isPermissionActive(agentId, target, selector), "Permission denied or expired");
        (bool success, bytes memory result) = target.call(data);
        require(success, "Target call failed");
        emit AgentCallExecuted(agentId, target, selector);
        return result;
    }

    modifier onlyAgentOwner(uint256 agentId) {
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");
        require(agent.active, "Agent inactive");
        _;
    }
}

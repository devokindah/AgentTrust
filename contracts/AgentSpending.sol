// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./AgentRegistry.sol";
import "./AgentPermissions.sol";

contract AgentSpending is Ownable {
    using SafeERC20 for IERC20;

    struct SpendingLimit {
        uint256 perTransaction;
        uint256 daily;
        uint256 total;
        uint256 spentToday;
        uint256 spentTotal;
        uint64 dayIndex;
        bool enabled;
    }

    AgentRegistry public immutable registry;
    AgentPermissions public immutable permissions;
    mapping(uint256 => mapping(address => SpendingLimit)) public limits;
    mapping(bytes32 => bool) public usedRequests;

    event SpendingLimitUpdated(uint256 indexed agentId, address indexed token, uint256 perTransaction, uint256 daily, uint256 total);
    event SpendingLimitRevoked(uint256 indexed agentId, address indexed token);
    event SpendExecuted(uint256 indexed agentId, address indexed token, address indexed recipient, uint256 amount, bytes32 requestId);

    constructor(address registryAddress, address permissionsAddress, address initialOwner) Ownable(initialOwner) {
        require(registryAddress != address(0) && permissionsAddress != address(0), "Invalid contract");
        registry = AgentRegistry(registryAddress);
        permissions = AgentPermissions(permissionsAddress);
    }

    function setLimits(
        uint256 agentId,
        address token,
        uint256 perTransaction,
        uint256 daily,
        uint256 total
    ) external onlyAgentOwner(agentId) {
        require(token.code.length > 0, "Token must be a contract");
        require(perTransaction > 0 && perTransaction <= daily && daily <= total, "Invalid spending limits");
        SpendingLimit storage limit = limits[agentId][token];
        require(total >= limit.spentTotal, "Below amount already spent");
        limit.perTransaction = perTransaction;
        limit.daily = daily;
        limit.total = total;
        limit.enabled = true;
        emit SpendingLimitUpdated(agentId, token, perTransaction, daily, total);
    }

    function revokeLimits(uint256 agentId, address token) external onlyAgentOwner(agentId) {
        limits[agentId][token].enabled = false;
        emit SpendingLimitRevoked(agentId, token);
    }

    function spend(
        uint256 agentId,
        address token,
        address recipient,
        uint256 amount,
        bytes32 requestId
    ) external {
        require(msg.sender == permissions.agentWallet(agentId), "Not agent wallet");
        require(recipient != address(0) && recipient != address(this), "Invalid recipient");
        require(requestId != bytes32(0), "Invalid request ID");
        bytes32 requestKey = keccak256(abi.encode(agentId, requestId));
        require(!usedRequests[requestKey], "Request already used");
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.active, "Agent inactive");

        SpendingLimit storage limit = limits[agentId][token];
        require(limit.enabled, "Spending disabled");
        require(amount > 0 && amount <= limit.perTransaction, "Transaction limit exceeded");
        uint64 currentDay = uint64(block.timestamp / 1 days);
        if (limit.dayIndex != currentDay) {
            limit.dayIndex = currentDay;
            limit.spentToday = 0;
        }
        require(limit.spentToday + amount <= limit.daily, "Daily limit exceeded");
        require(limit.spentTotal + amount <= limit.total, "Total limit exceeded");

        usedRequests[requestKey] = true;
        limit.spentToday += amount;
        limit.spentTotal += amount;
        IERC20(token).safeTransferFrom(agent.owner, recipient, amount);
        emit SpendExecuted(agentId, token, recipient, amount, requestId);
    }

    modifier onlyAgentOwner(uint256 agentId) {
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.owner == msg.sender, "Not agent owner");
        require(agent.active, "Agent inactive");
        _;
    }
}

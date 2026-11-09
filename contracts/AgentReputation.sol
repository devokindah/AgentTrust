// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AgentRegistry.sol";

contract AgentReputation is Ownable {
    struct TaskRecord {
        bool successful;
        uint64 recordedAt;
        string resultURI;
    }

    AgentRegistry public immutable registry;
    mapping(address => bool) public evaluators;
    mapping(uint256 => uint256) public completedTasks;
    mapping(uint256 => uint256) public successfulTasks;
    mapping(uint256 => mapping(bytes32 => TaskRecord)) private taskRecords;

    event EvaluatorUpdated(address indexed evaluator, bool authorized);
    event TaskRecorded(uint256 indexed agentId, bytes32 indexed taskId, bool successful, address indexed evaluator);

    constructor(address registryAddress, address initialOwner) Ownable(initialOwner) {
        require(registryAddress != address(0), "Invalid registry");
        registry = AgentRegistry(registryAddress);
    }

    function setEvaluator(address evaluator, bool authorized) external onlyOwner {
        require(evaluator != address(0), "Invalid evaluator");
        evaluators[evaluator] = authorized;
        emit EvaluatorUpdated(evaluator, authorized);
    }

    function recordTask(uint256 agentId, bytes32 taskId, bool successful, string calldata resultURI) external {
        require(evaluators[msg.sender], "Not evaluator");
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        require(agent.active, "Agent inactive");
        require(msg.sender != agent.owner, "Owner cannot rate own agent");
        require(taskId != bytes32(0), "Invalid task ID");
        require(taskRecords[agentId][taskId].recordedAt == 0, "Task already recorded");
        require(bytes(resultURI).length <= 200, "Result URI too long");

        taskRecords[agentId][taskId] = TaskRecord(successful, uint64(block.timestamp), resultURI);
        completedTasks[agentId] += 1;
        if (successful) successfulTasks[agentId] += 1;
        emit TaskRecorded(agentId, taskId, successful, msg.sender);
    }

    function getTask(uint256 agentId, bytes32 taskId) external view returns (TaskRecord memory) {
        require(taskRecords[agentId][taskId].recordedAt != 0, "Task not found");
        return taskRecords[agentId][taskId];
    }

    function successRateBps(uint256 agentId) external view returns (uint256) {
        uint256 total = completedTasks[agentId];
        return total == 0 ? 0 : (successfulTasks[agentId] * 10_000) / total;
    }
}

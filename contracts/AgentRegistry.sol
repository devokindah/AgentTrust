// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentRegistry is Ownable {
    struct Agent {
        uint256 id;
        string name;
        string description;
        string category;
        string capabilities;
        string metadataURI;
        address owner;
        uint64 registeredAt;
        bool active;
    }

    uint256 public agentCount;
    mapping(uint256 => uint256) public ownershipNonce;
    mapping(uint256 => Agent) private agents;

    event AgentRegistered(uint256 indexed agentId, address indexed owner, string name);
    event AgentUpdated(uint256 indexed agentId);
    event AgentDeactivated(uint256 indexed agentId);
    event AgentOwnershipTransferred(uint256 indexed agentId, address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function registerAgent(
        string calldata name,
        string calldata description,
        string calldata category,
        string calldata capabilities,
        string calldata metadataURI
    ) external returns (uint256 agentId) {
        require(bytes(name).length > 0 && bytes(name).length <= 80, "Invalid name");
        require(bytes(description).length <= 500, "Description too long");
        require(bytes(category).length > 0 && bytes(category).length <= 40, "Invalid category");
        require(bytes(capabilities).length <= 500, "Capabilities too long");
        require(bytes(metadataURI).length <= 200, "Metadata URI too long");

        agentId = ++agentCount;
        agents[agentId] = Agent({
            id: agentId,
            name: name,
            description: description,
            category: category,
            capabilities: capabilities,
            metadataURI: metadataURI,
            owner: msg.sender,
            registeredAt: uint64(block.timestamp),
            active: true
        });
        emit AgentRegistered(agentId, msg.sender, name);
    }

    function getAgent(uint256 agentId) external view returns (Agent memory) {
        require(agents[agentId].owner != address(0), "Agent not found");
        return agents[agentId];
    }

    function updateAgent(
        uint256 agentId,
        string calldata description,
        string calldata category,
        string calldata capabilities,
        string calldata metadataURI
    ) external onlyAgentOwner(agentId) {
        require(bytes(description).length <= 500, "Description too long");
        require(bytes(category).length > 0 && bytes(category).length <= 40, "Invalid category");
        require(bytes(capabilities).length <= 500, "Capabilities too long");
        require(bytes(metadataURI).length <= 200, "Metadata URI too long");
        Agent storage agent = agents[agentId];
        agent.description = description;
        agent.category = category;
        agent.capabilities = capabilities;
        agent.metadataURI = metadataURI;
        emit AgentUpdated(agentId);
    }

    function deactivateAgent(uint256 agentId) external onlyAgentOwner(agentId) {
        agents[agentId].active = false;
        emit AgentDeactivated(agentId);
    }

    function transferAgentOwnership(uint256 agentId, address newOwner) external onlyAgentOwner(agentId) {
        require(newOwner != address(0), "Invalid owner");
        address previousOwner = agents[agentId].owner;
        agents[agentId].owner = newOwner;
        ownershipNonce[agentId] += 1;
        emit AgentOwnershipTransferred(agentId, previousOwner, newOwner);
    }

    modifier onlyAgentOwner(uint256 agentId) {
        require(agents[agentId].owner == msg.sender, "Not agent owner");
        require(agents[agentId].active, "Agent inactive");
        _;
    }
}

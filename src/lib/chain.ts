import { Contract, JsonRpcProvider, type Provider, type Signer } from "ethers";

export const botNetwork = {
  chainId: Number(process.env.NEXT_PUBLIC_BOT_CHAIN_ID || "968"),
  chainName: process.env.NEXT_PUBLIC_BOT_CHAIN_NAME || "BOT Chain Testnet",
  rpcUrl: process.env.NEXT_PUBLIC_BOT_RPC_URL || "https://rpc.bohr.life",
  explorerUrl: process.env.NEXT_PUBLIC_BOT_EXPLORER_URL || "https://scan.bohr.life",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
};

export const contractAddresses = {
  registry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || "",
  reputation: process.env.NEXT_PUBLIC_AGENT_REPUTATION_ADDRESS || "",
  permissions: process.env.NEXT_PUBLIC_AGENT_PERMISSIONS_ADDRESS || "",
  spending: process.env.NEXT_PUBLIC_AGENT_SPENDING_ADDRESS || "",
};

export const contractAbis: Record<string, string[]> = {
  registry: [
    "function agentCount() view returns (uint256)",
    "function getAgent(uint256) view returns (tuple(uint256 id,string name,string description,string category,string capabilities,string metadataURI,address owner,uint64 registeredAt,bool active))",
    "function registerAgent(string,string,string,string,string) returns (uint256)",
    "event AgentRegistered(uint256 indexed agentId,address indexed owner,string name)",
  ],
  reputation: [
    "function completedTasks(uint256) view returns (uint256)",
    "function successfulTasks(uint256) view returns (uint256)",
    "function successRateBps(uint256) view returns (uint256)",
    "function recordTask(uint256,bytes32,bool,string)",
  ],
  permissions: [
    "function agentWallet(uint256) view returns (address)",
    "function permissionExpiry(uint256,address,bytes4) view returns (uint64)",
    "function setAgentWallet(uint256,address)",
    "function grantPermission(uint256,address,bytes4,uint64)",
    "function revokePermission(uint256,address,bytes4)",
  ],
  spending: [
    "function setLimits(uint256,address,uint256,uint256,uint256)",
    "function revokeLimits(uint256,address)",
    "function limits(uint256,address) view returns (uint256 perTransaction,uint256 daily,uint256 total,uint256 spentToday,uint256 spentTotal,uint64 dayIndex,bool enabled)",
  ],
  token: [
    "function decimals() view returns (uint8)",
    "function approve(address,uint256) returns (bool)",
  ],
};

export function getReadProvider(): JsonRpcProvider {
  return new JsonRpcProvider(botNetwork.rpcUrl, botNetwork.chainId);
}

export function getContract(name: keyof typeof contractAddresses, runner: Provider | Signer): Contract {
  const address = contractAddresses[name];
  if (!address) throw new Error(`${name} contract address is not configured.`);
  return new Contract(address, contractAbis[name], runner);
}

export type Agent = {
  id: bigint;
  name: string;
  description: string;
  category: string;
  capabilities: string;
  metadataURI: string;
  owner: string;
  registeredAt: bigint;
  active: boolean;
};

export async function fetchAgent(provider: Provider, id: bigint | number): Promise<Agent> {
  const registry = getContract("registry", provider);
  const result = await registry.getFunction("getAgent")(id);
  return {
    id: BigInt(result.id),
    name: result.name,
    description: result.description,
    category: result.category,
    capabilities: result.capabilities,
    metadataURI: result.metadataURI,
    owner: result.owner,
    registeredAt: BigInt(result.registeredAt),
    active: result.active,
  };
}

export async function fetchAgents(provider: Provider): Promise<Agent[]> {
  const registry = getContract("registry", provider);
  const count = Number(await registry.getFunction("agentCount")());
  const agents: Agent[] = [];
  for (let id = count; id > 0; id -= 1) {
    agents.push(await fetchAgent(provider, id));
  }
  return agents;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDate(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleDateString();
}

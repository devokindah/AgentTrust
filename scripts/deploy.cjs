/* eslint @typescript-eslint/no-require-imports: "off" */
const hre = require("hardhat");

async function deployAndVerify(name, factory, args) {
  const contract = await factory.deploy(...args);
  const transaction = contract.deploymentTransaction();
  if (!transaction) throw new Error(`${name} deployment transaction is unavailable.`);
  const receipt = await transaction.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${name} deployment transaction failed.`);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const code = await hre.ethers.provider.getCode(address);
  if (code === "0x") throw new Error(`${name} has no deployed bytecode at ${address}.`);

  return {
    contract,
    deployment: { address, transactionHash: receipt.hash, blockNumber: receipt.blockNumber },
  };
}

async function main() {
  const actualNetwork = await hre.ethers.provider.getNetwork();
  const expectedChainId = hre.network.config.chainId;
  if (expectedChainId && actualNetwork.chainId !== BigInt(expectedChainId)) {
    throw new Error(`Connected RPC chain ID ${actualNetwork.chainId} does not match configured chain ID ${expectedChainId}.`);
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("Set DEPLOYER_PRIVATE_KEY in the environment before deploying.");

  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registryResult = await deployAndVerify("AgentRegistry", AgentRegistry, [deployer.address]);
  const registry = registryResult.contract;

  const AgentReputation = await hre.ethers.getContractFactory("AgentReputation");
  const reputationResult = await deployAndVerify(
    "AgentReputation",
    AgentReputation,
    [await registry.getAddress(), deployer.address],
  );
  const reputation = reputationResult.contract;

  const AgentPermissions = await hre.ethers.getContractFactory("AgentPermissions");
  const permissionsResult = await deployAndVerify(
    "AgentPermissions",
    AgentPermissions,
    [await registry.getAddress(), deployer.address],
  );
  const permissions = permissionsResult.contract;

  const AgentSpending = await hre.ethers.getContractFactory("AgentSpending");
  const spendingResult = await deployAndVerify(
    "AgentSpending",
    AgentSpending,
    [await registry.getAddress(), await permissions.getAddress(), deployer.address],
  );
  const spending = spendingResult.contract;

  const [registryOwner, reputationRegistry, permissionsRegistry, spendingRegistry, spendingPermissions] =
    await Promise.all([
      registry.owner(),
      reputation.registry(),
      permissions.registry(),
      spending.registry(),
      spending.permissions(),
    ]);
  if (
    registryOwner.toLowerCase() !== deployer.address.toLowerCase()
    || reputationRegistry.toLowerCase() !== await registry.getAddress().then((address) => address.toLowerCase())
    || permissionsRegistry.toLowerCase() !== await registry.getAddress().then((address) => address.toLowerCase())
    || spendingRegistry.toLowerCase() !== await registry.getAddress().then((address) => address.toLowerCase())
    || spendingPermissions.toLowerCase() !== await permissions.getAddress().then((address) => address.toLowerCase())
  ) {
    throw new Error("Deployed contract constructor state does not match the expected addresses.");
  }

  console.log(JSON.stringify({
    network: hre.network.name,
    chainId: actualNetwork.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      AgentRegistry: registryResult.deployment,
      AgentReputation: reputationResult.deployment,
      AgentPermissions: permissionsResult.deployment,
      AgentSpending: spendingResult.deployment,
    },
  }, null, 2));
  console.log("Set an evaluator with AgentReputation.setEvaluator before recording task results.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

/* eslint @typescript-eslint/no-require-imports: "off" */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("Set DEPLOYER_PRIVATE_KEY in the environment before deploying.");

  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy(deployer.address);
  await registry.waitForDeployment();

  const AgentReputation = await hre.ethers.getContractFactory("AgentReputation");
  const reputation = await AgentReputation.deploy(await registry.getAddress(), deployer.address);
  await reputation.waitForDeployment();

  const AgentPermissions = await hre.ethers.getContractFactory("AgentPermissions");
  const permissions = await AgentPermissions.deploy(await registry.getAddress(), deployer.address);
  await permissions.waitForDeployment();

  const AgentSpending = await hre.ethers.getContractFactory("AgentSpending");
  const spending = await AgentSpending.deploy(
    await registry.getAddress(),
    await permissions.getAddress(),
    deployer.address,
  );
  await spending.waitForDeployment();

  console.log(JSON.stringify({
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      registry: await registry.getAddress(),
      reputation: await reputation.getAddress(),
      permissions: await permissions.getAddress(),
      spending: await spending.getAddress(),
    },
  }, null, 2));
  console.log("Set an evaluator with AgentReputation.setEvaluator before recording task results.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

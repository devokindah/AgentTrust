// Kept outside a "test" folder so the parent project does not auto-discover Hardhat tests.
/* eslint @typescript-eslint/no-require-imports: "off" */
const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AgentTrust contracts", function () {
  let owner;
  let agentOwner;
  let evaluator;
  let agentWallet;
  let stranger;
  let registry;
  let reputation;
  let permissions;
  let spending;
  let agentId;

  beforeEach(async function () {
    [owner, agentOwner, evaluator, agentWallet, stranger] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("AgentRegistry");
    registry = await Registry.deploy(owner.address);
    const Reputation = await ethers.getContractFactory("AgentReputation");
    reputation = await Reputation.deploy(await registry.getAddress(), owner.address);
    const Permissions = await ethers.getContractFactory("AgentPermissions");
    permissions = await Permissions.deploy(await registry.getAddress(), owner.address);
    const Spending = await ethers.getContractFactory("AgentSpending");
    spending = await Spending.deploy(await registry.getAddress(), await permissions.getAddress(), owner.address);
    await registry.connect(agentOwner).registerAgent("Test agent", "A test identity", "Research", "search", "");
    agentId = 1n;
  });

  it("restricts registry updates to the current owner", async function () {
    await expect(registry.connect(stranger).updateAgent(agentId, "changed", "Research", "", ""))
      .to.be.revertedWith("Not agent owner");
    await registry.connect(agentOwner).transferAgentOwnership(agentId, stranger.address);
    await expect(registry.connect(agentOwner).deactivateAgent(agentId)).to.be.revertedWith("Not agent owner");
    await expect(registry.connect(stranger).updateAgent(agentId, "changed", "Research", "", ""))
      .not.to.be.reverted;
  });

  it("rejects unknown agents and invalid registry data", async function () {
    await expect(registry.getAgent(99)).to.be.revertedWith("Agent not found");
    await expect(registry.connect(agentOwner).registerAgent("", "", "Research", "", ""))
      .to.be.revertedWith("Invalid name");
  });

  it("only lets authorized non-owner evaluators record unique task outcomes", async function () {
    await expect(reputation.connect(stranger).recordTask(agentId, ethers.id("task-1"), true, ""))
      .to.be.revertedWith("Not evaluator");
    await reputation.setEvaluator(agentOwner.address, true);
    await expect(reputation.connect(agentOwner).recordTask(agentId, ethers.id("task-owner"), true, ""))
      .to.be.revertedWith("Owner cannot rate own agent");
    await reputation.setEvaluator(evaluator.address, true);
    const taskId = ethers.id("task-1");
    await reputation.connect(evaluator).recordTask(agentId, taskId, true, "ipfs://result");
    await expect(reputation.connect(evaluator).recordTask(agentId, taskId, false, ""))
      .to.be.revertedWith("Task already recorded");
    expect(await reputation.completedTasks(agentId)).to.equal(1n);
    expect(await reputation.successRateBps(agentId)).to.equal(10_000n);
  });

  it("enforces call permissions, wallet identity, expiry, and revocation", async function () {
    const Target = await ethers.getContractFactory("PermissionTarget");
    const target = await Target.deploy();
    const selector = target.interface.getFunction("setValue").selector;
    const expiry = (await ethers.provider.getBlock("latest")).timestamp + 60;
    await permissions.connect(agentOwner).setAgentWallet(agentId, agentWallet.address);
    await permissions.connect(agentOwner).grantPermission(agentId, await target.getAddress(), selector, expiry);
    const callData = target.interface.encodeFunctionData("setValue", [42]);
    await expect(permissions.connect(stranger).execute(agentId, await target.getAddress(), callData))
      .to.be.revertedWith("Not agent wallet");
    await permissions.connect(agentWallet).execute(agentId, await target.getAddress(), callData);
    expect(await target.value()).to.equal(42n);
    await permissions.connect(agentOwner).revokePermission(agentId, await target.getAddress(), selector);
    await expect(permissions.connect(agentWallet).execute(agentId, await target.getAddress(), callData))
      .to.be.revertedWith("Permission denied or expired");
    await permissions.connect(agentOwner).grantPermission(
      agentId, await target.getAddress(), selector, (await ethers.provider.getBlock("latest")).timestamp + 5,
    );
    await network.provider.send("evm_increaseTime", [6]);
    await network.provider.send("evm_mine");
    await expect(permissions.connect(agentWallet).execute(agentId, await target.getAddress(), callData))
      .to.be.revertedWith("Permission denied or expired");
  });

  it("invalidates execution wallets and permissions after ownership transfer", async function () {
    const Target = await ethers.getContractFactory("PermissionTarget");
    const target = await Target.deploy();
    const selector = target.interface.getFunction("setValue").selector;
    const expiry = (await ethers.provider.getBlock("latest")).timestamp + 60;
    await permissions.connect(agentOwner).setAgentWallet(agentId, agentWallet.address);
    await permissions.connect(agentOwner).grantPermission(agentId, await target.getAddress(), selector, expiry);
    expect(await permissions.isPermissionActive(agentId, await target.getAddress(), selector)).to.equal(true);

    await registry.connect(agentOwner).transferAgentOwnership(agentId, stranger.address);
    expect(await registry.ownershipNonce(agentId)).to.equal(1n);
    expect(await permissions.agentWalletOwnerNonce(agentId)).to.equal(0n);
    expect(await permissions.isPermissionActive(agentId, await target.getAddress(), selector)).to.equal(false);
    const callData = target.interface.encodeFunctionData("setValue", [42]);
    await expect(permissions.connect(agentWallet).execute(agentId, await target.getAddress(), callData))
      .to.be.revertedWith("Permission denied or expired");

    await registry.connect(stranger).transferAgentOwnership(agentId, agentOwner.address);
    expect(await registry.ownershipNonce(agentId)).to.equal(2n);
    expect(await permissions.isPermissionActive(agentId, await target.getAddress(), selector)).to.equal(false);
    await permissions.connect(agentOwner).setAgentWallet(agentId, agentWallet.address);
    await permissions.connect(agentOwner).grantPermission(agentId, await target.getAddress(), selector, expiry);
    await permissions.connect(agentWallet).execute(agentId, await target.getAddress(), callData);
    expect(await target.value()).to.equal(42n);
  });

  it("enforces spending caps, evaluator wallet, exact allowance, and replay protection", async function () {
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy();
    const spendContract = await spending.getAddress();
    await permissions.connect(agentOwner).setAgentWallet(agentId, agentWallet.address);
    await spending.connect(agentOwner).setLimits(agentId, await token.getAddress(), 50, 100, 130);
    await token.mint(agentOwner.address, 130);
    await token.connect(agentOwner).approve(spendContract, 130);

    await expect(spending.connect(stranger).spend(agentId, await token.getAddress(), stranger.address, 10, ethers.id("unauthorized")))
      .to.be.revertedWith("Not agent wallet");
    await expect(spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 51, ethers.id("too-much")))
      .to.be.revertedWith("Transaction limit exceeded");
    const firstRequest = ethers.id("request-1");
    await spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 40, firstRequest);
    await expect(spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 40, firstRequest))
      .to.be.revertedWith("Request already used");
    await spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 40, ethers.id("request-2"));
    await expect(spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 30, ethers.id("daily")))
      .to.be.revertedWith("Daily limit exceeded");

    await network.provider.send("evm_increaseTime", [24 * 60 * 60]);
    await network.provider.send("evm_mine");
    await spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 30, ethers.id("request-3"));
    await spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 20, ethers.id("request-4"));
    await expect(spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 1, ethers.id("total")))
      .to.be.revertedWith("Total limit exceeded");
    expect(await token.balanceOf(stranger.address)).to.equal(130n);
    await spending.connect(agentOwner).revokeLimits(agentId, await token.getAddress());
    await expect(spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 1, ethers.id("revoked")))
      .to.be.revertedWith("Spending disabled");
  });

  it("blocks stale spending authority after ownership transfer until the new owner reconfigures it", async function () {
    const Token = await ethers.getContractFactory("MockToken");
    const token = await Token.deploy();
    await permissions.connect(agentOwner).setAgentWallet(agentId, agentWallet.address);
    await spending.connect(agentOwner).setLimits(agentId, await token.getAddress(), 50, 100, 130);
    await token.mint(stranger.address, 100);
    await token.connect(stranger).approve(await spending.getAddress(), 100);
    await registry.connect(agentOwner).transferAgentOwnership(agentId, stranger.address);

    await expect(spending.connect(agentWallet).spend(agentId, await token.getAddress(), stranger.address, 10, ethers.id("stale")))
      .to.be.revertedWith("Agent wallet owner changed");

    await permissions.connect(stranger).setAgentWallet(agentId, stranger.address);
    await expect(spending.connect(stranger).spend(agentId, await token.getAddress(), stranger.address, 10, ethers.id("stale-limits")))
      .to.be.revertedWith("Spending authorization outdated");

    await spending.connect(stranger).setLimits(agentId, await token.getAddress(), 50, 100, 130);
    await spending.connect(stranger).spend(agentId, await token.getAddress(), stranger.address, 10, ethers.id("new-owner"));
    expect(await token.balanceOf(stranger.address)).to.equal(100n);
  });
});

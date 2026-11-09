/* eslint @typescript-eslint/no-require-imports: "off" */
require("dotenv").config({ path: ".env.local" });
require("@nomicfoundation/hardhat-toolbox");

const accounts = process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [];

module.exports = {
  solidity: "0.8.24",
  paths: {
    sources: "./contracts",
    tests: "./contract-tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    botTestnet: {
      url: process.env.BOT_CHAIN_TESTNET_RPC_URL || "https://rpc.bohr.life",
      chainId: 968,
      accounts,
    },
    botMainnet: {
      url: process.env.BOT_CHAIN_MAINNET_RPC_URL || "https://rpc.botchain.ai",
      chainId: 677,
      accounts,
    },
  },
};

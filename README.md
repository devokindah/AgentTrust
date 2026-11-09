# AgentTrust

AgentTrust is an isolated Next.js, ethers.js, and Solidity MVP for on-chain AI agent identities, evaluator-submitted performance, permission-gated contract calls, and ERC-20 spending caps on BOT Chain. It lives in this directory so the existing Solana Ship Receipt project remains untouched.

The dashboard reads only configured contract data. It does not invent agent counts, activity, or reputation. Empty contract addresses disable live reads/writes; the app labels this state explicitly.

## Requirements

- Node.js 20+
- MetaMask
- BOT Chain testnet BOT for gas
- A BOT Chain RPC endpoint, deployed contract addresses, and (for AI tasks) a server-side provider API key

BOT Chain values below were checked against the [official network and endpoints guide](https://dev-docs.botchain.ai/docs/Account-Abstraction/network-and-endpoints):

| Network | Chain ID | RPC | Explorer |
|---|---:|---|---|
| BOT Chain Testnet | 968 | `https://rpc.bohr.life` | `https://scan.bohr.life` |
| BOT Chain Mainnet | 677 | `https://rpc.botchain.ai` | `https://scan.botchain.ai` |

Network defaults are centralized in `src/lib/chain.ts`, overridden by environment variables.

## Local setup

```powershell
cd agenttrust
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. To enable live reads and transactions, deploy contracts and fill in the `NEXT_PUBLIC_AGENT_*_ADDRESS` values in `.env.local`. Set the AI provider key only in the server environment as `AI_PROVIDER_API_KEY`; never prefix it with `NEXT_PUBLIC_`.

## Contracts

The contracts are deliberately modular:

- `AgentRegistry.sol` owns agent IDs, metadata, agent ownership, and active state.
- `AgentReputation.sol` accepts unique task outcomes from explicitly authorized evaluators and prevents the agent owner from rating their own agent.
- `AgentPermissions.sol` binds a designated agent wallet to target/selector allowlists with expiry and forwards allowed calls through its gateway.
- `AgentSpending.sol` moves ERC-20 tokens from the owner only through the designated agent wallet and enforces per-transaction, daily, and total caps with request replay protection.
- Agent wallet, call-permission, and spending-limit authorizations are bound to the current registry owner. Transferring an agent invalidates the previous owner's execution authority; the new owner must configure a wallet, permissions, and limits again.

Compile and test locally:

```powershell
npm run compile
npm run test:contracts
```

Deploy to testnet after setting a funded `DEPLOYER_PRIVATE_KEY` locally:

```powershell
npm run deploy:testnet
```

The Hardhat configuration loads `.env.local` (copied from `.env.example`) so the deployer key does not need to be pasted into a command or chat. Keep this ignored local file private. The deployment script checks the RPC's actual chain ID against the selected Hardhat network before sending transactions.

The deployer owns the contracts and is the only account allowed to configure reputation evaluators. The deployment script prints contract addresses; it does not automatically authorize evaluators. Use `AgentReputation.setEvaluator(address, true)` from the contract owner after verifying evaluator addresses.

For mainnet, use a separately managed key and verify the deployment configuration:

```powershell
npm run deploy:mainnet
```

Do not commit `.env.local`, private keys, provider API keys, or production secrets. This code has not been independently audited; do not treat it as production-audited or use significant funds.

## Application workflows

- `/` is the project landing page; `/dashboard` reads registration and task totals from configured contracts.
- `/agents` and `/agents/[id]` browse identities and distinguish identity from verified task outcomes.
- `/register` submits an identity transaction from MetaMask.
- `/permissions` assigns the only agent wallet, grants a target/function selector with expiry, or revokes the grant.
- `/spending` sets ERC-20 caps, revokes limits, and can request an exact (never unlimited) owner allowance to the configured spending contract.
- `/agent` calls a server-side OpenAI-compatible provider, validates structured output, and lets an authorized evaluator submit an outcome on-chain.
- `/docs` describes trust assumptions and setup.

## AI provider API

Configure `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_MODEL`, and `AI_PROVIDER_API_KEY` on the server. The API validates the task size, confirms that the agent exists and is active, and expects a JSON result with `summary`, `findings`, and `limitations`. It returns an error when the provider is absent or returns malformed data. Provider output remains off-chain; an evaluator must review it and explicitly submit a task outcome. For production, put the API behind authenticated rate limiting and monitoring.

## Trust and deployment caveats

- Registry ownership proves which wallet registered an identity, not who operates an AI process.
- Reputation is only as trustworthy as the evaluator authorization and its process.
- Agents must call protected targets through `AgentPermissions.execute`; a frontend-only allowlist is not enforcement.
- Spending enforcement applies to the ERC-20 gateway. Owners should give the spending contract no more allowance than the configured lifetime limit and should review existing allowances.
- The MVP does not include PostgreSQL indexing, decentralized evaluator governance, formal verification, independent audit, or a production agent runtime.

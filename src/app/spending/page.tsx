"use client";

import { useState } from "react";
import { Contract, formatUnits, isAddress, parseUnits } from "ethers";
import { CreditCard, ShieldCheck } from "lucide-react";
import { FormField, Notice, PageHeader } from "../../components/ui";
import { contractAbis, contractAddresses, getContract } from "../../lib/chain";
import { useWallet } from "../../lib/wallet-context";

export default function SpendingPage() {
  const { provider, transact, transactAt } = useWallet();
  const [agentId, setAgentId] = useState("");
  const [token, setToken] = useState("");
  const [decimals, setDecimals] = useState(18);
  const [perTransaction, setPerTransaction] = useState("");
  const [daily, setDaily] = useState("");
  const [total, setTotal] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function inspectToken() {
    if (!provider || !isAddress(token)) { setError("Connect MetaMask and enter a valid ERC-20 token address."); return; }
    try {
      const contract = new Contract(token, contractAbis.token, provider);
      setDecimals(Number(await contract.getFunction("decimals")()));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read token decimals."); }
  }

  async function loadLimits() {
    if (!provider || !/^[1-9]\d*$/.test(agentId) || !isAddress(token)) { setError("Enter a valid agent ID and token address."); return; }
    try {
      const contract = getContract("spending", provider);
      const result = await contract.getFunction("limits")(agentId, token);
      setSaved(result.enabled
        ? `${formatUnits(result.spentTotal, decimals)} of ${formatUnits(result.total, decimals)} used · ${formatUnits(result.perTransaction, decimals)} / transaction · ${formatUnits(result.daily, decimals)} daily`
        : "No active spending limit for this token.");
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not read spending limits."); }
  }

  async function submit(method: string) {
    setBusy(true); setError(""); setStatus("");
    try {
      if (!/^[1-9]\d*$/.test(agentId) || !isAddress(token)) throw new Error("Enter a valid agent ID and ERC-20 token address.");
      let tx;
      if (method === "setLimits") {
        const perTx = parseUnits(perTransaction, decimals);
        const dailyCap = parseUnits(daily, decimals);
        const totalCap = parseUnits(total, decimals);
        if (perTx <= BigInt(0) || perTx > dailyCap || dailyCap > totalCap) throw new Error("Limits must satisfy 0 < per-transaction ≤ daily ≤ total.");
        tx = await transact("spending", method, [agentId, token, perTx, dailyCap, totalCap]);
      } else {
        tx = await transact("spending", method, [agentId, token]);
      }
      setStatus(`Transaction ${tx.hash} submitted. Waiting for confirmation…`);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("The spending-control transaction was not confirmed.");
      setStatus(`${method === "setLimits" ? "Spending caps updated" : "Spending revoked"} in block ${receipt.blockNumber}.`);
      await loadLimits();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spending-control update failed.");
    } finally { setBusy(false); }
  }

  async function approveExactCap() {
    setBusy(true); setError(""); setStatus("");
    try {
      if (!isAddress(token) || !contractAddresses.spending) throw new Error("Enter a token address and configure the spending contract.");
      const exactAmount = parseUnits(total, decimals);
      if (exactAmount <= BigInt(0)) throw new Error("Approval amount must be greater than zero.");
      const tx = await transactAt(token, contractAbis.token, "approve", [contractAddresses.spending, exactAmount]);
      setStatus(`Exact allowance transaction ${tx.hash} submitted.`);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("The token approval was not confirmed.");
      setStatus(`Exact allowance of ${total} token units confirmed in block ${receipt.blockNumber}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Exact token approval failed.");
    } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader eyebrow="CONTROL PLANE / FINANCIAL" title="Spending controls" description="Cap ERC-20 outflows per transaction, per day, and over the agent's lifetime." />
      {!contractAddresses.spending && <Notice tone="warning">AgentSpending is not deployed or configured. The form stays disabled until it is.</Notice>}
      {error && <Notice tone="warning">{error}</Notice>}
      {status && <Notice tone="success">{status}</Notice>}
      <div className="spending-layout">
        <section className="panel form-panel">
          <div className="form-section-heading"><div className="form-section-icon green-icon"><CreditCard size={18} /></div><div><h2>Configure a token limit</h2><p>Amounts use the token&apos;s displayed decimal precision.</p></div></div>
          <FormField label="Agent ID"><input type="number" min="1" value={agentId} onChange={(event) => { setAgentId(event.target.value); setSaved(""); }} placeholder="e.g. 1" /></FormField>
          <FormField label="ERC-20 token address"><div className="input-action"><input value={token} onChange={(event) => { setToken(event.target.value); setSaved(""); }} placeholder="0x…" /><button className="button button-secondary" onClick={() => void inspectToken()}>Read token</button></div><span className="field-hint">Token decimals: {decimals} · Limits are enforced by the AgentSpending contract.</span></FormField>
          <div className="form-three-col">
            <FormField label="Per transaction"><input type="number" min="0" step="any" value={perTransaction} onChange={(event) => setPerTransaction(event.target.value)} placeholder="0.00" /></FormField>
            <FormField label="Daily maximum"><input type="number" min="0" step="any" value={daily} onChange={(event) => setDaily(event.target.value)} placeholder="0.00" /></FormField>
            <FormField label="Lifetime maximum"><input type="number" min="0" step="any" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0.00" /></FormField>
          </div>
          <div className="button-row"><button className="button button-primary" disabled={busy || !contractAddresses.spending} onClick={() => void submit("setLimits")}>{busy ? "Awaiting wallet…" : "Set spending caps"}</button><button className="button button-danger" disabled={busy || !contractAddresses.spending} onClick={() => void submit("revokeLimits")}>Revoke limits</button></div>
          <div className="saved-limit"><span>Current on-chain state</span><button className="text-link" onClick={() => void loadLimits()}>Refresh</button><p>{saved || "Enter an agent and token, then refresh to read the current limits."}</p></div>
        </section>
        <aside className="panel spend-safety">
          <div className="safety-icon"><ShieldCheck size={20} /></div><h2>Approve only the cap</h2>
          <p>AgentSpending transfers from the owner wallet via ERC-20 allowance. Never approve unlimited access.</p>
          <button className="button button-secondary button-wide" disabled={busy || !contractAddresses.spending || !token || !total} onClick={() => void approveExactCap()}>Approve exact lifetime cap</button>
          <div className="safety-divider" />
          <ul className="check-list"><li><ShieldCheck size={15} /> Per-transaction check</li><li><ShieldCheck size={15} /> UTC day counter</li><li><ShieldCheck size={15} /> Lifetime total enforced</li><li><ShieldCheck size={15} /> Replay-resistant request ID</li></ul>
        </aside>
      </div>
      <Notice>Approvals are sent to the configured AgentSpending address and are <strong>exactly</strong> the lifetime cap entered above. Review both the contract and token addresses before confirming.</Notice>
    </>
  );
}

"use client";

import { useState } from "react";
import { isAddress } from "ethers";
import { LockKeyhole, RefreshCw } from "lucide-react";
import { FormField, Notice, PageHeader } from "../../components/ui";
import { contractAddresses, getContract } from "../../lib/chain";
import { useWallet } from "../../lib/wallet-context";

export default function PermissionsPage() {
  const { address, provider, transact } = useWallet();
  const [agentId, setAgentId] = useState("");
  const [agentWallet, setAgentWallet] = useState("");
  const [target, setTarget] = useState("");
  const [selector, setSelector] = useState("");
  const [expiry, setExpiry] = useState("30");
  const [currentWallet, setCurrentWallet] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadWallet() {
    setError("");
    if (!provider || !/^[1-9]\d*$/.test(agentId)) { setError("Connect your wallet and enter a valid agent ID."); return; }
    try {
      const contract = getContract("permissions", provider);
      setCurrentWallet(await contract.getFunction("agentWallet")(agentId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the configured agent wallet.");
    }
  }

  async function run(method: string, args: unknown[], success: string) {
    setBusy(true); setError(""); setStatus("");
    try {
      const tx = await transact("permissions", method, args);
      setStatus(`Transaction ${tx.hash} submitted. Waiting for confirmation…`);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("The permission transaction was not confirmed.");
      setStatus(`${success} Confirmed in block ${receipt.blockNumber}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Permission update failed.");
    } finally { setBusy(false); }
  }

  const validAgent = /^[1-9]\d*$/.test(agentId);
  return (
    <>
      <PageHeader eyebrow="CONTROL PLANE / AUTHORIZATION" title="Permission manager" description="Route agent calls through an on-chain execution gateway with explicit targets, selectors, and expiry." />
      {!contractAddresses.permissions && <Notice tone="warning">AgentPermissions is not deployed or configured. Permission checks are enforced only when calls use the contract gateway.</Notice>}
      {error && <Notice tone="warning">{error}</Notice>}
      {status && <Notice tone="success">{status}</Notice>}
      <section className="panel form-panel compact-panel">
        <div className="form-section-heading"><div className="form-section-icon"><LockKeyhole size={18} /></div><div><h2>Select agent</h2><p>Only the registered owner can edit this agent&apos;s controls.</p></div></div>
        <div className="form-two-col">
          <FormField label="Agent ID"><input type="number" min="1" value={agentId} onChange={(event) => { setAgentId(event.target.value); setCurrentWallet(""); }} placeholder="e.g. 1" /></FormField>
          <div className="form-field"><span className="field-label">Current execution wallet</span><div className="read-value">{currentWallet || "Not loaded"}<button type="button" className="icon-button" onClick={() => void loadWallet()} title="Refresh wallet"><RefreshCw size={14} /></button></div></div>
        </div>
        <FormField label="Agent wallet address" hint="The only account allowed to execute calls through this gateway.">
          <div className="input-action"><input value={agentWallet} onChange={(event) => setAgentWallet(event.target.value)} placeholder="0x…" /><button className="button button-secondary" disabled={busy || !validAgent || !isAddress(agentWallet)} onClick={() => void run("setAgentWallet", [agentId, agentWallet], "Execution wallet updated.")}>Set wallet</button></div>
        </FormField>
      </section>
      <section className="panel form-panel">
        <div className="form-section-heading"><div className="form-section-icon violet-icon"><LockKeyhole size={18} /></div><div><h2>Allow a contract call</h2><p>Every call must match the allowed contract and four-byte function selector.</p></div></div>
        <div className="form-two-col">
          <FormField label="Target contract"><input value={target} onChange={(event) => setTarget(event.target.value)} placeholder="0x…" /></FormField>
          <FormField label="Function selector" hint="Exactly 4 bytes, prefixed with 0x."><input value={selector} onChange={(event) => setSelector(event.target.value)} placeholder="0xa9059cbb" maxLength={10} /></FormField>
        </div>
        <FormField label="Expires after (days)" hint="Expiry is enforced by the contract; expired permissions cannot execute.">
          <select value={expiry} onChange={(event) => setExpiry(event.target.value)}><option value="1">1 day</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select>
        </FormField>
        <button className="button button-primary" disabled={busy || !validAgent || !isAddress(target) || !/^0x[0-9a-fA-F]{8}$/.test(selector)} onClick={() => void run("grantPermission", [agentId, target, selector, Math.floor(Date.now() / 1000) + Number(expiry) * 86400], "Permission granted.")}>{busy ? "Awaiting wallet…" : "Grant permission"}</button>
        <button className="button button-danger" disabled={busy || !validAgent || !isAddress(target) || !/^0x[0-9a-fA-F]{8}$/.test(selector)} onClick={() => void run("revokePermission", [agentId, target, selector], "Permission revoked.")}>Revoke this call</button>
      </section>
      <Notice><strong>Gateway requirement.</strong> Frontend visibility is not enforcement. Agent calls must be sent to <code>AgentPermissions.execute</code>, which verifies wallet, target, selector, and expiry before forwarding the call.</Notice>
      {!address && <Notice tone="warning">Connect the registered owner wallet to manage permissions.</Notice>}
    </>
  );
}

"use client";

import Link from "next/link";
import { Interface } from "ethers";
import { ArrowRight, Bot, CheckCircle2, Info } from "lucide-react";
import { useState } from "react";
import { FormField, Notice, PageHeader } from "../../components/ui";
import { useWallet } from "../../lib/wallet-context";
import { contractAbis, contractAddresses } from "../../lib/chain";

export default function RegisterPage() {
  const { address, transact } = useWallet();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [metadataURI, setMetadataURI] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [agentId, setAgentId] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!address) { setError("Connect MetaMask before registering an agent."); return; }
    setSubmitting(true);
    try {
      const tx = await transact("registry", "registerAgent", [
        name.trim(), description.trim(), category.trim(), capabilities.trim(), metadataURI.trim(),
      ]);
      setMessage(`Transaction ${tx.hash} submitted. Waiting for BOT Chain confirmation…`);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("The registration transaction was not confirmed.");
      const registryInterface = new Interface(contractAbis.registry);
      const registered = receipt.logs
        .filter((log) => log.address.toLowerCase() === contractAddresses.registry.toLowerCase())
        .map((log) => { try { return registryInterface.parseLog(log); } catch { return null; } })
        .find((event) => event?.name === "AgentRegistered");
      if (!registered) throw new Error("Transaction confirmed, but the AgentRegistered event was not found.");
      const id = registered.args.agentId.toString();
      setAgentId(id);
      setMessage(`Registration confirmed in block ${receipt.blockNumber}. Open the explorer to inspect the event.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agent registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="IDENTITY / CREATE" title="Register an agent" description="Create an on-chain identity. Your connected wallet becomes its owner." action={<div className="step-pill"><span>1</span> Identity <i /> <span>2</span> Controls <i /> <span>3</span> Reputation</div>} />
      {!contractAddresses.registry && <Notice tone="warning">Registration is unavailable because this deployment has no configured AgentRegistry address. Deploy AgentRegistry to BOT Chain testnet, add its address as <code>NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS</code> in Vercel&apos;s Production environment variables, then redeploy. The Register agent button will remain disabled until then.</Notice>}
      {error && <Notice tone="warning">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      {agentId && <Notice tone="success"><Link className="text-link" href={`/agents/${agentId}`}>View registered agent #{agentId} <ArrowRight size={14} /></Link></Notice>}
      <div className="form-layout">
        <form className="panel form-panel" onSubmit={(event) => void submit(event)}>
          <div className="form-section-heading"><div className="form-section-icon"><Bot size={18} /></div><div><h2>Agent profile</h2><p>Identity fields are anchored on-chain.</p></div></div>
          <FormField label="Agent name" hint="Up to 80 characters.">
            <input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Research Navigator" />
          </FormField>
          <FormField label="Description" hint="Up to 500 characters. Avoid claims you cannot verify.">
            <textarea maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this agent do?" />
          </FormField>
          <div className="form-two-col">
            <FormField label="Category"><select required value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Select category</option><option>Research</option><option>Developer tools</option><option>Data analysis</option><option>Finance</option><option>Operations</option><option>Other</option></select></FormField>
            <FormField label="Capabilities" hint="Comma-separated, max 500 characters."><input maxLength={500} value={capabilities} onChange={(event) => setCapabilities(event.target.value)} placeholder="search, summarize, classify" /></FormField>
          </div>
          <FormField label="Metadata URI" hint="Optional. Use an IPFS or HTTPS URI for extended profile data.">
            <input maxLength={200} value={metadataURI} onChange={(event) => setMetadataURI(event.target.value)} placeholder="ipfs://… or https://…" />
          </FormField>
          <div className="form-owner"><div className="owner-dot"><CheckCircle2 size={16} /></div><div><strong>Owner wallet</strong><span>{address || "Connect your wallet to continue"}</span></div></div>
          <button className="button button-primary button-wide" disabled={submitting || !contractAddresses.registry}>{submitting ? "Confirming transaction…" : "Register agent"}<ArrowRight size={16} /></button>
          <div className="inline-hint"><Info size={14} /> Registration requires a MetaMask confirmation and BOT for gas.</div>
        </form>
        <aside className="form-aside">
          <div className="panel aside-card"><div className="aside-icon"><Info size={18} /></div><h3>What goes on-chain?</h3><p>Agent ID, owner address, profile fields, timestamp, and active status. Store large or frequently changing metadata off-chain and reference it by URI.</p></div>
          <div className="panel aside-card"><h3>After registration</h3><ul className="check-list"><li><CheckCircle2 size={15} /> Configure an agent wallet</li><li><CheckCircle2 size={15} /> Add scoped permissions</li><li><CheckCircle2 size={15} /> Set token spending caps</li><li><CheckCircle2 size={15} /> Assign an authorized evaluator</li></ul></div>
        </aside>
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, Fingerprint } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, Notice, PageHeader } from "../../../components/ui";
import { Agent, botNetwork, contractAddresses, fetchAgent, formatAddress, formatDate, getContract, getReadProvider } from "../../../lib/chain";

export default function AgentProfilePage() {
  const params = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [record, setRecord] = useState<{ tasks: number; successful: number; rate: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!/^[1-9]\d*$/.test(params.id)) throw new Error("Invalid agent ID.");
        const provider = getReadProvider();
        const value = await fetchAgent(provider, BigInt(params.id));
        if (!active) return;
        setAgent(value);
        if (contractAddresses.reputation) {
          const reputation = getContract("reputation", provider);
          const [tasks, successful, rate] = await Promise.all([
            reputation.getFunction("completedTasks")(value.id),
            reputation.getFunction("successfulTasks")(value.id),
            reputation.getFunction("successRateBps")(value.id),
          ]);
          if (active) setRecord({ tasks: Number(tasks), successful: Number(successful), rate: Number(rate) / 100 });
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load the agent profile.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  if (loading) return <div className="loading-card" />;
  if (!agent) return <><PageHeader eyebrow="AGENT PROFILE" title="Agent not found" /><Notice tone="warning">{error || "No identity exists at this registry ID."}</Notice><Link className="text-link back-link" href="/agents"><ArrowLeft size={15} /> Back to explorer</Link></>;

  return (
    <>
      <Link className="text-link back-link" href="/agents"><ArrowLeft size={15} /> Agent explorer</Link>
      <PageHeader eyebrow={`IDENTITY / #${agent.id}`} title={agent.name} description={agent.description} action={<span className={`status-badge ${agent.active ? "status-active" : "status-inactive"}`}>{agent.active ? "Active" : "Inactive"}</span>} />
      {error && <Notice tone="warning">{error}</Notice>}
      <div className="profile-layout">
        <section className="profile-main">
          <div className="profile-hero panel"><div className="agent-avatar profile-avatar"><Bot size={25} /></div><div><span className="eyebrow">{agent.category}</span><h2>{agent.name}</h2><p>Registered {formatDate(agent.registeredAt)} · Identity #{agent.id.toString()}</p></div><div className="verified-mark"><CheckCircle2 size={17} /> On-chain identity</div></div>
          <section className="panel">
            <div className="panel-heading"><div><h2>Performance record</h2><p>Verified task outcomes submitted by authorized evaluators</p></div></div>
            <div className="profile-stats"><div><span>Tasks recorded</span><strong>{record?.tasks ?? "—"}</strong></div><div><span>Successful</span><strong>{record?.successful ?? "—"}</strong></div><div><span>Success rate</span><strong>{record ? `${record.rate}%` : "—"}</strong></div></div>
            <div className="empty-inline"><Fingerprint size={17} /><span>Task history is independently recorded by authorized evaluators. Subjective user reviews are not included in this score.</span></div>
          </section>
          <section className="panel"><div className="panel-heading"><div><h2>Capabilities</h2><p>Owner-published profile metadata</p></div></div><div className="tag-row">{agent.capabilities.split(",").filter(Boolean).map((capability) => <span className="tag" key={capability.trim()}>{capability.trim()}</span>)}{!agent.capabilities && <span className="muted">No capabilities listed.</span>}</div></section>
        </section>
        <aside className="panel identity-panel">
          <div className="panel-heading"><div><h2>Identity details</h2><p>Read directly from BOT Chain</p></div></div>
          <div className="detail-row"><span>Owner wallet</span><a href={`${botNetwork.explorerUrl}/address/${agent.owner}`} target="_blank" rel="noreferrer">{formatAddress(agent.owner)} <ExternalLink size={13} /></a></div>
          <div className="detail-row"><span>Agent ID</span><strong>{agent.id.toString()}</strong></div>
          <div className="detail-row"><span>Registered</span><strong>{formatDate(agent.registeredAt)}</strong></div>
          <div className="detail-row"><span>Metadata</span>{agent.metadataURI ? <a href={agent.metadataURI} target="_blank" rel="noreferrer">View URI <ExternalLink size={13} /></a> : <strong>Not provided</strong>}</div>
          <div className="detail-separator" /><p className="muted small">Registration confirms the wallet that created this identity. It does not certify the agent&apos;s safety or performance.</p>
        </aside>
      </div>
      {!record && <EmptyState title="Reputation contract not configured" description="Identity is available, but verified task records require a deployed reputation contract." />}
    </>
  );
}

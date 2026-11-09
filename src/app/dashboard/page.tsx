"use client";

import Link from "next/link";
import { Activity, ArrowRight, Bot, Check, ChevronRight, Fingerprint, LockKeyhole, Shield, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader, Notice, EmptyState } from "../../components/ui";
import { contractAddresses, fetchAgents, getReadProvider } from "../../lib/chain";

type Overview = { agents: number; active: number; tasks: number | null; rate: number | null };

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (!contractAddresses.registry) {
          if (active) setLoading(false);
          return;
        }
        const provider = getReadProvider();
        const agents = await fetchAgents(provider);
        let tasks: number | null = null;
        let weightedSuccess = 0;
        if (contractAddresses.reputation) {
          tasks = 0;
          const { getContract } = await import("../../lib/chain");
          const reputation = getContract("reputation", provider);
          for (const agent of agents) {
          const count = BigInt(await reputation.getFunction("completedTasks")(agent.id));
          const success = BigInt(await reputation.getFunction("successfulTasks")(agent.id));
          tasks += Number(count);
          weightedSuccess += Number(success);
          }
        }
        if (active) setOverview({
          agents: agents.length,
          active: agents.filter((agent) => agent.active).length,
          tasks,
          rate: tasks === null ? null : tasks ? Math.round((weightedSuccess / tasks) * 100) : 0,
        });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not read the configured BOT Chain contracts.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const metrics = [
    { label: "Registered agents", value: overview?.agents, icon: Bot, note: "On-chain identities" },
    { label: "Active agents", value: overview?.active, icon: Shield, note: "Currently enabled" },
    { label: "Recorded tasks", value: overview?.tasks, icon: Activity, note: "Evaluator-submitted" },
    { label: "Task success rate", value: overview?.rate == null ? undefined : `${overview.rate}%`, icon: Check, note: "Weighted on-chain" },
  ];

  return (
    <>
      <PageHeader eyebrow="OVERVIEW / BOT CHAIN" title="Agent trust, at a glance" description="Monitor verifiable agent identities, task performance, and execution controls." action={<Link className="button button-primary" href="/register"><span>Register an agent</span><ArrowRight size={16} /></Link>} />
      {error && <Notice tone="warning">{error}</Notice>}
      {!contractAddresses.registry && <Notice>Live statistics are disabled until contract addresses are added to <code>.env.local</code>. No demo values are presented as on-chain data.</Notice>}
      <section className="metric-grid">
        {metrics.map(({ label, value, icon: Icon, note }) => (
          <article className="metric-card" key={label}>
          <div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={17} /></div></div>
          <div className="metric-value">{loading ? <span className="skeleton-value" /> : value ?? "—"}</div>
          <div className="metric-note">{note}</div>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel activity-panel">
          <div className="panel-heading"><div><h2>Network activity</h2><p>Verified events from AgentTrust contracts</p></div><span className={`live-tag ${!contractAddresses.registry ? "waiting-tag" : ""}`}><i /> {contractAddresses.registry ? "On-chain" : "Not configured"}</span></div>
          <div className="activity-chart">
          <div className="chart-legend"><span><i className="legend-blue" />Task records</span><span><i className="legend-violet" />Agent registrations</span></div>
          <div className="chart-empty"><Activity size={21} /><span>{overview?.agents || overview?.tasks ? "Activity history is available in each agent profile." : "Activity will appear when contract events are recorded."}</span></div>
          <div className="chart-axis"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          </div>
        </article>
        <article className="panel quick-panel">
          <div className="panel-heading"><div><h2>Trust controls</h2><p>Guardrails you can verify on-chain</p></div></div>
          <Link className="control-row" href="/permissions"><div className="control-icon blue"><LockKeyhole size={17} /></div><div><strong>Scoped permissions</strong><span>Allowlist contract calls and expiry</span></div><ChevronRight size={16} /></Link>
          <Link className="control-row" href="/spending"><div className="control-icon violet"><Shield size={17} /></div><div><strong>Spending limits</strong><span>Per-transaction, daily, and total caps</span></div><ChevronRight size={16} /></Link>
          <Link className="control-row" href="/agent"><div className="control-icon green"><Sparkles size={17} /></div><div><strong>Run a demo task</strong><span>AI result with optional evaluator record</span></div><ChevronRight size={16} /></Link>
        </article>
      </section>
      <section className="panel recent-panel">
        <div className="panel-heading"><div><h2>Recently registered</h2><p>Latest agent identities from the registry</p></div><Link className="text-link" href="/agents">View explorer <ArrowRight size={14} /></Link></div>
        {overview?.agents ? <RecentAgents /> : <EmptyState title={loading ? "Reading the registry…" : "Your registry is ready"} description={loading ? "Fetching live data from the configured BOT Chain RPC." : "Connect deployed contracts to see verified agent identities here."} action={!loading && <Link className="button button-secondary" href="/register">Register first agent <ArrowRight size={15} /></Link>} />}
      </section>
      <div className="trust-banner"><div className="banner-icon"><Fingerprint size={19} /></div><div><strong>Identity is not reputation</strong><span>Registry data, evaluator-submitted task records, and owner-authored permissions stay distinct and inspectable.</span></div><Link href="/docs">How it works <ChevronRight size={15} /></Link></div>
    </>
  );
}

function RecentAgents() {
  const [agents, setAgents] = useState<Awaited<ReturnType<typeof fetchAgents>>>([]);
  useEffect(() => {
    let active = true;
    void fetchAgents(getReadProvider()).then((value) => { if (active) setAgents(value.slice(0, 4)); });
    return () => { active = false; };
  }, []);
  return <div className="recent-list">{agents.map((agent) => <Link className="recent-agent" key={agent.id.toString()} href={`/agents/${agent.id}`}><div className="agent-avatar"><Bot size={17} /></div><div className="recent-name"><strong>{agent.name}</strong><span>#{agent.id.toString()} · {agent.category}</span></div><span className={`status-badge ${agent.active ? "status-active" : "status-inactive"}`}>{agent.active ? "Active" : "Inactive"}</span><ChevronRight size={16} className="muted" /></Link>)}</div>;
}

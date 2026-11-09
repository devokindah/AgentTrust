"use client";

import Link from "next/link";
import { Bot, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, Notice, PageHeader } from "../../components/ui";
import { Agent, contractAddresses, fetchAgents, formatAddress, formatDate, getReadProvider } from "../../lib/chain";

export default function AgentExplorerPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [loading, setLoading] = useState(Boolean(contractAddresses.registry));
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!contractAddresses.registry) return;
    void fetchAgents(getReadProvider()).then((value) => { if (active) setAgents(value); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load agents."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ["All categories", ...Array.from(new Set(agents.map((agent) => agent.category)))], [agents]);
  const filtered = agents.filter((agent) => {
    const text = `${agent.name} ${agent.description} ${agent.category} ${agent.capabilities}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (category === "All categories" || agent.category === category);
  });

  return (
    <>
      <PageHeader eyebrow="DISCOVERY / REGISTRY" title="Agent explorer" description="Browse agent identities and inspect their on-chain trust records." action={<Link className="button button-primary" href="/register"><Bot size={16} /> Register agent</Link>} />
      {error && <Notice tone="warning">{error}</Notice>}
      {!contractAddresses.registry && <Notice>Connect a deployed AgentRegistry address in <code>.env.local</code> to browse live agents.</Notice>}
      <section className="panel explorer-toolbar">
        <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, capability, or description" aria-label="Search agents" /></div>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <span className="results-count">{filtered.length} {filtered.length === 1 ? "agent" : "agents"}</span>
      </section>
      {loading ? <div className="loading-grid">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item} />)}</div> : filtered.length ? (
        <section className="agent-grid">
          {filtered.map((agent) => (
            <Link href={`/agents/${agent.id}`} className="agent-card" key={agent.id.toString()}>
              <div className="agent-card-top"><div className="agent-avatar large"><Bot size={20} /></div><span className={`status-badge ${agent.active ? "status-active" : "status-inactive"}`}>{agent.active ? "Active" : "Inactive"}</span></div>
              <h2>{agent.name}</h2><p>{agent.description || "No description provided."}</p>
              <div className="tag-row"><span className="tag">{agent.category}</span>{agent.capabilities.split(",").filter(Boolean).slice(0, 2).map((tag) => <span className="tag tag-dim" key={tag.trim()}>{tag.trim()}</span>)}</div>
              <div className="agent-card-footer"><span>Owner {formatAddress(agent.owner)}</span><span>{formatDate(agent.registeredAt)}</span></div>
            </Link>
          ))}
        </section>
      ) : <EmptyState title={agents.length ? "No agents match your filters" : loading ? "Loading the registry…" : "No registered agents yet"} description={agents.length ? "Try another search or category." : "Agent identities are read directly from the configured BOT Chain registry."} action={!agents.length && !loading && <Link className="button button-secondary" href="/register">Register an agent</Link>} />}
    </>
  );
}

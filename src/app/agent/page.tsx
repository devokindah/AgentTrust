"use client";

import { keccak256, toUtf8Bytes } from "ethers";
import { Bot, CirclePlay, FileCheck2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Notice, PageHeader } from "../../components/ui";
import { contractAddresses } from "../../lib/chain";
import { useWallet } from "../../lib/wallet-context";

type AgentResult = { summary: string; findings: string[]; limitations: string[] };

export default function DemoAgentPage() {
  const { transact } = useWallet();
  const [agentId, setAgentId] = useState("");
  const [task, setTask] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [taskId, setTaskId] = useState("");
  const [successful, setSuccessful] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function runTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setStatus(""); setResult(null);
    try {
      const response = await fetch("/api/agent/task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, task }),
      });
      const payload = await response.json() as { result?: AgentResult; taskId?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || `Agent task failed (${response.status}).`);
      if (!payload.result || !payload.taskId) throw new Error("Agent service returned an invalid response.");
      setResult(payload.result);
      setTaskId(keccak256(toUtf8Bytes(payload.taskId)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agent task failed.");
    } finally { setBusy(false); }
  }

  async function recordResult() {
    if (!result || !taskId) return;
    setRecording(true); setError(""); setStatus("");
    try {
      const tx = await transact("reputation", "recordTask", [agentId, taskId, successful, ""]);
      setStatus(`Evaluator submission ${tx.hash} sent. Waiting for confirmation…`);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("The task record was not confirmed.");
      setStatus(`Task outcome recorded in block ${receipt.blockNumber}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not record this result.");
    } finally { setRecording(false); }
  }

  return (
    <>
      <PageHeader eyebrow="AGENT RUNTIME / DEMO" title="Run a demonstration task" description="Submit a task to the server-side AI provider, inspect the structured result, and let an authorized evaluator record its outcome." />
      {error && <Notice tone="warning">{error}</Notice>}
      {status && <Notice tone="success">{status}</Notice>}
      <div className="demo-layout">
        <form className="panel form-panel" onSubmit={(event) => void runTask(event)}>
          <div className="form-section-heading"><div className="form-section-icon violet-icon"><Sparkles size={18} /></div><div><h2>Task request</h2><p>Provider credentials remain on the server.</p></div></div>
          <label className="form-field"><span className="field-label">Registered agent ID</span><input type="number" min="1" required value={agentId} onChange={(event) => setAgentId(event.target.value)} placeholder="e.g. 1" /></label>
          <label className="form-field"><span className="field-label">Task</span><textarea required maxLength={1200} rows={6} value={task} onChange={(event) => setTask(event.target.value)} placeholder="Analyze a project's public ecosystem and summarize key strengths and risks…" /></label>
          <button className="button button-primary" disabled={busy}>{busy ? "Agent is working…" : "Run task"}<CirclePlay size={16} /></button>
          {!contractAddresses.registry && <p className="field-hint">The API validates that the agent ID exists and is active in the configured registry.</p>}
        </form>
        <aside className="panel demo-aside"><div className="demo-orb"><Bot size={24} /></div><span className="eyebrow">EXECUTION FLOW</span><h2>Task → result → evaluator</h2><ol className="flow-list"><li><i>01</i><span>Agent identity validated against the registry</span></li><li><i>02</i><span>Task processed by the configured AI provider</span></li><li><i>03</i><span>Evaluator reviews result and records on-chain outcome</span></li></ol><div className="inline-hint"><FileCheck2 size={14} /> Results are not presented as verified until an authorized evaluator submits them.</div></aside>
      </div>
      {result && <section className="panel result-panel"><div className="panel-heading"><div><h2>Structured result</h2><p>Review this output before recording its performance outcome.</p></div><span className="live-tag"><i /> AI response</span></div><div className="result-summary">{result.summary}</div><div className="result-columns"><div><h3>Findings</h3>{result.findings.length ? <ul>{result.findings.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="muted">No findings supplied.</p>}</div><div><h3>Limitations</h3>{result.limitations.length ? <ul>{result.limitations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="muted">No limitations supplied.</p>}</div></div><div className="record-controls"><label><input type="radio" checked={successful} onChange={() => setSuccessful(true)} /> Successful</label><label><input type="radio" checked={!successful} onChange={() => setSuccessful(false)} /> Unsuccessful</label><button className="button button-secondary" disabled={recording || !contractAddresses.reputation} onClick={() => void recordResult()}>{recording ? "Waiting for wallet…" : "Record evaluator outcome"}</button></div><p className="field-hint">Only authorized evaluator wallets can record a task; the agent owner cannot rate their own agent. The result itself remains off-chain.</p></section>}
    </>
  );
}

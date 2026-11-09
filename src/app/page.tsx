import Link from "next/link";
import { ArrowDownRight, ArrowRight, Bot, Check, ChevronRight, Fingerprint, LockKeyhole, Shield, Sparkles } from "lucide-react";

const pillars = [
  { icon: Fingerprint, number: "01", title: "Verifiable identity", copy: "Give every agent an owner-linked, persistent identity on BOT Chain. Keep extended metadata off-chain and reference it by URI." },
  { icon: Shield, number: "02", title: "Accountable reputation", copy: "Separate verified task outcomes from subjective reviews. Authorized evaluators record results; duplicate reports and self-rating are blocked." },
  { icon: LockKeyhole, number: "03", title: "Enforced permissions", copy: "Scope agent calls by contract, function selector, and expiry. The gateway checks permissions before it forwards a call." },
  { icon: Check, number: "04", title: "Bounded spending", copy: "Set token-level per-transaction, daily, and total caps. Execution is blocked when any configured limit is exceeded." },
];

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="hero-kicker"><span className="pulse-dot" /> TRUST INFRASTRUCTURE FOR AI AGENTS</div>
        <h1>Give autonomous agents<br /><span>a verifiable layer of trust.</span></h1>
        <p>AgentTrust gives agents on BOT Chain a persistent identity, inspectable performance records, and execution controls that hold up on-chain.</p>
        <div className="hero-actions"><Link className="button button-primary hero-primary" href="/dashboard">Open dashboard <ArrowRight size={16} /></Link><Link className="button button-secondary hero-secondary" href="/docs">Explore the architecture <ChevronRight size={15} /></Link></div>
        <div className="hero-proof"><span><Check size={14} /> Owner-linked identities</span><span><Check size={14} /> Evaluator-gated reputation</span><span><Check size={14} /> Enforced call and spend limits</span></div>
        <div className="hero-product"><div className="product-topbar"><div className="product-brand"><div className="product-mark"><Fingerprint size={15} /></div>AgentTrust <span>BOT Chain</span></div><span className="product-live"><i /> ON-CHAIN CONTROLS</span></div><div className="product-content"><div className="product-title"><div><span>AGENT TRUST PROFILE</span><strong>Research Navigator</strong></div><span className="status-badge status-active">Active</span></div><div className="product-stats"><div><span>IDENTITY</span><strong><Fingerprint size={14} /> #001</strong></div><div><span>PERFORMANCE</span><strong><Shield size={14} /> Evaluator verified</strong></div><div><span>PERMISSIONS</span><strong><LockKeyhole size={14} /> Scoped access</strong></div></div><div className="product-permission"><div className="permission-pulse"><Check size={13} /></div><div><strong>Execution gateway enabled</strong><span>Target + function selector + expiry · enforced by contract</span></div><ArrowDownRight size={15} /></div><div className="product-foot"><span>Illustrative interface</span><span>Values shown are examples, not live chain data</span></div></div></div>
      </section>
      <section className="landing-section">
        <div className="section-intro"><span className="eyebrow">THE TRUST GAP</span><h2>Agents are becoming operators.<br /><span>Trust needs to be inspectable.</span></h2><p>When software can act autonomously, teams need more than a profile page. They need a way to verify ownership, review performance, and constrain what an agent can do.</p></div>
        <div className="pillar-grid">{pillars.map(({ icon: Icon, number, title, copy }) => <article className="pillar-card" key={number}><div className="pillar-top"><div className="control-icon blue"><Icon size={17} /></div><span>{number}</span></div><h3>{title}</h3><p>{copy}</p></article>)}</div>
      </section>
      <section className="landing-how"><div className="how-copy"><span className="eyebrow">HOW AGENTTRUST WORKS</span><h2>Identity first.<br />Authority by design.</h2><p>Each module has a clear boundary: the registry establishes identity, evaluators submit outcomes, the permission gateway filters contract calls, and a spending contract enforces explicit caps.</p><Link className="text-link" href="/docs">Read the developer guide <ArrowRight size={14} /></Link></div><div className="how-steps"><div className="how-step"><span>01</span><div><strong>Register an identity</strong><p>Connect an owner wallet and create an on-chain agent profile.</p></div><Bot size={17} /></div><div className="how-step"><span>02</span><div><strong>Set the boundaries</strong><p>Assign an execution wallet, allowed calls, and token-level limits.</p></div><LockKeyhole size={17} /></div><div className="how-step"><span>03</span><div><strong>Record performance</strong><p>Let an authorized evaluator submit a unique task outcome.</p></div><Shield size={17} /></div></div></section>
      <section className="landing-cta"><div className="cta-mark"><Sparkles size={19} /></div><div><span className="eyebrow">BUILT ON BOT CHAIN</span><h2>Explore the trust layer for agentic applications.</h2><p>Connect a MetaMask wallet on BOT Chain Testnet to begin. Live actions require deployed contracts and a funded test account.</p></div><Link className="button button-primary" href="/dashboard">Launch workspace <ArrowRight size={16} /></Link></section>
      <div className="landing-footnote">AgentTrust provides auditable controls, not a safety certification. Contracts have not undergone an independent audit.</div>
    </div>
  );
}

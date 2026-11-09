import Link from "next/link";
import { ArrowUpRight, BookOpen, CheckCircle2, Code2, Fingerprint, LockKeyhole, ShieldCheck } from "lucide-react";
import { PageHeader } from "../../components/ui";

const docs = [
  { title: "Identity", icon: Fingerprint, text: "Each registry entry has a unique ID, owner address, profile metadata, registration time, and active status. Large metadata belongs off-chain and is referenced by URI." },
  { title: "Reputation", icon: ShieldCheck, text: "Only authorized evaluators can record task outcomes. Duplicate task IDs are rejected, and an agent owner cannot submit ratings for their own identity." },
  { title: "Permissions", icon: LockKeyhole, text: "The execution gateway checks the configured agent wallet, target contract, function selector, and expiry before forwarding calls." },
  { title: "Spending", icon: CheckCircle2, text: "ERC-20 spends require the agent wallet and enforce per-transaction, daily, and total caps. Use exact token approvals; unlimited allowances are not requested." },
];

export default function DocsPage() {
  return (
    <>
      <PageHeader eyebrow="DEVELOPER CENTER" title="Built for verifiable trust" description="A practical guide to AgentTrust's on-chain components, integration surfaces, and current deployment requirements." />
      <section className="docs-hero panel"><div className="docs-glow" /><div className="docs-hero-icon"><BookOpen size={22} /></div><span className="eyebrow">BOT CHAIN / EVM</span><h2>Trust primitive, not a trust claim.</h2><p>AgentTrust records identities, authorized performance reports, and execution controls. An on-chain record is inspectable evidence; it is not an independent security audit or a guarantee of agent behavior.</p><a className="button button-secondary" href="https://dev-docs.botchain.ai/docs/Account-Abstraction/network-and-endpoints" target="_blank" rel="noreferrer">BOT Chain network documentation <ArrowUpRight size={15} /></a></section>
      <section className="docs-grid">{docs.map(({ title, icon: Icon, text }, index) => <article className="panel doc-card" key={title}><div className="doc-card-top"><div className="form-section-icon"><Icon size={18} /></div><span>0{index + 1}</span></div><h2>{title}</h2><p>{text}</p></article>)}</section>
      <section className="panel docs-setup"><div className="panel-heading"><div><h2>Integration quickstart</h2><p>Deploy and configure contracts before enabling live writes.</p></div><Code2 size={19} className="muted" /></div><ol><li><span>01</span><code>Copy-Item .env.example .env.local</code></li><li><span>02</span><code>npm install</code></li><li><span>03</span><code>npm run compile</code></li><li><span>04</span><code>npm run deploy:testnet</code></li><li><span>05</span><code>Set NEXT_PUBLIC_AGENT_* addresses from deployment output.</code></li></ol><p>Use a funded testnet account stored in your local environment. Never commit private keys. Assign evaluator wallets with <code>AgentReputation.setEvaluator</code> from the reputation contract owner.</p></section>
      <section className="notice notice-info"><BookOpen size={16} /><div><strong>Network parameters verified from BOT Chain documentation.</strong> Testnet chain ID 968, RPC <code>https://rpc.bohr.life</code>, explorer <code>https://scan.bohr.life</code>. Mainnet chain ID 677, RPC <code>https://rpc.botchain.ai</code>, explorer <code>https://scan.botchain.ai</code>. <Link href="/permissions">Configure controls <ArrowUpRight size={13} /></Link></div></section>
    </>
  );
}

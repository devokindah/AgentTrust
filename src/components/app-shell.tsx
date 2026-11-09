"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, BookOpen, ChevronDown, Command, Compass, CreditCard,
  Fingerprint, LayoutDashboard, LockKeyhole, Menu, Plus, ShieldCheck, X,
} from "lucide-react";
import { useState } from "react";
import { botNetwork, formatAddress } from "../lib/chain";
import { useWallet } from "../lib/wallet-context";

const navigation = [
  { label: "Product overview", href: "/", icon: Fingerprint },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Agent explorer", href: "/agents", icon: Compass },
  { label: "Register agent", href: "/register", icon: Plus },
  { label: "Task runner", href: "/agent", icon: Bot },
  { label: "Permissions", href: "/permissions", icon: LockKeyhole },
  { label: "Spending controls", href: "/spending", icon: CreditCard },
  { label: "Documentation", href: "/docs", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address, chainId, connect, switchNetwork, error } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Fingerprint size={21} strokeWidth={2.2} /></div>
          <span>agent<span className="brand-light">trust</span></span>
          <button className="mobile-close icon-button" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-card">
          <div className="workspace-icon"><Command size={17} /></div>
          <div><strong>AgentTrust</strong><span>BOT Chain</span></div>
          <ChevronDown size={15} className="muted" />
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          <div className="nav-section">PLATFORM</div>
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href === "/agents" && pathname.startsWith("/agents/"));
            return (
              <Link key={href} href={href} className={`nav-link ${active ? "nav-link-active" : ""}`} onClick={() => setMobileOpen(false)}>
                <Icon size={17} strokeWidth={1.9} /><span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="network-live"><span className="pulse-dot" /> Network target <strong>BOT Chain</strong></div>
          <div className="sidebar-user">
            <div className="avatar">AT</div>
            <div><strong>{address ? formatAddress(address) : "Guest workspace"}</strong><span>{address ? "Wallet connected" : "Connect to get started"}</span></div>
            <ShieldCheck size={16} className="muted" />
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumb"><span>AgentTrust</span><span className="breadcrumb-slash">/</span><strong>{navigation.find((item) => item.href === pathname)?.label ?? "Agent profile"}</strong></div>
          <div className="topbar-actions">
            <div className={`network-pill ${chainId && chainId !== botNetwork.chainId ? "network-warning" : ""}`}>
              <span className="pulse-dot" /> {chainId === botNetwork.chainId ? botNetwork.chainName : chainId ? "Wrong network" : "BOT Testnet"}
            </div>
            <button className={`wallet-button ${address && chainId === botNetwork.chainId ? "wallet-connected" : ""}`} onClick={() => void (chainId && chainId !== botNetwork.chainId ? switchNetwork() : connect()).catch(() => undefined)}>
              <span className="wallet-dot" />{address ? chainId === botNetwork.chainId ? formatAddress(address) : "Switch network" : "Connect wallet"}
            </button>
          </div>
        </header>
        {error && <div className="wallet-error" role="alert">{error}</div>}
        <main className="page-content">{children}</main>
        <footer className="footer"><span>AgentTrust · Trust infrastructure for autonomous agents</span><span>Built on <b>BOT Chain</b></span></footer>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "../components/app-shell";
import { WalletProvider } from "../lib/wallet-context";

export const metadata: Metadata = {
  title: "AgentTrust — Verifiable AI Agent Infrastructure",
  description: "On-chain identity, reputation, permissions, and spending controls for AI agents on BOT Chain.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider><Suspense fallback={<div className="shell-loading">Loading AgentTrust…</div>}><AppShell>{children}</AppShell></Suspense></WalletProvider>
      </body>
    </html>
  );
}

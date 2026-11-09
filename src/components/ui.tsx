import type { ReactNode } from "react";
import { ArrowUpRight, CircleAlert } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "success" }) {
  return <div className={`notice notice-${tone}`}><CircleAlert size={16} /><div>{children}</div></div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><ArrowUpRight size={20} /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function FormField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="form-field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>;
}

export function TransactionNotice({ hash }: { hash: string }) {
  return <div className="notice notice-success"><div>Transaction submitted: <code>{hash.slice(0, 12)}…</code></div></div>;
}


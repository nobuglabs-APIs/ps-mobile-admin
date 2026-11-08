import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function Feedback({
  message,
  kind = 'error',
}: {
  message: string;
  kind?: 'error' | 'success';
}) {
  const Icon = kind === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div className={`feedback feedback--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" size={18} />
      <span>{message}</span>
    </div>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="page-heading__action">{action}</div>}
    </div>
  );
}

export function formatMoney(cents: number, currency = 'AOA'): string {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

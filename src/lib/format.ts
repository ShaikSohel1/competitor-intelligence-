import type { ThreatLevel, Severity, Priority, Sentiment, ChangeType } from '@/types';

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return date.toLocaleDateString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(value: number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function domainFromUrl(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function normalizeUrl(url: string): string {
  if (!url) return url;
  return url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
}

const threatStyles: Record<ThreatLevel, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-success/15 text-success border-success/30' },
  medium: { label: 'Medium', className: 'bg-info/15 text-info border-info/30' },
  high: { label: 'High', className: 'bg-warning/15 text-warning border-warning/30' },
  critical: { label: 'Critical', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export function threatStyle(level: ThreatLevel) {
  return threatStyles[level] ?? threatStyles.medium;
}

const severityStyles: Record<Severity, string> = {
  info: 'text-muted-foreground',
  low: 'text-info',
  medium: 'text-warning',
  high: 'text-destructive',
  critical: 'text-destructive',
};

export function severityStyle(s: Severity): string {
  return severityStyles[s] ?? severityStyles.info;
}

const priorityStyles: Record<Priority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', className: 'bg-info/15 text-info' },
  high: { label: 'High', className: 'bg-warning/15 text-warning' },
  critical: { label: 'Critical', className: 'bg-destructive/15 text-destructive' },
};

export function priorityStyle(p: Priority) {
  return priorityStyles[p] ?? priorityStyles.medium;
}

const sentimentStyles: Record<Sentiment, string> = {
  positive: 'text-success',
  neutral: 'text-muted-foreground',
  negative: 'text-destructive',
};

export function sentimentStyle(s: Sentiment): string {
  return sentimentStyles[s] ?? sentimentStyles.neutral;
}

export function changeTypeLabel(c: ChangeType): string {
  const map: Record<ChangeType, string> = {
    none: 'No change',
    increase: 'Increased',
    decrease: 'Decreased',
    new: 'New',
    removed: 'Removed',
  };
  return map[c] ?? c;
}

export function changeTypeStyle(c: ChangeType): string {
  const map: Record<ChangeType, string> = {
    none: 'text-muted-foreground',
    increase: 'text-success',
    decrease: 'text-destructive',
    new: 'text-info',
    removed: 'text-warning',
  };
  return map[c] ?? map.none;
}

export function categoryIcon(category: string): string {
  const map: Record<string, string> = {
    website: 'Globe',
    seo: 'Search',
    social: 'Share2',
    pricing: 'DollarSign',
    advertising: 'Megaphone',
    product: 'Package',
    content: 'FileText',
  };
  return map[category] ?? 'Activity';
}

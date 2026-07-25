import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: 'primary' | 'accent' | 'warning' | 'destructive' | 'success' | 'info';
  className?: string;
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'text-primary bg-primary/10',
  accent: 'text-accent-foreground bg-accent/15',
  warning: 'text-warning bg-warning/15',
  destructive: 'text-destructive bg-destructive/10',
  success: 'text-success bg-success/15',
  info: 'text-info bg-info/15',
};

export function StatCard({ label, value, icon: Icon, trend, accent = 'primary', className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden p-5 animate-slide-up', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-2 text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive'
              )}
            >
              {trend.positive ? '▲' : '▼'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

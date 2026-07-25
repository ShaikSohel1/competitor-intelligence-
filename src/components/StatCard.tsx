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
  accent: 'text-ink bg-canvas-soft',
  warning: 'text-lemon bg-canvas-cream',
  destructive: 'text-ruby bg-ruby/10',
  success: 'text-primary bg-primary-subdued',
  info: 'text-shadow-blue bg-canvas-soft',
};

export function StatCard({ label, value, icon: Icon, trend, accent = 'primary', className }: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden p-6 animate-slide-up bg-canvas border-hairline', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-mute">{label}</p>
          <p className="mt-2 text-[32px] font-light tracking-[-0.64px] text-ink tnum">{value}</p>
          {trend && (
            <p
              className={cn(
                'mt-2 text-[13px] font-normal tnum tracking-[-0.39px]',
                trend.positive ? 'text-primary' : 'text-ruby'
              )}
            >
              {trend.positive ? '▲' : '▼'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]', accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

import { Link } from 'react-router-dom';
import { Globe, Search, Share2, DollarSign, Megaphone, Package, FileText, Activity, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/EmptyState';
import { formatRelativeTime, severityStyle } from '@/lib/format';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  website: Globe,
  seo: Search,
  social: Share2,
  pricing: DollarSign,
  advertising: Megaphone,
  product: Package,
  content: FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  website: 'bg-info/15 text-info',
  seo: 'bg-chart-2/15 text-chart-2',
  social: 'bg-chart-5/15 text-chart-5',
  pricing: 'bg-success/15 text-success',
  advertising: 'bg-warning/15 text-warning',
  product: 'bg-accent/15 text-accent',
  content: 'bg-primary/15 text-primary',
};

interface ActivityFeedProps {
  events: ActivityEvent[];
  competitorNames?: Record<string, string>;
  limit?: number;
  showCompetitorName?: boolean;
  emptyAction?: React.ReactNode;
}

export function ActivityFeed({
  events,
  competitorNames,
  limit = 8,
  showCompetitorName = true,
  emptyAction,
}: ActivityFeedProps) {
  const sliced = events.slice(0, limit);

  if (!sliced.length) {
    return (
      <EmptyState
        icon={Activity}
        title="No recent activity"
        description="When competitors are scanned, detected changes will appear here."
        action={emptyAction}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {sliced.map((event) => {
          const Icon = CATEGORY_ICONS[event.category] ?? Activity;
          const compName = competitorNames?.[event.competitor_id] ?? (event as unknown as { competitor?: { name?: string } }).competitor?.name;
          return (
            <div
              key={event.id}
              className="group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/60"
            >
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', CATEGORY_COLORS[event.category] ?? 'bg-muted text-muted-foreground')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{event.title}</p>
                {event.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{event.description}</p>
                )}
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {showCompetitorName && compName && (
                    <span className="font-medium text-foreground/70">{compName}</span>
                  )}
                  <span>·</span>
                  <span>{formatRelativeTime(event.detected_at)}</span>
                  {event.severity !== 'info' && (
                    <>
                      <span>·</span>
                      <span className={cn('font-medium', severityStyle(event.severity))}>{event.severity}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <Link
          to="/app/competitors"
          className="mt-2 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          View all activity <ArrowRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}

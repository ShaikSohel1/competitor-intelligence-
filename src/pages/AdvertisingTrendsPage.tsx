import { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, RefreshCw } from 'lucide-react';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchAdvertisements } from '@/lib/api';
import { CompetitorFilter } from '@/components/CompetitorFilter';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartTooltip } from '@/components/ChartTooltip';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import type { Advertisement, Competitor } from '@/types';

export function AdvertisingTrendsPage() {
  const { competitors, loading: compsLoading } = useCompetitorList();
  const [filter, setFilter] = useState('all');
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdvertisements(filter === 'all' ? undefined : filter, 100);
      setAds(data);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!compsLoading) load();
  }, [load, compsLoading]);

  const competitorMap: Record<string, Competitor> = {};
  for (const c of competitors) competitorMap[c.id] = c;

  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of ads) counts[a.platform] = (counts[a.platform] ?? 0) + 1;
    return Object.entries(counts).map(([platform, count]) => ({ platform, count }));
  }, [ads]);

  const activeCount = ads.filter((a) => a.status === 'active').length;
  const totalBudget = ads.reduce((sum, a) => sum + (a.budget_estimate ?? 0), 0);

  const renderSourceBadge = (row: { data_source?: string | null; metadata?: Record<string, unknown> | null }) => {
    const demo = row.data_source === 'demo_fallback' || row.metadata?.demo === true;
    return (
      <Badge variant={demo ? 'outline' : 'default'}>
        {demo ? 'Demo Intelligence' : 'Live Data'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advertising Trends"
        description="Monitor competitor ad campaigns, platforms, spend estimates, and creative messaging."
        actions={
          <div className="flex items-center gap-2">
            <CompetitorFilter competitors={competitors} value={filter} onChange={setFilter} />
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      {compsLoading ? (
        <Skeleton className="h-72" />
      ) : competitors.length === 0 ? (
        <EmptyState icon={Megaphone} title="No competitors tracked" description="Add competitors first to monitor their advertising." />
      ) : loading ? (
        <Skeleton className="h-72" />
      ) : ads.length === 0 ? (
        <EmptyState icon={Megaphone} title="No advertising data yet" description="Run a scan on a competitor to detect ad campaigns." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total campaigns</p><p className="mt-2 text-3xl font-bold tabular-nums">{ads.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active campaigns</p><p className="mt-2 text-3xl font-bold tabular-nums text-success">{activeCount}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Est. total spend</p><p className="mt-2 text-3xl font-bold tabular-nums">{formatCurrency(totalBudget)}</p></CardContent></Card>
          </div>

          {platformData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Campaigns by Platform</CardTitle>
                <CardDescription>Where competitors are running ads</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="platform" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar dataKey="count" name="Campaigns" radius={[6, 6, 0, 0]} fill="hsl(var(--warning))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {ads.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{a.platform}</Badge>
                      <Badge variant="outline" className="ml-2">{a.ad_type}</Badge>
                      {renderSourceBadge(a)}
                    </div>
                    <Badge variant={a.status === 'active' ? 'default' : 'secondary'} className={a.status === 'active' ? 'bg-success/15 text-success' : ''}>
                      {a.status}
                    </Badge>
                  </div>
                  {a.headline && <p className="mt-3 text-sm font-medium">"{a.headline}"</p>}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{competitorMap[a.competitor_id]?.name ?? 'Unknown'}</span>
                    <span>Budget est. {a.budget_estimate ? formatCurrency(a.budget_estimate) : '—'}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Last seen {formatRelativeTime(a.last_seen_at)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

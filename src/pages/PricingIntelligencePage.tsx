import { useCallback, useEffect, useMemo, useState } from 'react';
import { DollarSign, RefreshCw, Clock, ShieldCheck } from 'lucide-react';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchPricingSnapshots } from '@/lib/api';
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
import { formatCurrency, formatDate } from '@/lib/format';
import type { PricingSnapshot, Competitor } from '@/types';

export function PricingIntelligencePage() {
  const { competitors, loading: compsLoading } = useCompetitorList();
  const [filter, setFilter] = useState('all');
  const [snapshots, setSnapshots] = useState<PricingSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPricingSnapshots(filter === 'all' ? undefined : filter);
      setSnapshots(data || []);
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!compsLoading) load();
  }, [load, compsLoading]);

  const competitorMap: Record<string, Competitor> = {};
  for (const c of competitors) competitorMap[c.id] = c;

  // Flatten plans from latest snapshots per competitor
  const latestSnapshots = useMemo(() => {
    const latest: Record<string, PricingSnapshot> = {};
    for (const snap of snapshots) {
      if (!latest[snap.competitor_id] || new Date(snap.captured_at) > new Date(latest[snap.competitor_id].captured_at)) {
        latest[snap.competitor_id] = snap;
      }
    }
    return Object.values(latest);
  }, [snapshots]);

  const allLatestPlans = useMemo(() => {
    return latestSnapshots.flatMap((snap) => 
      snap.plans.map((plan) => ({
        ...plan,
        competitor_id: snap.competitor_id,
        captured_at: snap.captured_at,
        data_source: snap.data_source,
      }))
    );
  }, [latestSnapshots]);

  const stats = useMemo(() => {
    const totalPlans = allLatestPlans.length;
    const avgPrice = totalPlans ? allLatestPlans.reduce((acc, p) => acc + (p.price || 0), 0) / totalPlans : 0;
    return { totalPlans, avgPrice, totalSnapshots: snapshots.length };
  }, [allLatestPlans, snapshots]);

  const competitorPricing = useMemo(() => {
    const byComp: Record<string, { name: string; avgPrice: number; count: number }> = {};
    for (const p of allLatestPlans) {
      const comp = competitorMap[p.competitor_id];
      const name = comp?.name ?? 'Unknown';
      if (!byComp[p.competitor_id]) byComp[p.competitor_id] = { name, avgPrice: 0, count: 0 };
      byComp[p.competitor_id].avgPrice += (p.price || 0);
      byComp[p.competitor_id].count += 1;
    }
    return Object.values(byComp).map((b) => ({
      name: b.name.length > 12 ? b.name.slice(0, 11) + '…' : b.name,
      avgPrice: b.count ? Number((b.avgPrice / b.count).toFixed(2)) : 0,
    }));
  }, [allLatestPlans, competitorMap]);



  return (
    <div className="space-y-6">
      <PageHeader
        title="Pricing Intelligence"
        description="Track competitor pricing plans, tiers, and positioning across products."
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
        <EmptyState icon={DollarSign} title="No competitors tracked" description="Add competitors first to track their pricing." />
      ) : loading ? (
        <Skeleton className="h-72" />
      ) : snapshots.length === 0 ? (
        <EmptyState icon={DollarSign} title="No pricing data yet" description="Run a scan on a competitor to capture pricing information." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Snapshots</p><p className="mt-2 text-[32px] font-light tracking-[-0.64px] tnum">{stats.totalSnapshots}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Plans Tracked (Latest)</p><p className="mt-2 text-[32px] font-light tracking-[-0.64px] tnum text-info">{stats.totalPlans}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Avg Plan Price</p><p className="mt-2 flex items-center gap-1 text-[32px] font-light tracking-[-0.64px] tnum text-success">{formatCurrency(stats.avgPrice, 'USD')}</p></CardContent></Card>
          </div>

          {competitorPricing.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Average Plan Price by Competitor</CardTitle>
                <CardDescription>Mean price across tracked plans in the latest snapshot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={competitorPricing} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar dataKey="avgPrice" name="Avg. Price" radius={[6, 6, 0, 0]} fill="hsl(var(--success))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Latest Plans Extracted</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Plan Name</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead>Highlights</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allLatestPlans.map((p, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{competitorMap[p.competitor_id]?.name ?? '—'}</TableCell>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right font-medium tnum tracking-[-0.42px]">{p.price != null ? formatCurrency(p.price, p.currency) : 'Contact Sales'}</TableCell>
                      <TableCell className="text-muted-foreground">{p.billingPeriod}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {p.isPopular && <Badge variant="secondary">Popular</Badge>}
                          {p.isEnterprise && <Badge variant="outline">Enterprise</Badge>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Snapshot History</CardTitle>
              <CardDescription>Timeline of all pricing data captures</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {snapshots.map((snap) => (
                  <div key={snap.id} className="flex flex-col gap-2 p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-sm">{competitorMap[snap.competitor_id]?.name ?? 'Unknown'}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" /> {formatDate(snap.captured_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {snap.extraction_method && (
                          <Badge variant="outline" className="flex gap-1 items-center">
                            {snap.extraction_method}
                          </Badge>
                        )}
                        {snap.confidence && (
                          <Badge variant="secondary" className="flex gap-1 items-center">
                            <ShieldCheck className="h-3 w-3" /> {snap.confidence} Confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-sm mt-2">
                      <span className="text-muted-foreground">Plans extracted: </span>
                      <span className="font-medium">{snap.plans.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

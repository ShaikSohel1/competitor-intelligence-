import { useCallback, useEffect, useMemo, useState } from 'react';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchPricingItems } from '@/lib/api';
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
import { formatCurrency, formatDate, changeTypeLabel, changeTypeStyle } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PricingItem, Competitor } from '@/types';

export function PricingIntelligencePage() {
  const { competitors, loading: compsLoading } = useCompetitorList();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPricingItems(filter === 'all' ? undefined : filter, 200);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!compsLoading) load();
  }, [load, compsLoading]);

  const competitorMap: Record<string, Competitor> = {};
  for (const c of competitors) competitorMap[c.id] = c;

  const stats = useMemo(() => {
    const increases = items.filter((p) => p.change_type === 'increase').length;
    const decreases = items.filter((p) => p.change_type === 'decrease').length;
    const changed = increases + decreases;
    return { increases, decreases, changed, total: items.length };
  }, [items]);

  const competitorPricing = useMemo(() => {
    const byComp: Record<string, { name: string; avgPrice: number; count: number }> = {};
    for (const p of items) {
      const comp = competitorMap[p.competitor_id];
      const name = comp?.name ?? 'Unknown';
      if (!byComp[p.competitor_id]) byComp[p.competitor_id] = { name, avgPrice: 0, count: 0 };
      byComp[p.competitor_id].avgPrice += p.price;
      byComp[p.competitor_id].count += 1;
    }
    return Object.values(byComp).map((b) => ({
      name: b.name.length > 12 ? b.name.slice(0, 11) + '…' : b.name,
      avgPrice: Number((b.avgPrice / b.count).toFixed(2)),
    }));
  }, [items, competitorMap]);

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
        title="Pricing Intelligence"
        description="Track competitor pricing changes, tiers, and positioning across products."
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
      ) : items.length === 0 ? (
        <EmptyState icon={DollarSign} title="No pricing data yet" description="Run a scan on a competitor to capture pricing information." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pricing items</p><p className="mt-2 text-3xl font-bold tabular-nums">{stats.total}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Price changes</p><p className="mt-2 text-3xl font-bold tabular-nums text-warning">{stats.changed}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Increases</p><p className="mt-2 flex items-center gap-1 text-3xl font-bold tabular-nums text-success"><TrendingUp className="h-5 w-5" />{stats.increases}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Decreases</p><p className="mt-2 flex items-center gap-1 text-3xl font-bold tabular-nums text-destructive"><TrendingDown className="h-5 w-5" />{stats.decreases}</p></CardContent></Card>
          </div>

          {competitorPricing.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Average Price by Competitor</CardTitle>
                <CardDescription>Mean price across tracked products</CardDescription>
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
            <CardHeader><CardTitle className="text-base">Pricing Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Competitor</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Captured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.product_name}</TableCell>
                      <TableCell className="text-muted-foreground">{competitorMap[p.competitor_id]?.name ?? (p as unknown as { competitor?: { name?: string } }).competitor?.name ?? '—'}</TableCell>
                      <TableCell><Badge variant="outline">{p.tier ?? '—'}</Badge></TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(p.price, p.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{p.previous_price ? formatCurrency(p.previous_price, p.currency) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 text-xs font-medium', changeTypeStyle(p.change_type))}>
                            {p.change_type === 'increase' && <TrendingUp className="h-3 w-3" />}
                            {p.change_type === 'decrease' && <TrendingDown className="h-3 w-3" />}
                            {p.change_type === 'none' && <Minus className="h-3 w-3" />}
                            {changeTypeLabel(p.change_type)}
                          </span>
                          {renderSourceBadge(p)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(p.captured_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Globe, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchWebsiteSnapshots } from '@/lib/api';
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { ChartTooltip } from '@/components/ChartTooltip';
import { formatDate, formatRelativeTime, domainFromUrl } from '@/lib/format';
import type { WebsiteSnapshot, Competitor } from '@/types';

export function WebsiteMonitoringPage() {
  const { competitors, loading: compsLoading } = useCompetitorList();
  const [filter, setFilter] = useState('all');
  const [snapshots, setSnapshots] = useState<WebsiteSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWebsiteSnapshots(filter === 'all' ? undefined : filter, 50);
      setSnapshots(data);
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

  const changedCount = snapshots.filter((s) => s.changed).length;
  const avgLoad = snapshots.length
    ? Math.round(snapshots.reduce((sum, s) => sum + (s.page_load_ms ?? 0), 0) / snapshots.length)
    : 0;

  const trendData = snapshots.slice().reverse().slice(-14).map((s) => ({
    label: formatDate(s.captured_at),
    load: s.page_load_ms ?? 0,
    words: s.word_count,
  }));

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
        title="Website Monitoring"
        description="Track website content changes, performance, and structure across competitors."
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
        <EmptyState icon={Globe} title="No competitors to monitor" description="Add competitors first to start tracking their websites." />
      ) : loading ? (
        <Skeleton className="h-72" />
      ) : snapshots.length === 0 ? (
        <EmptyState icon={Globe} title="No website snapshots yet" description="Run a scan on a competitor to capture website data." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total snapshots</p><p className="mt-2 text-3xl font-bold tabular-nums">{snapshots.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Changes detected</p><p className="mt-2 text-3xl font-bold tabular-nums text-warning">{changedCount}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Avg. page load</p><p className="mt-2 text-3xl font-bold tabular-nums">{avgLoad}<span className="text-base font-normal text-muted-foreground">ms</span></p></CardContent></Card>
          </div>

          {trendData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Page Load Time Trend</CardTitle>
                <CardDescription>Milliseconds across recent snapshots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="load" name="Load (ms)" stroke="hsl(var(--info))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Website Snapshots</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competitor</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Words</TableHead>
                    <TableHead className="text-right">Load</TableHead>
                    <TableHead>Changed</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Captured</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{competitorMap[s.competitor_id]?.name ?? '—'}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{domainFromUrl(s.url)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={s.status_code === 200 ? 'secondary' : 'destructive'}>{s.status_code ?? '—'}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.word_count}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.page_load_ms ?? '—'}ms</TableCell>
                      <TableCell>{s.changed ? <Badge className="bg-warning/15 text-warning">Changed</Badge> : <Badge variant="secondary">Same</Badge>}</TableCell>
                      <TableCell>{renderSourceBadge(s)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatRelativeTime(s.captured_at)}</TableCell>
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

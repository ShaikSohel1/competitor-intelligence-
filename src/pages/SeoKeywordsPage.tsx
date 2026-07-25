import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, TrendingUp, TrendingDown, Minus, Wand2 } from 'lucide-react';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchSeoKeywords, generateKeywordGapReport } from '@/lib/api';
import { CompetitorFilter } from '@/components/CompetitorFilter';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ZAxis,
} from 'recharts';
import { ChartTooltip } from '@/components/ChartTooltip';
import { cn } from '@/lib/utils';
import type { SeoKeyword, Competitor } from '@/types';

export function SeoKeywordsPage() {
  const { competitors, loading: compsLoading } = useCompetitorList();
  const [filter, setFilter] = useState('all');
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [loading, setLoading] = useState(true);

  const [gapReportOpen, setGapReportOpen] = useState(false);
  const [generatingGap, setGeneratingGap] = useState(false);
  const [gapReport, setGapReport] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSeoKeywords(filter === 'all' ? undefined : filter, 200);
      setKeywords(data);
    } catch {
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!compsLoading) load();
  }, [load, compsLoading]);

  const competitorMap: Record<string, Competitor> = {};
  for (const c of competitors) competitorMap[c.id] = c;

  const scatterData = useMemo(
    () =>
      keywords
        .filter((k) => k.rank != null && k.search_volume != null)
        .map((k) => ({ x: k.rank ?? 0, y: k.search_volume ?? 0, z: k.difficulty ?? 20, keyword: k.keyword, competitor: competitorMap[k.competitor_id]?.name })),
    [keywords, competitorMap]
  );

  const stats = useMemo(() => {
    const up = keywords.filter((k) => k.trend === 'up').length;
    const down = keywords.filter((k) => k.trend === 'down').length;
    const high = keywords.filter((k) => k.opportunity === 'high').length;
    const avgRank = keywords.length
      ? Math.round(keywords.reduce((s, k) => s + (k.rank ?? 0), 0) / keywords.length)
      : 0;
    return { up, down, high, avgRank };
  }, [keywords]);



  const handleGenerateGapReport = async () => {
    setGapReportOpen(true);
    setGeneratingGap(true);
    try {
      const report = await generateKeywordGapReport(
        filter === 'all' ? competitors.map(c => c.id) : [filter]
      );
      setGapReport(report);
    } catch (err) {
      console.error(err);
      setGapReport({ error: 'Failed to generate gap report' });
    } finally {
      setGeneratingGap(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SEO & Keywords"
        description="Track keyword rankings, search volume, and content opportunities across competitors."
        actions={
          <div className="flex items-center gap-2">
            <CompetitorFilter competitors={competitors} value={filter} onChange={setFilter} />
            <Button variant="secondary" size="sm" onClick={handleGenerateGapReport}>
              <Wand2 className="mr-2 h-4 w-4" /> Generate Gap Report
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      <Dialog open={gapReportOpen} onOpenChange={setGapReportOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Keyword Gap Report</DialogTitle>
            <DialogDescription>
              AI-generated analysis of missing keyword opportunities.
            </DialogDescription>
          </DialogHeader>
          
          {generatingGap ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Analyzing competitor keywords...</p>
            </div>
          ) : gapReport?.error ? (
            <div className="py-8 text-center text-destructive">{gapReport.error}</div>
          ) : gapReport ? (
            <div className="space-y-4">
              {gapReport.summary && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Executive Summary</h4>
                  <p className="text-sm">{gapReport.summary}</p>
                </div>
              )}
              
              {gapReport.opportunities && Array.isArray(gapReport.opportunities) && (
                <div>
                  <h4 className="font-semibold mb-3">Top Keyword Opportunities</h4>
                  <div className="space-y-3">
                    {gapReport.opportunities.map((opp: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 border rounded-md">
                        <div>
                          <p className="font-medium">{opp.keyword || opp.topic}</p>
                          <p className="text-xs text-muted-foreground mt-1">{opp.reasoning || opp.description}</p>
                        </div>
                        {opp.difficulty && (
                          <Badge variant="outline" className="ml-4 whitespace-nowrap">Difficulty: {opp.difficulty}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {compsLoading ? (
        <Skeleton className="h-72" />
      ) : competitors.length === 0 ? (
        <EmptyState icon={Search} title="No competitors tracked" description="Add competitors first to start tracking their SEO." />
      ) : loading ? (
        <Skeleton className="h-72" />
      ) : keywords.length === 0 ? (
        <EmptyState icon={Search} title="No SEO data yet" description="Run a scan on a competitor to capture keyword rankings." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Keywords tracked</p><p className="mt-2 text-3xl font-bold tabular-nums">{keywords.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Ranking up</p><p className="mt-2 flex items-center gap-1 text-3xl font-bold tabular-nums text-success"><TrendingUp className="h-5 w-5" />{stats.up}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Ranking down</p><p className="mt-2 flex items-center gap-1 text-3xl font-bold tabular-nums text-destructive"><TrendingDown className="h-5 w-5" />{stats.down}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">High opportunity</p><p className="mt-2 text-3xl font-bold tabular-nums text-info">{stats.high}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Rank vs. Search Volume</CardTitle>
              <CardDescription>Each point is a keyword — bubble size = difficulty</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" dataKey="x" name="Rank" domain={[0, 60]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} label={{ value: 'Rank', position: 'insideBottom', offset: -5, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="number" dataKey="y" name="Volume" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} label={{ value: 'Volume', angle: -90, position: 'insideLeft', fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <ZAxis type="number" dataKey="z" range={[40, 400]} name="Difficulty" />
                    <Tooltip content={<ChartTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={scatterData} fill="hsl(var(--accent))" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Keyword Details</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Competitor</TableHead>
                    <TableHead className="text-right">Rank</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Difficulty</TableHead>
                    <TableHead>Opportunity</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">{k.keyword}</TableCell>
                      <TableCell className="text-muted-foreground">{competitorMap[k.competitor_id]?.name ?? (k as unknown as { competitor?: { name?: string } }).competitor?.name ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">#{k.rank ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{k.search_volume ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{k.difficulty ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            k.opportunity === 'high' && 'border-success/30 text-success',
                            k.opportunity === 'medium' && 'border-info/30 text-info',
                          )}>{k.opportunity}</Badge>

                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium',
                          k.trend === 'up' && 'text-success',
                          k.trend === 'down' && 'text-destructive',
                          k.trend === 'stable' && 'text-muted-foreground',
                        )}>
                          {k.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : k.trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                          {k.trend}
                        </span>
                      </TableCell>
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

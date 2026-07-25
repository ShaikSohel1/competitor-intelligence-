import { useCallback, useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Loader2, ChevronRight, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchInsights } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { StructuredInsightContent } from '@/components/StructuredInsightContent';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/format';
import type { AiInsight } from '@/types';

export function AiInsightsPage() {
  const { competitors } = useCompetitorList();
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInsights(undefined, 50);
      setInsights(data);
    } catch {
      setInsights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const competitorById: Record<string, string> = {};
  for (const c of competitors) competitorById[c.id] = c.name;

  const serviceCounts = insights.reduce(
    (acc, insight) => {
      const service = insight.metadata?.generatedBy === 'gemini' ? 'Gemini AI' : 'Heuristic';
      acc[service] = (acc[service] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const recentLogs = insights.slice(0, 5).map((insight) => ({
    id: insight.id,
    title: insight.title,
    service: insight.metadata?.generatedBy === 'gemini' ? 'Gemini AI' : 'Heuristic',
    createdAt: insight.created_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Insights"
        description="AI-generated analysis, summaries, and recommendations across your competitor portfolio."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />

      {!loading && insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI Service Logs</CardTitle>
            <CardDescription>Recent AI insight generation activity and source service.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">Gemini AI: {serviceCounts['Gemini AI'] ?? 0}</Badge>
              <Badge variant="outline">Heuristic: {serviceCounts['Heuristic'] ?? 0}</Badge>
            </div>
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{log.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{log.service}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No AI insights yet"
          description="Generate insights from any competitor's detail page, or create an executive summary from the dashboard."
          action={<Button asChild><Link to="/app/competitors">Browse competitors</Link></Button>}
        />
      ) : (
        <div className="space-y-3">
          {insights.map((ins) => (
            <Card key={ins.id} className="animate-fade-in">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ins.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="capitalize">{ins.insight_type.replace(/_/g, ' ')}</Badge>
                        {ins.competitor_id && competitorById[ins.competitor_id] && (
                          <Link to={`/app/competitors/${ins.competitor_id}`} className="inline-flex items-center gap-1 hover:text-foreground">
                            <Link2 className="h-3 w-3" /> {competitorById[ins.competitor_id]}
                          </Link>
                        )}
                        <span>· {formatRelativeTime(ins.created_at)}</span>
                        {ins.metadata && typeof ins.metadata === 'object' && 'generatedBy' in ins.metadata && (
                          <Badge variant="outline" className="text-[10px]">
                            {String(ins.metadata.generatedBy) === 'gemini' ? 'Gemini AI' : 'Heuristic'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <StructuredInsightContent content={ins.content} recommendations={ins.recommendations} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

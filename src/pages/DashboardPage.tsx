import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  AlertTriangle,
  Gauge,
  Sparkles,
  Plus,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const BAR_COLORS = ['hsl(var(--info))', 'hsl(var(--chart-2))', 'hsl(var(--chart-5))', 'hsl(var(--success))', 'hsl(var(--warning))'];
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuth } from '@/context/AuthContext';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ChartTooltip } from '@/components/ChartTooltip';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { generateExecutiveSummary } from '@/lib/api';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import { loadDemoData } from '@/lib/api';
import { threatStyle, formatRelativeTime } from '@/lib/format';
import type { ThreatLevel } from '@/types';

function buildTimeSeries(events: { category: string; detected_at: string }[]) {
  const days = 14;
  const buckets: { date: string; label: string; website: number; seo: number; social: number; pricing: number; advertising: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({
      date: key,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      website: 0,
      seo: 0,
      social: 0,
      pricing: 0,
      advertising: 0,
    });
  }
  const byDate = new Map(buckets.map((b) => [b.date, b]));
  for (const e of events) {
    const key = e.detected_at.slice(0, 10);
    const bucket = byDate.get(key);
    if (bucket && bucket[e.category as keyof typeof bucket] !== undefined) {
      (bucket[e.category as keyof typeof bucket] as number) += 1;
    }
  }
  return buckets;
}

function buildCategoryBreakdown(events: { category: string }[]) {
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.category] = (counts[e.category] ?? 0) + 1;
  return [
    { category: 'Website', value: counts.website ?? 0 },
    { category: 'SEO', value: counts.seo ?? 0 },
    { category: 'Social', value: counts.social ?? 0 },
    { category: 'Pricing', value: counts.pricing ?? 0 },
    { category: 'Ads', value: counts.advertising ?? 0 },
  ];
}

export function DashboardPage() {
  const { competitors, recentEvents, alerts, executiveSummary, loading, error, refresh } = useDashboardData();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [loadingDemoData, setLoadingDemoData] = useState(false);

  const stats = useMemo(() => {
    const totalCompetitors = competitors.length;
    const newChanges = recentEvents.length;
    const highPriorityAlerts = alerts.filter((a) => a.priority === 'high' || a.priority === 'critical' || a.priority === 'medium').filter(a => !a.read).length;
    const avgScore = totalCompetitors
      ? Math.round(competitors.reduce((sum, c) => sum + c.activity_score, 0) / totalCompetitors)
      : 0;
    return { totalCompetitors, newChanges, highPriorityAlerts, avgScore };
  }, [competitors, recentEvents, alerts]);

  const timeSeries = useMemo(() => buildTimeSeries(recentEvents), [recentEvents]);
  const categoryData = useMemo(() => buildCategoryBreakdown(recentEvents), [recentEvents]);
  const competitorNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of competitors) map[c.id] = c.name;
    return map;
  }, [competitors]);

  async function handleGenerateSummary() {
    if (!user) return;
    setGeneratingSummary(true);
    try {
      await generateExecutiveSummary();
      await refresh();
    } catch (err) {
      console.error('Summary generation failed', err);
      toast({
        title: 'Summary generation failed',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function handleLoadDemoData() {
    if (!user) return;
    setLoadingDemoData(true);
    try {
      const result = await loadDemoData();
      toast({
        title: 'Demo data loaded',
        description: `Added ${result.competitorCount} demo competitors to your workspace.`,
      });
      await refresh();
    } catch (err) {
      toast({
        title: 'Failed to load demo data',
        description: err instanceof Error ? err.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setLoadingDemoData(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Couldn't load your dashboard"
        description={error}
        action={<Button onClick={refresh}>Try again</Button>}
      />
    );
  }

  if (competitors.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Your competitor intelligence command center." />
        <EmptyState
          icon={Users}
          title="No competitors yet"
          description="Add your first competitor to start tracking their website, SEO, social media, pricing, and advertising activity."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button onClick={() => navigate('/app/competitors')}>
                <Plus className="mr-2 h-4 w-4" /> Add a competitor
              </Button>
              <Button onClick={handleLoadDemoData} disabled={loadingDemoData}>
                {loadingDemoData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Load demo data
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your competitor intelligence command center."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={handleLoadDemoData} disabled={loadingDemoData}>
              {loadingDemoData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Load demo data
            </Button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Competitors" value={stats.totalCompetitors} icon={Users} accent="primary" />
        <StatCard label="New Changes Detected" value={stats.newChanges} icon={Activity} accent="info" />
        <StatCard label="High-Priority Alerts" value={stats.highPriorityAlerts} icon={AlertTriangle} accent={stats.highPriorityAlerts > 0 ? 'destructive' : 'success'} />
        <StatCard label="Avg. Activity Score" value={stats.avgScore} icon={Gauge} accent="accent" trend={{ value: `${stats.avgScore}/100`, positive: stats.avgScore >= 50 }} />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Competitor Activity Over Time</CardTitle>
            <CardDescription>Daily detected changes across all monitored competitors (last 14 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gWebsite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gSocial" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-5))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--chart-5))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPricing" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gAds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="website" name="Website" stroke="hsl(var(--info))" strokeWidth={2} fill="url(#gWebsite)" />
                  <Area type="monotone" dataKey="social" name="Social" stroke="hsl(var(--chart-5))" strokeWidth={2} fill="url(#gSocial)" />
                  <Area type="monotone" dataKey="pricing" name="Pricing" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#gPricing)" />
                  <Area type="monotone" dataKey="advertising" name="Ads" stroke="hsl(var(--warning))" strokeWidth={2} fill="url(#gAds)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity by Category</CardTitle>
            <CardDescription>Distribution of detected signals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="value" name="Events" radius={[6, 6, 0, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              {[
                { label: 'Website', color: 'hsl(var(--info))' },
                { label: 'Social', color: 'hsl(var(--chart-5))' },
                { label: 'Pricing', color: 'hsl(var(--success))' },
                { label: 'Ads', color: 'hsl(var(--warning))' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top competitors by activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Competitor Leaderboard</CardTitle>
          <CardDescription>Ranked by activity score</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {competitors.slice().sort((a, b) => b.activity_score - a.activity_score).slice(0, 5).map((c, i) => {
            const ts = threatStyle(c.threat_level as ThreatLevel);
            const TrendIcon = c.activity_score >= 50 ? TrendingUp : c.activity_score >= 25 ? Minus : TrendingDown;
            return (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.industry ?? c.website}</p>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <TrendIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold tabular-nums">{c.activity_score}</span>
                </div>
                <Badge variant="outline" className={ts.className}>{ts.label}</Badge>
                <span className="hidden text-xs text-muted-foreground md:block">{formatRelativeTime(c.last_scanned_at)}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Activity feed + AI summary */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityFeed events={recentEvents} competitorNames={competitorNames} limit={8} />

        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">AI Executive Summary</CardTitle>
                  <CardDescription>Generated intelligence overview</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={generatingSummary}>
                {generatingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {executiveSummary ? 'Regenerate' : 'Generate'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {executiveSummary ? (
              <div className="animate-fade-in">
                <p className="text-sm leading-relaxed text-foreground/90">{executiveSummary.content}</p>
                <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {executiveSummary.metadata && typeof executiveSummary.metadata === 'object' && 'generatedBy' in executiveSummary.metadata
                      ? String(executiveSummary.metadata.generatedBy) === 'gemini' ? 'Gemini AI' : 'Heuristic'
                      : 'AI'}
                  </Badge>
                  <span>{formatRelativeTime(executiveSummary.created_at)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <p className="max-w-xs text-sm text-muted-foreground">
                  Generate an AI-powered executive summary of your competitors' recent activity, trends, and recommended next steps.
                </p>
                <Button className="mt-4" onClick={handleGenerateSummary} disabled={generatingSummary}>
                  {generatingSummary ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate Summary
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

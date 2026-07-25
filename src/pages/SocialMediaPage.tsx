import { useCallback, useEffect, useMemo, useState } from 'react';
import { Share2, RefreshCw, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchSocialPosts } from '@/lib/api';
import { CompetitorFilter } from '@/components/CompetitorFilter';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { ChartTooltip } from '@/components/ChartTooltip';
import { formatRelativeTime, initials, sentimentStyle } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SocialPost, Competitor } from '@/types';

const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn: 'hsl(var(--info))',
  X: 'hsl(var(--foreground))',
  Instagram: 'hsl(var(--chart-5))',
  Facebook: 'hsl(var(--chart-2))',
  YouTube: 'hsl(var(--destructive))',
};

const SENTIMENT_COLORS = {
  positive: 'hsl(var(--success))',
  neutral: 'hsl(var(--muted-foreground))',
  negative: 'hsl(var(--destructive))',
};

export function SocialMediaPage() {
  const { competitors, loading: compsLoading } = useCompetitorList();
  const [filter, setFilter] = useState('all');
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSocialPosts(filter === 'all' ? undefined : filter, 100);
      setPosts(data);
    } catch {
      setPosts([]);
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
    for (const p of posts) counts[p.platform] = (counts[p.platform] ?? 0) + 1;
    return Object.entries(counts).map(([platform, value]) => ({ platform, value }));
  }, [posts]);

  const sentimentData = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const p of posts) counts[p.sentiment] += 1;
    return [
      { name: 'Positive', value: counts.positive, color: SENTIMENT_COLORS.positive },
      { name: 'Neutral', value: counts.neutral, color: SENTIMENT_COLORS.neutral },
      { name: 'Negative', value: counts.negative, color: SENTIMENT_COLORS.negative },
    ].filter((d) => d.value > 0);
  }, [posts]);

  const totalEngagement = useMemo(() => {
    return posts.reduce(
      (acc, p) => ({
        likes: acc.likes + p.engagement.likes,
        comments: acc.comments + p.engagement.comments,
        shares: acc.shares + p.engagement.shares,
      }),
      { likes: 0, comments: 0, shares: 0 }
    );
  }, [posts]);

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
        title="Social Media"
        description="Monitor competitor social media activity, engagement, and sentiment across platforms."
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
        <EmptyState icon={Share2} title="No competitors tracked" description="Add competitors first to monitor their social media." />
      ) : loading ? (
        <Skeleton className="h-72" />
      ) : posts.length === 0 ? (
        <EmptyState icon={Share2} title="No social posts yet" description="Run a scan on a competitor to capture social media activity." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Posts captured</p><p className="mt-2 text-3xl font-bold tabular-nums">{posts.length}</p></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Heart className="h-4 w-4" /> Total likes</div><p className="mt-2 text-3xl font-bold tabular-nums">{totalEngagement.likes.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><MessageCircle className="h-4 w-4" /> Comments</div><p className="mt-2 text-3xl font-bold tabular-nums">{totalEngagement.comments.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-5"><div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Repeat2 className="h-4 w-4" /> Shares</div><p className="mt-2 text-3xl font-bold tabular-nums">{totalEngagement.shares.toLocaleString()}</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Posts by Platform</CardTitle>
                <CardDescription>Distribution of captured social activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={platformData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="platform" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                      <Bar dataKey="value" name="Posts" radius={[6, 6, 0, 0]} fill="hsl(var(--chart-5))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {sentimentData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Posts</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {posts.map((p) => {
                const comp = competitorMap[p.competitor_id];
                return (
                  <div key={p.id} className="flex gap-3 rounded-lg border p-4">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {comp ? initials(comp.name) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{comp?.name ?? 'Unknown'}</span>
                        <Badge variant="secondary" className="text-[10px]">{p.platform}</Badge>
                        {renderSourceBadge(p)}
                        <span className="text-xs text-muted-foreground">{formatRelativeTime(p.posted_at)}</span>
                        <span className={cn('text-xs font-medium', sentimentStyle(p.sentiment))}>· {p.sentiment}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground/90">{p.content}</p>
                      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.engagement.likes}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {p.engagement.comments}</span>
                        <span className="flex items-center gap-1"><Repeat2 className="h-3 w-3" /> {p.engagement.shares}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

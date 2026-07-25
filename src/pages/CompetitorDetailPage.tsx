import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  ExternalLink,
  Globe,
  Search,
  Share2,
  DollarSign,
  Megaphone,
  Sparkles,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Trash2,
  Pencil,
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
import { useCompetitorDetail } from '@/hooks/useCompetitorDetail';
import { fetchCompetitor, updateCompetitor, deleteCompetitor, scanCompetitor, generateInsight } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { ActivityFeed } from '@/components/ActivityFeed';
import { StructuredInsightContent } from '@/components/StructuredInsightContent';
import { ChartTooltip } from '@/components/ChartTooltip';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  threatStyle,
  formatRelativeTime,
  formatDate,
  formatDateTime,
  formatCurrency,
  domainFromUrl,
  initials,
  sentimentStyle,
  changeTypeLabel,
  changeTypeStyle,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ThreatLevel, SeoKeyword, PricingItem } from '@/types';

const INSIGHT_OPTIONS = [
  { type: 'summary', label: 'Activity Summary' },
  { type: 'trend_analysis', label: 'Trend Analysis' },
  { type: 'strategy_analysis', label: 'Strategy Analysis' },
  { type: 'pricing_analysis', label: 'Pricing Analysis' },
  { type: 'seo_opportunity', label: 'SEO Opportunity' },
  { type: 'social_sentiment', label: 'Social Sentiment' },
  { type: 'recommendation', label: 'Recommendations' },
];

const BAR_COLORS = ['hsl(var(--info))', 'hsl(var(--chart-2))', 'hsl(var(--chart-5))', 'hsl(var(--success))', 'hsl(var(--warning))'];

export function CompetitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const detail = useCompetitorDetail(id);
  const [scanning, setScanning] = useState(false);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editIndustry, setEditIndustry] = useState('');
  const [editDesc, setEditDesc] = useState('');

  async function handleScan() {
    if (!id) return;
    setScanning(true);
    try {
      await scanCompetitor(id);
      toast({ title: 'Scan complete', description: 'Competitor data updated.' });
      await detail.refresh();
    } catch (err) {
      toast({ title: 'Scan failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  }

  async function handleGenerateInsight(insightType: string) {
    if (!id) return;
    setGeneratingType(insightType);
    try {
      await generateInsight(id, insightType);
      toast({ title: 'Insight generated' });
      await detail.refresh();
    } catch (err) {
      toast({ title: 'Generation failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setGeneratingType(null);
    }
  }

  async function openEdit() {
    if (!detail.competitor) return;
    const c = await fetchCompetitor(detail.competitor.id);
    if (c) {
      setEditName(c.name);
      setEditWebsite(c.website);
      setEditIndustry(c.industry ?? '');
      setEditDesc(c.description ?? '');
    }
    setEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!id) return;
    try {
      await updateCompetitor(id, {
        name: editName.trim(),
        website: editWebsite.trim(),
        industry: editIndustry.trim() || undefined,
        description: editDesc.trim() || undefined,
      });
      toast({ title: 'Competitor updated' });
      setEditOpen(false);
      await detail.refresh();
    } catch (err) {
      toast({ title: 'Update failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!id) return;
    try {
      await deleteCompetitor(id);
      toast({ title: 'Competitor removed' });
      navigate('/app/competitors');
    } catch (err) {
      toast({ title: 'Delete failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  }

  if (detail.loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (detail.error || !detail.competitor) {
    return (
      <div className="space-y-6">
        <Link to="/app/competitors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to competitors
        </Link>
        <EmptyState
          icon={Search}
          title="Competitor not found"
          description={detail.error ?? 'This competitor may have been removed.'}
          action={<Button onClick={() => navigate('/app/competitors')}>View all competitors</Button>}
        />
      </div>
    );
  }

  const c = detail.competitor;
  const ts = threatStyle(c.threat_level as ThreatLevel);
  const TrendIcon = c.activity_score >= 50 ? TrendingUp : c.activity_score >= 25 ? Minus : TrendingDown;

  const activityTimeline = detail.events.slice(0, 10).map((e) => ({
    label: formatRelativeTime(e.detected_at),
    value: 1,
    category: e.category,
    title: e.title,
  }));

  const keywordData = detail.seoKeywords.slice(0, 10).map((k: SeoKeyword) => ({
    keyword: k.keyword.length > 16 ? k.keyword.slice(0, 15) + '…' : k.keyword,
    rank: k.rank ?? 0,
    volume: k.search_volume ?? 0,
  }));

  const pricingTrend = detail.pricingItems.slice(0, 8).reverse().map((p: PricingItem) => ({
    label: formatDate(p.captured_at),
    price: p.price,
    name: p.product_name,
  }));

  return (
    <div className="space-y-6">
      <Link to="/app/competitors" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to competitors
      </Link>

      {/* Header card */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <CardContent className="relative p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                  {initials(c.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{c.name}</h1>
                <a href={c.website} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  {domainFromUrl(c.website)} <ExternalLink className="h-3.5 w-3.5" />
                </a>
                {c.industry && <p className="mt-2 text-sm text-muted-foreground">{c.industry}</p>}
                {c.description && <p className="mt-2 max-w-2xl text-sm text-foreground/80">{c.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className={ts.className}>{ts.label} threat</Badge>
                  <Badge variant="secondary" className="gap-1">
                    <TrendIcon className="h-3 w-3" /> Activity {c.activity_score}/100
                  </Badge>
                  {c.tracked_keywords && c.tracked_keywords.length > 0 && (
                    <Badge variant="outline">{c.tracked_keywords.length} keywords tracked</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button size="sm" onClick={handleScan} disabled={scanning}>
                {scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Scan now
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="gap-1.5"><Activity className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="website" className="gap-1.5"><Globe className="h-4 w-4" /> Website</TabsTrigger>
          <TabsTrigger value="seo" className="gap-1.5"><Search className="h-4 w-4" /> SEO</TabsTrigger>
          <TabsTrigger value="social" className="gap-1.5"><Share2 className="h-4 w-4" /> Social</TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5"><DollarSign className="h-4 w-4" /> Pricing</TabsTrigger>
          <TabsTrigger value="advertising" className="gap-1.5"><Megaphone className="h-4 w-4" /> Advertising</TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5"><Sparkles className="h-4 w-4" /> AI Insights</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5"><Activity className="h-4 w-4" /> Timeline</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Activity Timeline</CardTitle>
                <CardDescription>Detected changes over time</CardDescription>
              </CardHeader>
              <CardContent>
                {detail.events.length ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={activityTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="value" name="Events" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#gAct)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState icon={Activity} title="No activity yet" description="Run a scan to detect changes." />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total scans</span>
                  <span className="font-semibold tabular-nums">{detail.scans.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Changes detected</span>
                  <span className="font-semibold tabular-nums">{detail.events.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active alerts</span>
                  <span className="font-semibold tabular-nums">{detail.alerts.filter(a => !a.read).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SEO keywords</span>
                  <span className="font-semibold tabular-nums">{detail.seoKeywords.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pricing items</span>
                  <span className="font-semibold tabular-nums">{detail.pricingItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active ads</span>
                  <span className="font-semibold tabular-nums">{detail.advertisements.filter(a => a.status === 'active').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last scanned</span>
                  <span className="font-semibold">{formatRelativeTime(c.last_scanned_at)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <ActivityFeed events={detail.events} showCompetitorName={false} limit={6} />
        </TabsContent>

        {/* Website */}
        <TabsContent value="website" className="space-y-4">
          {detail.websiteSnapshots.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Website Snapshots</CardTitle>
                <CardDescription>Captured website content over time</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                      <TableHead className="text-right">Words</TableHead>
                      <TableHead className="text-right">Load (ms)</TableHead>
                      <TableHead className="text-right">H1s</TableHead>
                      <TableHead>Changed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.websiteSnapshots.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{formatDate(s.captured_at)}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{s.title ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.status_code === 200 ? 'secondary' : 'destructive'}>{s.status_code ?? '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{s.word_count}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.page_load_ms ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.h1_count}</TableCell>
                        <TableCell>
                          {s.changed ? <Badge className="bg-warning/15 text-warning">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={Globe} title="No website data yet" description="Run a scan to capture website snapshots." action={<Button onClick={handleScan} disabled={scanning}>{scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Scan now</Button>} />
          )}
        </TabsContent>

        {/* SEO */}
        <TabsContent value="seo" className="space-y-4">
          {detail.seoKeywords.length ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Keyword Rankings</CardTitle>
                  <CardDescription>Current rank vs search volume</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={keywordData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="keyword" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={120} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                        <Bar dataKey="rank" name="Rank" radius={[0, 4, 4, 0]}>
                          {keywordData.map((_, i) => (
                            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keyword</TableHead>
                        <TableHead className="text-right">Rank</TableHead>
                        <TableHead className="text-right">Prev</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">Difficulty</TableHead>
                        <TableHead>Opportunity</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.seoKeywords.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell className="font-medium">{k.keyword}</TableCell>
                          <TableCell className="text-right tabular-nums">#{k.rank ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">#{k.previous_rank ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{k.search_volume ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{k.difficulty ?? '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              k.opportunity === 'high' && 'border-success/30 text-success',
                              k.opportunity === 'medium' && 'border-info/30 text-info',
                              k.opportunity === 'low' && 'text-muted-foreground',
                            )}>{k.opportunity}</Badge>
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
          ) : (
            <EmptyState icon={Search} title="No SEO data yet" description="Run a scan to capture keyword rankings." action={<Button onClick={handleScan} disabled={scanning}>{scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Scan now</Button>} />
          )}
        </TabsContent>

        {/* Social */}
        <TabsContent value="social" className="space-y-4">
          {detail.socialPosts.length ? (
            <div className="grid gap-3">
              {detail.socialPosts.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{p.platform}</Badge>
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(p.posted_at)}</span>
                          <span className={cn('text-xs font-medium', sentimentStyle(p.sentiment))}>· {p.sentiment}</span>
                        </div>
                        <p className="mt-2 text-sm">{p.content}</p>
                        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                          <span>♥ {p.engagement.likes}</span>
                          <span>💬 {p.engagement.comments}</span>
                          <span>↗ {p.engagement.shares}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Share2} title="No social activity yet" description="Run a scan to capture social media posts." action={<Button onClick={handleScan} disabled={scanning}>{scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Scan now</Button>} />
          )}
        </TabsContent>

        {/* Pricing */}
        <TabsContent value="pricing" className="space-y-4">
          {detail.pricingItems.length ? (
            <>
              {pricingTrend.length > 1 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Pricing Trend</CardTitle>
                    <CardDescription>Price changes over recent captures</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pricingTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                          <Bar dataKey="price" name="Price" radius={[4, 4, 0, 0]} fill="hsl(var(--success))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Previous</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>Captured</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.pricingItems.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.product_name}</TableCell>
                          <TableCell><Badge variant="outline">{p.tier ?? '—'}</Badge></TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(p.price, p.currency)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{p.previous_price ? formatCurrency(p.previous_price, p.currency) : '—'}</TableCell>
                          <TableCell>
                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium', changeTypeStyle(p.change_type))}>
                              {p.change_type === 'increase' && <TrendingUp className="h-3 w-3" />}
                              {p.change_type === 'decrease' && <TrendingDown className="h-3 w-3" />}
                              {changeTypeLabel(p.change_type)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{formatDate(p.captured_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <EmptyState icon={DollarSign} title="No pricing data yet" description="Run a scan to capture pricing information." action={<Button onClick={handleScan} disabled={scanning}>{scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Scan now</Button>} />
          )}
        </TabsContent>

        {/* Advertising */}
        <TabsContent value="advertising" className="space-y-4">
          {detail.advertisements.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {detail.advertisements.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Badge variant="secondary">{a.platform}</Badge>
                        <Badge variant="outline" className="ml-2">{a.ad_type}</Badge>
                      </div>
                      <Badge variant={a.status === 'active' ? 'default' : 'secondary'} className={a.status === 'active' ? 'bg-success/15 text-success' : ''}>
                        {a.status}
                      </Badge>
                    </div>
                    {a.headline && <p className="mt-3 text-sm font-medium">"{a.headline}"</p>}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Budget est. {a.budget_estimate ? formatCurrency(a.budget_estimate) : '—'}</span>
                      <span>Last seen {formatRelativeTime(a.last_seen_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Megaphone} title="No advertising data yet" description="Run a scan to detect ad campaigns." action={<Button onClick={handleScan} disabled={scanning}>{scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Scan now</Button>} />
          )}
        </TabsContent>

        {/* AI Insights */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-accent" /> Generate AI Analysis
              </CardTitle>
              <CardDescription>Pick an analysis type to generate fresh AI insight</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {INSIGHT_OPTIONS.map((opt) => (
                  <Button
                    key={opt.type}
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateInsight(opt.type)}
                    disabled={generatingType === opt.type}
                  >
                    {generatingType === opt.type ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                    {opt.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {detail.insights.length ? (
            <div className="space-y-3">
              {detail.insights.map((ins) => (
                <Card key={ins.id} className="animate-fade-in">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{ins.title}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(ins.created_at)}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">{ins.insight_type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div className="mt-3">
                      <StructuredInsightContent content={ins.content} recommendations={ins.recommendations} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="No AI insights yet" description="Generate an analysis above to see AI-powered intelligence." />
          )}
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline" className="space-y-4">
          {detail.events.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity Timeline</CardTitle>
                <CardDescription>All detected changes for {c.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-4 pl-6">
                  <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />
                  {detail.events.map((e) => (
                    <div key={e.id} className="relative">
                      <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-accent" />
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{e.title}</p>
                          <span className="text-xs text-muted-foreground">{formatDateTime(e.detected_at)}</span>
                        </div>
                        {e.description && <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>}
                        <Badge variant="outline" className="mt-2 capitalize">{e.category}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState icon={Activity} title="No timeline events" description="Run a scan to populate the activity timeline." action={<Button onClick={handleScan} disabled={scanning}>{scanning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Scan now</Button>} />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit competitor</DialogTitle>
            <DialogDescription>Update this competitor's details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="e-name">Name</Label>
              <Input id="e-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-website">Website</Label>
              <Input id="e-website" value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-industry">Industry</Label>
              <Input id="e-industry" value={editIndustry} onChange={(e) => setEditIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-desc">Description</Label>
              <Textarea id="e-desc" rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the competitor and all associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

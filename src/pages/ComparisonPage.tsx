import { useCallback, useEffect, useState, useMemo } from 'react';
import { GitCompareArrows, Users, DollarSign, Search, Cpu, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { fetchCompetitors, fetchPricingItems, fetchSeoKeywords, fetchSocialProfiles, fetchTechStackSnapshots } from '@/lib/api';
import { formatRelativeTime, threatStyle } from '@/lib/format';
import type { CompetitorWithStats, PricingItem, SeoKeyword, SocialProfile, TechStackSnapshot } from '@/types';

export function ComparisonPage() {
  const [competitors, setCompetitors] = useState<CompetitorWithStats[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingComps, setLoadingComps] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [pricing, setPricing] = useState<Record<string, PricingItem[]>>({});
  const [social, setSocial] = useState<Record<string, SocialProfile[]>>({});
  const [seo, setSeo] = useState<Record<string, SeoKeyword[]>>({});
  const [tech, setTech] = useState<Record<string, TechStackSnapshot[]>>({});

  useEffect(() => {
    fetchCompetitors().then(data => {
      setCompetitors(data);
      if (data.length >= 2) {
        setSelectedIds([data[0].id, data[1].id]);
      } else if (data.length === 1) {
        setSelectedIds([data[0].id]);
      }
      setLoadingComps(false);
    });
  }, []);

  useEffect(() => {
    async function loadData() {
      if (selectedIds.length === 0) {
        setPricing({});
        setSocial({});
        setSeo({});
        setTech({});
        return;
      }
      
      setLoadingData(true);
      const newPricing: Record<string, PricingItem[]> = {};
      const newSocial: Record<string, SocialProfile[]> = {};
      const newSeo: Record<string, SeoKeyword[]> = {};
      const newTech: Record<string, TechStackSnapshot[]> = {};

      await Promise.all(
        selectedIds.map(async (id) => {
          const [p, s, k, t] = await Promise.all([
            fetchPricingItems(id).catch(() => []),
            fetchSocialProfiles(id).catch(() => []),
            fetchSeoKeywords(id).catch(() => []),
            fetchTechStackSnapshots(id).catch(() => [])
          ]);
          newPricing[id] = p;
          newSocial[id] = s;
          newSeo[id] = k;
          newTech[id] = t;
        })
      );

      setPricing(newPricing);
      setSocial(newSocial);
      setSeo(newSeo);
      setTech(newTech);
      setLoadingData(false);
    }
    
    loadData();
  }, [selectedIds]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id) 
        : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const selectedComps = competitors.filter(c => selectedIds.includes(c.id));
  const unselectedComps = competitors.filter(c => !selectedIds.includes(c.id));

  // --- Pricing Data Processing ---
  const allTiers = Array.from(new Set(Object.values(pricing).flat().map(p => p.tier_name)));
  
  // --- Social Data Processing ---
  const allPlatforms = Array.from(new Set(Object.values(social).flat().map(s => s.platform)));
  const socialChartData = useMemo(() => {
    return allPlatforms.map(platform => {
      const dataPoint: any = { platform };
      selectedComps.forEach(c => {
        const profile = social[c.id]?.find(s => s.platform === platform);
        dataPoint[c.name] = profile ? profile.followers_count : 0;
      });
      return dataPoint;
    });
  }, [allPlatforms, selectedComps, social]);

  // --- SEO Data Processing ---
  const allKeywords = Array.from(new Set(Object.values(seo).flat().map(k => k.keyword)));
  
  const getRankColor = (rank: number | null | undefined) => {
    if (!rank) return '';
    if (rank <= 10) return 'bg-success/15 text-success border-success/30';
    if (rank <= 20) return 'bg-warning/15 text-warning border-warning/30';
    return 'bg-destructive/15 text-destructive border-destructive/30';
  };
  
  const renderTrend = (k: SeoKeyword) => {
    if (!k.previous_rank) return null;
    if (k.rank < k.previous_rank) return <TrendingUp className="w-3 h-3 text-success inline ml-1" />;
    if (k.rank > k.previous_rank) return <TrendingDown className="w-3 h-3 text-destructive inline ml-1" />;
    return <Minus className="w-3 h-3 text-muted-foreground inline ml-1" />;
  };

  // --- Tech Stack Data Processing ---
  const techByCategory: Record<string, string[]> = {};
  selectedComps.forEach(c => {
    const latestSnapshot = tech[c.id]?.[0];
    if (latestSnapshot?.tech_stack) {
      latestSnapshot.tech_stack.forEach(t => {
        if (!techByCategory[t.category]) techByCategory[t.category] = [];
        if (!techByCategory[t.category].includes(t.name)) {
          techByCategory[t.category].push(t.name);
        }
      });
    }
  });

  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loadingComps) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      <PageHeader
        title="Competitor Comparison"
        description="Compare up to 5 competitors across multiple dimensions"
        icon={<GitCompareArrows className="w-8 h-8 text-primary" />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Selected Competitors ({selectedIds.length}/5)
          </CardTitle>
          <CardDescription>Select up to 5 competitors to compare head-to-head.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            {selectedComps.map(comp => (
              <Badge key={comp.id} variant="default" className="px-3 py-1.5 text-sm flex items-center gap-1">
                {comp.name}
                <button 
                  onClick={() => toggleSelection(comp.id)}
                  className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            {selectedIds.length < 5 && unselectedComps.length > 0 && (
              <Select onValueChange={(val) => toggleSelection(val)} value="">
                <SelectTrigger className="w-[200px] h-8 text-xs border-dashed">
                  <SelectValue placeholder="Add competitor..." />
                </SelectTrigger>
                <SelectContent>
                  {unselectedComps.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedIds.length === 0 ? (
        <EmptyState
          icon={<GitCompareArrows className="w-12 h-12 text-muted-foreground" />}
          title="No Competitors Selected"
          description="Select at least two competitors to see a detailed comparison."
        />
      ) : loadingData ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pricing">Pricing Comparison</TabsTrigger>
            <TabsTrigger value="social">Social Presence</TabsTrigger>
            <TabsTrigger value="seo">SEO Rankings</TabsTrigger>
            <TabsTrigger value="tech">Tech Stack</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {selectedComps.map(comp => {
                const tStyle = threatStyle(comp.threat_level);
                return (
                  <Card key={comp.id} className="flex flex-col h-full">
                    <CardHeader className="pb-4 flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="text-lg line-clamp-1" title={comp.name}>{comp.name}</CardTitle>
                        <Badge variant="outline" className={tStyle.className}>{tStyle.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1 line-clamp-1">{comp.website}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{comp.industry || 'No industry'}</div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4 mt-2 border-t pt-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Activity Score</span>
                            <span className="font-medium">{comp.activity_score}/100</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div 
                              className="bg-primary rounded-full h-1.5 transition-all" 
                              style={{ width: `${comp.activity_score}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Last Scanned:</span>
                          <span>{formatRelativeTime(comp.last_scan_date)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Pricing Tiers Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allTiers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No pricing data available for selected competitors.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px] whitespace-nowrap">Pricing Tier</TableHead>
                          {selectedComps.map(c => (
                            <TableHead key={c.id} className="min-w-[150px]">{c.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTiers.map(tier => (
                          <TableRow key={tier}>
                            <TableCell className="font-medium capitalize whitespace-nowrap">{tier}</TableCell>
                            {selectedComps.map(c => {
                              const item = pricing[c.id]?.find(p => p.tier_name === tier);
                              if (!item) return <TableCell key={c.id} className="text-muted-foreground">-</TableCell>;
                              return (
                                <TableCell key={c.id}>
                                  <div className="font-bold">${item.price} {item.currency}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{item.billing_period}</div>
                                  {item.change_type && item.change_type !== 'none' && (
                                    <Badge variant="outline" className="mt-1.5 text-[10px] px-1 py-0 h-4">
                                      {item.change_type}
                                    </Badge>
                                  )}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-4 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Audience Size by Platform
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allPlatforms.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No social profiles found for selected competitors.</div>
                ) : (
                  <div className="space-y-8">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[150px]">Platform</TableHead>
                            {selectedComps.map(c => (
                              <TableHead key={c.id} className="min-w-[120px]">{c.name}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allPlatforms.map(platform => (
                            <TableRow key={platform}>
                              <TableCell className="font-medium capitalize">{platform}</TableCell>
                              {selectedComps.map(c => {
                                const profile = social[c.id]?.find(s => s.platform === platform);
                                return (
                                  <TableCell key={c.id}>
                                    {profile ? profile.followers_count.toLocaleString() : '-'}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="h-[400px] w-full mt-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={socialChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="platform" 
                            tickFormatter={(v) => (v && typeof v === 'string') ? v.charAt(0).toUpperCase() + v.slice(1) : v} 
                            stroke="hsl(var(--muted-foreground))" 
                          />
                          <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                          <RechartsTooltip 
                            cursor={{ fill: 'hsl(var(--muted)/0.5)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          {selectedComps.map((comp, idx) => (
                            <Bar 
                              key={comp.id} 
                              dataKey={comp.name} 
                              fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                              radius={[4, 4, 0, 0]} 
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  SEO Keyword Matrix
                </CardTitle>
                <CardDescription>Compare search rankings for tracked keywords.</CardDescription>
              </CardHeader>
              <CardContent>
                {allKeywords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No SEO keywords tracked for selected competitors.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px] whitespace-nowrap">Keyword</TableHead>
                          {selectedComps.map(c => (
                            <TableHead key={c.id} className="min-w-[120px]">{c.name}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allKeywords.map(keyword => (
                          <TableRow key={keyword}>
                            <TableCell className="font-medium whitespace-nowrap">{keyword}</TableCell>
                            {selectedComps.map(c => {
                              const kData = seo[c.id]?.find(k => k.keyword === keyword);
                              if (!kData || !kData.rank) return <TableCell key={c.id} className="text-muted-foreground">-</TableCell>;
                              
                              const rColor = getRankColor(kData.rank);
                              return (
                                <TableCell key={c.id}>
                                  <Badge variant="outline" className={`${rColor} font-bold`}>
                                    #{kData.rank}
                                    {renderTrend(kData)}
                                  </Badge>
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tech" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Cpu className="w-5 h-5 mr-2" />
                  Technology Stack
                </CardTitle>
                <CardDescription>Detected technologies categorized by function.</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(techByCategory).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No technology stack data available.</div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(techByCategory).map(([category, techs]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">{category}</h3>
                        <div className="overflow-x-auto border rounded-md">
                          <Table>
                            <TableHeader className="bg-muted/50">
                              <TableRow>
                                <TableHead className="w-[200px] whitespace-nowrap">Technology</TableHead>
                                {selectedComps.map(c => (
                                  <TableHead key={c.id} className="min-w-[120px] text-center">{c.name}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {techs.map(t => (
                                <TableRow key={t}>
                                  <TableCell className="font-medium whitespace-nowrap">{t}</TableCell>
                                  {selectedComps.map(c => {
                                    const latestSnapshot = tech[c.id]?.[0];
                                    const hasTech = latestSnapshot?.tech_stack?.some(stack => stack.name === t && stack.category === category);
                                    return (
                                      <TableCell key={c.id} className="text-center">
                                        {hasTech ? (
                                          <div className="mx-auto w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                                            <span className="text-success text-xs font-bold">✓</span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                    )
                                  })}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

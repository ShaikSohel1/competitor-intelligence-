import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  Competitor,
  Scan,
  ActivityEvent,
  WebsiteSnapshot,
  SeoKeyword,
  SocialPost,
  PricingItem,
  Advertisement,
  AiInsight,
  Alert,
} from '@/types';

interface CompetitorDetailData {
  competitor: Competitor | null;
  scans: Scan[];
  events: ActivityEvent[];
  websiteSnapshots: WebsiteSnapshot[];
  seoKeywords: SeoKeyword[];
  socialPosts: SocialPost[];
  pricingItems: PricingItem[];
  advertisements: Advertisement[];
  insights: AiInsight[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCompetitorDetail(competitorId: string | undefined): CompetitorDetailData {
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [websiteSnapshots, setWebsiteSnapshots] = useState<WebsiteSnapshot[]>([]);
  const [seoKeywords, setSeoKeywords] = useState<SeoKeyword[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!competitorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [compRes, scanRes, eventRes, webRes, seoRes, socialRes, pricingRes, adRes, insightRes, alertRes] = await Promise.all([
        supabase.from('competitors').select('*').eq('id', competitorId).maybeSingle(),
        supabase.from('scans').select('*').eq('competitor_id', competitorId).order('created_at', { ascending: false }).limit(10),
        supabase.from('activity_events').select('*').eq('competitor_id', competitorId).order('detected_at', { ascending: false }).limit(50),
        supabase.from('website_snapshots').select('*').eq('competitor_id', competitorId).order('captured_at', { ascending: false }).limit(20),
        supabase.from('seo_keywords').select('*').eq('competitor_id', competitorId).order('captured_at', { ascending: false }).limit(100),
        supabase.from('social_posts').select('*').eq('competitor_id', competitorId).order('posted_at', { ascending: false, nullsFirst: false }).limit(50),
        supabase.from('pricing_items').select('*').eq('competitor_id', competitorId).order('captured_at', { ascending: false }).limit(100),
        supabase.from('advertisements').select('*').eq('competitor_id', competitorId).order('last_seen_at', { ascending: false }).limit(50),
        supabase.from('ai_insights').select('*').eq('competitor_id', competitorId).order('created_at', { ascending: false }).limit(20),
        supabase.from('alerts').select('*').eq('competitor_id', competitorId).order('created_at', { ascending: false }).limit(20),
      ]);

      if (compRes.error) throw compRes.error;
      setCompetitor((compRes.data ?? null) as Competitor | null);
      setScans((scanRes.data ?? []) as Scan[]);
      setEvents((eventRes.data ?? []) as ActivityEvent[]);
      setWebsiteSnapshots((webRes.data ?? []) as WebsiteSnapshot[]);
      setSeoKeywords((seoRes.data ?? []) as SeoKeyword[]);
      setSocialPosts((socialRes.data ?? []) as SocialPost[]);
      setPricingItems((pricingRes.data ?? []) as PricingItem[]);
      setAdvertisements((adRes.data ?? []) as Advertisement[]);
      setInsights((insightRes.data ?? []) as AiInsight[]);
      setAlerts((alertRes.data ?? []) as Alert[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitor details');
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    competitor,
    scans,
    events,
    websiteSnapshots,
    seoKeywords,
    socialPosts,
    pricingItems,
    advertisements,
    insights,
    alerts,
    loading,
    error,
    refresh: load,
  };
}

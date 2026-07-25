import { supabase } from './supabase';
import type {
  Competitor,
  CompetitorWithStats,
  Scan,
  ActivityEvent,
  WebsiteSnapshot,
  SeoKeyword,
  SocialPost,
  PricingItem,
  Advertisement,
  Alert,
  AiInsight,
  Report,
  NewCompetitorInput,
  ChatMessage,
  ChatMessageSource,
  SocialProfile,
  PricingSnapshot,
  TechStackSnapshot,
  CompetitorGroup,
  AlertRule,
  MonitoredUrl,
} from '@/types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

const authHeaders = (accessToken: string): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${accessToken}`,
  apikey: SUPABASE_ANON_KEY,
});

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? SUPABASE_ANON_KEY;
}

/* ----------------------------- Competitors ----------------------------- */

export async function fetchCompetitors(): Promise<CompetitorWithStats[]> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CompetitorWithStats[];
}

export async function fetchCompetitor(id: string): Promise<Competitor | null> {
  const { data, error } = await supabase
    .from('competitors')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Competitor | null;
}

export async function createCompetitor(input: NewCompetitorInput): Promise<Competitor> {
  const { data, error } = await supabase
    .from('competitors')
    .insert({
      name: input.name,
      website: input.website,
      industry: input.industry ?? null,
      description: input.description ?? null,
      social_links: input.social_links ?? {},
      tracked_keywords: input.tracked_keywords ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as Competitor;
}

export async function updateCompetitor(
  id: string,
  patch: Partial<NewCompetitorInput> & { activity_score?: number; threat_level?: string; status?: string; scan_frequency?: string }
): Promise<Competitor> {
  const { data, error } = await supabase
    .from('competitors')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Competitor;
}

export async function deleteCompetitor(id: string): Promise<void> {
  const { error } = await supabase.from('competitors').delete().eq('id', id);
  if (error) throw error;
}

export async function scanCompetitor(competitorId: string): Promise<{ scanId: string; summary: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/scan-competitor`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ competitorId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Scan failed (${res.status})`);
  }
  const body = await res.json();
  if (!body || typeof body.scanId !== 'string') {
    throw new Error('Scan returned an unexpected response');
  }
  return { scanId: body.scanId, summary: body.summary ?? '' };
}


/* ----------------------------- Scans ----------------------------- */

export async function fetchScans(competitorId?: string, limit = 20): Promise<Scan[]> {
  let q = supabase.from('scans').select('*').order('created_at', { ascending: false }).limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Scan[];
}

/* ----------------------------- Activity Events ----------------------------- */

export async function fetchActivityEvents(
  competitorId?: string,
  limit = 50
): Promise<ActivityEvent[]> {
  let q = supabase
    .from('activity_events')
    .select('*, competitor:competitors(name, website)')
    .order('detected_at', { ascending: false })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ActivityEvent[];
}

/* ----------------------------- Website Snapshots ----------------------------- */

export async function fetchWebsiteSnapshots(competitorId?: string, limit = 20): Promise<WebsiteSnapshot[]> {
  let q = supabase
    .from('website_snapshots')
    .select('*')
    .order('captured_at', { ascending: false })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as WebsiteSnapshot[];
}

/* ----------------------------- SEO Keywords ----------------------------- */

export async function fetchSeoKeywords(competitorId?: string, limit = 100): Promise<SeoKeyword[]> {
  let q = supabase
    .from('seo_keywords')
    .select('*, competitor:competitors(name)')
    .order('captured_at', { ascending: false })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SeoKeyword[];
}

/* ----------------------------- Social Posts ----------------------------- */

export async function fetchSocialPosts(competitorId?: string, limit = 50): Promise<SocialPost[]> {
  let q = supabase
    .from('social_posts')
    .select('*, competitor:competitors(name)')
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SocialPost[];
}

/* ----------------------------- Pricing Items ----------------------------- */

export async function fetchPricingItems(competitorId?: string, limit = 100): Promise<PricingItem[]> {
  let q = supabase
    .from('pricing_items')
    .select('*, competitor:competitors(name)')
    .order('captured_at', { ascending: false })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PricingItem[];
}

/* ----------------------------- Advertisements ----------------------------- */

export async function fetchAdvertisements(competitorId?: string, limit = 50): Promise<Advertisement[]> {
  let q = supabase
    .from('advertisements')
    .select('*, competitor:competitors(name)')
    .order('last_seen_at', { ascending: false })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Advertisement[];
}

/* ----------------------------- Alerts ----------------------------- */

export async function fetchAlerts(unreadOnly = false, limit = 50): Promise<Alert[]> {
  let q = supabase
    .from('alerts')
    .select('*, competitor:competitors(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (unreadOnly) q = q.eq('read', false);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Alert[];
}

export async function markAlertRead(id: string, read = true): Promise<void> {
  const { error } = await supabase.from('alerts').update({ read }).eq('id', id);
  if (error) throw error;
}

export async function markAllAlertsRead(): Promise<void> {
  const { error } = await supabase.from('alerts').update({ read: true }).eq('read', false);
  if (error) throw error;
}

export async function deleteAlert(id: string): Promise<void> {
  const { error } = await supabase.from('alerts').delete().eq('id', id);
  if (error) throw error;
}

/* ----------------------------- AI Insights ----------------------------- */

export async function fetchInsights(competitorId?: string, limit = 30): Promise<AiInsight[]> {
  let q = supabase
    .from('ai_insights')
    .select('*, competitor:competitors(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as AiInsight[];
}

export async function generateInsight(
  competitorId: string,
  insightType: string,
  context?: Record<string, unknown>
): Promise<AiInsight> {
  console.info('[AI Service] generateInsight', { competitorId, insightType, contextKeys: context ? Object.keys(context) : [] });
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-insight`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ competitorId, insightType, context }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Insight generation failed (${res.status})`);
  }
  const body = await res.json();
  if (!body || !body.id) {
    throw new Error('Insight generation returned an unexpected response');
  }
  return body as AiInsight;
}

export async function generateExecutiveSummary(): Promise<AiInsight> {
  console.info('[AI Service] generateExecutiveSummary');
  const token = await getAccessToken();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-insight`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ insightType: 'executive_summary', userId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Summary generation failed (${res.status})`);
  }
  const body = await res.json();
  if (!body || !body.id) {
    throw new Error('Summary generation returned an unexpected response');
  }
  return body as AiInsight;
}

/* ----------------------------- Reports ----------------------------- */

export async function fetchReports(limit = 20): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Report[];
}

export async function fetchReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Report | null;
}

export async function generateReport(
  competitorIds: string[],
  periodDays = 7
): Promise<Report> {
  const token = await getAccessToken();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ competitorIds, periodDays, userId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Report generation failed (${res.status})`);
  }
  const body = await res.json();
  if (!body || !body.id) {
    throw new Error('Report generation returned an unexpected response');
  }
  return body as Report;
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) throw error;
}

/* ----------------------------- Chat Messages ----------------------------- */

export async function fetchChatMessages(competitorId?: string, limit = 50): Promise<ChatMessage[]> {
  let q = supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (competitorId) q = q.eq('competitor_id', competitorId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(
  question: string,
  competitorId?: string
): Promise<{ answer: string; sources: ChatMessageSource[] }> {
  console.info('[AI Service] sendChatMessage', { competitorId, questionLength: question.length });
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/rag-chat`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ question, competitorId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `RAG chat failed (${res.status})`);
  }
  const body = await res.json();
  if (!body || typeof body.answer !== 'string') {
    throw new Error('RAG chat returned an unexpected response');
  }
  return {
    answer: body.answer,
    sources: Array.isArray(body.sources) ? body.sources : [],
  };
}

/* ----------------------------- Radar v2: Social Profiles ----------------------------- */

export async function fetchSocialProfiles(competitorId?: string): Promise<SocialProfile[]> {
  let query = supabase
    .from('social_profiles')
    .select('*')
    .order('captured_at', { ascending: false });
  if (competitorId) query = query.eq('competitor_id', competitorId);
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return (data ?? []) as SocialProfile[];
}

/* ----------------------------- Radar v2: Pricing Snapshots ----------------------------- */

export async function fetchPricingSnapshots(competitorId?: string): Promise<PricingSnapshot[]> {
  let query = supabase
    .from('pricing_snapshots')
    .select('*')
    .order('captured_at', { ascending: false });
  if (competitorId) query = query.eq('competitor_id', competitorId);
  const { data, error } = await query.limit(50);
  if (error) throw error;
  return (data ?? []) as PricingSnapshot[];
}

/* ----------------------------- Radar v2: Tech Stack Snapshots ----------------------------- */

export async function fetchTechStackSnapshots(competitorId?: string): Promise<TechStackSnapshot[]> {
  let query = supabase
    .from('tech_stack_snapshots')
    .select('*')
    .order('captured_at', { ascending: false });
  if (competitorId) query = query.eq('competitor_id', competitorId);
  const { data, error } = await query.limit(50);
  if (error) throw error;
  return (data ?? []) as TechStackSnapshot[];
}

/* ----------------------------- Radar v2: Competitor Groups ----------------------------- */

export async function fetchCompetitorGroups(): Promise<CompetitorGroup[]> {
  const { data, error } = await supabase
    .from('competitor_groups')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CompetitorGroup[];
}

export async function createCompetitorGroup(
  group: { name: string; description?: string; competitor_ids: string[]; color?: string }
): Promise<CompetitorGroup> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('competitor_groups')
    .insert({ ...group, user_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as CompetitorGroup;
}

/* ----------------------------- Radar v2: Alert Rules ----------------------------- */

export async function fetchAlertRules(): Promise<AlertRule[]> {
  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AlertRule[];
}

export async function createAlertRule(
  rule: {
    name: string;
    rule_type: string;
    conditions: Record<string, unknown>;
    severity?: string;
    competitor_id?: string;
    notification_channels?: string[];
  }
): Promise<AlertRule> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('alert_rules')
    .insert({ ...rule, user_id: user?.id })
    .select()
    .single();
  if (error) throw error;
  return data as AlertRule;
}

export async function updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<void> {
  const { error } = await supabase.from('alert_rules').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteAlertRule(id: string): Promise<void> {
  const { error } = await supabase.from('alert_rules').delete().eq('id', id);
  if (error) throw error;
}

/* ----------------------------- Radar v2: Monitored URLs ----------------------------- */

export async function fetchMonitoredUrls(competitorId: string): Promise<MonitoredUrl[]> {
  const { data, error } = await supabase
    .from('monitored_urls')
    .select('*')
    .eq('competitor_id', competitorId)
    .order('page_type');
  if (error) throw error;
  return (data ?? []) as MonitoredUrl[];
}

/* ----------------------------- Radar v2: Battlecard Generation ----------------------------- */

export async function generateBattlecard(competitorId: string): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-battlecard`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ competitorId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Battlecard generation failed (${res.status})`);
  }
  return await res.json();
}

/* ----------------------------- Radar v2: Keyword Gap Report ----------------------------- */

export async function generateKeywordGapReport(competitorIds?: string[]): Promise<Record<string, unknown>> {
  const token = await getAccessToken();
  const { data: { user } } = await supabase.auth.getUser();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/keyword-gap-report`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ userId: user?.id, competitorIds }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Keyword gap report failed (${res.status})`);
  }
  return await res.json();
}

/* ----------------------------- Radar v2: Discover Pages ----------------------------- */

export async function discoverPages(competitorId: string): Promise<{ discovered: number; urls: Array<{ url: string; page_type: string; label: string }> }> {
  const token = await getAccessToken();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/discover-pages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ competitorId }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Page discovery failed (${res.status})`);
  }
  return await res.json();
}

/* ----------------------------- Radar v2: Alert Feedback ----------------------------- */

export async function updateAlertFeedback(alertId: string, feedback: 'relevant' | 'not_relevant'): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ feedback })
    .eq('id', alertId);
  if (error) throw error;
}

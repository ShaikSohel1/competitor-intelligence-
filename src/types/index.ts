export type ThreatLevel = 'low' | 'medium' | 'high' | 'critical';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Sentiment = 'positive' | 'neutral' | 'negative';
export type ChangeType = 'none' | 'increase' | 'decrease' | 'new' | 'removed';
export type InsightType =
  | 'summary'
  | 'trend_analysis'
  | 'strategy_analysis'
  | 'pricing_analysis'
  | 'seo_opportunity'
  | 'social_sentiment'
  | 'recommendation';

export interface Competitor {
  id: string;
  user_id: string;
  name: string;
  website: string;
  industry: string | null;
  description: string | null;
  social_links: Record<string, string> | null;
  tracked_keywords: string[] | null;
  logo_url: string | null;
  activity_score: number;
  threat_level: ThreatLevel;
  last_scanned_at: string | null;
  scan_frequency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Scan {
  id: string;
  competitor_id: string;
  user_id: string;
  status: ScanStatus;
  scan_type: string;
  raw_data: Record<string, unknown> | null;
  changes_detected: number;
  ai_summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  competitor_id: string;
  user_id: string;
  scan_id: string | null;
  category: string;
  event_type: string;
  title: string;
  description: string | null;
  severity: Severity;
  metadata: Record<string, unknown> | null;
  detected_at: string;
  created_at: string;
}

export interface WebsiteSnapshot {
  id: string;
  competitor_id: string;
  user_id: string;
  scan_id: string | null;
  url: string;
  status_code: number | null;
  title: string | null;
  meta_description: string | null;
  h1_count: number;
  word_count: number;
  page_load_ms: number | null;
  content_hash: string | null;
  changed: boolean;
  data_source?: string | null;
  metadata?: Record<string, unknown> | null;
  captured_at: string;
  created_at: string;
}

export interface SeoKeyword {
  id: string;
  competitor_id: string;
  user_id: string;
  keyword: string;
  rank: number | null;
  previous_rank: number | null;
  search_volume: number | null;
  difficulty: number | null;
  opportunity: string;
  trend: string;
  data_source?: string | null;
  metadata?: Record<string, unknown> | null;
  captured_at: string;
  created_at: string;
}

export interface SocialPost {
  id: string;
  competitor_id: string;
  user_id: string;
  platform: string;
  post_url: string | null;
  content: string | null;
  engagement: { likes: number; comments: number; shares: number };
  sentiment: Sentiment;
  posted_at: string | null;
  data_source?: string | null;
  metadata?: Record<string, unknown> | null;
  captured_at: string;
  created_at: string;
}

export interface PricingItem {
  id: string;
  competitor_id: string;
  user_id: string;
  product_name: string;
  price: number;
  previous_price: number | null;
  currency: string;
  unit: string | null;
  tier: string | null;
  change_type: ChangeType;
  data_source?: string | null;
  metadata?: Record<string, unknown> | null;
  captured_at: string;
  created_at: string;
}

export interface Advertisement {
  id: string;
  competitor_id: string;
  user_id: string;
  platform: string;
  ad_type: string;
  headline: string | null;
  creative_url: string | null;
  landing_url: string | null;
  budget_estimate: number | null;
  status: string;
  data_source?: string | null;
  metadata?: Record<string, unknown> | null;
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
}

export interface Alert {
  id: string;
  competitor_id: string;
  user_id: string;
  title: string;
  message: string;
  category: string;
  priority: Priority;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AiInsight {
  id: string;
  competitor_id: string | null;
  user_id: string;
  insight_type: InsightType;
  title: string;
  content: string;
  recommendations: string[] | null;
  sentiment: Sentiment;
  confidence: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  scope: string;
  competitor_ids: string[] | null;
  summary: string;
  sections: ReportSection[];
  recommendations: string[] | null;
  status: string;
  created_at: string;
}

export interface ReportSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface CompetitorWithStats extends Competitor {
  changes_count?: number;
  alerts_count?: number;
}

export interface NewCompetitorInput {
  name: string;
  website: string;
  industry?: string;
  description?: string;
  social_links?: Record<string, string>;
  tracked_keywords?: string[];
}

export interface ChatMessageSource {
  source_table: string;
  competitor_id: string | null;
  content: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  competitor_id: string | null;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatMessageSource[];
  created_at: string;
}

/* ──────── Radar v2 Types ──────── */

export interface SocialProfile {
  id: string;
  competitor_id: string;
  user_id: string;
  platform: 'youtube' | 'linkedin' | 'twitter' | 'instagram' | 'facebook';
  handle: string;
  name: string | null;
  followers: number | null;
  followers_text: string | null;
  bio: string | null;
  avatar_url: string | null;
  post_count: number | null;
  engagement_rate: number | null;
  data_source: string;
  metadata: Record<string, unknown> | null;
  captured_at: string;
  created_at: string;
}

export interface PricingSnapshot {
  id: string;
  competitor_id: string;
  user_id: string;
  scan_id: string | null;
  url: string | null;
  plans: Array<{
    name: string;
    price: number | null;
    currency: string;
    billingPeriod: string;
    features: string[];
    isPopular: boolean;
    isEnterprise: boolean;
  }>;
  extraction_method: string | null;
  confidence: string | null;
  data_source: string;
  captured_at: string;
  created_at: string;
}

export interface TechStackSnapshot {
  id: string;
  competitor_id: string;
  user_id: string;
  scan_id: string | null;
  ad_networks: Array<{
    platform: string;
    detected: boolean;
    pixelId?: string;
    evidence: string;
  }>;
  tech_stack: Array<{
    category: string;
    name: string;
    detected: boolean;
    version?: string;
  }>;
  total_ad_networks: number;
  total_tech_detected: number;
  captured_at: string;
  created_at: string;
}

export interface CompetitorGroup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  competitor_ids: string[];
  color: string;
  created_at: string;
  updated_at: string;
}

export interface AlertRule {
  id: string;
  user_id: string;
  competitor_id: string | null;
  name: string;
  description: string | null;
  rule_type: string;
  conditions: Record<string, unknown>;
  severity: string;
  notification_channels: string[];
  enabled: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export interface MonitoredUrl {
  id: string;
  competitor_id: string;
  user_id: string;
  url: string;
  page_type: string;
  label: string | null;
  is_auto_discovered: boolean;
  last_checked_at: string | null;
  last_status_code: number | null;
  last_content_hash: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdCreative {
  id: string;
  competitor_id: string;
  user_id: string;
  platform: string;
  ad_id: string | null;
  format: string | null;
  headline: string | null;
  body_text: string | null;
  creative_url: string | null;
  landing_url: string | null;
  cta_text: string | null;
  status: string;
  impressions_estimate: string | null;
  region: string;
  first_seen_at: string;
  last_seen_at: string;
  data_source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface NewCompetitorInputV2 extends NewCompetitorInput {
  pricing_url?: string;
}

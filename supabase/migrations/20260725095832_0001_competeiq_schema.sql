/*
# CompeteIQ — Competitor Marketing Intelligence Schema

## Purpose
Multi-user SaaS app. Each signed-in user monitors a portfolio of competitors across
website, SEO, social media, pricing, and advertising dimensions, with AI-generated
insights, alerts, and reports.

## Tables Created
1. `competitors` — top-level competitor profile owned by the user
2. `scans` — per-competitor scan run metadata + raw snapshot data
3. `activity_events` — detected changes / activity items per competitor
4. `website_snapshots` — captured website content per scan
5. `seo_keywords` — tracked SEO keywords per competitor
6. `social_posts` — captured social media activity per competitor
7. `pricing_items` — tracked pricing/products per competitor
8. `advertisements` — detected advertising/marketing campaigns per competitor
9. `alerts` — high-signal notifications derived from activity
10. `ai_insights` — AI-generated analysis records (summaries, recommendations, etc.)
11. `reports` — AI-generated weekly competitor reports

## Security
- RLS enabled on every table.
- All tables are owner-scoped: `user_id uuid NOT NULL DEFAULT auth.uid()`.
- 4 separate policies per table (select/insert/update/delete) restricted to `authenticated`
  using `auth.uid() = user_id`.
- Owner column defaults to `auth.uid()` so client inserts that omit `user_id` still pass
  the INSERT WITH CHECK policy.

## Notes
- All timestamps are `timestamptz DEFAULT now()`.
- `jsonb` columns store flexible/raw scan payloads and AI structured outputs.
- Indexes added on `user_id` and `competitor_id` for common query paths.
- Idempotent: safe to re-run (IF NOT EXISTS + DROP POLICY IF EXISTS).
*/

-- ===== competitors =====
CREATE TABLE IF NOT EXISTS competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  website text NOT NULL,
  industry text,
  description text,
  social_links jsonb DEFAULT '{}'::jsonb,
  tracked_keywords text[] DEFAULT '{}',
  logo_url text,
  activity_score integer NOT NULL DEFAULT 0,
  threat_level text NOT NULL DEFAULT 'medium',
  last_scanned_at timestamptz,
  scan_frequency text NOT NULL DEFAULT 'weekly',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_competitors" ON competitors;
CREATE POLICY "select_own_competitors" ON competitors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_competitors" ON competitors;
CREATE POLICY "insert_own_competitors" ON competitors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_competitors" ON competitors;
CREATE POLICY "update_own_competitors" ON competitors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_competitors" ON competitors;
CREATE POLICY "delete_own_competitors" ON competitors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== scans =====
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  scan_type text NOT NULL DEFAULT 'full',
  raw_data jsonb DEFAULT '{}'::jsonb,
  changes_detected integer NOT NULL DEFAULT 0,
  ai_summary text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_scans" ON scans;
CREATE POLICY "select_own_scans" ON scans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_scans" ON scans;
CREATE POLICY "insert_own_scans" ON scans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_scans" ON scans;
CREATE POLICY "update_own_scans" ON scans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_scans" ON scans;
CREATE POLICY "delete_own_scans" ON scans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== activity_events =====
CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES scans(id) ON DELETE SET NULL,
  category text NOT NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_activity_events" ON activity_events;
CREATE POLICY "select_own_activity_events" ON activity_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_activity_events" ON activity_events;
CREATE POLICY "insert_own_activity_events" ON activity_events FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_activity_events" ON activity_events;
CREATE POLICY "update_own_activity_events" ON activity_events FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_activity_events" ON activity_events;
CREATE POLICY "delete_own_activity_events" ON activity_events FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== website_snapshots =====
CREATE TABLE IF NOT EXISTS website_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id uuid REFERENCES scans(id) ON DELETE SET NULL,
  url text NOT NULL,
  status_code integer,
  title text,
  meta_description text,
  h1_count integer DEFAULT 0,
  word_count integer DEFAULT 0,
  page_load_ms integer,
  content_hash text,
  changed boolean NOT NULL DEFAULT false,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE website_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_website_snapshots" ON website_snapshots;
CREATE POLICY "select_own_website_snapshots" ON website_snapshots FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_website_snapshots" ON website_snapshots;
CREATE POLICY "insert_own_website_snapshots" ON website_snapshots FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_website_snapshots" ON website_snapshots;
CREATE POLICY "update_own_website_snapshots" ON website_snapshots FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_website_snapshots" ON website_snapshots;
CREATE POLICY "delete_own_website_snapshots" ON website_snapshots FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== seo_keywords =====
CREATE TABLE IF NOT EXISTS seo_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  rank integer,
  previous_rank integer,
  search_volume integer,
  difficulty integer,
  opportunity text DEFAULT 'medium',
  trend text DEFAULT 'stable',
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_seo_keywords" ON seo_keywords;
CREATE POLICY "select_own_seo_keywords" ON seo_keywords FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_seo_keywords" ON seo_keywords;
CREATE POLICY "insert_own_seo_keywords" ON seo_keywords FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_seo_keywords" ON seo_keywords;
CREATE POLICY "update_own_seo_keywords" ON seo_keywords FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_seo_keywords" ON seo_keywords;
CREATE POLICY "delete_own_seo_keywords" ON seo_keywords FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== social_posts =====
CREATE TABLE IF NOT EXISTS social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  post_url text,
  content text,
  engagement jsonb DEFAULT '{"likes":0,"comments":0,"shares":0}'::jsonb,
  sentiment text DEFAULT 'neutral',
  posted_at timestamptz,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_social_posts" ON social_posts;
CREATE POLICY "select_own_social_posts" ON social_posts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_social_posts" ON social_posts;
CREATE POLICY "insert_own_social_posts" ON social_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_social_posts" ON social_posts;
CREATE POLICY "update_own_social_posts" ON social_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_social_posts" ON social_posts;
CREATE POLICY "delete_own_social_posts" ON social_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== pricing_items =====
CREATE TABLE IF NOT EXISTS pricing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  price numeric(10,2) NOT NULL,
  previous_price numeric(10,2),
  currency text NOT NULL DEFAULT 'USD',
  unit text,
  tier text,
  change_type text DEFAULT 'none',
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pricing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pricing_items" ON pricing_items;
CREATE POLICY "select_own_pricing_items" ON pricing_items FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pricing_items" ON pricing_items;
CREATE POLICY "insert_own_pricing_items" ON pricing_items FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_pricing_items" ON pricing_items;
CREATE POLICY "update_own_pricing_items" ON pricing_items FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pricing_items" ON pricing_items;
CREATE POLICY "delete_own_pricing_items" ON pricing_items FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== advertisements =====
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  ad_type text NOT NULL,
  headline text,
  creative_url text,
  landing_url text,
  budget_estimate numeric(10,2),
  status text DEFAULT 'active',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_advertisements" ON advertisements;
CREATE POLICY "select_own_advertisements" ON advertisements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_advertisements" ON advertisements;
CREATE POLICY "insert_own_advertisements" ON advertisements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_advertisements" ON advertisements;
CREATE POLICY "update_own_advertisements" ON advertisements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_advertisements" ON advertisements;
CREATE POLICY "delete_own_advertisements" ON advertisements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== alerts =====
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_alerts" ON alerts;
CREATE POLICY "select_own_alerts" ON alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_alerts" ON alerts;
CREATE POLICY "insert_own_alerts" ON alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_alerts" ON alerts;
CREATE POLICY "update_own_alerts" ON alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_alerts" ON alerts;
CREATE POLICY "delete_own_alerts" ON alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== ai_insights =====
CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  recommendations jsonb DEFAULT '[]'::jsonb,
  sentiment text DEFAULT 'neutral',
  confidence numeric(3,2) DEFAULT 0.0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ai_insights" ON ai_insights;
CREATE POLICY "select_own_ai_insights" ON ai_insights FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_ai_insights" ON ai_insights;
CREATE POLICY "insert_own_ai_insights" ON ai_insights FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ai_insights" ON ai_insights;
CREATE POLICY "update_own_ai_insights" ON ai_insights FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ai_insights" ON ai_insights;
CREATE POLICY "delete_own_ai_insights" ON ai_insights FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== reports =====
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  scope text NOT NULL DEFAULT 'all',
  competitor_ids uuid[] DEFAULT '{}'::uuid[],
  summary text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'generated',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON reports;
CREATE POLICY "select_own_reports" ON reports FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_reports" ON reports;
CREATE POLICY "insert_own_reports" ON reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_reports" ON reports;
CREATE POLICY "update_own_reports" ON reports FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_reports" ON reports;
CREATE POLICY "delete_own_reports" ON reports FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_competitor_id ON scans(competitor_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_competitor_id ON activity_events(competitor_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_detected_at ON activity_events(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_snapshots_competitor_id ON website_snapshots(competitor_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_competitor_id ON seo_keywords(competitor_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_competitor_id ON social_posts(competitor_id);
CREATE INDEX IF NOT EXISTS idx_pricing_items_competitor_id ON pricing_items(competitor_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_competitor_id ON advertisements(competitor_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(read);
CREATE INDEX IF NOT EXISTS idx_ai_insights_competitor_id ON ai_insights(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);

-- ===== updated_at trigger =====
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_competitors_updated_at ON competitors;
CREATE TRIGGER trg_competitors_updated_at BEFORE UPDATE ON competitors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

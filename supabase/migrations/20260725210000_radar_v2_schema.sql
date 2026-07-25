-- Radar v2 Schema Updates
-- Adds columns and tables needed for real competitor intelligence monitoring

-- ============================================================
-- 1. Add pricing_url to competitors table
-- ============================================================
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS pricing_url text;

-- ============================================================
-- 2. Add data_source column to intelligence tables
--    Tracks whether data is from live scraping or demo fallback
-- ============================================================
DO $$
BEGIN
  -- seo_keywords
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'seo_keywords' AND column_name = 'data_source'
  ) THEN
    ALTER TABLE seo_keywords ADD COLUMN data_source text DEFAULT 'demo_fallback'
      CHECK (data_source IN ('live', 'demo_fallback'));
  END IF;

  -- social_posts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_posts' AND column_name = 'data_source'
  ) THEN
    ALTER TABLE social_posts ADD COLUMN data_source text DEFAULT 'demo_fallback'
      CHECK (data_source IN ('live', 'demo_fallback'));
  END IF;

  -- pricing_items
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pricing_items' AND column_name = 'data_source'
  ) THEN
    ALTER TABLE pricing_items ADD COLUMN data_source text DEFAULT 'demo_fallback'
      CHECK (data_source IN ('live', 'demo_fallback'));
  END IF;

  -- advertisements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'advertisements' AND column_name = 'data_source'
  ) THEN
    ALTER TABLE advertisements ADD COLUMN data_source text DEFAULT 'demo_fallback'
      CHECK (data_source IN ('live', 'demo_fallback'));
  END IF;
END $$;

-- ============================================================
-- 3. Add structural_snapshot JSONB to website_snapshots
--    Stores full structural snapshot for change detection
-- ============================================================
ALTER TABLE website_snapshots 
  ADD COLUMN IF NOT EXISTS structural_snapshot jsonb;

-- ============================================================
-- 4. Add feedback column to alerts
--    Tracks user relevance feedback (thumbs up/down) per PRD FR-ALERT-7
-- ============================================================
ALTER TABLE alerts 
  ADD COLUMN IF NOT EXISTS feedback text 
  CHECK (feedback IN ('relevant', 'not_relevant'));

-- ============================================================
-- 5. Competitor Groups table (PRD FR-SETUP-3)
--    Users can group competitors into named sets
-- ============================================================
CREATE TABLE IF NOT EXISTS competitor_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  competitor_ids uuid[] DEFAULT '{}',
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for competitor_groups
ALTER TABLE competitor_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'competitor_groups' AND policyname = 'Owner can manage own groups'
  ) THEN
    CREATE POLICY "Owner can manage own groups" ON competitor_groups
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger for competitor_groups
DROP TRIGGER IF EXISTS competitor_groups_updated_at ON competitor_groups;
CREATE TRIGGER competitor_groups_updated_at
  BEFORE UPDATE ON competitor_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. Alert Rules table (PRD FR-ALERT-1)
--    Configurable rule-based alert triggers
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  rule_type text NOT NULL CHECK (rule_type IN (
    'price_change', 'price_threshold', 
    'seo_rank_change', 'seo_rank_threshold',
    'website_change', 'social_follower_change',
    'new_ad_campaign', 'tech_stack_change',
    'any_critical_change'
  )),
  conditions jsonb NOT NULL DEFAULT '{}',
  -- conditions example for price_change: { "change_percent": 10, "direction": "any" }
  -- conditions example for seo_rank_threshold: { "keyword": "crm software", "rank_below": 10 }
  -- conditions example for website_change: { "categories": ["positioning_pivot", "cta_change"] }
  severity text NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  notification_channels text[] DEFAULT ARRAY['in_app'],
  -- notification_channels: 'in_app', 'email', 'slack'
  enabled boolean DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for alert_rules
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alert_rules' AND policyname = 'Owner can manage own alert rules'
  ) THEN
    CREATE POLICY "Owner can manage own alert rules" ON alert_rules
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger for alert_rules
DROP TRIGGER IF EXISTS alert_rules_updated_at ON alert_rules;
CREATE TRIGGER alert_rules_updated_at
  BEFORE UPDATE ON alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 7. Monitored URLs table (PRD FR-SETUP-2)
--    Track specific URLs per competitor beyond just the homepage
-- ============================================================
CREATE TABLE IF NOT EXISTS monitored_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  page_type text NOT NULL CHECK (page_type IN (
    'homepage', 'pricing', 'blog', 'careers', 'product', 
    'features', 'about', 'docs', 'changelog', 'custom'
  )),
  label text, -- user-defined label
  is_auto_discovered boolean DEFAULT false,
  last_checked_at timestamptz,
  last_status_code integer,
  last_content_hash text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS for monitored_urls
ALTER TABLE monitored_urls ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'monitored_urls' AND policyname = 'Owner can manage monitored urls'
  ) THEN
    CREATE POLICY "Owner can manage monitored urls" ON monitored_urls
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Updated_at trigger for monitored_urls
DROP TRIGGER IF EXISTS monitored_urls_updated_at ON monitored_urls;
CREATE TRIGGER monitored_urls_updated_at
  BEFORE UPDATE ON monitored_urls
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 8. Social profiles tracking table
--    Stores scraped social profile snapshots over time
-- ============================================================
CREATE TABLE IF NOT EXISTS social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('youtube', 'linkedin', 'twitter', 'instagram', 'facebook')),
  handle text NOT NULL,
  name text,
  followers integer,
  followers_text text, -- e.g. "1.2M subscribers"
  bio text,
  avatar_url text,
  post_count integer,
  engagement_rate numeric,
  data_source text DEFAULT 'live' CHECK (data_source IN ('live', 'demo_fallback')),
  metadata jsonb DEFAULT '{}',
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS for social_profiles
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'social_profiles' AND policyname = 'Owner can manage social profiles'
  ) THEN
    CREATE POLICY "Owner can manage social profiles" ON social_profiles
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 9. Pricing history table
--    Stores structured pricing snapshots for historical timeline (PRD FR-PRICE-3)
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id uuid REFERENCES scans(id) ON DELETE SET NULL,
  url text,
  plans jsonb NOT NULL DEFAULT '[]',
  -- plans: Array of { name, price, currency, billingPeriod, features[], isPopular, isEnterprise }
  extraction_method text CHECK (extraction_method IN ('next_data', 'json_ld', 'dom_heuristics', 'llm_extraction', 'manual', 'demo_fallback')),
  confidence text CHECK (confidence IN ('high', 'medium', 'low')),
  raw_text_snippet text,
  data_source text DEFAULT 'demo_fallback' CHECK (data_source IN ('live', 'demo_fallback')),
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS for pricing_snapshots
ALTER TABLE pricing_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pricing_snapshots' AND policyname = 'Owner can view own pricing snapshots'
  ) THEN
    CREATE POLICY "Owner can view own pricing snapshots" ON pricing_snapshots
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 10. Ad creatives table
--     Stores detected ad creatives from transparency libraries (PRD FR-AD-1)
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL, -- 'meta', 'google', 'linkedin', 'tiktok'
  ad_id text, -- platform-specific ad ID
  format text CHECK (format IN ('image', 'video', 'carousel', 'text', 'unknown')),
  headline text,
  body_text text,
  creative_url text, -- URL to the ad creative image/video
  landing_url text,
  cta_text text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'unknown')),
  impressions_estimate text, -- textual range like "10K-50K"
  region text DEFAULT 'global',
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  data_source text DEFAULT 'live' CHECK (data_source IN ('live', 'demo_fallback')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- RLS for ad_creatives
ALTER TABLE ad_creatives ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ad_creatives' AND policyname = 'Owner can manage ad creatives'
  ) THEN
    CREATE POLICY "Owner can manage ad creatives" ON ad_creatives
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 11. Tech stack snapshots table
--     Tracks detected technologies on competitor websites
-- ============================================================
CREATE TABLE IF NOT EXISTS tech_stack_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id uuid REFERENCES scans(id) ON DELETE SET NULL,
  ad_networks jsonb DEFAULT '[]',
  -- Array of { platform, detected, pixelId, evidence }
  tech_stack jsonb DEFAULT '[]',
  -- Array of { category, name, detected, version }
  total_ad_networks integer DEFAULT 0,
  total_tech_detected integer DEFAULT 0,
  captured_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS for tech_stack_snapshots
ALTER TABLE tech_stack_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tech_stack_snapshots' AND policyname = 'Owner can view own tech snapshots'
  ) THEN
    CREATE POLICY "Owner can view own tech snapshots" ON tech_stack_snapshots
      FOR ALL USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

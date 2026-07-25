-- Add updated_at columns and update triggers for tables missing them
ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE ai_insights
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE website_snapshots
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE seo_keywords
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE pricing_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS trg_scans_updated_at ON scans;
CREATE TRIGGER trg_scans_updated_at BEFORE UPDATE ON scans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_alerts_updated_at ON alerts;
CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_insights_updated_at ON ai_insights;
CREATE TRIGGER trg_ai_insights_updated_at BEFORE UPDATE ON ai_insights
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_website_snapshots_updated_at ON website_snapshots;
CREATE TRIGGER trg_website_snapshots_updated_at BEFORE UPDATE ON website_snapshots
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_seo_keywords_updated_at ON seo_keywords;
CREATE TRIGGER trg_seo_keywords_updated_at BEFORE UPDATE ON seo_keywords
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_social_posts_updated_at ON social_posts;
CREATE TRIGGER trg_social_posts_updated_at BEFORE UPDATE ON social_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_pricing_items_updated_at ON pricing_items;
CREATE TRIGGER trg_pricing_items_updated_at BEFORE UPDATE ON pricing_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_advertisements_updated_at ON advertisements;
CREATE TRIGGER trg_advertisements_updated_at BEFORE UPDATE ON advertisements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

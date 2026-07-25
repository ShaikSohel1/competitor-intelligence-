-- Add CHECK constraints for scoped enum-like string columns
ALTER TABLE competitors
  DROP CONSTRAINT IF EXISTS competitors_threat_level_check;
ALTER TABLE competitors
  ADD CONSTRAINT competitors_threat_level_check
  CHECK (threat_level IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE competitors
  DROP CONSTRAINT IF EXISTS competitors_status_check;
ALTER TABLE competitors
  ADD CONSTRAINT competitors_status_check
  CHECK (status IN ('active', 'paused', 'archived'));

ALTER TABLE competitors
  DROP CONSTRAINT IF EXISTS competitors_scan_frequency_check;
ALTER TABLE competitors
  ADD CONSTRAINT competitors_scan_frequency_check
  CHECK (scan_frequency IN ('daily', 'weekly', 'monthly'));

ALTER TABLE scans
  DROP CONSTRAINT IF EXISTS scans_status_check;
ALTER TABLE scans
  ADD CONSTRAINT scans_status_check
  CHECK (status IN ('pending', 'running', 'completed', 'failed'));

ALTER TABLE activity_events
  DROP CONSTRAINT IF EXISTS activity_events_severity_check;
ALTER TABLE activity_events
  ADD CONSTRAINT activity_events_severity_check
  CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical'));

ALTER TABLE activity_events
  DROP CONSTRAINT IF EXISTS activity_events_category_check;
ALTER TABLE activity_events
  ADD CONSTRAINT activity_events_category_check
  CHECK (category IN ('website', 'pricing', 'seo', 'social', 'advertising'));

ALTER TABLE alerts
  DROP CONSTRAINT IF EXISTS alerts_priority_check;
ALTER TABLE alerts
  ADD CONSTRAINT alerts_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE ai_insights
  DROP CONSTRAINT IF EXISTS ai_insights_sentiment_check;
ALTER TABLE ai_insights
  ADD CONSTRAINT ai_insights_sentiment_check
  CHECK (sentiment IN ('positive', 'neutral', 'negative'));

ALTER TABLE seo_keywords
  DROP CONSTRAINT IF EXISTS seo_keywords_trend_check;
ALTER TABLE seo_keywords
  ADD CONSTRAINT seo_keywords_trend_check
  CHECK (trend IN ('up', 'down', 'stable'));

ALTER TABLE seo_keywords
  DROP CONSTRAINT IF EXISTS seo_keywords_opportunity_check;
ALTER TABLE seo_keywords
  ADD CONSTRAINT seo_keywords_opportunity_check
  CHECK (opportunity IN ('low', 'medium', 'high'));

ALTER TABLE pricing_items
  DROP CONSTRAINT IF EXISTS pricing_items_change_type_check;
ALTER TABLE pricing_items
  ADD CONSTRAINT pricing_items_change_type_check
  CHECK (change_type IN ('increase', 'decrease', 'none'));

ALTER TABLE advertisements
  DROP CONSTRAINT IF EXISTS advertisements_status_check;
ALTER TABLE advertisements
  ADD CONSTRAINT advertisements_status_check
  CHECK (status IN ('active', 'paused'));

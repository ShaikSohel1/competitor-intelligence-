-- Add metadata columns to support demo data tagging
ALTER TABLE website_snapshots
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE seo_keywords
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE social_posts
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE pricing_items
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

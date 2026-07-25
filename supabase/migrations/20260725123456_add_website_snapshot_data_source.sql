-- Add a data_source marker for website snapshot provenance
ALTER TABLE website_snapshots
  ADD COLUMN IF NOT EXISTS data_source text NOT NULL DEFAULT 'demo_fallback';

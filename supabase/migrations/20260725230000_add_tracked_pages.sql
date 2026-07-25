-- ===== tracked_pages =====
CREATE TABLE IF NOT EXISTS public.tracked_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  page_type text NOT NULL DEFAULT 'other',
  crawl_frequency text NOT NULL DEFAULT 'weekly',
  last_crawled_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(competitor_id, url)
);

ALTER TABLE public.tracked_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tracked_pages" ON public.tracked_pages;
CREATE POLICY "select_own_tracked_pages" ON public.tracked_pages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_tracked_pages" ON public.tracked_pages;
CREATE POLICY "insert_own_tracked_pages" ON public.tracked_pages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tracked_pages" ON public.tracked_pages;
CREATE POLICY "update_own_tracked_pages" ON public.tracked_pages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_tracked_pages" ON public.tracked_pages;
CREATE POLICY "delete_own_tracked_pages" ON public.tracked_pages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tracked_pages_competitor_id ON public.tracked_pages(competitor_id);
CREATE INDEX IF NOT EXISTS idx_tracked_pages_user_id ON public.tracked_pages(user_id);

DROP TRIGGER IF EXISTS trg_tracked_pages_updated_at ON public.tracked_pages;
CREATE TRIGGER trg_tracked_pages_updated_at BEFORE UPDATE ON public.tracked_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Competitor } from '@/types';

/**
 * Shared hook for pages that show cross-competitor data with a competitor filter.
 * Returns the competitor list plus a loading flag.
 */
export function useCompetitorList() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCompetitors((data ?? []) as Competitor[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { competitors, loading, error, refresh: load };
}

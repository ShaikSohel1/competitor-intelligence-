import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Competitor, ActivityEvent, Alert, AiInsight } from '@/types';

interface DashboardData {
  competitors: Competitor[];
  recentEvents: ActivityEvent[];
  alerts: Alert[];
  executiveSummary: AiInsight | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDashboardData(): DashboardData {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [executiveSummary, setExecutiveSummary] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [compRes, eventRes, alertRes, summaryRes] = await Promise.all([
        supabase.from('competitors').select('*').order('created_at', { ascending: false }),
        supabase
          .from('activity_events')
          .select('*, competitor:competitors(name, website)')
          .order('detected_at', { ascending: false })
          .limit(20),
        supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('ai_insights')
          .select('*')
          .eq('insight_type', 'executive_summary')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (compRes.error) throw compRes.error;
      if (eventRes.error) throw eventRes.error;
      if (alertRes.error) throw alertRes.error;
      if (summaryRes.error) throw summaryRes.error;

      setCompetitors((compRes.data ?? []) as Competitor[]);
      setRecentEvents((eventRes.data ?? []) as ActivityEvent[]);
      setAlerts((alertRes.data ?? []) as Alert[]);
      setExecutiveSummary((summaryRes.data ?? null) as AiInsight | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { competitors, recentEvents, alerts, executiveSummary, loading, error, refresh: load };
}

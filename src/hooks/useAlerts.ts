import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AlertsState {
  unreadCount: number;
  refresh: () => Promise<void>;
}

let cachedUnread = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function useAlerts(): AlertsState {
  const [unreadCount, setUnreadCount] = useState(cachedUnread);

  useEffect(() => {
    const update = () => setUnreadCount(cachedUnread);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  return {
    unreadCount,
    async refresh() {
      const { count, error } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);
      if (!error) {
        cachedUnread = count ?? 0;
        emit();
      }
    },
  };
}

export function bumpUnreadCache(delta: number) {
  cachedUnread = Math.max(0, cachedUnread + delta);
  emit();
}

export function setUnreadCache(value: number) {
  cachedUnread = Math.max(0, value);
  emit();
}

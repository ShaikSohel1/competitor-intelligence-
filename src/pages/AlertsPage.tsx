import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, RefreshCw, CheckCheck, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchAlerts, markAlertRead, markAllAlertsRead, deleteAlert } from '@/lib/api';
import { setUnreadCache } from '@/hooks/useAlerts';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { priorityStyle, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Alert } from '@/types';

const CATEGORY_COLORS: Record<string, string> = {
  website: 'bg-info/15 text-info',
  seo: 'bg-chart-2/15 text-chart-2',
  social: 'bg-chart-5/15 text-chart-5',
  pricing: 'bg-success/15 text-success',
  advertising: 'bg-warning/15 text-warning',
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts(false, 100);
      setAlerts(data);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = tab === 'unread' ? alerts.filter((a) => !a.read) : alerts;

  async function handleMarkRead(id: string) {
    try {
      await markAlertRead(id, true);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
      const unread = alerts.filter((a) => !a.read && a.id !== id).length;
      setUnreadCache(unread);
    } catch (err) {
      toast({ title: 'Failed to update alert', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  }

  async function handleMarkAll() {
    try {
      await markAllAlertsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCache(0);
      toast({ title: 'All alerts marked as read' });
    } catch (err) {
      toast({ title: 'Failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      const unread = alerts.filter((a) => !a.read && a.id !== id).length;
      setUnreadCache(unread);
    } catch (err) {
      toast({ title: 'Failed to delete alert', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Important competitor activities that need your attention."
        actions={
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={!alerts.some((a) => !a.read)}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({alerts.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({alerts.filter((a) => !a.read).length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={tab === 'unread' ? 'No unread alerts' : 'No alerts yet'}
              description={tab === 'unread' ? 'You are all caught up.' : 'Run scans on competitors to surface alerts.'}
            />
          ) : (
            visible.map((alert) => {
              const ps = priorityStyle(alert.priority);
              return (
                <Card key={alert.id} className={cn(!alert.read && 'border-accent/40')}>
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', CATEGORY_COLORS[alert.category] ?? 'bg-muted text-muted-foreground')}>
                      <Bell className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        {!alert.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{alert.message}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={ps.className}>{ps.label}</Badge>
                        <Badge variant="outline" className="capitalize">{alert.category}</Badge>
                        {(alert as unknown as { competitor?: { name?: string } }).competitor?.name && (
                          <Link to={`/app/competitors/${alert.competitor_id}`} className="hover:text-foreground">
                            {(alert as unknown as { competitor?: { name?: string } }).competitor?.name}
                          </Link>
                        )}
                        <span>· {formatRelativeTime(alert.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {!alert.read && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkRead(alert.id)} aria-label="Mark read">
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(alert.id)} aria-label="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

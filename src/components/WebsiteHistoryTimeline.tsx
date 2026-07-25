import React, { useState, useEffect } from 'react';
import { History, Globe, Code, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WebsiteHistoryTimelineProps {
  competitorId: string;
}

interface Snapshot {
  id: string;
  captured_at: string;
  data_source: string;
  changed: boolean;
  structural_snapshot: any;
  changes_summary?: Record<string, any>;
}

export function WebsiteHistoryTimeline({ competitorId }: WebsiteHistoryTimelineProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchSnapshots() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('website_snapshots')
          .select('*')
          .eq('competitor_id', competitorId)
          .order('captured_at', { ascending: false })
          .limit(10);

        if (error) {
          throw error;
        }

        setSnapshots(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch snapshots');
      } finally {
        setLoading(false);
      }
    }

    if (competitorId) {
      fetchSnapshots();
    }
  }, [competitorId]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-destructive">
          <p>Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Website History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
            <Globe className="h-10 w-10 mb-3 opacity-20" />
            <p>No website history found.</p>
          </div>
        ) : (
          <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
            {snapshots.map((snapshot, index) => (
              <div key={snapshot.id} className="relative pl-6">
                <div className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary ring-2 ring-background" />
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {formatDate(snapshot.captured_at)}
                      </span>

                      {snapshot.changed && (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                          Changed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {snapshot.changed && snapshot.changes_summary && (
                    <div className="bg-muted/50 rounded-md p-3 text-sm flex items-start gap-2">
                      <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-foreground mb-1">Changes detected</p>
                        <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                          {Object.entries(snapshot.changes_summary).map(([key, val]) => (
                            <li key={key}>
                              <span className="capitalize">{key.replace(/_/g, ' ')}</span>: {String(val)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {snapshot.structural_snapshot && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(snapshot.id)}
                        className="text-xs h-8 px-2 flex items-center gap-1"
                      >
                        <Code className="h-3.5 w-3.5" />
                        {expandedItems.has(snapshot.id) ? 'Hide JSON' : 'Expand JSON'}
                        {expandedItems.has(snapshot.id) ? (
                          <ChevronUp className="h-3 w-3 ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                      
                      {expandedItems.has(snapshot.id) && (
                        <div className="mt-2 bg-slate-950 rounded-md p-4 overflow-x-auto">
                          <pre className="text-xs text-slate-50 font-mono">
                            {JSON.stringify(snapshot.structural_snapshot, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

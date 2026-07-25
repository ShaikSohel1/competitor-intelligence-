import { useCallback, useEffect, useState } from 'react';
import { FileText, Sparkles, Loader2, Trash2, Eye, ChevronRight, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchReports, generateReport, deleteReport } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Report } from '@/types';

export function ReportsPage() {
  const { user } = useAuth();
  const { competitors } = useCompetitorList();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewing, setViewing] = useState<Report | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReports(30);
      setReports(data);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    if (!user) return;
    setGenerating(true);
    try {
      const report = await generateReport(selectedIds, 7);
      toast({ title: 'Report generated', description: report.title });
      setGenOpen(false);
      setSelectedIds([]);
      await load();
    } catch (err) {
      toast({ title: 'Report generation failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteReport(deleteId);
      toast({ title: 'Report deleted' });
      setDeleteId(null);
      await load();
    } catch (err) {
      toast({ title: 'Delete failed', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    }
  }

  function toggleId(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="AI-generated weekly competitor intelligence reports."
        actions={
          <Button onClick={() => setGenOpen(true)} disabled={competitors.length === 0}>
            <Sparkles className="mr-2 h-4 w-4" /> Generate Report
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description={competitors.length === 0 ? 'Add competitors first, then generate a report.' : 'Generate your first AI-powered competitor report.'}
          action={competitors.length > 0 ? <Button onClick={() => setGenOpen(true)}><Sparkles className="mr-2 h-4 w-4" /> Generate Report</Button> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {reports.map((r) => (
            <Card key={r.id} className="flex flex-col transition-all hover:shadow-md">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="capitalize">{r.scope}</Badge>
                </div>
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{r.summary}</p>
                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">{r.sections?.length ?? 0} sections · {r.competitor_ids?.length ?? 0} competitors</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setViewing(r)}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate dialog */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate competitor report</DialogTitle>
            <DialogDescription>Select competitors to include. The AI will analyze the last 7 days of activity.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-thin">
            {competitors.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                <Checkbox checked={selectedIds.includes(c.id)} onCheckedChange={() => toggleId(c.id)} />
                <span className="text-sm font-medium">{c.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{c.industry}</span>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
              <Checkbox
                checked={selectedIds.length === 0}
                onCheckedChange={() => setSelectedIds([])}
              />
              <span className="text-sm font-medium">All competitors</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View report dialog */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto scrollbar-thin">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{viewing.title}</DialogTitle>
                <DialogDescription>{formatDate(viewing.period_start)} — {formatDate(viewing.period_end)} · {viewing.scope} scope</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-semibold text-muted-foreground">Executive Summary</p>
                  <p className="mt-2 text-sm leading-relaxed">{viewing.summary}</p>
                </div>
                {viewing.sections?.map((section, i) => (
                  <div key={i}>
                    <h3 className="text-base font-semibold">{section.heading}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{section.body}</p>
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {section.bullets.map((b, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {viewing.recommendations && viewing.recommendations.length > 0 && (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <h3 className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="h-4 w-4 text-accent" /> Recommendations
                    </h3>
                    <ol className="mt-2 space-y-2">
                      {viewing.recommendations.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-foreground/90">
                          <span className="font-bold text-accent">{i + 1}.</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the report. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

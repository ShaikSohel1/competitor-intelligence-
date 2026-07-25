import { Badge } from '@/components/ui/badge';
import { priorityStyle } from '@/lib/format';
import { ChevronRight, ShieldAlert, Target, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Priority } from '@/types';

interface StructuredInsightContentProps {
  content: string;
  recommendations?: string[] | null;
}

export function StructuredInsightContent({ content, recommendations }: StructuredInsightContentProps) {
  let data: any = null;

  if (typeof content === 'string' && content.trim().startsWith('{')) {
    try {
      data = JSON.parse(content);
    } catch {
      data = null;
    }
  }

  if (!data || typeof data !== 'object') {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{content}</p>
        {recommendations && recommendations.length > 0 && (
          <ul className="space-y-1.5 border-t pt-3">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // 1. Research Overview (summary)
  if ('overview' in data || 'positioning' in data) {
    return (
      <div className="space-y-3 text-sm">
        {data.overview && (
          <p className="leading-relaxed text-foreground/90">{data.overview}</p>
        )}

        {data.products && Array.isArray(data.products) && data.products.length > 0 && (
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Offerings</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {data.products.map((p: string, i: number) => (
                <Badge key={i} variant="outline" className="bg-muted/40 font-normal">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {data.target_audience && (
          <div className="rounded-lg bg-muted/30 p-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Audience</span>
            <p className="mt-1 text-xs text-foreground/90">{data.target_audience}</p>
          </div>
        )}

        {data.positioning && (
          <div className="rounded-lg border p-3 bg-card">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Market Positioning</span>
            <p className="mt-1 text-xs text-foreground/90">{data.positioning}</p>
          </div>
        )}
      </div>
    );
  }

  // 2. Change Detection
  if ('changes' in data && Array.isArray(data.changes)) {
    return (
      <div className="space-y-2 text-sm">
        {data.changes.map((c: any, i: number) => {
          const pStyle = priorityStyle((c.importance as Priority) || 'medium');
          return (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-card">
              <div className="flex items-start gap-2 min-w-0">
                <Badge variant="outline" className="capitalize shrink-0">{c.category || 'change'}</Badge>
                <span className="text-foreground/90 font-medium">{c.description}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {c.impact_score && (
                  <span className="text-xs font-semibold text-muted-foreground">Impact: {c.impact_score}/10</span>
                )}
                <Badge variant="secondary" className={pStyle.className}>
                  {c.importance}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // 3. Marketing Intelligence (strategy & trends)
  if ('strategy_analysis' in data || 'emerging_trends' in data) {
    return (
      <div className="space-y-4 text-sm">
        {data.strategy_analysis && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strategy Analysis</h4>
            <p className="mt-1 leading-relaxed text-foreground/90">{data.strategy_analysis}</p>
          </div>
        )}

        {data.emerging_trends && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emerging Trends</h4>
            <p className="mt-1 leading-relaxed text-foreground/90">{data.emerging_trends}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 pt-1">
          {data.strengths && Array.isArray(data.strengths) && data.strengths.length > 0 && (
            <div className="rounded-lg border border-success/20 bg-success/5 p-3">
              <h5 className="flex items-center gap-1.5 text-xs font-bold text-success uppercase tracking-wider">
                <CheckCircle className="h-3.5 w-3.5" /> Strengths
              </h5>
              <ul className="mt-2 space-y-1 text-xs text-foreground/90">
                {data.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-success font-bold">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.weaknesses && Array.isArray(data.weaknesses) && data.weaknesses.length > 0 && (
            <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
              <h5 className="flex items-center gap-1.5 text-xs font-bold text-warning uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5" /> Weaknesses
              </h5>
              <ul className="mt-2 space-y-1 text-xs text-foreground/90">
                {data.weaknesses.map((w: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-warning font-bold">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. Opportunity & Threat Matrix
  if ('opportunities' in data || 'threats' in data) {
    return (
      <div className="space-y-4 text-sm">
        {data.opportunities && Array.isArray(data.opportunities) && data.opportunities.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-success uppercase tracking-wider mb-2">
              <Target className="h-4 w-4" /> Opportunities
            </h4>
            <div className="space-y-2">
              {data.opportunities.map((o: any, i: number) => {
                const pStyle = priorityStyle((o.priority as Priority) || 'medium');
                return (
                  <div key={i} className="p-3 rounded-lg border border-success/20 bg-success/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{o.description}</span>
                      <Badge variant="secondary" className={pStyle.className}>{o.priority}</Badge>
                    </div>
                    {typeof o.confidence === 'number' && (
                      <div className="text-[11px] text-muted-foreground">
                        {Math.round(o.confidence * 100)}% confidence
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.threats && Array.isArray(data.threats) && data.threats.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-destructive uppercase tracking-wider mb-2">
              <ShieldAlert className="h-4 w-4" /> Threats
            </h4>
            <div className="space-y-2">
              {data.threats.map((t: any, i: number) => {
                const pStyle = priorityStyle((t.priority as Priority) || 'high');
                return (
                  <div key={i} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{t.description}</span>
                      <Badge variant="secondary" className={pStyle.className}>{t.priority}</Badge>
                    </div>
                    {typeof t.confidence === 'number' && (
                      <div className="text-[11px] text-muted-foreground">
                        {Math.round(t.confidence * 100)}% confidence
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. Actions / Recommendations
  if ('actions' in data && Array.isArray(data.actions)) {
    return (
      <div className="space-y-2 text-sm">
        {data.actions.map((act: any, i: number) => {
          const pStyle = priorityStyle((act.priority as Priority) || 'medium');
          return (
            <div key={i} className="p-3 rounded-lg border bg-card space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
                    {i + 1}
                  </span>
                  <span className="font-medium text-foreground">{act.action}</span>
                </div>
                <Badge variant="secondary" className={pStyle.className}>{act.priority}</Badge>
              </div>
              {act.expected_impact && (
                <div className="pl-7 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">Expected Impact:</span> {act.expected_impact}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback for any other object shape
  return <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{content}</p>;
}

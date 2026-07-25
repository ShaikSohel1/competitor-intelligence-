import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, RefreshCw, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { useCompetitorList } from '@/hooks/useCompetitorList';
import { fetchChatMessages, sendChatMessage } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { CompetitorFilter } from '@/components/CompetitorFilter';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelativeTime } from '@/lib/format';
import type { ChatMessage, ChatMessageSource } from '@/types';

export function AiAssistantPage() {
  const { competitors } = useCompetitorList();
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const compId = selectedCompetitor === 'all' ? undefined : selectedCompetitor;
      const data = await fetchChatMessages(compId);
      setMessages(data);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompetitor]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const questionText = input.trim();
    if (!questionText || sending) return;

    setInput('');
    const tempUserId = 'user-temp-' + Date.now();
    const compId = selectedCompetitor === 'all' ? null : selectedCompetitor;

    const userMsg: ChatMessage = {
      id: tempUserId,
      user_id: '',
      competitor_id: compId,
      role: 'user',
      content: questionText,
      sources: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await sendChatMessage(
        questionText,
        selectedCompetitor === 'all' ? undefined : selectedCompetitor
      );

      const assistantMsg: ChatMessage = {
        id: 'assistant-temp-' + Date.now(),
        user_id: '',
        competitor_id: compId,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: 'error-temp-' + Date.now(),
        user_id: '',
        competitor_id: compId,
        role: 'assistant',
        content: err instanceof Error ? `Error: ${err.message}` : 'Failed to send message.',
        sources: [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your competitors using RAG-powered intelligence retrieval."
        actions={
          <div className="flex items-center gap-3">
            <CompetitorFilter
              competitors={competitors}
              value={selectedCompetitor}
              onChange={setSelectedCompetitor}
            />
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="flex flex-col h-[calc(100vh-14rem)] min-h-[500px]">
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4 ml-auto rounded-2xl" />
                <Skeleton className="h-24 w-3/4 rounded-2xl" />
                <Skeleton className="h-16 w-2/3 ml-auto rounded-2xl" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="Ask CompeteIQ AI"
                description={
                  selectedCompetitor === 'all'
                    ? "Ask anything across your competitor portfolio (e.g., 'Compare pricing tiers' or 'Who is ranking highest for CRM keywords?')"
                    : "Ask targeted questions about this competitor's activities, SEO ranks, pricing changes, or ads."
                }
              />
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const hasSources = msg.sources && msg.sources.length > 0;
                const isExpanded = expandedSources[msg.id];

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent mt-1">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm shadow-sm ${
                        isUser
                          ? 'bg-primary text-primary-foreground rounded-tr-xs'
                          : 'bg-card border text-card-foreground rounded-tl-xs space-y-3'
                      }`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      {!isUser && hasSources && (
                        <div className="border-t pt-2 mt-2 text-xs">
                          <button
                            type="button"
                            onClick={() => toggleSources(msg.id)}
                            className="flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Database className="h-3.5 w-3.5" />
                            <span>{msg.sources!.length} source context {msg.sources!.length === 1 ? 'chip' : 'chips'}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {msg.sources!.map((src: ChatMessageSource, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-[11px] py-1 px-2.5 bg-muted/40 font-normal max-w-full truncate flex items-center gap-1"
                                >
                                  <span className="font-semibold text-primary capitalize">
                                    {src.source_table.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="truncate max-w-[220px]">
                                    {src.content}
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`text-[10px] mt-1 ${isUser ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>
                        {formatRelativeTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex items-start gap-3 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent mt-1">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-card border text-card-foreground p-4 text-sm shadow-sm flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  <span>Searching intelligence database & generating response...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom input section */}
          <div className="p-3 sm:p-4 border-t bg-card/50">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedCompetitor === 'all'
                    ? 'Ask a question across all competitors...'
                    : 'Ask a question about this competitor...'
                }
                disabled={sending}
                className="flex-1"
              />
              <Button type="submit" disabled={sending || !input.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only sm:not-sr-only sm:ml-2">Send</span>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

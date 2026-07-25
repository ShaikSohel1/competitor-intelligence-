import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import {
  CompetitorRow,
  deriveActivityEvents,
  deriveAlerts,
  synthesizeSnapshot,
} from "../_shared/synthesize.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );
}

interface WebsiteFetchResult {
  success: boolean;
  data_source: "live" | "demo_fallback";
  website?: {
    status_code: number;
    title: string;
    meta_description: string;
    h1_count: number;
    word_count: number;
    content_hash: string;
  };
  error?: string;
}

function normalizeWebsiteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) throw new Error("Invalid website URL");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.trim() ?? null;
}

function extractMetaDescription(html: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (/\bname\s*=\s*(["'])description\1/i.test(tag)) {
      const contentMatch = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
      if (contentMatch?.[2]) return contentMatch[2].trim();
    }
  }
  return null;
}

function countH1(html: string): number {
  return (html.match(/<h1\b[^>]*>/gi) ?? []).length;
}

function extractVisibleText(html: string): string {
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const source = bodyMatch?.[1] ?? html;
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function computeContentHash(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function extractVisibleTextWordCount(html: string): number {
  const cleaned = extractVisibleText(html);
  return cleaned ? cleaned.split(" ").filter(Boolean).length : 0;
}

async function fetchWebsiteData(url: string): Promise<WebsiteFetchResult> {
  let controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const normalizedUrl = normalizeWebsiteUrl(url);
    const response = await fetch(normalizedUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; CompeteIQ/1.0; +https://example.com)",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        success: false,
        data_source: "demo_fallback",
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const visibleText = extractVisibleText(html);
    return {
      success: true,
      data_source: "live",
      website: {
        status_code: response.status,
        title: extractTitle(html) ?? "",
        meta_description: extractMetaDescription(html) ?? "",
        h1_count: countH1(html),
        word_count: visibleText ? visibleText.split(" ").filter(Boolean).length : 0,
        content_hash: computeContentHash(visibleText),
      },
    };
  } catch (error) {
    return {
      success: false,
      data_source: "demo_fallback",
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timeoutId);
    controller = new AbortController();
  }
}

function computeActivityScore(snap: ReturnType<typeof synthesizeSnapshot>): number {
  let score = 20;
  score += snap.socialPosts.length * 4;
  score += snap.advertisements.length * 6;
  score += snap.pricingItems.filter((p) => p.change_type !== "none").length * 5;
  score += snap.seoKeywords.filter((k) => k.trend === "up").length * 3;
  return Math.min(100, score);
}

function computeThreatLevel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

/* ----- Optional Gemini enrichment ----- */
async function geminiSummary(prompt: string): Promise<string | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 400 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const { competitorId } = await req.json();
    if (typeof competitorId !== "string") {
      return json({ error: "competitorId is required" }, 400);
    }

    const sb = adminClient();

    const { data: competitor, error: cErr } = await sb
      .from("competitors")
      .select("*")
      .eq("id", competitorId)
      .maybeSingle() as { data: CompetitorRow | null; error: unknown };

    if (cErr) throw cErr;
    if (!competitor) return json({ error: "Competitor not found" }, 404);

    const { data: scan, error: sErr } = await sb
      .from("scans")
      .insert({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        status: "running",
        scan_type: "full",
      })
      .select()
      .single();

    if (sErr) throw sErr;

    const snap = synthesizeSnapshot(competitor);
    const websiteFetch = await fetchWebsiteData(competitor.website);
    if (websiteFetch.success && websiteFetch.website) {
      snap.website = {
        ...snap.website,
        status_code: websiteFetch.website.status_code,
        title: websiteFetch.website.title || snap.website.title,
        meta_description:
          websiteFetch.website.meta_description || snap.website.meta_description,
        h1_count: websiteFetch.website.h1_count,
        word_count: websiteFetch.website.word_count,
        content_hash: websiteFetch.website.content_hash,
      };
    }

    const { data: previousWebsiteSnapshot } = await sb
      .from("website_snapshots")
      .select("content_hash, word_count")
      .eq("competitor_id", competitor.id)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { content_hash: string; word_count: number } | null; error: unknown };

    const websiteChanged = previousWebsiteSnapshot
      ? previousWebsiteSnapshot.content_hash !== snap.website.content_hash ||
        previousWebsiteSnapshot.word_count !== snap.website.word_count
      : false;

    const seoKeywords = snap.seoKeywords.map((kw) => kw.keyword);
    const previousSeoRanks: Record<string, number | null> = {};
    if (seoKeywords.length) {
      const { data: previousSeoRows } = await sb
        .from("seo_keywords")
        .select("keyword, rank")
        .eq("competitor_id", competitor.id)
        .in("keyword", seoKeywords)
        .order("captured_at", { ascending: false });

      for (const previousRow of previousSeoRows ?? []) {
        if (previousRow?.keyword && previousRow.keyword !== undefined && !(previousRow.keyword in previousSeoRanks)) {
          previousSeoRanks[previousRow.keyword] = previousRow.rank ?? null;
        }
      }
    }

    const events = deriveActivityEvents(competitor, snap, websiteChanged, previousSeoRanks);
    const alerts = deriveAlerts(competitor, events);
    const activityScore = computeActivityScore(snap);
    const threatLevel = computeThreatLevel(activityScore);

    // Persist website snapshot
    await sb.from("website_snapshots").insert({
      competitor_id: competitor.id,
      user_id: competitor.user_id,
      scan_id: scan.id,
      url: competitor.website,
      ...snap.website,
      data_source: websiteFetch.data_source,
      changed: websiteChanged,
    });

    // Persist SEO keywords
    await sb.from("seo_keywords").insert(
      snap.seoKeywords.map((kw) => ({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        ...kw,
        previous_rank: previousSeoRanks[kw.keyword] ?? null,
      })),
    );

    // Persist social posts
    await sb.from("social_posts").insert(
      snap.socialPosts.map((p) => ({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        ...p,
      })),
    );

    // Persist pricing items
    await sb.from("pricing_items").insert(
      snap.pricingItems.map((p) => ({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        ...p,
      })),
    );

    // Persist advertisements
    await sb.from("advertisements").insert(
      snap.advertisements.map((a) => ({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        ...a,
        first_seen_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      })),
    );

    // Persist activity events
    await sb.from("activity_events").insert(
      events.map((e) => ({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        scan_id: scan.id,
        detected_at: new Date().toISOString(),
        ...e,
      })),
    );

    // Persist alerts
    if (alerts.length) {
      await sb.from("alerts").insert(
        alerts.map((a) => ({
          competitor_id: competitor.id,
          user_id: competitor.user_id,
          ...a,
        })),
      );
    }

    // AI summary (optional, falls back to deterministic)
    const fallbackSummary = `${competitor.name} scan complete: ${events.length} activity signals detected across website, SEO, social, pricing, and advertising. Activity score ${activityScore}/100 (${threatLevel} threat).`;
    const aiSummary = (await geminiSummary(
      `You are a competitor intelligence analyst. Summarize this competitor scan in 2-3 concise sentences for a business audience. Competitor: ${competitor.name} (${snap.industry}). Detected: ${events.map((e) => e.title).join("; ")}. Activity score: ${activityScore}/100.`,
    )) ?? fallbackSummary;

    // Update scan + competitor
    await sb.from("scans").update({
      status: "completed",
      changes_detected: events.length,
      ai_summary: aiSummary,
      completed_at: new Date().toISOString(),
      raw_data: { industry: snap.industry },
    }).eq("id", scan.id);

    await sb.from("competitors").update({
      activity_score: activityScore,
      threat_level: threatLevel,
      last_scanned_at: new Date().toISOString(),
    }).eq("id", competitor.id);

    // Fire index-competitor-data asynchronously (non-blocking)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      fetch(`${supabaseUrl}/functions/v1/index-competitor-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({ competitorId: competitor.id }),
      }).catch((err) => console.error("Failed to index competitor data:", err));
    } catch (err) {
      console.error("Error triggering index-competitor-data:", err);
    }

    return json({ scanId: scan.id, summary: aiSummary, changesDetected: events.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scan failed";
    return json({ error: msg }, 500);
  }
});

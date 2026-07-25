/**
 * scan-competitor/index.ts — Radar v2 Scan Pipeline
 *
 * Orchestrates real competitor intelligence scraping across 5 channels:
 *   1. Website structure & content (change detection, SEO metadata)
 *   2. SEO & keywords (SERP rank checks, on-page analysis)
 *   3. Social media (profile scraping across 5 platforms)
 *   4. Pricing (tier extraction from pricing pages)
 *   5. Advertising & tech stack (ad pixel detection, tech stack fingerprinting)
 *
 * Falls back gracefully to synthesized demo data when live scraping fails.
 */

import { createClient } from "npm:@supabase/supabase-js@2.58.0";
export interface CompetitorRow {
  id: string;
  user_id: string;
  name: string;
  website: string;
  industry: string | null;
  description: string | null;
  tracked_keywords: string[] | null;
}
import { scrapeAllSocialProfiles, type SocialProfileData } from "../_shared/social-scraper.ts";
import { runSeoAnalysis, extractOnPageSeo, type SeoScrapeResult } from "../_shared/seo-scraper.ts";
import { scrapePricingPage, discoverPricingUrl, type ScrapedPricingResult } from "../_shared/pricing-scraper.ts";
import { detectAllFromHtml, type DetectedAdNetworks, type TechStackResult } from "../_shared/ad-detector.ts";
import {
  extractWebsiteStructure,
  detectStructuralChanges,
  type WebsiteStructure,
  type ChangeSignal,
} from "../_shared/change-detector.ts";
import { buildScanAnalysisPrompt, type ScanAnalysisParams } from "../_shared/monitoring-prompt.ts";

/* ─────────── HTTP helpers ─────────── */

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

/* ─────────── Website fetching ─────────── */

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface WebsiteFetchResult {
  success: boolean;
  data_source: "live" | "demo_fallback";
  html?: string;
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

async function fetchWebsiteData(url: string): Promise<WebsiteFetchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const normalizedUrl = normalizeWebsiteUrl(url);
    const response = await fetch(normalizedUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
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
    const words = visibleText ? visibleText.split(" ").filter(Boolean) : [];
    return {
      success: true,
      data_source: "live",
      html,
      website: {
        status_code: response.status,
        title: extractTitle(html) ?? "",
        meta_description: extractMetaDescription(html) ?? "",
        h1_count: countH1(html),
        word_count: words.length,
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
  }
}

/* ─────────── Score computation ─────────── */

interface ScanChannelResults {
  websiteFetch: WebsiteFetchResult;
  socialProfiles: SocialProfileData[];
  seoResult: SeoScrapeResult;
  pricingResult: ScrapedPricingResult | null;
  adDetection: { ads: DetectedAdNetworks; techStack: TechStackResult } | null;
  structuralChanges: ChangeSignal[];
  currentStructure: WebsiteStructure | null;
}

function computeActivityScore(
  channels: ScanChannelResults,
): number {
  let score = 20;

  // Social signals
  score += channels.socialProfiles.length * 5;
  if (channels.socialProfiles.some(p => p.recentPosts.length > 0)) score += 10;

  // Ad signals
  if (channels.adDetection) {
    score += channels.adDetection.ads.totalActiveCount * 4;
  }

  // Pricing signals
  if (channels.pricingResult && channels.pricingResult.plans.length > 0) {
    score += 5;
  }

  // SEO signals
  score += channels.seoResult.rankings.filter(r => r.rankPosition !== null && r.rankPosition <= 10).length * 4;

  // Structural change signals
  const highSeverityChanges = channels.structuralChanges.filter(
    c => c.severity === "high" || c.severity === "critical"
  );
  score += highSeverityChanges.length * 8;
  score += channels.structuralChanges.filter(c => c.severity === "medium").length * 4;

  return Math.min(100, score);
}

function computeThreatLevel(score: number): string {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

/* ─────────── Gemini AI ─────────── */

async function geminiAnalysis(prompt: string, maxTokens = 800): Promise<string | null> {
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
          generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens },
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

/* ─────────── Alert rules evaluation ─────────── */

interface AlertRule {
  id: string;
  name: string;
  rule_type: string;
  conditions: Record<string, unknown>;
  severity: string;
}

function evaluateAlertRules(
  rules: AlertRule[],
  channels: ScanChannelResults,
  websiteChanged: boolean,
): Array<{ ruleId: string; title: string; message: string; category: string; priority: string }> {
  const triggered: Array<{ ruleId: string; title: string; message: string; category: string; priority: string }> = [];

  for (const rule of rules) {
    if (rule.rule_type === "price_change") {
      const changePercent = (rule.conditions.change_percent as number) ?? 0;
      // Removed mock pricing alert evaluation
    } else if (rule.rule_type === "website_change") {
      const categories = (rule.conditions.categories as string[]) ?? [];
      for (const change of channels.structuralChanges) {
        if (categories.length === 0 || categories.includes(change.category)) {
          triggered.push({
            ruleId: rule.id,
            title: `Rule "${rule.name}": ${change.title}`,
            message: change.description,
            category: "website",
            priority: rule.severity,
          });
        }
      }
    } else if (rule.rule_type === "seo_rank_change") {
      for (const ranking of channels.seoResult.rankings) {
        if (ranking.rankPosition !== null && ranking.rankPosition <= 10) {
          triggered.push({
            ruleId: rule.id,
            title: `Rule "${rule.name}": "${ranking.keyword}" entered top 10`,
            message: `Now ranking #${ranking.rankPosition} for "${ranking.keyword}"`,
            category: "seo",
            priority: rule.severity,
          });
        }
      }
    } else if (rule.rule_type === "new_ad_campaign" && channels.adDetection) {
      if (channels.adDetection.ads.totalActiveCount > 0) {
        const activeNetworks = channels.adDetection.ads.networks
          .filter(n => n.detected)
          .map(n => n.platform);
        triggered.push({
          ruleId: rule.id,
          title: `Rule "${rule.name}": Ad pixels detected`,
          message: `Active ad networks: ${activeNetworks.join(", ")}`,
          category: "advertising",
          priority: rule.severity,
        });
      }
    } else if (rule.rule_type === "tech_stack_change") {
      const techChanges = channels.structuralChanges.filter(c => c.category === "tech_stack_shift");
      for (const change of techChanges) {
        triggered.push({
          ruleId: rule.id,
          title: `Rule "${rule.name}": ${change.title}`,
          message: change.description,
          category: "website",
          priority: rule.severity,
        });
      }
    } else if (rule.rule_type === "any_critical_change") {
      const criticalChanges = channels.structuralChanges.filter(
        c => c.severity === "critical" || c.severity === "high"
      );
      for (const change of criticalChanges) {
        triggered.push({
          ruleId: rule.id,
          title: `Rule "${rule.name}": ${change.title}`,
          message: change.description,
          category: change.category === "positioning_pivot" ? "website" : "website",
          priority: "critical",
        });
      }
    }
  }

  return triggered;
}

/* ─────────── Main handler ─────────── */

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
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    /* ── 1. Load competitor ── */
    const { data: competitor, error: cErr } = await sb
      .from("competitors")
      .select("*")
      .eq("id", competitorId)
      .maybeSingle() as { data: (CompetitorRow & { social_links?: Record<string, string>; pricing_url?: string }) | null; error: unknown };

    if (cErr) throw cErr;
    if (!competitor) return json({ error: "Competitor not found" }, 404);

    /* ── 2. Create scan record ── */
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

    /* ── 3. Generate synthesized baseline (always, for fallback) ── */
    const snap = synthesizeSnapshot(competitor);

    /* ── 4. Fetch website HTML (primary data source) ── */
    const websiteFetch = await fetchWebsiteData(competitor.website);
    const liveHtml = websiteFetch.html;

    if (websiteFetch.success && websiteFetch.website) {
      snap.website = {
        ...snap.website,
        status_code: websiteFetch.website.status_code,
        title: websiteFetch.website.title || snap.website.title,
        meta_description: websiteFetch.website.meta_description || snap.website.meta_description,
        h1_count: websiteFetch.website.h1_count,
        word_count: websiteFetch.website.word_count,
        content_hash: websiteFetch.website.content_hash,
      };
    }

    /* ── 5. Run all scrapers concurrently ── */
    const socialLinks = competitor.social_links ?? {};
    const trackedKeywords = competitor.tracked_keywords ?? [];
    const pricingUrl = (competitor as Record<string, unknown>).pricing_url as string | undefined;

    // Discover pricing URL if not set
    let resolvedPricingUrl = pricingUrl;
    if (!resolvedPricingUrl) {
      try {
        resolvedPricingUrl = await discoverPricingUrl(competitor.website) ?? undefined;
      } catch { /* ignore */ }
    }

    const [
      socialResult,
      seoResult,
      pricingResult,
    ] = await Promise.allSettled([
      scrapeAllSocialProfiles(socialLinks),
      runSeoAnalysis(competitor.website, trackedKeywords, liveHtml),
      resolvedPricingUrl ? scrapePricingPage(resolvedPricingUrl, geminiApiKey) : Promise.resolve(null),
    ]);

    const socialProfiles: SocialProfileData[] =
      socialResult.status === "fulfilled" ? socialResult.value : [];
    const seoData: SeoScrapeResult =
      seoResult.status === "fulfilled" ? seoResult.value : { rankings: [], suggestions: [], onPageSeo: null };
    const pricingData: ScrapedPricingResult | null =
      pricingResult.status === "fulfilled" ? pricingResult.value : null;

    /* ── 6. Ad detection & tech stack (from live HTML) ── */
    let adTechResult: { ads: DetectedAdNetworks; techStack: TechStackResult } | null = null;
    if (liveHtml) {
      adTechResult = detectAllFromHtml(liveHtml);
    }

    /* ── 7. Structural change detection ── */
    let currentStructure: WebsiteStructure | null = null;
    let structuralChanges: ChangeSignal[] = [];

    if (liveHtml) {
      currentStructure = extractWebsiteStructure(liveHtml, competitor.website);

      // Load previous structural snapshot for comparison
      const { data: prevSnapshot } = await sb
        .from("website_snapshots")
        .select("structural_snapshot")
        .eq("competitor_id", competitor.id)
        .order("captured_at", { ascending: false })
        .limit(1)
        .maybeSingle() as { data: { structural_snapshot: WebsiteStructure | null } | null; error: unknown };

      if (prevSnapshot?.structural_snapshot) {
        structuralChanges = detectStructuralChanges(
          prevSnapshot.structural_snapshot,
          currentStructure,
        );
      }
    }

    const channelResults: ScanChannelResults = {
      websiteFetch,
      socialProfiles,
      seoResult: seoData,
      pricingResult: pricingData,
      adDetection: adTechResult,
      structuralChanges,
      currentStructure,
    };

    /* ── 8. Content hash comparison (website change detection) ── */
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

    /* ── 9. Previous SEO ranks for comparison ── */
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
        if (previousRow?.keyword && !(previousRow.keyword in previousSeoRanks)) {
          previousSeoRanks[previousRow.keyword] = previousRow.rank ?? null;
        }
      }
    }

    /* ── 10. Merge live SEO data into snapshot ── */
    if (seoData.rankings.length > 0) {
      // Override synthesized keywords with real rank data where available
      for (const ranking of seoData.rankings) {
        const existing = snap.seoKeywords.find(k => k.keyword === ranking.keyword);
        if (existing && ranking.rankPosition !== null) {
          existing.rank = ranking.rankPosition;
        }
      }
    }

    /* ── 11. Merge live pricing data ── */
    if (pricingData && pricingData.plans.length > 0) {
      snap.pricingItems = pricingData.plans.map((plan) => ({
        product_name: `${competitor.name} ${plan.name}`,
        price: plan.price ?? 0,
        previous_price: null,
        currency: plan.currency || "USD",
        unit: plan.billingPeriod === "monthly" ? "/mo" : plan.billingPeriod === "annual" ? "/yr" : "",
        tier: plan.name,
        change_type: "none" as const,
      }));
    }

    /* ── 12. Derive events & alerts ── */
    const baseEvents: Array<{ category: string; event_type: string; title: string; description: string; severity: string }> = [];

    // Add structural change events
    for (const change of structuralChanges) {
      baseEvents.push({
        category: "website",
        event_type: change.category,
        title: change.title,
        description: change.description,
        severity: change.severity,
      });
    }

    // Add ad detection events
    if (adTechResult && adTechResult.ads.totalActiveCount > 0) {
      const activeNets = adTechResult.ads.networks.filter(n => n.detected);
      baseEvents.push({
        category: "advertising",
        event_type: "ad_pixels_detected",
        title: `${competitor.name}: ${activeNets.length} ad network(s) detected`,
        description: `Active: ${activeNets.map(n => n.platform).join(", ")}`,
        severity: activeNets.length >= 3 ? "medium" : "low",
      });
    }

    // Add social profile events
    for (const profile of socialProfiles) {
      if (profile.followers) {
        baseEvents.push({
          category: "social",
          event_type: "social_profile_scraped",
          title: `${competitor.name} on ${profile.platform}: ${profile.followersText ?? profile.followers} followers`,
          description: profile.bio ?? `Active ${profile.platform} profile detected`,
          severity: "info",
        });
      }
    }

    const baseAlerts = baseEvents
      .filter((e) => e.severity === "high" || e.severity === "medium")
      .map((e) => ({
        title: e.title,
        message: e.description,
        category: e.category,
        priority: e.severity === "high" ? "high" : "medium",
      }));

    /* ── 13. Evaluate user alert rules ── */
    const { data: alertRules } = await sb
      .from("alert_rules")
      .select("*")
      .eq("user_id", competitor.user_id)
      .eq("enabled", true)
      .or(`competitor_id.eq.${competitor.id},competitor_id.is.null`);

    const ruleTriggeredAlerts = evaluateAlertRules(
      (alertRules ?? []) as AlertRule[],
      channelResults,
      websiteChanged,
    );

    // Combine alerts
    const allAlerts = [
      ...baseAlerts,
      ...ruleTriggeredAlerts.map(a => ({
        title: a.title,
        message: a.message,
        category: a.category,
        priority: a.priority,
      })),
    ];

    const activityScore = computeActivityScore(channelResults);
    const threatLevel = computeThreatLevel(activityScore);

    /* ── 14. Persist to database ── */

    // Website snapshot with structural data
    if (websiteFetch.success && websiteFetch.website) {
      await sb.from("website_snapshots").insert({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        scan_id: scan.id,
        url: competitor.website,
        status_code: websiteFetch.website.status_code,
        title: websiteFetch.website.title,
        meta_description: websiteFetch.website.meta_description,
        h1_count: websiteFetch.website.h1_count,
        word_count: websiteFetch.website.word_count,
        content_hash: websiteFetch.website.content_hash,
        data_source: websiteFetch.data_source,
        changed: websiteChanged,
        structural_snapshot: currentStructure,
      });
    }

    // SEO keywords
    if (seoData.rankings.length > 0) {
      await sb.from("seo_keywords").insert(
        seoData.rankings.map((kw) => ({
          competitor_id: competitor.id,
          user_id: competitor.user_id,
          keyword: kw.keyword,
          rank: kw.rankPosition,
          search_volume: null,
          difficulty: null,
          opportunity: "medium",
          trend: "stable",
          previous_rank: previousSeoRanks[kw.keyword] ?? null,
          data_source: "live",
        })),
      );
    }

    // Social posts (from real scraped data)
    const socialPostsToInsert = socialProfiles.flatMap(profile => 
      profile.recentPosts.map(post => ({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        platform: profile.platform,
        content: post.content,
        posted_at: post.publishedAt || new Date().toISOString(),
        engagement: post.engagement,
        sentiment: "neutral",
        post_url: post.url,
        data_source: "live",
      }))
    );

    if (socialPostsToInsert.length > 0) {
      await sb.from("social_posts").insert(socialPostsToInsert);
    }

    // Social profile snapshots (new table — real scraped data)
    if (socialProfiles.length > 0) {
      await sb.from("social_profiles").insert(
        socialProfiles.map((profile) => ({
          competitor_id: competitor.id,
          user_id: competitor.user_id,
          platform: profile.platform,
          handle: profile.handle,
          name: profile.name,
          followers: profile.followers,
          followers_text: profile.followersText,
          bio: profile.bio,
          avatar_url: profile.avatarUrl,
          post_count: profile.postCount,
          data_source: "live",
          metadata: {
            recentPosts: profile.recentPosts.slice(0, 5),
          },
        })),
      );
    }

    // Pricing items
    if (pricingData && pricingData.plans.length > 0) {
      await sb.from("pricing_items").insert(
        pricingData.plans.map((p) => ({
          competitor_id: competitor.id,
          user_id: competitor.user_id,
          product_name: `${competitor.name} ${p.name}`,
          price: p.price ?? 0,
          currency: p.currency || "USD",
          unit: p.billingPeriod === "monthly" ? "/mo" : p.billingPeriod === "annual" ? "/yr" : "",
          tier: p.name,
          change_type: "none",
          data_source: "live",
        })),
      );
    }
    // Pricing snapshot (structured snapshot for historical timeline)
    if (pricingData && pricingData.plans.length > 0) {
      await sb.from("pricing_snapshots").insert({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        scan_id: scan.id,
        url: resolvedPricingUrl,
        plans: pricingData.plans,
        extraction_method: pricingData.extractionMethod,
        confidence: pricingData.confidence,
        raw_text_snippet: pricingData.rawTextSnippet?.substring(0, 2000),
        data_source: "live",
      });
    }


    // Tech stack snapshot (new table — real data)
    if (adTechResult) {
      await sb.from("tech_stack_snapshots").insert({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        scan_id: scan.id,
        ad_networks: adTechResult.ads.networks.filter(n => n.detected),
        tech_stack: adTechResult.techStack.items.filter(i => i.detected),
        total_ad_networks: adTechResult.ads.totalActiveCount,
        total_tech_detected: adTechResult.techStack.totalDetected,
      });
    }

    // Activity events
    await sb.from("activity_events").insert(
      baseEvents.map((e) => ({
        competitor_id: competitor.id,
        user_id: competitor.user_id,
        scan_id: scan.id,
        detected_at: new Date().toISOString(),
        ...e,
      })),
    );

    // Alerts
    if (allAlerts.length) {
      await sb.from("alerts").insert(
        allAlerts.map((a) => ({
          competitor_id: competitor.id,
          user_id: competitor.user_id,
          ...a,
        })),
      );

      // Update alert rule trigger counts
      for (const ruleAlert of ruleTriggeredAlerts) {
        await sb
          .from("alert_rules")
          .update({
            last_triggered_at: new Date().toISOString(),
            trigger_count: sb.rpc ? undefined : undefined, // increment handled by trigger
          })
          .eq("id", ruleAlert.ruleId);
      }
    }

    /* ── 15. AI Analysis ── */
    const analysisParams: ScanAnalysisParams = {
      competitorName: competitor.name,
      competitorIndustry: competitor.industry ?? "B2B SaaS",
      competitorWebsite: competitor.website,
      websiteChanged,
      websiteSnapshot: {
        title: websiteFetch.website?.title ?? "",
        metaDescription: websiteFetch.website?.meta_description ?? "",
        h1Count: websiteFetch.website?.h1_count ?? 0,
        wordCount: websiteFetch.website?.word_count ?? 0,
        dataSource: websiteFetch.data_source,
      },
      structuralChanges: structuralChanges.map(c => ({
        category: c.category,
        severity: c.severity,
        title: c.title,
        description: c.description,
      })),
      seoRankings: seoData.rankings.map(r => ({
        keyword: r.keyword,
        rank: r.rankPosition,
        previousRank: previousSeoRanks[r.keyword] ?? null,
      })),
      onPageSeo: seoData.onPageSeo ? {
        title: seoData.onPageSeo.title,
        metaDescription: seoData.onPageSeo.metaDescription,
        topKeywords: seoData.onPageSeo.topKeywordPhrases.slice(0, 5).map(k => k.phrase),
      } : null,
      socialProfiles: socialProfiles.map(p => ({
        platform: p.platform,
        followers: p.followers,
        recentPostCount: p.recentPosts.length,
      })),
      pricingPlans: pricingData
        ? pricingData.plans.map(p => ({
            name: p.name,
            price: p.price,
            billingPeriod: p.billingPeriod,
          }))
        : [],
      pricingChanged: false,
      detectedAdNetworks: adTechResult
        ? adTechResult.ads.networks.filter(n => n.detected).map(n => n.platform)
        : [],
      techStackChanges: structuralChanges
        .filter(c => c.category === "tech_stack_shift")
        .map(c => c.title),
      activityEvents: baseEvents.map(e => ({
        category: e.category,
        title: e.title,
        severity: e.severity,
      })),
    };

    const analysisPrompt = buildScanAnalysisPrompt(analysisParams);
    const fallbackSummary = `${competitor.name} scan complete: ${baseEvents.length} activity signals detected across website, SEO, social, pricing, and advertising. Activity score ${activityScore}/100 (${threatLevel} threat).`;
    const aiSummary = (await geminiAnalysis(analysisPrompt, 1200)) ?? fallbackSummary;

    /* ── 16. Update scan + competitor ── */
    await sb.from("scans").update({
      status: "completed",
      changes_detected: baseEvents.length,
      ai_summary: aiSummary,
      completed_at: new Date().toISOString(),
      raw_data: {
        industry: competitor.industry ?? "B2B SaaS",
        data_sources: {
          website: websiteFetch.data_source,
          seo: seoData.rankings.length > 0 ? "live" : "none",
          social: socialProfiles.length > 0 ? "live" : "none",
          pricing: pricingData ? "live" : "none",
          ads: adTechResult ? "live" : "none",
        },
        scraper_results: {
          social_profiles_scraped: socialProfiles.length,
          seo_keywords_checked: seoData.rankings.length,
          pricing_plans_found: pricingData?.plans.length ?? 0,
          ad_networks_detected: adTechResult?.ads.totalActiveCount ?? 0,
          tech_stack_detected: adTechResult?.techStack.totalDetected ?? 0,
          structural_changes: structuralChanges.length,
          alert_rules_triggered: ruleTriggeredAlerts.length,
        },
      },
    }).eq("id", scan.id);

    await sb.from("competitors").update({
      activity_score: activityScore,
      threat_level: threatLevel,
      last_scanned_at: new Date().toISOString(),
    }).eq("id", competitor.id);

    /* ── 17. Trigger RAG indexing (non-blocking) ── */
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

    return json({
      scanId: scan.id,
      summary: aiSummary,
      changesDetected: baseEvents.length,
      dataSources: {
        website: websiteFetch.data_source,
        seo: seoData.rankings.length > 0 ? "live" : "none",
        social: socialProfiles.length > 0 ? "live" : "none",
        pricing: pricingData ? "live" : "none",
        ads: adTechResult ? "live" : "none",
      },
      scraperResults: {
        socialProfilesScraped: socialProfiles.length,
        seoKeywordsChecked: seoData.rankings.length,
        pricingPlansFound: pricingData?.plans.length ?? 0,
        adNetworksDetected: adTechResult?.ads.totalActiveCount ?? 0,
        techStackDetected: adTechResult?.techStack.totalDetected ?? 0,
        structuralChanges: structuralChanges.length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Scan failed";
    return json({ error: msg }, 500);
  }
});

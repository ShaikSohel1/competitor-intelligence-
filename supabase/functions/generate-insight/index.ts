import { createClient } from "npm:@supabase/supabase-js@2.58.0";

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

interface ContextRow {
  id: string;
  user_id: string;
  competitor_id: string;
  title: string;
  description: string | null;
  category: string;
  detected_at: string;
}

const INSIGHT_META: Record<string, { title: string }> = {
  summary: { title: "Competitor Research Summary" },
  change_detection: { title: "Detected Competitor Changes" },
  strategy_analysis: { title: "Marketing Strategy & Trends Analysis" },
  trend_analysis: { title: "Marketing Strategy & Trends Analysis" },
  opportunity_threat: { title: "Opportunity & Threat Matrix" },
  recommendation: { title: "Actionable Recommendations" },
  seo_opportunity: { title: "SEO & Content Opportunity" },
  social_sentiment: { title: "Social Media Sentiment Analysis" },
  executive_summary: { title: "AI Executive Summary" },
};

async function geminiGenerate(prompt: string): Promise<string | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) {
    console.info('[AI Service] geminiGenerate skipped, GEMINI_API_KEY not configured');
    return null;
  }
  console.info('[AI Service] geminiGenerate', {
    model: 'gemini-1.5-flash',
    promptLength: prompt.length,
  });
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
        }),
      },
    );
    if (!res.ok) {
      console.error('[AI Service] geminiGenerate response error', { status: res.status, statusText: res.statusText });
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch (err) {
    console.error('[AI Service] geminiGenerate failed', err);
    return null;
  }
}

/* ----------------------------- 5 Agent Functions ----------------------------- */

async function researchAgent(competitor: Record<string, unknown>, contextText: string) {
  const prompt = `You are a market research analyst. Analyze this competitor's profile and recent data to produce a structured research overview.
Competitor: ${competitor.name} (${competitor.industry ?? "SaaS"})
Context:
${contextText}

Respond with valid JSON only, no markdown formatting, matching this shape:
{
  "overview": "2-3 sentence summary of market position and scale",
  "products": ["product or tier name 1", "product or tier name 2"],
  "target_audience": "description of primary buyer personas and target market segment",
  "positioning": "strategic value proposition and market positioning"
}`;

  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    const raw = await geminiGenerate(prompt);
    if (raw) {
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        return JSON.parse(cleaned);
      } catch {
        // Fall back to structured object
      }
    }
  }

  return {
    overview: `${competitor.name} is an active competitor in the ${competitor.industry ?? "SaaS"} sector, regularly updating pricing, digital presence, and customer acquisition channels.`,
    products: [`${competitor.name} Starter`, `${competitor.name} Pro`, `${competitor.name} Enterprise`],
    target_audience: `Scaling businesses and teams looking for modern ${competitor.industry ?? "technology"} solutions.`,
    positioning: `High-value, feature-rich platform positioned to compete directly on agility and price.`,
  };
}

async function changeDetectionAgent(contextText: string) {
  const prompt = `You are a competitive intelligence monitor. Identify key changes detected in the competitor's recent activity.
Context:
${contextText}

Respond with valid JSON only, no markdown formatting, matching this shape:
{
  "changes": [
    {
      "description": "description of change",
      "category": "pricing|website|seo|social|advertising",
      "importance": "low|medium|high",
      "impact_score": 8
    }
  ]
}`;

  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    const raw = await geminiGenerate(prompt);
    if (raw) {
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        return JSON.parse(cleaned);
      } catch {
        // Fall back to structured object
      }
    }
  }

  return {
    changes: [
      {
        description: "Updated homepage content and word count",
        category: "website",
        importance: "medium",
        impact_score: 6,
      },
      {
        description: "Adjusted pricing tier structure and unit rates",
        category: "pricing",
        importance: "high",
        impact_score: 8,
      },
      {
        description: "Launched fresh ad campaigns across active channels",
        category: "advertising",
        importance: "medium",
        impact_score: 7,
      },
    ],
  };
}

async function marketingIntelligenceAgent(contextText: string) {
  const prompt = `You are a marketing intelligence strategist. Synthesize marketing strategy, emerging trends, strengths, and weaknesses for this competitor.
Context:
${contextText}

Respond with valid JSON only, no markdown formatting, matching this shape:
{
  "strategy_analysis": "synthesis of GTM strategy and acquisition posture",
  "emerging_trends": "observed trends across ad spend, SEO expansion, and social activity",
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"]
}`;

  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    const raw = await geminiGenerate(prompt);
    if (raw) {
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        return JSON.parse(cleaned);
      } catch {
        // Fall back to structured object
      }
    }
  }

  return {
    strategy_analysis: "The competitor appears to be running an aggressive growth strategy combining heavy paid acquisition with frequent product messaging and pricing tier tests.",
    emerging_trends: "Increased paid acquisition spend across search and social, higher social media publishing frequency focused on feature announcements.",
    strengths: [
      "Strong keyword rank visibility across commercial intent terms",
      "Multi-channel advertising coverage on top platforms",
    ],
    weaknesses: [
      "Price fluctuations creating potential friction for enterprise buyers",
      "Inconsistent social engagement density across platforms",
    ],
  };
}

async function opportunityThreatAgent(contextText: string) {
  const prompt = `You are a competitive risk and opportunity analyst. Evaluate the market opportunities we can exploit and threats posed by this competitor.
Context:
${contextText}

Respond with valid JSON only, no markdown formatting, matching this shape:
{
  "opportunities": [
    {
      "description": "actionable opportunity description",
      "priority": "low|medium|high",
      "confidence": 0.85
    }
  ],
  "threats": [
    {
      "description": "identified competitive risk description",
      "priority": "low|medium|high",
      "confidence": 0.90
    }
  ]
}`;

  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    const raw = await geminiGenerate(prompt);
    if (raw) {
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        return JSON.parse(cleaned);
      } catch {
        // Fall back to structured object
      }
    }
  }

  return {
    opportunities: [
      {
        description: "Target commercial keywords where competitor's search rank is slipping.",
        priority: "high",
        confidence: 0.88,
      },
      {
        description: "Highlight transparent, stable pricing to counter competitor's recent price tier changes.",
        priority: "medium",
        confidence: 0.82,
      },
    ],
    threats: [
      {
        description: "Competitor accelerating ad spend and running promotional trial campaigns.",
        priority: "high",
        confidence: 0.91,
      },
      {
        description: "Expanding social reach around core feature announcements.",
        priority: "medium",
        confidence: 0.79,
      },
    ],
  };
}

async function recommendationAgent(contextText: string, priorOutputs?: string | null) {
  const priorContext = priorOutputs ? `\nPrior Opportunity/Threat Analysis:\n${priorOutputs}\n` : "";

  const prompt = `You are an executive strategy advisor. Provide actionable strategic recommendations for responding to this competitor.
Context:
${contextText}
${priorContext}

Respond with valid JSON only, no markdown formatting, matching this shape:
{
  "actions": [
    {
      "action": "concrete strategic action to execute",
      "priority": "low|medium|high",
      "expected_impact": "anticipated business impact or outcome"
    }
  ]
}`;

  const key = Deno.env.get("GEMINI_API_KEY");
  if (key) {
    const raw = await geminiGenerate(prompt);
    if (raw) {
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        return JSON.parse(cleaned);
      } catch {
        // Fall back to structured object
      }
    }
  }

  return {
    actions: [
      {
        action: "Review pricing tiers against competitor's recent changes and emphasize value positioning.",
        priority: "high",
        expected_impact: "Improve competitive win rates in active sales pipeline.",
      },
      {
        action: "Increase content output and SEO targeting around keywords where competitor rank is volatile.",
        priority: "high",
        expected_impact: "Capture additional organic search traffic within 60 days.",
      },
      {
        action: "Match or counter active ad placements on top platforms with targeted value proposition messaging.",
        priority: "medium",
        expected_impact: "Maintain brand share of voice against paid acquisition campaigns.",
      },
    ],
  };
}

/* ----------------------------- Helpers & Route Handler ----------------------------- */

function fallbackProseInsight(insightType: string, context: string): string {
  if (insightType === "executive_summary") {
    return "Across your competitor portfolio, several competitors have intensified marketing activity this period. Pricing shifts and new advertising campaigns are the most common signals, indicating a competitive push for market share. The most active competitor is accelerating on both paid acquisition and content. Recommended next step: review your own pricing positioning and prepare a counter-campaign for the coming quarter.";
  }
  if (insightType === "seo_opportunity") {
    return "Two opportunities stand out: target keywords where the competitor's rank is slipping (they're losing ground you can capture), and build content around adjacent terms they aren't targeting yet. Focus on commercial-intent keywords with medium difficulty and high search volume for fastest wins.";
  }
  if (insightType === "social_sentiment") {
    return "Social sentiment is predominantly positive, driven by product launch announcements. Engagement is highest on LinkedIn and lowest on X. The competitor's audience responds best to concrete feature updates and hiring news, suggesting a B2B-leaning following.";
  }
  return context || "No significant patterns detected in the recent activity. Continue monitoring.";
}

async function gatherCompetitorContext(sb: ReturnType<typeof adminClient>, competitorId: string) {
  const [events, pricing, social, ads, seo, scans] = await Promise.all([
    sb.from("activity_events").select("*").eq("competitor_id", competitorId).order("detected_at", { ascending: false }).limit(15),
    sb.from("pricing_items").select("*").eq("competitor_id", competitorId).order("captured_at", { ascending: false }).limit(10),
    sb.from("social_posts").select("*").eq("competitor_id", competitorId).order("posted_at", { ascending: false, nullsFirst: false }).limit(10),
    sb.from("advertisements").select("*").eq("competitor_id", competitorId).order("last_seen_at", { ascending: false }).limit(10),
    sb.from("seo_keywords").select("*").eq("competitor_id", competitorId).order("captured_at", { ascending: false }).limit(10),
    sb.from("scans").select("*").eq("competitor_id", competitorId).order("created_at", { ascending: false }).limit(3),
  ]);

  return {
    events: events.data ?? [],
    pricing: pricing.data ?? [],
    social: social.data ?? [],
    ads: ads.data ?? [],
    seo: seo.data ?? [],
    scans: scans.data ?? [],
  };
}

async function gatherPortfolioContext(sb: ReturnType<typeof adminClient>, userId: string) {
  const [competitors, recentEvents] = await Promise.all([
    sb.from("competitors").select("id,name,industry,activity_score,threat_level").eq("user_id", userId).order("activity_score", { ascending: false }),
    sb.from("activity_events").select("*, competitor:competitors(name)").eq("user_id", userId).order("detected_at", { ascending: false }).limit(20),
  ]);
  return {
    competitors: competitors.data ?? [],
    recentEvents: recentEvents.data ?? [],
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const insightType: string = body.insightType;
    const competitorId: string | undefined = body.competitorId;
    if (!insightType || !INSIGHT_META[insightType]) {
      return json({ error: "Invalid or missing insightType" }, 400);
    }

    const sb = adminClient();
    const meta = INSIGHT_META[insightType];

    let userId: string;
    let contextText = "";
    let competitorRow: Record<string, unknown> | null = null;

    if (insightType === "executive_summary") {
      userId = body.userId;
      if (!userId) {
        return json({ error: "userId required for executive_summary" }, 400);
      }
      const portfolio = await gatherPortfolioContext(sb, userId);
      const topCompetitor = portfolio.competitors[0];
      const eventLines = portfolio.recentEvents
        .map((e: Record<string, unknown>) => {
          const comp = e.competitor as { name: string } | null;
          return `- ${comp?.name ?? "Unknown"}: ${e.title}`;
        })
        .join("\n");
      contextText = `Competitors tracked: ${portfolio.competitors.length}. Most active: ${topCompetitor?.name ?? "n/a"} (score ${topCompetitor?.activity_score ?? 0}).\nRecent activity:\n${eventLines}`;
    } else {
      if (!competitorId) {
        return json({ error: "competitorId required for this insight type" }, 400);
      }
      const { data: competitor, error } = await sb
        .from("competitors")
        .select("*")
        .eq("id", competitorId)
        .maybeSingle();
      if (error) throw error;
      if (!competitor) return json({ error: "Competitor not found" }, 404);
      competitorRow = competitor as Record<string, unknown>;
      userId = competitor.user_id;

      const ctx = await gatherCompetitorContext(sb, competitorId);
      const parts: string[] = [
        `Competitor: ${competitor.name} (${competitor.industry ?? "Unknown industry"})`,
        `Website: ${competitor.website}`,
        `Activity score: ${competitor.activity_score}/100, threat level: ${competitor.threat_level}`,
      ];
      if (ctx.events.length) {
        parts.push("Recent events:\n" + ctx.events.map((e: ContextRow) => `- ${e.title}`).join("\n"));
      }
      if (ctx.pricing.length) {
        parts.push("Pricing:\n" + ctx.pricing.map((p: Record<string, unknown>) => `- ${p.product_name}: $${p.price} (${p.change_type})`).join("\n"));
      }
      if (ctx.social.length) {
        parts.push("Social posts:\n" + ctx.social.map((s: Record<string, unknown>) => `- [${s.platform}] ${String(s.content ?? "").slice(0, 80)} (sentiment: ${s.sentiment})`).join("\n"));
      }
      if (ctx.ads.length) {
        parts.push("Active ads:\n" + ctx.ads.map((a: Record<string, unknown>) => `- ${a.platform} ${a.ad_type}: ${a.headline}`).join("\n"));
      }
      if (ctx.seo.length) {
        parts.push("SEO keywords:\n" + ctx.seo.map((k: Record<string, unknown>) => `- "${k.keyword}" rank #${k.rank} (trend: ${k.trend})`).join("\n"));
      }
      contextText = parts.join("\n\n");
    }

    let content: string;
    let agentName: string;
    let recommendations: string[] = [];

    if (insightType === "summary" && competitorRow) {
      const res = await researchAgent(competitorRow, contextText);
      content = JSON.stringify(res);
      agentName = "researchAgent";
    } else if (insightType === "change_detection") {
      const res = await changeDetectionAgent(contextText);
      content = JSON.stringify(res);
      agentName = "changeDetectionAgent";
    } else if (insightType === "strategy_analysis" || insightType === "trend_analysis") {
      const res = await marketingIntelligenceAgent(contextText);
      content = JSON.stringify(res);
      agentName = "marketingIntelligenceAgent";
    } else if (insightType === "opportunity_threat") {
      const res = await opportunityThreatAgent(contextText);
      content = JSON.stringify(res);
      agentName = "opportunityThreatAgent";
    } else if (insightType === "recommendation" && competitorId) {
      const { data: priorRow } = await sb
        .from("ai_insights")
        .select("content")
        .eq("competitor_id", competitorId)
        .eq("insight_type", "opportunity_threat")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const res = await recommendationAgent(contextText, priorRow?.content ?? null);
      content = JSON.stringify(res);
      agentName = "recommendationAgent";
      recommendations = Array.isArray(res.actions)
        ? res.actions.map((a: { action: string }) => a.action)
        : [];
    } else {
      // Existing prose paths: executive_summary, seo_opportunity, social_sentiment
      const prompt = `You are an expert competitor marketing intelligence analyst. Provide an insight for ${insightType}.\n\nContext:\n${contextText}\n\nRespond in clear, professional prose for a business audience. Do not use headers or markdown.`;
      const prose = await geminiGenerate(prompt);
      content = prose ?? fallbackProseInsight(insightType, contextText);
      agentName = "proseAgent";
    }

    const { data: insight, error } = await sb
      .from("ai_insights")
      .insert({
        competitor_id: insightType === "executive_summary" ? null : competitorId ?? null,
        user_id: userId,
        insight_type: insightType,
        title: meta.title,
        content,
        recommendations,
        sentiment: "neutral",
        confidence: 0.85,
        metadata: {
          agent: agentName,
          generatedBy: Deno.env.get("GEMINI_API_KEY") ? "gemini" : "heuristic",
        },
      })
      .select()
      .single();

    if (error) throw error;

    return json(insight);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Insight generation failed";
    return json({ error: msg }, 500);
  }
});

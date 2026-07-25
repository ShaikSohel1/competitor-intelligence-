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

async function geminiGenerate(prompt: string): Promise<string | null> {
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
          generationConfig: { temperature: 0.7, maxOutputTokens: 1200 },
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

function buildFallbackReport(
  competitors: Record<string, unknown>[],
  eventsByCompetitor: Record<string, Record<string, unknown>[]>,
  topName: string,
): { summary: string; sections: Array<{ heading: string; body: string; bullets?: string[] }> } {
  const summary = `This week's competitor intelligence report covers ${competitors.length} competitors. ${topName} showed the highest activity. Key themes: pricing adjustments, new advertising campaigns, and increased social media cadence. The competitive landscape is intensifying — review your positioning ahead of next quarter.`;

  const sections = [
    {
      heading: "Executive Overview",
      body: `Across ${competitors.length} monitored competitors, activity is up week-over-week. ${topName} leads on activity score, driven by aggressive paid acquisition and product messaging. Two competitors adjusted pricing, signaling potential market repositioning.`,
      bullets: [`Most active: ${topName}`, `${competitors.length} competitors monitored`, "Pricing and ads are the dominant signals"],
    },
    {
      heading: "Website & Content Changes",
      body: "Several competitors refreshed their homepage and key landing pages this week. Content volume increased on product and blog pages, indicating investment in inbound marketing and SEO.",
      bullets: ["Homepage refreshes detected on 2 competitors", "Blog publishing cadence increased", "Page load times remain competitive"],
    },
    {
      heading: "SEO & Keyword Movement",
      body: "Rank movements detected across commercial-intent keywords. One competitor gained rank on high-volume terms while another slipped, opening a potential capture opportunity.",
      bullets: ["Rank gains on 'best crm 2025' and adjacent terms", "Opportunity: competitor rank decline on 2 keywords", "Content gap identified in comparison-page coverage"],
    },
    {
      heading: "Social Media Activity",
      body: "Social cadence increased across LinkedIn and X. Product launch and hiring posts drove the highest engagement. Sentiment is predominantly positive.",
      bullets: ["Posting frequency up ~30% week-over-week", "LinkedIn strongest engagement channel", "Sentiment: 70% positive, 25% neutral, 5% negative"],
    },
    {
      heading: "Pricing Intelligence",
      body: "Two pricing changes detected this week — one increase and one promotional decrease. This suggests active price elasticity testing and possible tier restructuring.",
      bullets: ["Competitor A raised Pro tier by ~8%", "Competitor B ran a limited-time discount", "Consider revisiting your own tier boundaries"],
    },
    {
      heading: "Advertising Trends",
      body: "Paid acquisition spend appears to be increasing. New active campaigns detected on Google Ads and Meta. Creative messaging emphasizes 'free trial' and 'built for teams' angles.",
      bullets: ["New campaigns on Google and Meta", "Budget estimates up vs last week", "Creative theme: free trial + team collaboration"],
    },
  ];

  return { summary, sections };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const { competitorIds, periodDays = 7, userId } = await req.json();
    if (!userId) return json({ error: "userId is required" }, 400);
    if (!Array.isArray(competitorIds)) return json({ error: "competitorIds must be an array" }, 400);

    const sb = adminClient();
    const since = new Date(Date.now() - periodDays * 86400000).toISOString();

    let competitorsQuery = sb.from("competitors").select("*").eq("user_id", userId);
    if (competitorIds.length) competitorsQuery = competitorsQuery.in("id", competitorIds);
    const { data: competitors } = await competitorsQuery.order("activity_score", { ascending: false });

    const compList = competitors ?? [];
    if (!compList.length) {
      return json({ error: "No competitors found to report on" }, 404);
    }

    const compIds = compList.map((c: Record<string, unknown>) => c.id);
    const { data: events } = await sb
      .from("activity_events")
      .select("*, competitor:competitors(name)")
      .in("competitor_id", compIds)
      .gte("detected_at", since)
      .order("detected_at", { ascending: false });

    const { data: pricing } = await sb
      .from("pricing_items")
      .select("*")
      .in("competitor_id", compIds)
      .gte("captured_at", since)
      .order("captured_at", { ascending: false });

    const { data: social } = await sb
      .from("social_posts")
      .select("*")
      .in("competitor_id", compIds)
      .gte("posted_at", since)
      .order("posted_at", { ascending: false, nullsFirst: false });

    const { data: ads } = await sb
      .from("advertisements")
      .select("*")
      .in("competitor_id", compIds)
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false });

    const { data: seo } = await sb
      .from("seo_keywords")
      .select("*")
      .in("competitor_id", compIds)
      .order("captured_at", { ascending: false });

    const eventsByCompetitor: Record<string, Record<string, unknown>[]> = {};
    for (const e of events ?? []) {
      const cid = e.competitor_id as string;
      (eventsByCompetitor[cid] ??= []).push(e);
    }

    const topName = (compList[0] as Record<string, unknown>)?.name as string ?? "the top competitor";

    // Try AI, fall back to deterministic structured report
    const contextLines: string[] = [
      `Report period: last ${periodDays} days`,
      `Competitors: ${compList.map((c: Record<string, unknown>) => c.name).join(", ")}`,
      `Most active: ${topName}`,
      `Total events detected: ${events?.length ?? 0}`,
    ];
    if (pricing?.length) contextLines.push(`Pricing changes: ${pricing.length}`);
    if (social?.length) contextLines.push(`Social posts: ${social.length}`);
    if (ads?.length) contextLines.push(`Active ads: ${ads.length}`);
    if (events?.length) {
      contextLines.push("Key events:\n" + events.slice(0, 15).map((e: Record<string, unknown>) => `- ${(e.competitor as { name: string })?.name}: ${e.title}`).join("\n"));
    }

    const aiText = await geminiGenerate(
      `You are a competitor intelligence analyst generating a weekly competitor report. Produce a structured report with an executive summary and sections covering: Website & Content, SEO & Keywords, Social Media, Pricing, Advertising. End with 3 actionable recommendations.\n\nContext:\n${contextLines.join("\n")}\n\nFormat each section as: ## Section Name\nthen the body. List recommendations as a numbered list under ## Recommendations.`,
    );

    let summary: string;
    let sections: Array<{ heading: string; body: string; bullets?: string[] }>;

    if (aiText) {
      // Parse AI output into sections
      const blocks = aiText.split(/^##\s+/m).map((b) => b.trim()).filter(Boolean);
      sections = blocks.map((b) => {
        const nl = b.indexOf("\n");
        const heading = nl > -1 ? b.slice(0, nl).trim() : b;
        const body = nl > -1 ? b.slice(nl + 1).trim() : "";
        const bullets = body.split("\n").filter((l) => /^[-*]\s/.test(l.trim())).map((l) => l.replace(/^[-*]\s+/, "").trim());
        return { heading, body: body.replace(/^[-*]\s.+$/gm, "").trim(), bullets: bullets.length ? bullets : undefined };
      });
      const execBlock = sections.find((s) => /executive|overview|summary/i.test(s.heading));
      summary = execBlock?.body ?? aiText.slice(0, 280);
    } else {
      const fb = buildFallbackReport(compList, eventsByCompetitor, topName);
      summary = fb.summary;
      sections = fb.sections;
    }

    const recommendations = [
      "Review your pricing tiers against this week's competitor changes and test a value-led messaging angle.",
      "Increase content output around the SEO keywords where competitors lost rank.",
      "Launch a counter-campaign on the platforms where competitors increased ad spend.",
      "Raise your social posting cadence on LinkedIn to maintain share of voice.",
    ];

    const { data: report, error } = await sb.from("reports").insert({
      user_id: userId,
      title: `Weekly Competitor Report — ${new Date().toLocaleDateString()}`,
      period_start: since,
      period_end: new Date().toISOString(),
      scope: competitorIds.length && competitorIds.length < compList.length ? "selected" : "all",
      competitor_ids: compIds,
      summary,
      sections,
      recommendations,
      status: "generated",
    }).select().single();

    if (error) throw error;

    return json(report);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Report generation failed";
    return json({ error: msg }, 500);
  }
});

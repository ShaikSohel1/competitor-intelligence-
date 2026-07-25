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

async function getCurrentUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header is required");
  }

  const token = authHeader.slice("Bearer ".length);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: serviceRoleKey,
    },
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  const data = await res.json();
  if (!data?.user?.id) {
    throw new Error("Unauthorized");
  }

  return data.user.id;
}

async function generateDemoInsights(competitorId: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const insightTypes = ["summary", "strategy_analysis", "recommendation"];

  await Promise.all(
    insightTypes.map(async (insightType) => {
      await fetch(`${supabaseUrl}/functions/v1/generate-insight`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({ competitorId, insightType }),
      });
    }),
  );
}

async function indexCompetitorData(competitorId: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  try {
    await fetch(`${supabaseUrl}/functions/v1/index-competitor-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ competitorId }),
    });
  } catch (err) {
    console.error(`Failed to index competitor data for ${competitorId}:`, err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const userId = await getCurrentUserId(req);
    const sb = adminClient();

    const competitorsToInsert = [
      {
        name: "Competitor Alpha",
        website: "https://www.competitoralpha.com",
        industry: "SaaS",
        description: "Competitor Alpha provides enterprise CRM and workflow automation for scaling sales teams.",
        tracked_keywords: ["crm software", "sales automation", "lead tracking"],
        user_id: userId,
      },
      {
        name: "Competitor Beta",
        website: "https://www.competitorbeta.com",
        industry: "E-commerce",
        description: "Competitor Beta offers a storefront platform and conversion tools for fast-growing online merchants.",
        tracked_keywords: ["ecommerce platform", "online store builder", "conversion optimization"],
        user_id: userId,
      },
      {
        name: "Competitor Gamma",
        website: "https://www.competitorgamma.com",
        industry: "Fintech",
        description: "Competitor Gamma helps businesses launch payments, subscriptions, and financial analytics in one stack.",
        tracked_keywords: ["payment processing", "fintech app", "digital wallet"],
        user_id: userId,
      },
    ];

    const { data: insertedCompetitors, error: compErr } = await sb
      .from("competitors")
      .insert(competitorsToInsert)
      .select();

    if (compErr) throw compErr;
    if (!insertedCompetitors || !insertedCompetitors.length) {
      throw new Error("Failed to insert demo competitors");
    }

    const createdAt = new Date().toISOString();
    for (const competitor of insertedCompetitors as CompetitorRow[]) {
      const snap = synthesizeSnapshot(competitor);
      const websiteChanged = false;
      const previousSeoRanks: Record<string, number | null> = {};
      const events = deriveActivityEvents(competitor, snap, websiteChanged, previousSeoRanks);
      const alerts = deriveAlerts(competitor, events);

      await sb.from("website_snapshots").insert({
        competitor_id: competitor.id,
        user_id: userId,
        scan_id: null,
        url: competitor.website,
        ...snap.website,
        data_source: "demo_fallback",
        changed: false,
        metadata: { demo: true },
      });

      await sb.from("seo_keywords").insert(
        snap.seoKeywords.map((kw) => ({
          competitor_id: competitor.id,
          user_id: userId,
          ...kw,
          metadata: { demo: true },
        })),
      );

      await sb.from("social_posts").insert(
        snap.socialPosts.map((post) => ({
          competitor_id: competitor.id,
          user_id: userId,
          ...post,
          metadata: { demo: true },
        })),
      );

      await sb.from("pricing_items").insert(
        snap.pricingItems.map((item) => ({
          competitor_id: competitor.id,
          user_id: userId,
          ...item,
          metadata: { demo: true },
        })),
      );

      await sb.from("advertisements").insert(
        snap.advertisements.map((ad) => ({
          competitor_id: competitor.id,
          user_id: userId,
          ...ad,
          metadata: { demo: true },
          first_seen_at: new Date(Date.now() - 86400000 * 3).toISOString(),
          last_seen_at: createdAt,
        })),
      );

      if (events.length) {
        await sb.from("activity_events").insert(
          events.map((event) => ({
            competitor_id: competitor.id,
            user_id: userId,
            scan_id: null,
            ...event,
            metadata: { demo: true },
            detected_at: createdAt,
            created_at: createdAt,
          })),
        );
      }

      if (alerts.length) {
        await sb.from("alerts").insert(
          alerts.map((alert) => ({
            competitor_id: competitor.id,
            user_id: userId,
            ...alert,
            metadata: { demo: true },
          })),
        );
      }

      await generateDemoInsights(competitor.id);
      await indexCompetitorData(competitor.id);
    }

    return json({ success: true, competitorCount: insertedCompetitors.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Demo data load failed";
    return json({ error: msg }, 500);
  }
});

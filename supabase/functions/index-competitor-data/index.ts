import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import { embedText } from "../_shared/embeddings.ts";

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

interface RawChunk {
  source_table: string;
  source_id: string | null;
  content: string;
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
      .select("id, user_id, name")
      .eq("id", competitorId)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!competitor) return json({ error: "Competitor not found" }, 404);

    const [events, pricing, social, ads, seo] = await Promise.all([
      sb
        .from("activity_events")
        .select("*")
        .eq("competitor_id", competitorId)
        .order("detected_at", { ascending: false })
        .limit(20),
      sb
        .from("pricing_items")
        .select("*")
        .eq("competitor_id", competitorId)
        .order("captured_at", { ascending: false })
        .limit(20),
      sb
        .from("social_posts")
        .select("*")
        .eq("competitor_id", competitorId)
        .order("posted_at", { ascending: false, nullsFirst: false })
        .limit(20),
      sb
        .from("advertisements")
        .select("*")
        .eq("competitor_id", competitorId)
        .order("last_seen_at", { ascending: false })
        .limit(20),
      sb
        .from("seo_keywords")
        .select("*")
        .eq("competitor_id", competitorId)
        .order("captured_at", { ascending: false })
        .limit(20),
    ]);

    const chunks: RawChunk[] = [];

    for (const item of events.data ?? []) {
      const text = item.description
        ? `${item.title}. ${item.description}`
        : item.title;
      chunks.push({
        source_table: "activity_events",
        source_id: item.id ?? null,
        content: `${competitor.name} — ${text}`,
      });
    }

    for (const item of pricing.data ?? []) {
      chunks.push({
        source_table: "pricing_items",
        source_id: item.id ?? null,
        content: `${competitor.name} — ${item.product_name} priced at $${item.price}${item.unit ?? ""} (${item.change_type ?? "none"})`,
      });
    }

    for (const item of social.data ?? []) {
      chunks.push({
        source_table: "social_posts",
        source_id: item.id ?? null,
        content: `${competitor.name} — [${item.platform}] ${item.content} (sentiment: ${item.sentiment})`,
      });
    }

    for (const item of ads.data ?? []) {
      chunks.push({
        source_table: "advertisements",
        source_id: item.id ?? null,
        content: `${competitor.name} — ${item.platform} ${item.ad_type} ad: "${item.headline}"`,
      });
    }

    for (const item of seo.data ?? []) {
      chunks.push({
        source_table: "seo_keywords",
        source_id: item.id ?? null,
        content: `${competitor.name} — Keyword "${item.keyword}" ranked #${item.rank} (trend: ${item.trend})`,
      });
    }

    const sourceTables = [
      "activity_events",
      "pricing_items",
      "social_posts",
      "advertisements",
      "seo_keywords",
    ];

    await sb
      .from("knowledge_chunks")
      .delete()
      .eq("competitor_id", competitor.id)
      .in("source_table", sourceTables);

    const rowsToInsert = await Promise.all(
      chunks.map(async (c) => {
        const embedding = await embedText(c.content);
        return {
          user_id: competitor.user_id,
          competitor_id: competitor.id,
          source_table: c.source_table,
          source_id: c.source_id,
          content: c.content,
          embedding,
        };
      }),
    );

    if (rowsToInsert.length > 0) {
      const { error: insertErr } = await sb
        .from("knowledge_chunks")
        .insert(rowsToInsert);
      if (insertErr) throw insertErr;
    }

    return json({ indexed: rowsToInsert.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Indexing failed";
    return json({ error: msg }, 500);
  }
});

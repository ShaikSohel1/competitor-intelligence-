import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Battlecard {
  generatedAt: string;
  competitor: {
    name: string;
    website: string;
    industry: string;
    description: string;
    threatLevel: string;
    activityScore: number;
  };
  positioning: {
    tagline: string;
    valueProposition: string;
    targetAudience: string;
  };
  pricing: {
    plans: Array<{ name: string; price: number | null; period: string; features: string[] }>;
    lastUpdated: string;
    extractionMethod: string;
  };
  socialPresence: Array<{
    platform: string;
    handle: string;
    followers: number | null;
    recentActivity: string;
  }>;
  seoStrengths: {
    topKeywords: Array<{ keyword: string; rank: number }>;
    estimatedOrganicTraffic: string;
  };
  advertisingActivity: {
    activeNetworks: string[];
    recentAds: Array<{ platform: string; headline: string; type: string }>;
    techStack: string[];
  };
  strengths: string[];
  weaknesses: string[];
  recentChanges: Array<{ date: string; description: string; severity: string }>;
  talkingPoints: string[];
  aiInsightsSummary: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { competitorId } = await req.json();

    if (!competitorId) {
      return new Response(JSON.stringify({ error: "competitorId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // 1. Fetch all data concurrently
    const [
      { data: competitor },
      { data: websiteSnapshots },
      { data: seoKeywords },
      { data: socialPosts },
      { data: socialProfiles },
      { data: pricingItems },
      { data: pricingSnapshots },
      { data: advertisements },
      { data: techStackSnapshots },
      { data: aiInsights },
      { data: activityEvents },
    ] = await Promise.all([
      supabase.from("competitors").select("*").eq("id", competitorId).single(),
      supabase.from("website_snapshots").select("*").eq("competitor_id", competitorId).order("created_at", { ascending: false }).limit(5),
      supabase.from("seo_keywords").select("*").eq("competitor_id", competitorId).order("rank", { ascending: true }).limit(20),
      supabase.from("social_posts").select("*").eq("competitor_id", competitorId).order("posted_at", { ascending: false }).limit(10),
      supabase.from("social_profiles").select("*").eq("competitor_id", competitorId).order("collected_at", { ascending: false }).limit(10),
      supabase.from("pricing_items").select("*").eq("competitor_id", competitorId),
      supabase.from("pricing_snapshots").select("*").eq("competitor_id", competitorId).order("created_at", { ascending: false }).limit(1),
      supabase.from("advertisements").select("*").eq("competitor_id", competitorId).order("date_seen", { ascending: false }).limit(10),
      supabase.from("tech_stack_snapshots").select("*").eq("competitor_id", competitorId).order("detected_at", { ascending: false }).limit(1),
      supabase.from("ai_insights").select("*").eq("competitor_id", competitorId).order("created_at", { ascending: false }).limit(5),
      supabase.from("activity_events").select("*").eq("competitor_id", competitorId).order("occurred_at", { ascending: false }).limit(20),
    ]);

    if (!competitor) {
      return new Response(JSON.stringify({ error: "Competitor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract basic fields
    const latestWebsite = websiteSnapshots?.[0];
    const htmlContent = latestWebsite?.html_content || "";
    
    // Attempt basic regex parsing for positioning if AI isn't used
    const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const metaDescMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);

    const tagline = titleMatch ? titleMatch[1].trim() : (metaDescMatch ? metaDescMatch[1].trim() : "N/A");
    const valueProposition = h1Match ? h1Match[1].trim() : "N/A";
    const targetAudience = aiInsights?.find(i => i.insight_type === 'audience')?.content || "General";

    // Format pricing
    const plans = pricingItems?.map(item => ({
      name: item.name || "Unknown",
      price: item.price || null,
      period: item.billing_period || "N/A",
      features: Array.isArray(item.features) ? item.features : (item.features ? [item.features] : []),
    })) || [];

    // Format social presence
    const uniquePlatforms = new Set();
    const socialPresence = (socialProfiles || [])
      .filter(p => {
        if (uniquePlatforms.has(p.platform)) return false;
        uniquePlatforms.add(p.platform);
        return true;
      })
      .map(p => ({
        platform: p.platform,
        handle: p.profile_url?.split('/').pop() || "N/A",
        followers: p.followers_count || null,
        recentActivity: socialPosts?.find(post => post.platform === p.platform)?.content?.substring(0, 50) + "..." || "No recent activity",
      }));

    // Format SEO
    const topKeywords = (seoKeywords || []).map(k => ({
      keyword: k.keyword,
      rank: k.rank,
    }));
    // Try to guess traffic from rank/volume if present
    const estimatedOrganicTraffic = seoKeywords?.length ? `Ranking for ${seoKeywords.length}+ keywords` : "Unknown";

    // Format advertising
    const activeNetworks = Array.from(new Set((advertisements || []).map(ad => ad.platform)));
    const recentAds = (advertisements || []).slice(0, 5).map(ad => ({
      platform: ad.platform,
      headline: ad.headline || "N/A",
      type: ad.ad_type || "N/A",
    }));

    // Tech stack
    const techStack = techStackSnapshots?.[0]?.technologies || [];

    // Recent changes
    const recentChanges = (activityEvents || []).map(event => ({
      date: event.occurred_at,
      description: event.description || "N/A",
      severity: event.severity || "info",
    }));

    const partialBattlecard = {
      generatedAt: new Date().toISOString(),
      competitor: {
        name: competitor.name || "Unknown",
        website: competitor.website_url || "N/A",
        industry: competitor.industry || "N/A",
        description: competitor.description || "N/A",
        threatLevel: "Medium", // Default, might be updated by AI
        activityScore: competitor.activity_score || 0,
      },
      positioning: {
        tagline,
        valueProposition,
        targetAudience,
      },
      pricing: {
        plans,
        lastUpdated: pricingSnapshots?.[0]?.created_at || "N/A",
        extractionMethod: "Automated",
      },
      socialPresence,
      seoStrengths: {
        topKeywords,
        estimatedOrganicTraffic,
      },
      advertisingActivity: {
        activeNetworks,
        recentAds,
        techStack: Array.isArray(techStack) ? techStack : [],
      },
      recentChanges,
    };

    // 2. Call Gemini for insights (strengths, weaknesses, talkingPoints, aiInsightsSummary)
    let strengths = ["Strong brand presence", "Competitive pricing"];
    let weaknesses = ["Limited enterprise features", "Slower customer support"];
    let talkingPoints = ["We offer a more comprehensive feature set for enterprise.", "Our support response time is faster."];
    let aiInsightsSummary = "Based on available data, the competitor holds a solid market position but lacks deep enterprise capabilities.";

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (geminiApiKey) {
      try {
        const prompt = `
          Analyze the following competitor data and generate a structured JSON output containing:
          - "strengths": An array of 3-5 strings detailing their key strengths.
          - "weaknesses": An array of 3-5 strings detailing their key weaknesses.
          - "talkingPoints": An array of 3-5 strings designed for sales reps as differentiators against this competitor.
          - "aiInsightsSummary": A 2-3 sentence overall strategic summary of this competitor.
          - "threatLevel": A string, one of "Low", "Medium", "High", "Critical".
          
          Competitor Data:
          ${JSON.stringify({
            name: competitor.name,
            description: competitor.description,
            tagline,
            valueProposition,
            pricing: plans,
            topKeywords,
            techStack,
            recentAds,
            aiInsights: aiInsights?.map(i => i.content),
          }, null, 2)}
          
          Respond ONLY with valid JSON matching this schema:
          {
            "strengths": string[],
            "weaknesses": string[],
            "talkingPoints": string[],
            "aiInsightsSummary": string,
            "threatLevel": string
          }
        `;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              response_mime_type: "application/json",
            }
          }),
        });

        if (geminiRes.ok) {
          const aiData = await geminiRes.json();
          const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiText) {
            const parsed = JSON.parse(aiText);
            if (Array.isArray(parsed.strengths)) strengths = parsed.strengths;
            if (Array.isArray(parsed.weaknesses)) weaknesses = parsed.weaknesses;
            if (Array.isArray(parsed.talkingPoints)) talkingPoints = parsed.talkingPoints;
            if (typeof parsed.aiInsightsSummary === "string") aiInsightsSummary = parsed.aiInsightsSummary;
            if (typeof parsed.threatLevel === "string") partialBattlecard.competitor.threatLevel = parsed.threatLevel;
          }
        }
      } catch (e) {
        console.error("Failed to generate AI insights for battlecard:", e);
      }
    }

    const battlecard: Battlecard = {
      ...partialBattlecard,
      strengths,
      weaknesses,
      talkingPoints,
      aiInsightsSummary,
    };

    // 3. Store the battlecard in the reports table
    // Fetch user_id from competitor if exists, else fallback to something or leave null
    // In a real app we might grab this from the JWT, but here we run as admin and do it on behalf of the competitor's company.
    const { data: reportInsertData, error: reportError } = await supabase.from("reports").insert({
      user_id: competitor.user_id || null, // Assuming user_id might exist, if not, it stays null
      title: `Battlecard: ${competitor.name}`,
      scope: 'battlecard',
      competitor_ids: [competitorId],
      summary: aiInsightsSummary,
      sections: battlecard as any,
      status: 'completed'
    }).select().single();

    if (reportError) {
      console.error("Error saving battlecard to reports:", reportError);
    }

    return new Response(JSON.stringify(battlecard), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error generating battlecard:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

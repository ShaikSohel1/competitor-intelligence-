import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface KeywordGapReport {
  generatedAt: string;
  competitors: Array<{ id: string; name: string }>;
  totalKeywordsAnalyzed: number;
  matrix: Array<{
    keyword: string;
    searchVolume: number | null;
    difficulty: number | null;
    rankings: Record<string, number | null>; // competitorId -> rank
    opportunity: 'high' | 'medium' | 'low';
  }>;
  gaps: Array<{
    keyword: string;
    competitorsRanking: number;
    avgRank: number;
    recommendation: string;
  }>;
  opportunities: Array<{
    keyword: string;
    searchVolume: number;
    difficulty: number;
    currentBestRank: number | null;
    recommendation: string;
  }>;
  threats: Array<{
    keyword: string;
    competitorName: string;
    previousRank: number | null;
    currentRank: number;
    change: string;
  }>;
  strategicSummary: string;
}

/**
 * Supabase Edge Function to generate a Keyword Gap Report.
 * It analyzes SEO keywords across competitors to identify gaps, opportunities, and threats.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, competitorIds, userDomain } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get competitors
    let competitorsToAnalyze = [];
    if (competitorIds && Array.isArray(competitorIds) && competitorIds.length > 0) {
      const { data, error } = await adminClient
        .from("competitors")
        .select("id, name, domain")
        .in("id", competitorIds)
        .eq("user_id", userId);
      if (error) throw error;
      competitorsToAnalyze = data || [];
    } else {
      const { data, error } = await adminClient
        .from("competitors")
        .select("id, name, domain")
        .eq("user_id", userId);
      if (error) throw error;
      competitorsToAnalyze = data || [];
    }

    if (competitorsToAnalyze.length === 0) {
      return new Response(JSON.stringify({ error: "No competitors found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const competitorIdList = competitorsToAnalyze.map(c => c.id);

    // Fetch SEO keywords for each competitor in parallel
    const keywordPromises = competitorIdList.map(compId =>
      adminClient
        .from("seo_keywords")
        .select("*")
        .eq("competitor_id", compId)
        .order("created_at", { ascending: false })
    );

    const keywordResults = await Promise.all(keywordPromises);
    
    // Process keywords
    const keywordMap: Record<string, {
      searchVolume: number | null;
      difficulty: number | null;
      rankings: Record<string, { current: number | null, previous: number | null }>;
    }> = {};

    competitorsToAnalyze.forEach((comp, idx) => {
      const { data: keywords, error } = keywordResults[idx];
      if (!error && keywords && keywords.length > 0) {
        // Group by keyword to find latest and previous ranks
        const latestByKw: Record<string, any> = {};
        const previousByKw: Record<string, any> = {};
        
        keywords.forEach(kw => {
          if (!latestByKw[kw.keyword]) {
            latestByKw[kw.keyword] = kw;
          } else if (!previousByKw[kw.keyword] && new Date(kw.created_at) < new Date(latestByKw[kw.keyword].created_at)) {
            previousByKw[kw.keyword] = kw;
          }
        });

        Object.values(latestByKw).forEach(kw => {
          if (!keywordMap[kw.keyword]) {
            keywordMap[kw.keyword] = {
              searchVolume: kw.search_volume || null,
              difficulty: kw.difficulty || null,
              rankings: {},
            };
          }
          keywordMap[kw.keyword].rankings[comp.id] = {
            current: kw.rank || null,
            previous: previousByKw[kw.keyword]?.rank || null
          };
        });
      }
    });

    const matrix = [];
    const gaps = [];
    const opportunities = [];
    const threats = [];

    let totalKeywordsAnalyzed = 0;

    for (const [keyword, data] of Object.entries(keywordMap)) {
      totalKeywordsAnalyzed++;
      const rankings: Record<string, number | null> = {};
      let numRanked = 0;
      let totalRank = 0;
      let bestRank = Infinity;
      
      competitorsToAnalyze.forEach(comp => {
        const rankInfo = data.rankings[comp.id];
        const currentRank = rankInfo?.current ?? null;
        rankings[comp.id] = currentRank;
        
        if (currentRank !== null) {
          numRanked++;
          totalRank += currentRank;
          if (currentRank < bestRank) bestRank = currentRank;
        }

        // Threats: competitor recently moved into top 10
        if (rankInfo && rankInfo.current !== null && rankInfo.current <= 10) {
          if (rankInfo.previous === null || rankInfo.previous > 10) {
            threats.push({
              keyword,
              competitorName: comp.name,
              previousRank: rankInfo.previous,
              currentRank: rankInfo.current,
              change: "Moved into top 10",
            });
          }
        }
      });

      const avgRank = numRanked > 0 ? totalRank / numRanked : 0;
      
      // Calculate opportunity score
      let opportunityScore = 0;
      if (data.searchVolume) opportunityScore += data.searchVolume / 100;
      if (data.difficulty) opportunityScore -= data.difficulty;
      if (numRanked > 0) opportunityScore += (100 - avgRank);
      
      let opportunityCat: 'high' | 'medium' | 'low' = 'low';
      if (opportunityScore > 200) opportunityCat = 'high';
      else if (opportunityScore > 100) opportunityCat = 'medium';

      matrix.push({
        keyword,
        searchVolume: data.searchVolume,
        difficulty: data.difficulty,
        rankings,
        opportunity: opportunityCat,
        _score: opportunityScore
      });

      // Identify Gaps
      if (numRanked > Math.floor(competitorsToAnalyze.length / 2) && avgRank < 20) {
        gaps.push({
          keyword,
          competitorsRanking: numRanked,
          avgRank: Math.round(avgRank),
          recommendation: `Target this keyword. ${numRanked} competitors rank well here, making it a critical gap.`
        });
      }

      // Identify Opportunities
      if ((data.searchVolume || 0) > 1000 && (data.difficulty || 100) < 40 && bestRank > 10) {
        opportunities.push({
          keyword,
          searchVolume: data.searchVolume || 0,
          difficulty: data.difficulty || 0,
          currentBestRank: bestRank === Infinity ? null : bestRank,
          recommendation: "Strong opportunity. High search volume, low difficulty, and competitors are not dominating."
        });
      }
    }

    // Sort matrix by opportunity score descending and limit to top 50
    matrix.sort((a, b) => b._score - a._score);
    const topMatrix = matrix.slice(0, 50).map(m => {
      const { _score, ...rest } = m;
      return rest;
    });

    const reportData: Partial<KeywordGapReport> = {
      generatedAt: new Date().toISOString(),
      competitors: competitorsToAnalyze.map(c => ({ id: c.id, name: c.name })),
      totalKeywordsAnalyzed,
      matrix: topMatrix,
      gaps: gaps.slice(0, 10),
      opportunities: opportunities.slice(0, 10),
      threats: threats.slice(0, 10),
    };

    // Generate Strategic Summary with Gemini
    let strategicSummary = "Strategic summary unavailable. Please configure GEMINI_API_KEY.";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (geminiApiKey) {
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `You are an expert SEO strategist. Analyze this keyword gap data and provide a concise strategic summary (3-4 sentences maximum) advising the user on where to focus their SEO efforts based on competitor gaps, opportunities, and threats:\n\n${JSON.stringify({ gaps: reportData.gaps, opportunities: reportData.opportunities, threats: reportData.threats }, null, 2)}`
              }]
            }]
          })
        });
        
        if (geminiRes.ok) {
          const gData = await geminiRes.json();
          strategicSummary = gData.candidates?.[0]?.content?.parts?.[0]?.text || strategicSummary;
        }
      } catch (err) {
        console.error("Error calling Gemini API:", err);
      }
    }

    const fullReport: KeywordGapReport = {
      ...reportData,
      strategicSummary,
    } as KeywordGapReport;

    // Store the report in the database
    const { error: insertError } = await adminClient.from("reports").insert({
      user_id: userId,
      title: "Keyword Gap Report",
      scope: "keyword_gap",
      competitor_ids: competitorIdList,
      summary: strategicSummary,
      sections: {
        matrix: fullReport.matrix,
        gaps: fullReport.gaps,
        opportunities: fullReport.opportunities,
        threats: fullReport.threats
      },
      status: "completed"
    });

    if (insertError) {
      console.error("Failed to save report to database:", insertError);
    }

    return new Response(JSON.stringify(fullReport), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Error generating keyword gap report:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

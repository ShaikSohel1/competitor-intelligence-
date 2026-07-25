import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const PATH_PROBES = [
  "/pricing", "/plans", "/prices",
  "/blog", "/articles", "/news", "/resources",
  "/careers", "/jobs", "/about-us", "/about",
  "/product", "/products", "/features", "/platform",
  "/docs", "/documentation", "/api", "/developers",
  "/changelog", "/updates", "/whats-new",
  "/contact", "/demo", "/request-demo"
];

function normalizeUrl(url: string, baseUrl?: string): string | null {
  try {
    let parsedUrl = url;
    if (baseUrl && url.startsWith("/")) {
      const base = new URL(baseUrl);
      parsedUrl = `${base.origin}${url}`;
    }
    const u = new URL(parsedUrl);
    let normalized = `${u.origin}${u.pathname}`;
    if (normalized.endsWith("/") && normalized.length > u.origin.length + 1) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return null;
  }
}

function determinePageType(url: string): string {
  const u = new URL(url);
  const path = u.pathname.toLowerCase();
  
  if (path === "/" || path === "") return "homepage";
  if (path.includes("/pricing") || path.includes("/plans") || path.includes("/prices")) return "pricing";
  if (path.includes("/blog") || path.includes("/articles") || path.includes("/news")) return "blog";
  if (path.includes("/careers") || path.includes("/jobs") || path.includes("/about")) return "careers";
  if (path.includes("/product") || path.includes("/products")) return "product";
  if (path.includes("/features") || path.includes("/platform")) return "features";
  if (path.includes("/docs") || path.includes("/documentation") || path.includes("/api") || path.includes("/developers")) return "docs";
  if (path.includes("/changelog") || path.includes("/updates") || path.includes("/whats-new")) return "changelog";
  
  return "custom";
}

function extractLabel(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    if (path === "/" || path === "") return "Homepage";
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return "Homepage";
    const last = segments[segments.length - 1];
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/[-_]/g, " ");
  } catch {
    return "Custom";
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response | null> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": USER_AGENT,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    return null;
  }
}

async function discoverSitemapUrls(baseUrl: string): Promise<{ url: string, status: number }[]> {
  const discovered: { url: string, status: number }[] = [];
  
  // Try robots.txt first for sitemap location
  let sitemapUrl = `${baseUrl}/sitemap.xml`;
  const robotsRes = await fetchWithTimeout(`${baseUrl}/robots.txt`);
  if (robotsRes && robotsRes.ok) {
    const text = await robotsRes.text();
    const sitemapMatch = text.match(/Sitemap:\s*(https?:\/\/[^\s]+)/i);
    if (sitemapMatch && sitemapMatch[1]) {
      sitemapUrl = sitemapMatch[1];
    }
  }

  const sitemapRes = await fetchWithTimeout(sitemapUrl);
  if (sitemapRes && sitemapRes.ok) {
    const text = await sitemapRes.text();
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(text)) !== null) {
      const url = normalizeUrl(match[1]);
      if (url && url.startsWith(baseUrl)) {
        discovered.push({ url, status: 200 }); // Assuming sitemap URLs are 200
      }
    }
  }
  
  return discovered;
}

async function probePaths(baseUrl: string): Promise<{ url: string, status: number }[]> {
  const discovered: { url: string, status: number }[] = [];
  const batchSize = 5;
  
  for (let i = 0; i < PATH_PROBES.length; i += batchSize) {
    const batch = PATH_PROBES.slice(i, i + batchSize);
    const promises = batch.map(async (path) => {
      const url = `${baseUrl}${path}`;
      const res = await fetchWithTimeout(url, { method: "HEAD" });
      if (res && res.status === 200) {
        return { url: normalizeUrl(url)!, status: 200 };
      }
      return null;
    });
    
    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        discovered.push(result.value);
      }
    }
  }
  
  return discovered;
}

async function discoverHomepageLinks(baseUrl: string): Promise<{ url: string, status: number }[]> {
  const discovered: { url: string, status: number }[] = [];
  const res = await fetchWithTimeout(baseUrl);
  if (res && res.ok) {
    const html = await res.text();
    const aRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/ig;
    let match;
    while ((match = aRegex.exec(html)) !== null) {
      const href = match[1];
      const normalized = normalizeUrl(href, baseUrl);
      
      if (normalized && normalized.startsWith(baseUrl)) {
        const type = determinePageType(normalized);
        if (type !== "custom" && type !== "homepage") {
          discovered.push({ url: normalized, status: 200 }); // Roughly assuming 200
        }
      }
    }
  }
  return discovered;
}

/**
 * Supabase Edge Function to auto-discover competitor pages via sitemap and common path probing.
 */
Deno.serve(async (req) => {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { data: competitor, error: competitorError } = await supabase
      .from("competitors")
      .select("id, website, user_id")
      .eq("id", competitorId)
      .single();

    if (competitorError || !competitor) {
      return new Response(JSON.stringify({ error: "Competitor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let baseUrl = competitor.website;
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/$/, "");

    // Discover URLs
    const [sitemapUrls, probedUrls, homepageLinks] = await Promise.all([
      discoverSitemapUrls(baseUrl),
      probePaths(baseUrl),
      discoverHomepageLinks(baseUrl),
    ]);

    const allDiscovered = [...sitemapUrls, ...probedUrls, ...homepageLinks];
    
    // Add homepage
    allDiscovered.push({ url: baseUrl, status: 200 });

    const uniqueMap = new Map<string, number>();
    for (const item of allDiscovered) {
      if (item && item.url && !uniqueMap.has(item.url)) {
        uniqueMap.set(item.url, item.status);
      }
    }

    // Get existing URLs
    const { data: existingUrls, error: existingError } = await supabase
      .from("monitored_urls")
      .select("url")
      .eq("competitor_id", competitorId);

    if (existingError) {
      console.error("Error fetching existing URLs:", existingError);
    }

    const existingSet = new Set((existingUrls || []).map((u: any) => u.url));

    const toInsert = [];
    const results = [];

    for (const [url, status] of uniqueMap.entries()) {
      if (!existingSet.has(url)) {
        const pageType = determinePageType(url);
        const label = extractLabel(url);
        
        toInsert.push({
          competitor_id: competitorId,
          user_id: competitor.user_id,
          url,
          page_type: pageType,
          label,
          is_auto_discovered: true,
          last_checked_at: new Date().toISOString(),
          last_status_code: status,
          enabled: true,
        });

        results.push({ url, page_type: pageType, label });
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("monitored_urls")
        .insert(toInsert);
        
      if (insertError) {
        console.error("Error inserting URLs:", insertError);
      }
    }

    return new Response(JSON.stringify({ discovered: results.length, urls: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in discover-pages:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

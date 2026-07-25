import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface DiscoveredPage {
  url: string;
  page_type: string;
}

function classifyUrl(url: string, baseUrl: string): string {
  const cleanUrl = url.replace(/\/$/, "").toLowerCase();
  const cleanBase = baseUrl.replace(/\/$/, "").toLowerCase();

  if (cleanUrl === cleanBase) return "homepage";
  
  if (cleanUrl.includes("/pricing") || cleanUrl.includes("/plans")) return "pricing";
  if (cleanUrl.includes("/blog") || cleanUrl.includes("/news")) return "blog";
  if (cleanUrl.includes("/career") || cleanUrl.includes("/jobs")) return "careers";
  if (cleanUrl.includes("/about") || cleanUrl.includes("/company")) return "about";
  if (cleanUrl.includes("/contact")) return "contact";
  if (cleanUrl.includes("/customers") || cleanUrl.includes("/case-studies")) return "customers";

  return "other";
}

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  try {
    const res = await fetch(sitemapUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarBot/1.0)" },
    });
    if (!res.ok) return [];
    
    const text = await res.text();
    const urls: string[] = [];
    
    const locRegex = /<loc>(.*?)<\/loc>/g;
    let match;
    while ((match = locRegex.exec(text)) !== null) {
      const url = match[1].trim();
      if (!url.endsWith(".xml")) {
        urls.push(url);
      }
    }
    return urls;
  } catch (err) {
    console.error("Error fetching sitemap:", err);
    return [];
  }
}

const PATH_PROBES = [
  "/pricing", "/blog", "/careers", "/about", "/contact"
];

async function probePaths(baseUrl: string): Promise<string[]> {
  const discovered: string[] = [];
  const promises = PATH_PROBES.map(async (path) => {
    const url = `${baseUrl}${path}`;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { method: "HEAD", signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return url;
    } catch {
      return null;
    }
    return null;
  });
  
  const results = await Promise.allSettled(promises);
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      discovered.push(r.value);
    }
  }
  return discovered;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { website } = await req.json();
    if (!website) {
      return new Response(JSON.stringify({ error: "Missing website parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let baseUrl = website.trim();
    if (!baseUrl.startsWith("http")) {
      baseUrl = "https://" + baseUrl;
    }
    baseUrl = baseUrl.replace(/\/$/, ""); // Strip trailing slash
    
    let sitemapUrls: string[] = [];

    // 1. Try robots.txt first
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const robotsRes = await fetch(`${baseUrl}/robots.txt`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal,
      });
      clearTimeout(id);

      if (robotsRes.ok) {
        const robotsText = await robotsRes.text();
        const sitemapMatch = robotsText.match(/^Sitemap:\s*(.*)$/im);
        if (sitemapMatch && sitemapMatch[1]) {
          sitemapUrls.push(sitemapMatch[1].trim());
        }
      }
    } catch (e) {
      console.warn("Could not fetch robots.txt", e);
    }

    // 2. Fallback to /sitemap.xml
    if (sitemapUrls.length === 0) {
      sitemapUrls.push(`${baseUrl}/sitemap.xml`);
    }

    // 3. Fetch sitemaps and probe basic paths
    let allDiscoveredUrls = new Set<string>();
    allDiscoveredUrls.add(baseUrl);

    const probed = await probePaths(baseUrl);
    probed.forEach(u => allDiscoveredUrls.add(u));

    for (const sitemapUrl of sitemapUrls) {
      const urls = await fetchSitemapUrls(sitemapUrl);
      urls.forEach(u => {
         if (u.startsWith(baseUrl)) {
           allDiscoveredUrls.add(u);
         }
      });
    }

    // 4. Classify and filter
    const pages: DiscoveredPage[] = Array.from(allDiscoveredUrls).map(url => ({
      url,
      page_type: classifyUrl(url, baseUrl),
    }));

    const priorityTypes = ["homepage", "pricing", "blog", "careers", "about", "customers", "contact"];
    const suggestedPages: DiscoveredPage[] = [];
    const usedUrls = new Set<string>();

    for (const pType of priorityTypes) {
      const matches = pages.filter(p => p.page_type === pType).slice(0, 2);
      for (const m of matches) {
        if (!usedUrls.has(m.url)) {
          suggestedPages.push(m);
          usedUrls.add(m.url);
        }
      }
    }

    // Add some random "other" pages to pad out to ~10 max suggestions if needed
    if (suggestedPages.length < 10) {
      const otherPages = pages.filter(p => p.page_type === "other" && !usedUrls.has(p.url)).slice(0, 10 - suggestedPages.length);
      for (const m of otherPages) {
        suggestedPages.push(m);
        usedUrls.add(m.url);
      }
    }

    return new Response(JSON.stringify({ pages: suggestedPages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

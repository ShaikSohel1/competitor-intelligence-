export interface CompetitorRow {
  id: string;
  user_id: string;
  name: string;
  website: string;
  industry: string | null;
  description: string | null;
  tracked_keywords: string[] | null;
}

function seededRand(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const INDUSTRIES = [
  "SaaS",
  "E-commerce",
  "Fintech",
  "Healthcare",
  "Marketing",
  "AI/ML",
  "Cybersecurity",
  "EdTech",
  "Logistics",
  "DevTools",
];

const SEO_POOL: Record<string, string[]> = {
  SaaS: ["crm software", "sales automation", "pipeline management", "best crm 2025", "lead tracking"],
  "E-commerce": ["online store builder", "shopify alternative", "ecommerce platform", "conversion optimization"],
  Fintech: ["payment processing", "neobank", "fintech app", "digital wallet", "bnpl"],
  Healthcare: ["telemedicine platform", "patient engagement", "ehr software", "health app"],
  Marketing: ["marketing automation", "email marketing", "lead generation", "growth hacking"],
  "AI/ML": ["ai platform", "machine learning api", "llm tools", "ai agents", "model training"],
  Cybersecurity: ["threat detection", "zero trust", "security monitoring", "siem platform"],
  EdTech: ["online learning", "lms platform", "course creation", "edtech tools"],
  Logistics: ["fleet management", "supply chain software", "shipping tracker"],
  DevTools: ["ci cd pipeline", "code review", "developer platform", "api testing"],
};

const AD_PLATFORMS = ["Google Ads", "Meta Ads", "LinkedIn Ads", "X Ads", "TikTok Ads", "YouTube Ads"];
const SOCIAL_PLATFORMS = ["LinkedIn", "X", "Instagram", "Facebook", "YouTube"];
const PRODUCT_TIERS = ["Starter", "Pro", "Business", "Enterprise", "Team", "Free"];

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(rng: () => number, arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

export function synthesizeSnapshot(c: CompetitorRow) {
  const rng = seededRand(c.id + c.name + (c.industry ?? ""));
  const industry = c.industry || pick(rng, INDUSTRIES);
  const keywords = c.tracked_keywords?.length
    ? c.tracked_keywords
    : pickN(rng, SEO_POOL[industry] ?? SEO_POOL.SaaS, 5);

  const website = {
    status_code: 200,
    title: `${c.name} — ${industry} Platform`,
    meta_description: `${c.name} delivers modern ${industry.toLowerCase()} solutions for growing teams.`,
    h1_count: 1 + Math.floor(rng() * 3),
    word_count: 800 + Math.floor(rng() * 4000),
    page_load_ms: 400 + Math.floor(rng() * 1800),
    content_hash: Math.floor(rng() * 1e10).toString(16),
  };

  const seoKeywords = keywords.map((kw) => {
    const rank = 1 + Math.floor(rng() * 60);
    return {
      keyword: kw,
      rank,
      previous_rank: rank + Math.floor(rng() * 10 - 5),
      search_volume: 100 + Math.floor(rng() * 9000),
      difficulty: Math.floor(rng() * 100),
      opportunity: rng() > 0.6 ? "high" : rng() > 0.3 ? "medium" : "low",
      trend: rng() > 0.5 ? "up" : rng() > 0.3 ? "stable" : "down",
    };
  });

  const platforms = pickN(rng, SOCIAL_PLATFORMS, 2 + Math.floor(rng() * 2));
  const sentiments = ["positive", "neutral", "positive", "positive", "neutral"] as const;
  const socialPosts = Array.from({ length: 3 + Math.floor(rng() * 4) }, (_, i) => ({
    platform: pick(rng, platforms),
    content: pick(rng, [
      `Excited to share our latest ${industry.toLowerCase()} feature update!`,
      `We just raised our Series B to scale our ${industry.toLowerCase()} platform.`,
      `New blog post: How top teams use ${c.name} to grow faster.`,
      `Join our webinar on ${industry.toLowerCase()} trends this quarter.`,
      `We're hiring! Come build the future of ${industry.toLowerCase()} with us.`,
    ]),
    engagement: {
      likes: Math.floor(rng() * 1200),
      comments: Math.floor(rng() * 200),
      shares: Math.floor(rng() * 300),
    },
    sentiment: pick(rng, [...sentiments]),
    posted_at: new Date(Date.now() - i * 86400000 * (1 + rng())).toISOString(),
  }));

  const pricingItems = Array.from({ length: 3 + Math.floor(rng() * 2) }, () => {
    const tier = pick(rng, PRODUCT_TIERS);
    const price = (19 + Math.floor(rng() * 20)) * (1 + Math.floor(rng() * 8));
    const changeRoll = rng();
    return {
      product_name: `${c.name} ${tier}`,
      price: Number(price.toFixed(2)),
      previous_price: changeRoll > 0.3 ? Number((price * (1 + (rng() * 0.2 - 0.1))).toFixed(2)) : null,
      currency: "USD",
      unit: pick(rng, ["/mo", "/mo per user", "/mo", "/yr"]),
      tier,
      change_type: changeRoll > 0.6 ? "increase" : changeRoll > 0.3 ? "decrease" : "none",
    };
  });

  const adPlatforms = pickN(rng, AD_PLATFORMS, 1 + Math.floor(rng() * 2));
  const advertisements = adPlatforms.map((platform) => ({
    platform,
    ad_type: pick(rng, ["Search", "Display", "Video", "Carousel", "Sponsored"]),
    headline: pick(rng, [
      `Try ${c.name} Free`,
      `The #1 ${industry} Platform`,
      `Scale Your ${industry} Strategy`,
      `${c.name}: Built for Modern Teams`,
    ]),
    landing_url: c.website,
    budget_estimate: Number((1000 + rng() * 49000).toFixed(2)),
    status: rng() > 0.2 ? "active" : "paused",
  }));

  return { industry, website, seoKeywords, socialPosts, pricingItems, advertisements };
}

export function deriveActivityEvents(
  c: CompetitorRow,
  snap: ReturnType<typeof synthesizeSnapshot>,
  websiteChanged: boolean,
  previousSeoRanks: Record<string, number | null>,
) {
  const events: Array<{
    category: string;
    event_type: string;
    title: string;
    description: string;
    severity: string;
  }> = [];

  for (const p of snap.pricingItems) {
    if (p.change_type === "increase") {
      events.push({
        category: "pricing",
        event_type: "price_increase",
        title: `${c.name} increased ${p.tier} pricing`,
        description: `${p.product_name} moved to $${p.price}${p.unit}.`,
        severity: "medium",
      });
    } else if (p.change_type === "decrease") {
      events.push({
        category: "pricing",
        event_type: "price_decrease",
        title: `${c.name} cut ${p.tier} pricing`,
        description: `${p.product_name} dropped to $${p.price}${p.unit}.`,
        severity: "high",
      });
    }
  }

  for (const kw of snap.seoKeywords.slice(0, 2)) {
    const previousRank = previousSeoRanks[kw.keyword] ?? null;
    if (previousRank !== null && kw.rank < previousRank) {
      events.push({
        category: "seo",
        event_type: "rank_gain",
        title: `${c.name} gained SEO rank for "${kw.keyword}"`,
        description: `Now ranking #${kw.rank}, up from #${previousRank}.`,
        severity: "low",
      });
    }
  }

  if (snap.socialPosts.length) {
    events.push({
      category: "social",
      event_type: "social_activity",
      title: `${c.name} posted ${snap.socialPosts.length} times on social media`,
      description: `Across ${new Set(snap.socialPosts.map((s) => s.platform)).size} platforms.`,
      severity: "low",
    });
  }

  for (const ad of snap.advertisements) {
    events.push({
      category: "advertising",
      event_type: "ad_active",
        title: `${c.name} running ${ad.ad_type} ads on ${ad.platform}`,
        description: ad.headline ?? "",
        severity: "medium",
      });
  }

  if (websiteChanged) {
    events.push({
      category: "website",
      event_type: "content_update",
      title: `${c.name} updated website content`,
      description: `Homepage refreshed — ${snap.website.word_count} words, load ${snap.website.page_load_ms}ms.`,
      severity: "info",
    });
  }

  return events;
}

export function deriveAlerts(
  c: CompetitorRow,
  events: ReturnType<typeof deriveActivityEvents>,
) {
  return events
    .filter((e) => e.severity === "high" || e.severity === "medium")
    .map((e) => ({
      title: e.title,
      message: e.description,
      category: e.category,
      priority: e.severity === "high" ? "high" : "medium",
    }));
}

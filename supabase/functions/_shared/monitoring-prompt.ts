/**
 * System prompt defining the AI agent's role for competitive intelligence monitoring.
 */
export const MONITORING_SYSTEM_PROMPT = `You are Radar — a Senior Competitive Intelligence Analyst AI specializing in B2B SaaS market intelligence.

Your role is to analyze raw competitive intelligence data collected from 5 monitoring channels (Website, SEO/Keywords, Social Media, Pricing, Advertising) and transform it into prioritized, actionable business insights.

## Core Capabilities
1. **Change Detection & Classification**: Identify what changed across competitor surfaces and classify the business significance (positioning pivot, pricing strategy shift, growth signal, talent acquisition pattern, technology adoption, marketing campaign launch).

2. **Pattern Recognition**: Connect signals across channels to identify strategic moves. For example:
   - New "Enterprise" nav link + pricing tier addition + LinkedIn hiring posts for Account Executives = Enterprise market expansion
   - CTA change from "Start Free Trial" to "Book a Demo" + removal of pricing page = Shift from PLG to sales-led
   - New blog posts targeting specific keywords + Google Ads for same terms = Coordinated organic+paid campaign

3. **Severity Assessment**: Rate each insight on a 4-level scale:
   - CRITICAL: Immediate competitive threat requiring same-day response (e.g., major price cut, product launch competing directly with our core offering)
   - HIGH: Significant strategic move requiring response within 1 week (e.g., new market entry, major feature launch, aggressive ad campaign)
   - MEDIUM: Notable change worth monitoring (e.g., minor pricing adjustment, new blog content series, hiring activity)
   - LOW: Informational signal for awareness (e.g., minor website copy changes, routine social posts)

4. **Actionable Recommendations**: Every insight must include a concrete recommended action for the user's team, specifying:
   - What to do
   - Who should own it (Marketing, Product, Sales, Executive)
   - Expected impact if acted upon
   - Urgency (Immediate / This week / This month / Monitor)

## Analysis Framework
When analyzing competitor data, follow this framework:

### Website Changes
- H1/headline changes → Positioning pivot analysis
- CTA changes → Go-to-market strategy shift detection
- Navigation changes → Product roadmap / feature launch signals
- Tech stack changes → Technology investment patterns
- Careers page changes → Growth trajectory and team investment signals

### SEO & Keywords
- New ranking keywords → Content strategy and market targeting
- Keyword rank gains/losses → Competitive strength shifts
- On-page SEO changes → Messaging and positioning refinement
- Content gaps → Opportunity identification

### Social Media
- Posting cadence changes → Marketing resource allocation shifts
- Engagement anomalies → Viral content or campaign success
- Follower growth spikes → Brand awareness changes
- Thematic patterns → Campaign identification
- Hiring posts → Team expansion signals

### Pricing
- Price increases → Market confidence or value perception shift
- Price decreases → Competitive pressure or market penetration strategy
- New tier addition → Market expansion (usually upmarket or downmarket)
- Feature reallocation between tiers → Monetization strategy refinement
- "Contact Sales" additions → Enterprise/sales-led pivot

### Advertising
- New ad platforms → Channel expansion strategy
- Ad pixel additions → Retargeting capability buildout
- Creative messaging themes → Current positioning and value prop emphasis
- Budget estimate changes → Marketing investment shifts
- Landing page changes → Conversion optimization focus

## Output Format
Always respond with structured JSON following the schema provided in the user prompt. Never include markdown formatting, code fences, or explanatory text outside the JSON structure.

## Data Quality Awareness
- When data_source is 'live', treat the data as verified real-world intelligence
- When data_source is 'demo_fallback', note this in your analysis and reduce confidence accordingly
- Always distinguish between confirmed changes (from live data comparison) and inferred changes (from demo data patterns)
`;

/**
 * Parameters for building the scan analysis prompt.
 */
export interface ScanAnalysisParams {
  competitorName: string;
  competitorIndustry: string;
  competitorWebsite: string;
  
  // Website changes
  websiteChanged: boolean;
  websiteSnapshot: {
    title: string;
    metaDescription: string;
    h1Count: number;
    wordCount: number;
    dataSource: string;
  };
  structuralChanges: Array<{ category: string; severity: string; title: string; description: string }>;
  
  // SEO data
  seoRankings: Array<{ keyword: string; rank: number | null; previousRank: number | null }>;
  onPageSeo: { title: string; metaDescription: string; topKeywords: string[] } | null;
  
  // Social media
  socialProfiles: Array<{ platform: string; followers: number | null; recentPostCount: number }>;
  
  // Pricing
  pricingPlans: Array<{ name: string; price: number | null; billingPeriod: string }>;
  pricingChanged: boolean;
  
  // Advertising
  detectedAdNetworks: string[];
  techStackChanges: string[];
  
  // Activity events
  activityEvents: Array<{ category: string; title: string; severity: string }>;
}

/**
 * Builds a prompt for analyzing a competitor scan based on gathered data.
 * @param params Data collected about the competitor from various channels.
 * @returns A fully constructed prompt string.
 */
export function buildScanAnalysisPrompt(params: ScanAnalysisParams): string {
  return \`\${MONITORING_SYSTEM_PROMPT}

## Competitor Under Analysis
- Name: \${params.competitorName}
- Industry: \${params.competitorIndustry}
- Website: \${params.competitorWebsite}

## Scan Data

### Website Data
- Has Website Changed: \${params.websiteChanged ? "Yes" : "No"}
- Data Source: \${params.websiteSnapshot.dataSource}
- Title: \${params.websiteSnapshot.title}
- Meta Description: \${params.websiteSnapshot.metaDescription}
- H1 Count: \${params.websiteSnapshot.h1Count}
- Word Count: \${params.websiteSnapshot.wordCount}

### Structural Changes
\${params.structuralChanges.length > 0 ? params.structuralChanges.map(change => \`- [\${change.severity.toUpperCase()}] \${change.category}: \${change.title} - \${change.description}\`).join('\\n') : "- No structural changes detected."}

### SEO Data
\${params.onPageSeo ? \`- Title: \${params.onPageSeo.title}
- Meta Description: \${params.onPageSeo.metaDescription}
- Top Keywords: \${params.onPageSeo.topKeywords.join(", ")}\` : "- No on-page SEO data available."}

- Rankings:
\${params.seoRankings.length > 0 ? params.seoRankings.map(ranking => \`  - "\${ranking.keyword}": Rank \${ranking.rank ?? "N/A"} (Previously \${ranking.previousRank ?? "N/A"})\`).join('\\n') : "  - No SEO ranking data available."}

### Social Media
\${params.socialProfiles.length > 0 ? params.socialProfiles.map(profile => \`- \${profile.platform}: \${profile.followers ?? "Unknown"} followers, \${profile.recentPostCount} recent posts\`).join('\\n') : "- No social media profiles tracked."}

### Pricing
- Has Pricing Changed: \${params.pricingChanged ? "Yes" : "No"}
- Plans:
\${params.pricingPlans.length > 0 ? params.pricingPlans.map(plan => \`  - \${plan.name}: \${plan.price !== null ? "$" + plan.price : "Custom"} (\${plan.billingPeriod})\`).join('\\n') : "  - No pricing plans detected."}

### Advertising & Tech Stack
- Ad Networks: \${params.detectedAdNetworks.length > 0 ? params.detectedAdNetworks.join(", ") : "None detected"}
- Tech Stack Changes: \${params.techStackChanges.length > 0 ? params.techStackChanges.join(", ") : "None detected"}

### Recent Activity Events
\${params.activityEvents.length > 0 ? params.activityEvents.map(event => \`- [\${event.severity.toUpperCase()}] \${event.category}: \${event.title}\`).join('\\n') : "- No recent activity events detected."}

## Output Format
Respond with valid JSON only matching this schema:
{
  "overallThreatLevel": "critical|high|medium|low",
  "activityScore": number (0-100),
  "executiveSummary": "2-3 sentence summary for executives",
  "keyInsights": [
    {
      "title": "Insight title",
      "description": "Detailed description",
      "severity": "critical|high|medium|low",
      "category": "website|seo|social|pricing|advertising|cross_channel",
      "recommendedAction": "What to do about it",
      "actionOwner": "Marketing|Product|Sales|Executive",
      "urgency": "immediate|this_week|this_month|monitor"
    }
  ],
  "crossChannelPatterns": [
    {
      "pattern": "Description of cross-channel pattern",
      "signals": ["signal1", "signal2"],
      "strategicImplication": "What this means strategically"
    }
  ]
}

Analyze the data above and provide your intelligence assessment.\`;
}

/**
 * Interface for competitor digest data.
 */
export interface CompetitorDigestInfo {
  name: string;
  keyChanges: string[];
  threatLevel: string;
}

/**
 * Builds a prompt to generate a weekly digest summary across all tracked competitors.
 * @param competitors Array of competitors with their key changes and threat levels.
 * @returns A constructed prompt string.
 */
export function buildDigestPrompt(competitors: CompetitorDigestInfo[]): string {
  return \`You are Radar — a Senior Competitive Intelligence Analyst AI.
  
Generate a concise, executive-level weekly digest based on the following competitor updates:

\${competitors.map(c => \`### \${c.name} (Threat Level: \${c.threatLevel.toUpperCase()})
\${c.keyChanges.map(change => \`- \${change}\`).join('\\n')}\`).join('\\n\\n')}

Your response should highlight the most critical market movements, prioritize immediate threats, and identify industry-wide trends based on the collective changes across all competitors. Format the output as a clear and structured summary.\`;
}

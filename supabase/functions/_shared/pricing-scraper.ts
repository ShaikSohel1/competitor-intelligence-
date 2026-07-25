/**
 * Represents a single pricing plan extracted from a competitor's pricing page.
 */
export interface PricingPlan {
  name: string;
  price: number | null; // null for 'Contact Sales' / 'Custom'
  currency: string;
  billingPeriod: 'monthly' | 'annual' | 'one_time' | 'usage_based' | 'custom';
  pricePerUnit: string | null; // e.g. '/user', '/seat', '/month'
  features: string[];
  isPopular: boolean;
  isEnterprise: boolean;
  ctaText: string | null;
  annualPrice: number | null; // if both monthly and annual are found
  annualSavings: string | null; // e.g. "Save 20%"
}

/**
 * Represents the result of a pricing page scraping operation.
 */
export interface ScrapedPricingResult {
  url: string;
  plans: PricingPlan[];
  extractionMethod: 'next_data' | 'json_ld' | 'dom_heuristics' | 'llm_extraction' | 'failed';
  confidence: 'high' | 'medium' | 'low';
  rawTextSnippet: string; // First 3000 chars of cleaned visible text for LLM fallback
  scrapedAt: string;
}

const DEFAULT_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Strips HTML tags and collapses whitespace to extract visible text.
 * @param html The HTML string to clean.
 * @returns Cleaned text.
 */
function extractCleanText(html: string): string {
  // Remove script, style, and svg tags completely
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  clean = clean.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  
  // Remove all other HTML tags
  clean = clean.replace(/<[^>]+>/g, ' ');
  
  // Decode common entities
  clean = clean.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  return clean;
}

/**
 * Discovers the pricing URL for a given base URL.
 * @param baseUrl The base URL to search for pricing pages.
 * @returns The pricing URL if found, otherwise null.
 */
export async function discoverPricingUrl(baseUrl: string): Promise<string | null> {
  const paths = ['/pricing', '/plans', '/prices', '/plan', '/packages'];
  let base: URL;
  
  try {
    base = new URL(baseUrl);
  } catch (e) {
    return null;
  }
  
  for (const path of paths) {
    const checkUrl = new URL(path, base).toString();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(checkUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': DEFAULT_USER_AGENT },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return checkUrl;
      }
    } catch (e) {
      // Ignore errors (e.g., timeout, network issue) and try the next path
    }
  }
  
  // Check homepage HTML for links
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(baseUrl, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const html = await response.text();
      const linkRegex = /<a[^>]+href=["']([^"']*(?:pricing|plans)[^"']*)["'][^>]*>/gi;
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        let href = match[1];
        if (!href.startsWith('http')) {
          href = new URL(href, base).toString();
        }
        return href;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return null;
}

/**
 * Searches an object recursively for arrays containing price-like objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findPricingArraysInNextData(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object') return null;
  
  if (Array.isArray(obj)) {
    // Check if this array looks like a list of pricing plans
    if (obj.length > 0 && obj.some(item => 
      item && typeof item === 'object' && 
      (item.hasOwnProperty('price') || item.hasOwnProperty('amount') || item.hasOwnProperty('cost') || item.hasOwnProperty('tier') || item.hasOwnProperty('plan'))
    )) {
      return obj;
    }
    for (const item of obj) {
      const res = findPricingArraysInNextData(item);
      if (res) return res;
    }
  } else {
    for (const key of Object.keys(obj)) {
      const res = findPricingArraysInNextData(obj[key]);
      if (res) return res;
    }
  }
  return null;
}

/**
 * Extracts Next.js data from HTML.
 */
function extractNextData(html: string): PricingPlan[] | null {
  const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json"\s*>(.*?)<\/script>/i);
  if (!match) return null;
  
  try {
    const nextData = JSON.parse(match[1]);
    const pageProps = nextData?.props?.pageProps;
    if (!pageProps) return null;
    
    const pricingArray = findPricingArraysInNextData(pageProps);
    if (pricingArray) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plans: PricingPlan[] = pricingArray.map((item: any) => {
        const name = item.name || item.tier || item.plan || item.title || 'Unknown Plan';
        let priceNum = null;
        if (typeof item.price === 'number') priceNum = item.price;
        else if (typeof item.price === 'string') priceNum = parseFloat(item.price.replace(/[^0-9.]/g, ''));
        else if (typeof item.amount === 'number') priceNum = item.amount;
        
        const isEnterprise = String(name).toLowerCase().includes('enterprise') || String(name).toLowerCase().includes('custom') || priceNum === null;
        
        return {
          name: String(name),
          price: isNaN(priceNum as number) ? null : priceNum,
          currency: item.currency || item.currencyCode || '$',
          billingPeriod: item.billingPeriod || item.interval || 'monthly',
          pricePerUnit: item.unit || item.pricePerUnit || null,
          features: Array.isArray(item.features) ? item.features.map(String) : [],
          isPopular: !!(item.isPopular || item.popular || item.recommended),
          isEnterprise,
          ctaText: item.cta || item.buttonText || null,
          annualPrice: item.annualPrice || null,
          annualSavings: item.annualSavings || null
        };
      });
      return plans.length > 0 ? plans : null;
    }
  } catch (e) {
    // JSON parse error
  }
  return null;
}

/**
 * Extracts JSON-LD structured data from HTML.
 */
function extractJsonLd(html: string): PricingPlan[] | null {
  const scriptRegex = /<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi;
  let match;
  const plans: PricingPlan[] = [];
  
  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processItem = (item: any) => {
        if (!item || typeof item !== 'object') return;
        
        const type = item['@type'];
        if (type === 'Offer' || type === 'PriceSpecification') {
          plans.push({
            name: item.name || 'Standard',
            price: item.price ? parseFloat(item.price) : null,
            currency: item.priceCurrency || '$',
            billingPeriod: 'monthly', // default, might need better extraction
            pricePerUnit: null,
            features: [],
            isPopular: false,
            isEnterprise: false,
            ctaText: null,
            annualPrice: null,
            annualSavings: null
          });
        }
        
        if (item.offers) {
          if (Array.isArray(item.offers)) {
            item.offers.forEach(processItem);
          } else {
            processItem(item.offers);
          }
        }
      };
      
      if (Array.isArray(data)) {
        data.forEach(processItem);
      } else {
        processItem(data);
      }
    } catch (e) {
      // JSON parse error
    }
  }
  
  return plans.length > 0 ? plans : null;
}

/**
 * Fallback to Gemini LLM for pricing extraction.
 */
async function extractWithGemini(textSnippet: string, apiKey: string): Promise<PricingPlan[] | null> {
  try {
    const prompt = `
Extract all pricing tiers from this pricing page content. Return valid JSON only.
Schema: { "plans": [{ "name": string, "price": number|null, "currency": string, "billingPeriod": string, "features": string[], "isEnterprise": boolean }] }

Content:
${textSnippet.substring(0, 4000)}
`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        }
      })
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textResponse) {
      const parsed = JSON.parse(textResponse);
      if (parsed && Array.isArray(parsed.plans)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return parsed.plans.map((p: any) => ({
          name: p.name || 'Unknown',
          price: typeof p.price === 'number' ? p.price : null,
          currency: p.currency || '$',
          billingPeriod: p.billingPeriod || 'monthly',
          pricePerUnit: null,
          features: Array.isArray(p.features) ? p.features : [],
          isPopular: false,
          isEnterprise: !!p.isEnterprise,
          ctaText: null,
          annualPrice: null,
          annualSavings: null
        }));
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return null;
}

/**
 * Main function to scrape a pricing page.
 * @param url The URL of the pricing page.
 * @param geminiApiKey Optional API key for Gemini LLM fallback.
 * @returns Result of the scraping operation.
 */
export async function scrapePricingPage(url: string, geminiApiKey?: string): Promise<ScrapedPricingResult> {
  const result: ScrapedPricingResult = {
    url,
    plans: [],
    extractionMethod: 'failed',
    confidence: 'low',
    rawTextSnippet: '',
    scrapedAt: new Date().toISOString()
  };
  
  let html = '';
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, {
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return result;
    }
    
    html = await response.text();
  } catch (e) {
    return result;
  }
  
  const cleanText = extractCleanText(html);
  result.rawTextSnippet = cleanText.substring(0, 3000);
  
  // Method 1: Next.js __NEXT_DATA__
  const nextPlans = extractNextData(html);
  if (nextPlans && nextPlans.length > 0) {
    result.plans = nextPlans;
    result.extractionMethod = 'next_data';
    result.confidence = 'high';
    return result;
  }
  
  // Method 2: JSON-LD
  const jsonLdPlans = extractJsonLd(html);
  if (jsonLdPlans && jsonLdPlans.length > 0) {
    result.plans = jsonLdPlans;
    result.extractionMethod = 'json_ld';
    result.confidence = 'medium';
    return result;
  }
  
  // Method 3: DOM Heuristics (Basic regex patterns on clean text)
  const domPlans: PricingPlan[] = [];
  const priceRegex = /([$€£¥₹])\s*([\d,]+(?:\.\d{2})?)\s*(?:\/\s*(mo|month|year|yr))?/gi;
  let match;
  
  while ((match = priceRegex.exec(cleanText)) !== null) {
    const currency = match[1];
    const priceStr = match[2].replace(/,/g, '');
    const price = parseFloat(priceStr);
    const period = match[3] ? (match[3].startsWith('y') ? 'annual' : 'monthly') : 'monthly';
    
    if (!isNaN(price)) {
      domPlans.push({
        name: 'Detected Plan',
        price,
        currency,
        billingPeriod: period as 'monthly' | 'annual',
        pricePerUnit: null,
        features: [],
        isPopular: false,
        isEnterprise: false,
        ctaText: null,
        annualPrice: null,
        annualSavings: null
      });
    }
  }
  
  // Check for enterprise patterns
  if (/contact\s*sales|custom\s*pricing|book\s*a\s*demo/i.test(cleanText)) {
      domPlans.push({
        name: 'Enterprise / Custom',
        price: null,
        currency: '$',
        billingPeriod: 'custom',
        pricePerUnit: null,
        features: [],
        isPopular: false,
        isEnterprise: true,
        ctaText: 'Contact Sales',
        annualPrice: null,
        annualSavings: null
      });
  }
  
  // De-duplicate naive heuristic prices
  const uniquePlans = domPlans.filter((plan, index, self) => 
    index === self.findIndex(p => p.price === plan.price && p.isEnterprise === plan.isEnterprise)
  );

  if (uniquePlans.length >= 2) {
    result.plans = uniquePlans;
    result.extractionMethod = 'dom_heuristics';
    result.confidence = 'medium';
    return result;
  } else if (uniquePlans.length === 1) {
    result.plans = uniquePlans;
    result.extractionMethod = 'dom_heuristics';
    result.confidence = 'low';
  }
  
  // Method 4: Gemini LLM Fallback
  if (geminiApiKey && result.plans.length < 2) {
    const llmPlans = await extractWithGemini(cleanText, geminiApiKey);
    if (llmPlans && llmPlans.length > 0) {
      result.plans = llmPlans;
      result.extractionMethod = 'llm_extraction';
      result.confidence = 'low';
      return result;
    }
  }
  
  if (result.plans.length === 0) {
    result.extractionMethod = 'failed';
  }
  
  return result;
}

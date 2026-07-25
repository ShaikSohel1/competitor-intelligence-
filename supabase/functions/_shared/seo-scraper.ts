/**
 * SEO Scraper Module
 * Performs SEO keyword research and SERP position checking.
 * Designed for Deno Edge Functions.
 */

export interface KeywordRankResult {
  keyword: string;
  targetDomain: string;
  rankPosition: number | null; // 1-indexed, null if not in top 30
  foundUrl: string | null;
  serpTopResults: Array<{ rank: number; title: string; url: string; snippet: string }>;
  checkedAt: string;
}

export interface KeywordSuggestion {
  keyword: string;
  source: 'google_autocomplete' | 'duckduckgo';
}

export interface OnPageSeoData {
  url: string;
  title: string;
  metaDescription: string;
  metaKeywords: string | null;
  canonicalUrl: string | null;
  h1: string[];
  h2: string[];
  h3: string[];
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  topKeywordPhrases: Array<{ phrase: string; count: number; density: number }>;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  imagesWithoutAlt: number;
  hasStructuredData: boolean;
  structuredDataTypes: string[];
  analyzedAt: string;
}

export interface SeoScrapeResult {
  rankings: KeywordRankResult[];
  suggestions: KeywordSuggestion[];
  onPageSeo: OnPageSeoData | null;
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'you', 'are', 'from', 'your', 'our', 'can', 'all', 'more', 'has', 'will', 'have', 'been', 'their', 'was', 'were', 'does', 'not', 'its', 'than', 'but', 'about', 'into', 'them', 'then', 'only', 'also', 'just', 'very', 'much', 'some', 'any', 'other', 'what', 'which', 'when', 'where', 'how', 'who', 'each', 'every', 'both', 'few', 'most', 'own', 'same', 'such', 'here', 'there', 'these', 'those', 'a', 'an', 'in', 'on', 'is', 'it', 'of', 'to', 'as', 'by', 'at', 'or', 'be'
]);

function normalizeDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch (e) {
    return urlStr.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks keyword rank on DuckDuckGo search.
 * Returns null gracefully on fetch failure.
 */
export async function checkKeywordRank(keyword: string, targetDomain: string): Promise<KeywordRankResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    
    if (!response.ok) return null;
    const html = await response.text();
    
    const results: Array<{ rank: number; title: string; url: string; snippet: string }> = [];
    const resultBlockRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
    let match;
    let rank = 1;
    let foundPosition: number | null = null;
    let foundUrl: string | null = null;
    const normTargetDomain = normalizeDomain(targetDomain);
    
    while ((match = resultBlockRegex.exec(html)) !== null && rank <= 30) {
      const block = match[1];
      
      const titleMatch = block.match(/<a class="result__a"[^>]*>([\s\S]*?)<\/a>/);
      const urlMatch = block.match(/<a class="result__url" href="([^"]+)">([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      
      if (titleMatch && urlMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        let url = urlMatch[1];
        if (url.startsWith('//duckduckgo.com/l/?uddg=')) {
          const params = new URLSearchParams(url.split('?')[1]);
          const realUrl = params.get('uddg');
          if (realUrl) url = realUrl;
        }
        
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        
        if (rank <= 5) {
          results.push({ rank, title, url, snippet });
        }
        
        const normUrlDomain = normalizeDomain(url);
        if (normUrlDomain === normTargetDomain && foundPosition === null) {
          foundPosition = rank;
          foundUrl = url;
        }
        
        rank++;
      }
    }
    
    return {
      keyword,
      targetDomain,
      rankPosition: foundPosition,
      foundUrl,
      serpTopResults: results,
      checkedAt: new Date().toISOString()
    };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Gets keyword suggestions from Google Autocomplete with fallback to DuckDuckGo.
 */
export async function getKeywordSuggestions(seedKeyword: string): Promise<KeywordSuggestion[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  
  try {
    const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(seedKeyword)}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return data[1].map((s: string) => ({ keyword: s, source: 'google_autocomplete' }));
      }
    }
  } catch (error) {
    // Ignore and fallback
  } finally {
    clearTimeout(timeout);
  }
  
  // Fallback to DuckDuckGo
  const controller2 = new AbortController();
  const timeout2 = setTimeout(() => controller2.abort(), 8000);
  try {
    const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(seedKeyword)}&type=list`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller2.signal
    });
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && Array.isArray(data[1])) {
        return data[1].map((s: string) => ({ keyword: s, source: 'duckduckgo' }));
      }
    }
    return [];
  } catch (error) {
    return [];
  } finally {
    clearTimeout(timeout2);
  }
}

/**
 * Extracts on-page SEO data from a webpage's HTML.
 */
export async function extractOnPageSeo(url: string, htmlStr?: string): Promise<OnPageSeoData | null> {
  let html = htmlStr;
  
  if (!html) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
      if (!response.ok) return null;
      html = await response.text();
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  
  if (!html) return null;
  
  try {
    const getTagContent = (regex: RegExp) => {
      const match = html!.match(regex);
      return match ? match[1].trim() : null;
    };

    const getTagsContent = (regex: RegExp) => {
      const results: string[] = [];
      let match;
      const r = new RegExp(regex, 'g');
      while ((match = r.exec(html!)) !== null) {
        results.push(match[1].replace(/<[^>]+>/g, '').trim());
      }
      return results;
    };

    const title = getTagContent(/<title[^>]*>([\s\S]*?)<\/title>/i) || '';
    const metaDescription = getTagContent(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) || 
                            getTagContent(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) || '';
    const metaKeywords = getTagContent(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i) ||
                         getTagContent(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']keywords["']/i);
    const canonicalUrl = getTagContent(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i) ||
                         getTagContent(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
    
    const h1 = getTagsContent(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const h2 = getTagsContent(/<h2[^>]*>([\s\S]*?)<\/h2>/i);
    const h3 = getTagsContent(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    
    const ogTitle = getTagContent(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i) ||
                    getTagContent(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    const ogDescription = getTagContent(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
                          getTagContent(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);
    const ogImage = getTagContent(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
                    getTagContent(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["']/i);
    
    const baseDomain = normalizeDomain(url);
    
    let internalLinks = 0;
    let externalLinks = 0;
    const linkRegex = /<a[^>]*href=["']([^"']+)["']/gi;
    let linkMatch;
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      if (href.startsWith('#') || href.startsWith('javascript:')) continue;
      
      if (href.startsWith('/') || href.startsWith('.')) {
        internalLinks++;
      } else {
        try {
          const lDomain = normalizeDomain(href);
          if (lDomain === baseDomain) {
            internalLinks++;
          } else {
            externalLinks++;
          }
        } catch (e) {
          externalLinks++;
        }
      }
    }
    
    let imageCount = 0;
    let imagesWithoutAlt = 0;
    const imgRegex = /<img([^>]+)>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      imageCount++;
      if (!/alt=["']/i.test(imgMatch[1])) {
        imagesWithoutAlt++;
      }
    }
    
    let hasStructuredData = false;
    const structuredDataTypes: string[] = [];
    const ldRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch;
    while ((ldMatch = ldRegex.exec(html)) !== null) {
      hasStructuredData = true;
      try {
        const json = JSON.parse(ldMatch[1]);
        if (json['@type']) structuredDataTypes.push(json['@type']);
        else if (Array.isArray(json)) {
            json.forEach(j => { if(j['@type']) structuredDataTypes.push(j['@type']); });
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    }
    
    // Text extraction
    const visibleText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .toLowerCase();
      
    const words = visibleText.match(/[a-z0-9]+/g) || [];
    const wordCount = words.length;
    
    const filteredWords = words.filter(w => w.length > 2 && !STOPWORDS.has(w));
    
    const phraseCounts: Record<string, number> = {};
    
    for (let i = 0; i < filteredWords.length; i++) {
      const w1 = filteredWords[i];
      phraseCounts[w1] = (phraseCounts[w1] || 0) + 1;
      
      if (i < filteredWords.length - 1) {
        const w2 = filteredWords[i+1];
        const bigram = `${w1} ${w2}`;
        phraseCounts[bigram] = (phraseCounts[bigram] || 0) + 1;
      }
    }
    
    const topKeywordPhrases = Object.entries(phraseCounts)
      .map(([phrase, count]) => ({
        phrase,
        count,
        density: wordCount > 0 ? (count / wordCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      url,
      title,
      metaDescription,
      metaKeywords,
      canonicalUrl,
      h1,
      h2,
      h3,
      ogTitle,
      ogDescription,
      ogImage,
      topKeywordPhrases,
      wordCount,
      internalLinks,
      externalLinks,
      imageCount,
      imagesWithoutAlt,
      hasStructuredData,
      structuredDataTypes: [...new Set(structuredDataTypes)],
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

/**
 * Runs a comprehensive SEO analysis for a competitor website.
 */
export async function runSeoAnalysis(competitorWebsite: string, trackedKeywords: string[], html?: string): Promise<SeoScrapeResult> {
  const normTarget = normalizeDomain(competitorWebsite);
  const rankings: KeywordRankResult[] = [];
  
  // Process keywords in batches of 3 with 2 second delay between batches
  for (let i = 0; i < trackedKeywords.length; i += 3) {
    if (i > 0) {
      await delay(2000);
    }
    const batch = trackedKeywords.slice(i, i + 3);
    const results = await Promise.allSettled(
      batch.map(async (kw, idx) => {
        if (idx > 0) await delay(idx * 500); // 500ms delay between duckduckgo requests inside batch
        return checkKeywordRank(kw, normTarget);
      })
    );
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        rankings.push(result.value);
      }
    }
  }
  
  let suggestions: KeywordSuggestion[] = [];
  const topKws = trackedKeywords.slice(0, 3);
  if (topKws.length > 0) {
    const suggResults = await Promise.allSettled(topKws.map(kw => getKeywordSuggestions(kw)));
    for (const result of suggResults) {
      if (result.status === 'fulfilled' && result.value) {
        suggestions.push(...result.value);
      }
    }
    
    // Deduplicate suggestions
    const seen = new Set<string>();
    suggestions = suggestions.filter(s => {
      if (seen.has(s.keyword)) return false;
      seen.add(s.keyword);
      return true;
    });
  }
  
  const onPageSeo = await extractOnPageSeo(competitorWebsite, html);
  
  return {
    rankings,
    suggestions,
    onPageSeo
  };
}

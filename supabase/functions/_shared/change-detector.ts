/**
 * Structural website change detection module.
 * Parses HTML structure via regex and compares it to historical states to detect meaningful pivots.
 */

export interface WebsiteStructure {
  title: string;
  metaDescription: string;
  h1Headings: string[];
  h2Headings: string[];
  navLinks: Array<{ text: string; href: string }>;
  ctaButtons: string[]; // text content of <button> and <a> elements with CTA-like classes/text
  scriptDomains: string[]; // unique external script src domains
  linkDomains: string[]; // unique external link href domains
  schemaTypes: string[]; // JSON-LD @type values
  footerLinks: Array<{ text: string; href: string }>;
  imageCount: number;
  formCount: number;
  structureHash: string; // hash of all the above combined for quick comparison
}

export interface ChangeSignal {
  category: 'positioning_pivot' | 'cta_change' | 'navigation_expansion' | 'navigation_reduction' | 'seo_update' | 'tech_stack_shift' | 'content_expansion' | 'content_reduction' | 'structural_change';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  details: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  };
}

/**
 * FNV-1a Hash Implementation for string hashing
 * @param str The string to hash
 * @returns A hash string representing the 32-bit FNV-1a hash
 */
export function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Helper to strip HTML tags from a string.
 * @param html The HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Computes a hash of the website structure.
 * @param structure The website structure object
 * @returns FNV-1a hash string
 */
export function computeStructureHash(structure: WebsiteStructure): string {
  const hashObj = { ...structure, structureHash: undefined };
  return fnv1aHash(JSON.stringify(hashObj));
}

/**
 * Extracts domain from a URL.
 * @param url The URL string
 * @returns The domain string or empty if invalid
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Extracts a robust representation of a website's structural elements.
 * @param html The HTML string of the webpage
 * @param baseUrl Optional base URL to resolve relative links or identify external domains
 * @returns WebsiteStructure object
 */
export function extractWebsiteStructure(html: string, baseUrl?: string): WebsiteStructure {
  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : '';

  // Meta Description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) 
    || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // H1 and H2
  const h1Headings: string[] = [];
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  let match;
  while ((match = h1Regex.exec(html)) !== null) {
    h1Headings.push(stripHtml(match[1]));
  }

  const h2Headings: string[] = [];
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  while ((match = h2Regex.exec(html)) !== null) {
    h2Headings.push(stripHtml(match[1]));
  }

  // Navigation Links
  const navLinks: Array<{ text: string; href: string }> = [];
  const navRegex = /<nav[^>]*>([\s\S]*?)<\/nav>/i;
  const navMatch = html.match(navRegex);
  let navHtml = navMatch ? navMatch[1] : '';
  
  if (!navHtml) {
    const headerRegex = /<header[^>]*>([\s\S]*?)<\/header>/i;
    const headerMatch = html.match(headerRegex);
    navHtml = headerMatch ? headerMatch[1] : '';
  }

  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  if (navHtml) {
    while ((match = linkRegex.exec(navHtml)) !== null) {
      navLinks.push({ href: match[1], text: stripHtml(match[2]) });
    }
  }

  // Footer Links
  const footerLinks: Array<{ text: string; href: string }> = [];
  const footerRegex = /<footer[^>]*>([\s\S]*?)<\/footer>/i;
  const footerMatch = html.match(footerRegex);
  if (footerMatch) {
    const footerHtml = footerMatch[1];
    const footerLinkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = footerLinkRegex.exec(footerHtml)) !== null) {
      footerLinks.push({ href: match[1], text: stripHtml(match[2]) });
    }
  }

  // CTA Buttons
  const ctaButtons: string[] = [];
  const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
  while ((match = buttonRegex.exec(html)) !== null) {
    const text = stripHtml(match[1]);
    if (text) ctaButtons.push(text);
  }

  const ctaLinkPattern = /class=["'][^"']*(btn|cta|button)[^"']*["']/i;
  const ctaTextPattern = /get started|sign up|try free|book demo|start trial|contact sales|learn more|request demo/i;
  const aRegex = /<a[^>]*>([\s\S]*?)<\/a>/gi;
  while ((match = aRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const text = stripHtml(match[1]);
    if ((ctaLinkPattern.test(fullTag) || ctaTextPattern.test(text)) && text) {
      ctaButtons.push(text);
    }
  }

  // Scripts and Link Domains
  const scriptDomains = new Set<string>();
  const scriptRegex = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
  while ((match = scriptRegex.exec(html)) !== null) {
    const domain = extractDomain(match[1]);
    if (domain) scriptDomains.add(domain);
  }

  const linkDomains = new Set<string>();
  const baseDomain = baseUrl ? extractDomain(baseUrl) : '';
  const allLinksRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
  while ((match = allLinksRegex.exec(html)) !== null) {
    const href = match[1];
    if (href.startsWith('http')) {
      const domain = extractDomain(href);
      if (domain && domain !== baseDomain) {
        linkDomains.add(domain);
      }
    }
  }

  // Schema types
  const schemaTypes: string[] = [];
  const ldJsonRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = ldJsonRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const extractType = (obj: any) => {
        if (obj && typeof obj === 'object') {
          if (obj['@type']) {
            schemaTypes.push(Array.isArray(obj['@type']) ? obj['@type'][0] : obj['@type']);
          }
          Object.values(obj).forEach(extractType);
        }
      };
      extractType(parsed);
    } catch {
      // Ignore JSON parse errors for heuristic extraction
    }
  }

  // Counts
  const imageCount = (html.match(/<img[^>]+>/gi) || []).length;
  const formCount = (html.match(/<form[^>]*>/gi) || []).length;

  const structure: WebsiteStructure = {
    title,
    metaDescription,
    h1Headings,
    h2Headings,
    navLinks,
    ctaButtons: Array.from(new Set(ctaButtons)), // Deduplicate
    scriptDomains: Array.from(scriptDomains),
    linkDomains: Array.from(linkDomains),
    schemaTypes: Array.from(new Set(schemaTypes)),
    footerLinks,
    imageCount,
    formCount,
    structureHash: '',
  };

  structure.structureHash = computeStructureHash(structure);
  return structure;
}

/**
 * Detects structural changes between a previous and current website structure.
 * @param previous The previous structure snapshot
 * @param current The current structure snapshot
 * @returns Array of ChangeSignals representing meaningful changes
 */
export function detectStructuralChanges(previous: WebsiteStructure, current: WebsiteStructure): ChangeSignal[] {
  const signals: ChangeSignal[] = [];

  // H1 Change
  if (JSON.stringify(previous.h1Headings) !== JSON.stringify(current.h1Headings)) {
    signals.push({
      category: 'positioning_pivot',
      severity: 'high',
      title: 'Primary value proposition changed',
      description: 'H1 headings have been modified, suggesting a shift in core positioning.',
      details: { field: 'h1Headings', oldValue: previous.h1Headings, newValue: current.h1Headings }
    });
  }

  // CTA Buttons Change
  if (JSON.stringify(previous.ctaButtons) !== JSON.stringify(current.ctaButtons)) {
    signals.push({
      category: 'cta_change',
      severity: 'high',
      title: 'Call-to-action messaging updated',
      description: 'CTA buttons have changed. Look for signs of GTM pivots like PLG to Sales-Led.',
      details: { field: 'ctaButtons', oldValue: previous.ctaButtons, newValue: current.ctaButtons }
    });
  }

  // Nav Links Change
  const prevNavText = new Set(previous.navLinks.map(l => l.text));
  const currNavText = new Set(current.navLinks.map(l => l.text));
  const newNavLinks = current.navLinks.filter(l => !prevNavText.has(l.text));
  const removedNavLinks = previous.navLinks.filter(l => !currNavText.has(l.text));

  if (newNavLinks.length > 0) {
    signals.push({
      category: 'navigation_expansion',
      severity: 'medium',
      title: `${newNavLinks.length} new navigation routes added`,
      description: 'New routes added to navigation, indicating new products, features, or focuses.',
      details: { field: 'navLinks_added', oldValue: [], newValue: newNavLinks }
    });
  }
  
  if (removedNavLinks.length > 0) {
    signals.push({
      category: 'navigation_reduction',
      severity: 'medium',
      title: `${removedNavLinks.length} navigation routes removed`,
      description: 'Routes removed from navigation, suggesting deprecated products or simplified offering.',
      details: { field: 'navLinks_removed', oldValue: removedNavLinks, newValue: [] }
    });
  }

  // SEO Update
  if (previous.title !== current.title || previous.metaDescription !== current.metaDescription) {
    signals.push({
      category: 'seo_update',
      severity: 'low',
      title: 'SEO metadata updated',
      description: 'Title or meta description tags have been modified.',
      details: { 
        field: 'seo', 
        oldValue: { title: previous.title, desc: previous.metaDescription }, 
        newValue: { title: current.title, desc: current.metaDescription } 
      }
    });
  }

  // Tech Stack Shift (Scripts)
  if (JSON.stringify(previous.scriptDomains) !== JSON.stringify(current.scriptDomains)) {
    signals.push({
      category: 'tech_stack_shift',
      severity: 'medium',
      title: 'Technology stack changes detected',
      description: 'External script domains have changed, implying new or removed third-party tools.',
      details: { field: 'scriptDomains', oldValue: previous.scriptDomains, newValue: current.scriptDomains }
    });
  }

  // H2 Change (>30% different)
  const prevH2 = previous.h2Headings;
  const currH2 = current.h2Headings;
  if (prevH2.length > 0 || currH2.length > 0) {
    const diffCount = Math.abs(prevH2.length - currH2.length) + 
      currH2.filter(h => !prevH2.includes(h)).length;
    const total = Math.max(prevH2.length, currH2.length, 1);
    const diffRatio = diffCount / total;
    
    if (diffRatio > 0.3) {
      const isExpansion = currH2.length > prevH2.length;
      signals.push({
        category: isExpansion ? 'content_expansion' : 'content_reduction',
        severity: 'low',
        title: `Significant H2 heading changes (${isExpansion ? 'expansion' : 'reduction'})`,
        description: 'Over 30% of secondary headings changed.',
        details: { field: 'h2Headings', oldValue: prevH2, newValue: currH2 }
      });
    }
  }

  // Footer Links Change
  if (JSON.stringify(previous.footerLinks) !== JSON.stringify(current.footerLinks)) {
    signals.push({
      category: 'structural_change',
      severity: 'info',
      title: 'Footer links modified',
      description: 'Changes detected in website footer links.',
      details: { field: 'footerLinks', oldValue: previous.footerLinks.length, newValue: current.footerLinks.length }
    });
  }

  // Image Count
  if (previous.imageCount > 0) {
    const imgDiff = Math.abs(current.imageCount - previous.imageCount) / previous.imageCount;
    if (imgDiff > 0.25) {
      signals.push({
        category: current.imageCount > previous.imageCount ? 'content_expansion' : 'content_reduction',
        severity: 'low',
        title: 'Significant change in image count',
        description: `Image count changed by over 25% (${previous.imageCount} to ${current.imageCount}).`,
        details: { field: 'imageCount', oldValue: previous.imageCount, newValue: current.imageCount }
      });
    }
  }

  // Form Count
  if (previous.formCount !== current.formCount) {
    signals.push({
      category: 'structural_change',
      severity: 'low',
      title: 'Form count changed',
      description: `Number of forms changed from ${previous.formCount} to ${current.formCount}.`,
      details: { field: 'formCount', oldValue: previous.formCount, newValue: current.formCount }
    });
  }

  // Schema Types
  if (JSON.stringify(previous.schemaTypes) !== JSON.stringify(current.schemaTypes)) {
    signals.push({
      category: 'structural_change',
      severity: 'info',
      title: 'JSON-LD schema types changed',
      description: 'Structured data schemas on the page have been updated.',
      details: { field: 'schemaTypes', oldValue: previous.schemaTypes, newValue: current.schemaTypes }
    });
  }

  return signals;
}

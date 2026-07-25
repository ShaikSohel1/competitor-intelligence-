/**
 * Ad and technology stack detection module.
 * Detects advertising technology and tech stack from competitor website HTML.
 */

export interface DetectedAdNetwork {
  platform: string;
  detected: boolean;
  pixelId?: string; // extracted ID if found
  evidence: string; // the matching pattern
}

export interface DetectedAdNetworks {
  networks: DetectedAdNetwork[];
  totalActiveCount: number;
  detectedAt: string;
}

export interface TechStackItem {
  category: 'analytics' | 'live_chat' | 'ab_testing' | 'payment' | 'cdn' | 'framework' | 'marketing' | 'crm' | 'monitoring';
  name: string;
  detected: boolean;
  version?: string;
}

export interface TechStackResult {
  items: TechStackItem[];
  totalDetected: number;
  detectedAt: string;
}

/**
 * Extracts a match using a regular expression and returns the capture group or full match.
 * @param html The HTML string to search.
 * @param pattern The regular expression pattern.
 * @param groupIndex The capture group index to return (default 1).
 * @returns The matched string or undefined if not found.
 */
export function extractPattern(html: string, pattern: RegExp, groupIndex: number = 1): string | undefined {
  const match = html.match(pattern);
  if (match) {
    return match[groupIndex] || match[0];
  }
  return undefined;
}

/**
 * Detects major ad platforms by their tracking pixel signatures in the HTML.
 * @param html The HTML content of the website.
 * @returns An object containing the detected ad networks and total count.
 */
export function detectAdPixels(html: string): DetectedAdNetworks {
  const networks: DetectedAdNetwork[] = [];

  // Meta/Facebook Pixel
  const fbMatch = html.match(/fbq\s*\(\s*['"]init['"]\s*,\s*['"]([^'"]+)['"]/i);
  const fbDetected = !!fbMatch || /connect\.facebook\.net\/.*\/fbevents\.js/i.test(html);
  if (fbDetected) {
    networks.push({
      platform: 'Meta/Facebook',
      detected: true,
      pixelId: fbMatch ? fbMatch[1] : undefined,
      evidence: fbMatch ? fbMatch[0] : 'fbevents.js',
    });
  }

  // Google Ads/GTAG
  const googleMatch = html.match(/googletagmanager\.com\/gtag\/js\?id=(AW-[^&"']+)/i);
  const googleDetected = !!googleMatch || /google_conversion_id/i.test(html);
  if (googleDetected) {
    networks.push({
      platform: 'Google Ads',
      detected: true,
      pixelId: googleMatch ? googleMatch[1] : undefined,
      evidence: googleMatch ? googleMatch[0] : 'google_conversion_id',
    });
  }

  // LinkedIn Insight Tag
  const liMatch = html.match(/_linkedin_partner_id\s*=\s*['"]([^'"]+)['"]/i);
  const liDetected = !!liMatch || /snap\.licdn\.com\/li\.lms-analytics\/insight/i.test(html);
  if (liDetected) {
    networks.push({
      platform: 'LinkedIn',
      detected: true,
      pixelId: liMatch ? liMatch[1] : undefined,
      evidence: liMatch ? liMatch[0] : 'insight tag',
    });
  }

  // TikTok Pixel
  const ttMatch = html.match(/ttq\.load\s*\(\s*['"]([^'"]+)['"]/i);
  const ttDetected = !!ttMatch || /analytics\.tiktok\.com\/i18n\/pixel/i.test(html);
  if (ttDetected) {
    networks.push({
      platform: 'TikTok',
      detected: true,
      pixelId: ttMatch ? ttMatch[1] : undefined,
      evidence: ttMatch ? ttMatch[0] : 'tiktok pixel script',
    });
  }

  // X/Twitter Pixel
  const twMatch = html.match(/twq\s*\(\s*['"]config['"]\s*,\s*['"]([^'"]+)['"]/i);
  const twDetected = !!twMatch || /static\.ads-twitter\.com\/uwt\.js/i.test(html);
  if (twDetected) {
    networks.push({
      platform: 'X/Twitter',
      detected: true,
      pixelId: twMatch ? twMatch[1] : undefined,
      evidence: twMatch ? twMatch[0] : 'twitter pixel script',
    });
  }

  // AdRoll
  const adrollMatch = html.match(/adroll_adv_id\s*=\s*['"]([^'"]+)['"]/i);
  const adrollDetected = !!adrollMatch || /s\.adroll\.com\/j\/roundtrip\.js/i.test(html);
  if (adrollDetected) {
    networks.push({
      platform: 'AdRoll',
      detected: true,
      pixelId: adrollMatch ? adrollMatch[1] : undefined,
      evidence: adrollMatch ? adrollMatch[0] : 'roundtrip.js',
    });
  }

  // Criteo
  const criteoDetected = /static\.criteo\.net\/js\/ld\/ld\.js/i.test(html);
  if (criteoDetected) {
    networks.push({
      platform: 'Criteo',
      detected: true,
      evidence: 'static.criteo.net',
    });
  }

  // Pinterest Tag
  const pinterestDetected = /pintrk/i.test(html) || /s\.pinimg\.com\/ct\/core\.js/i.test(html);
  if (pinterestDetected) {
    networks.push({
      platform: 'Pinterest',
      detected: true,
      evidence: 'pintrk or s.pinimg.com',
    });
  }

  // Snapchat Pixel
  const snapchatDetected = /sc-static\.net\/scevent\.min\.js/i.test(html);
  if (snapchatDetected) {
    networks.push({
      platform: 'Snapchat',
      detected: true,
      evidence: 'scevent.min.js',
    });
  }

  // Microsoft/Bing Ads
  const bingDetected = /bat\.bing\.com\/bat\.js/i.test(html) || /uetq/i.test(html);
  if (bingDetected) {
    networks.push({
      platform: 'Microsoft/Bing Ads',
      detected: true,
      evidence: 'bat.bing.com or uetq',
    });
  }

  return {
    networks,
    totalActiveCount: networks.length,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Detects common web technologies in the HTML.
 * @param html The HTML content of the website.
 * @returns An object containing the detected tech stack items and total count.
 */
export function detectTechStack(html: string): TechStackResult {
  const items: TechStackItem[] = [];
  
  const techPatterns: Array<{ name: string; category: TechStackItem['category']; pattern: RegExp }> = [
    // Analytics
    { name: 'Google Analytics 4', category: 'analytics', pattern: /gtag\.[^"']*G-/i },
    { name: 'Hotjar', category: 'analytics', pattern: /static\.hotjar\.com/i },
    { name: 'Mixpanel', category: 'analytics', pattern: /cdn\.mxpnl\.com/i },
    { name: 'Segment', category: 'analytics', pattern: /cdn\.segment\.com/i },
    { name: 'Amplitude', category: 'analytics', pattern: /cdn\.amplitude\.com/i },
    { name: 'Heap', category: 'analytics', pattern: /cdn\.heapanalytics\.com/i },
    { name: 'Plausible', category: 'analytics', pattern: /plausible\.io\/js/i },
    { name: 'Posthog', category: 'analytics', pattern: /posthog/i },

    // Live Chat
    { name: 'Intercom', category: 'live_chat', pattern: /widget\.intercom\.io/i },
    { name: 'Drift', category: 'live_chat', pattern: /js\.driftt\.com/i },
    { name: 'Zendesk', category: 'live_chat', pattern: /static\.zdassets\.com/i },
    { name: 'Crisp', category: 'live_chat', pattern: /client\.crisp\.chat/i },
    { name: 'HubSpot Chat', category: 'live_chat', pattern: /js\.hs-scripts\.com/i },
    { name: 'Freshchat', category: 'live_chat', pattern: /wchat\.freshchat\.com/i },

    // A/B Testing
    { name: 'Optimizely', category: 'ab_testing', pattern: /cdn\.optimizely\.com/i },
    { name: 'VWO', category: 'ab_testing', pattern: /dev\.visualwebsiteoptimizer\.com/i },
    { name: 'LaunchDarkly', category: 'ab_testing', pattern: /app\.launchdarkly\.com/i },

    // Payment
    { name: 'Stripe', category: 'payment', pattern: /js\.stripe\.com/i },
    { name: 'PayPal', category: 'payment', pattern: /paypal\.com\/sdk/i },
    { name: 'Braintree', category: 'payment', pattern: /js\.braintreegateway\.com/i },

    // CDN
    { name: 'Cloudflare', category: 'cdn', pattern: /cloudflare/i },
    { name: 'Fastly', category: 'cdn', pattern: /fastly/i },
    { name: 'AWS CloudFront', category: 'cdn', pattern: /cloudfront\.net/i },

    // Framework
    { name: 'Next.js', category: 'framework', pattern: /__NEXT_DATA__|href=["'][^"']*_next\//i },
    { name: 'Nuxt', category: 'framework', pattern: /__NUXT__/i },
    { name: 'Gatsby', category: 'framework', pattern: /id=["']gatsby-focus-wrapper["']|gatsby/i },
    { name: 'WordPress', category: 'framework', pattern: /wp-content/i },
    { name: 'Shopify', category: 'framework', pattern: /cdn\.shopify\.com/i },
    { name: 'Webflow', category: 'framework', pattern: /data-wf-page|webflow/i },

    // Marketing
    { name: 'HubSpot', category: 'marketing', pattern: /js\.hs-analytics\.net/i },
    { name: 'Marketo', category: 'marketing', pattern: /munchkin/i },
    { name: 'Pardot', category: 'marketing', pattern: /pi\.pardot\.com/i },
    { name: 'Mailchimp', category: 'marketing', pattern: /chimpstatic\.com/i },

    // CRM
    { name: 'Salesforce', category: 'crm', pattern: /force\.com|salesforce/i },

    // Monitoring
    { name: 'Sentry', category: 'monitoring', pattern: /browser\.sentry-cdn\.com/i },
    { name: 'Datadog', category: 'monitoring', pattern: /datadoghq\.com/i },
    { name: 'New Relic', category: 'monitoring', pattern: /newrelic/i },
    { name: 'LogRocket', category: 'monitoring', pattern: /cdn\.logrocket\.io/i },
  ];

  for (const { name, category, pattern } of techPatterns) {
    if (pattern.test(html)) {
      items.push({
        category,
        name,
        detected: true,
      });
    }
  }

  return {
    items,
    totalDetected: items.length,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Convenience function that runs both detectors on the given HTML.
 * @param html The HTML content of the website.
 * @returns Both ad network and tech stack detection results.
 */
export function detectAllFromHtml(html: string): { ads: DetectedAdNetworks; techStack: TechStackResult } {
  return {
    ads: detectAdPixels(html),
    techStack: detectTechStack(html),
  };
}

/**
 * Competitor Intelligence Social Media Scraper
 * Module for scraping public social media profiles.
 * Designed for Deno edge functions.
 */

export interface SocialProfileData {
  platform: 'youtube' | 'linkedin' | 'twitter' | 'instagram' | 'facebook';
  handle: string;
  name: string | null;
  followers: number | null;
  followersText: string | null;
  bio: string | null;
  avatarUrl: string | null;
  postCount: number | null;
  recentPosts: SocialPost[];
  scrapedAt: string;
}

export interface SocialPost {
  id: string;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  };
}

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

const SCRAPER_TIMEOUT_MS = 8000;

/**
 * Creates an AbortController that times out after SCRAPER_TIMEOUT_MS
 */
function createTimeout(): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), SCRAPER_TIMEOUT_MS);
  return controller;
}

/**
 * Extracts a meta property value from HTML using regex.
 */
function extractOgTag(html: string, property: string): string | null {
  const regex = new RegExp(`<meta\\s+(?:property|name)=["'](?:og:)?${property}["']\\s+content=["']([^"']+)["']\\s*/?>`, 'i');
  const match = html.match(regex);
  if (match) return match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  
  // Try reversed attribute order
  const regexRev = new RegExp(`<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["'](?:og:)?${property}["']\\s*/?>`, 'i');
  const matchRev = html.match(regexRev);
  if (matchRev) return matchRev[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  
  return null;
}

/**
 * Extracts handle or slug from a full social media URL.
 */
function extractHandleFromUrl(url: string, platform: string): string | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    
    if (platform === 'youtube') {
      if (pathParts[0] === 'c' || pathParts[0] === 'channel') return pathParts[1];
      if (pathParts[0] && pathParts[0].startsWith('@')) return pathParts[0];
      return pathParts[0] || null;
    }
    
    if (platform === 'linkedin') {
      if (pathParts[0] === 'company') return pathParts[1];
      return null;
    }
    
    if (platform === 'twitter' || platform === 'instagram' || platform === 'facebook') {
      return pathParts[0] || null;
    }
    
    return null;
  } catch {
    return null; // Invalid URL
  }
}

/**
 * Parses follower counts from strings like "1.2M", "12K", "1,234".
 */
function parseFollowerCount(text: string): number | null {
  const match = text.match(/([0-9.,]+)\s*([KkMmBb]?)/);
  if (!match) return null;
  
  let num = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(num)) return null;
  
  const suffix = match[2].toUpperCase();
  if (suffix === 'K') num *= 1000;
  else if (suffix === 'M') num *= 1000000;
  else if (suffix === 'B') num *= 1000000000;
  
  return Math.round(num);
}

/**
 * Scrapes a YouTube channel profile and its RSS feed.
 */
export async function scrapeYouTubeChannel(handleOrId: string): Promise<SocialProfileData | null> {
  try {
    const controller = createTimeout();
    let channelId = handleOrId;
    let name = null;
    let bio = null;
    let avatarUrl = null;
    let followers = null;
    let followersText = null;
    
    if (handleOrId.startsWith('@') || !handleOrId.startsWith('UC')) {
      const url = `https://www.youtube.com/${handleOrId.startsWith('@') ? '' : '@'}${handleOrId.replace('@', '')}`;
      const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
      if (!res.ok) return null;
      const html = await res.text();
      
      const ogUrl = extractOgTag(html, 'url') || '';
      const idMatch = ogUrl.match(/channel\/(UC[\w-]+)/);
      if (idMatch) channelId = idMatch[1];
      
      name = extractOgTag(html, 'title');
      bio = extractOgTag(html, 'description');
      avatarUrl = extractOgTag(html, 'image');
      
      // Try to parse subscriber count from ytInitialData
      const subsMatch = html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"\}\}/);
      if (subsMatch) {
        followersText = subsMatch[1];
        followers = parseFollowerCount(subsMatch[1]);
      }
    }
    
    const recentPosts: SocialPost[] = [];
    if (channelId) {
      try {
        const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, { signal: controller.signal });
        if (rssRes.ok) {
          const xml = await rssRes.text();
          const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
          let entryMatch;
          
          while ((entryMatch = entryRegex.exec(xml)) !== null && recentPosts.length < 15) {
            const entryXml = entryMatch[1];
            const videoIdMatch = entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
            const titleMatch = entryXml.match(/<title>([^<]+)<\/title>/);
            const pubMatch = entryXml.match(/<published>([^<]+)<\/published>/);
            const linkMatch = entryXml.match(/<link rel="alternate" href="([^"]+)"/);
            
            if (videoIdMatch && titleMatch && pubMatch) {
              recentPosts.push({
                id: videoIdMatch[1],
                title: titleMatch[1],
                content: '',
                url: linkMatch ? linkMatch[1] : `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
                publishedAt: pubMatch[1],
                engagement: { likes: 0, comments: 0, shares: 0 }
              });
            }
          }
        }
      } catch (e) {
        // Ignore RSS failure
      }
    }

    return {
      platform: 'youtube',
      handle: handleOrId,
      name,
      followers,
      followersText,
      bio,
      avatarUrl,
      postCount: null,
      recentPosts,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

/**
 * Scrapes a LinkedIn company profile.
 */
export async function scrapeLinkedInCompany(companySlug: string): Promise<SocialProfileData | null> {
  try {
    const controller = createTimeout();
    const res = await fetch(`https://www.linkedin.com/company/${companySlug}`, { headers: DEFAULT_HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const html = await res.text();
    
    const name = extractOgTag(html, 'title');
    const bio = extractOgTag(html, 'description');
    const avatarUrl = extractOgTag(html, 'image');
    
    let followers = null;
    let followersText = null;
    
    if (bio) {
      const match = bio.match(/([0-9.,KMBkmb]+)\s+followers\s+on\s+LinkedIn/i);
      if (match) {
        followersText = match[0];
        followers = parseFollowerCount(match[1]);
      }
    }

    return {
      platform: 'linkedin',
      handle: companySlug,
      name,
      followers,
      followersText,
      bio,
      avatarUrl,
      postCount: null,
      recentPosts: [],
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

/**
 * Scrapes a Twitter profile.
 */
export async function scrapeTwitterProfile(handle: string): Promise<SocialProfileData | null> {
  try {
    const controller = createTimeout();
    const res = await fetch(`https://x.com/${handle}`, { headers: DEFAULT_HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const html = await res.text();
    
    const name = extractOgTag(html, 'title');
    const bio = extractOgTag(html, 'description');
    const avatarUrl = extractOgTag(html, 'image');
    
    let followers = null;
    let followersText = null;
    
    if (bio) {
      const match = bio.match(/([0-9.,KMBkmb]+)\s+Followers/i);
      if (match) {
        followersText = match[0];
        followers = parseFollowerCount(match[1]);
      }
    }

    return {
      platform: 'twitter',
      handle,
      name,
      followers,
      followersText,
      bio,
      avatarUrl,
      postCount: null,
      recentPosts: [],
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

/**
 * Scrapes an Instagram profile.
 */
export async function scrapeInstagramProfile(handle: string): Promise<SocialProfileData | null> {
  try {
    const controller = createTimeout();
    const res = await fetch(`https://www.instagram.com/${handle}/`, { headers: DEFAULT_HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const html = await res.text();
    
    const name = extractOgTag(html, 'title');
    const bio = extractOgTag(html, 'description');
    const avatarUrl = extractOgTag(html, 'image');
    
    let followers = null;
    let followersText = null;
    let postCount = null;
    
    if (bio) {
      // "X Followers, Y Following, Z Posts - See Instagram photos..."
      const match = bio.match(/([0-9.,KMBkmb]+)\s+Followers/i);
      if (match) {
        followersText = match[0];
        followers = parseFollowerCount(match[1]);
      }
      const postMatch = bio.match(/([0-9.,KMBkmb]+)\s+Posts/i);
      if (postMatch) {
        postCount = parseFollowerCount(postMatch[1]);
      }
    }

    return {
      platform: 'instagram',
      handle,
      name,
      followers,
      followersText,
      bio,
      avatarUrl,
      postCount,
      recentPosts: [],
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

/**
 * Scrapes a Facebook page profile via mbasic.
 */
export async function scrapeFacebookPage(pageId: string): Promise<SocialProfileData | null> {
  try {
    const controller = createTimeout();
    const res = await fetch(`https://mbasic.facebook.com/${pageId}`, { headers: DEFAULT_HEADERS, signal: controller.signal });
    if (!res.ok) return null;
    const html = await res.text();
    
    const name = extractOgTag(html, 'title');
    const bio = extractOgTag(html, 'description');
    const avatarUrl = extractOgTag(html, 'image');
    
    let followers = null;
    let followersText = null;
    
    if (bio) {
      const match = bio.match(/([0-9.,KMBkmb]+)\s+(likes|followers)/i);
      if (match) {
        followersText = match[0];
        followers = parseFollowerCount(match[1]);
      }
    }

    return {
      platform: 'facebook',
      handle: pageId,
      name,
      followers,
      followersText,
      bio,
      avatarUrl,
      postCount: null,
      recentPosts: [],
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    return null;
  }
}

/**
 * Scrapes multiple social profiles concurrently.
 */
export async function scrapeAllSocialProfiles(socialLinks: Record<string, string>): Promise<SocialProfileData[]> {
  const promises: Promise<SocialProfileData | null>[] = [];
  
  if (socialLinks.youtube) {
    const handle = extractHandleFromUrl(socialLinks.youtube, 'youtube');
    if (handle) promises.push(scrapeYouTubeChannel(handle));
  }
  if (socialLinks.linkedin) {
    const handle = extractHandleFromUrl(socialLinks.linkedin, 'linkedin');
    if (handle) promises.push(scrapeLinkedInCompany(handle));
  }
  if (socialLinks.twitter) {
    const handle = extractHandleFromUrl(socialLinks.twitter, 'twitter');
    if (handle) promises.push(scrapeTwitterProfile(handle));
  }
  if (socialLinks.instagram) {
    const handle = extractHandleFromUrl(socialLinks.instagram, 'instagram');
    if (handle) promises.push(scrapeInstagramProfile(handle));
  }
  if (socialLinks.facebook) {
    const handle = extractHandleFromUrl(socialLinks.facebook, 'facebook');
    if (handle) promises.push(scrapeFacebookPage(handle));
  }

  const results = await Promise.allSettled(promises);
  
  const validResults: SocialProfileData[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      validResults.push(result.value);
    }
  }
  
  return validResults;
}

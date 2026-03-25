import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 60;

interface CrawlResult {
  businessDescription: string;
  services: string[];
  faq: { question: string; answer: string }[];
  businessHours: string;
  contactInfo: { phone?: string; email?: string; address?: string };
  teamMembers: string[];
  socialProfiles: Record<string, string>;
  reviewSources: { platform: string; url: string }[];
  brandVoice: string;
  industryKeywords: string[];
  jobListings: string[];
  pagesScanned: string[];
}

const PAGES_TO_TRY = [
  "",
  "/about",
  "/about-us",
  "/services",
  "/products",
  "/faq",
  "/frequently-asked-questions",
  "/contact",
  "/contact-us",
  "/careers",
  "/jobs",
  "/team",
  "/our-team",
];

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ProjectAgent/1.0; business-onboarding)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();
    return html.slice(0, 50_000);
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " [FOOTER] ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " [HEADER] ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMetaTags(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const regex =
    /<meta\s+(?:[^>]*?(?:name|property)\s*=\s*["']([^"']+)["'][^>]*?content\s*=\s*["']([^"']+)["']|[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?(?:name|property)\s*=\s*["']([^"']+)["'])[^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const key = (match[1] || match[4] || "").toLowerCase();
    const value = match[2] || match[3] || "";
    if (key && value) meta[key] = value;
  }
  return meta;
}

function extractSocialLinks(html: string): Record<string, string> {
  const social: Record<string, string> = {};
  const patterns: [string, RegExp][] = [
    ["facebook", /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"'\s]+)["']/gi],
    ["instagram", /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"'\s]+)["']/gi],
    ["twitter", /href=["'](https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"'\s]+)["']/gi],
    ["linkedin", /href=["'](https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^"'\s]+)["']/gi],
    ["youtube", /href=["'](https?:\/\/(?:www\.)?youtube\.com\/[^"'\s]+)["']/gi],
    ["tiktok", /href=["'](https?:\/\/(?:www\.)?tiktok\.com\/@[^"'\s]+)["']/gi],
  ];

  for (const [name, regex] of patterns) {
    const match = regex.exec(html);
    if (match) social[name] = match[1];
  }

  return social;
}

function extractReviewLinks(html: string, domain: string): { platform: string; url: string }[] {
  const reviews: { platform: string; url: string }[] = [];
  const patterns: [string, RegExp][] = [
    ["Google Reviews", /href=["'](https?:\/\/(?:www\.)?google\.com\/maps\/place\/[^"'\s]+)["']/gi],
    ["Google Reviews", /href=["'](https?:\/\/g\.page\/[^"'\s]+)["']/gi],
    ["Trustpilot", /href=["'](https?:\/\/(?:www\.)?trustpilot\.com\/review\/[^"'\s]+)["']/gi],
    ["TripAdvisor", /href=["'](https?:\/\/(?:www\.)?tripadvisor\.com\/[^"'\s]+)["']/gi],
    ["Yelp", /href=["'](https?:\/\/(?:www\.)?yelp\.com\/biz\/[^"'\s]+)["']/gi],
  ];

  for (const [platform, regex] of patterns) {
    const match = regex.exec(html);
    if (match) reviews.push({ platform, url: match[1] });
  }

  // Also add potential Google Maps / review URLs based on domain
  reviews.push({
    platform: "Google Business",
    url: `https://www.google.com/search?q=${encodeURIComponent(domain)}+reviews`,
  });

  return reviews;
}

async function extractWithLLM(
  pagesContent: { path: string; text: string }[],
  meta: Record<string, string>,
  socialProfiles: Record<string, string>
): Promise<Partial<CrawlResult>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {};
  }

  const combinedText = pagesContent
    .map((p) => `=== PAGE: ${p.path} ===\n${p.text.slice(0, 8000)}`)
    .join("\n\n")
    .slice(0, 30_000);

  const metaStr = Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `Analyze this business website content and extract structured data. Return ONLY valid JSON, no markdown.

META TAGS:
${metaStr}

SOCIAL PROFILES FOUND:
${JSON.stringify(socialProfiles)}

WEBSITE CONTENT:
${combinedText}

Extract and return this JSON structure:
{
  "businessDescription": "2-3 sentence description of what the business does",
  "services": ["list of main services/products offered"],
  "faq": [{"question": "...", "answer": "..."}, ...] (up to 15 Q&As, infer from content if no explicit FAQ page),
  "businessHours": "operating hours if found, or empty string",
  "contactInfo": {"phone": "...", "email": "...", "address": "..."},
  "teamMembers": ["Name - Role", ...] (if team page found),
  "brandVoice": "Brief description of the brand's tone/voice based on the copy style (e.g. professional, friendly, technical, luxurious)",
  "industryKeywords": ["top 10-15 keywords relevant to this business and industry"],
  "jobListings": ["Job Title 1", "Job Title 2", ...] (if careers page found)
}

Only include fields where you found real data. Use empty arrays/strings for missing data.`,
          },
        ],
      }),
    });

    if (!res.ok) return {};

    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    return JSON.parse(jsonMatch[0]);
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url: rawUrl } = await request.json();

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL
    let baseUrl = rawUrl.trim();
    if (!baseUrl.startsWith("http")) {
      baseUrl = `https://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/+$/, "");

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Crawl pages in parallel
    const pagePromises = PAGES_TO_TRY.map(async (path) => {
      const fullUrl = `${baseUrl}${path}`;
      const html = await fetchPage(fullUrl);
      if (!html) return null;
      return { path: path || "/", html, text: stripHtml(html) };
    });

    const rawResults = await Promise.all(pagePromises);
    const pages = rawResults.filter(
      (p): p is { path: string; html: string; text: string } => p !== null
    );

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "Could not fetch any pages from this URL. Please check the URL and try again." },
        { status: 422 }
      );
    }

    // Extract meta tags and social links from homepage
    const homepageHtml = pages.find((p) => p.path === "/")?.html || pages[0].html;
    const meta = extractMetaTags(homepageHtml);
    const allHtml = pages.map((p) => p.html).join(" ");
    const socialProfiles = extractSocialLinks(allHtml);
    const reviewSources = extractReviewLinks(allHtml, parsedUrl.hostname);

    // Use LLM to extract structured data
    const llmData = await extractWithLLM(pages, meta, socialProfiles);

    const result: CrawlResult = {
      businessDescription: llmData.businessDescription || meta["og:description"] || meta.description || "",
      services: llmData.services || [],
      faq: llmData.faq || [],
      businessHours: llmData.businessHours || "",
      contactInfo: llmData.contactInfo || {},
      teamMembers: llmData.teamMembers || [],
      socialProfiles,
      reviewSources,
      brandVoice: llmData.brandVoice || "",
      industryKeywords: llmData.industryKeywords || [],
      jobListings: llmData.jobListings || [],
      pagesScanned: pages.map((p) => `${baseUrl}${p.path}`),
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Crawl failed. Please try again." },
      { status: 500 }
    );
  }
}

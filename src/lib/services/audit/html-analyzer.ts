export interface RawHtmlSignals {
  url: string;
  finalUrl: string;
  statusCode: number;
  isHttps: boolean;
  responseTimeMs: number;
  contentLengthBytes: number;
  title: string | null;
  metaDescription: string | null;
  metaViewport: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h1Text: string | null;
  totalImages: number;
  imagesWithAlt: number;
  missingAltCount: number;
  hasForms: boolean;
  formCount: number;
  hasEmailInputs: boolean;
  hasTelInputs: boolean;
  hasPhoneLink: boolean;
  hasMailtoLink: boolean;
  ctaButtonTexts: string[];
  scriptCount: number;
  stylesheetCount: number;
  hasInlineStyles: boolean;
  textSnippet: string;
}

export class HtmlAnalyzer {
  async fetchAndAnalyze(targetUrl: string): Promise<RawHtmlSignals> {
    let normalizedUrl = targetUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let response: Response;
    try {
      response = await fetch(normalizedUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SynapseOps/1.0",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        },
        redirect: "follow",
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      if (fetchErr.name === "AbortError") {
        throw new Error(`Connection timed out after 12s while fetching ${normalizedUrl}`);
      }
      throw new Error(`Failed to reach ${normalizedUrl}: ${fetchErr.message || "Network error"}`);
    } finally {
      clearTimeout(timeout);
    }

    const responseTimeMs = Date.now() - startTime;
    const html = await response.text();
    const contentLengthBytes = Buffer.byteLength(html, "utf8");

    // Deterministic Regex-based HTML parsing
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : null;

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
    const metaDescription = metaDescMatch && metaDescMatch[1] ? metaDescMatch[1].trim() : null;

    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                          html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']viewport["'][^>]*>/i);
    const metaViewport = viewportMatch && viewportMatch[1] ? viewportMatch[1].trim() : null;

    const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
    const canonicalUrl = canonicalMatch && canonicalMatch[1] ? canonicalMatch[1].trim() : null;

    const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const robotsMeta = robotsMatch && robotsMatch[1] ? robotsMatch[1].trim() : null;

    // Headings
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
    const h2Matches = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) || [];
    const h3Matches = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/gi) || [];
    const firstH1Text = h1Matches.length > 0 && h1Matches[0] ? h1Matches[0].replace(/<[^>]*>/g, "").trim() : null;

    // Images
    const imgMatches = html.match(/<img[^>]*>/gi) || [];
    let imagesWithAlt = 0;
    for (const img of imgMatches) {
      if (/alt=["'][^"']+["']/i.test(img)) {
        imagesWithAlt++;
      }
    }
    const missingAltCount = imgMatches.length - imagesWithAlt;

    // Forms & Inputs
    const formMatches = html.match(/<form[^>]*>[\s\S]*?<\/form>/gi) || [];
    const hasEmailInputs = /<input[^>]*type=["']email["']/i.test(html) || /name=["'][^"']*email[^"']*["']/i.test(html);
    const hasTelInputs = /<input[^>]*type=["']tel["']/i.test(html) || /name=["'][^"']*phone[^"']*["']/i.test(html);

    // Contact Links
    const hasPhoneLink = /href=["']tel:[^"']+["']/i.test(html);
    const hasMailtoLink = /href=["']mailto:[^"']+["']/i.test(html);

    // CTAs (buttons, links with action phrases)
    const ctaPhrases = [
      "contact", "get in touch", "inquire", "inquiry", "book", "schedule", 
      "get quote", "request quote", "learn more", "apply", "call us", "message us",
      "sign up", "register", "view properties", "explore", "buy now"
    ];
    const ctaButtonTexts: string[] = [];
    const linkAndBtnMatches = html.match(/<(?:a|button)[^>]*>([\s\S]*?)<\/(?:a|button)>/gi) || [];
    
    for (const tag of linkAndBtnMatches) {
      const text = tag.replace(/<[^>]*>/g, "").trim().toLowerCase();
      if (text && text.length < 50 && ctaPhrases.some(phrase => text.includes(phrase))) {
        if (!ctaButtonTexts.includes(text)) {
          ctaButtonTexts.push(text);
        }
      }
    }

    // Scripts & Styles
    const scriptMatches = html.match(/<script[^>]*>/gi) || [];
    const stylesheetMatches = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
    const hasInlineStyles = /<style[^>]*>/i.test(html);

    // Clean text snippet for LLM analysis (strip tags and scripts)
    const cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 3000);

    return {
      url: targetUrl,
      finalUrl: response.url || normalizedUrl,
      statusCode: response.status,
      isHttps: normalizedUrl.startsWith("https://"),
      responseTimeMs,
      contentLengthBytes,
      title,
      metaDescription,
      metaViewport,
      canonicalUrl,
      robotsMeta,
      h1Count: h1Matches.length,
      h2Count: h2Matches.length,
      h3Count: h3Matches.length,
      h1Text: firstH1Text,
      totalImages: imgMatches.length,
      imagesWithAlt,
      missingAltCount,
      hasForms: formMatches.length > 0,
      formCount: formMatches.length,
      hasEmailInputs,
      hasTelInputs,
      hasPhoneLink,
      hasMailtoLink,
      ctaButtonTexts: ctaButtonTexts.slice(0, 8),
      scriptCount: scriptMatches.length,
      stylesheetCount: stylesheetMatches.length,
      hasInlineStyles,
      textSnippet: cleanText
    };
  }
}

export const htmlAnalyzer = new HtmlAnalyzer();
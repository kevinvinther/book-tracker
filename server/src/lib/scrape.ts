// Shared helpers for the HTML-scraping metadata sources (Goodreads, Amazon,
// Google Images, Kindle covers). None of these providers offers a usable
// official API, so each scraper fetches a public page and parses it.

// A browser-like User-Agent reduces (but does not eliminate) bot-blocking.
export const BROWSER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Short, machine-readable reasons a scrape can fail. */
export type ScrapeFailureReason = "blocked" | "timeout" | "parse_error" | "http_error" | "error";

/**
 * Thrown when a scrape is blocked or otherwise fails hard. The multi-source
 * lookup turns these into `{ source, reason }` entries in the `errors` array,
 * distinct from a clean no-match (which returns `null` and is silently omitted).
 */
export class ScrapeError extends Error {
  constructor(public reason: ScrapeFailureReason, message?: string) {
    super(message ?? reason);
    this.name = "ScrapeError";
  }
}

// Markers that indicate a bot-block / interstitial rather than a real page.
const BLOCK_MARKERS = [
  "robot check",
  "enter the characters you see below",
  "/errors/validatecaptcha",
  "are you a robot",
  "unusual traffic from your computer",
  "our systems have detected unusual traffic",
  "support.google.com/websearch/answer/86640", // Google "unusual traffic" page
];

function looksBlocked(html: string): boolean {
  const lower = html.toLowerCase();
  return BLOCK_MARKERS.some((m) => lower.includes(m));
}

/**
 * Fetch a page as HTML with a browser-like User-Agent, classifying hard
 * failures as ScrapeError. A successful response whose body merely lacks the
 * book is NOT an error — that is the caller's "no-match" (return null).
 */
export async function fetchHtml(url: string): Promise<string> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch (err) {
    const e = err as Error;
    const reason: ScrapeFailureReason = e.name === "TimeoutError" || e.name === "AbortError" ? "timeout" : "error";
    throw new ScrapeError(reason, `fetch failed: ${e.message}`);
  }

  // 202 Accepted with no content is an anti-bot soft-block on some CDNs.
  if (resp.status === 403 || resp.status === 429 || resp.status === 503 || resp.status === 202) {
    throw new ScrapeError("blocked", `HTTP ${resp.status}`);
  }
  if (!resp.ok) {
    throw new ScrapeError("http_error", `HTTP ${resp.status}`);
  }

  const html = await resp.text();
  // An empty body from a 2xx is not a usable page — treat it as a soft-block
  // so it surfaces as a visible error rather than a silent no-match.
  if (html.trim() === "") {
    throw new ScrapeError("blocked", "empty body");
  }
  if (looksBlocked(html)) {
    throw new ScrapeError("blocked", "captcha/interstitial");
  }
  return html;
}

/**
 * Derive the ISBN-10 from a 978-prefixed ISBN-13 (recomputing the check digit).
 * Returns null for 979-prefixed ISBNs (which have no ISBN-10) or malformed input.
 * If the input is already a 10-character ISBN, it is returned normalized.
 */
export function isbn13ToIsbn10(isbn: string): string | null {
  const cleaned = isbn.replace(/[^0-9Xx]/g, "").toUpperCase();

  if (cleaned.length === 10) return cleaned;
  if (cleaned.length !== 13 || !cleaned.startsWith("978")) return null;

  const core = cleaned.slice(3, 12); // 9 digits
  if (!/^\d{9}$/.test(core)) return null;

  let sum = 0;
  for (let k = 0; k < 9; k++) {
    sum += (10 - k) * Number(core[k]);
  }
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

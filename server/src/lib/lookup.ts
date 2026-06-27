import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import * as cheerio from "cheerio";
import { fetchHtml, isbn13ToIsbn10, ScrapeError } from "./scrape.js";

function expandHome(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

// ---- Types ----

export interface LookupResult {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publish_date?: string;
  page_count?: number;
  format?: string;
  language?: string;
  genres: string[];
  description?: string;
  cover_image?: string;
  cover_url?: string;
  contributors?: { role: string; name: string }[];
  source: SourceId;
}

// A lookup query carries the ISBN plus optional title/author, which the
// title+author image scrapers (Google Images, Kindle covers) search by.
export interface LookupQuery {
  isbn: string;
  title?: string;
  author?: string;
}

// ---- Cache ----

export function readCache(isbn: string, libraryPath: string): LookupResult | null {
  const resolved = expandHome(libraryPath);
  const cachePath = join(resolved, ".booktracker", "cache", `${isbn}.json`);
  if (!existsSync(cachePath)) return null;
  try {
    const raw = readFileSync(cachePath, "utf-8");
    return JSON.parse(raw) as LookupResult;
  } catch {
    return null;
  }
}

export function writeCache(isbn: string, data: LookupResult, libraryPath: string): void {
  try {
    const resolved = expandHome(libraryPath);
    const cacheDir = join(resolved, ".booktracker", "cache");
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    const cachePath = join(cacheDir, `${isbn}.json`);
    const tmpPath = cachePath + ".tmp";
    const json = JSON.stringify(data, null, 2);
    writeFileSync(tmpPath, json, "utf-8");
    renameSync(tmpPath, cachePath);
  } catch {
    // Cache write failure is non-fatal — the lookup result is still valid
  }
}

// ---- Fetch helpers ----

async function fetchWithTimeout(url: string, timeoutMs = 20000, headers?: Record<string, string>): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers });
}

// ---- Open Library ----

interface OLAuthorRaw {
  key?: string;
}

interface OLEditionResponse {
  title?: string;
  subtitle?: string;
  authors?: OLAuthorRaw[];
  author?: OLAuthorRaw[];
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  subjects?: string[];
  description?: string | { type: string; value: string };
  covers?: number[];
  languages?: { key: string }[];
  contributions?: string[];
}

function extractOLAuthorKey(key: string): string | null {
  const m = key.match(/\/authors\/(OL\d+[A-Za-z])/);
  return m ? m[1] : null;
}

export async function fetchOpenLibrary(isbn: string): Promise<OLEditionResponse | null> {
  try {
    const resp = await fetchWithTimeout(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!resp.ok) {
      console.warn(`[lookup] Open Library returned ${resp.status} for ISBN ${isbn}`);
      return null;
    }
    const data: OLEditionResponse = await resp.json();
    if (!data || !data.title) {
      console.warn(`[lookup] Open Library returned no title for ISBN ${isbn}`);
      return null;
    }
    return data;
  } catch (err) {
    console.error(`[lookup] Open Library fetch failed for ISBN ${isbn}:`, (err as Error).message);
    return null;
  }
}

function getAuthorEntries(data: OLEditionResponse): OLAuthorRaw[] {
  if (data.authors && data.authors.length > 0) return data.authors;
  if (data.author && data.author.length > 0) return data.author;
  return [];
}

async function resolveAuthorNames(rawAuthors: OLAuthorRaw[]): Promise<string[]> {
  const names = await Promise.all(
    rawAuthors.map(async (a) => {
      // Plain string author name (e.g., "Orwell, George, 1903-1950.")
      if (typeof a === "string") {
        const cleaned = (a as unknown as string).replace(/,?\s*\d{4}-(\d{4})?\.?$/, "").trim();
        const parts = cleaned.split(",").map((s) => s.trim());
        if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
        return cleaned;
      }

      if (typeof a !== "object" || a === null) return null;

      // Author with a key (e.g., { key: "/authors/OL123A" })
      if ("key" in a && typeof (a as { key: string }).key === "string") {
        const key = extractOLAuthorKey((a as { key: string }).key);
        if (!key) return null;
        try {
          const resp = await fetchWithTimeout(`https://openlibrary.org/authors/${key}.json`);
          if (!resp.ok) {
            console.warn(`[lookup] Author key ${key} returned ${resp.status}`);
            return null;
          }
          const data = await resp.json() as { name?: string };
          return data.name || null;
        } catch (err) {
          console.warn(`[lookup] Author key ${key} fetch failed:`, (err as Error).message);
          return null;
        }
      }

      return null;
    })
  );
  return names.filter((n): n is string => n !== null);
}

function normalizeOpenLibraryData(data: OLEditionResponse, authorNames: string[]): Omit<LookupResult, "source"> {
  const authorNamesLower = new Set(authorNames.map((n) => n.toLowerCase()));

  const result: Omit<LookupResult, "source"> = {
    title: data.title!,
    authors: authorNames,
    genres: (data.subjects || []).map((s) => s.toLowerCase().trim()),
  };

  if (data.subtitle) result.subtitle = data.subtitle;
  if (data.publishers && data.publishers.length > 0) {
    // Open Library sometimes includes author names in the publishers list.
    // Pick the first non-author publisher.
    const actualPublisher = data.publishers.find((p) => !authorNamesLower.has(p.toLowerCase()));
    if (actualPublisher) {
      result.publisher = actualPublisher;
    } else {
      console.log(`[lookup] no non-author publisher found in:`, data.publishers);
    }
  }
  if (data.publish_date) result.publish_date = data.publish_date;
  if (data.number_of_pages) result.page_count = data.number_of_pages;

  if (data.description) {
    result.description = typeof data.description === "string" ? data.description : data.description.value;
  }

  if (data.languages && data.languages.length > 0) {
    const langKey = data.languages[0].key;
    const m = langKey.match(/\/languages\/(\w+)/);
    if (m) result.language = m[1];
  }

  if (data.covers && data.covers.length > 0) {
    result.cover_url = `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`;
  }

  if (data.contributions && data.contributions.length > 0) {
    result.contributors = data.contributions.map((c) => {
      const m = c.match(/^by\s+(.+)/i);
      return { role: "contributor", name: m ? m[1] : c };
    });
  }

  return result;
}

export async function lookupOpenLibrary(isbn: string): Promise<Omit<LookupResult, "source"> | null> {
  const data = await fetchOpenLibrary(isbn);
  if (!data) return null;

  const rawAuthors = getAuthorEntries(data);
  console.log(`[lookup] OL raw authors for ISBN ${isbn}:`, JSON.stringify(rawAuthors).slice(0, 200));
  const authorNames = rawAuthors.length > 0 ? await resolveAuthorNames(rawAuthors) : [];
  console.log(`[lookup] OL resolved authors for ISBN ${isbn}:`, authorNames);

  return normalizeOpenLibraryData(data, authorNames);
}

// ---- Google Books ----

interface GBVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  categories?: string[];
  description?: string;
  language?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
}

interface GBItem {
  volumeInfo?: GBVolumeInfo;
}

interface GBSearchResponse {
  items?: GBItem[];
}

export async function fetchGoogleBooks(isbn: string): Promise<GBVolumeInfo | null> {
  const apiKey = (process.env.GOOGLE_BOOKS_API_KEY || "").trim();
  if (!apiKey) return null;

  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=***`;
  console.log(`[lookup] Google Books URL: ${url}`);

  try {
    const resp = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`,
      20000,
      { "User-Agent": "book-tracker/1.0" }
    );
    if (!resp.ok) {
      const body = await resp.text().catch(() => "(unreadable)");
      console.warn(`[lookup] Google Books returned ${resp.status} for ISBN ${isbn}: ${body.slice(0, 200)}`);
      return null;
    }
    const data: GBSearchResponse = await resp.json();
    if (!data.items || data.items.length === 0) {
      console.warn(`[lookup] Google Books returned no items for ISBN ${isbn}`);
      return null;
    }
    const volumeInfo = data.items[0].volumeInfo;
    if (!volumeInfo || !volumeInfo.title) {
      console.warn(`[lookup] Google Books returned no title for ISBN ${isbn}`);
      return null;
    }
    return volumeInfo;
  } catch (err) {
    console.error(`[lookup] Google Books fetch failed for ISBN ${isbn}:`, (err as Error).message);
    return null;
  }
}

function normalizeGoogleBooksData(data: GBVolumeInfo): Omit<LookupResult, "source"> {
  const result: Omit<LookupResult, "source"> = {
    title: data.title!,
    authors: data.authors || [],
    genres: (data.categories || []).map((c) => c.toLowerCase().trim()),
  };

  if (data.subtitle) result.subtitle = data.subtitle;
  if (data.publisher) result.publisher = data.publisher;
  if (data.publishedDate) result.publish_date = data.publishedDate;
  if (data.pageCount) result.page_count = data.pageCount;
  if (data.description) result.description = data.description;
  if (data.language) result.language = data.language;

  if (data.imageLinks?.thumbnail) {
    result.cover_url = data.imageLinks.thumbnail;
  }

  return result;
}

export async function lookupGoogleBooks(isbn: string): Promise<Omit<LookupResult, "source"> | null> {
  const data = await fetchGoogleBooks(isbn);
  if (!data) return null;
  return normalizeGoogleBooksData(data);
}

// ---- Scraper sources (Goodreads, Amazon, Google Images, Kindle covers) ----
//
// None of these has a usable official API, so each fetches a public page and
// parses it with cheerio. A clean "no book here" returns null (no-match); a
// block / parse failure throws ScrapeError so the caller can report it.

interface JsonLdBook {
  "@type"?: string | string[];
  name?: string;
  author?: unknown;
  publisher?: unknown;
  datePublished?: string;
  numberOfPages?: number;
  inLanguage?: string;
  bookFormat?: string;
  description?: string;
  image?: string | string[];
}

function findBookJsonLd($: cheerio.CheerioAPI): JsonLdBook | null {
  let found: JsonLdBook | null = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (found) return;
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed = JSON.parse(raw);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const c of candidates) {
        const type = c?.["@type"];
        const isBook = type === "Book" || (Array.isArray(type) && type.includes("Book")) || c?.bookFormat;
        if (isBook && c.name) {
          found = c as JsonLdBook;
          return;
        }
      }
    } catch {
      // Ignore malformed JSON-LD blocks; other extraction paths still apply.
    }
  });
  return found;
}

function jsonLdAuthorNames(author: unknown): string[] {
  const items = Array.isArray(author) ? author : author ? [author] : [];
  return items
    .map((a) => (typeof a === "string" ? a : (a as { name?: string })?.name))
    .filter((n): n is string => typeof n === "string" && n.trim() !== "")
    .map((n) => n.trim());
}

function firstImage(image: string | string[] | undefined): string | undefined {
  if (!image) return undefined;
  return Array.isArray(image) ? image[0] : image;
}

export async function lookupGoodreads(query: LookupQuery): Promise<SourceData | null> {
  // The /search endpoint is bot-blocked (returns an empty 202). The legacy
  // /book/isbn/<isbn> endpoint 200s and redirects to the book page.
  const html = await fetchHtml(`https://www.goodreads.com/book/isbn/${encodeURIComponent(query.isbn)}`);
  const $ = cheerio.load(html);
  const ld = findBookJsonLd($);

  const title =
    ld?.name?.trim() ||
    $('h1[data-testid="bookTitle"]').first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";
  // A bare search-results page (no redirect to a book) has no book title.
  if (!title) return null;

  const result: SourceData = { title, authors: [], genres: [] };

  const authors = ld ? jsonLdAuthorNames(ld.author) : [];
  if (authors.length === 0) {
    $('[data-testid="name"] a.ContributorLink, a.ContributorLink__name').each((_, el) => {
      const name = $(el).text().trim();
      if (name) authors.push(name);
    });
  }
  result.authors = authors;

  const description = ld?.description?.trim() || $('meta[property="og:description"]').attr("content")?.trim();
  if (description) result.description = description;

  const publisher = (ld?.publisher as { name?: string })?.name ?? (typeof ld?.publisher === "string" ? ld.publisher : undefined);
  if (publisher) result.publisher = publisher;

  // Goodreads' JSON-LD omits the date; the page shows "First published <date>".
  const pubInfo = $('[data-testid="publicationInfo"]').first().text().trim();
  const pubMatch = pubInfo.match(/^(?:First p|P)ublished\s+(.+)$/i);
  if (ld?.datePublished) result.publish_date = ld.datePublished;
  else if (pubMatch) result.publish_date = pubMatch[1].trim();
  if (ld?.numberOfPages) result.page_count = ld.numberOfPages;
  if (ld?.inLanguage) result.language = ld.inLanguage;
  if (ld?.bookFormat) result.format = ld.bookFormat.replace(/^https?:\/\/schema\.org\//, "");

  const cover = firstImage(ld?.image) || $('meta[property="og:image"]').attr("content");
  if (cover) result.cover_url = cover;

  const genres: string[] = [];
  $('[data-testid="genresList"] a, .BookPageMetadataSection__genreButton a').each((_, el) => {
    const g = $(el).text().toLowerCase().trim();
    if (g && !genres.includes(g)) genres.push(g);
  });
  if (genres.length > 0) result.genres = genres;

  return result;
}

export async function lookupAmazon(query: LookupQuery): Promise<SourceData | null> {
  const isbn10 = isbn13ToIsbn10(query.isbn);
  const url = isbn10
    ? `https://www.amazon.com/dp/${isbn10}`
    : `https://www.amazon.com/s?k=${encodeURIComponent(query.isbn)}&i=stripbooks`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title = $("#productTitle").first().text().trim();
  // No product title means either a search page with no hit or a layout we
  // can't read — treat as a no-match rather than an error.
  if (!title) return null;

  const result: SourceData = { title, authors: [], genres: [] };

  const authors: string[] = [];
  $("#bylineInfo .author a.a-link-normal, #bylineInfo span.author a").each((_, el) => {
    const name = $(el).text().trim();
    if (name && !authors.includes(name)) authors.push(name);
  });
  result.authors = authors;

  const description = $("#bookDescription_feature_div").text().trim();
  if (description) result.description = description;

  // Cover: #imgBlkFront carries a JSON map of {url: [w,h]}; take the first key.
  const dynamic = $("#imgBlkFront").attr("data-a-dynamic-image") || $("#landingImage").attr("data-a-dynamic-image");
  let cover: string | undefined;
  if (dynamic) {
    try {
      cover = Object.keys(JSON.parse(dynamic))[0];
    } catch {
      // fall through to src
    }
  }
  cover = cover || $("#imgBlkFront").attr("src") || $("#landingImage").attr("src");
  if (cover) result.cover_url = cover;

  // Format (e.g. "Hardcover") from the product subtitle binding.
  const format = $("#productSubtitle").text().trim().split("–")[0].trim();
  if (format) result.format = format;

  // Detail bullets: "Publisher : ...", "Language : ...", "Print length : 320 pages",
  // "Publication date : ...".
  $("#detailBullets_feature_div li, #productDetailsTable li").each((_, el) => {
    // Amazon detail bullets are padded with bidi/zero-width marks (U+200E etc.).
    const text = $(el)
      .text()
      .replace(/[\u200e\u200f\u202a-\u202e\ufeff]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const m = text.match(/^([^:]+):\s*(.+)$/);
    if (!m) return;
    const label = m[1].toLowerCase().trim();
    const value = m[2].trim();
    if (label.includes("publisher") && !result.publisher) {
      result.publisher = value.replace(/\s*\([^)]*\)\s*$/, "").trim();
    } else if (label.includes("language") && !result.language) {
      result.language = value;
    } else if ((label.includes("print length") || label.includes("hardcover") || label.includes("paperback")) && !result.page_count) {
      const pages = value.match(/(\d+)\s*pages?/);
      if (pages) result.page_count = Number(pages[1]);
    } else if (label.includes("publication date") && !result.publish_date) {
      result.publish_date = value;
    }
  });

  // Genres from the category breadcrumb trail (drop the leading "Books").
  const genres: string[] = [];
  $("#wayfinding-breadcrumbs_feature_div a").each((_, el) => {
    const g = $(el).text().toLowerCase().trim();
    if (g && g !== "books" && !genres.includes(g)) genres.push(g);
  });
  if (genres.length > 0) result.genres = genres;

  return result;
}

// Cover-only sources: search by title + author, return only a cover URL.

function coverResult(coverUrl: string): SourceData {
  return { title: "", authors: [], genres: [], cover_url: coverUrl };
}

function imageSearchQuery(query: LookupQuery): string | null {
  if (!query.title || query.title.trim() === "") return null;
  return [query.title.trim(), query.author?.trim()].filter(Boolean).join(" ");
}

export async function lookupGoogleImages(query: LookupQuery): Promise<SourceData | null> {
  const base = imageSearchQuery(query);
  if (!base) return null;
  const html = await fetchHtml(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${base} book cover`)}`);
  const $ = cheerio.load(html);

  let cover: string | undefined;
  $("img").each((_, el) => {
    if (cover) return;
    const src = $(el).attr("src") || $(el).attr("data-src");
    if (src && /^https?:\/\//.test(src) && !/\/images\/branding\//.test(src)) {
      cover = src;
    }
  });
  if (!cover) return null;
  return coverResult(cover);
}

export async function lookupKindleCovers(query: LookupQuery): Promise<SourceData | null> {
  const base = imageSearchQuery(query);
  if (!base) return null;
  const html = await fetchHtml(`https://www.amazon.com/s?k=${encodeURIComponent(base)}&i=digital-text`);
  const $ = cheerio.load(html);

  const cover = $("img.s-image").first().attr("src");
  if (!cover) return null;
  return coverResult(cover);
}

// ---- Multi-source lookup ----

export type SourceId =
  | "google"
  | "openlibrary"
  | "goodreads"
  | "amazon"
  | "googleimages"
  | "kindlecovers";

// Every selectable source.
export const ALL_SOURCES: SourceId[] = [
  "google",
  "openlibrary",
  "goodreads",
  "amazon",
  "googleimages",
  "kindlecovers",
];

// Queried when the request omits `sources`. The two cover-only image scrapers
// are the slowest/most fragile, so they are opt-in (excluded from the default).
export const DEFAULT_SOURCES: SourceId[] = ["google", "openlibrary", "goodreads", "amazon"];

type SourceData = Omit<LookupResult, "source">;

const SOURCE_FETCHERS: Record<SourceId, (query: LookupQuery) => Promise<SourceData | null>> = {
  google: (q) => lookupGoogleBooks(q.isbn),
  openlibrary: (q) => lookupOpenLibrary(q.isbn),
  goodreads: lookupGoodreads,
  amazon: lookupAmazon,
  googleimages: lookupGoogleImages,
  kindlecovers: lookupKindleCovers,
};

function sourceCachePath(isbn: string, source: SourceId, libraryPath: string): string {
  const resolved = expandHome(libraryPath);
  return join(resolved, ".booktracker", "cache", `${isbn}.${source}.json`);
}

export function readSourceCache(isbn: string, source: SourceId, libraryPath: string): LookupResult | null {
  const cachePath = sourceCachePath(isbn, source, libraryPath);
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8")) as LookupResult;
  } catch {
    // Corrupt per-source cache is treated as a miss.
    return null;
  }
}

export function writeSourceCache(isbn: string, source: SourceId, data: LookupResult, libraryPath: string): void {
  try {
    const resolved = expandHome(libraryPath);
    const cacheDir = join(resolved, ".booktracker", "cache");
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir, { recursive: true });
    }
    const cachePath = sourceCachePath(isbn, source, libraryPath);
    const tmpPath = cachePath + ".tmp";
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmpPath, cachePath);
  } catch {
    // Cache write failure is non-fatal.
  }
}

async function lookupSource(
  query: LookupQuery,
  source: SourceId,
  libraryPath: string,
  skipCache: boolean,
): Promise<LookupResult | null> {
  if (!skipCache) {
    const cached = readSourceCache(query.isbn, source, libraryPath);
    if (cached) {
      console.log(`[lookup] Per-source cache hit for ISBN ${query.isbn} (${source})`);
      return cached;
    }
  }
  // Unlike lookupISBN, the multi-source path does NOT download covers — it returns
  // the raw cover_url so the client can preview remotely; the chosen cover is
  // downloaded later, when the edit page saves. A scraper may throw ScrapeError
  // here; that propagates and becomes an `errors` entry in lookupAllSources.
  const data = await SOURCE_FETCHERS[source](query);
  if (!data) return null;
  const result: LookupResult = { ...data, source };
  writeSourceCache(query.isbn, source, result, libraryPath);
  return result;
}

export interface SourceLookupError {
  source: SourceId;
  reason: string;
}

export interface MultiSourceLookup {
  results: LookupResult[];
  errors: SourceLookupError[];
}

export async function lookupAllSources(
  query: LookupQuery,
  sources: SourceId[],
  libraryPath: string,
  skipCache = false,
): Promise<MultiSourceLookup> {
  const settled = await Promise.allSettled(
    sources.map((s) => lookupSource(query, s, libraryPath, skipCache)),
  );
  const results: LookupResult[] = [];
  const errors: SourceLookupError[] = [];
  settled.forEach((r, i) => {
    const source = sources[i];
    if (r.status === "fulfilled") {
      // A null value is a clean no-match — omit it from both arrays.
      if (r.value) results.push(r.value);
    } else {
      const reason = r.reason instanceof ScrapeError ? r.reason.reason : "error";
      console.warn(`[lookup] Source ${source} failed for ISBN ${query.isbn}: ${reason}`);
      errors.push({ source, reason });
    }
  });
  return { results, errors };
}

// ---- Cover Download ----

export async function downloadCover(coverUrl: string, libraryPath: string): Promise<string | null> {
  try {
    const resp = await fetchWithTimeout(coverUrl);
    if (!resp.ok) return null;

    const contentType = resp.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const resolved = expandHome(libraryPath);
    const attachmentsDir = join(resolved, "attachments");
    if (!existsSync(attachmentsDir)) {
      mkdirSync(attachmentsDir, { recursive: true });
    }

    const urlPath = new URL(coverUrl).pathname;
    const ext = urlPath.includes(".") ? urlPath.split(".").pop() || "jpg" : "jpg";
    const filename = `${randomUUID()}.${ext}`;

    const filePath = join(attachmentsDir, filename);
    const tmpPath = filePath + ".tmp";
    writeFileSync(tmpPath, buffer);
    renameSync(tmpPath, filePath);

    return filename;
  } catch {
    return null;
  }
}

// ---- Core Lookup ----

export async function lookupISBN(isbn: string, libraryPath: string, skipCache = false): Promise<LookupResult | null> {
  if (!skipCache) {
    const cached = readCache(isbn, libraryPath);
    if (cached) {
      console.log(`[lookup] Cache hit for ISBN ${isbn}`);
      return cached;
    }
  }

  console.log(`[lookup] Cache miss, querying APIs for ISBN ${isbn}`);

  let data: Omit<LookupResult, "source"> | null = null;
  let source: "openlibrary" | "google" = "google";

  // Try Google Books first (cleaner data, less noise in publishers),
  // fall back to Open Library (no API key needed, larger catalog).
  data = await lookupGoogleBooks(isbn);
  if (data) {
    source = "google";
    console.log(`[lookup] Google Books OK for ISBN ${isbn}: "${data.title}"`);
  } else {
    console.log(`[lookup] Google Books failed, trying Open Library for ISBN ${isbn}`);
    data = await lookupOpenLibrary(isbn);
    if (data) {
      source = "openlibrary";
      console.log(`[lookup] Open Library OK for ISBN ${isbn}: "${data.title}"`);
    }
  }

  if (!data) {
    console.warn(`[lookup] All APIs failed for ISBN ${isbn}`);
    return null;
  }

  let coverImage: string | undefined;
  if (data.cover_url) {
    const downloaded = await downloadCover(data.cover_url, libraryPath);
    if (downloaded) {
      coverImage = downloaded;
    }
  }

  const result: LookupResult = { ...data, source, cover_image: coverImage };
  writeCache(isbn, result, libraryPath);
  return result;
}

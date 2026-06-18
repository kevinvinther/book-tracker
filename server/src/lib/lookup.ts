import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

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
  source: "openlibrary" | "google";
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
}

// ---- Fetch helpers ----

async function fetchWithTimeout(url: string, timeoutMs = 20000): Promise<Response> {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
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
      console.error(`[lookup] Open Library returned ${resp.status} for ISBN ${isbn}`);
      return null;
    }
    const data: OLEditionResponse = await resp.json();
    if (!data || !data.title) {
      console.error(`[lookup] Open Library returned no title for ISBN ${isbn}`);
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
          if (!resp.ok) return null;
          const data = await resp.json() as { name?: string };
          return data.name || null;
        } catch {
          return null;
        }
      }

      return null;
    })
  );
  return names.filter((n): n is string => n !== null);
}

function normalizeOpenLibraryData(data: OLEditionResponse, authorNames: string[]): Omit<LookupResult, "source"> {
  const result: Omit<LookupResult, "source"> = {
    title: data.title!,
    authors: authorNames,
    genres: (data.subjects || []).map((s) => s.toLowerCase().trim()),
  };

  if (data.subtitle) result.subtitle = data.subtitle;
  if (data.publishers && data.publishers.length > 0) result.publisher = data.publishers[0];
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
  const authorNames = rawAuthors.length > 0 ? await resolveAuthorNames(rawAuthors) : [];

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
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetchWithTimeout(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`
    );
    if (!resp.ok) {
      console.error(`[lookup] Google Books returned ${resp.status} for ISBN ${isbn}`);
      return null;
    }
    const data: GBSearchResponse = await resp.json();
    if (!data.items || data.items.length === 0) {
      console.error(`[lookup] Google Books returned no items for ISBN ${isbn}`);
      return null;
    }
    const volumeInfo = data.items[0].volumeInfo;
    if (!volumeInfo || !volumeInfo.title) {
      console.error(`[lookup] Google Books returned no title for ISBN ${isbn}`);
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

    const urlFilename = basename(new URL(coverUrl).pathname);
    const ext = urlFilename.includes(".") ? urlFilename.split(".").pop() || "jpg" : "jpg";
    const filename = `${urlFilename.includes(".") ? urlFilename.slice(0, urlFilename.lastIndexOf(".")) : urlFilename}-cover.${ext}`;

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

export async function lookupISBN(isbn: string, libraryPath: string): Promise<LookupResult | null> {
  const cached = readCache(isbn, libraryPath);
  if (cached) {
    console.error(`[lookup] Cache hit for ISBN ${isbn}`);
    return cached;
  }

  console.error(`[lookup] Cache miss, querying APIs for ISBN ${isbn}`);

  let data: Omit<LookupResult, "source"> | null = null;
  let source: "openlibrary" | "google" = "openlibrary";

  data = await lookupOpenLibrary(isbn);
  if (data) {
    source = "openlibrary";
    console.error(`[lookup] Open Library OK for ISBN ${isbn}: "${data.title}"`);
  } else {
    console.error(`[lookup] Open Library failed, trying Google Books for ISBN ${isbn}`);
    data = await lookupGoogleBooks(isbn);
    if (data) {
      source = "google";
      console.error(`[lookup] Google Books OK for ISBN ${isbn}: "${data.title}"`);
    }
  }

  if (!data) {
    console.error(`[lookup] All APIs failed for ISBN ${isbn}`);
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

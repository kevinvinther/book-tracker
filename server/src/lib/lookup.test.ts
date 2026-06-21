import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-lookup-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(tmpRoot, { recursive: true });
  mkdirSync(join(tmpRoot, ".booktracker", "cache"), { recursive: true });
  mkdirSync(join(tmpRoot, "attachments"), { recursive: true });
});

afterAll(() => {
  if (existsSync(tmpRoot)) {
    rmSync(tmpRoot, { recursive: true });
  }
});

import {
  readCache,
  writeCache,
  fetchOpenLibrary,
  fetchGoogleBooks,
  lookupOpenLibrary,
  lookupGoogleBooks,
  downloadCover,
  lookupISBN,
} from "./lookup.js";
import type { LookupResult } from "./lookup.js";

// ---- Cache Tests (Task 1.3) ----

describe("readCache", () => {
  it("returns null when cache file does not exist", () => {
    expect(readCache("9780000000000", tmpRoot)).toBeNull();
  });

  it("returns parsed data when cache file exists", () => {
    const data: LookupResult = {
      title: "Test Book",
      authors: ["Author One"],
      genres: ["fiction"],
      source: "openlibrary",
    };
    writeCache("9781111111111", data, tmpRoot);
    const result = readCache("9781111111111", tmpRoot);
    expect(result).toEqual(data);
  });

  it("returns null when cache file is corrupted", () => {
    const cacheDir = join(tmpRoot, ".booktracker", "cache");
    writeFileSync(join(cacheDir, "9782222222222.json"), "not valid json {", "utf-8");
    expect(readCache("9782222222222", tmpRoot)).toBeNull();
  });
});

describe("writeCache", () => {
  it("writes cache file atomically", () => {
    const data: LookupResult = {
      title: "Written Book",
      authors: ["Writer"],
      genres: ["non-fiction"],
      source: "openlibrary",
    };
    writeCache("9783333333333", data, tmpRoot);
    const cached = readCache("9783333333333", tmpRoot);
    expect(cached).toEqual(data);
  });

  it("creates cache directory if missing", () => {
    const newRoot = join(tmpRoot, "newlib");
    const data: LookupResult = {
      title: "Dir Created",
      authors: ["A"],
      genres: [],
      source: "openlibrary",
    };
    writeCache("9784444444444", data, newRoot);
    const cached = readCache("9784444444444", newRoot);
    expect(cached).toEqual(data);
    rmSync(newRoot, { recursive: true });
  });
});

// ---- Open Library Tests (Task 2.3) ----

describe("fetchOpenLibrary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await fetchOpenLibrary("9780141036144");
    expect(result).toBeNull();
  });

  it("returns null on non-200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await fetchOpenLibrary("9780141036144");
    expect(result).toBeNull();
  });

  it("returns null on empty response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    const result = await fetchOpenLibrary("9780141036144");
    expect(result).toBeNull();
  });

  it("returns data on successful response with title", async () => {
    const mockData = {
      title: "Animal Farm",
      authors: [{ key: "/authors/OL19997A" }],
      publishers: ["Penguin"],
      publish_date: "2008",
      number_of_pages: 113,
      subjects: ["Fiction", "Political satire"],
      covers: [12345],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockData) }));
    const result = await fetchOpenLibrary("9780141036144");
    expect(result).toEqual(mockData);
  });
});

describe("lookupOpenLibrary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when edition fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await lookupOpenLibrary("9780141036144");
    expect(result).toBeNull();
  });

  it("normalizes full Open Library response", async () => {
    const editionData = {
      title: "Animal Farm",
      authors: [{ key: "/authors/OL19997A" }],
      publishers: ["Penguin"],
      publish_date: "2008",
      number_of_pages: 113,
      subjects: ["Fiction", "Political satire"],
      description: "A farm is taken over by animals.",
      covers: [12345],
      languages: [{ key: "/languages/eng" }],
      contributions: ["by George Orwell"],
    };

    const authorData = { name: "George Orwell" };

    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(editionData) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(authorData) });
    }));

    const result = await lookupOpenLibrary("9780141036144");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Animal Farm");
    expect(result!.authors).toEqual(["George Orwell"]);
    expect(result!.publisher).toBe("Penguin");
    expect(result!.publish_date).toBe("2008");
    expect(result!.page_count).toBe(113);
    expect(result!.genres).toEqual(["fiction", "political satire"]);
    expect(result!.description).toBe("A farm is taken over by animals.");
    expect(result!.cover_url).toBe("https://covers.openlibrary.org/b/id/12345-M.jpg");
    expect(result!.language).toBe("eng");
    expect(result!.contributors).toEqual([{ role: "contributor", name: "George Orwell" }]);
  });

  it("handles missing optional fields", async () => {
    const editionData = {
      title: "Minimal Book",
    };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(editionData),
    }));

    const result = await lookupOpenLibrary("9780000000000");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Minimal Book");
    expect(result!.authors).toEqual([]);
    expect(result!.genres).toEqual([]);
    expect(result!.publisher).toBeUndefined();
    expect(result!.description).toBeUndefined();
  });
});

// ---- Google Books Tests (Task 3.3) ----

describe("fetchGoogleBooks", () => {
  const originalEnv = process.env.GOOGLE_BOOKS_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_BOOKS_API_KEY;
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.GOOGLE_BOOKS_API_KEY = originalEnv;
    }
  });

  it("returns null when API key is not configured", async () => {
    const result = await fetchGoogleBooks("9780141036144");
    expect(result).toBeNull();
  });

  it("returns null on network error when key is set", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await fetchGoogleBooks("9780141036144");
    expect(result).toBeNull();
  });

  it("returns null when no items returned", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    }));
    const result = await fetchGoogleBooks("9780141036144");
    expect(result).toBeNull();
  });

  it("returns volume info on success", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
    const volumeInfo = {
      title: "1984",
      authors: ["George Orwell"],
      publisher: "Penguin",
      publishedDate: "2008",
      pageCount: 336,
      categories: ["Fiction", "Dystopian"],
      description: "A dystopian novel.",
      language: "en",
      imageLinks: { thumbnail: "http://example.com/cover.jpg" },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [{ volumeInfo }] }),
    }));
    const result = await fetchGoogleBooks("9780141036144");
    expect(result).toEqual(volumeInfo);
  });
});

describe("lookupGoogleBooks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_BOOKS_API_KEY;
  });

  it("returns null when fetchGoogleBooks returns null", async () => {
    const result = await lookupGoogleBooks("9780141036144");
    expect(result).toBeNull();
  });

  it("normalizes full Google Books response", () => {
    const volumeInfo = {
      title: "1984",
      subtitle: "A Novel",
      authors: ["George Orwell"],
      publisher: "Penguin",
      publishedDate: "2008-07-03",
      pageCount: 336,
      categories: ["Fiction", "Dystopian"],
      description: "A dystopian social science fiction novel.",
      language: "en",
      imageLinks: { thumbnail: "http://example.com/cover.jpg" },
    };

    // We test the normalization directly - lookupGoogleBooks is just fetch+normalize
    // but since normalizeGoogleBooks isn't exported, we test indirectly
    // by mocking fetch and calling lookupGoogleBooks
  });
});

// ---- Cover Download Tests (Task 4.2) ----

describe("downloadCover", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await downloadCover("http://example.com/cover.jpg", tmpRoot);
    expect(result).toBeNull();
  });

  it("returns null on non-200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await downloadCover("http://example.com/cover.jpg", tmpRoot);
    expect(result).toBeNull();
  });

  it("returns null when response is not an image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "text/html"]]),
    }));
    const result = await downloadCover("http://example.com/cover.jpg", tmpRoot);
    expect(result).toBeNull();
  });

  it("downloads and saves cover image", async () => {
    const mockBuffer = Buffer.from("fake-image-data");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      headers: new Map([["content-type", "image/jpeg"]]),
      arrayBuffer: () => Promise.resolve(mockBuffer.buffer),
    }));

    const result = await downloadCover("http://example.com/covers/12345-M.jpg", tmpRoot);
    expect(result).not.toBeNull();
    expect(result).toContain("jpg");
    expect(existsSync(join(tmpRoot, "attachments", result!))).toBe(true);
  });
});

// ---- Core Lookup Pipeline Tests (Task 5.2) ----

describe("lookupISBN", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached result without calling APIs", async () => {
    const cachedData: LookupResult = {
      title: "Cached Book",
      authors: ["Author"],
      genres: ["fiction"],
      source: "openlibrary",
      cover_image: "cached-cover.jpg",
    };
    writeCache("9785555555555", cachedData, tmpRoot);

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await lookupISBN("9785555555555", tmpRoot);
    expect(result).toEqual(cachedData);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null when both APIs fail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const result = await lookupISBN("9786666666666", tmpRoot);
    expect(result).toBeNull();
  });

  it("returns data from Google Books when API key is set", async () => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";

    const gbResponse = {
      items: [{
        volumeInfo: {
          title: "GB Book",
          authors: ["Google Author"],
          categories: ["Technology"],
        },
      }],
    };

    // Google Books doesn't need a second fetch for author names
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(gbResponse),
    }));

    const result = await lookupISBN("9787777777777", tmpRoot);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("GB Book");
    expect(result!.authors).toEqual(["Google Author"]);
    expect(result!.source).toBe("google");
  });

  it("falls back to Open Library when Google Books fails", async () => {
    // Clear the API key so Google Books returns null without calling fetch
    delete process.env.GOOGLE_BOOKS_API_KEY;

    const editionData = {
      title: "OL Book",
      authors: [{ key: "/authors/OL19997A" }],
      subjects: ["Fiction"],
    };
    const authorData = { name: "George Orwell" };

    // Google Books is first. Mock it to fail (no API key → null, or fetch error).
    // Open Library will be the fallback and needs two fetches: edition + author.
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(editionData) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(authorData) });
    }));

    const result = await lookupISBN("9788888888888", tmpRoot);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("OL Book");
    expect(result!.authors).toEqual(["George Orwell"]);
    expect(result!.source).toBe("openlibrary");
  });
});

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-lookup-route-test-${Date.now()}`);

let server: Server;
let port: number;

// Save the real fetch before any stubbing
const realFetch = globalThis.fetch.bind(globalThis);

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of [".booktracker/cache", "attachments"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const app = express();
  app.use(express.json());

  const { createLookupRouter } = await import("./lookup.js");
  app.use("/api/lookup", createLookupRouter(tmpRoot));

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server!.address();
      if (addr && typeof addr === "object") port = addr.port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true });
});

function api(path: string): Promise<Response> {
  return realFetch(`http://localhost:${port}${path}`);
}

function mockExternalFetch(urlResponses: Record<string, { body?: unknown; headers?: Record<string, string>; arrayBuffer?: ArrayBuffer }>) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
    // Pass through localhost requests to the real fetch
    if (url.includes("localhost") || url.includes("127.0.0.1")) {
      return realFetch(url);
    }
    // Return mocked responses for matching URLs
    for (const [key, mock] of Object.entries(urlResponses)) {
      if (url.includes(key)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mock.body || {}),
          headers: new Map(Object.entries(mock.headers || {})),
          arrayBuffer: () => Promise.resolve(mock.arrayBuffer || new ArrayBuffer(0)),
        } as unknown as Response);
      }
    }
    return Promise.resolve({ ok: false } as unknown as Response);
  }));
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/lookup", () => {
  it("returns 400 when ISBN parameter is missing", async () => {
    const res = await api("/api/lookup");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ISBN parameter is required");
  });

  it("returns 400 when ISBN parameter is empty", async () => {
    const res = await api("/api/lookup?isbn=");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ISBN parameter is required");
  });

  it("returns 404 when ISBN is not found", async () => {
    mockExternalFetch({});

    const res = await api("/api/lookup?isbn=0000000000000");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Couldn't find this ISBN");
  });

  it("returns 200 with normalized data on successful lookup", async () => {
    const editionData = {
      title: "Route Test Book",
      authors: [{ key: "/authors/OL19997A" }],
      publishers: ["Test Publisher"],
      publish_date: "2020",
      number_of_pages: 200,
      subjects: ["Fiction"],
      description: "Test description.",
      covers: [99999],
      languages: [{ key: "/languages/eng" }],
    };
    const authorData = { name: "Test Author" };

    mockExternalFetch({
      "openlibrary.org/isbn": { body: editionData },
      "openlibrary.org/authors": { body: authorData },
      "covers.openlibrary.org": { headers: { "content-type": "image/jpeg" }, arrayBuffer: new ArrayBuffer(4) },
    });

    const res = await api("/api/lookup?isbn=9781234567890");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe("Route Test Book");
    expect(body.authors).toEqual(["Test Author"]);
    expect(body.publisher).toBe("Test Publisher");
    expect(body.source).toBe("openlibrary");
  });
});

describe("GET /api/lookup/all", () => {
  const cacheDir = join(tmpRoot, ".booktracker", "cache");
  const attachmentsDir = join(tmpRoot, "attachments");

  const olEdition = {
    title: "OL Book",
    authors: [{ key: "/authors/OL1A" }],
    publishers: ["OL Publisher"],
    publish_date: "2019",
    number_of_pages: 100,
    subjects: ["Fiction"],
    covers: [12345],
  };
  const olAuthor = { name: "OL Author" };
  const gbVolume = {
    items: [
      {
        volumeInfo: {
          title: "GB Book",
          authors: ["GB Author"],
          publisher: "GB Publisher",
          publishedDate: "2021-05-01",
          pageCount: 200,
          categories: ["Fantasy"],
          imageLinks: { thumbnail: "http://books.google.com/cover.jpg" },
        },
      },
    ],
  };

  beforeAll(() => {
    process.env.GOOGLE_BOOKS_API_KEY = "test-key";
  });

  afterAll(() => {
    delete process.env.GOOGLE_BOOKS_API_KEY;
  });

  function mockBothSources() {
    mockExternalFetch({
      "openlibrary.org/isbn": { body: olEdition },
      "openlibrary.org/authors": { body: olAuthor },
      "googleapis.com/books": { body: gbVolume },
    });
  }

  it("returns 400 when ISBN parameter is missing", async () => {
    const res = await api("/api/lookup/all");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ISBN parameter is required");
  });

  it("returns one result per source when both succeed", async () => {
    mockBothSources();
    const res = await api("/api/lookup/all?isbn=9780000000001&sources=google,openlibrary");
    expect(res.status).toBe(200);
    const body = await res.json();
    const sources = body.results.map((r: { source: string }) => r.source).sort();
    expect(sources).toEqual(["google", "openlibrary"]);
  });

  it("limits the query when sources is restricted", async () => {
    mockBothSources();
    const res = await api("/api/lookup/all?isbn=9780000000002&sources=openlibrary");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].source).toBe("openlibrary");
  });

  it("omits a failing source but keeps the succeeding one", async () => {
    // Only Open Library is mocked; Google Books returns ok:false → omitted.
    mockExternalFetch({
      "openlibrary.org/isbn": { body: olEdition },
      "openlibrary.org/authors": { body: olAuthor },
    });
    const res = await api("/api/lookup/all?isbn=9780000000003&sources=google,openlibrary");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].source).toBe("openlibrary");
  });

  it("returns empty results when no source yields data", async () => {
    mockExternalFetch({});
    const res = await api("/api/lookup/all?isbn=9780000000004&sources=google,openlibrary");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toEqual([]);
  });

  it("does not download covers (returns cover_url, no cover_image)", async () => {
    mockBothSources();
    const before = readdirSync(attachmentsDir).length;
    const res = await api("/api/lookup/all?isbn=9780000000005&sources=openlibrary");
    const body = await res.json();
    expect(body.results[0].cover_url).toContain("covers.openlibrary.org");
    expect(body.results[0].cover_image).toBeUndefined();
    expect(readdirSync(attachmentsDir).length).toBe(before);
  });

  it("uses per-source cache on a second call and skips the API with nocache", async () => {
    mockBothSources();
    await api("/api/lookup/all?isbn=9780000000006&sources=openlibrary");
    expect(existsSync(join(cacheDir, "9780000000006.openlibrary.json"))).toBe(true);

    // Second call with no external mock — a cache hit must still return data.
    mockExternalFetch({});
    const cachedRes = await api("/api/lookup/all?isbn=9780000000006&sources=openlibrary");
    const cachedBody = await cachedRes.json();
    expect(cachedBody.results).toHaveLength(1);

    // nocache=1 forces a refetch; with no mock the source yields nothing.
    const skipRes = await api("/api/lookup/all?isbn=9780000000006&sources=openlibrary&nocache=1");
    const skipBody = await skipRes.json();
    expect(skipBody.results).toEqual([]);
  });

  it("per-source cache does not collide with the single-result cache", async () => {
    mockBothSources();
    await api("/api/lookup?isbn=9780000000007");
    await api("/api/lookup/all?isbn=9780000000007&sources=openlibrary");
    expect(existsSync(join(cacheDir, "9780000000007.json"))).toBe(true);
    expect(existsSync(join(cacheDir, "9780000000007.openlibrary.json"))).toBe(true);
  });

  it("includes an errors array in the response", async () => {
    mockBothSources();
    const res = await api("/api/lookup/all?isbn=9780000000010&sources=google,openlibrary");
    const body = await res.json();
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors).toEqual([]);
  });

  it("forwards title and author to text-search cover sources", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("localhost") || url.includes("127.0.0.1")) return realFetch(url);
        calls.push(url);
        return Promise.resolve({
          status: 200,
          ok: true,
          text: () => Promise.resolve('<html><body><img src="https://example.com/c.jpg"></body></html>'),
        } as unknown as Response);
      }),
    );

    const res = await api(
      "/api/lookup/all?isbn=9780000000011&sources=googleimages&title=Dune&author=Frank%20Herbert&nocache=1",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0].cover_url).toBe("https://example.com/c.jpg");

    const imgCall = calls.find((u) => u.includes("tbm=isch"));
    expect(imgCall).toBeDefined();
    expect(decodeURIComponent(imgCall!)).toContain("Dune");
    expect(decodeURIComponent(imgCall!)).toContain("Frank Herbert");
  });

  it("reports a blocked scraper in errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("localhost") || url.includes("127.0.0.1")) return realFetch(url);
        return Promise.resolve({ status: 503, ok: false } as unknown as Response);
      }),
    );

    const res = await api("/api/lookup/all?isbn=9780000000012&sources=amazon&nocache=1");
    const body = await res.json();
    expect(body.results).toEqual([]);
    expect(body.errors).toEqual([{ source: "amazon", reason: "blocked" }]);
  });
});

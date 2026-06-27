import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import os from "os";
import {
  lookupGoodreads,
  lookupAmazon,
  lookupGoogleImages,
  lookupKindleCovers,
  lookupAllSources,
} from "./lookup.js";

// Mirrors the real /book/isbn page: JSON-LD omits the date (it comes from the
// publicationInfo element) and the publisher.
const GOODREADS_HTML = `<html><head>
<script type="application/ld+json">
{"@type":"Book","name":"Dune","author":[{"@type":"Person","name":"Frank Herbert"}],
"numberOfPages":412,"inLanguage":"English","bookFormat":"Hardcover",
"image":"https://images.gr-assets.com/dune.jpg"}
</script>
<meta property="og:description" content="A desert planet."/>
</head><body>
<div data-testid="publicationInfo">First published June 1, 1965</div>
<div data-testid="genresList"><a>Science Fiction</a><a>Fantasy</a></div>
</body></html>`;

const AMAZON_HTML = `<html><body>
<span id="productTitle">Dune</span>
<div id="bylineInfo"><span class="author"><a class="a-link-normal">Frank Herbert</a></span></div>
<div id="imgBlkFront" data-a-dynamic-image='{"https://m.media-amazon.com/dune.jpg":[400,600]}'></div>
<div id="bookDescription_feature_div">A desert planet.</div>
<div id="wayfinding-breadcrumbs_feature_div"><ul>
<li><a class="a-link-normal">Books</a></li>
<li><a class="a-link-normal">Science Fiction &amp; Fantasy</a></li>
<li><a class="a-link-normal">Science Fiction</a></li>
</ul></div>
<span id="productSubtitle">Hardcover &#8211; June 1, 1965</span>
<div id="detailBullets_feature_div"><ul>
<li>Publisher : Chilton Books (1965)</li>
<li>Language : English</li>
<li>Print length : 412 pages</li>
<li>Publication date : June 1, 1965</li>
</ul></div>
</body></html>`;

function htmlResponse(html: string) {
  return { status: 200, ok: true, text: () => Promise.resolve(html) } as unknown as Response;
}

describe("lookupGoodreads", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses a book page's JSON-LD and genres", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(GOODREADS_HTML)));
    const r = await lookupGoodreads({ isbn: "9780441013593" });
    expect(r).toMatchObject({
      title: "Dune",
      authors: ["Frank Herbert"],
      page_count: 412,
      language: "English",
      format: "Hardcover",
      publish_date: "June 1, 1965",
      description: "A desert planet.",
      cover_url: "https://images.gr-assets.com/dune.jpg",
      genres: ["science fiction", "fantasy"],
    });
  });

  it("returns null (no-match) when the page has no book title", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("<html><body>no results</body></html>")));
    expect(await lookupGoodreads({ isbn: "0000000000000" })).toBeNull();
  });

  it("throws a blocked ScrapeError on HTTP 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 503, ok: false } as Response));
    await expect(lookupGoodreads({ isbn: "9780441013593" })).rejects.toMatchObject({ reason: "blocked" });
  });
});

describe("lookupAmazon", () => {
  afterEach(() => vi.restoreAllMocks());

  it("parses the product page (title, authors, details, cover)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(AMAZON_HTML)));
    const r = await lookupAmazon({ isbn: "9780441013593" });
    expect(r).toMatchObject({
      title: "Dune",
      authors: ["Frank Herbert"],
      description: "A desert planet.",
      cover_url: "https://m.media-amazon.com/dune.jpg",
      format: "Hardcover",
      publisher: "Chilton Books",
      language: "English",
      page_count: 412,
      publish_date: "June 1, 1965",
      genres: ["science fiction & fantasy", "science fiction"],
    });
  });

  it("returns null when there is no product title", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse("<html><body>search</body></html>")));
    expect(await lookupAmazon({ isbn: "9780441013593" })).toBeNull();
  });
});

describe("cover-only sources", () => {
  afterEach(() => vi.restoreAllMocks());

  it("googleimages returns only a cover_url, skipping branding images", async () => {
    const html = `<html><body>
      <img src="https://www.gstatic.com/images/branding/logo.png">
      <img src="https://example.com/cover.jpg"></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));
    const r = await lookupGoogleImages({ isbn: "9780441013593", title: "Dune", author: "Frank Herbert" });
    expect(r).toEqual({ title: "", authors: [], genres: [], cover_url: "https://example.com/cover.jpg" });
  });

  it("googleimages returns null when no title is supplied", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await lookupGoogleImages({ isbn: "9780441013593" })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("kindlecovers returns the first s-image", async () => {
    const html = `<html><body><img class="s-image" src="https://m.media-amazon.com/kindle.jpg"></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(html)));
    const r = await lookupKindleCovers({ isbn: "9780441013593", title: "Dune" });
    expect(r).toEqual({ title: "", authors: [], genres: [], cover_url: "https://m.media-amazon.com/kindle.jpg" });
  });
});

describe("lookupAllSources results/errors split", () => {
  const tmpRoot = join(os.tmpdir(), `bt-scrapers-test-${Date.now()}`);
  beforeAll(() => mkdirSync(join(tmpRoot, ".booktracker", "cache"), { recursive: true }));
  afterAll(() => {
    if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true });
  });
  afterEach(() => vi.restoreAllMocks());

  it("puts successful sources in results and blocked ones in errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("goodreads.com")) return Promise.resolve(htmlResponse(GOODREADS_HTML));
        if (url.includes("amazon.com")) return Promise.resolve({ status: 503, ok: false } as Response);
        return Promise.resolve({ status: 404, ok: false } as Response);
      }),
    );

    const { results, errors } = await lookupAllSources(
      { isbn: "9780441013593" },
      ["goodreads", "amazon"],
      tmpRoot,
      true,
    );

    expect(results.map((r) => r.source)).toEqual(["goodreads"]);
    expect(errors).toEqual([{ source: "amazon", reason: "blocked" }]);
  });

  it("omits clean no-match sources from both arrays", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(htmlResponse("<html><body>nothing</body></html>")),
    );
    const { results, errors } = await lookupAllSources(
      { isbn: "0000000000000" },
      ["goodreads"],
      tmpRoot,
      true,
    );
    expect(results).toEqual([]);
    expect(errors).toEqual([]);
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { isbn13ToIsbn10, fetchHtml, ScrapeError } from "./scrape.js";

describe("isbn13ToIsbn10", () => {
  it("derives the ISBN-10 from a 978-prefixed ISBN-13", () => {
    // 9780306406157 -> 0306406152
    expect(isbn13ToIsbn10("9780306406157")).toBe("0306406152");
  });

  it("computes an X check digit when needed", () => {
    // 9780804429573 -> 080442957X
    expect(isbn13ToIsbn10("9780804429573")).toBe("080442957X");
  });

  it("strips hyphens before converting", () => {
    expect(isbn13ToIsbn10("978-0-306-40615-7")).toBe("0306406152");
  });

  it("returns a normalized 10-char ISBN unchanged", () => {
    expect(isbn13ToIsbn10("0306406152")).toBe("0306406152");
  });

  it("returns null for 979-prefixed ISBNs (no ISBN-10 exists)", () => {
    expect(isbn13ToIsbn10("9791234567896")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(isbn13ToIsbn10("notanisbn")).toBeNull();
    expect(isbn13ToIsbn10("123")).toBeNull();
  });
});

describe("fetchHtml", () => {
  afterEach(() => vi.restoreAllMocks());

  it("classifies HTTP 503 as blocked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 503, ok: false }));
    await expect(fetchHtml("https://example.com")).rejects.toMatchObject({ reason: "blocked" });
  });

  it("classifies HTTP 403/429 as blocked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 403, ok: false }));
    await expect(fetchHtml("https://example.com")).rejects.toMatchObject({ reason: "blocked" });
  });

  it("classifies a 202 with no content as blocked (anti-bot soft-block)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 202, ok: true, text: () => Promise.resolve("") }));
    await expect(fetchHtml("https://example.com")).rejects.toMatchObject({ reason: "blocked" });
  });

  it("classifies an empty 200 body as blocked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 200, ok: true, text: () => Promise.resolve("   ") }));
    await expect(fetchHtml("https://example.com")).rejects.toMatchObject({ reason: "blocked" });
  });

  it("classifies other non-ok responses as http_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 404, ok: false }));
    await expect(fetchHtml("https://example.com")).rejects.toMatchObject({ reason: "http_error" });
  });

  it("classifies a captcha body as blocked even on a 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        text: () => Promise.resolve("<html><body>Robot Check</body></html>"),
      }),
    );
    await expect(fetchHtml("https://example.com")).rejects.toMatchObject({ reason: "blocked" });
  });

  it("classifies a network abort as timeout", async () => {
    const err = new Error("aborted");
    err.name = "TimeoutError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));
    await expect(fetchHtml("https://example.com")).rejects.toMatchObject({ reason: "timeout" });
  });

  it("returns the body on a clean 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ status: 200, ok: true, text: () => Promise.resolve("<html>ok</html>") }),
    );
    await expect(fetchHtml("https://example.com")).resolves.toContain("ok");
  });

  it("throws a ScrapeError instance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 503, ok: false }));
    await expect(fetchHtml("https://example.com")).rejects.toBeInstanceOf(ScrapeError);
  });
});

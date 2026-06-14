import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug.js";

describe("generateSlug", () => {
  it('converts "The Brothers Karamazov"', () => {
    expect(generateSlug("The Brothers Karamazov")).toBe("the-brothers-karamazov");
  });

  it('transliterates "Cien años de soledad"', () => {
    expect(generateSlug("Cien años de soledad")).toBe("cien-anos-de-soledad");
  });

  it("transliterates Čapek's War", () => {
    expect(generateSlug("Čapek's War")).toBe("capeks-war");
  });

  it("collapses punctuation", () => {
    expect(generateSlug("Hello!!!---World")).toBe("hello-world");
  });

  it("truncates to 80 characters", () => {
    const long = "a".repeat(100) + " " + "b".repeat(100);
    const slug = generateSlug(long);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns fallback for empty input", () => {
    const slug = generateSlug("");
    expect(slug.length).toBeGreaterThan(0);
    expect(slug).toMatch(/^untitled-/);
  });

  it("returns non-empty result for all-special-chars input", () => {
    const slug = generateSlug("!@#$%");
    expect(slug.length).toBeGreaterThan(0);
  });

  it("no collision when slug is unique", () => {
    const existing = new Set<string>(["foundation", "hyperion"]);
    expect(generateSlug("Dune", existing)).toBe("dune");
  });

  it("resolves collision with author surname suffix", () => {
    const existing = new Set<string>(["dune"]);
    expect(generateSlug("Dune", existing, "Frank Herbert")).toBe("dune-herbert");
  });

  it("resolves double collision with numeric suffix", () => {
    const existing = new Set<string>(["dune", "dune-herbert"]);
    expect(generateSlug("Dune", existing, "Frank Herbert")).toBe("dune-herbert-2");
  });

  it("resolves collision with numeric fallback when no author", () => {
    const existing = new Set<string>(["dune"]);
    expect(generateSlug("Dune", existing)).toBe("dune-2");
  });
});

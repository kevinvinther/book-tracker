/**
 * Client-side genre normalization, mirroring the server's rule (lowercase,
 * trimmed, whitespace collapsed to hyphens). Used to match a normalized genre
 * slug from a URL or stats link against the raw genres stored on works.
 */
export function normalizeGenre(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

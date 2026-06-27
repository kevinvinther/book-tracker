import type { AuthorMeta } from "./types";

/**
 * Resolve selected authors into `[[authors/slug]]` wikilinks, creating any that
 * don't exist yet. Mirrors the server's find-or-create: existing authors are
 * matched by name (case-insensitive); unknown names are created via POST /api/authors.
 */
export async function resolveAuthorWikilinks(authors: AuthorMeta[]): Promise<string[]> {
  let existing: AuthorMeta[] = [];
  try {
    const res = await fetch("/api/authors");
    if (res.ok) {
      const data = await res.json();
      existing = data.map((a: { slug: string; name: string }) => ({ slug: a.slug, name: a.name }));
    }
  } catch {
    // Treat as no existing authors; new ones will be created below.
  }

  const byName = new Map(existing.map((a) => [a.name.toLowerCase(), a.slug]));
  const wikilinks: string[] = [];

  for (const a of authors) {
    const hasRealSlug = a.slug && !a.slug.startsWith("new:");
    let slug = hasRealSlug ? a.slug : "";

    if (!slug) {
      const name = a.name.trim();
      if (!name) continue;
      const match = byName.get(name.toLowerCase());
      if (match) {
        slug = match;
      } else {
        const res = await fetch("/api/authors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) throw new Error(`Failed to create author "${name}"`);
        const created = await res.json();
        slug = created.slug;
        byName.set(name.toLowerCase(), slug);
      }
    }

    const wikilink = `[[authors/${slug}]]`;
    if (!wikilinks.includes(wikilink)) wikilinks.push(wikilink);
  }

  return wikilinks;
}

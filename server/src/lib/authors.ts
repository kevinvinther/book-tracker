import { Index } from "./index.js";
import { Author } from "./types.js";
import { writeFile, resolveLibraryPath } from "./io.js";
import { generateSlug } from "./slug.js";

function getAllSlugs(index: Index): Set<string> {
  const slugs = new Set<string>();
  for (const w of index.getAllWorks()) slugs.add(w.slug);
  for (const a of index.getAllAuthors()) slugs.add(a.slug);
  for (const e of index.getAllEditions()) slugs.add(e.slug);
  for (const c of index.getAllCopies()) slugs.add(c.slug);
  for (const s of index.getAllSeries()) slugs.add(s.slug);
  for (const slug of index.getAllNoteSlugs()) slugs.add(slug);
  return slugs;
}

export function findOrCreateAuthors(
  names: string[],
  index: Index,
  libraryPath: string
): { slug: string; name: string; isNew: boolean }[] {
  return names.map((raw) => {
    const trimmed = raw.trim();
    const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");

    for (const author of index.getAllAuthors()) {
      const authorNorm = author.name.toLowerCase().replace(/\s+/g, " ");
      if (authorNorm === normalized) {
        return { slug: author.slug, name: trimmed, isNew: false };
      }

      if (author.aliases) {
        for (const alias of author.aliases) {
          if (alias.toLowerCase().replace(/\s+/g, " ") === normalized) {
            return { slug: author.slug, name: trimmed, isNew: false };
          }
        }
      }
    }

    const slug = generateSlug(trimmed, getAllSlugs(index));
    const author: Author = {
      type: "author",
      slug,
      name: trimmed,
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    writeFile(resolveLibraryPath(`authors/${slug}.md`, libraryPath), author as unknown as Record<string, unknown>, `# ${author.name}`);
    index.upsert("author", author);
    return { slug, name: trimmed, isNew: true };
  });
}

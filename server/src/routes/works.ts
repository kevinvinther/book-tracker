import { Router } from "express";
import { Index } from "../lib/index.js";
import { Work } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { generateSlug } from "../lib/slug.js";
import { renderBody } from "../lib/render-body.js";

const MUTABLE_FIELDS = [
  "title", "subtitle", "authors", "original_language", "original_publish_year",
  "genres", "description", "series", "series_position", "primary_cover",
  "aliases",
] as const;

function extractFirstAuthorName(authors?: string[]): string | undefined {
  if (!authors || authors.length === 0) return undefined;
  const first = authors[0];
  const match = first.match(/^\[\[authors\/(.+)\]\]$/);
  return match ? match[1] : undefined;
}

function slugFromWikilink(wikilink: string, prefix: string): string | null {
  const match = wikilink.match(new RegExp(`^\\[\\[${prefix}/(.+)\\]\\]$`));
  return match ? match[1] : null;
}

function resolveAuthorsMeta(work: Work, index: Index): { slug: string; name: string }[] {
  return work.authors
    .map((wikilink) => {
      const slug = slugFromWikilink(wikilink, "authors");
      const author = slug ? index.getAuthor(slug) : undefined;
      return author ? { slug: author.slug, name: author.name } : null;
    })
    .filter((a): a is { slug: string; name: string } => a !== null);
}

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

export function createWorksRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const authors: string[] = Array.isArray(req.body.authors) ? req.body.authors : [];
    const firstAuthorName = extractFirstAuthorName(authors);
    const existingSlugs = getAllSlugs(index);
    const slug = generateSlug(title.trim(), existingSlugs, firstAuthorName);

    const work: Work = {
      type: "work",
      slug,
      title: title.trim(),
      authors,
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.subtitle) work.subtitle = req.body.subtitle;
    if (req.body.original_language) work.original_language = req.body.original_language;
    if (req.body.original_publish_year != null) work.original_publish_year = req.body.original_publish_year;
    if (req.body.genres) work.genres = req.body.genres;
    if (req.body.description) work.description = req.body.description;
    if (req.body.series) work.series = req.body.series;
    if (req.body.series_position != null) work.series_position = req.body.series_position;
    if (req.body.primary_cover) work.primary_cover = req.body.primary_cover;
    if (Array.isArray(req.body.aliases)) work.aliases = req.body.aliases;

    const filePath = resolveLibraryPath(`works/${slug}.md`, libraryPath);
    const body = renderBody(work, index);
    writeFile(filePath, work as unknown as Record<string, unknown>, body);
    index.upsert("work", work);

    res.status(201).json(work);
  });

  router.get("/", (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const sort = typeof req.query.sort === "string" ? req.query.sort : "created_at";
    const order = typeof req.query.order === "string" ? req.query.order : (sort === "created_at" ? "desc" : "asc");

    let works = q ? index.searchWorks(q) : index.getAllWorks();

    works = [...works].sort((a, b) => {
      let cmp = 0;
      if (sort === "title") {
        cmp = (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" });
      } else if (sort === "author") {
        const nameA = extractFirstAuthorName(a.authors) || "";
        const nameB = extractFirstAuthorName(b.authors) || "";
        cmp = nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
      } else if (sort === "created_at") {
        cmp = (a.created_at || "").localeCompare(b.created_at || "");
      }
      return order === "desc" ? -cmp : cmp;
    });

    res.json(
      works.map((w) => ({
        ...w,
        copy_count: index.getCopiesByWork(w.slug).length,
        authors_meta: resolveAuthorsMeta(w, index),
      })),
    );
  });

  router.get("/:slug", (req, res) => {
    const work = index.getWork(req.params.slug);
    if (!work) {
      res.status(404).json({ error: "Work not found" });
      return;
    }

    const editionCount = index.getEditionsByWork(work.slug).length;
    const copyCount = index.getCopiesByWork(work.slug).length;

    const authors_meta = resolveAuthorsMeta(work, index);

    const seriesSlug = work.series ? slugFromWikilink(work.series, "series") : null;
    const series = seriesSlug ? index.getSeries(seriesSlug) : undefined;
    const series_meta = series ? { slug: series.slug, name: series.name } : null;

    res.json({ ...work, edition_count: editionCount, copy_count: copyCount, authors_meta, series_meta, body: renderBody(work, index) });
  });

  router.patch("/:slug", (req, res) => {
    const existing = index.getWork(req.params.slug);
    if (!existing) {
      res.status(404).json({ error: "Work not found" });
      return;
    }

    const filePath = resolveLibraryPath(`works/${existing.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    if (req.body.title !== undefined) {
      if (!req.body.title || (typeof req.body.title === "string" && !req.body.title.trim())) {
        res.status(400).json({ error: "title must not be empty" });
        return;
      }
    }

    for (const field of MUTABLE_FIELDS) {
      if (req.body[field] === null) {
        delete frontmatter[field];
      } else if (req.body[field] !== undefined) {
        frontmatter[field] = req.body[field];
      }
    }

    frontmatter.slug = existing.slug;
    frontmatter.type = "work";
    frontmatter._schema = 1;

    const updated = frontmatter as unknown as Work;
    const body = renderBody(updated, index);
    writeFile(filePath, frontmatter, body);
    index.upsert("work", updated);

    res.json(updated);
  });

  router.delete("/:slug", (req, res) => {
    const work = index.getWork(req.params.slug);
    if (!work) {
      res.status(404).json({ error: "Work not found" });
      return;
    }

    const editions = index.getEditionsByWork(work.slug);

    if (editions.length > 0 && req.query.cascade !== "true") {
      res.status(409).json({
        error: `Work has ${editions.length} edition(s). Use ?cascade=true to delete the work, all editions, copies, and notes.`,
        edition_count: editions.length,
      });
      return;
    }

    if (req.query.cascade === "true") {
      for (const edition of editions) {
        const copies = index.getCopiesByEdition(edition.slug);
        for (const copy of copies) {
          const notes = index.getNotesByCopy(copy.slug);
          for (const note of notes) {
            const notePath = resolveLibraryPath(`notes/${note.slug}.md`, libraryPath);
            deleteFile(notePath);
            index.remove("note", note.slug);
          }
          const copyPath = resolveLibraryPath(`copies/${copy.slug}.md`, libraryPath);
          deleteFile(copyPath);
          index.remove("copy", copy.slug);
        }
        const editionPath = resolveLibraryPath(`editions/${edition.slug}.md`, libraryPath);
        deleteFile(editionPath);
        index.remove("edition", edition.slug);
      }
    }

    const workPath = resolveLibraryPath(`works/${work.slug}.md`, libraryPath);
    deleteFile(workPath);
    index.remove("work", work.slug);

    res.json({ message: "Work deleted", slug: work.slug, cascade: editions.length > 0 });
  });

  router.post("/:slug/aliases", (req, res) => {
    const work = index.getWork(req.params.slug);
    if (!work) {
      res.status(404).json({ error: "Work not found" });
      return;
    }

    const { alias } = req.body;
    if (!alias || typeof alias !== "string" || !alias.trim()) {
      res.status(400).json({ error: "alias is required" });
      return;
    }

    const filePath = resolveLibraryPath(`works/${work.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    const aliases: string[] = Array.isArray(frontmatter.aliases) ? [...frontmatter.aliases] : [];
    aliases.push(alias.trim());
    frontmatter.aliases = aliases;

    const updated = frontmatter as unknown as Work;
    const body = renderBody(updated, index);
    writeFile(filePath, frontmatter, body);
    index.upsert("work", updated);

    res.json(updated);
  });

  router.delete("/:slug/aliases", (req, res) => {
    const work = index.getWork(req.params.slug);
    if (!work) {
      res.status(404).json({ error: "Work not found" });
      return;
    }

    const { alias } = req.body;
    if (!alias || typeof alias !== "string" || !alias.trim()) {
      res.status(400).json({ error: "alias is required" });
      return;
    }

    const filePath = resolveLibraryPath(`works/${work.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    const aliases: string[] = Array.isArray(frontmatter.aliases) ? [...frontmatter.aliases] : [];
    const idx = aliases.indexOf(alias.trim());
    if (idx === -1) {
      res.status(404).json({ error: "Alias not found" });
      return;
    }

    aliases.splice(idx, 1);
    frontmatter.aliases = aliases.length > 0 ? aliases : undefined;

    const updated = frontmatter as unknown as Work;
    const body = renderBody(updated, index);
    writeFile(filePath, frontmatter, body);
    index.upsert("work", updated);

    res.json(updated);
  });

  return router;
}

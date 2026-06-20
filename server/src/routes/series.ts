import { Router } from "express";
import { Index } from "../lib/index.js";
import { Series, Work } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { generateSlug } from "../lib/slug.js";
import { renderBody } from "../lib/render-body.js";

const MUTABLE_FIELDS = ["name", "total_works", "aliases"] as const;

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

export function createSeriesRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const existingSlugs = getAllSlugs(index);
    const slug = generateSlug(name.trim(), existingSlugs);

    const series: Series = {
      type: "series",
      slug,
      name: name.trim(),
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.total_works !== undefined) series.total_works = Number(req.body.total_works);
    if (Array.isArray(req.body.aliases)) series.aliases = req.body.aliases;

    const filePath = resolveLibraryPath(`series/${slug}.md`, libraryPath);
    writeFile(filePath, series as unknown as Record<string, unknown>, renderBody(series, index));
    index.upsert("series", series);

    res.status(201).json(series);
  });

  router.get("/", (_req, res) => {
    res.json(index.getAllSeries());
  });

  router.get("/:slug", (req, res) => {
    const series = index.getSeries(req.params.slug);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }

    const works = index
      .getWorksBySeries(series.slug)
      .map((w) => ({
        slug: w.slug,
        title: w.title,
        series_position: w.series_position,
        authors_meta: w.authors
          .map((wikilink) => {
            const slug = wikilink.match(/^\[\[authors\/(.+)\]\]$/)?.[1];
            const author = slug ? index.getAuthor(slug) : undefined;
            return author ? { slug: author.slug, name: author.name } : null;
          })
          .filter((a): a is { slug: string; name: string } => a !== null),
        primary_cover: w.primary_cover ?? null,
        edition_count: index.getEditionsByWork(w.slug).length,
        copy_count: index.getCopiesByWork(w.slug).length,
      }))
      .sort((a, b) => (a.series_position ?? Infinity) - (b.series_position ?? Infinity));

    res.json({ ...series, works, body: renderBody(series, index) });
  });

  router.patch("/:slug", (req, res) => {
    const existing = index.getSeries(req.params.slug);
    if (!existing) {
      res.status(404).json({ error: "Series not found" });
      return;
    }

    if (req.body.name !== undefined) {
      if (!req.body.name || (typeof req.body.name === "string" && !req.body.name.trim())) {
        res.status(400).json({ error: "name must not be empty" });
        return;
      }
    }

    const filePath = resolveLibraryPath(`series/${existing.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    for (const field of MUTABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        frontmatter[field] = req.body[field];
      }
    }

    frontmatter.slug = existing.slug;
    frontmatter.type = "series";
    frontmatter.created_at = existing.created_at;
    frontmatter._schema = 1;

    const updated = frontmatter as unknown as Series;
    writeFile(filePath, frontmatter, renderBody(updated, index));
    index.upsert("series", updated);

    res.json(updated);
  });

  router.delete("/:slug", (req, res) => {
    const series = index.getSeries(req.params.slug);
    if (!series) {
      res.status(404).json({ error: "Series not found" });
      return;
    }

    const works = index.getWorksBySeries(series.slug);
    const cascade = req.query.cascade === "true";

    if (works.length > 0 && !cascade) {
      res.status(409).json({
        error: `Series has ${works.length} linked work(s). Use ?cascade=true to clear the series link from those works.`,
        work_count: works.length,
      });
      return;
    }

    if (cascade) {
      for (const work of works) {
        const workFilePath = resolveLibraryPath(`works/${work.slug}.md`, libraryPath);
        const { frontmatter } = readFile(workFilePath);
        delete frontmatter.series;
        delete frontmatter.series_position;
        writeFile(workFilePath, frontmatter, "");
        index.upsert("work", frontmatter as unknown as Work);
      }
    }

    deleteFile(resolveLibraryPath(`series/${series.slug}.md`, libraryPath));
    index.remove("series", series.slug);

    res.json({ message: "Series deleted", slug: series.slug, cascade });
  });

  return router;
}

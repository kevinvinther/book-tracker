import { Router } from "express";
import { Index } from "../lib/index.js";
import { Author } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { generateSlug } from "../lib/slug.js";
import { renderBody } from "../lib/render-body.js";

const MUTABLE_FIELDS = ["name", "aliases"] as const;

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

export function createAuthorsRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }

    const existingSlugs = getAllSlugs(index);
    const slug = generateSlug(name.trim(), existingSlugs);

    const author: Author = {
      type: "author",
      slug,
      name: name.trim(),
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.aliases && Array.isArray(req.body.aliases)) {
      author.aliases = req.body.aliases;
    }

    const filePath = resolveLibraryPath(`authors/${slug}.md`, libraryPath);
    writeFile(filePath, author as unknown as Record<string, unknown>, renderBody(author, index));
    index.upsert("author", author);

    res.status(201).json(author);
  });

  router.get("/", (_req, res) => {
    res.json(index.getAllAuthors());
  });

  router.get("/:slug", (req, res) => {
    const author = index.getAuthor(req.params.slug);
    if (!author) {
      res.status(404).json({ error: "Author not found" });
      return;
    }

    const works = index.getWorksByAuthor(author.slug)
      .map((w) => ({
        slug: w.slug,
        title: w.title,
        primary_cover: w.primary_cover ?? null,
        edition_count: index.getEditionsByWork(w.slug).length,
        copy_count: index.getCopiesByWork(w.slug).length,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    res.json({ ...author, works, body: renderBody(author, index) });
  });

  router.patch("/:slug", (req, res) => {
    const existing = index.getAuthor(req.params.slug);
    if (!existing) {
      res.status(404).json({ error: "Author not found" });
      return;
    }

    const filePath = resolveLibraryPath(`authors/${existing.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    if (req.body.name !== undefined) {
      if (!req.body.name || (typeof req.body.name === "string" && !req.body.name.trim())) {
        res.status(400).json({ error: "name must not be empty" });
        return;
      }
    }

    for (const field of MUTABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        frontmatter[field] = req.body[field];
      }
    }

    frontmatter.slug = existing.slug;
    frontmatter.type = "author";
    frontmatter._schema = 1;

    const updated = frontmatter as unknown as Author;
    const body = renderBody(updated, index);
    writeFile(filePath, frontmatter, body);
    index.upsert("author", updated);

    res.json(updated);
  });

  router.delete("/:slug", (req, res) => {
    const author = index.getAuthor(req.params.slug);
    if (!author) {
      res.status(404).json({ error: "Author not found" });
      return;
    }

    const works = index.getWorksByAuthor(author.slug);

    if (works.length > 0 && req.query.cascade !== "true") {
      res.status(409).json({
        error: `Author has ${works.length} work(s). Use ?cascade=true to force delete (works will not be modified).`,
        work_count: works.length,
      });
      return;
    }

    const filePath = resolveLibraryPath(`authors/${author.slug}.md`, libraryPath);
    deleteFile(filePath);
    index.remove("author", author.slug);

    res.json({ message: "Author deleted", slug: author.slug, cascade: works.length > 0 });
  });

  return router;
}

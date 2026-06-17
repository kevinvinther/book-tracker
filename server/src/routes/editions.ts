import { Router } from "express";
import { Index } from "../lib/index.js";
import { Edition } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { generateSlug } from "../lib/slug.js";

const MUTABLE_FIELDS = [
  "isbn", "publisher", "publish_date", "page_count", "format", "language", "contributors",
] as const;

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

export function createEditionsRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const { work } = req.body;
    if (!work || typeof work !== "string" || !work.trim()) {
      res.status(400).json({ error: "work is required" });
      return;
    }

    const workSlug = work.trim();
    if (!index.getWork(workSlug)) {
      res.status(400).json({ error: `Work '${workSlug}' does not exist` });
      return;
    }

    const publisher: string = req.body.publisher ?? "";
    const year = req.body.publish_date ? String(req.body.publish_date).split("-")[0] : "";
    const slugInput = [workSlug, publisher, year].filter(Boolean).join(" ");
    const slug = generateSlug(slugInput, getAllSlugs(index));

    const edition: Edition = {
      type: "edition",
      slug,
      work: `[[works/${workSlug}]]`,
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.isbn !== undefined) edition.isbn = req.body.isbn;
    if (publisher) edition.publisher = publisher;
    if (req.body.publish_date !== undefined) edition.publish_date = req.body.publish_date;
    if (req.body.page_count !== undefined) edition.page_count = Number(req.body.page_count);
    if (req.body.format !== undefined) edition.format = req.body.format;
    if (req.body.language !== undefined) edition.language = req.body.language;
    if (Array.isArray(req.body.contributors)) edition.contributors = req.body.contributors;

    const filePath = resolveLibraryPath(`editions/${slug}.md`, libraryPath);
    writeFile(filePath, edition as unknown as Record<string, unknown>, "");
    index.upsert("edition", edition);

    res.status(201).json(edition);
  });

  router.get("/", (req, res) => {
    if (req.query.work) {
      res.json(index.getEditionsByWork(req.query.work as string));
    } else {
      res.json(index.getAllEditions());
    }
  });

  router.get("/:slug", (req, res) => {
    const edition = index.getEdition(req.params.slug);
    if (!edition) {
      res.status(404).json({ error: "Edition not found" });
      return;
    }

    const copy_count = index.getCopiesByEdition(edition.slug).length;
    res.json({ ...edition, copy_count });
  });

  router.patch("/:slug", (req, res) => {
    const existing = index.getEdition(req.params.slug);
    if (!existing) {
      res.status(404).json({ error: "Edition not found" });
      return;
    }

    const filePath = resolveLibraryPath(`editions/${existing.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    for (const field of MUTABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        frontmatter[field] = req.body[field];
      }
    }

    frontmatter.slug = existing.slug;
    frontmatter.type = "edition";
    frontmatter.work = existing.work;
    frontmatter.created_at = existing.created_at;
    frontmatter._schema = 1;

    const updated = frontmatter as unknown as Edition;
    writeFile(filePath, frontmatter, "");
    index.upsert("edition", updated);

    res.json(updated);
  });

  router.delete("/:slug", (req, res) => {
    const edition = index.getEdition(req.params.slug);
    if (!edition) {
      res.status(404).json({ error: "Edition not found" });
      return;
    }

    const copies = index.getCopiesByEdition(edition.slug);
    const cascade = req.query.cascade === "true";
    const force = !cascade && req.query.force === "true";

    if (copies.length > 0 && !cascade && !force) {
      res.status(409).json({
        error: `Edition has ${copies.length} copy/copies. Use ?force=true to delete the edition only (copies become orphaned), or ?cascade=true to delete the edition and all copies.`,
        copy_count: copies.length,
      });
      return;
    }

    if (cascade) {
      for (const copy of copies) {
        deleteFile(resolveLibraryPath(`copies/${copy.slug}.md`, libraryPath));
        index.remove("copy", copy.slug);
      }
    }

    deleteFile(resolveLibraryPath(`editions/${edition.slug}.md`, libraryPath));
    index.remove("edition", edition.slug);

    res.json({ message: "Edition deleted", slug: edition.slug, cascade, force });
  });

  return router;
}

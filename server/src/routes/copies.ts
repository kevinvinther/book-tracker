import { Router } from "express";
import { Index } from "../lib/index.js";
import { Copy } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { generateSlug } from "../lib/slug.js";

const MUTABLE_FIELDS = [
  "condition", "location", "cover_image", "release_date",
  "acquisition_date", "acquisition_source", "price_amount", "price_currency", "status",
] as const;

const VALID_STATUSES = new Set(["owned", "lent", "lost", "given-away", "sold"]);

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

function slugFromWikilink(wikilink: string): string | null {
  const match = wikilink.match(/^\[\[(?:editions|works)\/(.+)\]\]$/);
  return match ? match[1] : null;
}

export function createCopiesRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const { edition, work } = req.body;

    if (!edition || typeof edition !== "string" || !edition.trim()) {
      res.status(400).json({ error: "edition is required" });
      return;
    }
    if (!work || typeof work !== "string" || !work.trim()) {
      res.status(400).json({ error: "work is required" });
      return;
    }

    const editionSlug = edition.trim();
    const workSlug = work.trim();

    if (!index.getEdition(editionSlug)) {
      res.status(400).json({ error: `Edition '${editionSlug}' does not exist` });
      return;
    }
    if (!index.getWork(workSlug)) {
      res.status(400).json({ error: `Work '${workSlug}' does not exist` });
      return;
    }

    const slug = generateSlug(editionSlug, getAllSlugs(index));

    const status = req.body.status && VALID_STATUSES.has(req.body.status)
      ? req.body.status
      : "owned";

    const copy: Copy = {
      type: "copy",
      slug,
      edition: `[[editions/${editionSlug}]]`,
      work: `[[works/${workSlug}]]`,
      status,
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.cover_image !== undefined) copy.cover_image = req.body.cover_image;
    if (req.body.release_date !== undefined) copy.release_date = req.body.release_date;
    if (req.body.condition !== undefined) copy.condition = req.body.condition;
    if (req.body.acquisition_date !== undefined) copy.acquisition_date = req.body.acquisition_date;
    if (req.body.acquisition_source !== undefined) copy.acquisition_source = req.body.acquisition_source;
    if (req.body.price_amount !== undefined) copy.price_amount = Number(req.body.price_amount);
    if (req.body.price_currency !== undefined) copy.price_currency = req.body.price_currency;
    if (req.body.location !== undefined) copy.location = req.body.location;

    const filePath = resolveLibraryPath(`copies/${slug}.md`, libraryPath);
    writeFile(filePath, copy as unknown as Record<string, unknown>, "");
    index.upsert("copy", copy);

    res.status(201).json(copy);
  });

  router.get("/:slug", (req, res) => {
    const copy = index.getCopy(req.params.slug);
    if (!copy) {
      res.status(404).json({ error: "Copy not found" });
      return;
    }

    const editionSlug = slugFromWikilink(copy.edition);
    const workSlug = slugFromWikilink(copy.work);

    const edition = editionSlug ? index.getEdition(editionSlug) : undefined;
    const work = workSlug ? index.getWork(workSlug) : undefined;

    const edition_meta = edition
      ? { slug: edition.slug, publisher: edition.publisher, format: edition.format, page_count: edition.page_count, isbn: edition.isbn }
      : null;

    const work_meta = work
      ? { slug: work.slug, title: work.title, authors: work.authors }
      : null;

    res.json({ ...copy, edition_meta, work_meta });
  });

  router.patch("/:slug", (req, res) => {
    const existing = index.getCopy(req.params.slug);
    if (!existing) {
      res.status(404).json({ error: "Copy not found" });
      return;
    }

    const filePath = resolveLibraryPath(`copies/${existing.slug}.md`, libraryPath);
    const { frontmatter } = readFile(filePath);

    for (const field of MUTABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        frontmatter[field] = req.body[field];
      }
    }

    frontmatter.slug = existing.slug;
    frontmatter.type = "copy";
    frontmatter.edition = existing.edition;
    frontmatter.work = existing.work;
    frontmatter.created_at = existing.created_at;
    frontmatter._schema = 1;

    const updated = frontmatter as unknown as Copy;
    writeFile(filePath, frontmatter, "");
    index.upsert("copy", updated);

    res.json(updated);
  });

  router.delete("/:slug", (req, res) => {
    const copy = index.getCopy(req.params.slug);
    if (!copy) {
      res.status(404).json({ error: "Copy not found" });
      return;
    }

    deleteFile(resolveLibraryPath(`copies/${copy.slug}.md`, libraryPath));
    index.remove("copy", copy.slug);

    res.json({ message: "Copy deleted", slug: copy.slug });
  });

  return router;
}

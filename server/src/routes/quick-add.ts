import { Router } from "express";
import { Index } from "../lib/index.js";
import { Edition, Copy, Work } from "../lib/types.js";
import { writeFile, resolveLibraryPath } from "../lib/io.js";
import { generateSlug } from "../lib/slug.js";
import { findOrCreateAuthors } from "../lib/authors.js";

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

export function createQuickAddRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    try {
      const { title, subtitle, authorNames } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }

    if (!Array.isArray(authorNames) || authorNames.length === 0) {
      res.status(400).json({ error: "at least one author is required" });
      return;
    }

    const authorResults = findOrCreateAuthors(authorNames, index, libraryPath);
    const authorSlugs = authorResults.map((r) => r.slug);

    const workSlug = generateSlug(title.trim(), getAllSlugs(index));
    const work: Work = {
      type: "work",
      slug: workSlug,
      title: title.trim(),
      authors: authorSlugs.map((s) => `[[authors/${s}]]`),
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (subtitle && typeof subtitle === "string" && subtitle.trim()) {
      work.subtitle = subtitle.trim();
    }
    if (req.body.cover_image && typeof req.body.cover_image === "string" && req.body.cover_image.trim()) {
      work.primary_cover = req.body.cover_image.trim();
    }

    writeFile(resolveLibraryPath(`works/${workSlug}.md`, libraryPath), work as unknown as Record<string, unknown>, "");
    index.upsert("work", work);

    const editionSlug = generateSlug(workSlug, getAllSlugs(index));
    const edition: Edition = {
      type: "edition",
      slug: editionSlug,
      work: `[[works/${workSlug}]]`,
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.isbn !== undefined && req.body.isbn !== "") edition.isbn = req.body.isbn;
    if (req.body.publisher !== undefined && req.body.publisher !== "") edition.publisher = req.body.publisher;
    if (req.body.publish_date !== undefined && req.body.publish_date !== "") edition.publish_date = req.body.publish_date;
    if (req.body.page_count !== undefined && req.body.page_count !== "") edition.page_count = Number(req.body.page_count);
    if (req.body.format !== undefined && req.body.format !== "") edition.format = req.body.format;
    if (req.body.language !== undefined && req.body.language !== "") edition.language = req.body.language;

    writeFile(resolveLibraryPath(`editions/${editionSlug}.md`, libraryPath), edition as unknown as Record<string, unknown>, "");
    index.upsert("edition", edition);

    const status = req.body.status && ["owned", "lent", "lost", "given-away", "sold"].includes(req.body.status)
      ? req.body.status
      : "owned";

    const copySlug = generateSlug(editionSlug, getAllSlugs(index));
    const copy: Copy = {
      type: "copy",
      slug: copySlug,
      edition: `[[editions/${editionSlug}]]`,
      work: `[[works/${workSlug}]]`,
      status,
      created_at: new Date().toISOString(),
      _schema: 1,
    };

    if (req.body.condition !== undefined && req.body.condition !== "") copy.condition = req.body.condition;
    if (req.body.acquisition_date !== undefined && req.body.acquisition_date !== "") copy.acquisition_date = req.body.acquisition_date;
    if (req.body.acquisition_source !== undefined && req.body.acquisition_source !== "") copy.acquisition_source = req.body.acquisition_source;
    if (req.body.price_amount !== undefined && req.body.price_amount !== "") copy.price_amount = Number(req.body.price_amount);
    if (req.body.price_currency !== undefined && req.body.price_currency !== "") copy.price_currency = req.body.price_currency;
    if (req.body.location !== undefined && req.body.location !== "") copy.location = req.body.location;
    if (req.body.cover_image !== undefined && req.body.cover_image !== "") copy.cover_image = req.body.cover_image;

    writeFile(resolveLibraryPath(`copies/${copySlug}.md`, libraryPath), copy as unknown as Record<string, unknown>, "");
    index.upsert("copy", copy);

    res.status(201).json({ workSlug });
    } catch (err) {
      console.error("quick-add error:", err);
      res.status(500).json({ error: "Failed to create book. Please try again." });
    }
  });

  return router;
}

import { Router } from "express";
import { Index } from "../lib/index.js";
import { Note } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { generateNoteSlug } from "../lib/slug.js";

const MUTABLE_FIELDS = ["content", "body", "read_through", "context_page", "tags"] as const;

function slugFromWikilink(wikilink: string | undefined): string | null {
  if (!wikilink) return null;
  const match = wikilink.match(/^\[\[.+?\/(.+)\]\]$/);
  return match ? match[1] : null;
}

interface ResolvedMeta {
  copy_meta: Record<string, unknown> | null;
  edition_meta: Record<string, unknown> | null;
  work_meta: Record<string, unknown> | null;
  read_through_meta: Record<string, unknown> | null;
}

function resolveNoteMeta(index: Index, note: Note): ResolvedMeta {
  const result: ResolvedMeta = {
    copy_meta: null,
    edition_meta: null,
    work_meta: null,
    read_through_meta: null,
  };

  const copySlug = slugFromWikilink(note.copy);
  const editionSlug = slugFromWikilink(note.edition);
  const workSlug = slugFromWikilink(note.work);

  if (copySlug) {
    const copy = index.getCopy(copySlug);
    if (copy) {
      result.copy_meta = {
        slug: copy.slug,
        condition: copy.condition,
        location: copy.location,
      };
    }
  }

  if (editionSlug) {
    const edition = index.getEdition(editionSlug);
    if (edition) {
      result.edition_meta = {
        slug: edition.slug,
        publisher: edition.publisher,
        format: edition.format,
        page_count: edition.page_count,
      };
    }
  }

  if (workSlug) {
    const work = index.getWork(workSlug);
    if (work) {
      result.work_meta = {
        slug: work.slug,
        title: work.title,
        authors: work.authors,
      };
    }
  }

  if (note.read_through && copySlug) {
    const copy = index.getCopy(copySlug);
    if (copy?.read_throughs) {
      const rt = copy.read_throughs.find((r) => r.started_date.startsWith(note.read_through!));
      if (rt) {
        result.read_through_meta = {
          started_date: rt.started_date,
          status: rt.status,
          rating: rt.rating,
        };
      }
    }
  }

  return result;
}

function noteToResponse(note: Note, meta: ResolvedMeta) {
  const { body, ...rest } = note;
  return {
    ...rest,
    body: body || "",
    copy_meta: meta.copy_meta,
    edition_meta: meta.edition_meta,
    work_meta: meta.work_meta,
    read_through_meta: meta.read_through_meta,
  };
}

export function createNotesRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/", (req, res) => {
    try {
      const { work, edition, copy, read_through, context_page, tags, content } = req.body;

      if (!work && !edition && !copy) {
        res.status(400).json({ error: "At least one of work, edition, or copy is required" });
        return;
      }

      if (read_through && !copy) {
        res.status(400).json({ error: "read_through requires a copy to be specified" });
        return;
      }

      const now = new Date().toISOString();

      const note: Note = {
        type: "note",
        slug: "",
        date: now,
        modified: now,
        _schema: 1,
      };

      const bodyValue = req.body.body !== undefined ? req.body.body : content;
      if (bodyValue !== undefined) note.body = bodyValue;
      if (tags !== undefined) note.tags = tags;
      if (context_page !== undefined) note.context_page = context_page;

      if (copy) {
        const copyEntity = index.getCopy(copy.trim());
        if (!copyEntity) {
          res.status(400).json({ error: `Copy '${copy.trim()}' does not exist` });
          return;
        }
        note.copy = `[[copies/${copy.trim()}]]`;
        note.edition = copyEntity.edition;
        note.work = copyEntity.work;

        if (read_through) {
          const rts = copyEntity.read_throughs || [];
          const found = rts.find((rt) => rt.started_date.startsWith(read_through));
          if (!found) {
            res.status(400).json({
              error: `Read-through with started_date '${read_through}' not found on copy '${copy.trim()}'`,
            });
            return;
          }
          note.read_through = read_through;
        }
      } else if (edition) {
        const editionEntity = index.getEdition(edition.trim());
        if (!editionEntity) {
          res.status(400).json({ error: `Edition '${edition.trim()}' does not exist` });
          return;
        }
        note.edition = `[[editions/${edition.trim()}]]`;
        note.work = editionEntity.work;
      } else if (work) {
        const workEntity = index.getWork(work.trim());
        if (!workEntity) {
          res.status(400).json({ error: `Work '${work.trim()}' does not exist` });
          return;
        }
        note.work = `[[works/${work.trim()}]]`;
      }

      note.slug = generateNoteSlug(new Set(index.getAllNoteSlugs()));

      const bodyContent = note.body || "";
      const frontmatter = { ...note } as Record<string, unknown>;
      delete frontmatter.body;

      const filePath = resolveLibraryPath(`notes/${note.slug}.md`, libraryPath);
      writeFile(filePath, frontmatter, bodyContent);
      index.upsert("note", note);

      const meta = resolveNoteMeta(index, note);
      res.status(201).json(noteToResponse(note, meta));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  });

  router.get("/", (req, res) => {
    let notes = index.getAllNotes();

    const copyFilter = req.query.copy as string | undefined;
    const editionFilter = req.query.edition as string | undefined;
    const workFilter = req.query.work as string | undefined;
    const searchQuery = req.query.q as string | undefined;

    if (copyFilter) {
      const wikilink = `[[copies/${copyFilter}]]`;
      notes = notes.filter((n) => n.copy === wikilink);
    }

    if (editionFilter) {
      const wikilink = `[[editions/${editionFilter}]]`;
      notes = notes.filter((n) => n.edition === wikilink);
    }

    if (workFilter) {
      const wikilink = `[[works/${workFilter}]]`;
      notes = notes.filter((n) => n.work === wikilink);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      notes = notes.filter((n) => n.body?.toLowerCase().includes(q));
    }

    notes.sort((a, b) => b.date.localeCompare(a.date));

    const result = notes.map((note) => {
      const meta = resolveNoteMeta(index, note);
      return noteToResponse(note, meta);
    });

    res.json(result);
  });

  router.get("/:slug", (req, res) => {
    const note = index.getNote(req.params.slug);
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const meta = resolveNoteMeta(index, note);
    res.json(noteToResponse(note, meta));
  });

  router.patch("/:slug", (req, res) => {
    const existing = index.getNote(req.params.slug);
    if (!existing) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const filePath = resolveLibraryPath(`notes/${existing.slug}.md`, libraryPath);
    const { frontmatter, body: diskBody } = readFile(filePath);

    const note = frontmatter as unknown as Note;

    // Merge mutable fields from request body
    for (const field of MUTABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        if (field === "content" || field === "body") {
          note.body = req.body[field];
        } else {
          (note as unknown as Record<string, unknown>)[field] = req.body[field];
        }
      }
    }

    // Validate read_through if being changed
    if (note.read_through && note.copy) {
      const copySlug = slugFromWikilink(note.copy);
      if (copySlug) {
        const copyEntity = index.getCopy(copySlug);
        if (copyEntity?.read_throughs) {
          const found = copyEntity.read_throughs.find((rt) =>
            rt.started_date.startsWith(note.read_through!),
          );
          if (!found) {
            res.status(400).json({
              error: `Read-through with started_date '${note.read_through}' not found on copy`,
            });
            return;
          }
        }
      }
    }

    note.modified = new Date().toISOString();

    // Preserve immutable fields from disk
    note.slug = existing.slug;
    note.type = "note";
    note.date = existing.date;
    if (existing.work) note.work = existing.work;
    if (existing.edition) note.edition = existing.edition;
    if (existing.copy) note.copy = existing.copy;
    note._schema = 1;

    const bodyContent = note.body || diskBody || "";
    const frontmatterOut = { ...note } as Record<string, unknown>;
    delete frontmatterOut.body;

    writeFile(filePath, frontmatterOut, bodyContent);
    index.upsert("note", note);

    const meta = resolveNoteMeta(index, note);
    res.json(noteToResponse(note, meta));
  });

  router.delete("/:slug", (req, res) => {
    const note = index.getNote(req.params.slug);
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    deleteFile(resolveLibraryPath(`notes/${note.slug}.md`, libraryPath));
    index.remove("note", note.slug);

    res.json({ message: "Note deleted", slug: note.slug });
  });

  return router;
}

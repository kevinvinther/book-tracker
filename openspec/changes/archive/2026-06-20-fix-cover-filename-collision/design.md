## Context

`downloadCover()` in `server/src/lib/lookup.ts` saves cover images to `attachments/`. The saved filename is derived from the cover URL's pathname basename:

```typescript
const urlFilename = basename(new URL(coverUrl).pathname);
const filename = `${...}-cover.${ext}`;
```

For Google Books, the cover URL from `imageLinks.thumbnail` has a fixed pathname structure (e.g., `/books/content`), so every book's cover resolves to `content-cover.jpg`. Each new lookup overwrites the previous book's cover file on disk. An existing `maxAge: "1d"` on the Express static middleware then serves the stale cached image to browsers.

The upload endpoint (`POST /api/attachments/upload`) already uses `crypto.randomUUID()` for filenames (line 67 of `server/src/index.ts`).

## Goals / Non-Goals

**Goals:**
- Every downloaded cover gets a unique filename so no two books share a cover file.

**Non-Goals:**
- Fixing already-collided cover files on disk (existing books keep their frontmatter as-is).
- Changing the Express static `maxAge` cache policy.
- Changing the upload endpoint naming.

## Decisions

**Use `crypto.randomUUID()` for cover filenames.**

- **Chosen over**: hashing the cover URL (SHA-256). UUID is simpler — same number of imports, less code — and the ISBN lookup cache already prevents redundant downloads for the same ISBN, so URL-based determinism adds no real value.
- **Chosen over**: passing the ISBN to `downloadCover()`. That tightens the function's coupling unnecessarily. The upload endpoint already uses UUIDs, so this is a consistent pattern.
- The extension is still extracted from the URL, preserving correct file type detection.

Parent commit; the cover_image value stored in frontmatter is just the filename (not a path), so the change is transparent to all consumers (frontend, body rendering, etc.).

## Risks / Trade-offs

- **Duplicate downloads for the same cover URL**: If two different ISBNs map to the same cover URL, each will download its own copy rather than sharing a file. Mitigation: this is extremely unlikely in practice and the disk cost is negligible for a personal app.
- **Cache invalidation**: The old `content-cover.jpg` file remains on disk. Mitigation: low impact — it's a single orphaned file per library, and the existing cache for affected ISBNs will still reference the old filename. Future lookups will use the new UUID name.

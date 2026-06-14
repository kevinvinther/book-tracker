# AGENTS.md

## Project

Personal book diary app. Physical copies as first-class entities. Markdown files + YAML frontmatter as the data store. Obsidian-compatible.

## Committing 

* Use atomic commits.
* Use conventional commits. 
* Keep commits in prose language, rather than lists.

## Repository Layout

```
spec.md          — full specification (read this before anything else)
intent.md        — original confirmed intent
BUILD_PLAN.md    — 33-step implementation sequence with dependency graph
README.md        — project overview
```

## Stack

React + Vite + TypeScript + Tailwind + shadcn/ui (frontend)
Node.js + Express + TypeScript (backend)
No database — markdown files on disk with YAML frontmatter

## Conventions

- **Frontmatter is canonical.** The YAML frontmatter is the source of truth. Markdown bodies are auto-generated renders — they are written to disk on save, but never parsed as data input.
- **Forward `[[wikilinks]]` only.** Files reference parent entities via wikilinks (Copy → Edition → Work, Note → Copy, Work → Author). Reverse navigation uses Obsidian backlinks or the in-memory index, not manually maintained `links` lists.
- **Slugs are immutable.** Once a file is created, its slug never changes. The title can diverge from the slug.
- **Atomic writes.** Always write to a temp file and rename. Never write directly to the target path.
- **Re-read before write.** Before any PATCH, re-read the target file from disk and merge fields the app isn't touching.
- **No empty optional fields.** Omit keys entirely when they have no value. YAML parsers treat missing keys as null.
- **Genres are normalized.** Lowercase, trimmed, spaces → hyphens. Controlled vocabulary in `.booktracker/genres.yaml`.
- **Note filenames are timestamps.** `YYYY-MM-DD-HHMMSS.md`. No colons in filenames.

## Key Spec Sections

- §2.1 — Data model (Author, Series, Work, Edition, Copy, Note, ReadThrough, PageLog, Loan)
- §2.2.1 — `reading_status` derivation (reading → paused → finished → dnf → unread)
- §2.3 — Source of truth (frontmatter canonical, body auto-generated)
- §3.0 — Slug generation algorithm
- §4.13 — Entity deletion rules (orphan protection, cascade)
- §7 — Technical architecture (resolved stack, build approach, file system index, conflict resolution, body regeneration)
- §10 — 44 resolved decisions (read these before making design choices)

## Working with OpenSpec

Implementation follows `BUILD_PLAN.md`. Each step (S1–S33) maps to one OpenSpec artifact. Before starting a step, read its prerequisites in the dependency graph.

**Two specs, different roles:** `spec.md` is the original project specification — the full design, written before any code. OpenSpec maintains its own spec (in `openspec/`) that evolves as artifacts are completed and archived. Over time, the OpenSpec spec becomes the living source of truth as implementation details are discovered. `spec.md` is your starting point for intent and design decisions; the OpenSpec spec reflects what's actually been built. When they differ, the OpenSpec spec is current.

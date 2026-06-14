# Book Diary

A personal, data-rich book diary that treats each physical copy as a distinct entity. Your data lives in plain markdown files with YAML frontmatter — fully navigable in Obsidian. The web app provides barcode scanning, ISBN lookup, cover art, reading stats, and a searchable cover grid.

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind + shadcn/ui
- **Backend:** Node.js + Express + TypeScript
- **Data:** Markdown files with YAML frontmatter on disk (no database)

## Quick Start

```bash
npm install
npm run dev
```

Opens the web app on `localhost:5173`. Your library lives in `~/book-tracker-data/`.

## Documentation

- `spec.md` — Full specification (data model, features, architecture, 44 resolved decisions)
- `intent.md` — Original confirmed intent from project inception
- `BUILD_PLAN.md` — 33-step implementation sequence with dependency graph

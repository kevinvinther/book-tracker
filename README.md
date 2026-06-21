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

Opens the web app on `localhost:5173`.

## Configuration

The library data directory is controlled by the `BOOKTRACKER_LIBRARY_PATH` environment variable. Defaults to `./data/` (alongside the project).

```bash
# .env (copy from .env.example)
BOOKTRACKER_LIBRARY_PATH=./data/
```

### Docker

Docker Compose reads the same `.env` file. The default `./data/` is mounted automatically. If you change the path to something else (e.g. `~/book-tracker-data/`), add a matching volume mount to `docker-compose.yml`:

```yaml
volumes:
  - ~/book-tracker-data:/root/book-tracker-data  # matches ~ expansion in container
```

Then `docker compose up --build`.


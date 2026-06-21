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

## Production deployment

The development Compose stack (`npm run dev` under file watch, mounted source, Vite dev server) is for local work. For a real, always-on deployment, use the production stack: a single image where the Express server serves both the API and the built single-page app on one port (`3001`).

### Running the production stack

1. Put the library directory where you want it on the host and point `BOOKTRACKER_LIBRARY_PATH` at the in-container mount path. The provided `docker-compose.prod.yml` mounts `~/book-tracker-data/` to `/book-tracker-data`, so set in `.env`:

   ```bash
   BOOKTRACKER_LIBRARY_PATH=/book-tracker-data/
   ```

   To use a different host directory, edit the left side of the volume mount in `docker-compose.prod.yml` and keep the right side in sync with `BOOKTRACKER_LIBRARY_PATH`.

2. Build and start:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   This builds the production image (client `vite build` + server `tsc`, production dependencies only), runs it with `NODE_ENV=production`, restarts it automatically (`restart: unless-stopped`), and reports container health via a `/api/health` check. The app is served at `http://localhost:3001`.

The development `docker compose up --build` workflow is unchanged and reads the same data directory, so you can fall back to it at any time.

### Backups

The entire library is the mounted data directory — plain markdown files and image attachments, no database. Back it up by backing up that directory with any standard tool (`git`, `rsync`, filesystem/volume snapshots). Restoring is just putting the directory back and pointing the mount at it.

### HTTPS from a phone (Tailscale)

The app serves plain HTTP. To reach it securely from a phone — required because the camera-based barcode scanner only runs in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) — put HTTPS in front with [`tailscale serve`](https://tailscale.com/kb/1242/tailscale-serve), which provisions and renews a valid certificate for you:

```bash
tailscale serve --bg 3001
```

This exposes the container's port `3001` over HTTPS on your tailnet. Open the resulting `https://<machine>.<tailnet>.ts.net` URL on the phone and the barcode scanner works in the secure context. No certificate management is needed in the app itself.

## Credits

The book icon (favicon) is from [Twemoji](https://github.com/twitter/twemoji) by Twitter, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).


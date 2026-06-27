import "dotenv/config";
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { extname, dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { readConfig, ensureLibraryDirectories } from "./config.js";
import { resolveLibraryPath } from "./lib/io.js";
import { Index } from "./lib/index.js";
import { seedGenresYaml } from "./lib/genres.js";
import { createWebSocketServer, broadcast } from "./lib/websocketServer.js";
import { startWatcher } from "./lib/fileWatcher.js";
import { createWorksRouter } from "./routes/works.js";
import { createAuthorsRouter } from "./routes/authors.js";
import { createEditionsRouter } from "./routes/editions.js";
import { createCopiesRouter } from "./routes/copies.js";
import { createSeriesRouter } from "./routes/series.js";
import { createQuickAddRouter } from "./routes/quick-add.js";
import { createLookupRouter } from "./routes/lookup.js";
import { downloadCover } from "./lib/lookup.js";
import { createNotesRouter } from "./routes/notes.js";
import { createSearchRouter } from "./routes/search.js";
import { createStatsRouter } from "./routes/stats.js";
import { createGenresRouter } from "./routes/genres.js";
import { createDashboardRouter } from "./routes/dashboard.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  const start = Date.now();
  next();
  const ms = Date.now() - start;
  if (req.path.startsWith("/api/")) {
    console.log(`[req] ${req.method} ${req.path} ${ms}ms`);
  }
});

const config = readConfig();
ensureLibraryDirectories(config.library_path);

const index = new Index(config.library_path);
index.load();
seedGenresYaml(index, config.library_path);
app.locals.index = index;

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/config", (_req, res) => {
  res.json(readConfig());
});

app.use("/api/works", createWorksRouter(index, config.library_path));
app.use("/api/authors", createAuthorsRouter(index, config.library_path));
app.use("/api/editions", createEditionsRouter(index, config.library_path));
app.use("/api/copies", createCopiesRouter(index, config.library_path));
app.use("/api/series", createSeriesRouter(index, config.library_path));
app.use("/api/quick-add", createQuickAddRouter(index, config.library_path));
app.use("/api/lookup", createLookupRouter(config.library_path));
app.use("/api/notes", createNotesRouter(index, config.library_path));
app.use("/api/search", createSearchRouter(index));
app.use("/api/stats", createStatsRouter(index, config.library_path));
app.use("/api/genres", createGenresRouter(index, config.library_path));
app.use("/api/dashboard", createDashboardRouter(index, config.library_path));

// File upload for cover images
const upload = multer({
  storage: multer.diskStorage({
    destination: resolveLibraryPath("attachments", config.library_path),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

app.post("/api/attachments/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    res.json({ filename: req.file.filename });
  });

  // Download a remote image (e.g. a cover chosen during enrich) into attachments/.
  app.post("/api/attachments/download", async (req, res) => {
    const url = req.body?.url;
    if (!url || typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "url is required" });
      return;
    }
    const filename = await downloadCover(url.trim(), config.library_path);
    if (!filename) {
      res.status(502).json({ error: "Failed to download image" });
      return;
    }
    res.json({ filename });
  });

  // Multer error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err && (err.message?.includes("Only image files") || err.code === "LIMIT_FILE_SIZE")) {
      res.status(400).json({ error: err.message || err.code });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  });

  app.use(
  "/api/attachments",
  express.static(resolveLibraryPath("attachments", config.library_path), { maxAge: "1d" }),
);
app.use("/api/attachments", (_req, res) => {
  res.status(404).json({ error: "Attachment not found" });
});

// Any unmatched /api route returns a JSON 404, never the SPA shell.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Serve the built client (static assets + SPA history fallback) from the same
// origin as the API. Registered after every /api router so it can never shadow
// an API route. The directory only exists in the production image; in local
// dev the Vite dev server handles the client, so this block is skipped.
const __dirname = dirname(fileURLToPath(import.meta.url));
const clientDistPath = process.env.CLIENT_DIST_PATH || resolve(__dirname, "../public");
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, { maxAge: "1d" }));
  // History-mode fallback: serve index.html for non-/api, non-asset GETs so
  // client-side routes resolve on direct navigation and refresh.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(join(clientDistPath, "index.html"));
  });
} else {
  console.warn(`Client build not found at ${clientDistPath}; SPA serving disabled.`);
}

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

const wss = createWebSocketServer(server);

const watcher = startWatcher(config.library_path, index, broadcast);

// Graceful shutdown: close the HTTP server, WebSocket server, and file watcher,
// then exit. A bounded timeout force-exits if any close hangs so container
// stops never block indefinitely.
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out; forcing exit.");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    await Promise.all([
      new Promise<void>((res) => server.close(() => res())),
      new Promise<void>((res) => wss.close(() => res())),
      watcher.close(),
    ]);
    console.log("Shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

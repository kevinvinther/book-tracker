import "dotenv/config";
import express from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { extname } from "path";
import { readConfig, ensureLibraryDirectories } from "./config.js";
import { resolveLibraryPath } from "./lib/io.js";
import { Index } from "./lib/index.js";
import { createWorksRouter } from "./routes/works.js";
import { createAuthorsRouter } from "./routes/authors.js";
import { createEditionsRouter } from "./routes/editions.js";
import { createCopiesRouter } from "./routes/copies.js";
import { createSeriesRouter } from "./routes/series.js";
import { createQuickAddRouter } from "./routes/quick-add.js";
import { createLookupRouter } from "./routes/lookup.js";

const app = express();
const PORT = 3001;

app.use(express.json());

const config = readConfig();
ensureLibraryDirectories(config.library_path);

const index = new Index(config.library_path);
index.load();
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

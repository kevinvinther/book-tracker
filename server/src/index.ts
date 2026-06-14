import "dotenv/config";
import express from "express";
import { readConfig, ensureLibraryDirectories } from "./config.js";
import { Index } from "./lib/index.js";
import { createWorksRouter } from "./routes/works.js";
import { createAuthorsRouter } from "./routes/authors.js";

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

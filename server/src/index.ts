import express from "express";
import { readConfig, writeConfig, ensureLibraryDirectories } from "./config.js";

const app = express();
const PORT = 3001;

app.use(express.json());

const config = readConfig();
ensureLibraryDirectories(config.library_path);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/config", (_req, res) => {
  res.json(readConfig());
});

app.patch("/api/config", (req, res) => {
  const { library_path } = req.body;
  if (!library_path || typeof library_path !== "string" || !library_path.trim()) {
    res.status(400).json({ error: "library_path is required" });
    return;
  }
  const updated = { library_path: library_path.trim() };
  writeConfig(updated);
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

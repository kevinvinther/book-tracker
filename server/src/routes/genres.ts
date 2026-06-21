import { Router } from "express";
import type { Index } from "../lib/index.js";
import { normalizeGenre, readGenresYaml, writeGenresYaml, loadAllGenres } from "../lib/genres.js";

export function createGenresRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const genres = loadAllGenres(index, libraryPath);
    res.json(genres);
  });

  router.patch("/", (req, res) => {
    const { genres } = req.body;

    if (genres === undefined || genres === null) {
      res.status(400).json({ error: "genres field is required" });
      return;
    }

    if (!Array.isArray(genres)) {
      res.status(400).json({ error: "genres must be an array of strings" });
      return;
    }

    const normalized = Array.from(
      new Set(
        genres
          .filter((g): g is string => typeof g === "string" && g.trim().length > 0)
          .map((g) => normalizeGenre(g)),
      ),
    ).sort();

    writeGenresYaml(libraryPath, normalized);
    res.json(normalized);
  });

  return router;
}

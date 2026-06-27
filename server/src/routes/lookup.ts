import { Router } from "express";
import { lookupISBN, lookupAllSources, ALL_SOURCES, DEFAULT_SOURCES, SourceId } from "../lib/lookup.js";

export function createLookupRouter(libraryPath: string): Router {
  const router = Router();

  router.get("/all", async (req, res) => {
    const isbn = req.query.isbn;
    const nocache = req.query.nocache === "1" || req.query.nocache === "true";

    if (!isbn || typeof isbn !== "string" || isbn.trim() === "") {
      res.status(400).json({ error: "ISBN parameter is required" });
      return;
    }

    const sourcesParam = typeof req.query.sources === "string" ? req.query.sources : "";
    const requested = sourcesParam
      ? sourcesParam.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_SOURCES;
    const sources = requested.filter((s): s is SourceId => (ALL_SOURCES as string[]).includes(s));

    const title = typeof req.query.title === "string" ? req.query.title.trim() : undefined;
    const author = typeof req.query.author === "string" ? req.query.author.trim() : undefined;

    try {
      const { results, errors } = await lookupAllSources(
        { isbn: isbn.trim(), title: title || undefined, author: author || undefined },
        sources,
        libraryPath,
        nocache,
      );
      res.json({ results, errors });
    } catch (err) {
      console.error("[lookup] Error during multi-source lookup:", err);
      res.status(500).json({ error: "Lookup failed" });
    }
  });

  router.get("/", async (req, res) => {
    const isbn = req.query.isbn;
    const nocache = req.query.nocache === "1" || req.query.nocache === "true";

    if (!isbn || typeof isbn !== "string" || isbn.trim() === "") {
      res.status(400).json({ error: "ISBN parameter is required" });
      return;
    }

    try {
      const result = await lookupISBN(isbn.trim(), libraryPath, nocache);

      if (!result) {
        res.status(404).json({ error: "Couldn't find this ISBN" });
        return;
      }

      res.json(result);
    } catch (err) {
      console.error("[lookup] Error during ISBN lookup:", err);
      res.status(500).json({ error: "Lookup failed" });
    }
  });

  return router;
}

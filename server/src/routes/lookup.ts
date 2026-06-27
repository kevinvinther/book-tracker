import { Router } from "express";
import { lookupISBN, lookupAllSources, ALL_SOURCES, SourceId } from "../lib/lookup.js";

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
      : ALL_SOURCES;
    const sources = requested.filter((s): s is SourceId => (ALL_SOURCES as string[]).includes(s));

    try {
      const results = await lookupAllSources(isbn.trim(), sources, libraryPath, nocache);
      res.json({ results });
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

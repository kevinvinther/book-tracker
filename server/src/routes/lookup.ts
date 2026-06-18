import { Router } from "express";
import { lookupISBN } from "../lib/lookup.js";

export function createLookupRouter(libraryPath: string): Router {
  const router = Router();

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

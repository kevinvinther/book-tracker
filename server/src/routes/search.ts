import { Router } from "express";
import { Index } from "../lib/index.js";

export function createSearchRouter(index: Index): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const q = req.query.q;

    if (typeof q !== "string") {
      res.status(400).json({ error: "Missing or invalid query parameter 'q'" });
      return;
    }

    const results = index.searchAll(q);
    res.json({ query: q, results });
  });

  return router;
}

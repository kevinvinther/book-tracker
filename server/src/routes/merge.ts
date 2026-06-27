import { Router } from "express";
import { Index } from "../lib/index.js";
import { Work, Edition, Copy, Note } from "../lib/types.js";
import { readFile, writeFile, deleteFile, resolveLibraryPath } from "../lib/io.js";
import { renderBody } from "../lib/render-body.js";
import { normalizeGenre } from "../lib/genres.js";

const SCALAR_FIELDS = [
  "subtitle",
  "description",
  "primary_cover",
  "series",
  "series_position",
  "original_language",
  "original_publish_year",
] as const;

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function reParentNote(
  note: Note,
  winnerSlug: string,
  index: Index,
  libraryPath: string,
): void {
  const filePath = resolveLibraryPath(`notes/${note.slug}.md`, libraryPath);
  const { frontmatter, body } = readFile(filePath);
  frontmatter.work = `[[works/${winnerSlug}]]`;
  const updated = frontmatter as unknown as Note;
  writeFile(filePath, frontmatter, body);
  index.upsert("note", updated);
}

function reParentCopy(
  copy: Copy,
  winnerSlug: string,
  index: Index,
  libraryPath: string,
): void {
  const filePath = resolveLibraryPath(`copies/${copy.slug}.md`, libraryPath);
  const { frontmatter } = readFile(filePath);
  frontmatter.work = `[[works/${winnerSlug}]]`;
  const updated = frontmatter as unknown as Copy;
  const body = renderBody(updated, index);
  writeFile(filePath, frontmatter, body);
  index.upsert("copy", updated);
}

function reParentEdition(
  edition: Edition,
  winnerSlug: string,
  index: Index,
  libraryPath: string,
): void {
  const filePath = resolveLibraryPath(`editions/${edition.slug}.md`, libraryPath);
  const { frontmatter } = readFile(filePath);
  frontmatter.work = `[[works/${winnerSlug}]]`;
  const updated = frontmatter as unknown as Edition;
  const body = renderBody(updated, index);
  writeFile(filePath, frontmatter, body);
  index.upsert("edition", updated);
}

function absorbMetadata(winnerFrontmatter: Record<string, unknown>, loser: Work): void {
  const winnerAuthors: string[] = Array.isArray(winnerFrontmatter.authors)
    ? winnerFrontmatter.authors as string[]
    : [];
  const loserAuthors: string[] = Array.isArray(loser.authors) ? loser.authors : [];
  const unionedAuthors = dedupeStrings([...winnerAuthors, ...loserAuthors]);
  winnerFrontmatter.authors = unionedAuthors;

  const winnerGenres: string[] = Array.isArray(winnerFrontmatter.genres)
    ? winnerFrontmatter.genres as string[]
    : [];
  const loserGenres: string[] = Array.isArray(loser.genres) ? loser.genres : [];
  const unionedGenres = dedupeStrings(
    [...winnerGenres, ...loserGenres].map(normalizeGenre),
  );
  winnerFrontmatter.genres = unionedGenres.length > 0 ? unionedGenres : undefined;

  const winnerAliases: string[] = Array.isArray(winnerFrontmatter.aliases)
    ? winnerFrontmatter.aliases as string[]
    : [];
  const loserAliases: string[] = Array.isArray(loser.aliases) ? loser.aliases : [];
  const candidateAliases = [...winnerAliases, ...loserAliases, loser.title];
  const unionedAliases = dedupeStrings(candidateAliases);
  winnerFrontmatter.aliases = unionedAliases.length > 0 ? unionedAliases : undefined;

  for (const field of SCALAR_FIELDS) {
    const winnerValue = winnerFrontmatter[field];
    const hasWinnerValue = winnerValue !== undefined && winnerValue !== null && winnerValue !== "";
    if (!hasWinnerValue) {
      const loserValue = loser[field as keyof Work] as unknown;
      if (loserValue !== undefined && loserValue !== null && loserValue !== "") {
        winnerFrontmatter[field] = loserValue;
      } else {
        delete winnerFrontmatter[field];
      }
    }
  }
}

export function createMergeRouter(index: Index, libraryPath: string): Router {
  const router = Router();

  router.post("/merge", (req, res) => {
    try {
      const winnerSlug = typeof req.body.winner === "string" ? req.body.winner.trim() : "";
      const loserSlug = typeof req.body.loser === "string" ? req.body.loser.trim() : "";

      if (!winnerSlug || !loserSlug) {
        res.status(400).json({ error: "winner and loser are required" });
        return;
      }

      if (winnerSlug.toLowerCase() === loserSlug.toLowerCase()) {
        res.status(400).json({ error: "winner and loser must differ" });
        return;
      }

      const winner = index.getWork(winnerSlug);
      if (!winner) {
        res.status(404).json({ error: `winner Work not found: ${winnerSlug}` });
        return;
      }

      const loser = index.getWork(loserSlug);
      if (!loser) {
        res.status(404).json({ error: `loser Work not found: ${loserSlug}` });
        return;
      }

      const notes = index.getNotesByWork(loser.slug);
      for (const note of notes) {
        reParentNote(note, winner.slug, index, libraryPath);
      }

      const copies = index.getCopiesByWork(loser.slug);
      for (const copy of copies) {
        reParentCopy(copy, winner.slug, index, libraryPath);
      }

      const editions = index.getEditionsByWork(loser.slug);
      for (const edition of editions) {
        reParentEdition(edition, winner.slug, index, libraryPath);
      }

      const winnerFilePath = resolveLibraryPath(`works/${winner.slug}.md`, libraryPath);
      const { frontmatter: winnerFrontmatter } = readFile(winnerFilePath);
      absorbMetadata(winnerFrontmatter, loser);

      winnerFrontmatter.slug = winner.slug;
      winnerFrontmatter.type = "work";
      winnerFrontmatter._schema = 1;

      const updatedWinner = winnerFrontmatter as unknown as Work;
      const winnerBody = renderBody(updatedWinner, index);
      writeFile(winnerFilePath, winnerFrontmatter, winnerBody);
      index.upsert("work", updatedWinner);

      const loserFilePath = resolveLibraryPath(`works/${loser.slug}.md`, libraryPath);
      deleteFile(loserFilePath);
      index.remove("work", loser.slug);

      res.json(updatedWinner);
    } catch (err) {
      console.error("[merge error]", err);
      res.status(500).json({ error: "Failed to merge works. Please try again." });
    }
  });

  return router;
}

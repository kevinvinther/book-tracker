import { existsSync, readFileSync, unlinkSync, renameSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { dump, load } from "js-yaml";
import slug from "limax";
import type { Index } from "./index.js";

export function normalizeGenre(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return slug(trimmed, { separator: "-", replacement: "-" }).toLowerCase();
}

export function readGenresYaml(libraryPath: string): string[] {
  const filePath = join(libraryPath, ".booktracker", "genres.yaml");
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, "utf-8");
  const parsed = load(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((g) => (typeof g === "string" ? g.trim() : "")).filter(Boolean);
}

export function writeGenresYaml(libraryPath: string, genres: string[]): void {
  const dir = join(libraryPath, ".booktracker");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const filePath = join(dir, "genres.yaml");
  const yaml = dump(genres, { lineWidth: -1, noRefs: true });
  const tmpPath = filePath + ".tmp";
  writeFileSync(tmpPath, yaml, "utf-8");
  renameSync(tmpPath, filePath);
}

export function seedGenresYaml(index: Index, libraryPath: string): void {
  const filePath = join(libraryPath, ".booktracker", "genres.yaml");
  if (existsSync(filePath)) return;

  const genreSet = new Set<string>();
  for (const work of index.getAllWorks()) {
    if (work.genres) {
      for (const genre of work.genres) {
        const normalized = normalizeGenre(genre);
        if (normalized) genreSet.add(normalized);
      }
    }
  }

  const sorted = Array.from(genreSet).sort();
  writeGenresYaml(libraryPath, sorted);
}

export function loadAllGenres(index: Index, libraryPath: string): string[] {
  const curated = readGenresYaml(libraryPath);
  const genreSet = new Set<string>(curated);

  for (const work of index.getAllWorks()) {
    if (work.genres) {
      for (const genre of work.genres) {
        const normalized = normalizeGenre(genre);
        if (normalized) genreSet.add(normalized);
      }
    }
  }

  return Array.from(genreSet).sort();
}

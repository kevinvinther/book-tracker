import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, mkdirSync, readdirSync } from "fs";
import { dirname, join } from "path";
import matter from "gray-matter";
import { dump } from "js-yaml";
import { homedir } from "os";

function expandHome(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

function normalizeDates(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = value instanceof Date ? value.toISOString() : value;
  }
  return result;
}

export function readFile(filePath: string): { frontmatter: Record<string, unknown>; body: string } {
  const resolved = expandHome(filePath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(readFileSync(resolved, "utf-8"));
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("File not found:")) {
      throw err;
    }
    throw new Error(`Failed to parse YAML frontmatter in ${resolved}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    frontmatter: normalizeDates(parsed.data as Record<string, unknown>),
    body: parsed.content,
  };
}

export function writeFile(filePath: string, frontmatter: Record<string, unknown>, body: string): void {
  const resolved = expandHome(filePath);
  const parentDir = dirname(resolved);

  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  const yaml = dump(frontmatter, { lineWidth: -1, noRefs: true });
  const content = `---\n${yaml}---\n${body}`;
  const tmpPath = resolved + ".tmp";

  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, resolved);
}

export function deleteFile(filePath: string): void {
  const resolved = expandHome(filePath);
  if (existsSync(resolved)) {
    unlinkSync(resolved);
  }
}

export function listFiles(dirPath: string): string[] {
  const resolved = expandHome(dirPath);
  if (!existsSync(resolved)) {
    return [];
  }

  return readdirSync(resolved)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.slice(0, -3)); // remove .md extension
}

export function resolveLibraryPath(relativePath: string, libraryPath: string): string {
  return join(expandHome(libraryPath), relativePath);
}

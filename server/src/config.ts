import { existsSync, mkdirSync } from "fs";
import { resolve, join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../..");

export interface AppConfig {
  library_path: string;
}

export function expandHome(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  if (path.startsWith("./") || path.startsWith("../")) {
    return resolve(PROJECT_ROOT, path);
  }
  return path;
}

export function readConfig(): AppConfig {
  return {
    library_path: expandHome(process.env.BOOKTRACKER_LIBRARY_PATH || "./data/"),
  };
}

const LIBRARY_DIRECTORIES = [
  "authors",
  "series",
  "works",
  "editions",
  "copies",
  "notes",
  "attachments",
  ".booktracker",
  ".booktracker/cache",
];

export function ensureLibraryDirectories(libraryPath: string): void {
  const resolved = expandHome(libraryPath);
  for (const dir of LIBRARY_DIRECTORIES) {
    const fullPath = join(resolved, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }
  }
}

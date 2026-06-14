import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve, join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { load, dump } from "js-yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "../..");
const CONFIG_DIR = join(PROJECT_ROOT, ".booktracker");
const CONFIG_PATH = join(CONFIG_DIR, "config.yaml");

const DEFAULT_CONFIG: AppConfig = {
  library_path: "~/book-tracker-data/",
};

export interface AppConfig {
  library_path: string;
}

function expandHome(path: string): string {
  if (path.startsWith("~")) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

export function readConfig(): AppConfig {
  if (!existsSync(CONFIG_PATH)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    writeConfig(DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }

  const raw = readFileSync(CONFIG_PATH, "utf-8");
  const config = load(raw) as AppConfig;
  return {
    library_path: config.library_path || DEFAULT_CONFIG.library_path,
  };
}

export function writeConfig(config: AppConfig): void {
  const yaml = dump(config, { lineWidth: -1 });
  const tmpPath = CONFIG_PATH + ".tmp";

  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(tmpPath, yaml, "utf-8");
  renameSync(tmpPath, CONFIG_PATH);
}

const LIBRARY_DIRECTORIES = [
  "authors",
  "series",
  "works",
  "editions",
  "copies",
  "notes",
  "attachments",
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

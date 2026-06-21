import chokidar, { FSWatcher } from "chokidar";
import { Index } from "./index.js";
import { EntityType } from "./types.js";

type ChangeEvent = "upsert" | "remove";
type ChangeCallback = (type: EntityType, slug: string, event: ChangeEvent) => void;

const ENTITY_DIRECTORIES: Record<string, EntityType> = {
  authors: "author",
  series: "series",
  works: "work",
  editions: "edition",
  copies: "copy",
  notes: "note",
};

export function startWatcher(
  libraryPath: string,
  index: Index,
  onChange: ChangeCallback,
): FSWatcher {
  const pendingHandlers = new Map<string, ReturnType<typeof setTimeout>>();

  function flushChange(type: EntityType, slug: string): void {
    index.handleFileChange(type, slug);
    onChange(type, slug, "upsert");
  }

  function handlePath(absPath: string, event: ChangeEvent): void {
    if (absPath.endsWith(".tmp")) return;

    // Resolve entity type and slug from the file path
    const relativePath = absPath.slice(libraryPath.length + 1); // strip libraryPath + '/'
    const match = relativePath.match(/^([^/]+)\/(.+)\.md$/);
    if (!match) return;

    const dir = match[1];
    const slug = match[2];
    const type = ENTITY_DIRECTORIES[dir];
    if (!type) return;

    if (event === "remove") {
      index.remove(type, slug);
      onChange(type, slug, "remove");
      return;
    }

    // Debounce non-remove events per slug
    const key = `${type}:${slug}`;
    const existing = pendingHandlers.get(key);
    if (existing) clearTimeout(existing);

    pendingHandlers.set(
      key,
      setTimeout(() => {
        pendingHandlers.delete(key);
        flushChange(type, slug);
      }, 300),
    );
  }

  const watcher = chokidar.watch(libraryPath, {
    ignoreInitial: true,
    depth: 99,
  });

  watcher.on("add", (path: string) => handlePath(path, "upsert"));
  watcher.on("change", (path: string) => handlePath(path, "upsert"));
  watcher.on("unlink", (path: string) => handlePath(path, "remove"));

  return watcher;
}

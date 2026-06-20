import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import os from "os";
import { dump } from "js-yaml";
import { startWatcher } from "./fileWatcher.js";
import { Index } from "./index.js";
import type { EntityType } from "./types.js";

const tmpRoot = join(os.tmpdir(), `bt-fw-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "series", "works", "editions", "copies", "notes"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(tmpRoot)) {
    rmSync(tmpRoot, { recursive: true });
  }
});

function makeFile(dir: string, slug: string, frontmatter: Record<string, unknown>, body?: string) {
  const yaml = dump(frontmatter, { lineWidth: -1, noRefs: true });
  const content = `---\n${yaml}---\n${body || ""}`;
  writeFileSync(join(tmpRoot, dir, `${slug}.md`), content, "utf-8");
}

async function waitForReady(watcher: ReturnType<typeof startWatcher>): Promise<void> {
  return new Promise((resolve) => {
    watcher.on("ready", resolve);
  });
}

async function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("startWatcher", () => {
  it("detects new .md files and updates the index", async () => {
    const index = new Index(tmpRoot);
    index.load();

    const calls: { type: EntityType; slug: string; event: string }[] = [];
    const watcher = startWatcher(tmpRoot, index, (type, slug, event) => {
      calls.push({ type, slug, event });
    });

    await waitForReady(watcher);

    makeFile("works", "new-work", {
      type: "work", slug: "new-work", title: "New Work",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });

    await wait(500);

    expect(index.getWork("new-work")).toBeDefined();
    expect(index.getWork("new-work")?.title).toBe("New Work");
    expect(calls.some((c) => c.type === "work" && c.slug === "new-work" && c.event === "upsert")).toBe(true);

    await watcher.close();
  });

  it("detects file modifications", async () => {
    makeFile("works", "modify-test", {
      type: "work", slug: "modify-test", title: "Before",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });

    const index = new Index(tmpRoot);
    index.load();

    const calls: { type: EntityType; slug: string; event: string }[] = [];
    const watcher = startWatcher(tmpRoot, index, (type, slug, event) => {
      calls.push({ type, slug, event });
    });

    await waitForReady(watcher);

    makeFile("works", "modify-test", {
      type: "work", slug: "modify-test", title: "After",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });

    await wait(500);

    expect(index.getWork("modify-test")?.title).toBe("After");
    expect(calls.some((c) => c.type === "work" && c.slug === "modify-test" && c.event === "upsert")).toBe(true);

    await watcher.close();
  });

  it("detects file deletions", async () => {
    makeFile("works", "delete-test", {
      type: "work", slug: "delete-test", title: "To Delete",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });

    const index = new Index(tmpRoot);
    index.load();

    const calls: { type: EntityType; slug: string; event: string }[] = [];
    const watcher = startWatcher(tmpRoot, index, (type, slug, event) => {
      calls.push({ type, slug, event });
    });

    await waitForReady(watcher);

    rmSync(join(tmpRoot, "works/delete-test.md"));

    await wait(500);

    expect(index.getWork("delete-test")).toBeUndefined();
    expect(calls.some((c) => c.type === "work" && c.slug === "delete-test" && c.event === "remove")).toBe(true);

    await watcher.close();
  });

  it("ignores .tmp files", async () => {
    const index = new Index(tmpRoot);
    index.load();

    const calls: { type: EntityType; slug: string; event: string }[] = [];
    const watcher = startWatcher(tmpRoot, index, (type, slug, event) => {
      calls.push({ type, slug, event });
    });

    await waitForReady(watcher);

    writeFileSync(join(tmpRoot, "works/temp-test.tmp"), "test");

    await wait(500);

    expect(calls.length).toBe(0);

    await watcher.close();
  });

  it("debounces rapid file events", async () => {
    makeFile("works", "debounce-test", {
      type: "work", slug: "debounce-test", title: "V1",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });

    const index = new Index(tmpRoot);
    index.load();

    let callCount = 0;
    const watcher = startWatcher(tmpRoot, index, () => {
      callCount++;
    });

    await waitForReady(watcher);

    makeFile("works", "debounce-test", {
      type: "work", slug: "debounce-test", title: "V2",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });
    makeFile("works", "debounce-test", {
      type: "work", slug: "debounce-test", title: "V3",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });
    makeFile("works", "debounce-test", {
      type: "work", slug: "debounce-test", title: "V4",
      authors: [], created_at: "2025-01-01T00:00:00", _schema: 1,
    });

    await wait(500);

    expect(callCount).toBe(1);
    expect(index.getWork("debounce-test")?.title).toBe("V4");

    await watcher.close();
  });
});

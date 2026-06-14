import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-io-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(tmpRoot, { recursive: true });
});

afterAll(() => {
  if (existsSync(tmpRoot)) {
    rmSync(tmpRoot, { recursive: true });
  }
});

import { readFile, writeFile, deleteFile, listFiles, resolveLibraryPath } from "./io.js";

describe("readFile", () => {
  it("reads valid YAML frontmatter and body", () => {
    const path = join(tmpRoot, "test.md");
    writeFileSync(path, '---\ntitle: Dune\nauthor: Frank Herbert\n---\n# Dune\n\nContent', "utf-8");
    const result = readFile(path);
    expect(result.frontmatter).toEqual({ title: "Dune", author: "Frank Herbert" });
    expect(result.body).toBe("# Dune\n\nContent");
  });

  it("reads file with only frontmatter", () => {
    const path = join(tmpRoot, "no-body.md");
    writeFileSync(path, '---\ntitle: Dune\n---', "utf-8");
    const result = readFile(path);
    expect(result.frontmatter).toEqual({ title: "Dune" });
    expect(result.body).toBe("");
  });

  it("throws on missing file", () => {
    expect(() => readFile(join(tmpRoot, "nonexistent.md"))).toThrow("File not found");
  });

  it("throws on invalid YAML", () => {
    const path = join(tmpRoot, "invalid.md");
    writeFileSync(path, '---\n[bad yaml\n---', "utf-8");
    expect(() => readFile(path)).toThrow("Failed to parse YAML frontmatter");
  });

  it("returns empty frontmatter for file with no frontmatter block", () => {
    const path = join(tmpRoot, "plain.md");
    writeFileSync(path, "# Just markdown\n\nNo frontmatter here", "utf-8");
    const result = readFile(path);
    expect(Object.keys(result.frontmatter).length).toBe(0);
    expect(result.body).toContain("# Just markdown");
  });
});

describe("writeFile", () => {
  it("creates new file with correct content", () => {
    const path = join(tmpRoot, "new.md");
    writeFile(path, { title: "Dune", slug: "dune" }, "# Dune\n\nContent");
    expect(existsSync(path)).toBe(true);
    const raw = readFileSync(path, "utf-8");
    expect(raw).toContain("title: Dune");
    expect(raw).toContain("# Dune");
  });

  it("creates parent directories if needed", () => {
    const path = join(tmpRoot, "deep", "nested", "file.md");
    writeFile(path, { title: "Test" }, "body");
    expect(existsSync(path)).toBe(true);
  });

  it("overwrites existing file atomically", () => {
    const path = join(tmpRoot, "overwrite.md");
    writeFile(path, { version: 1 }, "old");
    writeFile(path, { version: 2 }, "new");
    const result = readFile(path);
    expect(result.frontmatter).toEqual({ version: 2 });
    expect(result.body).toBe("new");
    expect(existsSync(path + ".tmp")).toBe(false);
  });

  it("roundtrip preserves data", () => {
    const path = join(tmpRoot, "roundtrip.md");
    const data = { title: "Dune", slug: "dune", count: 42 };
    writeFile(path, data, "# Body\n\nMore body");
    const result = readFile(path);
    expect(result.frontmatter).toEqual(data);
    expect(result.body).toBe("# Body\n\nMore body");
  });
});

describe("deleteFile", () => {
  it("removes existing file", () => {
    const path = join(tmpRoot, "to-delete.md");
    writeFileSync(path, "content", "utf-8");
    deleteFile(path);
    expect(existsSync(path)).toBe(false);
  });

  it("does not throw on non-existent file", () => {
    expect(() => deleteFile(join(tmpRoot, "never-existed.md"))).not.toThrow();
  });
});

describe("listFiles", () => {
  it("returns .md filenames without extensions", () => {
    const subDir = join(tmpRoot, "list-test");
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, "a.md"), "", "utf-8");
    writeFileSync(join(subDir, "b.md"), "", "utf-8");
    writeFileSync(join(subDir, "c.txt"), "", "utf-8");

    const files = listFiles(subDir);
    expect(files).toContain("a");
    expect(files).toContain("b");
    expect(files).not.toContain("c");
    expect(files).not.toContain("c.txt");
  });

  it("returns empty array for non-existent directory", () => {
    const files = listFiles(join(tmpRoot, "nope"));
    expect(files).toEqual([]);
  });
});

describe("resolveLibraryPath", () => {
  it("joins relative path with expanded library path", () => {
    const result = resolveLibraryPath("works/dune.md", "~/book-tracker-data/");
    expect(result).toBe(join(os.homedir(), "book-tracker-data", "works", "dune.md"));
  });

  it("handles absolute library path", () => {
    const result = resolveLibraryPath("works/dune.md", "/opt/library");
    expect(result).toBe("/opt/library/works/dune.md");
  });
});

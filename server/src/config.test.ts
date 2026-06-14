import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import os from "os";

const tmpRoot = join(os.tmpdir(), `bt-config-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(tmpRoot, { recursive: true });
});

afterAll(() => {
  if (existsSync(tmpRoot)) {
    rmSync(tmpRoot, { recursive: true });
  }
});

import { ensureLibraryDirectories } from "./config.js";

describe("expandHome", () => {
  it("resolves ~ to home directory", async () => {
    const { expandHome } = await import("./config.js");
    const result = expandHome("~/my-books");
    expect(result).toBe(join(os.homedir(), "my-books"));
  });

  it("does not modify absolute paths", async () => {
    const { expandHome } = await import("./config.js");
    const result = expandHome("/tmp/absolute-path");
    expect(result).toBe("/tmp/absolute-path");
  });

  it("does not modify relative paths", async () => {
    const { expandHome } = await import("./config.js");
    const result = expandHome("relative/path");
    expect(result).toBe("relative/path");
  });
});

describe("ensureLibraryDirectories", () => {
  it("creates all library subdirectories", () => {
    const libPath = join(tmpRoot, "library");

    ensureLibraryDirectories(libPath);

    const expected = [
      "authors", "series", "works", "editions", "copies",
      "notes", "attachments", ".booktracker/cache",
    ];
    for (const dir of expected) {
      expect(existsSync(join(libPath, dir))).toBe(true);
    }
  });

  it("does nothing when directories already exist", () => {
    const libPath = join(tmpRoot, "library");
    ensureLibraryDirectories(libPath); // second call — no error
  });
});

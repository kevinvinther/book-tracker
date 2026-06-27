import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import { Server } from "http";
import { existsSync, mkdirSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import os from "os";
import matter from "gray-matter";

const tmpRoot = join(os.tmpdir(), `bt-merge-test-${Date.now()}`);

let server: Server;
let port: number;

function readFrontmatter(relPath: string): Record<string, unknown> {
  const raw = readFileSync(join(tmpRoot, relPath), "utf-8");
  return matter(raw).data as Record<string, unknown>;
}

beforeAll(async () => {
  mkdirSync(tmpRoot, { recursive: true });
  for (const dir of ["authors", "works", "editions", "copies", "notes", "attachments", ".booktracker/cache"]) {
    mkdirSync(join(tmpRoot, dir), { recursive: true });
  }

  const { writeFile: writeEntity } = await import("../lib/io.js");

  writeEntity(join(tmpRoot, "authors/herbert.md"), {
    type: "author", slug: "herbert", name: "Frank Herbert",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Frank Herbert");

  writeEntity(join(tmpRoot, "authors/second.md"), {
    type: "author", slug: "second", name: "Second Author",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Second Author");

  writeEntity(join(tmpRoot, "works/the-hobbit.md"), {
    type: "work", slug: "the-hobbit", title: "The Hobbit",
    authors: ["[[authors/herbert]]"], genres: ["fantasy"],
    description: "Bilbo's adventure",
    created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# The Hobbit");

  writeEntity(join(tmpRoot, "works/the-hobbit-dup.md"), {
    type: "work", slug: "the-hobbit-dup", title: "The Hobbit: An Unexpected Journey",
    authors: ["[[authors/herbert]]", "[[authors/second]]"], genres: ["Science Fiction", "fantasy"],
    aliases: ["There and Back Again"],
    primary_cover: "hobbit.png",
    created_at: "2024-01-02T00:00:00.000Z", _schema: 1,
  }, "# The Hobbit Dup");

  writeEntity(join(tmpRoot, "editions/hobbit-hc.md"), {
    type: "edition", slug: "hobbit-hc",
    work: "[[works/the-hobbit-dup]]", publisher: "Houghton",
    created_at: "2024-01-02T00:00:00.000Z", _schema: 1,
  }, "# Hobbit HC");

  writeEntity(join(tmpRoot, "copies/hobbit-copy-1.md"), {
    type: "copy", slug: "hobbit-copy-1",
    work: "[[works/the-hobbit-dup]]", edition: "[[editions/hobbit-hc]]",
    status: "owned", condition: "good",
    loans: [{ borrower_name: "Sarah", lent_date: "2024-02-01T00:00:00.000Z" }],
    created_at: "2024-01-02T00:00:00.000Z", _schema: 1,
  }, "# Hobbit Copy 1");

  writeEntity(join(tmpRoot, "notes/2024-01-15-120000.md"), {
    type: "note", slug: "2024-01-15-120000",
    date: "2024-01-15T12:00:00.000Z", modified: "2024-01-15T12:00:00.000Z",
    work: "[[works/the-hobbit-dup]]", _schema: 1,
  }, "A note on the dup work");

  writeEntity(join(tmpRoot, "notes/2024-01-20-100000.md"), {
    type: "note", slug: "2024-01-20-100000",
    date: "2024-01-20T10:00:00.000Z", modified: "2024-01-20T10:00:00.000Z",
    work: "[[works/the-hobbit]]", _schema: 1,
  }, "A note on the winner");

  writeEntity(join(tmpRoot, "works/orphan-winner.md"), {
    type: "work", slug: "orphan-winner", title: "Orphan Winner",
    authors: [], created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
  }, "# Orphan Winner");

  writeEntity(join(tmpRoot, "works/orphan-loser.md"), {
    type: "work", slug: "orphan-loser", title: "Orphan Loser",
    authors: [], description: "Adopted description",
    created_at: "2024-01-02T00:00:00.000Z", _schema: 1,
  }, "# Orphan Loser");

  const app = express();
  app.use(express.json());

  const { Index } = await import("../lib/index.js");
  const index = new Index(tmpRoot);
  index.load();
  app.locals.index = index;

  const { createMergeRouter } = await import("./merge.js");
  const { createWorksRouter } = await import("./works.js");
  app.use("/api/works", createMergeRouter(index, tmpRoot));
  app.use("/api/works", createWorksRouter(index, tmpRoot));

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server!.address();
      if (addr && typeof addr === "object") port = addr.port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((r) => server?.close(() => r()));
  if (existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
});

function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`http://localhost:${port}${path}`, init);
}

function jsonBody(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

describe("POST /api/works/merge — happy path", () => {
  it("merges loser into winner, re-parents dependents, absorbs metadata, deletes loser", async () => {
    const res = await api("/api/works/merge", jsonBody({
      winner: "the-hobbit",
      loser: "the-hobbit-dup",
    }));
    expect(res.status).toBe(200);

    const winner = await res.json();
    expect(winner.slug).toBe("the-hobbit");
    expect(winner.title).toBe("The Hobbit");
    expect(winner.authors).toEqual(["[[authors/herbert]]", "[[authors/second]]"]);
    expect(winner.genres).toEqual(["fantasy", "science-fiction"]);
    expect(winner.description).toBe("Bilbo's adventure");
    expect(winner.primary_cover).toBe("hobbit.png");
    expect(winner.aliases).toContain("The Hobbit: An Unexpected Journey");
    expect(winner.aliases).toContain("There and Back Again");

    expect(existsSync(join(tmpRoot, "works/the-hobbit-dup.md"))).toBe(false);
    expect(existsSync(join(tmpRoot, "works/the-hobbit.md"))).toBe(true);

    const editionFm = readFrontmatter("editions/hobbit-hc.md");
    expect(editionFm.work).toBe("[[works/the-hobbit]]");
    expect(editionFm.slug).toBe("hobbit-hc");

    const copyFm = readFrontmatter("copies/hobbit-copy-1.md");
    expect(copyFm.work).toBe("[[works/the-hobbit]]");
    expect(copyFm.slug).toBe("hobbit-copy-1");
    expect(copyFm.edition).toBe("[[editions/hobbit-hc]]");
    expect(copyFm.loans).toEqual([{ borrower_name: "Sarah", lent_date: "2024-02-01T00:00:00.000Z" }]);

    const noteFm = readFrontmatter("notes/2024-01-15-120000.md");
    expect(noteFm.work).toBe("[[works/the-hobbit]]");
    expect(noteFm.slug).toBe("2024-01-15-120000");

    const winnerNoteFm = readFrontmatter("notes/2024-01-20-100000.md");
    expect(winnerNoteFm.work).toBe("[[works/the-hobbit]]");
  });
});

describe("POST /api/works/merge — validation", () => {
  it("rejects self-merge with 400", async () => {
    const res = await api("/api/works/merge", jsonBody({
      winner: "the-hobbit",
      loser: "the-hobbit",
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/differ/);
  });

  it("rejects missing winner with 404", async () => {
    const res = await api("/api/works/merge", jsonBody({
      winner: "nonexistent",
      loser: "the-hobbit",
    }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/winner/);
  });

  it("rejects missing loser with 404", async () => {
    const res = await api("/api/works/merge", jsonBody({
      winner: "the-hobbit",
      loser: "nonexistent",
    }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/loser/);
  });
});

describe("POST /api/works/merge — edge cases", () => {
  it("merges loser with no dependents (metadata still absorbed, loser deleted)", async () => {
    const res = await api("/api/works/merge", jsonBody({
      winner: "orphan-winner",
      loser: "orphan-loser",
    }));
    expect(res.status).toBe(200);

    const winner = await res.json();
    expect(winner.slug).toBe("orphan-winner");
    expect(winner.description).toBe("Adopted description");
    expect(winner.aliases).toContain("Orphan Loser");
    expect(existsSync(join(tmpRoot, "works/orphan-loser.md"))).toBe(false);
  });

  it("is idempotent on retry: a second merge call after partial state is safe", async () => {
    const { Index } = await import("../lib/index.js");
    const freshRoot = join(os.tmpdir(), `bt-merge-retry-${Date.now()}`);
    for (const dir of ["authors", "works", "editions", "copies", "notes"]) {
      mkdirSync(join(freshRoot, dir), { recursive: true });
    }
    const { writeFile: writeEntity } = await import("../lib/io.js");

    writeEntity(join(freshRoot, "works/winner.md"), {
      type: "work", slug: "winner", title: "Winner",
      authors: [], created_at: "2024-01-01T00:00:00.000Z", _schema: 1,
    }, "# Winner");

    writeEntity(join(freshRoot, "works/loser.md"), {
      type: "work", slug: "loser", title: "Loser Title",
      authors: [], created_at: "2024-01-02T00:00:00.000Z", _schema: 1,
    }, "# Loser");

    writeEntity(join(freshRoot, "editions/ed-1.md"), {
      type: "edition", slug: "ed-1",
      work: "[[works/loser]]", publisher: "P",
      created_at: "2024-01-02T00:00:00.000Z", _schema: 1,
    }, "# Edition 1");

    writeEntity(join(freshRoot, "editions/ed-2.md"), {
      type: "edition", slug: "ed-2",
      work: "[[works/loser]]", publisher: "P2",
      created_at: "2024-01-02T00:00:00.000Z", _schema: 1,
    }, "# Edition 2");

    const localApp = express();
    localApp.use(express.json());
    const localIndex = new Index(freshRoot);
    localIndex.load();
    const { createMergeRouter } = await import("./merge.js");
    localApp.use("/api/works", createMergeRouter(localIndex, freshRoot));

    const localServer = localApp.listen(0);
    const localPort = (localServer.address() as { port: number }).port;

    const firstRes = await fetch(`http://localhost:${localPort}/api/works/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner: "winner", loser: "loser" }),
    });
    expect(firstRes.status).toBe(200);

    const ed1Fm = readFrontmatterAt(freshRoot, "editions/ed-1.md");
    expect(ed1Fm.work).toBe("[[works/winner]]");
    expect(existsSync(join(freshRoot, "works/loser.md"))).toBe(false);

    const secondRes = await fetch(`http://localhost:${localPort}/api/works/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winner: "winner", loser: "loser" }),
    });
    expect(secondRes.status).toBe(404);
    expect(existsSync(join(freshRoot, "works/winner.md"))).toBe(true);
    expect(ed1Fm.work).toBe("[[works/winner]]");

    await new Promise<void>((r) => localServer.close(() => r()));
    if (existsSync(freshRoot)) rmSync(freshRoot, { recursive: true, force: true });
  });
});

function readFrontmatterAt(root: string, relPath: string): Record<string, unknown> {
  const raw = readFileSync(join(root, relPath), "utf-8");
  return matter(raw).data as Record<string, unknown>;
}

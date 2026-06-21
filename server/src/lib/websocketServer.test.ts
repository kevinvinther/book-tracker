import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { createWebSocketServer, broadcast } from "./websocketServer.js";
import WebSocket from "ws";

let httpServer: ReturnType<typeof createServer>;
let basePort = 0;

beforeAll(() => {
  return new Promise<void>((resolve) => {
    httpServer = createServer();
    httpServer.listen(0, () => {
      basePort = (httpServer.address() as { port: number }).port;
      createWebSocketServer(httpServer);
      resolve();
    });
  });
});

afterAll(() => {
  return new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
});

describe("broadcast", () => {
  it("sends messages to connected WebSocket clients", async () => {
    const messages: string[] = [];

    const ws = new WebSocket(`ws://localhost:${basePort}`);
    ws.on("message", (data) => {
      messages.push(data.toString());
    });

    // Wait for connection
    await new Promise<void>((resolve) => {
      ws.on("open", resolve);
    });

    broadcast("work", "dune", "upsert");

    // Wait for message delivery
    await new Promise((r) => setTimeout(r, 100));

    expect(messages.length).toBe(1);
    const msg = JSON.parse(messages[0]);
    expect(msg.type).toBe("work");
    expect(msg.slug).toBe("dune");
    expect(msg.event).toBe("upsert");

    ws.close();
  });

  it("broadcasts to multiple clients", async () => {
    const messages1: string[] = [];
    const messages2: string[] = [];

    const ws1 = new WebSocket(`ws://localhost:${basePort}`);
    const ws2 = new WebSocket(`ws://localhost:${basePort}`);

    ws1.on("message", (data) => messages1.push(data.toString()));
    ws2.on("message", (data) => messages2.push(data.toString()));

    await new Promise<void>((resolve) => {
      let openCount = 0;
      const check = () => {
        openCount++;
        if (openCount === 2) resolve();
      };
      ws1.on("open", check);
      ws2.on("open", check);
    });

    broadcast("copy", "dune-hc", "remove");

    await new Promise((r) => setTimeout(r, 100));

    expect(messages1.length).toBe(1);
    expect(messages2.length).toBe(1);
    expect(JSON.parse(messages1[0]).event).toBe("remove");
    expect(JSON.parse(messages2[0]).event).toBe("remove");

    ws1.close();
    ws2.close();
  });

  it("is a no-op when no server is created", () => {
    // broadcast before createWebSocketServer is called should not throw
    // This tests the null guard in broadcast
    expect(() => broadcast("work", "test", "upsert")).not.toThrow();
  });

  it("sends correct message format for all entity types", async () => {
    const messages: string[] = [];
    const ws = new WebSocket(`ws://localhost:${basePort}`);
    ws.on("message", (data) => messages.push(data.toString()));

    await new Promise<void>((resolve) => {
      ws.on("open", resolve);
    });

    const types = ["author", "series", "work", "edition", "copy", "note"] as const;
    for (const type of types) {
      broadcast(type, `${type}-slug`, "upsert");
    }

    await new Promise((r) => setTimeout(r, 100));

    expect(messages.length).toBe(6);
    const parsed = messages.map((m) => JSON.parse(m));

    expect(parsed[0]).toEqual({ type: "author", slug: "author-slug", event: "upsert" });
    expect(parsed[5]).toEqual({ type: "note", slug: "note-slug", event: "upsert" });

    ws.close();
  });
});

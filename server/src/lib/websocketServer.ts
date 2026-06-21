import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { EntityType } from "./types.js";

type ChangeEvent = "upsert" | "remove";

let wss: WebSocketServer | null = null;

export function createWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    ws.on("error", () => {
      // WebSocket errors are expected on disconnect; no action needed
    });
  });

  return wss;
}

export function broadcast(type: EntityType, slug: string, event: ChangeEvent): void {
  if (!wss) return;

  const message = JSON.stringify({ type, slug, event });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

import { useEffect, useRef, useCallback } from "react";

type EntityType = "author" | "series" | "work" | "edition" | "copy" | "note";
type ChangeEvent = "upsert" | "remove";

export interface EntityChangeMessage {
  type: EntityType;
  slug: string;
  event: ChangeEvent;
}

type Subscriber = (msg: EntityChangeMessage) => void;

const subscribers = new Set<Subscriber>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;
let subscriberCount = 0;

function connect(): void {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//localhost:3001`);

  ws.onopen = () => {
    reconnectDelay = 1000;
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const msg: EntityChangeMessage = JSON.parse(event.data as string);
      subscribers.forEach((fn) => fn(msg));
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onclose = () => {
    ws = null;
    if (subscriberCount > 0) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
        connect();
      }, reconnectDelay);
    }
  };

  ws.onerror = () => {
    // onclose will fire after onerror; no explicit reconnect needed here
  };
}

function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null; // prevent reconnect
    ws.close();
    ws = null;
  }
}

export function useWebSocket(onMessage?: Subscriber): void {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    subscriberCount++;

    const handler: Subscriber = (msg) => {
      onMessageRef.current?.(msg);
    };
    subscribers.add(handler);

    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connect();
    }

    return () => {
      subscribers.delete(handler);
      subscriberCount--;
      if (subscriberCount <= 0) {
        subscriberCount = 0;
        disconnect();
      }
    };
  }, []);
}

export function useSubscribe(onMessage: Subscriber): void {
  useWebSocket(onMessage);
}

export function useRefetchOnChange(
  refetch: () => void,
  shouldRefetch: (msg: EntityChangeMessage) => boolean,
): void {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  const shouldRefetchRef = useRef(shouldRefetch);
  shouldRefetchRef.current = shouldRefetch;

  useWebSocket(
    useCallback((msg: EntityChangeMessage) => {
      if (shouldRefetchRef.current(msg)) {
        refetchRef.current();
      }
    }, []),
  );
}

/**
 * Server-Sent Events (SSE) broadcaster.
 *
 * Clients connect to GET /feed/stream (global) or GET /tokens/:mint/stream
 * (per-token). When a trade or price update fires, broadcast() pushes the
 * event to all matching clients instantly — no polling needed.
 */

import type { Response } from "express";

interface SSEClient {
  res:  Response;
  mint: string | null; // null = global subscriber
}

const clients = new Set<SSEClient>();

/** Register a response as an SSE client. Call once per GET /stream request. */
export function addSSEClient(res: Response, mint: string | null = null): void {
  const client: SSEClient = { res, mint };
  clients.add(client);
  res.on("close", () => clients.delete(client));
}

/**
 * Broadcast a named event to all connected clients.
 * If `mint` is provided, only sends to global subscribers and subscribers
 * watching that specific mint.
 */
export function broadcast(event: string, data: unknown, mint: string | null = null): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    // Send if: client is global, OR client watches this mint, OR mint not specified
    if (client.mint === null || mint === null || client.mint === mint) {
      try {
        client.res.write(payload);
      } catch {
        clients.delete(client);
      }
    }
  }
}

export function clientCount(): number {
  return clients.size;
}

/**
 * The screen's live connection (ADR-0005): a one-time ticket from the API opens the WebSocket
 * (a browser cannot send the device token as a header there); the server then says "changed"
 * after every committed change of this location, and the screen reloads its state from the API
 * (the source of truth). "hello" also reloads: whatever changed while the connection was down
 * is caught up at once. The connection comes back by itself, waiting longer each time (with a
 * little randomness, so the club's screens do not all knock at once after a restart).
 */
import { socketUrl } from "./api";

export type LiveStatus = "connecting" | "live" | "offline";
export type Ticket = { ticket: string; path: string };

export const FIRST_RETRY_MS = 1000;
export const MAX_RETRY_MS = 30_000;
export const PING_MS = 25_000;

export type LiveHandlers = {
  onChanged: () => void;
  onStatus: (status: LiveStatus) => void;
};

export class LiveLink {
  private socket: WebSocket | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ping: ReturnType<typeof setInterval> | undefined;
  private retry = FIRST_RETRY_MS;
  private closed = false;

  constructor(
    private readonly apiUrl: string,
    private readonly getTicket: () => Promise<Ticket>,
    private readonly handlers: LiveHandlers,
    private readonly makeSocket: (url: string) => WebSocket = (url) => new WebSocket(url),
    private readonly jitter: () => number = Math.random,
  ) {}

  async connect(): Promise<void> {
    if (this.closed) return;
    this.handlers.onStatus("connecting");
    let ticket: Ticket;
    try {
      ticket = await this.getTicket();
    } catch {
      this.again();
      return;
    }
    if (this.closed) return;
    let socket: WebSocket;
    try {
      socket = this.makeSocket(socketUrl(this.apiUrl, ticket.path, ticket.ticket));
    } catch {
      this.again();
      return;
    }
    this.socket = socket;
    socket.onmessage = (event: MessageEvent) => this.receive(String(event.data));
    socket.onclose = () => {
      this.socket = null;
      clearInterval(this.ping);
      this.again();
    };
    this.ping = setInterval(() => {
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: "ping" }));
    }, PING_MS);
  }

  private receive(text: string): void {
    let message: { type?: unknown };
    try {
      message = JSON.parse(text) as { type?: unknown };
    } catch {
      return;
    }
    if (message?.type === "hello") {
      this.retry = FIRST_RETRY_MS;
      this.handlers.onStatus("live");
      this.handlers.onChanged();
    } else if (message?.type === "changed") {
      this.handlers.onChanged();
    }
  }

  private again(): void {
    if (this.closed) return;
    this.handlers.onStatus("offline");
    const wait = Math.round(this.retry * (1 + 0.3 * this.jitter()));
    this.timer = setTimeout(() => void this.connect(), wait);
    this.retry = Math.min(this.retry * 2, MAX_RETRY_MS);
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.timer);
    clearInterval(this.ping);
    this.socket?.close();
  }
}

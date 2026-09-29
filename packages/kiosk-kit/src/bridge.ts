/**
 * The link to the Hardware Bridge on 127.0.0.1 (ADR-0013). The bridge tells the page which
 * device it is (and its API token), pushes each card scan signed with its own key, pushes the
 * cash machine's events (each note, signed, already on disk; faults), and carries the commands
 * the server signed. With simulator control on (development and demos only), the page can
 * simulate a scan, a note or a fault. The link reconnects by itself; the page shows a warning
 * while the bridge is missing.
 */

export type Signed = { payload: Record<string, unknown>; signature: string };

export type Hello = {
  device: string;
  public_key: string;
  device_token: string;
  api_url: string;
  simulator: boolean;
};

/** Anything the bridge pushes that is not a scan: `cash.accepted`, `cash.complete`, `fault`… */
export type BridgeEvent = { event: string } & Record<string, unknown>;

export type BridgeHandlers = {
  onScan: (signed: Signed) => void;
  onStatus: (connected: boolean) => void;
  onHello: (hello: Hello) => void;
  onEvent?: (event: BridgeEvent) => void;
};

export type Reply = { id?: number; ok: boolean; error?: string } & Record<string, unknown>;

export class BridgeLink {
  private socket: WebSocket | null = null;
  private next = 1;
  private waiting = new Map<number, (reply: Reply) => void>();
  private retry = 1000;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly url: string,
    private readonly handlers: BridgeHandlers,
    private readonly makeSocket: (url: string) => WebSocket = (u) => new WebSocket(u),
  ) {}

  connect(): void {
    if (this.closed) return;
    let socket: WebSocket;
    try {
      socket = this.makeSocket(this.url);
    } catch {
      this.reconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.retry = 1000;
      this.handlers.onStatus(true);
      void this.request("hello").then((reply) => {
        if (reply.ok) this.handlers.onHello(reply as unknown as Hello);
      });
    };
    socket.onmessage = (event: MessageEvent) => this.receive(String(event.data));
    socket.onclose = () => {
      this.socket = null;
      this.handlers.onStatus(false);
      for (const resolve of this.waiting.values()) resolve({ ok: false, error: "disconnected" });
      this.waiting.clear();
      this.reconnect();
    };
  }

  private reconnect(): void {
    if (this.closed) return;
    this.timer = setTimeout(() => this.connect(), this.retry);
    this.retry = Math.min(this.retry * 2, 15_000);
  }

  private receive(text: string): void {
    let message: Reply & { event?: string; signed?: Signed };
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    if (typeof message.event === "string") {
      if (message.event === "scan") {
        if (message.signed) this.handlers.onScan(message.signed);
      } else {
        this.handlers.onEvent?.(message as BridgeEvent);
      }
      return;
    }
    if (typeof message.id === "number") {
      const resolve = this.waiting.get(message.id);
      this.waiting.delete(message.id);
      resolve?.(message);
    }
  }

  request(op: string, fields: Record<string, unknown> = {}): Promise<Reply> {
    const socket = this.socket;
    if (!socket || socket.readyState !== 1) return Promise.resolve({ ok: false, error: "disconnected" });
    const id = this.next++;
    return new Promise((resolve) => {
      this.waiting.set(id, resolve);
      socket.send(JSON.stringify({ id, op, ...fields }));
    });
  }

  /** A command the server signed (cash, receipt, journal): the bridge checks the signature. */
  order(command: Signed): Promise<Reply> {
    return this.request(String(command.payload.type), { command });
  }

  /** Development and demos: as if the card had been held in front of the reader. */
  simulateScan(code: string): Promise<Reply> {
    return this.request("sim.scan", { code });
  }

  /** Development and demos: a note pushed into the acceptor (amount in bani). */
  simulateNote(amount: number): Promise<Reply> {
    return this.request("sim.insert", { amount });
  }

  /** Development and demos: a device fault (`null` clears it). */
  simulateFault(device: "cash" | "fiscal" | "receipt", fault: string | null): Promise<Reply> {
    return this.request("sim.fault", { device, fault });
  }

  close(): void {
    this.closed = true;
    clearTimeout(this.timer);
    this.socket?.close();
  }
}

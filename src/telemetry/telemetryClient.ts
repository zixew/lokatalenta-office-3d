import {
  AGENTS,
  COLLABORATION_PAIRS,
  DIVISION_BY_ID,
  normalizeGatewayEvent,
  resolveEventDestination,
  resolveGatewayEndpoints,
  type EcosystemEnvLike,
  type GatewayEndpoints,
} from '../data/contracts.ts';
import type {
  EventTargetZone,
  GatewaySnapshot,
  NormalizedEvent,
  ResolvedEventDestination,
  TelemetryStatus,
  TickerEntry,
} from '../types/office.ts';

export type TelemetryTransportKind = 'ws' | 'sse' | 'http-polling' | 'simulated';

export interface WebSocketLike {
  readyState: number;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: ((ev: unknown) => void) | null;
  close(code?: number, reason?: string): void;
}

export interface EventSourceLike {
  readyState: number;
  onopen: ((ev: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  addEventListener(
    type: string,
    cb: (ev: { data: string; lastEventId?: string }) => void,
  ): void;
  close(): void;
}

export interface HttpResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<HttpResponseLike>;

export interface TelemetryTransports {
  readonly createWebSocket?: (url: string) => WebSocketLike;
  readonly createEventSource?: (url: string) => EventSourceLike;
  readonly fetchFn?: FetchLike;
}

export interface TelemetryClientOptions {
  readonly baseUrl?: string;
  readonly wsUrl?: string;
  readonly sseUrl?: string;
  readonly env?: EcosystemEnvLike;
  readonly locationSearch?: string;
  readonly transports?: TelemetryTransports;
  readonly initialDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly pollIntervalMs?: number;
  readonly simulatedIntervalMs?: number;
  readonly wsFailuresBeforeSse?: number;
  readonly sseFailuresBeforePolling?: number;
  readonly pollingFailuresBeforeCascade?: number;
  readonly maxReconnectBeforeSimulated?: number;
  readonly enableSimulatedFallback?: boolean;
  readonly maxTickerItems?: number;
}

export interface TelemetryEventEnvelope {
  readonly event: NormalizedEvent;
  readonly destination: ResolvedEventDestination;
}

export interface TelemetryStateSnapshot {
  readonly status: TelemetryStatus;
  readonly transport: TelemetryTransportKind;
  readonly endpoints: GatewayEndpoints;
  readonly recentTicker: readonly TickerEntry[];
  readonly stats: Record<string, unknown>;
  readonly sinceCursor: string | null;
}

function defaultCreateWebSocket(url: string): WebSocketLike | null {
  const WS = (globalThis as { WebSocket?: new (u: string) => WebSocketLike }).WebSocket;
  if (typeof WS !== 'function') return null;
  return new WS(url);
}

function defaultCreateEventSource(url: string): EventSourceLike | null {
  const ES = (globalThis as { EventSource?: new (u: string) => EventSourceLike }).EventSource;
  if (typeof ES !== 'function') return null;
  return new ES(url);
}

function defaultFetchFn(): FetchLike | null {
  const fn = (globalThis as { fetch?: FetchLike }).fetch;
  return typeof fn === 'function' ? fn.bind(globalThis) : null;
}

function unwrapPayload(raw: unknown): { kind: 'snapshot' | 'event' | 'unknown'; data: unknown } {
  if (!raw || typeof raw !== 'object') {
    return { kind: 'unknown', data: raw };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.type === 'snapshot') {
    return { kind: 'snapshot', data: obj.payload ?? obj };
  }
  if (obj.type === 'event') {
    return { kind: 'event', data: obj.payload ?? obj };
  }
  if (obj.type === 'ping' || obj.type === 'pong') {
    return { kind: 'unknown', data: obj };
  }
  if ('recentEvents' in obj || 'agents' in obj || 'divisions' in obj) {
    return { kind: 'snapshot', data: obj };
  }
  if ('id' in obj && ('type' in obj || 'source' in obj || 'title' in obj)) {
    return { kind: 'event', data: obj };
  }
  return { kind: 'unknown', data: obj };
}

export class TelemetryClient {
  private readonly endpoints: GatewayEndpoints;
  private readonly createWebSocketFn: ((url: string) => WebSocketLike | null) | null;
  private readonly createEventSourceFn: ((url: string) => EventSourceLike | null) | null;
  private readonly fetchFn: FetchLike | null;
  private readonly initialDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly pollIntervalMs: number;
  private readonly simulatedIntervalMs: number;
  private readonly wsFailuresBeforeSse: number;
  private readonly sseFailuresBeforePolling: number;
  private readonly pollingFailuresBeforeCascade: number;
  private readonly maxReconnectBeforeSimulated: number;
  private readonly enableSimulatedFallback: boolean;
  private readonly maxTickerItems: number;

  private status: TelemetryStatus = 'SIMULATED';
  private transport: TelemetryTransportKind = 'simulated';
  private running = false;
  private hasConnectedOnce = false;
  private hasHydratedSnapshot = false;
  private attempt = 0;
  private wsFailures = 0;
  private sseFailures = 0;
  private consecutivePollFailures = 0;
  private simCycle = 0;
  private sinceCursor: string | null = null;
  private stats: Record<string, unknown> = {};

  private activeWs: WebSocketLike | null = null;
  private activeSse: EventSourceLike | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private simulatedTimer: ReturnType<typeof setInterval> | null = null;
  private activePollAbort: AbortController | null = null;

  private readonly seenEventIds = new Set<string>();
  private readonly seenEventOrder: string[] = [];
  private ticker: TickerEntry[] = [];

  private readonly statusListeners = new Set<(status: TelemetryStatus) => void>();
  private readonly snapshotListeners = new Set<(snapshot: GatewaySnapshot) => void>();
  private readonly eventListeners = new Set<(envelope: TelemetryEventEnvelope) => void>();

  constructor(options: TelemetryClientOptions = {}) {
    const resolved = resolveGatewayEndpoints(options.env, options.locationSearch);
    const baseOverride = options.baseUrl
      ? options.baseUrl.trim().replace(/\/+$/, '')
      : resolved.baseUrl;

    this.endpoints = {
      baseUrl: baseOverride,
      wsUrl: options.wsUrl
        ? options.wsUrl.trim().replace(/\/+$/, '')
        : options.baseUrl
          ? resolveGatewayEndpoints({ VITE_EVENT_GATEWAY_URL: baseOverride }).wsUrl
          : resolved.wsUrl,
      sseUrl: options.sseUrl
        ? options.sseUrl.trim().replace(/\/+$/, '')
        : options.baseUrl
          ? `${baseOverride}/events/stream`
          : resolved.sseUrl,
      snapshotUrl: `${baseOverride}/snapshot`,
      eventsUrl: `${baseOverride}/events`,
      healthUrl: `${baseOverride}/health`,
    };

    this.createWebSocketFn =
      options.transports && 'createWebSocket' in options.transports
        ? options.transports.createWebSocket ?? null
        : defaultCreateWebSocket;
    this.createEventSourceFn =
      options.transports && 'createEventSource' in options.transports
        ? options.transports.createEventSource ?? null
        : defaultCreateEventSource;
    this.fetchFn =
      options.transports && 'fetchFn' in options.transports
        ? options.transports.fetchFn ?? null
        : defaultFetchFn();

    this.initialDelayMs = Math.max(50, options.initialDelayMs ?? 500);
    this.maxDelayMs = Math.max(this.initialDelayMs, options.maxDelayMs ?? 15000);
    this.pollIntervalMs = Math.max(250, options.pollIntervalMs ?? 3000);
    this.simulatedIntervalMs = Math.max(1000, options.simulatedIntervalMs ?? 12000);
    this.wsFailuresBeforeSse = Math.max(1, options.wsFailuresBeforeSse ?? 1);
    this.sseFailuresBeforePolling = Math.max(1, options.sseFailuresBeforePolling ?? 1);
    this.pollingFailuresBeforeCascade = Math.max(1, options.pollingFailuresBeforeCascade ?? 2);
    this.maxReconnectBeforeSimulated = options.maxReconnectBeforeSimulated ?? 6;
    this.enableSimulatedFallback = options.enableSimulatedFallback ?? true;
    this.maxTickerItems = Math.max(5, options.maxTickerItems ?? 50);
  }

  public getEndpoints(): GatewayEndpoints {
    return this.endpoints;
  }

  public getSnapshot(): TelemetryStateSnapshot {
    return {
      status: this.status,
      transport: this.transport,
      endpoints: this.endpoints,
      recentTicker: [...this.ticker],
      stats: { ...this.stats },
      sinceCursor: this.sinceCursor,
    };
  }

  public onStatusChange(cb: (status: TelemetryStatus) => void): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  public onSnapshot(cb: (snapshot: GatewaySnapshot) => void): () => void {
    this.snapshotListeners.add(cb);
    return () => {
      this.snapshotListeners.delete(cb);
    };
  }

  public onEvent(cb: (envelope: TelemetryEventEnvelope) => void): () => void {
    this.eventListeners.add(cb);
    return () => {
      this.eventListeners.delete(cb);
    };
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.wsFailures = 0;
    this.sseFailures = 0;
    this.consecutivePollFailures = 0;
    this.attempt = 0;
    this.connectWebSocket();
  }

  public stop(): void {
    this.running = false;
    this.clearTimers();
    this.closeActiveTransports();
    this.setStatus('SIMULATED', 'simulated');
  }

  public dispose(): void {
    this.stop();
    this.statusListeners.clear();
    this.snapshotListeners.clear();
    this.eventListeners.clear();
  }

  public emitSimulatedEvent(): TelemetryEventEnvelope {
    const pair = COLLABORATION_PAIRS[this.simCycle % COLLABORATION_PAIRS.length];
    const agentId = (this.simCycle % 2 === 0 ? pair.initiator : pair.target) % AGENTS.length;
    const agent = AGENTS[agentId] ?? AGENTS[0];
    const division = DIVISION_BY_ID[agent.divisionId];

    const zoneCycle: readonly EventTargetZone[] = [
      division.defaultZone,
      'boardroom',
      'cafeteria',
      'gym',
      'musholla',
      'lounge',
    ];
    const targetZone = zoneCycle[this.simCycle % zoneCycle.length];
    const targetFloor =
      targetZone === 'cafeteria' || targetZone === 'musholla' || targetZone === 'lobby'
        ? 1
        : targetZone === 'gym'
          ? 3
          : targetZone === 'boardroom'
            ? 2
            : division.defaultFloor;

    this.simCycle++;

    const rawEvent: NormalizedEvent = normalizeGatewayEvent({
      id: `sim-${Date.now()}-${this.simCycle}-${agent.id}`,
      timestamp: new Date().toISOString(),
      source: 'office-sim',
      type: 'agent.task.completed',
      divisionId: agent.divisionId,
      agentId: agent.id,
      entityId: `SIM-${this.simCycle}`,
      title: `${agent.shortName} • Simulasi Kantor`,
      summary: `${agent.shortName} menjalankan aktivitas ${targetZone} (${pair.taskDesc})`,
      targetZone,
      targetFloor,
      severity: 'info',
      metadata: { simulated: true },
    });

    const destination = resolveEventDestination(rawEvent);
    this.recordTickerEvent(rawEvent, destination);
    const envelope: TelemetryEventEnvelope = { event: rawEvent, destination };
    for (const cb of this.eventListeners) {
      cb(envelope);
    }
    return envelope;
  }

  private setStatus(nextStatus: TelemetryStatus, nextTransport: TelemetryTransportKind): void {
    const changed = this.status !== nextStatus;
    this.status = nextStatus;
    this.transport = nextTransport;
    if (nextStatus === 'SIMULATED') {
      this.startSimulatedTickerIfNeeded();
    } else {
      this.stopSimulatedTicker();
    }
    if (changed) {
      for (const cb of this.statusListeners) {
        cb(nextStatus);
      }
    }
  }

  private startSimulatedTickerIfNeeded(): void {
    if (!this.running || !this.enableSimulatedFallback || this.simulatedTimer !== null) {
      return;
    }
    this.simulatedTimer = setInterval(() => {
      if (this.status === 'SIMULATED' && this.running) {
        this.emitSimulatedEvent();
      }
    }, this.simulatedIntervalMs);
  }

  private stopSimulatedTicker(): void {
    if (this.simulatedTimer !== null) {
      clearInterval(this.simulatedTimer);
      this.simulatedTimer = null;
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.stopSimulatedTicker();
  }

  private closeActiveTransports(): void {
    if (this.activeWs) {
      this.activeWs.onopen = null;
      this.activeWs.onmessage = null;
      this.activeWs.onerror = null;
      this.activeWs.onclose = null;
      try {
        this.activeWs.close();
      } catch {
        // ignore close errors
      }
      this.activeWs = null;
    }

    if (this.activeSse) {
      this.activeSse.onopen = null;
      this.activeSse.onmessage = null;
      this.activeSse.onerror = null;
      try {
        this.activeSse.close();
      } catch {
        // ignore close errors
      }
      this.activeSse = null;
    }

    if (this.activePollAbort) {
      this.activePollAbort.abort();
      this.activePollAbort = null;
    }
  }

  private computeBackoffDelay(attemptIndex: number): number {
    return Math.min(this.maxDelayMs, this.initialDelayMs * Math.pow(2, attemptIndex));
  }

  private connectWebSocket(): void {
    if (!this.running) return;
    this.closeActiveTransports();

    let ws: WebSocketLike | null = null;
    try {
      ws = this.createWebSocketFn ? this.createWebSocketFn(this.endpoints.wsUrl) : null;
    } catch {
      ws = null;
    }

    if (!ws) {
      this.wsFailures++;
      this.connectSse();
      return;
    }

    let opened = false;
    let handledFailure = false;
    this.activeWs = ws;
    this.transport = 'ws';

    const handleWsDown = () => {
      if (!this.running || handledFailure || this.activeWs !== ws) return;
      handledFailure = true;
      this.closeActiveTransports();

      if (!opened) {
        this.wsFailures++;
        if (this.wsFailures >= this.wsFailuresBeforeSse) {
          this.connectSse();
          return;
        }
      } else {
        this.wsFailures = 1;
      }

      if (this.hasConnectedOnce) {
        this.setStatus('RECONNECTING', 'ws');
      }
      this.scheduleCascadeReconnect();
    };

    ws.onopen = () => {
      if (!this.running || this.activeWs !== ws) return;
      opened = true;
      this.hasConnectedOnce = true;
      this.attempt = 0;
      this.wsFailures = 0;
      this.sseFailures = 0;
      this.consecutivePollFailures = 0;
      this.setStatus('LIVE', 'ws');
    };

    ws.onmessage = (ev) => {
      if (!this.running || this.activeWs !== ws) return;
      this.handleRawMessage(ev.data);
    };

    ws.onerror = () => {
      handleWsDown();
    };

    ws.onclose = () => {
      handleWsDown();
    };
  }

  private connectSse(): void {
    if (!this.running) return;
    this.closeActiveTransports();

    let sse: EventSourceLike | null = null;
    try {
      sse = this.createEventSourceFn ? this.createEventSourceFn(this.endpoints.sseUrl) : null;
    } catch {
      sse = null;
    }

    if (!sse) {
      this.sseFailures++;
      this.startHttpPolling();
      return;
    }

    let opened = false;
    let handledFailure = false;
    this.activeSse = sse;
    this.transport = 'sse';

    const handleSseDown = () => {
      if (!this.running || handledFailure || this.activeSse !== sse) return;
      handledFailure = true;
      this.closeActiveTransports();

      if (!opened) {
        this.sseFailures++;
        if (this.sseFailures >= this.sseFailuresBeforePolling) {
          this.startHttpPolling();
          return;
        }
      }

      if (this.hasConnectedOnce) {
        this.setStatus('RECONNECTING', 'sse');
      }
      this.scheduleCascadeReconnect();
    };

    sse.onopen = () => {
      if (!this.running || this.activeSse !== sse) return;
      opened = true;
      this.hasConnectedOnce = true;
      this.attempt = 0;
      this.sseFailures = 0;
      this.consecutivePollFailures = 0;
      this.setStatus('LIVE', 'sse');
    };

    sse.onmessage = (ev) => {
      if (!this.running || this.activeSse !== sse) return;
      this.handleRawMessage(ev.data);
    };

    sse.addEventListener('snapshot', (ev) => {
      if (!this.running || this.activeSse !== sse) return;
      this.handleRawMessage(ev.data, 'snapshot');
    });

    sse.addEventListener('event', (ev) => {
      if (!this.running || this.activeSse !== sse) return;
      this.handleRawMessage(ev.data, 'event');
    });

    sse.onerror = () => {
      handleSseDown();
    };
  }

  private startHttpPolling(): void {
    if (!this.running) return;
    this.closeActiveTransports();

    if (!this.fetchFn) {
      this.handleAllTransportsUnavailable();
      return;
    }

    this.transport = 'http-polling';
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
    }

    void this.pollHttpOnce();
    this.pollTimer = setInterval(() => {
      if (this.running && this.transport === 'http-polling') {
        void this.pollHttpOnce();
      }
    }, this.pollIntervalMs);
  }

  public async pollHttpOnce(): Promise<boolean> {
    if (!this.running || !this.fetchFn) return false;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.activePollAbort = controller;

    try {
      const targetUrl = !this.hasHydratedSnapshot
        ? this.endpoints.snapshotUrl
        : this.sinceCursor
          ? `${this.endpoints.eventsUrl}?since=${encodeURIComponent(this.sinceCursor)}`
          : this.endpoints.eventsUrl;

      const res = await this.fetchFn(
        targetUrl,
        controller ? { signal: controller.signal } : undefined,
      );

      if (!this.running) return false;
      if (!res || !res.ok) {
        this.onHttpPollFailure();
        return false;
      }

      const payload = await res.json();
      if (!this.running) return false;

      this.hasConnectedOnce = true;
      this.consecutivePollFailures = 0;
      this.attempt = 0;
      this.setStatus('LIVE', 'http-polling');

      if (!this.hasHydratedSnapshot) {
        this.hasHydratedSnapshot = true;
        this.ingestSnapshot(payload as GatewaySnapshot);
      } else {
        this.ingestPolledEvents(payload);
      }

      return true;
    } catch {
      if (!this.running) return false;
      this.onHttpPollFailure();
      return false;
    } finally {
      if (this.activePollAbort === controller) {
        this.activePollAbort = null;
      }
    }
  }

  private onHttpPollFailure(): void {
    this.consecutivePollFailures++;

    if (!this.hasConnectedOnce) {
      // Initial cascade exhausted all 3 tiers cleanly -> SIMULATED + schedule retry
      if (this.pollTimer !== null) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.handleAllTransportsUnavailable();
      return;
    }

    const wasAlreadyReconnecting = this.status === 'RECONNECTING' && this.attempt > 0;
    this.setStatus('RECONNECTING', 'http-polling');
    if (wasAlreadyReconnecting || this.consecutivePollFailures >= this.pollingFailuresBeforeCascade) {
      if (this.pollTimer !== null) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.scheduleCascadeReconnect();
    }
  }

  private handleAllTransportsUnavailable(): void {
    if (!this.running) return;
    if (this.hasConnectedOnce && this.attempt < this.maxReconnectBeforeSimulated) {
      this.setStatus('RECONNECTING', 'simulated');
    } else {
      this.setStatus(this.enableSimulatedFallback ? 'SIMULATED' : 'RECONNECTING', 'simulated');
    }
    this.scheduleCascadeReconnect();
  }

  private scheduleCascadeReconnect(): void {
    if (!this.running || this.reconnectTimer !== null) return;

    if (this.hasConnectedOnce && this.attempt >= this.maxReconnectBeforeSimulated && this.enableSimulatedFallback) {
      this.setStatus('SIMULATED', 'simulated');
    }

    const delay = this.computeBackoffDelay(this.attempt);
    this.attempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.running) return;
      this.wsFailures = 0;
      this.sseFailures = 0;
      this.consecutivePollFailures = 0;
      this.connectWebSocket();
    }, delay);
  }

  private handleRawMessage(rawText: string, forcedKind?: 'snapshot' | 'event'): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return;
    }

    const unwrapped = unwrapPayload(parsed);
    const kind = forcedKind ?? unwrapped.kind;

    if (kind === 'snapshot') {
      this.hasHydratedSnapshot = true;
      this.ingestSnapshot(unwrapped.data as GatewaySnapshot);
    } else if (kind === 'event') {
      this.ingestEvent(unwrapped.data);
    }
  }

  private ingestSnapshot(snapshot: GatewaySnapshot | null | undefined): void {
    if (!snapshot || typeof snapshot !== 'object') return;
    if (snapshot.stats && typeof snapshot.stats === 'object') {
      this.stats = { ...snapshot.stats };
    }

    const events = snapshot.recentEvents ?? snapshot.events ?? [];
    for (const rawEv of events) {
      const normalized = normalizeGatewayEvent(rawEv);
      this.updateSinceCursor(normalized.timestamp);
      if (!this.hasSeenEvent(normalized.id)) {
        const dest = resolveEventDestination(normalized);
        this.recordTickerEvent(normalized, dest);
      }
    }

    for (const cb of this.snapshotListeners) {
      cb(snapshot);
    }
  }

  private ingestPolledEvents(payload: unknown): void {
    if (Array.isArray(payload)) {
      for (const item of payload) {
        this.ingestEvent(item);
      }
      return;
    }
    if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      const list = Array.isArray(obj.events)
        ? obj.events
        : Array.isArray(obj.recentEvents)
          ? obj.recentEvents
          : null;
      if (list) {
        for (const item of list) {
          this.ingestEvent(item);
        }
        return;
      }
      if ('id' in obj) {
        this.ingestEvent(obj);
      }
    }
  }

  private ingestEvent(rawEv: unknown): void {
    const normalized = normalizeGatewayEvent(rawEv);
    this.updateSinceCursor(normalized.timestamp);
    if (this.hasSeenEvent(normalized.id)) {
      return;
    }
    const destination = resolveEventDestination(normalized);
    this.recordTickerEvent(normalized, destination);
    const envelope: TelemetryEventEnvelope = { event: normalized, destination };
    for (const cb of this.eventListeners) {
      cb(envelope);
    }
  }

  private updateSinceCursor(timestamp: string): void {
    if (!timestamp) return;
    if (!this.sinceCursor || timestamp > this.sinceCursor) {
      this.sinceCursor = timestamp;
    }
  }

  private hasSeenEvent(id: string): boolean {
    return this.seenEventIds.has(id);
  }

  private recordTickerEvent(
    event: NormalizedEvent,
    destination: ResolvedEventDestination,
  ): void {
    this.seenEventIds.add(event.id);
    this.seenEventOrder.push(event.id);
    while (this.seenEventOrder.length > 200) {
      const oldest = this.seenEventOrder.shift();
      if (oldest) {
        this.seenEventIds.delete(oldest);
      }
    }

    const entry: TickerEntry = {
      id: event.id,
      timestamp: event.timestamp,
      title: event.title,
      summary: event.summary,
      source: event.source,
      divisionId: event.divisionId,
      agentId: event.agentId,
      type: event.type,
      severity: event.severity,
      targetZone: destination.zone,
      targetFloor: destination.floor,
    };

    this.ticker = [entry, ...this.ticker.filter((t) => t.id !== entry.id)].slice(
      0,
      this.maxTickerItems,
    );
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeGatewayEvent, resolveEventDestination } from '../src/data/contracts.ts';
import {
  TelemetryClient,
  type EventSourceLike,
  type FetchLike,
  type HttpResponseLike,
  type WebSocketLike,
} from '../src/telemetry/telemetryClient.ts';

class MockWebSocket implements WebSocketLike {
  public readyState = 0;
  public onopen: ((ev: unknown) => void) | null = null;
  public onmessage: ((ev: { data: string }) => void) | null = null;
  public onerror: ((ev: unknown) => void) | null = null;
  public onclose: ((ev: unknown) => void) | null = null;
  public closed = false;
  public readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  public triggerOpen(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  public triggerMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  public triggerError(): void {
    this.readyState = 3;
    this.onerror?.(new Error('ws error'));
  }

  public triggerClose(): void {
    this.readyState = 3;
    this.onclose?.({});
  }

  public close(): void {
    this.closed = true;
    this.readyState = 3;
  }
}

class MockEventSource implements EventSourceLike {
  public readyState = 0;
  public onopen: ((ev: unknown) => void) | null = null;
  public onmessage: ((ev: { data: string }) => void) | null = null;
  public onerror: ((ev: unknown) => void) | null = null;
  public closed = false;
  public readonly url: string;
  private readonly listeners = new Map<
    string,
    Array<(ev: { data: string; lastEventId?: string }) => void>
  >();

  constructor(url: string) {
    this.url = url;
  }

  public addEventListener(
    type: string,
    cb: (ev: { data: string; lastEventId?: string }) => void,
  ): void {
    const list = this.listeners.get(type) ?? [];
    list.push(cb);
    this.listeners.set(type, list);
  }

  public triggerOpen(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  public triggerNamedEvent(type: string, payload: unknown, lastEventId?: string): void {
    const list = this.listeners.get(type) ?? [];
    const ev = { data: JSON.stringify(payload), lastEventId };
    for (const cb of list) cb(ev);
  }

  public triggerError(): void {
    this.readyState = 2;
    this.onerror?.(new Error('sse error'));
  }

  public close(): void {
    this.closed = true;
    this.readyState = 2;
  }
}

function makeEvent(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    timestamp: '2026-11-24T14:00:00.000Z',
    source: 'backlog',
    type: 'backlog.updated',
    divisionId: 'engineering',
    agentId: 5,
    entityId: 'BL-46',
    title: `Event ${id}`,
    summary: `Summary for ${id}`,
    targetZone: 'workspace',
    targetFloor: 2,
    severity: 'info',
    metadata: {},
    ...overrides,
  };
}

describe('Event Mapping & 3-Tier WS/SSE/HTTP-Polling Telemetry Client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves all 7 EventTargetZone values including F2/F3 lounge & boardroom disambiguation and out-of-range fallbacks', () => {
    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z1', { targetZone: 'workspace', divisionId: 'engineering' })),
      ),
    ).toEqual({ zone: 'engineering', floor: 2, activity: 'working' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z2', { targetZone: 'workspace', divisionId: 'lounge' })),
      ),
    ).toEqual({ zone: 'lounge', floor: 2, activity: 'working' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z3', { targetZone: 'boardroom', divisionId: 'executive', targetFloor: 3 })),
      ),
    ).toEqual({ zone: 'executive', floor: 3, activity: 'meeting' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z4', { targetZone: 'boardroom', divisionId: 'engineering', targetFloor: 2 })),
      ),
    ).toEqual({ zone: 'meeting-rooms', floor: 2, activity: 'meeting' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z5', { targetZone: 'lounge', divisionId: 'engineering', targetFloor: 3 })),
      ),
    ).toEqual({ zone: 'relaxation', floor: 3, activity: 'lounging' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z6', { targetZone: 'lounge', divisionId: 'lounge', targetFloor: 2 })),
      ),
    ).toEqual({ zone: 'lounge', floor: 2, activity: 'working' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z7', { targetZone: 'cafeteria', targetFloor: 1 })),
      ),
    ).toEqual({ zone: 'cafeteria', floor: 1, activity: 'dining' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z8', { targetZone: 'musholla', targetFloor: 1 })),
      ),
    ).toEqual({ zone: 'musholla', floor: 1, activity: 'praying' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z9', { targetZone: 'lobby', targetFloor: 1 })),
      ),
    ).toEqual({ zone: 'lobby', floor: 1, activity: 'walking' });

    expect(
      resolveEventDestination(
        normalizeGatewayEvent(makeEvent('z10', { targetZone: 'gym', targetFloor: 3 })),
      ),
    ).toEqual({ zone: 'gym', floor: 3, activity: 'gym_workout' });

    const clamped = normalizeGatewayEvent({ agentId: 999, targetZone: 'invalid-zone', divisionId: 'unknown' });
    expect(clamped.agentId).toBe(0);
    expect(clamped.divisionId).toBe('executive');
    expect(resolveEventDestination(clamped)).toEqual({
      zone: 'executive',
      floor: 3,
      activity: 'working',
    });
  });

  it('connects via WebSocket, receives snapshot + events, deduplicates by ID, and cleans up on dispose()', () => {
    const sockets: MockWebSocket[] = [];
    const client = new TelemetryClient({
      transports: {
        createWebSocket: (url) => {
          const ws = new MockWebSocket(url);
          sockets.push(ws);
          return ws;
        },
      },
    });

    const statuses: string[] = [];
    const receivedIds: string[] = [];
    client.onStatusChange((s) => statuses.push(s));
    client.onEvent((env) => receivedIds.push(env.event.id));

    client.start();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toBe('ws://localhost:4101/ws');

    sockets[0].triggerOpen();
    expect(client.getSnapshot().status).toBe('LIVE');
    expect(client.getSnapshot().transport).toBe('ws');

    sockets[0].triggerMessage({
      type: 'snapshot',
      payload: {
        recentEvents: [makeEvent('evt-1')],
        stats: { totalEvents: 1 },
      },
    });
    expect(client.getSnapshot().recentTicker).toHaveLength(1);

    sockets[0].triggerMessage({ type: 'event', payload: makeEvent('evt-2') });
    sockets[0].triggerMessage({ type: 'event', payload: makeEvent('evt-2') });
    expect(receivedIds).toEqual(['evt-2']);
    expect(client.getSnapshot().recentTicker.map((t) => t.id)).toEqual(['evt-2', 'evt-1']);

    client.dispose();
    expect(sockets[0].closed).toBe(true);
    expect(client.getSnapshot().status).toBe('SIMULATED');
    expect(statuses).toContain('LIVE');
  });

  it('cascades WS -> SSE fallback when WS fails before opening', () => {
    const sockets: MockWebSocket[] = [];
    const sources: MockEventSource[] = [];
    const client = new TelemetryClient({
      transports: {
        createWebSocket: (url) => {
          const ws = new MockWebSocket(url);
          sockets.push(ws);
          return ws;
        },
        createEventSource: (url) => {
          const sse = new MockEventSource(url);
          sources.push(sse);
          return sse;
        },
      },
    });

    const events: string[] = [];
    client.onEvent((e) => events.push(e.event.id));

    client.start();
    expect(sockets).toHaveLength(1);
    sockets[0].triggerError();

    expect(sources).toHaveLength(1);
    expect(sources[0].url).toBe('http://localhost:4101/events/stream');
    sources[0].triggerOpen();
    expect(client.getSnapshot().status).toBe('LIVE');
    expect(client.getSnapshot().transport).toBe('sse');

    sources[0].triggerNamedEvent('snapshot', { recentEvents: [makeEvent('sse-snap-1')] });
    sources[0].triggerNamedEvent('event', makeEvent('sse-evt-2'), 'sse-evt-2');
    expect(events).toEqual(['sse-evt-2']);
    expect(client.getSnapshot().recentTicker.map((t) => t.id)).toEqual([
      'sse-evt-2',
      'sse-snap-1',
    ]);

    client.dispose();
    expect(sources[0].closed).toBe(true);
  });

  it('cascades WS -> SSE -> HTTP polling reporting LIVE, advancing ?since= cursor, and deduplicating events', async () => {
    const requestedUrls: string[] = [];
    let pollRound = 0;

    const fetchFn: FetchLike = async (url): Promise<HttpResponseLike> => {
      requestedUrls.push(url);
      pollRound++;
      if (pollRound === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            recentEvents: [
              makeEvent('poll-1', { timestamp: '2026-11-24T14:01:00.000Z' }),
            ],
            stats: { total: 1 },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          events: [
            makeEvent('poll-1', { timestamp: '2026-11-24T14:01:00.000Z' }),
            makeEvent('poll-2', { timestamp: '2026-11-24T14:02:00.000Z' }),
          ],
        }),
      };
    };

    const client = new TelemetryClient({
      env: { VITE_EVENT_GATEWAY_URL: 'https://gateway.lokatalenta.id/' },
      pollIntervalMs: 1000,
      transports: {
        createWebSocket: (url) => {
          const ws = new MockWebSocket(url);
          queueMicrotask(() => ws.triggerError());
          return ws;
        },
        createEventSource: (url) => {
          const sse = new MockEventSource(url);
          queueMicrotask(() => sse.triggerError());
          return sse;
        },
        fetchFn,
      },
    });

    expect(client.getEndpoints()).toEqual({
      baseUrl: 'https://gateway.lokatalenta.id',
      wsUrl: 'wss://gateway.lokatalenta.id/ws',
      sseUrl: 'https://gateway.lokatalenta.id/events/stream',
      snapshotUrl: 'https://gateway.lokatalenta.id/snapshot',
      eventsUrl: 'https://gateway.lokatalenta.id/events',
      healthUrl: 'https://gateway.lokatalenta.id/health',
    });

    const receivedIds: string[] = [];
    client.onEvent((e) => receivedIds.push(e.event.id));

    client.start();
    // Drain microtasks for WS error -> SSE error -> initial HTTP poll
    await vi.advanceTimersByTimeAsync(0);

    expect(client.getSnapshot().status).toBe('LIVE');
    expect(client.getSnapshot().transport).toBe('http-polling');
    expect(requestedUrls[0]).toBe('https://gateway.lokatalenta.id/snapshot');
    expect(client.getSnapshot().sinceCursor).toBe('2026-11-24T14:01:00.000Z');

    // Trigger next polling interval
    await vi.advanceTimersByTimeAsync(1000);
    expect(requestedUrls[1]).toBe(
      'https://gateway.lokatalenta.id/events?since=2026-11-24T14%3A01%3A00.000Z',
    );
    expect(receivedIds).toEqual(['poll-2']);
    expect(client.getSnapshot().recentTicker.map((t) => t.id)).toEqual(['poll-2', 'poll-1']);
    expect(client.getSnapshot().sinceCursor).toBe('2026-11-24T14:02:00.000Z');

    client.dispose();
  });

  it('transitions HTTP polling failure -> RECONNECTING -> exponential backoff cascade -> SIMULATED when offline', async () => {
    let shouldFailHttp = false;
    const sockets: MockWebSocket[] = [];

    const client = new TelemetryClient({
      locationSearch: '?gateway=https://preview.example.com/',
      initialDelayMs: 500,
      maxDelayMs: 4000,
      pollIntervalMs: 1000,
      pollingFailuresBeforeCascade: 2,
      maxReconnectBeforeSimulated: 2,
      transports: {
        createWebSocket: (url) => {
          const ws = new MockWebSocket(url);
          sockets.push(ws);
          queueMicrotask(() => ws.triggerError());
          return ws;
        },
        createEventSource: (url) => {
          const sse = new MockEventSource(url);
          queueMicrotask(() => sse.triggerError());
          return sse;
        },
        fetchFn: async () => {
          if (shouldFailHttp) {
            return { ok: false, status: 503, json: async () => ({}) };
          }
          return {
            ok: true,
            status: 200,
            json: async () => ({ recentEvents: [] }),
          };
        },
      },
    });

    expect(client.getEndpoints().wsUrl).toBe('wss://preview.example.com/ws');
    expect(client.getEndpoints().sseUrl).toBe('https://preview.example.com/events/stream');

    client.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getSnapshot().status).toBe('LIVE');

    // Now simulate gateway going down during polling
    shouldFailHttp = true;
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.getSnapshot().status).toBe('RECONNECTING');

    // Second consecutive poll failure triggers exponential backoff cascade
    await vi.advanceTimersByTimeAsync(1000);
    expect(client.getSnapshot().status).toBe('RECONNECTING');

    // Backoff attempt 0 = 500ms, attempt 1 = 1000ms, attempt 2 hits maxReconnectBeforeSimulated -> SIMULATED
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getSnapshot().status).toBe('SIMULATED');

    // Simulated tick works cleanly without throwing
    const sim = client.emitSimulatedEvent();
    expect(sim.event.source).toBe('office-sim');
    expect(client.getSnapshot().recentTicker[0].id).toBe(sim.event.id);

    client.dispose();
  });

  it('starts in SIMULATED cleanly on offline boot when all 3 tiers fail immediately', async () => {
    const client = new TelemetryClient({
      transports: {
        createWebSocket: () => {
          throw new Error('WS disabled');
        },
        createEventSource: () => {
          throw new Error('SSE disabled');
        },
        fetchFn: async () => {
          throw new Error('Network unreachable');
        },
      },
    });

    client.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getSnapshot().status).toBe('SIMULATED');
    expect(client.getSnapshot().transport).toBe('simulated');

    client.dispose();
  });
});

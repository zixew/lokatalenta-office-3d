import WebSocket from 'ws';
import { SECRETS, URLS } from './env.ts';
import { signGatewayEvent, signGitHubWebhook } from './hmac.ts';
import type { GatewaySnapshot, NormalizedEvent } from './schema-validators.ts';

export interface HttpResponse<T = unknown> {
  status: number;
  ok: boolean;
  headers: Headers;
  data: T;
  rawText: string;
}

export interface WsGatewayMessage {
  type: 'snapshot' | 'event' | string;
  payload: unknown;
  snapshotDelta?: unknown;
}

export interface SseGatewayMessage {
  event: string;
  id?: string;
  data: unknown;
  rawData: string;
}

async function parseResponse<T>(res: Response): Promise<HttpResponse<T>> {
  const rawText = await res.text();
  let data: unknown = rawText;
  try {
    data = rawText.length > 0 ? JSON.parse(rawText) : null;
  } catch {
    // Keep rawText if non-JSON
  }
  return {
    status: res.status,
    ok: res.ok,
    headers: res.headers,
    data: data as T,
    rawText,
  };
}

export async function getHealth(
  baseUrl: string = URLS.gateway,
): Promise<HttpResponse<Record<string, unknown>>> {
  const res = await fetch(`${baseUrl}/health`);
  return parseResponse<Record<string, unknown>>(res);
}

export async function waitForHealth(
  url: string = `${URLS.gateway}/health`,
  timeoutMs: number = 15_000,
  intervalMs: number = 250,
): Promise<HttpResponse<Record<string, unknown>>> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return parseResponse<Record<string, unknown>>(res);
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `Service healthcheck timed out after ${timeoutMs}ms at ${url}: ${String(lastError)}`,
  );
}

export async function getSnapshot(
  baseUrl: string = URLS.gateway,
): Promise<HttpResponse<GatewaySnapshot>> {
  const res = await fetch(`${baseUrl}/snapshot`);
  return parseResponse<GatewaySnapshot>(res);
}

export async function getEvents(
  params: {
    limit?: number;
    divisionId?: string;
    type?: string;
    source?: string;
  } = {},
  baseUrl: string = URLS.gateway,
): Promise<HttpResponse<{ events?: NormalizedEvent[] } | NormalizedEvent[]>> {
  const qs = new URLSearchParams();
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.divisionId) qs.set('divisionId', params.divisionId);
  if (params.type) qs.set('type', params.type);
  if (params.source) qs.set('source', params.source);
  const query = qs.toString();
  const res = await fetch(`${baseUrl}/events${query ? `?${query}` : ''}`);
  return parseResponse<{ events?: NormalizedEvent[] } | NormalizedEvent[]>(res);
}

export async function postEvent(
  event: Record<string, unknown> | string,
  options: {
    baseUrl?: string;
    secret?: string;
    signatureOverride?: string;
    bearerToken?: string;
    omitAuth?: boolean;
  } = {},
): Promise<HttpResponse<{ ok?: boolean; event?: NormalizedEvent; error?: string }>> {
  const baseUrl = options.baseUrl ?? URLS.gateway;
  const rawBody = typeof event === 'string' ? event : JSON.stringify(event);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!options.omitAuth) {
    if (options.bearerToken) {
      headers['Authorization'] = `Bearer ${options.bearerToken}`;
    } else if (options.signatureOverride !== undefined) {
      headers['x-lokatalenta-signature'] = options.signatureOverride;
    } else {
      headers['x-lokatalenta-signature'] = signGatewayEvent(
        rawBody,
        options.secret ?? SECRETS.gatewayEvent,
      );
    }
  }

  const res = await fetch(`${baseUrl}/events`, {
    method: 'POST',
    headers,
    body: rawBody,
  });

  return parseResponse<{ ok?: boolean; event?: NormalizedEvent; error?: string }>(
    res,
  );
}

export async function postGitHubWebhook(
  eventName: string,
  payload: Record<string, unknown> | string,
  options: {
    baseUrl?: string;
    secret?: string;
    signatureOverride?: string;
    omitSignature?: boolean;
    deliveryId?: string;
  } = {},
): Promise<HttpResponse<Record<string, unknown>>> {
  const baseUrl = options.baseUrl ?? URLS.gateway;
  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-GitHub-Event': eventName,
    'X-GitHub-Delivery':
      options.deliveryId ?? `e2e-delivery-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  };

  if (!options.omitSignature) {
    headers['X-Hub-Signature-256'] =
      options.signatureOverride !== undefined
        ? options.signatureOverride
        : signGitHubWebhook(rawBody, options.secret ?? SECRETS.githubWebhook);
  }

  const res = await fetch(`${baseUrl}/webhooks/github`, {
    method: 'POST',
    headers,
    body: rawBody,
  });

  return parseResponse<Record<string, unknown>>(res);
}

export async function connectWsAndWaitForEvent(
  predicate: (msg: WsGatewayMessage) => boolean,
  options: {
    wsUrl?: string;
    timeoutMs?: number;
    onConnected?: () => Promise<void> | void;
  } = {},
): Promise<{ matched: WsGatewayMessage; messages: WsGatewayMessage[] }> {
  const wsUrl = options.wsUrl ?? URLS.gatewayWs;
  const timeoutMs = options.timeoutMs ?? 10_000;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const messages: WsGatewayMessage[] = [];
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        try {
          ws.close();
        } catch {
          // ignore close errors
        }
      }
    };

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const timer = setTimeout(() => {
      fail(
        new Error(
          `WS timed out after ${timeoutMs}ms waiting for matching event (${messages.length} messages received)`,
        ),
      );
    }, timeoutMs);

    ws.on('error', (err) => {
      fail(err instanceof Error ? err : new Error(String(err)));
    });

    ws.on('message', (raw) => {
      let parsed: WsGatewayMessage;
      try {
        parsed = JSON.parse(raw.toString('utf8')) as WsGatewayMessage;
      } catch {
        return;
      }
      messages.push(parsed);
      if (!settled && predicate(parsed)) {
        settled = true;
        cleanup();
        resolve({ matched: parsed, messages });
      }
    });

    ws.on('open', async () => {
      if (options.onConnected) {
        try {
          await options.onConnected();
        } catch (err) {
          fail(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });
  });
}

export async function connectSseAndWaitForEvent(
  predicate: (msg: SseGatewayMessage) => boolean,
  options: {
    sseUrl?: string;
    timeoutMs?: number;
    onConnected?: () => Promise<void> | void;
  } = {},
): Promise<{ matched: SseGatewayMessage; messages: SseGatewayMessage[] }> {
  const sseUrl = options.sseUrl ?? URLS.gatewaySse;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const controller = new AbortController();
  const messages: SseGatewayMessage[] = [];

  const timer = setTimeout(() => {
    controller.abort(new Error(`SSE timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const res = await fetch(sseUrl, {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`SSE connection failed with HTTP ${res.status}`);
    }

    if (options.onConnected) {
      await options.onConnected();
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        let eventName = 'message';
        let eventId: string | undefined;
        const dataLines: string[] = [];

        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith(':')) continue;
          if (line.startsWith('event:')) {
            eventName = line.slice('event:'.length).trim();
          } else if (line.startsWith('id:')) {
            eventId = line.slice('id:'.length).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice('data:'.length).trimStart());
          }
        }

        if (dataLines.length === 0) continue;
        const rawData = dataLines.join('\n');
        let parsedData: unknown = rawData;
        try {
          parsedData = JSON.parse(rawData);
        } catch {
          // keep string
        }

        const msg: SseGatewayMessage = {
          event: eventName,
          ...(eventId !== undefined ? { id: eventId } : {}),
          data: parsedData,
          rawData,
        };
        messages.push(msg);

        if (predicate(msg)) {
          return { matched: msg, messages };
        }
      }
    }

    throw new Error(
      `SSE stream closed before matching event arrived (${messages.length} messages received)`,
    );
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

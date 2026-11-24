import { expect, test } from '@playwright/test';
import { buildGitHubPushPayload } from '../../fixtures/github-webhooks.ts';
import {
  buildBacklogUpdatedEvent,
  INVALID_TELEMETRY_FIXTURES,
} from '../../fixtures/telemetry-events.ts';
import { URLS } from '../../helpers/env.ts';
import {
  getEvents,
  postEvent,
  postGitHubWebhook,
  waitForHealth,
} from '../../helpers/gateway-client.ts';
import {
  assertWebGLCanvasActive,
  attachErrorGuards,
  getConnectionStatus,
  getTickerEntries,
  readOfficeState,
  waitForOfficeReady,
} from '../../helpers/office-driver.ts';
import {
  assertValid,
  validateNoPiiInEvent,
} from '../../helpers/schema-validators.ts';

test.describe('Tier 2 — Real-Time Telemetry Resilience, Fallback & Rejection (@tier2 @office3d @integration)', () => {
  // =========================================================================
  // @R5-F5: 3D Office Telemetry Client Resilience (5 tests)
  // =========================================================================

  test('degrades gracefully to RECONNECTING/SIMULATED when WS & SSE are cleanly unavailable @tier2 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);

    // Accept and immediately close WS with 1012 (Service Restart) so no Chromium network error fires
    await page.routeWebSocket('**/ws', (ws) => {
      ws.close({ code: 1012, reason: 'Simulated gateway maintenance' });
    });
    // Return clean empty SSE stream that closes immediately
    await page.route('**/events/stream*', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: ': gateway offline simulation\n\n',
      });
    });

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);
    await assertWebGLCanvasActive(page);

    const status = await getConnectionStatus(page);
    expect(status).toMatch(/reconnect|simulat|offline|poll|sse/i);
    expect(state.agents).toHaveLength(24);

    errors.assertZeroErrors();
  });

  test('falls back cleanly to SSE (/events/stream) when WebSocket /ws closes with 1012 @tier2 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    let wsClosedCount = 0;
    await page.routeWebSocket('**/ws', (ws) => {
      wsClosedCount++;
      ws.close({ code: 1012, reason: 'Force SSE fallback' });
    });

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await page.waitForTimeout(1000);

    expect(wsClosedCount).toBeGreaterThanOrEqual(1);

    const marker = `SSE-FB-${Date.now()}`;
    const res = await postEvent(
      JSON.stringify(
        buildBacklogUpdatedEvent({
          entityId: marker,
          title: `SSE Fallback ${marker}`,
          summary: `Event delivered over SSE fallback ${marker}`,
        }),
      ),
    );
    expect(res.status).toBe(202);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((e) => e.includes(marker));
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    errors.assertZeroErrors();
  });

  test('recovers to LIVE status when Gateway WebSocket connectivity returns @tier2 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    let allowWs = false;
    await page.routeWebSocket('**/ws', (ws) => {
      if (!allowWs) {
        ws.close({ code: 1012, reason: 'Temporary outage' });
        return;
      }
      const server = ws.connectToServer();
      ws.onMessage((msg) => server.send(msg));
      server.onMessage((msg) => ws.send(msg));
      ws.onClose((code, reason) => server.close({ code, reason }));
      server.onClose((code, reason) => ws.close({ code, reason }));
    });

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await page.waitForTimeout(800);

    allowWs = true;
    const marker = `RECOVER-${Date.now()}`;
    await postEvent(
      JSON.stringify(
        buildBacklogUpdatedEvent({
          entityId: marker,
          title: `Recovered ${marker}`,
          summary: `Post-recovery event ${marker}`,
        }),
      ),
    );

    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 12_000 })
      .toMatch(/live|connected/i);

    errors.assertZeroErrors();
  });

  test('ignores malformed JSON and unknown event frames on WebSocket without crashing @tier2 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    await page.routeWebSocket('**/ws', (ws) => {
      const server = ws.connectToServer();
      ws.onMessage((msg) => server.send(msg));
      server.onMessage((msg) => {
        ws.send(msg);
      });
      setTimeout(() => {
        try {
          ws.send('{not-valid-json');
          ws.send(JSON.stringify({ type: 'unknown.frame', payload: null }));
        } catch {
          // ignore if closed
        }
      }, 400);
    });

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await page.waitForTimeout(900);

    await assertWebGLCanvasActive(page);
    const state = await readOfficeState(page);
    expect(state.agents).toHaveLength(24);
    expect(errors.pageErrors).toHaveLength(0);
  });

  test('escapes HTML and XSS payloads inside live telemetry ticker entries @tier2 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const marker = `XSS-TICKER-${Date.now()}`;
    const evt = buildBacklogUpdatedEvent({
      entityId: marker,
      title: `${marker} <img src=x onerror="window.__tickerXss=1;alert(1)">`,
      summary: `Safe escape check for ${marker} <script>window.__tickerXss=1</script>`,
    });

    const res = await postEvent(JSON.stringify(evt));
    expect(res.status).toBe(202);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((line) => line.includes(marker));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const xssGlobal = await page.evaluate(
      () => (window as unknown as { __tickerXss?: unknown }).__tickerXss ?? null,
    );
    expect(alertFired).toBe(false);
    expect(xssGlobal).toBeNull();
    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R5-F6: Gateway Rejection, Idempotency & Burst Resilience (5 tests)
  // =========================================================================

  test('tampered GitHub webhook HMAC signature returns 401/403 and never enters ticker @tier2 @R5-F6 @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const marker = `TAMPERED-GH-${Date.now()}`;
    const payload = buildGitHubPushPayload({
      head_commit: {
        id: '0000111122223333444455556666777788889999',
        message: marker,
        timestamp: new Date().toISOString(),
      },
    });

    const res = await postGitHubWebhook('push', payload, {
      signatureOverride:
        'sha256=0000000000000000000000000000000000000000000000000000000000000000',
    });
    expect([401, 403]).toContain(res.status);

    await page.waitForTimeout(500);
    const entries = await getTickerEntries(page);
    expect(entries.some((e) => e.includes(marker))).toBe(false);
    errors.assertZeroErrors();
  });

  test('invalid telemetry schema (agentId 99 / unknown division) is rejected with 4xx and excluded from ticker @tier2 @R5-F6 @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const badAgentMarker = `BAD-AGENT-${Date.now()}`;
    const res1 = await postEvent({
      ...INVALID_TELEMETRY_FIXTURES.invalidAgentId,
      entityId: badAgentMarker,
      title: badAgentMarker,
    });
    expect(res1.status).toBeGreaterThanOrEqual(400);
    expect(res1.status).toBeLessThan(500);

    const res2 = await postEvent({
      ...INVALID_TELEMETRY_FIXTURES.invalidDivision,
      entityId: `BAD-DIV-${Date.now()}`,
    });
    expect(res2.status).toBeGreaterThanOrEqual(400);
    expect(res2.status).toBeLessThan(500);

    await page.waitForTimeout(400);
    const entries = await getTickerEntries(page);
    expect(entries.some((e) => e.includes(badAgentMarker))).toBe(false);
    errors.assertZeroErrors();
  });

  test('duplicate event IDs are handled idempotently without duplicating Gateway records @tier2 @R5-F6 @integration', async () => {
    await waitForHealth(`${URLS.gateway}/health`);
    const fixedId = `idem-${Date.now()}`;
    const evt = buildBacklogUpdatedEvent({
      id: fixedId,
      entityId: `IDEM-BL-${Date.now()}`,
      title: `Idempotency check ${fixedId}`,
    });

    const first = await postEvent(JSON.stringify(evt));
    expect(first.status).toBe(202);

    const second = await postEvent(JSON.stringify(evt));
    expect([200, 202, 409]).toContain(second.status);

    const eventsRes = await getEvents({ limit: 50 });
    expect(eventsRes.ok).toBe(true);
    const list = Array.isArray(eventsRes.data)
      ? eventsRes.data
      : eventsRes.data.events ?? [];
    const matches = list.filter((e) => e.id === fixedId);
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  test('blocks or scrubs PII email patterns so raw candidate emails never persist in Gateway events @tier2 @R5-F6 @integration', async () => {
    await waitForHealth(`${URLS.gateway}/health`);
    const marker = `PII-GUARD-${Date.now()}`;
    const piiEvent = {
      ...INVALID_TELEMETRY_FIXTURES.piiLeakEmail,
      id: `pii-${Date.now()}`,
      entityId: marker,
      title: `PII Guard ${marker}`,
    };

    const res = await postEvent(piiEvent);
    if (res.ok) {
      // If Gateway chose sanitization over 4xx rejection, verify persisted event has zero raw PII
      const eventsRes = await getEvents({ limit: 20 });
      const list = Array.isArray(eventsRes.data)
        ? eventsRes.data
        : eventsRes.data.events ?? [];
      const stored = list.find((e) => e.entityId === marker);
      if (stored) {
        assertValid(validateNoPiiInEvent(stored), 'Sanitized stored event');
      }
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });

  test('survives 20-event concurrent telemetry burst with zero 5xx or Office 3D errors @tier2 @R5-F6 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const stamp = Date.now();
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        postEvent(
          JSON.stringify(
            buildBacklogUpdatedEvent({
              id: `burst20-${stamp}-${i}`,
              entityId: `BURST20-${stamp}-${i}`,
              title: `Concurrent event ${i}`,
            }),
          ),
        ),
      ),
    );

    for (const res of responses) {
      expect(res.status).toBeLessThan(500);
      expect(res.ok).toBe(true);
    }

    await page.waitForTimeout(500);
    const state = await readOfficeState(page);
    expect(state.agents).toHaveLength(24);
    errors.assertZeroErrors();
  });
});

import { expect, test } from '@playwright/test';
import {
  buildGitHubPushPayload,
} from '../../fixtures/github-webhooks.ts';
import {
  buildBacklogUpdatedEvent,
  buildLmsActivityEvent,
  buildSprintUpdatedEvent,
} from '../../fixtures/telemetry-events.ts';
import { CANONICAL_AGENTS, CANONICAL_DIVISIONS } from '../../helpers/canonical.ts';
import { FORBIDDEN_PORTS, REPOS, URLS } from '../../helpers/env.ts';
import {
  connectSseAndWaitForEvent,
  connectWsAndWaitForEvent,
  getEvents,
  getSnapshot,
  postEvent,
  postGitHubWebhook,
  waitForHealth,
} from '../../helpers/gateway-client.ts';
import {
  attachErrorGuards,
  captureCanvasPng,
  getConnectionStatus,
  getTickerEntries,
  jumpToZone,
  measurePixelDiffPercent,
  readOfficeState,
  switchFloor,
  switchPov,
  waitForOfficeReady,
} from '../../helpers/office-driver.ts';
import {
  assertValid,
  validateGatewaySnapshot,
  validateNoPiiInEvent,
  validateNormalizedEvent,
  validateOfficeDiagnosticState,
} from '../../helpers/schema-validators.ts';

test.describe('Tier 1 — 3D Office Real-Time Telemetry & E2E Contract (@tier1 @office3d @integration)', () => {
  // =========================================================================
  // @R5-F5: 3D Office Real-Time Telemetry Client (5 tests)
  // =========================================================================

  test('connects to Event Gateway and displays LIVE telemetry status @tier1 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    const health = await waitForHealth(`${URLS.gateway}/health`);
    expect(health.ok).toBe(true);

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 10_000 })
      .toMatch(/live|connected|ws|sse/i);

    errors.assertZeroErrors();
  });

  test('reflects POST /events backlog.updated inside 3D Office Live Ticker @tier1 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 10_000 })
      .toMatch(/live|connected/i);

    const marker = `BL-E2E-${Date.now()}`;
    const evt = buildBacklogUpdatedEvent({
      entityId: marker,
      title: `Backlog ${marker} groomed`,
      summary: `Pranadipa Wicaksana groomed ${marker} for Sprint 16`,
    });

    const postRes = await postEvent(JSON.stringify(evt));
    expect(postRes.status).toBe(202);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((line) => line.includes(marker));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    errors.assertZeroErrors();
  });

  test('reflects sprint.updated event and preserves Floor 2 Engineering state @tier1 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 10_000 })
      .toMatch(/live|connected/i);

    const marker = `SPR-E2E-${Date.now()}`;
    const evt = buildSprintUpdatedEvent({
      entityId: marker,
      title: `Sprint ${marker} committed`,
      summary: `Hendrawan Wicaksono locked ${marker} capacity`,
      agentId: 18,
      divisionId: 'engineering',
      targetFloor: 2,
      targetZone: 'boardroom',
    });

    const postRes = await postEvent(JSON.stringify(evt));
    expect(postRes.status).toBe(202);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((line) => line.includes(marker));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const state = await readOfficeState(page);
    const agent18 = state.agents.find((a) => a.id === 18)!;
    expect(agent18.divisionId).toBe('engineering');

    errors.assertZeroErrors();
  });

  test('propagates signed GitHub push webhook into 3D Office Live Ticker @tier1 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 10_000 })
      .toMatch(/live|connected/i);

    const uniqueMsg = `feat(office-3d): live-sync-${Date.now()}`;
    const payload = buildGitHubPushPayload({
      commits: [
        {
          id: `deadbeef${Date.now().toString(16).padEnd(32, '0').slice(0, 32)}`,
          message: uniqueMsg,
          timestamp: new Date().toISOString(),
          author: { name: 'Farel Faza Nugraha', username: 'farel-faza' },
          added: [],
          modified: ['src/scene/OfficeScene.ts'],
          removed: [],
        },
      ],
      head_commit: {
        id: `deadbeef${Date.now().toString(16).padEnd(32, '0').slice(0, 32)}`,
        message: uniqueMsg,
        timestamp: new Date().toISOString(),
      },
    });

    const res = await postGitHubWebhook('push', payload);
    expect(res.ok).toBe(true);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some(
            (line) =>
              line.includes('live-sync') ||
              line.includes('lokatalenta-office-3d') ||
              line.includes('Farel'),
          );
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    errors.assertZeroErrors();
  });

  test('reflects lms.activity event in 3D Office without exposing candidate PII @tier1 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 10_000 })
      .toMatch(/live|connected/i);

    const marker = `ASSESS-${Date.now()}`;
    const evt = buildLmsActivityEvent({
      entityId: marker,
      title: `LMS battery ${marker} completed`,
      summary: `Anonymized cohort ${marker} completed Kraepelin battery`,
    });

    const postRes = await postEvent(JSON.stringify(evt));
    expect(postRes.status).toBe(202);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((line) => line.includes(marker));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const state = await readOfficeState(page);
    assertValid(validateNoPiiInEvent(state.ticker), 'Office ticker PII audit');

    const eventsRes = await getEvents({ limit: 10 });
    expect(eventsRes.ok).toBe(true);
    assertValid(validateNoPiiInEvent(eventsRes.data), 'Gateway events PII audit');

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R5-F6: Ecosystem E2E Suite Self-Contract & Clean-Run Verification (5 tests)
  // =========================================================================

  test('Gateway /snapshot returns 24 canonical agents and 6 divisions matching Office 3D @tier1 @R5-F6 @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    const snapRes = await getSnapshot(URLS.gateway);
    expect(snapRes.ok).toBe(true);
    assertValid(validateGatewaySnapshot(snapRes.data), 'Gateway /snapshot');

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const officeState = await waitForOfficeReady(page);

    expect(snapRes.data.agents).toHaveLength(CANONICAL_AGENTS.length);
    expect(snapRes.data.divisions).toHaveLength(CANONICAL_DIVISIONS.length);
    expect(officeState.agents).toHaveLength(CANONICAL_AGENTS.length);

    errors.assertZeroErrors();
  });

  test('Gateway WS /ws and SSE /events/stream deliver live events within 2000ms @tier1 @R5-F6 @integration', async () => {
    await waitForHealth(`${URLS.gateway}/health`);
    const marker = `FANOUT-${Date.now()}`;
    const evt = buildBacklogUpdatedEvent({
      entityId: marker,
      title: `Fanout ${marker}`,
      summary: `Verify simultaneous WS and SSE fanout for ${marker}`,
    });

    const startMs = Date.now();
    const wsPromise = connectWsAndWaitForEvent(
      (msg) =>
        msg.type === 'event' &&
        typeof msg.payload === 'object' &&
        msg.payload !== null &&
        (msg.payload as { entityId?: string }).entityId === marker,
      { timeoutMs: 5_000 },
    );

    const ssePromise = connectSseAndWaitForEvent(
      (msg) =>
        typeof msg.data === 'object' &&
        msg.data !== null &&
        JSON.stringify(msg.data).includes(marker),
      {
        timeoutMs: 5_000,
        onConnected: async () => {
          const res = await postEvent(JSON.stringify(evt));
          expect(res.status).toBe(202);
        },
      },
    );

    const [wsResult, sseResult] = await Promise.all([wsPromise, ssePromise]);
    const elapsedMs = Date.now() - startMs;

    expect(elapsedMs).toBeLessThan(2_000);
    assertValid(validateNormalizedEvent(wsResult.matched.payload), 'WS NormalizedEvent');
    expect(JSON.stringify(sseResult.matched.data)).toContain(marker);
  });

  test('all ecosystem services avoid forbidden host ports and pass health checks @tier1 @R5-F6 @integration', async () => {
    for (const repo of Object.values(REPOS)) {
      expect((FORBIDDEN_PORTS as readonly number[]).includes(repo.apiPort)).toBe(false);
      if (repo.devUiPort !== null) {
        expect((FORBIDDEN_PORTS as readonly number[]).includes(repo.devUiPort)).toBe(false);
      }
    }

    const targets = [
      `${URLS.gateway}/health`,
      `${URLS.backlogApi}/api/health`,
      `${URLS.sprintApi}/api/health`,
      `${URLS.docsApi}/api/health`,
      `${URLS.office}/`,
    ];

    for (const url of targets) {
      const res = await waitForHealth(url, 8_000);
      expect(res.ok).toBe(true);
    }
  });

  test('Office 3D diagnostic hook satisfies schema contract across idle and active states @tier1 @R5-F6 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const initial = await waitForOfficeReady(page);
    assertValid(validateOfficeDiagnosticState(initial), 'Initial Office state');

    await switchFloor(page, 2);
    await switchPov(page, 'first-person');
    await page.waitForTimeout(350);

    const updated = await readOfficeState(page);
    assertValid(validateOfficeDiagnosticState(updated), 'Updated Office state');
    expect(updated.activeFloor).toBe(2);
    expect(updated.activePov).toBe('first-person');

    errors.assertZeroErrors();
  });

  test('PNG pixel-delta pipeline detects authentic WebGL camera/zone transitions @tier1 @R5-F6 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 3);
    await switchPov(page, 'overview');
    await page.waitForTimeout(450);
    const pngA = await captureCanvasPng(page);

    expect(measurePixelDiffPercent(pngA, pngA)).toBe(0);

    await switchFloor(page, 1);
    await jumpToZone(page, 'cafeteria');
    await switchPov(page, 'first-person');
    await page.waitForTimeout(450);
    const pngB = await captureCanvasPng(page);

    expect(measurePixelDiffPercent(pngA, pngB)).toBeGreaterThan(5);

    errors.assertZeroErrors();
  });
});

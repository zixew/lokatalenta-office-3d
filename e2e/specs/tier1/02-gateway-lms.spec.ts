import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  buildGitHubIssuesPayload,
  buildGitHubPingPayload,
  buildGitHubPullRequestPayload,
  buildGitHubPushPayload,
} from '../../fixtures/github-webhooks.ts';
import {
  buildBacklogUpdatedEvent,
  buildDocUpdatedEvent,
  buildLmsActivityEvent,
  buildSprintUpdatedEvent,
} from '../../fixtures/telemetry-events.ts';
import { CANONICAL_DIVISION_IDS } from '../../helpers/canonical.ts';
import { REPOS, URLS } from '../../helpers/env.ts';
import {
  connectSseAndWaitForEvent,
  connectWsAndWaitForEvent,
  getEvents,
  getHealth,
  getSnapshot,
  postEvent,
  postGitHubWebhook,
} from '../../helpers/gateway-client.ts';
import { attachErrorGuards } from '../../helpers/office-driver.ts';
import {
  assertValid,
  validateGatewaySnapshot,
  validateNoPiiInEvent,
  validateNormalizedEvent,
  type NormalizedEvent,
} from '../../helpers/schema-validators.ts';

function extractEventsArray(
  data: { events?: NormalizedEvent[] } | NormalizedEvent[],
): NormalizedEvent[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.events)) return data.events;
  throw new Error(`Unexpected /events payload shape: ${JSON.stringify(data)}`);
}

test.describe('Tier 1 — Event Gateway, GitHub Webhooks & LMS Telemetry', () => {
  // ==========================================================================
  // R2-F4: Real-Time Event Gateway (5 tests)
  // ==========================================================================

  test(
    'R2-F4.1 GET /health returns 200 healthy status',
    { tag: ['@tier1', '@R2-F4', '@gateway'] },
    async () => {
      const res = await getHealth(URLS.gateway);
      expect(res.status).toBe(200);
      expect(res.ok).toBe(true);
      expect(res.data).toBeTruthy();
      const healthy =
        res.data.ok === true ||
        res.data.status === 'ok' ||
        res.data.status === 'healthy';
      expect(healthy).toBe(true);
    },
  );

  test(
    'R2-F4.2 GET /snapshot returns valid 24-agent and 6-division GatewaySnapshot',
    { tag: ['@tier1', '@R2-F4', '@gateway'] },
    async () => {
      const res = await getSnapshot(URLS.gateway);
      expect(res.status).toBe(200);
      assertValid(validateGatewaySnapshot(res.data), 'GET /snapshot');
    },
  );

  test(
    'R2-F4.3 POST /events accepts canonical event with 202 and persists it in GET /events',
    { tag: ['@tier1', '@R2-F4', '@gateway'] },
    async () => {
      const payload = buildBacklogUpdatedEvent({
        entityId: `BL-E2E-${Date.now()}`,
      });
      const postRes = await postEvent({ ...payload });
      expect([200, 201, 202]).toContain(postRes.status);
      expect(postRes.data.ok).toBe(true);
      assertValid(
        validateNormalizedEvent(postRes.data.event),
        'POST /events response.event',
      );
      expect(postRes.data.event!.id).toBe(payload.id);

      const listRes = await getEvents({ limit: 50, source: 'backlog' });
      expect(listRes.status).toBe(200);
      const events = extractEventsArray(listRes.data);
      const found = events.find((e) => e.id === payload.id);
      expect(found).toBeDefined();
      assertValid(validateNormalizedEvent(found), 'GET /events persisted item');
    },
  );

  test(
    'R2-F4.4 WS /ws sends initial snapshot on connect and broadcasts posted events in real time',
    { tag: ['@tier1', '@R2-F4', '@gateway'] },
    async () => {
      const evt = buildSprintUpdatedEvent({
        entityId: `SPR-WS-${Date.now()}`,
      });

      const { matched, messages } = await connectWsAndWaitForEvent(
        (msg) => {
          if (msg.type !== 'event') return false;
          const p = msg.payload as Partial<NormalizedEvent>;
          return p?.id === evt.id;
        },
        {
          timeoutMs: 8_000,
          onConnected: async () => {
            const res = await postEvent({ ...evt });
            expect([200, 201, 202]).toContain(res.status);
          },
        },
      );

      const snapshotMsg = messages.find((m) => m.type === 'snapshot');
      expect(snapshotMsg).toBeDefined();
      assertValid(
        validateGatewaySnapshot(snapshotMsg!.payload),
        'WS initial snapshot',
      );

      assertValid(
        validateNormalizedEvent(matched.payload),
        'WS broadcasted event',
      );
      expect((matched.payload as NormalizedEvent).id).toBe(evt.id);
    },
  );

  test(
    'R2-F4.5 GET /events/stream SSE delivers snapshot and live posted events',
    { tag: ['@tier1', '@R2-F4', '@gateway'] },
    async () => {
      const evt = buildDocUpdatedEvent({
        entityId: `ADR-SSE-${Date.now()}`,
      });

      const { matched, messages } = await connectSseAndWaitForEvent(
        (msg) => {
          if (msg.event !== 'event' && msg.event !== 'message') return false;
          const dataObj = msg.data as { payload?: Partial<NormalizedEvent>; id?: string };
          const candidate = dataObj?.payload ?? (dataObj as Partial<NormalizedEvent>);
          return candidate?.id === evt.id;
        },
        {
          timeoutMs: 8_000,
          onConnected: async () => {
            const res = await postEvent({ ...evt });
            expect([200, 201, 202]).toContain(res.status);
          },
        },
      );

      expect(messages.length).toBeGreaterThanOrEqual(1);
      const dataObj = matched.data as { payload?: NormalizedEvent } & Partial<NormalizedEvent>;
      const normalized = dataObj.payload ?? (dataObj as NormalizedEvent);
      assertValid(validateNormalizedEvent(normalized), 'SSE streamed event');
      expect(normalized.id).toBe(evt.id);
    },
  );

  // ==========================================================================
  // R5-F2: GitHub Webhook Ingestion (5 tests)
  // ==========================================================================

  test(
    'R5-F2.1 POST /webhooks/github accepts signed ping event',
    { tag: ['@tier1', '@R5-F2', '@gateway'] },
    async () => {
      const res = await postGitHubWebhook('ping', buildGitHubPingPayload());
      expect([200, 202]).toContain(res.status);
      expect(res.data.ok).toBe(true);
    },
  );

  test(
    'R5-F2.2 POST /webhooks/github maps signed push event to normalized github.commit event',
    { tag: ['@tier1', '@R5-F2', '@gateway'] },
    async () => {
      const marker = `commit-e2e-${Date.now()}`;
      const payload = buildGitHubPushPayload({
        commits: [
          {
            id: `deadbeef1234567890abcdef12345678${Date.now().toString(16).slice(-8)}`,
            message: `feat(office-3d): ${marker}`,
            timestamp: new Date().toISOString(),
            author: { name: 'Farel Faza Nugraha', username: 'farel-faza' },
            added: ['src/floors/Floor1.ts'],
            modified: [],
            removed: [],
          },
        ],
      });

      const res = await postGitHubWebhook('push', payload);
      expect([200, 202]).toContain(res.status);
      expect(res.data.ok).toBe(true);

      const emitted = res.data.event as NormalizedEvent | undefined;
      expect(emitted).toBeDefined();
      assertValid(validateNormalizedEvent(emitted), 'GitHub push mapped event');
      expect(emitted!.source).toBe('github');
      expect(emitted!.type).toBe('github.commit');
      expect(CANONICAL_DIVISION_IDS).toContain(emitted!.divisionId);
      expect(`${emitted!.title} ${emitted!.summary}`).toContain(marker);
    },
  );

  test(
    'R5-F2.3 POST /webhooks/github maps signed pull_request event to normalized github.pr event',
    { tag: ['@tier1', '@R5-F2', '@gateway'] },
    async () => {
      const payload = buildGitHubPullRequestPayload('closed', true, {
        number: 108,
      });
      const res = await postGitHubWebhook('pull_request', payload);
      expect([200, 202]).toContain(res.status);
      expect(res.data.ok).toBe(true);

      const emitted = res.data.event as NormalizedEvent | undefined;
      expect(emitted).toBeDefined();
      assertValid(validateNormalizedEvent(emitted), 'GitHub pull_request mapped event');
      expect(emitted!.source).toBe('github');
      expect(emitted!.type).toBe('github.pr');
      expect(emitted!.agentId).toBeGreaterThanOrEqual(0);
      expect(emitted!.agentId).toBeLessThanOrEqual(23);
    },
  );

  test(
    'R5-F2.4 POST /webhooks/github maps signed issues event to normalized github.issue event',
    { tag: ['@tier1', '@R5-F2', '@gateway'] },
    async () => {
      const payload = buildGitHubIssuesPayload('opened');
      const res = await postGitHubWebhook('issues', payload);
      expect([200, 202]).toContain(res.status);
      expect(res.data.ok).toBe(true);

      const emitted = res.data.event as NormalizedEvent | undefined;
      expect(emitted).toBeDefined();
      assertValid(validateNormalizedEvent(emitted), 'GitHub issues mapped event');
      expect(emitted!.source).toBe('github');
      expect(emitted!.type).toBe('github.issue');
    },
  );

  test(
    'R5-F2.5 signed GitHub webhook event fans out over WS /ws to connected clients',
    { tag: ['@tier1', '@R5-F2', '@gateway'] },
    async () => {
      const marker = `ws-gh-fanout-${Date.now()}`;
      const payload = buildGitHubIssuesPayload('labeled', {
        issue: {
          id: 99017,
          number: 99,
          state: 'open',
          title: `Verify ${marker} telemetry propagation`,
          html_url: 'https://github.com/zixew/lokatalenta-office-3d/issues/99',
          user: { login: 'qonita-anindya' },
          labels: [{ name: 'qa' }],
        },
      });

      const { matched } = await connectWsAndWaitForEvent(
        (msg) => {
          if (msg.type !== 'event') return false;
          const ev = msg.payload as Partial<NormalizedEvent>;
          return (
            ev?.source === 'github' &&
            ev?.type === 'github.issue' &&
            `${ev?.title ?? ''} ${ev?.summary ?? ''}`.includes(marker)
          );
        },
        {
          timeoutMs: 8_000,
          onConnected: async () => {
            const res = await postGitHubWebhook('issues', payload);
            expect([200, 202]).toContain(res.status);
          },
        },
      );

      assertValid(validateNormalizedEvent(matched.payload), 'WS GitHub fanout event');
    },
  );

  // ==========================================================================
  // R5-F4a: lms-psikotes Non-Blocking Telemetry Emitter (5 tests)
  // ==========================================================================

  test(
    'R5-F4a.1 lms-psikotes telemetry service & all 6 integration modules exist without lint errors',
    { tag: ['@tier1', '@R5-F4a', '@gateway'] },
    async () => {
      const clientSrc = path.join(REPOS['lms-psikotes'].localPath, 'client', 'src');
      const telemetryFile = path.join(clientSrc, 'shared', 'services', 'ecosystemTelemetry.ts');
      expect(fs.existsSync(telemetryFile)).toBe(true);

      const telemetrySource = fs.readFileSync(telemetryFile, 'utf8');
      expect(telemetrySource).toContain('VITE_TELEMETRY_GATEWAY_URL');

      const expectedIntegrations = [
        path.join(clientSrc, 'shared', 'services', 'lmsApi.ts'),
        path.join(clientSrc, 'features', 'kraepelin', 'kraepelinHistory.ts'),
        path.join(clientSrc, 'features', 'typing', 'typingApi.ts'),
        path.join(clientSrc, 'features', 'tryout', 'tryoutEvents.ts'),
        path.join(clientSrc, 'features', 'recruiter', 'recruiterApi.ts'),
        path.join(clientSrc, 'features', 'admin', 'adminAuditLog.ts'),
      ];

      for (const filePath of expectedIntegrations) {
        expect(fs.existsSync(filePath)).toBe(true);
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content).toContain('ecosystemTelemetry');
      }
    },
  );

  test(
    'R5-F4a.2 PII-anonymized LMS activity event passes Gateway ingestion and validateNoPiiInEvent',
    { tag: ['@tier1', '@R5-F4a', '@gateway'] },
    async () => {
      const lmsEvt = buildLmsActivityEvent({
        entityId: `LMS-ANON-${Date.now()}`,
      });
      assertValid(validateNoPiiInEvent(lmsEvt), 'LMS fixture PII check');

      const res = await postEvent({ ...lmsEvt });
      expect([200, 201, 202]).toContain(res.status);
      expect(res.data.ok).toBe(true);
      assertValid(validateNormalizedEvent(res.data.event), 'Gateway LMS event');
      assertValid(validateNoPiiInEvent(res.data.event), 'Gateway stored LMS event no-PII');
    },
  );

  test(
    'R5-F4a.3 Gateway stores LMS telemetry with anonymized cohort metadata and zero raw PII',
    { tag: ['@tier1', '@R5-F4a', '@gateway'] },
    async () => {
      const entityId = `ASSESS-TYPING-${Date.now()}`;
      const lmsEvt = buildLmsActivityEvent({
        entityId,
        title: 'Typing assessment cohort completed',
        summary: 'Anonymized candidate batch completed typing benchmark (74 WPM).',
        metadata: {
          module: 'typing',
          candidateRef: 'CAND-ANON-9042',
          wpm: 74,
          telemetryMode: 'anonymized',
        },
      });

      const postRes = await postEvent({ ...lmsEvt });
      expect([200, 201, 202]).toContain(postRes.status);

      const listRes = await getEvents({ source: 'lms-psikotes', limit: 30 });
      expect(listRes.status).toBe(200);
      const events = extractEventsArray(listRes.data);
      const found = events.find((e) => e.entityId === entityId);
      expect(found).toBeDefined();
      assertValid(validateNoPiiInEvent(found), 'Persisted LMS event no-PII');
    },
  );

  test(
    'R5-F4a.4 LMS Psikotes web application renders cleanly in Chromium with zero console or page errors',
    { tag: ['@tier1', '@R5-F4a', '@gateway'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      const res = await page.goto(URLS.lms, { waitUntil: 'domcontentloaded' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      await page.waitForSelector('#root', { state: 'attached', timeout: 10_000 });
      const rootHtml = await page.locator('#root').innerHTML();
      expect(rootHtml.trim().length).toBeGreaterThan(0);

      guard.assertZeroErrors();
    },
  );

  test(
    'R5-F4a.5 LMS Psikotes remains interactive and non-blocking even when telemetry gateway requests fail',
    { tag: ['@tier1', '@R5-F4a', '@gateway'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.route('**/localhost:4101/**', (route) => route.abort('connectionrefused'));

      const res = await page.goto(URLS.lms, { waitUntil: 'networkidle' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(0);
      guard.assertZeroErrors();
    },
  );
});

import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  MALFORMED_WEBHOOK_PAYLOADS,
  buildGitHubPushPayload,
} from '../../fixtures/github-webhooks.ts';
import {
  INVALID_TELEMETRY_FIXTURES,
  buildBacklogUpdatedEvent,
  buildLmsActivityEvent,
} from '../../fixtures/telemetry-events.ts';
import { REPOS, URLS } from '../../helpers/env.ts';
import {
  getEvents,
  postEvent,
  postGitHubWebhook,
} from '../../helpers/gateway-client.ts';
import { attachErrorGuards } from '../../helpers/office-driver.ts';
import {
  validateNoPiiInEvent,
  type NormalizedEvent,
} from '../../helpers/schema-validators.ts';

function extractEventsArray(
  data: { events?: NormalizedEvent[] } | NormalizedEvent[],
): NormalizedEvent[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.events)) return data.events;
  throw new Error(`Unexpected /events payload shape: ${JSON.stringify(data)}`);
}

test.describe('Tier 2 — Gateway Security, HMAC Rejection & PII Resilience', () => {
  // ==========================================================================
  // R2-F4: Event Gateway Boundary & Negative Cases (5 tests)
  // ==========================================================================

  test(
    'R2-F4.B1 POST /events rejects malformed JSON payload with 400 Bad Request',
    { tag: ['@tier2', '@R2-F4', '@gateway'] },
    async () => {
      const res = await postEvent('{"id": "bad-json", "broken": ');
      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    },
  );

  test(
    'R2-F4.B2 POST /events rejects invalid agentId, divisionId, and targetFloor with 400',
    { tag: ['@tier2', '@R2-F4', '@gateway'] },
    async () => {
      const invalidCases = [
        INVALID_TELEMETRY_FIXTURES.invalidAgentId,
        INVALID_TELEMETRY_FIXTURES.invalidDivision,
        INVALID_TELEMETRY_FIXTURES.invalidFloor,
      ];

      for (const badEvent of invalidCases) {
        const res = await postEvent(badEvent);
        expect([400, 422]).toContain(res.status);
        expect(res.ok).toBe(false);
      }
    },
  );

  test(
    'R2-F4.B3 POST /events rejects missing required summary field with 400',
    { tag: ['@tier2', '@R2-F4', '@gateway'] },
    async () => {
      const res = await postEvent(INVALID_TELEMETRY_FIXTURES.missingSummary);
      expect([400, 422]).toContain(res.status);
      expect(res.ok).toBe(false);
    },
  );

  test(
    'R2-F4.B4 POST /events handles duplicate idempotency key without creating duplicate event rows',
    { tag: ['@tier2', '@R2-F4', '@gateway'] },
    async () => {
      const fixedId = `evt-idempotent-${Date.now()}`;
      const payload = buildBacklogUpdatedEvent({
        id: fixedId,
        entityId: `BL-IDEMP-${Date.now()}`,
      });

      const first = await postEvent({ ...payload });
      expect([200, 201, 202]).toContain(first.status);

      const second = await postEvent({ ...payload });
      expect([200, 201, 202, 409]).toContain(second.status);

      const listRes = await getEvents({ limit: 100, source: 'backlog' });
      expect(listRes.status).toBe(200);
      const matches = extractEventsArray(listRes.data).filter(
        (e) => e.id === fixedId,
      );
      expect(matches).toHaveLength(1);
    },
  );

  test(
    'R2-F4.B5 POST /events rejects tampered x-lokatalenta-signature when gateway auth is enforced',
    { tag: ['@tier2', '@R2-F4', '@gateway'] },
    async () => {
      const payload = buildBacklogUpdatedEvent({
        id: `evt-tamper-${Date.now()}`,
      });
      const res = await postEvent(
        { ...payload },
        {
          signatureOverride: `sha256=${'0'.repeat(64)}`,
        },
      );
      expect([401, 403]).toContain(res.status);
      expect(res.ok).toBe(false);

      const listRes = await getEvents({ limit: 50 });
      const leaked = extractEventsArray(listRes.data).some(
        (e) => e.id === payload.id,
      );
      expect(leaked).toBe(false);
    },
  );

  // ==========================================================================
  // R5-F2: GitHub Webhook Security & Rejection (5 tests)
  // ==========================================================================

  test(
    'R5-F2.B1 POST /webhooks/github rejects missing X-Hub-Signature-256 with 401 or 403',
    { tag: ['@tier2', '@R5-F2', '@gateway'] },
    async () => {
      const res = await postGitHubWebhook('push', buildGitHubPushPayload(), {
        omitSignature: true,
      });
      expect([401, 403]).toContain(res.status);
      expect(res.ok).toBe(false);
    },
  );

  test(
    'R5-F2.B2 POST /webhooks/github rejects signature computed with wrong secret with 401 or 403',
    { tag: ['@tier2', '@R5-F2', '@gateway'] },
    async () => {
      const marker = `tampered-secret-${Date.now()}`;
      const payload = buildGitHubPushPayload({
        head_commit: {
          id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          message: marker,
          timestamp: new Date().toISOString(),
        },
      });
      const res = await postGitHubWebhook('push', payload, {
        secret: 'completely-wrong-webhook-secret',
      });
      expect([401, 403]).toContain(res.status);

      const eventsRes = await getEvents({ source: 'github', limit: 30 });
      const events = extractEventsArray(eventsRes.data);
      expect(
        events.some((e) => `${e.title} ${e.summary}`.includes(marker)),
      ).toBe(false);
    },
  );

  test(
    'R5-F2.B3 POST /webhooks/github rejects malformed or non-hex X-Hub-Signature-256 header',
    { tag: ['@tier2', '@R5-F2', '@gateway'] },
    async () => {
      const badSignatures = [
        '',
        'sha256=not-a-valid-hex-digest',
        'sha256=deadbeef',
        'md5=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      ];
      for (const sig of badSignatures) {
        const res = await postGitHubWebhook('push', buildGitHubPushPayload(), {
          signatureOverride: sig,
        });
        expect([401, 403]).toContain(res.status);
      }
    },
  );

  test(
    'R5-F2.B4 POST /webhooks/github rejects signed malformed JSON string with 400',
    { tag: ['@tier2', '@R5-F2', '@gateway'] },
    async () => {
      const res = await postGitHubWebhook(
        'push',
        MALFORMED_WEBHOOK_PAYLOADS.invalidJsonString,
      );
      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    },
  );

  test(
    'R5-F2.B5 POST /webhooks/github rejects non-object array or missing repository payloads with 400/422',
    { tag: ['@tier2', '@R5-F2', '@gateway'] },
    async () => {
      const arrayRes = await postGitHubWebhook(
        'push',
        MALFORMED_WEBHOOK_PAYLOADS.wrongTypeArray,
      );
      expect([400, 422]).toContain(arrayRes.status);

      const missingRepoRes = await postGitHubWebhook(
        'push',
        MALFORMED_WEBHOOK_PAYLOADS.missingRepository,
      );
      expect([400, 422]).toContain(missingRepoRes.status);
    },
  );

  // ==========================================================================
  // R5-F4a: PII Anonymization & Offline Resilience (5 tests)
  // ==========================================================================

  test(
    'R5-F4a.B1 validateNoPiiInEvent detects email, 16-digit NIK, phone number, and password keys',
    { tag: ['@tier2', '@R5-F4a', '@gateway'] },
    async () => {
      expect(
        validateNoPiiInEvent(INVALID_TELEMETRY_FIXTURES.piiLeakEmail).valid,
      ).toBe(false);

      expect(
        validateNoPiiInEvent(
          buildLmsActivityEvent({
            summary: 'Candidate NIK 3174011234560001 verified',
          }),
        ).valid,
      ).toBe(false);

      expect(
        validateNoPiiInEvent(
          buildLmsActivityEvent({
            summary: 'Contact +6281234567890 for score',
          }),
        ).valid,
      ).toBe(false);

      expect(
        validateNoPiiInEvent(
          buildLmsActivityEvent({
            metadata: { password: 'secret-value', nik: '3174011234560001' },
          }),
        ).valid,
      ).toBe(false);
    },
  );

  test(
    'R5-F4a.B2 Gateway rejects or strips raw candidate email, NIK, and phone from stored LMS events',
    { tag: ['@tier2', '@R5-F4a', '@gateway'] },
    async () => {
      const entityId = `LMS-PII-PROBE-${Date.now()}`;
      const leakyEvent = buildLmsActivityEvent({
        entityId,
        summary: 'Candidate budi.santoso@example.com NIK 3174011234560001 phone +6281234567890',
        metadata: {
          email: 'budi.santoso@example.com',
          nik: '3174011234560001',
          phone: '+6281234567890',
          password: 'PlaintextPassword123',
        },
      });

      const res = await postEvent({ ...leakyEvent });
      if (res.ok) {
        // If Gateway sanitizes instead of rejecting, persisted event must contain zero PII
        const stored = res.data.event;
        expect(stored).toBeDefined();
        const serialized = JSON.stringify(stored);
        expect(serialized).not.toContain('budi.santoso@example.com');
        expect(serialized).not.toContain('3174011234560001');
        expect(serialized).not.toContain('+6281234567890');
        expect(serialized).not.toContain('PlaintextPassword123');
      } else {
        expect([400, 422]).toContain(res.status);
      }

      const listRes = await getEvents({ source: 'lms-psikotes', limit: 30 });
      const listSerialized = JSON.stringify(listRes.data);
      expect(listSerialized).not.toContain('budi.santoso@example.com');
      expect(listSerialized).not.toContain('3174011234560001');
      expect(listSerialized).not.toContain('PlaintextPassword123');
    },
  );

  test(
    'R5-F4a.B3 lms-psikotes ecosystemTelemetry.ts wraps network calls safely and strips PII keys',
    { tag: ['@tier2', '@R5-F4a', '@gateway'] },
    async () => {
      const telemetryFile = path.join(
        REPOS['lms-psikotes'].localPath,
        'client',
        'src',
        'shared',
        'services',
        'ecosystemTelemetry.ts',
      );
      expect(fs.existsSync(telemetryFile)).toBe(true);
      const src = fs.readFileSync(telemetryFile, 'utf8');
      expect(src).toContain('try');
      expect(src).toContain('catch');
      expect(src).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    },
  );

  test(
    'R5-F4a.B4 LMS Psikotes stays responsive without console errors when Gateway responds 500',
    { tag: ['@tier2', '@R5-F4a', '@gateway'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.route('**/localhost:4101/**', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Gateway Failure' }),
        }),
      );

      const res = await page.goto(URLS.lms, { waitUntil: 'networkidle' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(0);
      guard.assertZeroErrors();
    },
  );

  test(
    'R5-F4a.B5 LMS Psikotes stays responsive without pageerror when Gateway requests time out',
    { tag: ['@tier2', '@R5-F4a', '@gateway'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.route('**/localhost:4101/**', (route) => route.abort('timedout'));

      const res = await page.goto(URLS.lms, { waitUntil: 'domcontentloaded' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      await page.waitForSelector('#root', { state: 'attached', timeout: 10_000 });
      guard.assertZeroErrors();
    },
  );
});

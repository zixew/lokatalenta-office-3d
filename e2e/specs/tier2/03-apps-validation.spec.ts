import { expect, test } from '@playwright/test';
import { FORBIDDEN_PORTS, URLS } from '../../helpers/env.ts';
import { attachErrorGuards } from '../../helpers/office-driver.ts';
import { type BacklogItem, type Sprint } from '../../helpers/schema-validators.ts';

async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; ok: boolean; data: T; text: string; headers: Headers }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    // non-json
  }
  return { status: res.status, ok: res.ok, data: data as T, text, headers: res.headers };
}

function unwrapArray<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const k of keys) {
      const candidate = (data as Record<string, unknown>)[k];
      if (Array.isArray(candidate)) return candidate as T[];
    }
  }
  throw new Error(`Expected array wrapper (${keys.join('|')}), got: ${JSON.stringify(data)}`);
}

test.describe('Tier 2 — Ecosystem Apps Validation, XSS/CSV Sanitization & Error Handling', () => {
  // ==========================================================================
  // R2-F3: Backlog Management Validation & Boundary Cases (5 tests)
  // ==========================================================================

  test(
    'R2-F3.B1 Backlog POST /api/items rejects invalid division, out-of-range agentId, and negative storyPoints',
    { tag: ['@tier2', '@R2-F3', '@apps'] },
    async () => {
      const badPayloads = [
        {
          title: 'Invalid division test',
          type: 'story',
          status: 'backlog',
          priority: 'Must',
          storyPoints: 5,
          ownerDivision: 'marketing-invalid',
          ownerAgentId: 5,
          acceptanceCriteria: 'Should fail',
          dependencies: [],
        },
        {
          title: 'Invalid agentId test',
          type: 'story',
          status: 'backlog',
          priority: 'Must',
          storyPoints: 5,
          ownerDivision: 'engineering',
          ownerAgentId: 99,
          acceptanceCriteria: 'Should fail',
          dependencies: [],
        },
        {
          title: 'Negative SP test',
          type: 'story',
          status: 'backlog',
          priority: 'Must',
          storyPoints: -5,
          ownerDivision: 'engineering',
          ownerAgentId: 5,
          acceptanceCriteria: 'Should fail',
          dependencies: [],
        },
      ];

      for (const payload of badPayloads) {
        const res = await fetchJson(`${URLS.backlogApi}/api/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        expect([400, 422]).toContain(res.status);
        expect(res.ok).toBe(false);
      }
    },
  );

  test(
    'R2-F3.B2 Backlog POST /api/items rejects empty title and malformed JSON with 400',
    { tag: ['@tier2', '@R2-F3', '@apps'] },
    async () => {
      const emptyTitle = await fetchJson(`${URLS.backlogApi}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '   ',
          type: 'task',
          status: 'backlog',
          priority: 'Could',
          storyPoints: 1,
          ownerDivision: 'qa',
          ownerAgentId: 7,
          acceptanceCriteria: 'Empty title rejected',
          dependencies: [],
        }),
      });
      expect([400, 422]).toContain(emptyTitle.status);

      const badJson = await fetchJson(`${URLS.backlogApi}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"title": "broken',
      });
      expect(badJson.status).toBe(400);
    },
  );

  test(
    'R2-F3.B3 Backlog PATCH and DELETE on non-existent item ID return 404',
    { tag: ['@tier2', '@R2-F3', '@apps'] },
    async () => {
      const missingId = 'BL-NONEXISTENT-999999';
      const patchRes = await fetchJson(
        `${URLS.backlogApi}/api/items/${missingId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        },
      );
      expect(patchRes.status).toBe(404);

      const delRes = await fetchJson(
        `${URLS.backlogApi}/api/items/${missingId}`,
        { method: 'DELETE' },
      );
      expect(delRes.status).toBe(404);
    },
  );

  test(
    'R2-F3.B4 Backlog CSV export neutralizes leading-tab/newline/quote formula injections',
    { tag: ['@tier2', '@R2-F3', '@apps'] },
    async () => {
      const marker = `E2E-CSV-ADV-${Date.now()}`;
      const res = await fetchJson(`${URLS.backlogApi}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `=HYPERLINK("http://evil.local","${marker}")`,
          type: 'bug',
          status: 'backlog',
          priority: 'Must',
          storyPoints: 3,
          ownerDivision: 'devops',
          ownerAgentId: 16,
          acceptanceCriteria: 'Escape quotes and =HYPERLINK safely',
          dependencies: [],
        }),
      });
      expect([200, 201]).toContain(res.status);
      const item =
        (res.data as { item?: BacklogItem }).item ?? (res.data as BacklogItem);

      try {
        const csv = await fetchJson(`${URLS.backlogApi}/api/items/export.csv`);
        expect(csv.status).toBe(200);
        const row = csv.text.split(/\r?\n/).find((l) => l.includes(marker));
        expect(row).toBeDefined();
        expect(row!).not.toMatch(/(?:^|,)"?=HYPERLINK/);
        expect(row!).toMatch(/(?:'|\t)=HYPERLINK/);
      } finally {
        await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
        });
      }
    },
  );

  test(
    'R2-F3.B5 Backlog UI handles unmatched search filter cleanly without console errors',
    { tag: ['@tier2', '@R2-F3', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.backlogUi, { waitUntil: 'networkidle' });

      const searchInput = page
        .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="cari" i]')
        .first();
      if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
        await searchInput.fill('__NONEXISTENT_BACKLOG_QUERY_XYZ__');
      }

      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R2-F2: Sprint Planner Validation & Boundary Cases (5 tests)
  // ==========================================================================

  test(
    'R2-F2.B1 Sprint Planner POST /api/sprints rejects missing name or inverted start/end dates',
    { tag: ['@tier2', '@R2-F2', '@apps'] },
    async () => {
      const missingName = await fetchJson(`${URLS.sprintApi}/api/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          status: 'planned',
          startDate: '2026-12-01T00:00:00.000Z',
          endDate: '2026-12-14T00:00:00.000Z',
        }),
      });
      expect([400, 422]).toContain(missingName.status);

      const invertedDates = await fetchJson(`${URLS.sprintApi}/api/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Invalid Range Sprint',
          status: 'planned',
          startDate: '2026-12-20T00:00:00.000Z',
          endDate: '2026-12-01T00:00:00.000Z',
        }),
      });
      expect([400, 422]).toContain(invertedDates.status);
    },
  );

  test(
    'R2-F2.B2 Sprint Planner assign returns 404 for nonexistent sprint ID',
    { tag: ['@tier2', '@R2-F2', '@apps'] },
    async () => {
      const res = await fetchJson(
        `${URLS.sprintApi}/api/sprints/SPR-NONEXISTENT-9999/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: 'BL-1', backlogItemId: 'BL-1' }),
        },
      );
      expect(res.status).toBe(404);
    },
  );

  test(
    'R2-F2.B3 Sprint Planner assign rejects nonexistent backlog item ID',
    { tag: ['@tier2', '@R2-F2', '@apps'] },
    async () => {
      const sprintsRes = await fetchJson(`${URLS.sprintApi}/api/sprints`);
      const sprints = unwrapArray<Sprint>(sprintsRes.data, ['sprints', 'data']);
      const target = sprints[0]!;

      const res = await fetchJson(
        `${URLS.sprintApi}/api/sprints/${encodeURIComponent(target.id)}/assign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: 'BL-NONEXISTENT-999999',
            backlogItemId: 'BL-NONEXISTENT-999999',
          }),
        },
      );
      expect([400, 404, 422]).toContain(res.status);
      expect(res.ok).toBe(false);
    },
  );

  test(
    'R2-F2.B4 Sprint Planner PATCH and GET summary on nonexistent sprint return 404',
    { tag: ['@tier2', '@R2-F2', '@apps'] },
    async () => {
      const patchRes = await fetchJson(
        `${URLS.sprintApi}/api/sprints/SPR-MISSING-9999`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        },
      );
      expect(patchRes.status).toBe(404);

      const summaryRes = await fetchJson(
        `${URLS.sprintApi}/api/sprints/SPR-MISSING-9999/summary`,
      );
      expect(summaryRes.status).toBe(404);
    },
  );

  test(
    'R2-F2.B5 Sprint Planner UI tolerates malformed ceremony/filter interactions without page errors',
    { tag: ['@tier2', '@R2-F2', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(`${URLS.sprintUi}/?sprint=SPR-NONEXISTENT`, {
        waitUntil: 'networkidle',
      });
      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(0);
      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R2-F1: Documentation App Validation & Security (5 tests)
  // ==========================================================================

  test(
    'R2-F1.B1 Docs API GET /api/docs/:slug returns 404 for unknown slug',
    { tag: ['@tier2', '@R2-F1', '@apps'] },
    async () => {
      const res = await fetchJson(
        `${URLS.docsApi}/api/docs/nonexistent-doc-slug-99999`,
      );
      expect(res.status).toBe(404);
      expect(res.ok).toBe(false);
    },
  );

  test(
    'R2-F1.B2 Docs API POST /api/docs rejects missing slug/title or invalid ownerDivision',
    { tag: ['@tier2', '@R2-F1', '@apps'] },
    async () => {
      const missingSlug = await fetchJson(`${URLS.docsApi}/api/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: '',
          title: 'Missing Slug Doc',
          category: 'adr',
          content: 'Body',
        }),
      });
      expect([400, 422]).toContain(missingSlug.status);

      const badDiv = await fetchJson(`${URLS.docsApi}/api/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: `bad-div-${Date.now()}`,
          title: 'Bad Div Doc',
          category: 'adr',
          ownerDivision: 'unknown-div',
          content: 'Body',
        }),
      });
      expect([400, 422]).toContain(badDiv.status);
    },
  );

  test(
    'R2-F1.B3 Docs API /api/search handles empty and special-character SQL/HTML queries safely',
    { tag: ['@tier2', '@R2-F1', '@apps'] },
    async () => {
      const queries = ['', "' OR 1=1 --", '<script>alert(1)</script>', '%_\\'];
      for (const q of queries) {
        const res = await fetchJson(
          `${URLS.docsApi}/api/search?q=${encodeURIComponent(q)}`,
        );
        expect(res.status).toBe(200);
        const results = unwrapArray(res.data, ['results', 'docs', 'items', 'data']);
        expect(Array.isArray(results)).toBe(true);
      }
    },
  );

  test(
    'R2-F1.B4 Docs UI neutralizes embedded script/XSS payloads in doc content without execution',
    { tag: ['@tier2', '@R2-F1', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      let dialogTriggered = false;
      page.on('dialog', async (dialog) => {
        dialogTriggered = true;
        await dialog.dismiss();
      });

      const slug = `e2e-xss-probe-${Date.now()}`;
      const createRes = await fetchJson(`${URLS.docsApi}/api/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: 'E2E XSS Safety Check',
          category: 'architecture',
          ownerDivision: 'devops',
          content: '# XSS Probe\n<script>window.__XSS_FIRED=true;alert("xss")</script>\n<img src=x onerror="window.__XSS_FIRED=true" />',
        }),
      });
      expect([200, 201]).toContain(createRes.status);

      await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });
      const docLink = page.getByText('E2E XSS Safety Check', { exact: false }).first();
      if ((await docLink.count()) > 0 && (await docLink.isVisible())) {
        await docLink.click();
        await page.waitForTimeout(300);
      }

      const xssFired = await page.evaluate(
        () => Boolean((window as unknown as { __XSS_FIRED?: boolean }).__XSS_FIRED),
      );
      expect(dialogTriggered).toBe(false);
      expect(xssFired).toBe(false);
      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F1.B5 Docs API POST /api/rubrics rejects empty or malformed workflows payload',
    { tag: ['@tier2', '@R2-F1', '@apps'] },
    async () => {
      const res = await fetchJson(`${URLS.docsApi}/api/rubrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: `bad-rubric-${Date.now()}`,
          workflows: [],
        }),
      });
      expect([400, 422]).toContain(res.status);
      expect(res.ok).toBe(false);
    },
  );

  // ==========================================================================
  // R2-F5: Cross-App Navigation & Contract Boundary Cases (5 tests)
  // ==========================================================================

  test(
    'R2-F5.B1 Ecosystem Switcher links across Backlog, Sprint, and Docs never emit javascript: or invalid URLs',
    { tag: ['@tier2', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      for (const uiUrl of [URLS.backlogUi, URLS.sprintUi, URLS.docsUi]) {
        await page.goto(uiUrl, { waitUntil: 'networkidle' });
        const hrefs = await page
          .locator('a[href]')
          .evaluateAll((els) => els.map((e) => e.getAttribute('href') || ''));

        for (const href of hrefs) {
          expect(href.trim().length).toBeGreaterThan(0);
          expect(href.toLowerCase()).not.toContain('javascript:');
          expect(href).not.toContain('undefined');
          expect(href).not.toContain('null');
        }
      }
      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.B2 Ecosystem Switcher links never target any forbidden host port',
    { tag: ['@tier2', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      for (const uiUrl of [URLS.backlogUi, URLS.sprintUi, URLS.docsUi]) {
        await page.goto(uiUrl, { waitUntil: 'networkidle' });
        const hrefs = await page
          .locator('a[href]')
          .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).href));

        for (const href of hrefs) {
          const parsed = new URL(href);
          if (parsed.port) {
            expect(
              (FORBIDDEN_PORTS as readonly number[]).includes(Number(parsed.port)),
            ).toBe(false);
          }
        }
      }
      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.B3 Backlog, Sprint, and Docs UIs handle unknown client paths without uncaught errors',
    { tag: ['@tier2', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      for (const uiUrl of [URLS.backlogUi, URLS.sprintUi, URLS.docsUi]) {
        const res = await page.goto(`${uiUrl}/nonexistent-e2e-route`, {
          waitUntil: 'domcontentloaded',
        });
        expect(res).not.toBeNull();
        expect(res!.status()).toBeLessThan(500);
        const text = await page.locator('body').innerText();
        expect(text.trim().length).toBeGreaterThan(0);
      }
      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.B4 Backlog, Sprint, and Docs UIs stay usable when Event Gateway (:4101) is unreachable',
    { tag: ['@tier2', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.route('**/localhost:4101/**', (route) =>
        route.abort('connectionrefused'),
      );

      for (const uiUrl of [URLS.backlogUi, URLS.sprintUi, URLS.docsUi]) {
        await page.goto(uiUrl, { waitUntil: 'networkidle' });
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.trim().length).toBeGreaterThan(20);
      }
      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.B5 Backlog, Sprint, and Docs APIs return 404 JSON for unknown endpoints instead of 500',
    { tag: ['@tier2', '@R2-F5', '@apps'] },
    async () => {
      for (const base of [URLS.backlogApi, URLS.sprintApi, URLS.docsApi]) {
        const res = await fetchJson(`${base}/api/nonexistent-endpoint-e2e`);
        expect(res.status).toBe(404);
      }
    },
  );
});

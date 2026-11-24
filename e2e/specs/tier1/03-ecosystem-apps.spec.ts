import { expect, test } from '@playwright/test';
import { FORBIDDEN_PORTS, URLS, assertPortNotForbidden } from '../../helpers/env.ts';
import { getEvents } from '../../helpers/gateway-client.ts';
import { attachErrorGuards } from '../../helpers/office-driver.ts';
import {
  assertValid,
  validateBacklogItem,
  validateDocEntry,
  validateRubricEvaluation,
  validateSprint,
  type BacklogItem,
  type DocEntry,
  type NormalizedEvent,
  type RubricEvaluation,
  type Sprint,
} from '../../helpers/schema-validators.ts';

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
    // non-JSON
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
  throw new Error(`Expected array or wrapper (${keys.join('|')}), got: ${JSON.stringify(data)}`);
}

function unwrapObject<T>(data: unknown, keys: string[]): T {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const k of keys) {
      const candidate = (data as Record<string, unknown>)[k];
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        return candidate as T;
      }
    }
    return data as T;
  }
  throw new Error(`Expected object wrapper (${keys.join('|')}), got: ${JSON.stringify(data)}`);
}

test.describe('Tier 1 — Ecosystem Apps (Backlog, Sprint Planner, Docs, Switcher)', () => {
  // ==========================================================================
  // R2-F3: Backlog Management App (5 tests)
  // ==========================================================================

  test(
    'R2-F3.1 Backlog API /api/health and /api/stats return 200 healthy metrics',
    { tag: ['@tier1', '@R2-F3', '@apps'] },
    async () => {
      const health = await fetchJson<Record<string, unknown>>(`${URLS.backlogApi}/api/health`);
      expect(health.status).toBe(200);
      expect(health.ok).toBe(true);

      const stats = await fetchJson<Record<string, unknown>>(`${URLS.backlogApi}/api/stats`);
      expect(stats.status).toBe(200);
      expect(stats.data).toBeTruthy();
      expect(typeof stats.data).toBe('object');
    },
  );

  test(
    'R2-F3.2 Backlog API supports full CRUD lifecycle (POST -> GET -> PATCH -> DELETE) with schema validity',
    { tag: ['@tier1', '@R2-F3', '@apps'] },
    async () => {
      const uniqueTitle = `E2E Backlog CRUD ${Date.now()}`;
      const createRes = await fetchJson(`${URLS.backlogApi}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: uniqueTitle,
          type: 'story',
          status: 'groomed',
          priority: 'Must',
          storyPoints: 5,
          ownerDivision: 'engineering',
          ownerAgentId: 5,
          acceptanceCriteria: ['Given API request, When persisted, Then valid'],
          dependencies: [],
        }),
      });
      expect([200, 201]).toContain(createRes.status);
      const created = unwrapObject<BacklogItem>(createRes.data, ['item', 'data']);
      assertValid(validateBacklogItem(created), 'Created BacklogItem');
      expect(created.title).toBe(uniqueTitle);

      try {
        const listRes = await fetchJson(`${URLS.backlogApi}/api/items`);
        expect(listRes.status).toBe(200);
        const items = unwrapArray<BacklogItem>(listRes.data, ['items', 'data']);
        expect(items.some((i) => i.id === created.id)).toBe(true);

        const patchRes = await fetchJson(
          `${URLS.backlogApi}/api/items/${encodeURIComponent(created.id)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_sprint', storyPoints: 8 }),
          },
        );
        expect(patchRes.status).toBe(200);
        const updated = unwrapObject<BacklogItem>(patchRes.data, ['item', 'data']);
        expect(updated.storyPoints).toBe(8);
        expect(updated.status).toBe('in_sprint');
      } finally {
        const delRes = await fetchJson(
          `${URLS.backlogApi}/api/items/${encodeURIComponent(created.id)}`,
          { method: 'DELETE' },
        );
        expect([200, 204]).toContain(delRes.status);
      }
    },
  );

  test(
    'R2-F3.3 Backlog CSV export applies sanitizeCsvCell to neutralize spreadsheet formula prefixes',
    { tag: ['@tier1', '@R2-F3', '@apps'] },
    async () => {
      const marker = `E2E-CSV-${Date.now()}`;
      const dangerousPayloads = [
        `=CMD|'/C calc'!A0 ${marker}`,
        `+1+1 ${marker}`,
        `-1+1 ${marker}`,
        `@SUM(1,1) ${marker}`,
      ];
      const createdIds: string[] = [];

      try {
        for (const payloadTitle of dangerousPayloads) {
          const res = await fetchJson(`${URLS.backlogApi}/api/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: payloadTitle,
              type: 'task',
              status: 'backlog',
              priority: 'Should',
              storyPoints: 2,
              ownerDivision: 'qa',
              ownerAgentId: 7,
              acceptanceCriteria: 'CSV cell formula prefix must be neutralized',
              dependencies: [],
            }),
          });
          expect([200, 201]).toContain(res.status);
          const item = unwrapObject<BacklogItem>(res.data, ['item', 'data']);
          createdIds.push(item.id);
        }

        const csvRes = await fetchJson(`${URLS.backlogApi}/api/items/export.csv`);
        expect(csvRes.status).toBe(200);
        const contentType = csvRes.headers.get('content-type') || '';
        expect(contentType.toLowerCase()).toContain('text/csv');

        const lines = csvRes.text.split(/\r?\n/).filter((l) => l.includes(marker));
        expect(lines.length).toBe(dangerousPayloads.length);

        for (const line of lines) {
          // Dangerous cells must be quoted/escaped with leading apostrophe or tab (never bare =, +, -, @)
          expect(line).not.toMatch(/(?:^|,)"?(?:=CMD|\+1\+1|-1\+1|@SUM)/);
          expect(line).toMatch(/(?:'|\t)(?:=CMD|\+1\+1|-1\+1|@SUM)/);
        }
      } finally {
        for (const id of createdIds) {
          await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
        }
      }
    },
  );

  test(
    'R2-F3.4 Backlog item creation emits backlog.updated telemetry event to Event Gateway',
    { tag: ['@tier1', '@R2-F3', '@apps'] },
    async () => {
      const marker = `E2E-BL-EMIT-${Date.now()}`;
      const createRes = await fetchJson(`${URLS.backlogApi}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: marker,
          type: 'story',
          status: 'groomed',
          priority: 'Must',
          storyPoints: 3,
          ownerDivision: 'executive',
          ownerAgentId: 2,
          acceptanceCriteria: 'Given item created, When saved, Then gateway notified',
          dependencies: [],
        }),
      });
      expect([200, 201]).toContain(createRes.status);
      const created = unwrapObject<BacklogItem>(createRes.data, ['item', 'data']);

      try {
        await expect
          .poll(
            async () => {
              const evRes = await getEvents({ source: 'backlog', limit: 30 });
              const list = Array.isArray(evRes.data)
                ? evRes.data
                : (evRes.data.events ?? []);
              return list.some(
                (e: NormalizedEvent) =>
                  e.type === 'backlog.updated' &&
                  (e.entityId === created.id ||
                    `${e.title} ${e.summary}`.includes(marker)),
              );
            },
            { timeout: 6_000, intervals: [250] },
          )
          .toBe(true);
      } finally {
        await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(created.id)}`, {
          method: 'DELETE',
        });
      }
    },
  );

  test(
    'R2-F3.5 Backlog web UI loads and renders backlog items with zero console or page errors',
    { tag: ['@tier1', '@R2-F3', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      const res = await page.goto(URLS.backlogUi, { waitUntil: 'networkidle' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.trim().length).toBeGreaterThan(20);
      expect(bodyText.toLowerCase()).toMatch(/backlog|story|groom/);

      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R2-F2: Sprint Planning App (5 tests)
  // ==========================================================================

  test(
    'R2-F2.1 Sprint Planner API /api/health and /api/sprints return 200 valid Sprint data',
    { tag: ['@tier1', '@R2-F2', '@apps'] },
    async () => {
      const health = await fetchJson(`${URLS.sprintApi}/api/health`);
      expect(health.status).toBe(200);

      const sprintsRes = await fetchJson(`${URLS.sprintApi}/api/sprints`);
      expect(sprintsRes.status).toBe(200);
      const sprints = unwrapArray<Sprint>(sprintsRes.data, ['sprints', 'data']);
      expect(sprints.length).toBeGreaterThanOrEqual(1);
      assertValid(validateSprint(sprints[0]), 'GET /api/sprints[0]');
    },
  );

  test(
    'R2-F2.2 Sprint Planner creates and updates sprint capacity across divisions',
    { tag: ['@tier1', '@R2-F2', '@apps'] },
    async () => {
      const sprintName = `E2E Sprint ${Date.now()}`;
      const createRes = await fetchJson(`${URLS.sprintApi}/api/sprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sprintName,
          status: 'planned',
          startDate: '2026-12-01T00:00:00.000Z',
          endDate: '2026-12-15T00:00:00.000Z',
          capacityByDivision: {
            executive: 5,
            architecture: 8,
            engineering: 21,
            qa: 13,
            devops: 13,
            lounge: 5,
          },
        }),
      });
      expect([200, 201]).toContain(createRes.status);
      const sprint = unwrapObject<Sprint>(createRes.data, ['sprint', 'data']);
      assertValid(validateSprint(sprint), 'Created Sprint');

      const patchRes = await fetchJson(
        `${URLS.sprintApi}/api/sprints/${encodeURIComponent(sprint.id)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        },
      );
      expect(patchRes.status).toBe(200);
      const updated = unwrapObject<Sprint>(patchRes.data, ['sprint', 'data']);
      expect(updated.status).toBe('active');
    },
  );

  test(
    'R2-F2.3 Sprint Planner pulls Backlog item via POST /api/sprints/:id/assign and updates summary',
    { tag: ['@tier1', '@R2-F2', '@apps'] },
    async () => {
      const blRes = await fetchJson(`${URLS.backlogApi}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `E2E Pull Target ${Date.now()}`,
          type: 'story',
          status: 'groomed',
          priority: 'Must',
          storyPoints: 5,
          ownerDivision: 'engineering',
          ownerAgentId: 6,
          acceptanceCriteria: 'Given groomed item, When pulled, Then linked to sprint',
          dependencies: [],
        }),
      });
      expect([200, 201]).toContain(blRes.status);
      const blItem = unwrapObject<BacklogItem>(blRes.data, ['item', 'data']);

      try {
        const sprintsRes = await fetchJson(`${URLS.sprintApi}/api/sprints`);
        const sprints = unwrapArray<Sprint>(sprintsRes.data, ['sprints', 'data']);
        const targetSprint = sprints[0]!;

        const assignRes = await fetchJson(
          `${URLS.sprintApi}/api/sprints/${encodeURIComponent(targetSprint.id)}/assign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: blItem.id, backlogItemId: blItem.id }),
          },
        );
        expect([200, 201]).toContain(assignRes.status);

        const summaryRes = await fetchJson<Record<string, unknown>>(
          `${URLS.sprintApi}/api/sprints/${encodeURIComponent(targetSprint.id)}/summary`,
        );
        expect(summaryRes.status).toBe(200);
        expect(summaryRes.text).toContain(blItem.id);
      } finally {
        await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(blItem.id)}`, {
          method: 'DELETE',
        });
      }
    },
  );

  test(
    'R2-F2.4 Sprint Planner records ceremony notes and emits sprint.updated to Event Gateway',
    { tag: ['@tier1', '@R2-F2', '@apps'] },
    async () => {
      const sprintsRes = await fetchJson(`${URLS.sprintApi}/api/sprints`);
      const sprints = unwrapArray<Sprint>(sprintsRes.data, ['sprints', 'data']);
      const targetSprint = sprints[0]!;
      const noteMarker = `E2E ceremony note ${Date.now()}`;

      const cerRes = await fetchJson(
        `${URLS.sprintApi}/api/sprints/${encodeURIComponent(targetSprint.id)}/ceremonies`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'planning',
            facilitatorAgentId: 0,
            divisionId: 'executive',
            notes: noteMarker,
          }),
        },
      );
      expect([200, 201]).toContain(cerRes.status);

      await expect
        .poll(
          async () => {
            const evRes = await getEvents({ source: 'sprint-planner', limit: 30 });
            const list = Array.isArray(evRes.data)
              ? evRes.data
              : (evRes.data.events ?? []);
            return list.some(
              (e: NormalizedEvent) =>
                e.type === 'sprint.updated' && e.entityId === targetSprint.id,
            );
          },
          { timeout: 6_000, intervals: [250] },
        )
        .toBe(true);
    },
  );

  test(
    'R2-F2.5 Sprint Planner web UI renders active sprint board and capacity cleanly',
    { tag: ['@tier1', '@R2-F2', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      const res = await page.goto(URLS.sprintUi, { waitUntil: 'networkidle' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.toLowerCase()).toMatch(/sprint|capacity|velocity/);

      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R2-F1: Documentation App (5 tests)
  // ==========================================================================

  test(
    'R2-F1.1 Docs API /api/health and /api/docs return 200 valid DocEntry collection',
    { tag: ['@tier1', '@R2-F1', '@apps'] },
    async () => {
      const health = await fetchJson(`${URLS.docsApi}/api/health`);
      expect(health.status).toBe(200);

      const docsRes = await fetchJson(`${URLS.docsApi}/api/docs`);
      expect(docsRes.status).toBe(200);
      const docs = unwrapArray<DocEntry>(docsRes.data, ['docs', 'items', 'data']);
      expect(docs.length).toBeGreaterThanOrEqual(1);
      assertValid(validateDocEntry(docs[0]), 'GET /api/docs[0]');
    },
  );

  test(
    'R2-F1.2 Docs API supports POST -> GET /:slug -> PUT /:slug and emits doc.updated',
    { tag: ['@tier1', '@R2-F1', '@apps'] },
    async () => {
      const slug = `e2e-adr-${Date.now()}`;
      const createRes = await fetchJson(`${URLS.docsApi}/api/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title: 'E2E Test ADR',
          category: 'adr',
          ownerDivision: 'architecture',
          content: '# E2E Test ADR\nInitial architecture decision record.',
        }),
      });
      expect([200, 201]).toContain(createRes.status);
      const created = unwrapObject<DocEntry>(createRes.data, ['doc', 'data']);
      assertValid(validateDocEntry(created), 'Created DocEntry');

      const getRes = await fetchJson(`${URLS.docsApi}/api/docs/${encodeURIComponent(slug)}`);
      expect(getRes.status).toBe(200);
      const fetched = unwrapObject<DocEntry>(getRes.data, ['doc', 'data']);
      expect(fetched.slug).toBe(slug);

      const putRes = await fetchJson(`${URLS.docsApi}/api/docs/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'E2E Test ADR Updated',
          category: 'adr',
          ownerDivision: 'architecture',
          content: '# E2E Test ADR Updated\nAmended contract notes.',
        }),
      });
      expect(putRes.status).toBe(200);

      await expect
        .poll(
          async () => {
            const evRes = await getEvents({ source: 'docs', limit: 30 });
            const list = Array.isArray(evRes.data)
              ? evRes.data
              : (evRes.data.events ?? []);
            return list.some(
              (e: NormalizedEvent) =>
                e.type === 'doc.updated' &&
                (e.entityId === slug || `${e.title} ${e.summary}`.includes(slug)),
            );
          },
          { timeout: 6_000, intervals: [250] },
        )
        .toBe(true);
    },
  );

  test(
    'R2-F1.3 Docs API /api/search?q=gateway returns matching architecture/contract documents',
    { tag: ['@tier1', '@R2-F1', '@apps'] },
    async () => {
      const searchRes = await fetchJson(`${URLS.docsApi}/api/search?q=gateway`);
      expect(searchRes.status).toBe(200);
      const results = unwrapArray<DocEntry>(searchRes.data, ['results', 'docs', 'items', 'data']);
      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const entry of results) {
        assertValid(validateDocEntry(entry), 'Search DocEntry');
      }
    },
  );

  test(
    'R2-F1.4 Docs API /api/rubrics lists structured rubric evaluations',
    { tag: ['@tier1', '@R2-F1', '@apps'] },
    async () => {
      const rubricsRes = await fetchJson(`${URLS.docsApi}/api/rubrics`);
      expect(rubricsRes.status).toBe(200);
      const rubrics = unwrapArray<RubricEvaluation>(rubricsRes.data, [
        'rubrics',
        'items',
        'data',
      ]);
      expect(rubrics.length).toBeGreaterThanOrEqual(1);
      assertValid(validateRubricEvaluation(rubrics[0]), 'GET /api/rubrics[0]');
    },
  );

  test(
    'R2-F1.5 Docs web UI renders documentation hub, search bar, and content cleanly',
    { tag: ['@tier1', '@R2-F1', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      const res = await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      const bodyText = await page.locator('body').innerText();
      expect(bodyText.toLowerCase()).toMatch(/architecture|adr|documentation|contract/);

      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R2-F5: Cross-App Navigation & Contract Registry (5 tests)
  // ==========================================================================

  test(
    'R2-F5.1 Backlog UI displays unified Ecosystem Switcher with links across ecosystem apps',
    { tag: ['@tier1', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.backlogUi, { waitUntil: 'networkidle' });

      const links = await page.locator('a[href]').evaluateAll((els) =>
        els.map((el) => ({
          href: (el as HTMLAnchorElement).href,
          text: (el.textContent || '').trim(),
        })),
      );

      const joined = links.map((l) => l.href).join(' ');
      expect(joined).toContain('4113'); // Sprint UI
      expect(joined).toContain('4114'); // Docs UI
      expect(joined).toContain('4105'); // 3D Office
      expect(joined).toContain('4100'); // LMS Psikotes

      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.2 Sprint Planner UI displays unified Ecosystem Switcher without forbidden ports',
    { tag: ['@tier1', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.sprintUi, { waitUntil: 'networkidle' });

      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));

      expect(hrefs.some((h) => h.includes('4112'))).toBe(true); // Backlog UI
      expect(hrefs.some((h) => h.includes('4114'))).toBe(true); // Docs UI
      expect(hrefs.some((h) => h.includes('4105'))).toBe(true); // 3D Office

      for (const href of hrefs) {
        try {
          const parsed = new URL(href);
          if (parsed.port) {
            const portNum = Number(parsed.port);
            expect((FORBIDDEN_PORTS as readonly number[]).includes(portNum)).toBe(false);
            assertPortNotForbidden(portNum);
          }
        } catch {
          // relative href
        }
      }

      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.3 Docs UI displays unified Ecosystem Switcher linking to Backlog, Sprint, 3D Office, and LMS',
    { tag: ['@tier1', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });

      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).href));

      expect(hrefs.some((h) => h.includes('4112'))).toBe(true);
      expect(hrefs.some((h) => h.includes('4113'))).toBe(true);
      expect(hrefs.some((h) => h.includes('4105'))).toBe(true);
      expect(hrefs.some((h) => h.includes('4100'))).toBe(true);

      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.4 Navigating via Ecosystem Switcher between Docs, Backlog, and Sprint loads cleanly',
    { tag: ['@tier1', '@R2-F5', '@apps'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });

      const backlogLink = page.locator('a[href*="4112"]').first();
      await expect(backlogLink).toBeVisible();
      await backlogLink.click();
      await page.waitForURL(/4112/, { timeout: 10_000 });
      await page.waitForLoadState('networkidle');

      const sprintLink = page.locator('a[href*="4113"]').first();
      await expect(sprintLink).toBeVisible();
      await sprintLink.click();
      await page.waitForURL(/4113/, { timeout: 10_000 });
      await page.waitForLoadState('networkidle');

      guard.assertZeroErrors();
    },
  );

  test(
    'R2-F5.5 Docs Hub contains cross-app contract registry referencing all 6 ecosystem services',
    { tag: ['@tier1', '@R2-F5', '@apps'] },
    async () => {
      const docsRes = await fetchJson(`${URLS.docsApi}/api/docs`);
      expect(docsRes.status).toBe(200);
      const docs = unwrapArray<DocEntry>(docsRes.data, ['docs', 'items', 'data']);

      const fullCorpus = docs
        .map((d) => `${d.slug} ${d.title} ${d.content ?? ''}`)
        .join('\n')
        .toLowerCase();

      expect(fullCorpus).toContain('lokatalenta-event-gateway');
      expect(fullCorpus).toContain('lokatalenta-backlog');
      expect(fullCorpus).toContain('lokatalenta-sprint-planner');
      expect(fullCorpus).toContain('lokatalenta-docs');
      expect(fullCorpus).toContain('lokatalenta-office-3d');
      expect(fullCorpus).toMatch(/lms-psikotes|lokatalenta/);
    },
  );
});

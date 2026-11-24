import { expect, test } from '@playwright/test';
import {
  CANONICAL_DIVISION_IDS,
  FORBIDDEN_LEGACY_ALIAS_DRIFTS,
  getAgentById,
} from '../../helpers/canonical.ts';
import { FORBIDDEN_PORTS, URLS } from '../../helpers/env.ts';
import { attachErrorGuards } from '../../helpers/office-driver.ts';
import {
  validateBacklogItem,
  validateDocEntry,
  validateRubricEvaluation,
  type BacklogItem,
  type DocEntry,
  type RubricEvaluation,
  type Sprint,
} from '../../helpers/schema-validators.ts';

async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; ok: boolean; data: T }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    // non-json
  }
  return { status: res.status, ok: res.ok, data: data as T };
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

test.describe('Tier 2 — Grooming Coverage Gaps, Rubric Integrity & Data Consistency', () => {
  // ==========================================================================
  // R3-F2: Grooming Docs Boundary & Consistency Cases (5 tests)
  // ==========================================================================

  test(
    'R3-F2.B1 validateDocEntry rejects empty slug, empty title, missing category, and invalid division',
    { tag: ['@tier2', '@R3-F2', '@grooming'] },
    async () => {
      expect(
        validateDocEntry({ slug: '', title: 'Ok', category: 'adr' }).valid,
      ).toBe(false);
      expect(
        validateDocEntry({ slug: 'ok', title: '   ', category: 'adr' }).valid,
      ).toBe(false);
      expect(
        validateDocEntry({ slug: 'ok', title: 'Ok', category: '' }).valid,
      ).toBe(false);
      expect(
        validateDocEntry({
          slug: 'ok',
          title: 'Ok',
          category: 'adr',
          ownerDivision: 'marketing',
        }).valid,
      ).toBe(false);
    },
  );

  test(
    'R3-F2.B2 Docs Hub records contain zero forbidden legacy alias drifts (Arya, Qori, Tari)',
    { tag: ['@tier2', '@R3-F2', '@grooming'] },
    async () => {
      const listRes = await fetchJson(`${URLS.docsApi}/api/docs`);
      expect(listRes.status).toBe(200);
      const summaries = unwrapArray<DocEntry>(listRes.data, ['docs', 'items', 'data']);

      for (const summary of summaries) {
        const detail = await fetchJson(
          `${URLS.docsApi}/api/docs/${encodeURIComponent(summary.slug)}`,
        );
        expect(detail.status).toBe(200);
        const serialized = JSON.stringify(detail.data);
        for (const forbidden of FORBIDDEN_LEGACY_ALIAS_DRIFTS) {
          expect(serialized).not.toContain(forbidden);
        }
      }
    },
  );

  test(
    'R3-F2.B3 Docs Hub records never bind or prescribe any forbidden host port',
    { tag: ['@tier2', '@R3-F2', '@grooming'] },
    async () => {
      const listRes = await fetchJson(`${URLS.docsApi}/api/docs`);
      expect(listRes.status).toBe(200);
      const summaries = unwrapArray<DocEntry>(listRes.data, ['docs', 'items', 'data']);

      const badPortRegex = new RegExp(
        `(?:localhost|127\\.0\\.0\\.1|port)\\s*[:=]?\\s*(?:${FORBIDDEN_PORTS.join('|')})\\b`,
        'i',
      );
      for (const summary of summaries) {
        const detail = await fetchJson(
          `${URLS.docsApi}/api/docs/${encodeURIComponent(summary.slug)}`,
        );
        expect(detail.status).toBe(200);
        expect(badPortRegex.test(JSON.stringify(detail.data))).toBe(false);
      }
    },
  );

  test(
    'R3-F2.B4 Docs Hub contains zero duplicate document slugs',
    { tag: ['@tier2', '@R3-F2', '@grooming'] },
    async () => {
      const listRes = await fetchJson(`${URLS.docsApi}/api/docs`);
      expect(listRes.status).toBe(200);
      const docs = unwrapArray<DocEntry>(listRes.data, ['docs', 'items', 'data']);

      const slugs = new Set<string>();
      for (const d of docs) {
        expect(slugs.has(d.slug)).toBe(false);
        slugs.add(d.slug);
      }
    },
  );

  test(
    'R3-F2.B5 Docs UI renders empty search state gracefully with zero console or page errors',
    { tag: ['@tier2', '@R3-F2', '@grooming'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });

      const searchInput = page
        .locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="cari" i]')
        .first();
      if ((await searchInput.count()) > 0 && (await searchInput.isVisible())) {
        await searchInput.fill('__ZERO_MATCH_DOCS_QUERY_999__');
        await page.waitForTimeout(250);
      }

      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R3-F3: Groomed Backlog & Sprint Consistency Gaps (5 tests)
  // ==========================================================================

  test(
    'R3-F3.B1 validateBacklogItem rejects missing acceptanceCriteria, non-array dependencies, and bad owner',
    { tag: ['@tier2', '@R3-F3', '@grooming'] },
    async () => {
      const validBase = {
        id: 'BL-999',
        title: 'Valid title',
        type: 'story',
        status: 'groomed',
        priority: 'Must',
        storyPoints: 5,
        ownerDivision: 'engineering',
        ownerAgentId: 5,
        acceptanceCriteria: ['AC 1'],
        dependencies: [],
      };

      expect(validateBacklogItem({ ...validBase, acceptanceCriteria: '' }).valid).toBe(false);
      expect(validateBacklogItem({ ...validBase, acceptanceCriteria: [] }).valid).toBe(false);
      expect(validateBacklogItem({ ...validBase, dependencies: 'BL-1' }).valid).toBe(false);
      expect(validateBacklogItem({ ...validBase, ownerAgentId: 24 }).valid).toBe(false);
      expect(validateBacklogItem({ ...validBase, ownerDivision: 'invalid' }).valid).toBe(false);
    },
  );

  test(
    'R3-F3.B2 Every seeded Backlog item pairs ownerAgentId with its canonical ownerDivision',
    { tag: ['@tier2', '@R3-F3', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.backlogApi}/api/items`);
      expect(res.status).toBe(200);
      const items = unwrapArray<BacklogItem>(res.data, ['items', 'data']);

      for (const item of items) {
        const agent = getAgentById(item.ownerAgentId);
        expect(agent).toBeDefined();
        expect(item.ownerDivision).toBe(agent!.divisionId);
      }
    },
  );

  test(
    'R3-F3.B3 Seeded Backlog items have zero self-dependencies and non-negative storyPoints',
    { tag: ['@tier2', '@R3-F3', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.backlogApi}/api/items`);
      expect(res.status).toBe(200);
      const items = unwrapArray<BacklogItem>(res.data, ['items', 'data']);

      for (const item of items) {
        expect(item.dependencies.includes(item.id)).toBe(false);
        expect(item.storyPoints).toBeGreaterThanOrEqual(0);
      }
    },
  );

  test(
    'R3-F3.B4 Seeded Sprints have valid chronological startDate < endDate and non-negative capacities',
    { tag: ['@tier2', '@R3-F3', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.sprintApi}/api/sprints`);
      expect(res.status).toBe(200);
      const sprints = unwrapArray<Sprint>(res.data, ['sprints', 'data']);

      for (const s of sprints) {
        if (s.startDate && s.endDate) {
          expect(Date.parse(s.endDate)).toBeGreaterThan(Date.parse(s.startDate));
        }
        if (s.capacityByDivision && typeof s.capacityByDivision === 'object') {
          for (const val of Object.values(s.capacityByDivision)) {
            if (typeof val === 'number') {
              expect(val).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    },
  );

  test(
    'R3-F3.B5 Backlog UI & Sprint UI filter interactions produce zero console or page errors',
    { tag: ['@tier2', '@R3-F3', '@grooming'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.backlogUi, { waitUntil: 'networkidle' });

      const divSelect = page.locator('select').first();
      if ((await divSelect.count()) > 0 && (await divSelect.isVisible())) {
        const options = await divSelect.locator('option').allTextContents();
        if (options.length > 1) {
          await divSelect.selectOption({ index: 1 });
        }
      }

      await page.goto(URLS.sprintUi, { waitUntil: 'networkidle' });
      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R3-F4: Cross-Workflow Rubric Gap Rejection (5 tests)
  // ==========================================================================

  test(
    'R3-F4.B1 validateRubricEvaluation rejects empty workflows, non-boolean contractDefined, and empty items',
    { tag: ['@tier2', '@R3-F4', '@grooming'] },
    async () => {
      expect(validateRubricEvaluation({ workflows: [] }).valid).toBe(false);
      expect(
        validateRubricEvaluation({
          workflows: [
            {
              workflow: 'Backlog',
              contractDefined: 'yes',
              ownerDivision: 'executive',
              prioritizedItems: ['BL-1'],
            },
          ],
        }).valid,
      ).toBe(false);
      expect(
        validateRubricEvaluation({
          workflows: [
            {
              workflow: 'Backlog',
              contractDefined: true,
              ownerDivision: 'unknown-div',
              prioritizedItems: ['BL-1'],
            },
          ],
        }).valid,
      ).toBe(false);
      expect(
        validateRubricEvaluation({
          workflows: [
            {
              workflow: 'Backlog',
              contractDefined: true,
              ownerDivision: 'executive',
              prioritizedItems: [],
            },
          ],
        }).valid,
      ).toBe(false);
    },
  );

  test(
    'R3-F4.B2 Live Docs /api/rubrics has zero workflows with contractDefined=false',
    { tag: ['@tier2', '@R3-F4', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.docsApi}/api/rubrics`);
      expect(res.status).toBe(200);
      const rubrics = unwrapArray<RubricEvaluation>(res.data, ['rubrics', 'items', 'data']);

      const entries = rubrics.flatMap((r) => {
        const raw = r as unknown as {
          workflows?: RubricEvaluation['workflows'];
          entries?: RubricEvaluation['workflows'];
        };
        return raw.workflows ?? raw.entries ?? [];
      });
      expect(entries.length).toBeGreaterThanOrEqual(4);
      for (const wf of entries) {
        expect(wf.contractDefined).toBe(true);
      }
    },
  );

  test(
    'R3-F4.B3 Live Docs /api/rubrics has zero workflows with empty prioritizedItems or unknown ownerDivision',
    { tag: ['@tier2', '@R3-F4', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.docsApi}/api/rubrics`);
      expect(res.status).toBe(200);
      const rubrics = unwrapArray<RubricEvaluation>(res.data, ['rubrics', 'items', 'data']);

      for (const r of rubrics) {
        const raw = r as unknown as {
          workflows?: RubricEvaluation['workflows'];
          entries?: RubricEvaluation['workflows'];
        };
        const entries = raw.workflows ?? raw.entries ?? [];
        for (const wf of entries) {
          expect(CANONICAL_DIVISION_IDS).toContain(wf.ownerDivision);
          expect(wf.prioritizedItems.length).toBeGreaterThanOrEqual(1);
        }
      }
    },
  );

  test(
    'R3-F4.B4 Docs POST /api/rubrics rejects invalid ownerDivision or empty prioritizedItems with 400/422',
    { tag: ['@tier2', '@R3-F4', '@grooming'] },
    async () => {
      const badRubric = await fetchJson(`${URLS.docsApi}/api/rubrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: `invalid-rubric-${Date.now()}`,
          title: 'Invalid Rubric Probe',
          workflows: [
            {
              workflow: 'Broken Workflow',
              contractDefined: true,
              ownerDivision: 'not-a-division',
              prioritizedItems: [],
            },
          ],
        }),
      });
      expect([400, 422]).toContain(badRubric.status);
      expect(badRubric.ok).toBe(false);
    },
  );

  test(
    'R3-F4.B5 Docs UI renders Rubric Evaluation cleanly even when Event Gateway (:4101) is offline',
    { tag: ['@tier2', '@R3-F4', '@grooming'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.route('**/localhost:4101/**', (route) =>
        route.abort('connectionrefused'),
      );

      await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });
      const rubricBtn = page
        .getByRole('button', { name: /rubric/i })
        .or(page.getByRole('link', { name: /rubric/i }));
      if ((await rubricBtn.count()) > 0 && (await rubricBtn.first().isVisible())) {
        await rubricBtn.first().click();
      }
      const text = await page.locator('body').innerText();
      expect(text.trim().length).toBeGreaterThan(20);
      guard.assertZeroErrors();
    },
  );
});

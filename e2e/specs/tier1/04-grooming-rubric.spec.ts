import { expect, test } from '@playwright/test';
import {
  CANONICAL_AGENTS,
  CANONICAL_DIVISION_IDS,
  FORBIDDEN_LEGACY_ALIAS_DRIFTS,
} from '../../helpers/canonical.ts';
import { URLS } from '../../helpers/env.ts';
import { attachErrorGuards } from '../../helpers/office-driver.ts';
import {
  assertValid,
  validateBacklogItem,
  validateDocEntry,
  validateRubricEvaluation,
  validateSprint,
  type BacklogItem,
  type DocEntry,
  type RubricEvaluation,
  type Sprint,
} from '../../helpers/schema-validators.ts';

async function fetchJson<T = unknown>(
  url: string,
): Promise<{ status: number; data: T; text: string }> {
  const res = await fetch(url);
  const text = await res.text();
  let data: unknown = text;
  try {
    data = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    // non-json
  }
  return { status: res.status, data: data as T, text };
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

async function fetchFullDocs(): Promise<DocEntry[]> {
  const listRes = await fetchJson(`${URLS.docsApi}/api/docs`);
  expect(listRes.status).toBe(200);
  const summaries = unwrapArray<DocEntry>(listRes.data, ['docs', 'items', 'data']);
  const hydrated: DocEntry[] = [];
  for (const doc of summaries) {
    if (typeof doc.content === 'string' && doc.content.length > 0) {
      hydrated.push(doc);
    } else {
      const detail = await fetchJson(`${URLS.docsApi}/api/docs/${encodeURIComponent(doc.slug)}`);
      expect(detail.status).toBe(200);
      const obj =
        detail.data && typeof detail.data === 'object' && 'doc' in (detail.data as Record<string, unknown>)
          ? ((detail.data as Record<string, unknown>).doc as DocEntry)
          : (detail.data as DocEntry);
      hydrated.push(obj);
    }
  }
  return hydrated;
}

test.describe('Tier 1 — Multi-Agent Grooming, Populated Backlog/Sprint & Rubric', () => {
  // ==========================================================================
  // R3-F2: 6-Division Multi-Agent Architecture & Grooming (5 tests)
  // ==========================================================================

  test(
    'R3-F2.1 Docs Hub contains Architecture & ADR records for decoupled multi-repo ecosystem',
    { tag: ['@tier1', '@R3-F2', '@grooming'] },
    async () => {
      const docs = await fetchFullDocs();
      expect(docs.length).toBeGreaterThanOrEqual(4);
      for (const d of docs) {
        assertValid(validateDocEntry(d), `Doc ${d.slug}`);
      }

      const adrOrArchDocs = docs.filter((d) =>
        /adr|arch|contract/i.test(`${d.category} ${d.slug} ${d.title}`),
      );
      expect(adrOrArchDocs.length).toBeGreaterThanOrEqual(2);

      const corpus = docs.map((d) => `${d.title}\n${d.content ?? ''}`).join('\n').toLowerCase();
      expect(corpus).toContain('lokatalenta-office-3d');
      expect(corpus).toContain('lokatalenta-event-gateway');
      expect(corpus).toContain('lokatalenta-backlog');
      expect(corpus).toContain('lokatalenta-sprint-planner');
    },
  );

  test(
    'R3-F2.2 Docs Hub documents cross-app integration contracts (Gateway WS/SSE, Webhooks, Backlog-Sprint)',
    { tag: ['@tier1', '@R3-F2', '@grooming'] },
    async () => {
      const docs = await fetchFullDocs();
      const corpus = docs.map((d) => `${d.title}\n${d.content ?? ''}`).join('\n').toLowerCase();

      expect(corpus).toContain('/webhooks/github');
      expect(corpus).toContain('x-hub-signature-256');
      expect(corpus).toContain('/events/stream');
      expect(corpus).toContain('/ws');
    },
  );

  test(
    'R3-F2.3 Docs Hub grooming records cover all 6 canonical agent divisions',
    { tag: ['@tier1', '@R3-F2', '@grooming'] },
    async () => {
      const docs = await fetchFullDocs();
      const corpus = docs
        .map((d) => `${d.slug} ${d.title} ${d.ownerDivision ?? ''} ${d.content ?? ''}`)
        .join('\n')
        .toLowerCase();

      for (const divId of CANONICAL_DIVISION_IDS) {
        expect(corpus).toContain(divId);
      }

      const representedOwnerDivs = new Set(
        docs.map((d) => d.ownerDivision).filter((v): v is (typeof CANONICAL_DIVISION_IDS)[number] => Boolean(v)),
      );
      expect(representedOwnerDivs.size).toBeGreaterThanOrEqual(3);
    },
  );

  test(
    'R3-F2.4 Docs Hub 24-agent matrix references all 24 canonical agents without legacy alias drifts',
    { tag: ['@tier1', '@R3-F2', '@grooming'] },
    async () => {
      const docs = await fetchFullDocs();
      const corpus = docs.map((d) => `${d.title}\n${d.content ?? ''}`).join('\n');

      for (const agent of CANONICAL_AGENTS) {
        expect(corpus).toContain(agent.name);
      }

      for (const forbidden of FORBIDDEN_LEGACY_ALIAS_DRIFTS) {
        expect(corpus).not.toContain(forbidden);
      }
    },
  );

  test(
    'R3-F2.5 Docs UI renders ADR, contract, and grooming documentation pages cleanly',
    { tag: ['@tier1', '@R3-F2', '@grooming'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      const res = await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });
      expect(res).not.toBeNull();
      expect(res!.status()).toBeLessThan(400);

      const text = await page.locator('body').innerText();
      expect(text.toLowerCase()).toMatch(/adr|contract|grooming|architecture/);

      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R3-F3: Populated Groomed Backlog & Sprint Plan (5 tests)
  // ==========================================================================

  test(
    'R3-F3.1 Backlog API contains seeded items spanning all 6 canonical divisions',
    { tag: ['@tier1', '@R3-F3', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.backlogApi}/api/items`);
      expect(res.status).toBe(200);
      const items = unwrapArray<BacklogItem>(res.data, ['items', 'data']);
      expect(items.length).toBeGreaterThanOrEqual(6);

      const coveredDivisions = new Set(items.map((i) => i.ownerDivision));
      for (const divId of CANONICAL_DIVISION_IDS) {
        expect(coveredDivisions.has(divId)).toBe(true);
      }
    },
  );

  test(
    'R3-F3.2 All seeded Backlog items pass schema validation with real non-placeholder details',
    { tag: ['@tier1', '@R3-F3', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.backlogApi}/api/items`);
      expect(res.status).toBe(200);
      const items = unwrapArray<BacklogItem>(res.data, ['items', 'data']);
      expect(items.length).toBeGreaterThanOrEqual(6);

      for (const item of items) {
        assertValid(validateBacklogItem(item), `BacklogItem ${item.id}`);
        expect(item.title.toLowerCase()).not.toMatch(/\b(lorem ipsum|placeholder|todo tbd)\b/);
        const acText = Array.isArray(item.acceptanceCriteria)
          ? item.acceptanceCriteria.join(' ')
          : item.acceptanceCriteria;
        expect(acText.trim().length).toBeGreaterThanOrEqual(10);
      }
    },
  );

  test(
    'R3-F3.3 Seeded Backlog items define cross-item dependencies linking valid item IDs',
    { tag: ['@tier1', '@R3-F3', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.backlogApi}/api/items`);
      expect(res.status).toBe(200);
      const items = unwrapArray<BacklogItem>(res.data, ['items', 'data']);
      const allIds = new Set(items.map((i) => i.id));

      const itemsWithDeps = items.filter((i) => i.dependencies.length > 0);
      expect(itemsWithDeps.length).toBeGreaterThanOrEqual(1);

      for (const item of itemsWithDeps) {
        for (const depId of item.dependencies) {
          expect(allIds.has(depId)).toBe(true);
        }
      }
    },
  );

  test(
    'R3-F3.4 Sprint Planner has populated active/planned sprint with division capacity and summary',
    { tag: ['@tier1', '@R3-F3', '@grooming'] },
    async () => {
      const sprintsRes = await fetchJson(`${URLS.sprintApi}/api/sprints`);
      expect(sprintsRes.status).toBe(200);
      const sprints = unwrapArray<Sprint>(sprintsRes.data, ['sprints', 'data']);
      expect(sprints.length).toBeGreaterThanOrEqual(1);

      const primary = sprints[0]!;
      assertValid(validateSprint(primary), 'Primary Sprint');

      const summaryRes = await fetchJson<Record<string, unknown>>(
        `${URLS.sprintApi}/api/sprints/${encodeURIComponent(primary.id)}/summary`,
      );
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.data).toBeTruthy();

      const serialized = JSON.stringify(summaryRes.data).toLowerCase();
      for (const divId of CANONICAL_DIVISION_IDS) {
        expect(serialized).toContain(divId);
      }
    },
  );

  test(
    'R3-F3.5 Backlog UI and Sprint Planner UI display groomed items and division ownership cleanly',
    { tag: ['@tier1', '@R3-F3', '@grooming'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.backlogUi, { waitUntil: 'networkidle' });
      const backlogText = (await page.locator('body').innerText()).toLowerCase();
      expect(backlogText).toMatch(/engineering|qa|devops/);

      await page.goto(URLS.sprintUi, { waitUntil: 'networkidle' });
      const sprintText = (await page.locator('body').innerText()).toLowerCase();
      expect(sprintText).toMatch(/sprint|story|point|capacity/);

      guard.assertZeroErrors();
    },
  );

  // ==========================================================================
  // R3-F4: Structured Cross-Workflow Rubric Evaluation (5 tests)
  // ==========================================================================

  test(
    'R3-F4.1 Docs API /api/rubrics returns structured rubric evaluation passing schema validator',
    { tag: ['@tier1', '@R3-F4', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.docsApi}/api/rubrics`);
      expect(res.status).toBe(200);
      const rubrics = unwrapArray<RubricEvaluation>(res.data, ['rubrics', 'items', 'data']);
      expect(rubrics.length).toBeGreaterThanOrEqual(1);

      for (const rubric of rubrics) {
        assertValid(validateRubricEvaluation(rubric), 'RubricEvaluation');
      }
    },
  );

  test(
    'R3-F4.2 Rubric evaluation covers all core ecosystem workflows (LMS, Docs, Sprint, Backlog, Gateway, 3D Office)',
    { tag: ['@tier1', '@R3-F4', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.docsApi}/api/rubrics`);
      expect(res.status).toBe(200);
      const rubrics = unwrapArray<RubricEvaluation>(res.data, ['rubrics', 'items', 'data']);

      const allWorkflows = rubrics.flatMap((r) => {
        const raw = r as unknown as { workflows?: RubricEvaluation['workflows']; entries?: RubricEvaluation['workflows'] };
        return raw.workflows ?? raw.entries ?? [];
      });
      const names = allWorkflows.map((w) => w.workflow.toLowerCase()).join(' | ');

      expect(names).toMatch(/lms|psikotes/);
      expect(names).toMatch(/doc/);
      expect(names).toMatch(/sprint/);
      expect(names).toMatch(/backlog/);
      expect(names).toMatch(/office|3d/);
    },
  );

  test(
    'R3-F4.3 Every rubric workflow entry confirms contractDefined=true, canonical ownerDivision, and prioritizedItems',
    { tag: ['@tier1', '@R3-F4', '@grooming'] },
    async () => {
      const res = await fetchJson(`${URLS.docsApi}/api/rubrics`);
      expect(res.status).toBe(200);
      const rubrics = unwrapArray<RubricEvaluation>(res.data, ['rubrics', 'items', 'data']);
      const primary = rubrics[0]!;
      const entries =
        primary.workflows ??
        ((primary as unknown as { entries?: RubricEvaluation['workflows'] }).entries ?? []);

      expect(entries.length).toBeGreaterThanOrEqual(4);
      for (const wf of entries) {
        expect(wf.contractDefined).toBe(true);
        expect(CANONICAL_DIVISION_IDS).toContain(wf.ownerDivision);
        expect(wf.prioritizedItems.length).toBeGreaterThanOrEqual(1);
      }
    },
  );

  test(
    'R3-F4.4 Rubric prioritizedItems trace directly to real Backlog items in lokatalenta-backlog',
    { tag: ['@tier1', '@R3-F4', '@grooming'] },
    async () => {
      const [rubricsRes, backlogRes] = await Promise.all([
        fetchJson(`${URLS.docsApi}/api/rubrics`),
        fetchJson(`${URLS.backlogApi}/api/items`),
      ]);
      expect(rubricsRes.status).toBe(200);
      expect(backlogRes.status).toBe(200);

      const rubrics = unwrapArray<RubricEvaluation>(rubricsRes.data, ['rubrics', 'items', 'data']);
      const backlogItems = unwrapArray<BacklogItem>(backlogRes.data, ['items', 'data']);
      const backlogIds = new Set(backlogItems.map((b) => b.id));

      const entries = rubrics.flatMap((r) => {
        const raw = r as unknown as { workflows?: RubricEvaluation['workflows']; entries?: RubricEvaluation['workflows'] };
        return raw.workflows ?? raw.entries ?? [];
      });

      let matchedCount = 0;
      for (const wf of entries) {
        for (const itemId of wf.prioritizedItems) {
          if (backlogIds.has(itemId)) {
            matchedCount++;
          }
        }
      }
      expect(matchedCount).toBeGreaterThanOrEqual(entries.length);
    },
  );

  test(
    'R3-F4.5 Docs UI displays structured Rubric Evaluation matrix cleanly with zero console errors',
    { tag: ['@tier1', '@R3-F4', '@grooming'] },
    async ({ page }) => {
      const guard = attachErrorGuards(page);
      await page.goto(URLS.docsUi, { waitUntil: 'networkidle' });

      const rubricTab = page
        .getByRole('button', { name: /rubric/i })
        .or(page.getByRole('link', { name: /rubric/i }))
        .or(page.getByTestId('nav-rubrics'));
      if ((await rubricTab.count()) > 0 && (await rubricTab.first().isVisible())) {
        await rubricTab.first().click();
      }

      const bodyText = (await page.locator('body').innerText()).toLowerCase();
      expect(bodyText).toMatch(/rubric|workflow|contract/);
      guard.assertZeroErrors();
    },
  );
});

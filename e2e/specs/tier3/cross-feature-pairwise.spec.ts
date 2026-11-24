import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  buildGitHubIssuesPayload,
  buildGitHubPullRequestPayload,
  buildGitHubPushPayload,
} from '../../fixtures/github-webhooks.ts';
import {
  buildBacklogUpdatedEvent,
  buildLmsActivityEvent,
} from '../../fixtures/telemetry-events.ts';
import {
  CANONICAL_AGENTS,
  CANONICAL_DIVISIONS,
  CANONICAL_DIVISION_IDS,
  CANONICAL_ZONE_TYPES,
  LEGACY_DRIFT_NAMES,
} from '../../helpers/canonical.ts';
import {
  FORBIDDEN_PORTS,
  GITHUB_OWNER,
  REPOS,
  URLS,
} from '../../helpers/env.ts';
import {
  connectWsAndWaitForEvent,
  getEvents,
  getSnapshot,
  postEvent,
  postGitHubWebhook,
  waitForHealth,
} from '../../helpers/gateway-client.ts';
import {
  assertWebGLCanvasActive,
  attachErrorGuards,
  captureCanvasPng,
  getConnectionStatus,
  getTickerEntries,
  jumpToZone,
  measurePixelDiffPercent,
  measurePngColorDiversity,
  openAgentDossier,
  readOfficeState,
  searchAgents,
  switchFloor,
  switchPov,
  toggleDayNight,
  waitForOfficeReady,
} from '../../helpers/office-driver.ts';
import {
  assertValid,
  validateBacklogItem,
  validateDocEntry,
  validateGatewaySnapshot,
  validateNoPiiInEvent,
  validateNormalizedEvent,
  validateRubricEvaluation,
  validateSprint,
  type BacklogItem,
  type DocEntry,
  type RubricEvaluation,
  type Sprint,
} from '../../helpers/schema-validators.ts';

function extractList<T>(body: unknown, keys: string[], label: string): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[];
      }
    }
  }
  throw new Error(`Expected array or {${keys.join('|')}: []} for ${label}`);
}

function extractObject<T>(body: unknown, keys: string[], label: string): T {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>;
    for (const key of keys) {
      if (obj[key] && typeof obj[key] === 'object') {
        return obj[key] as T;
      }
    }
    return obj as T;
  }
  throw new Error(`Expected object for ${label}`);
}

test.describe('Tier 3 — Cross-Feature Pairwise Combinatorial Matrix (P01..P24) (@tier3)', () => {
  test('P01: Repo Extraction (R1-F2) x lms-psikotes Pointer Integrity (R1-F3) @tier3 @R1-F2 @R1-F3 @repo', async () => {
    const officeDir = REPOS['lokatalenta-office-3d'].localPath;
    const lmsDir = REPOS['lms-psikotes'].localPath;

    expect(fs.existsSync(path.join(officeDir, '.git'))).toBe(true);
    expect(
      fs.existsSync(path.join(officeDir, 'package.json')) ||
        fs.existsSync(path.join(officeDir, 'kantor_ai_3d.html')),
    ).toBe(true);

    const legacyFile = path.join(lmsDir, 'docs', 'kantor_ai_3d.html');
    if (fs.existsSync(legacyFile)) {
      const content = fs.readFileSync(legacyFile, 'utf8');
      expect(content.length).toBeLessThan(8_000);
      expect(content).toMatch(/lokatalenta-office-3d/i);
    }
  });

  test('P02: Canonical 24-Agent Registry (R3-F1) x Gateway Normalization (R2-F4) @tier3 @R3-F1 @R2-F4 @gateway', async () => {
    await waitForHealth(`${URLS.gateway}/health`);
    const snapRes = await getSnapshot(URLS.gateway);
    expect(snapRes.ok).toBe(true);
    assertValid(validateGatewaySnapshot(snapRes.data), 'P02 Gateway snapshot');

    const driftSet = new Set<string>(LEGACY_DRIFT_NAMES);
    for (const canonical of CANONICAL_AGENTS) {
      const found = snapRes.data.agents.find(
        (a) => (a as { id?: number }).id === canonical.id,
      ) as { id: number; name?: string; divisionId?: string } | undefined;
      expect(found).toBeDefined();
      if (found?.name) {
        expect(found.name).toBe(canonical.name);
        expect(driftSet.has(found.name)).toBe(false);
      }
      if (found?.divisionId) {
        expect(found.divisionId).toBe(canonical.divisionId);
      }
    }

    const evt = buildBacklogUpdatedEvent({
      agentId: 17,
      divisionId: 'devops',
      targetFloor: 3,
      entityId: `P02-${Date.now()}`,
    });
    const postRes = await postEvent(JSON.stringify(evt));
    expect(postRes.status).toBe(202);
    if (postRes.data.event) {
      assertValid(validateNormalizedEvent(postRes.data.event), 'P02 normalized event');
    }
  });

  test('P03: Canonical 6-Division Registry (R3-F1) x Backlog Ownership (R2-F3) @tier3 @R3-F1 @R2-F3 @apps', async () => {
    await waitForHealth(`${URLS.backlogApi}/api/health`);
    const res = await fetch(`${URLS.backlogApi}/api/items`);
    expect(res.ok).toBe(true);
    const items = extractList<BacklogItem>(await res.json(), ['items', 'data'], 'P03 backlog items');
    expect(items.length).toBeGreaterThanOrEqual(6);

    const coveredDivs = new Set<string>();
    for (const item of items) {
      assertValid(validateBacklogItem(item), `P03 BacklogItem ${item.id}`);
      coveredDivs.add(item.ownerDivision);
      const owner = CANONICAL_AGENTS.find((a) => a.id === item.ownerAgentId);
      expect(owner).toBeDefined();
      expect(owner!.divisionId).toBe(item.ownerDivision);
    }

    for (const divId of CANONICAL_DIVISION_IDS) {
      expect(coveredDivs.has(divId)).toBe(true);
    }
  });

  test('P04: Backlog Item Creation (R2-F3) x Sprint Pull & Capacity Update (R2-F2) @tier3 @R2-F3 @R2-F2 @apps', async () => {
    await waitForHealth(`${URLS.backlogApi}/api/health`);
    await waitForHealth(`${URLS.sprintApi}/api/health`);

    const uniqueTitle = `P04 Pairwise Item ${Date.now()}`;
    const createItemRes = await fetch(`${URLS.backlogApi}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: uniqueTitle,
        type: 'story',
        status: 'groomed',
        priority: 'Should',
        storyPoints: 5,
        ownerDivision: 'engineering',
        ownerAgentId: 5,
        acceptanceCriteria: ['Given backlog story, When pulled to sprint, Then capacity updates'],
        dependencies: [],
      }),
    });
    expect(createItemRes.ok).toBe(true);
    const createdItem = extractObject<BacklogItem>(
      await createItemRes.json(),
      ['item', 'data'],
      'P04 created item',
    );
    assertValid(validateBacklogItem(createdItem), 'P04 created BacklogItem');

    const sprintsRes = await fetch(`${URLS.sprintApi}/api/sprints`);
    expect(sprintsRes.ok).toBe(true);
    const sprints = extractList<Sprint>(
      await sprintsRes.json(),
      ['sprints', 'data'],
      'P04 sprints',
    );
    expect(sprints.length).toBeGreaterThan(0);
    const targetSprint = sprints[0]!;
    assertValid(validateSprint(targetSprint), 'P04 target sprint');

    const assignRes = await fetch(
      `${URLS.sprintApi}/api/sprints/${encodeURIComponent(targetSprint.id)}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: createdItem.id }),
      },
    );
    expect(assignRes.ok).toBe(true);

    const summaryRes = await fetch(
      `${URLS.sprintApi}/api/sprints/${encodeURIComponent(targetSprint.id)}/summary`,
    );
    expect(summaryRes.ok).toBe(true);

    // Cleanup created backlog item
    await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(createdItem.id)}`, {
      method: 'DELETE',
    });
  });

  test('P05: Sprint Pull (R2-F2) x Gateway sprint.updated Broadcast (R2-F4) @tier3 @R2-F2 @R2-F4 @integration', async () => {
    await waitForHealth(`${URLS.gateway}/health`);
    await waitForHealth(`${URLS.sprintApi}/api/health`);

    const sprintsRes = await fetch(`${URLS.sprintApi}/api/sprints`);
    expect(sprintsRes.ok).toBe(true);
    const sprints = extractList<Sprint>(
      await sprintsRes.json(),
      ['sprints', 'data'],
      'P05 sprints',
    );
    expect(sprints.length).toBeGreaterThan(0);
    const sprintId = sprints[0]!.id;
    const noteMarker = `P05-Ceremony-${Date.now()}`;

    const wsWait = await connectWsAndWaitForEvent(
      (msg) =>
        msg.type === 'event' &&
        typeof msg.payload === 'object' &&
        msg.payload !== null &&
        ((msg.payload as { type?: string }).type === 'sprint.updated' ||
          JSON.stringify(msg.payload).includes(noteMarker)),
      {
        timeoutMs: 6_000,
        onConnected: async () => {
          const res = await fetch(
            `${URLS.sprintApi}/api/sprints/${encodeURIComponent(sprintId)}/ceremonies`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'standup',
                notes: `Sync ${noteMarker}`,
                agentId: 18,
              }),
            },
          );
          expect(res.ok).toBe(true);
        },
      },
    );

    assertValid(validateNormalizedEvent(wsWait.matched.payload), 'P05 WS sprint event');
  });

  test('P06: Documentation ADR Update (R2-F1) x Cross-App Switcher Links (R2-F5) @tier3 @R2-F1 @R2-F5 @apps', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.docsApi}/api/health`);

    const docsRes = await fetch(`${URLS.docsApi}/api/docs`);
    expect(docsRes.ok).toBe(true);
    const docs = extractList<DocEntry>(await docsRes.json(), ['docs', 'items', 'data'], 'P06 docs');
    expect(docs.length).toBeGreaterThan(0);
    assertValid(validateDocEntry(docs[0]!), 'P06 first DocEntry');

    await page.goto(URLS.docsUi, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const html = await page.content();
    expect(html).toMatch(/4112|backlog/i);
    expect(html).toMatch(/4113|sprint/i);
    expect(html).toMatch(/4105|office/i);

    errors.assertZeroErrors();
  });

  test('P07: Groomed Backlog (R3-F3) x Structured Rubric (R3-F4) @tier3 @R3-F3 @R3-F4 @grooming', async () => {
    await waitForHealth(`${URLS.backlogApi}/api/health`);
    await waitForHealth(`${URLS.docsApi}/api/health`);

    const [blRes, rubricsRes] = await Promise.all([
      fetch(`${URLS.backlogApi}/api/items`),
      fetch(`${URLS.docsApi}/api/rubrics`),
    ]);
    expect(blRes.ok).toBe(true);
    expect(rubricsRes.ok).toBe(true);

    const items = extractList<BacklogItem>(await blRes.json(), ['items', 'data'], 'P07 backlog');
    const rubrics = extractList<RubricEvaluation>(
      await rubricsRes.json(),
      ['rubrics', 'data'],
      'P07 rubrics',
    );
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(rubrics.length).toBeGreaterThanOrEqual(1);

    const itemIds = new Set(items.map((i) => i.id));
    const rubric = rubrics[0]!;
    assertValid(validateRubricEvaluation(rubric), 'P07 RubricEvaluation');

    const workflows = rubric.workflows ?? (rubric as { entries?: RubricEvaluation['workflows'] }).entries!;
    for (const wf of workflows) {
      expect(wf.contractDefined).toBe(true);
      const anyMatched = wf.prioritizedItems.some((id) => itemIds.has(id));
      expect(anyMatched).toBe(true);
    }
  });

  test('P08: 6-Division Grooming Docs (R3-F2) x Sprint Allocation (R3-F3) @tier3 @R3-F2 @R3-F3 @grooming', async () => {
    await waitForHealth(`${URLS.docsApi}/api/health`);
    await waitForHealth(`${URLS.sprintApi}/api/health`);

    const [docsRes, sprintsRes] = await Promise.all([
      fetch(`${URLS.docsApi}/api/docs`),
      fetch(`${URLS.sprintApi}/api/sprints`),
    ]);
    expect(docsRes.ok).toBe(true);
    expect(sprintsRes.ok).toBe(true);

    const docs = extractList<DocEntry>(await docsRes.json(), ['docs', 'items', 'data'], 'P08 docs');
    const sprints = extractList<Sprint>(await sprintsRes.json(), ['sprints', 'data'], 'P08 sprints');

    const docSerialized = JSON.stringify(docs).toLowerCase();
    for (const divId of CANONICAL_DIVISION_IDS) {
      expect(docSerialized).toContain(divId);
    }
    expect(sprints.length).toBeGreaterThanOrEqual(1);
    assertValid(validateSprint(sprints[0]!), 'P08 Sprint');
  });

  test('P09: GitHub push Webhook (R5-F2) x 3D Office Engineering Zone Ticker & Agent State (R5-F5) @tier3 @R5-F2 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const marker = `p09-push-${Date.now()}`;
    const res = await postGitHubWebhook(
      'push',
      buildGitHubPushPayload({
        head_commit: {
          id: `cafe${Date.now().toString(16).padEnd(36, '0').slice(0, 36)}`,
          message: `feat(engineering): ${marker}`,
          timestamp: new Date().toISOString(),
        },
        commits: [
          {
            id: `cafe${Date.now().toString(16).padEnd(36, '0').slice(0, 36)}`,
            message: `feat(engineering): ${marker}`,
            timestamp: new Date().toISOString(),
            author: { name: 'Farel Faza Nugraha', username: 'farel-faza' },
            added: [],
            modified: ['src/App.tsx'],
            removed: [],
          },
        ],
      }),
    );
    expect(res.ok).toBe(true);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((e) => e.includes(marker) || e.includes('lokatalenta-office-3d'));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const state = await readOfficeState(page);
    expect(state.agents.find((a) => a.id === 5)!.divisionId).toBe('engineering');
    errors.assertZeroErrors();
  });

  test('P10: GitHub pull_request Webhook (R5-F2) x QA/Architecture Motion & Ticker (R4-F4, R5-F5) @tier3 @R5-F2 @R4-F4 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const marker = `P10-PR-${Date.now()}`;
    const prPayload = buildGitHubPullRequestPayload('opened', false, {
      pull_request: {
        ...buildGitHubPullRequestPayload('opened', false).pull_request,
        title: `fix(gateway): ${marker}`,
      },
    });
    const res = await postGitHubWebhook('pull_request', prPayload);
    expect(res.ok).toBe(true);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((e) => e.includes(marker) || e.includes('PR'));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const p1 = await captureCanvasPng(page);
    await page.waitForTimeout(700);
    const p2 = await captureCanvasPng(page);
    expect(measurePixelDiffPercent(p1, p2)).toBeGreaterThan(0.05);
    errors.assertZeroErrors();
  });

  test('P11: GitHub issues Webhook (R5-F2) x DevOps/Executive Alert & Ticker (R5-F5) @tier3 @R5-F2 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const marker = `P11-ISSUE-${Date.now()}`;
    const baseIssue = buildGitHubIssuesPayload('opened');
    const res = await postGitHubWebhook('issues', {
      ...baseIssue,
      issue: { ...baseIssue.issue, title: `Alert: ${marker}` },
    });
    expect(res.ok).toBe(true);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((e) => e.includes(marker) || e.includes('Issue'));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const eventsRes = await getEvents({ type: 'github.issue', limit: 10 });
    expect(eventsRes.ok).toBe(true);
    errors.assertZeroErrors();
  });

  test('P12: LMS Psikotes Activity Emitter (R5-F4a) x 3D Office Live Telemetry (R5-F5) @tier3 @R5-F4a @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const marker = `P12-LMS-${Date.now()}`;
    const evt = buildLmsActivityEvent({
      entityId: marker,
      title: `LMS Tryout ${marker}`,
      summary: `Anonymized candidate cohort ${marker} finished tryout`,
    });

    const postRes = await postEvent(JSON.stringify(evt));
    expect(postRes.status).toBe(202);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((e) => e.includes(marker));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    assertValid(validateNoPiiInEvent(evt), 'P12 LMS event no PII');
    errors.assertZeroErrors();
  });

  test('P13: Multi-Floor Building (R4-F1) x Floor Switcher Cutaway (R4-F2) @tier3 @R4-F1 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await page.waitForTimeout(400);
    const png1 = await captureCanvasPng(page);

    await switchFloor(page, 'all');
    await page.waitForTimeout(500);
    expect((await readOfficeState(page)).activeFloor).toBe('all');
    const pngAll = await captureCanvasPng(page);

    expect(measurePixelDiffPercent(png1, pngAll)).toBeGreaterThan(1);
    for (const zone of CANONICAL_ZONE_TYPES) {
      await jumpToZone(page, zone);
      await page.waitForTimeout(180);
    }
    await assertWebGLCanvasActive(page);
    errors.assertZeroErrors();
  });

  test('P14: Animated Elevator (R4-F2) x Agent Inter-Floor Routine (R4-F4) @tier3 @R4-F2 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await page.waitForTimeout(350);
    const f1CamY = (await readOfficeState(page)).cameraPosition.y;

    await switchFloor(page, 3);
    await page.waitForTimeout(600);
    const f3State = await readOfficeState(page);
    expect(f3State.cameraPosition.y).toBeGreaterThan(f1CamY);

    const pngA = await captureCanvasPng(page);
    await page.waitForTimeout(700);
    const pngB = await captureCanvasPng(page);
    expect(measurePixelDiffPercent(pngA, pngB)).toBeGreaterThan(0.05);
    errors.assertZeroErrors();
  });

  test('P15: First-Person Walkthrough (R4-F3) x Floor/Zone Collision & Props (R4-F1, R4-F5) @tier3 @R4-F3 @R4-F1 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await jumpToZone(page, 'cafeteria');
    await switchPov(page, 'first-person');
    await page.waitForTimeout(400);

    const startCam = (await readOfficeState(page)).cameraPosition;
    await page.locator('canvas').first().click();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(200);

    const endCam = (await readOfficeState(page)).cameraPosition;
    expect(Math.hypot(endCam.x - startCam.x, endCam.z - startCam.z)).toBeGreaterThan(0.05);
    expect(Math.abs(endCam.x)).toBeLessThan(150);
    expect(
      measurePngColorDiversity(await captureCanvasPng(page)).distinctBuckets,
    ).toBeGreaterThanOrEqual(8);
    errors.assertZeroErrors();
  });

  test('P16: Third-Person Agent-Follow POV (R4-F3) x Elevator & Daily Routine (R4-F2, R4-F4) @tier3 @R4-F3 @R4-F2 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await openAgentDossier(page, 11);
    await switchPov(page, 'third-person');
    await page.waitForTimeout(450);

    const state1 = await readOfficeState(page);
    expect(state1.activePov).toBe('third-person');

    await page.waitForTimeout(800);
    const state2 = await readOfficeState(page);
    expect(state2.activePov).toBe('third-person');
    expect(Number.isFinite(state2.cameraPosition.x)).toBe(true);
    errors.assertZeroErrors();
  });

  test('P17: Overview / Room-Focus POV (R4-F3) x Lighting / Day-Night Cycle (R4-F5) @tier3 @R4-F3 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchPov(page, 'overview');
    await jumpToZone(page, 'musholla');
    await page.waitForTimeout(400);
    const dayPng = await captureCanvasPng(page);

    await toggleDayNight(page);
    await page.waitForTimeout(450);
    const nightPng = await captureCanvasPng(page);

    expect(measurePixelDiffPercent(dayPng, nightPng)).toBeGreaterThan(2);
    expect(measurePngColorDiversity(nightPng).distinctBuckets).toBeGreaterThanOrEqual(6);
    errors.assertZeroErrors();
  });

  test('P18: Agent Dossier & Search (R4-F6) x Third-Person Camera Focus (R4-F3) @tier3 @R4-F6 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await searchAgents(page, 'Qonita');
    await page.waitForTimeout(200);
    await openAgentDossier(page, 7);
    await switchPov(page, 'third-person');
    await page.waitForTimeout(500);

    const state = await readOfficeState(page);
    expect(state.activePov).toBe('third-person');
    const agent7 = state.agents.find((a) => a.id === 7)!;
    const dist = Math.hypot(
      state.cameraPosition.x - agent7.position.x,
      state.cameraPosition.z - agent7.position.z,
    );
    expect(dist).toBeLessThan(35);
    errors.assertZeroErrors();
  });

  test('P19: Telemetry WS -> SSE Fallback (R5-F5) x Live Dossier & Census Counts (R4-F6) @tier3 @R5-F5 @R4-F6 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    await page.routeWebSocket('**/ws', (ws) => {
      ws.close({ code: 1012, reason: 'P19 force SSE fallback' });
    });

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);
    expect(state.agents).toHaveLength(24);
    for (const div of CANONICAL_DIVISIONS) {
      expect(state.agents.filter((a) => a.divisionId === div.id)).toHaveLength(
        div.agentIds.length,
      );
    }

    const marker = `P19-SSE-${Date.now()}`;
    await postEvent(
      JSON.stringify(
        buildBacklogUpdatedEvent({
          entityId: marker,
          title: `P19 SSE Census ${marker}`,
        }),
      ),
    );

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((e) => e.includes(marker));
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    await openAgentDossier(page, 17);
    expect(await page.locator('body').innerText()).toContain(
      'Ir. Saskia Wardhani, CISA, CISSP',
    );
    errors.assertZeroErrors();
  });

  test('P20: Backlog Mutation (R2-F3) x 3D Office Live Update (R5-F5) @tier3 @R2-F3 @R5-F5 @office3d @integration', async ({
    browser,
  }) => {
    await waitForHealth(`${URLS.gateway}/health`);
    await waitForHealth(`${URLS.backlogApi}/api/health`);

    const context = await browser.newContext();
    const officePage = await context.newPage();
    const backlogPage = await context.newPage();
    const officeErrors = attachErrorGuards(officePage);
    const backlogErrors = attachErrorGuards(backlogPage);

    try {
      await officePage.goto(URLS.office, { waitUntil: 'domcontentloaded' });
      await waitForOfficeReady(officePage);
      await expect
        .poll(async () => await getConnectionStatus(officePage), { timeout: 10_000 })
        .toMatch(/live|connected/i);

      await backlogPage.goto(URLS.backlogUi, { waitUntil: 'domcontentloaded' });
      await backlogPage.waitForLoadState('networkidle');

      const marker = `P20-BL-${Date.now()}`;
      const createRes = await fetch(`${URLS.backlogApi}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Live Sync ${marker}`,
          type: 'task',
          status: 'groomed',
          priority: 'Must',
          storyPoints: 3,
          ownerDivision: 'lounge',
          ownerAgentId: 23,
          acceptanceCriteria: ['Given backlog mutation, When emitted, Then ticker updates'],
          dependencies: [],
        }),
      });
      expect(createRes.ok).toBe(true);
      const created = extractObject<BacklogItem>(
        await createRes.json(),
        ['item', 'data'],
        'P20 created item',
      );

      await backlogPage.reload({ waitUntil: 'networkidle' });
      expect(await backlogPage.locator('body').innerText()).toContain(marker);

      await expect
        .poll(
          async () => {
            const entries = await getTickerEntries(officePage);
            return entries.some(
              (e) => e.includes(marker) || e.includes(created.id),
            );
          },
          { timeout: 10_000 },
        )
        .toBe(true);

      await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(created.id)}`, {
        method: 'DELETE',
      });

      officeErrors.assertZeroErrors();
      backlogErrors.assertZeroErrors();
    } finally {
      await context.close();
    }
  });

  test('P21: Docs Rubric Edit (R3-F4) x Cross-App Contract Links (R2-F5) @tier3 @R3-F4 @R2-F5 @grooming @apps', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.docsApi}/api/health`);

    const rubricsRes = await fetch(`${URLS.docsApi}/api/rubrics`);
    expect(rubricsRes.ok).toBe(true);
    const rubrics = extractList<RubricEvaluation>(
      await rubricsRes.json(),
      ['rubrics', 'data'],
      'P21 rubrics',
    );
    expect(rubrics.length).toBeGreaterThanOrEqual(1);
    assertValid(validateRubricEvaluation(rubrics[0]!), 'P21 Rubric');

    await page.goto(URLS.docsUi, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const linksText = await page.content();
    expect(linksText).toMatch(/4112|4113|4105/);
    errors.assertZeroErrors();
  });

  test('P22: lms-psikotes Lint Health (R1-F3) x Telemetry Non-Blocking Offline Mode (R5-F4a) @tier3 @R1-F3 @R5-F4a @repo', async () => {
    const lmsClientDir = path.join(REPOS['lms-psikotes'].localPath, 'client');
    const telemetryFile = path.join(
      lmsClientDir,
      'src',
      'shared',
      'services',
      'ecosystemTelemetry.ts',
    );
    expect(fs.existsSync(telemetryFile)).toBe(true);

    const src = fs.readFileSync(telemetryFile, 'utf8');
    expect(src).toContain('VITE_TELEMETRY_GATEWAY_URL');
    expect(src).toMatch(/try\s*\{|\.catch\s*\(/);

    execFileSync('npm', ['run', 'lint'], {
      cwd: lmsClientDir,
      stdio: 'pipe',
    });
  });

  test('P23: Day/Night Lighting Mode (R4-F5) x Zone Signage & Musholla/Gym Activity (R4-F1, R4-F4) @tier3 @R4-F5 @R4-F1 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await toggleDayNight(page);
    await page.waitForTimeout(350);

    await switchFloor(page, 1);
    await jumpToZone(page, 'musholla');
    await page.waitForTimeout(400);
    const mushollaPng = await captureCanvasPng(page);
    expect(measurePngColorDiversity(mushollaPng).distinctBuckets).toBeGreaterThanOrEqual(6);

    await switchFloor(page, 3);
    await jumpToZone(page, 'gym');
    await page.waitForTimeout(400);
    const gymPng1 = await captureCanvasPng(page);
    await page.waitForTimeout(650);
    const gymPng2 = await captureCanvasPng(page);

    expect(measurePngColorDiversity(gymPng1).distinctBuckets).toBeGreaterThanOrEqual(6);
    expect(measurePixelDiffPercent(gymPng1, gymPng2)).toBeGreaterThan(0.05);
    errors.assertZeroErrors();
  });

  test('P24: Multi-Repo Git/Remote Consistency (R1-F1) x Ecosystem Suite Clean Run (R5-F6) @tier3 @R1-F1 @R5-F6 @repo', async () => {
    for (const repo of Object.values(REPOS)) {
      expect(fs.existsSync(repo.localPath)).toBe(true);
      expect((FORBIDDEN_PORTS as readonly number[]).includes(repo.apiPort)).toBe(false);

      const inside = execFileSync(
        'git',
        ['-C', repo.localPath, 'rev-parse', '--is-inside-work-tree'],
        { encoding: 'utf8' },
      ).trim();
      expect(inside).toBe('true');

      const remoteUrl = execFileSync(
        'git',
        ['-C', repo.localPath, 'remote', 'get-url', 'origin'],
        { encoding: 'utf8' },
      ).trim();
      expect(remoteUrl).toContain(`${GITHUB_OWNER}/`);
    }
  });
});

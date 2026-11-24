import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  buildGitHubIssuesPayload,
  buildGitHubPullRequestPayload,
  buildGitHubPushPayload,
  MALFORMED_WEBHOOK_PAYLOADS,
} from '../../fixtures/github-webhooks.ts';
import {
  buildAgentTaskCompletedEvent,
  buildLmsActivityEvent,
  INVALID_TELEMETRY_FIXTURES,
} from '../../fixtures/telemetry-events.ts';
import {
  CANONICAL_DIVISION_IDS,
  CANONICAL_ZONE_TYPES,
} from '../../helpers/canonical.ts';
import {
  FORBIDDEN_PORTS,
  GITHUB_OWNER,
  REPOS,
  URLS,
} from '../../helpers/env.ts';
import {
  getEvents,
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
  validateNoPiiInEvent,
  validateRubricEvaluation,
  validateSprint,
  type BacklogItem,
  type DocEntry,
  type RubricEvaluation,
  type Sprint,
} from '../../helpers/schema-validators.ts';

function extractList<T>(body: unknown, keys: string[], label: string): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object') {
    const obj = body as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  throw new Error(`Expected array or {${keys.join('|')}: []} for ${label}`);
}

function extractObject<T>(body: unknown, keys: string[], label: string): T {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const obj = body as Record<string, unknown>;
    for (const key of keys) {
      if (obj[key] && typeof obj[key] === 'object') return obj[key] as T;
    }
    return obj as T;
  }
  throw new Error(`Expected object for ${label}`);
}

test.describe('Tier 4 — Real-World Ecosystem & 3D Office Workloads (S01..S12) (@tier4)', () => {
  test('S01: Full Sprint Kickoff Cycle (Backlog -> Sprint -> Docs -> Gateway -> 3D Office Floor 2) @tier4 @R2-F3 @R2-F2 @R2-F1 @R2-F5 @R2-F4 @R5-F5 @R4-F1 @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await waitForHealth(`${URLS.backlogApi}/api/health`);
    await waitForHealth(`${URLS.sprintApi}/api/health`);
    await waitForHealth(`${URLS.docsApi}/api/health`);

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await switchFloor(page, 2);

    const marker = `S01-KICKOFF-${Date.now()}`;
    const blRes = await fetch(`${URLS.backlogApi}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Sprint Kickoff ${marker}`,
        type: 'story',
        status: 'groomed',
        priority: 'Must',
        storyPoints: 8,
        ownerDivision: 'engineering',
        ownerAgentId: 5,
        acceptanceCriteria: ['Given sprint kickoff, When assigned, Then 3D Office ticker updates'],
        dependencies: [],
      }),
    });
    expect(blRes.ok).toBe(true);
    const createdItem = extractObject<BacklogItem>(
      await blRes.json(),
      ['item', 'data'],
      'S01 BacklogItem',
    );
    assertValid(validateBacklogItem(createdItem), 'S01 BacklogItem');

    const sprintsRes = await fetch(`${URLS.sprintApi}/api/sprints`);
    const sprints = extractList<Sprint>(await sprintsRes.json(), ['sprints', 'data'], 'S01 sprints');
    expect(sprints.length).toBeGreaterThan(0);
    const sprintId = sprints[0]!.id;

    const assignRes = await fetch(
      `${URLS.sprintApi}/api/sprints/${encodeURIComponent(sprintId)}/assign`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: createdItem.id }),
      },
    );
    expect(assignRes.ok).toBe(true);

    const ceremonyRes = await fetch(
      `${URLS.sprintApi}/api/sprints/${encodeURIComponent(sprintId)}/ceremonies`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'planning',
          notes: `Kickoff ceremony for ${marker}`,
          agentId: 18,
        }),
      },
    );
    expect(ceremonyRes.ok).toBe(true);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some(
            (e) =>
              e.includes(marker) ||
              e.includes(createdItem.id) ||
              e.includes(sprintId),
          );
        },
        { timeout: 10_000 },
      )
      .toBe(true);

    const state = await readOfficeState(page);
    expect(state.activeFloor).toBe(2);

    await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(createdItem.id)}`, {
      method: 'DELETE',
    });
    errors.assertZeroErrors();
  });

  test('S02: GitHub PR Merge to Production Pipeline (push -> PR opened/merged -> issue closed) @tier4 @R5-F2 @R2-F4 @R3-F1 @R4-F4 @R5-F5 @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const stamp = Date.now();
    const pushRes = await postGitHubWebhook(
      'push',
      buildGitHubPushPayload({
        head_commit: {
          id: `aa11${stamp.toString(16).padEnd(36, '0').slice(0, 36)}`,
          message: `feat(pipeline): S02-PUSH-${stamp}`,
          timestamp: new Date().toISOString(),
        },
      }),
    );
    expect(pushRes.ok).toBe(true);

    const prOpenedRes = await postGitHubWebhook(
      'pull_request',
      buildGitHubPullRequestPayload('opened', false),
    );
    expect(prOpenedRes.ok).toBe(true);

    const prMergedRes = await postGitHubWebhook(
      'pull_request',
      buildGitHubPullRequestPayload('closed', true),
    );
    expect(prMergedRes.ok).toBe(true);

    const issueClosedRes = await postGitHubWebhook(
      'issues',
      buildGitHubIssuesPayload('closed'),
    );
    expect(issueClosedRes.ok).toBe(true);

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.length > 0;
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const state = await readOfficeState(page);
    expect(state.agents).toHaveLength(24);
    errors.assertZeroErrors();
  });

  test('S03: LMS Psikotes Candidate Assessment Burst with Zero PII Leakage @tier4 @R5-F4a @R2-F4 @R3-F1 @R5-F5 @R4-F6 @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const stamp = Date.now();
    const modules = ['kraepelin', 'typing', 'tryout'] as const;
    for (const mod of modules) {
      const evt = buildLmsActivityEvent({
        entityId: `LMS-${mod.toUpperCase()}-${stamp}`,
        title: `LMS ${mod} batch ${stamp}`,
        summary: `Anonymized cohort completed ${mod} module (${stamp})`,
        metadata: { module: mod, candidateRef: `ANON-${stamp}` },
      });
      const res = await postEvent(JSON.stringify(evt));
      expect(res.status).toBe(202);
    }

    await expect
      .poll(
        async () => {
          const entries = await getTickerEntries(page);
          return entries.some((e) => e.includes(String(stamp)));
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    const eventsRes = await getEvents({ source: 'lms-psikotes', limit: 20 });
    expect(eventsRes.ok).toBe(true);
    assertValid(validateNoPiiInEvent(eventsRes.data), 'S03 Gateway LMS events PII audit');

    await openAgentDossier(page, 23);
    expect(await page.locator('body').innerText()).toContain('Maya Safitri, S.Psi., CHRP');
    errors.assertZeroErrors();
  });

  test('S04: Executive Building Inspection Walkthrough (All 3 Floors, 7 Zones, 3 POVs) @tier4 @R4-F1 @R4-F2 @R4-F3 @R4-F5 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchPov(page, 'overview');
    for (const floor of [1, 2, 3, 'all'] as const) {
      await switchFloor(page, floor);
      await page.waitForTimeout(350);
      expect((await readOfficeState(page)).activeFloor).toBe(floor);
    }

    for (const zone of CANONICAL_ZONE_TYPES) {
      await jumpToZone(page, zone);
      await page.waitForTimeout(220);
    }

    await switchFloor(page, 1);
    await switchPov(page, 'first-person');
    await page.waitForTimeout(350);
    await page.locator('canvas').first().click();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(350);
    await page.keyboard.up('KeyW');

    await openAgentDossier(page, 0);
    await switchPov(page, 'third-person');
    await page.waitForTimeout(350);

    await toggleDayNight(page);
    await page.waitForTimeout(350);
    const gl = await assertWebGLCanvasActive(page);
    expect(gl.nonBlankSampleCount).toBeGreaterThanOrEqual(6);

    errors.assertZeroErrors();
  });

  test('S05: Corporate Daily Routine & Inter-Floor Elevator Simulation @tier4 @R4-F2 @R4-F4 @R4-F5 @R3-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 'all');
    await page.waitForTimeout(450);

    const frame1 = await captureCanvasPng(page);
    const s1 = await readOfficeState(page);
    await page.waitForTimeout(900);
    const frame2 = await captureCanvasPng(page);
    const s2 = await readOfficeState(page);

    expect(measurePixelDiffPercent(frame1, frame2)).toBeGreaterThan(0.05);
    expect(s1.agents).toHaveLength(24);
    expect(s2.agents).toHaveLength(24);

    for (const a of s2.agents) {
      expect(Number.isFinite(a.position.x)).toBe(true);
      expect(Number.isFinite(a.position.y)).toBe(true);
      expect(Number.isFinite(a.position.z)).toBe(true);
      expect(a.activity.trim().length).toBeGreaterThan(0);
    }

    errors.assertZeroErrors();
  });

  test('S06: 6-Division Multi-Agent Architecture & Rubric Audit @tier4 @R3-F1 @R3-F2 @R3-F3 @R3-F4 @R2-F1 @grooming', async () => {
    await waitForHealth(`${URLS.docsApi}/api/health`);
    await waitForHealth(`${URLS.backlogApi}/api/health`);
    await waitForHealth(`${URLS.sprintApi}/api/health`);

    const [docsRes, rubricsRes, backlogRes, sprintsRes] = await Promise.all([
      fetch(`${URLS.docsApi}/api/docs`),
      fetch(`${URLS.docsApi}/api/rubrics`),
      fetch(`${URLS.backlogApi}/api/items`),
      fetch(`${URLS.sprintApi}/api/sprints`),
    ]);

    expect(docsRes.ok).toBe(true);
    expect(rubricsRes.ok).toBe(true);
    expect(backlogRes.ok).toBe(true);
    expect(sprintsRes.ok).toBe(true);

    const docs = extractList<DocEntry>(await docsRes.json(), ['docs', 'items', 'data'], 'S06 docs');
    const rubrics = extractList<RubricEvaluation>(await rubricsRes.json(), ['rubrics', 'data'], 'S06 rubrics');
    const items = extractList<BacklogItem>(await backlogRes.json(), ['items', 'data'], 'S06 backlog');
    const sprints = extractList<Sprint>(await sprintsRes.json(), ['sprints', 'data'], 'S06 sprints');

    expect(docs.length).toBeGreaterThan(0);
    assertValid(validateDocEntry(docs[0]!), 'S06 DocEntry');
    expect(rubrics.length).toBeGreaterThan(0);
    assertValid(validateRubricEvaluation(rubrics[0]!), 'S06 Rubric');
    expect(sprints.length).toBeGreaterThan(0);
    assertValid(validateSprint(sprints[0]!), 'S06 Sprint');

    const itemDivs = new Set(items.map((i) => i.ownerDivision));
    for (const divId of CANONICAL_DIVISION_IDS) {
      expect(itemDivs.has(divId)).toBe(true);
    }
  });

  test('S07: Cross-App Ecosystem Navigation & CSV Export Sanitization Audit @tier4 @R2-F5 @R2-F3 @R2-F2 @R2-F1 @R1-F3 @apps', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);

    for (const url of [URLS.docsUi, URLS.backlogUi, URLS.sprintUi, URLS.office]) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      const text = await page.locator('body').innerText();
      expect(text.trim().length).toBeGreaterThan(0);
    }

    const formulaItemRes = await fetch(`${URLS.backlogApi}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '=CMD("calc")',
        type: 'bug',
        status: 'groomed',
        priority: 'Could',
        storyPoints: 1,
        ownerDivision: 'qa',
        ownerAgentId: 7,
        acceptanceCriteria: ['Given formula title, When CSV exported, Then sanitized'],
        dependencies: [],
      }),
    });
    expect(formulaItemRes.ok).toBe(true);
    const created = extractObject<BacklogItem>(
      await formulaItemRes.json(),
      ['item', 'data'],
      'S07 formula item',
    );

    const csvRes = await fetch(`${URLS.backlogApi}/api/items/export.csv`);
    expect(csvRes.ok).toBe(true);
    const csvText = await csvRes.text();
    expect(csvText).not.toMatch(/(?:^|,|\r?\n)=CMD\(/);

    await fetch(`${URLS.backlogApi}/api/items/${encodeURIComponent(created.id)}`, {
      method: 'DELETE',
    });
    errors.assertZeroErrors();
  });

  test('S08: Gateway Resilience & Reconnect Under Live Load @tier4 @R2-F4 @R5-F5 @R4-F6 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);

    let allowWs = true;
    await page.routeWebSocket('**/ws', (ws) => {
      if (!allowWs) {
        ws.close({ code: 1012, reason: 'Simulated restart' });
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
    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 10_000 })
      .toMatch(/live|connected/i);

    allowWs = false;
    await page.waitForTimeout(800);
    const marker = `S08-RECONN-${Date.now()}`;
    await postEvent(
      JSON.stringify(
        buildAgentTaskCompletedEvent({
          entityId: marker,
          title: `S08 Recovery ${marker}`,
        }),
      ),
    );

    allowWs = true;
    await expect
      .poll(async () => await getConnectionStatus(page), { timeout: 12_000 })
      .toMatch(/live|connected/i);

    const state = await readOfficeState(page);
    expect(state.agents).toHaveLength(24);
    errors.assertZeroErrors();
  });

  test('S09: Security & Webhook Rejection Drill Across Gateway & Apps @tier4 @R5-F2 @R2-F4 @R2-F3 @R2-F1 @R5-F5 @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const badSigRes = await postGitHubWebhook(
      'push',
      buildGitHubPushPayload(),
      { signatureOverride: 'sha256=deadbeef' },
    );
    expect([401, 403]).toContain(badSigRes.status);

    const malformedRes = await postGitHubWebhook(
      'push',
      MALFORMED_WEBHOOK_PAYLOADS.invalidJsonString,
    );
    expect(malformedRes.status).toBeGreaterThanOrEqual(400);
    expect(malformedRes.status).toBeLessThan(500);

    const badEventMarker = `S09-REJECTED-${Date.now()}`;
    const badEventRes = await postEvent({
      ...INVALID_TELEMETRY_FIXTURES.invalidAgentId,
      entityId: badEventMarker,
      title: badEventMarker,
    });
    expect(badEventRes.status).toBeGreaterThanOrEqual(400);
    expect(badEventRes.status).toBeLessThan(500);

    await page.waitForTimeout(400);
    const entries = await getTickerEntries(page);
    expect(entries.some((e) => e.includes(badEventMarker))).toBe(false);
    errors.assertZeroErrors();
  });

  test('S10: Agent Dossier Deep-Dive & Cross-Floor Follow Synchronization @tier4 @R4-F6 @R4-F3 @R3-F1 @R5-F5 @office3d @integration', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await searchAgents(page, 'Saskia');
    await openAgentDossier(page, 17);
    await switchPov(page, 'third-person');
    await page.waitForTimeout(450);

    const marker = `S10-SEC-${Date.now()}`;
    const res = await postEvent(
      JSON.stringify(
        buildAgentTaskCompletedEvent({
          agentId: 17,
          divisionId: 'devops',
          targetFloor: 3,
          entityId: marker,
          title: `SecOps Audit ${marker}`,
          summary: `Ir. Saskia Wardhani completed ${marker}`,
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
        { timeout: 8_000 },
      )
      .toBe(true);

    const state = await readOfficeState(page);
    expect(state.activePov).toBe('third-person');
    expect(await page.locator('body').innerText()).toContain(
      'Ir. Saskia Wardhani, CISA, CISSP',
    );
    errors.assertZeroErrors();
  });

  test('S11: Decoupled lms-psikotes Integrity, Lint, Unit Tests & Telemetry Safety @tier4 @R1-F3 @R5-F4a @R1-F1 @repo', async () => {
    const lmsRoot = REPOS['lms-psikotes'].localPath;
    const lmsClient = path.join(lmsRoot, 'client');
    const legacyPath = path.join(lmsRoot, 'docs', 'kantor_ai_3d.html');

    if (fs.existsSync(legacyPath)) {
      const content = fs.readFileSync(legacyPath, 'utf8');
      expect(content.length).toBeLessThan(8_000);
      expect(content).toMatch(/lokatalenta-office-3d/i);
    }

    const telemetryPath = path.join(
      lmsClient,
      'src',
      'shared',
      'services',
      'ecosystemTelemetry.ts',
    );
    expect(fs.existsSync(telemetryPath)).toBe(true);

    execFileSync('npm', ['run', 'lint'], { cwd: lmsClient, stdio: 'pipe' });
    execFileSync('npm', ['test'], { cwd: lmsClient, stdio: 'pipe' });
  });

  test('S12: Multi-Repo GitHub & Local Ecosystem Cleanliness Audit @tier4 @R1-F1 @R1-F2 @R1-F3 @R5-F6 @repo', async () => {
    for (const repo of Object.values(REPOS)) {
      expect(fs.existsSync(repo.localPath)).toBe(true);
      expect((FORBIDDEN_PORTS as readonly number[]).includes(repo.apiPort)).toBe(false);

      const isGit = execFileSync(
        'git',
        ['-C', repo.localPath, 'rev-parse', '--is-inside-work-tree'],
        { encoding: 'utf8' },
      ).trim();
      expect(isGit).toBe('true');

      const origin = execFileSync(
        'git',
        ['-C', repo.localPath, 'remote', 'get-url', 'origin'],
        { encoding: 'utf8' },
      ).trim();
      expect(origin).toContain(`${GITHUB_OWNER}/`);
    }

    for (const healthUrl of [
      `${URLS.gateway}/health`,
      `${URLS.backlogApi}/api/health`,
      `${URLS.sprintApi}/api/health`,
      `${URLS.docsApi}/api/health`,
      `${URLS.office}/`,
    ]) {
      const res = await waitForHealth(healthUrl, 8_000);
      expect(res.ok).toBe(true);
    }

    const samplePng = measurePngColorDiversity;
    expect(typeof samplePng).toBe('function');
  });
});

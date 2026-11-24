import { expect, test } from '@playwright/test';
import {
  CANONICAL_AGENTS,
  CANONICAL_DIVISIONS,
  FORBIDDEN_LEGACY_ALIAS_DRIFTS,
  LEGACY_DRIFT_NAMES,
} from '../../helpers/canonical.ts';
import { URLS } from '../../helpers/env.ts';
import {
  assertWebGLCanvasActive,
  attachErrorGuards,
  captureCanvasPng,
  jumpToZone,
  measurePixelDiffPercent,
  measurePngColorDiversity,
  openAgentDossier,
  readOfficeState,
  searchAgents,
  switchFloor,
  toggleDayNight,
  waitForOfficeReady,
} from '../../helpers/office-driver.ts';

test.describe('Tier 1 — 3D Office Animations, Lighting/Props & Dossier Lifecycle (@tier1 @office3d)', () => {
  // =========================================================================
  // @R4-F4: Fluid Articulated Animations & Daily Routines (5 tests)
  // =========================================================================

  test('renders live animated frames over time with measurable visual motion @tier1 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const frame1 = await captureCanvasPng(page);
    await page.waitForTimeout(900);
    const frame2 = await captureCanvasPng(page);

    const diff = measurePixelDiffPercent(frame1, frame2);
    expect(diff).toBeGreaterThan(0.05);

    errors.assertZeroErrors();
  });

  test('simulates diverse enterprise daily activities across the 24 agents @tier1 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);

    const activities = new Set(state.agents.map((a) => a.activity.trim().toLowerCase()));
    const zones = new Set(state.agents.map((a) => a.zone.trim().toLowerCase()));

    expect(activities.size).toBeGreaterThanOrEqual(2);
    expect(zones.size).toBeGreaterThanOrEqual(2);
    for (const agent of state.agents) {
      expect(agent.activity.trim().length).toBeGreaterThan(0);
    }

    errors.assertZeroErrors();
  });

  test('moves agents smoothly without erratic teleportation spikes across ticks @tier1 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const s0 = await waitForOfficeReady(page);

    await page.waitForTimeout(400);
    const s1 = await readOfficeState(page);

    for (const a0 of s0.agents) {
      const a1 = s1.agents.find((a) => a.id === a0.id)!;
      expect(Number.isFinite(a1.position.x)).toBe(true);
      expect(Number.isFinite(a1.position.y)).toBe(true);
      expect(Number.isFinite(a1.position.z)).toBe(true);

      if (a0.floor === a1.floor) {
        const stepDist = Math.hypot(
          a1.position.x - a0.position.x,
          a1.position.z - a0.position.z,
        );
        expect(stepDist).toBeLessThan(25);
      }
    }

    errors.assertZeroErrors();
  });

  test('ensures every agent ID 0..23 and division assignment matches canonical contract @tier1 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);

    expect(state.agents).toHaveLength(24);
    for (const canonical of CANONICAL_AGENTS) {
      const actual = state.agents.find((a) => a.id === canonical.id);
      expect(actual).toBeDefined();
      expect(actual!.divisionId).toBe(canonical.divisionId);
    }

    errors.assertZeroErrors();
  });

  test('keeps all agent elevations aligned with valid building floor levels @tier1 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);

    const floorYValues = new Map<number, number[]>();
    for (const agent of state.agents) {
      expect(agent.position.y).toBeGreaterThanOrEqual(-0.5);
      expect(agent.position.y).toBeLessThan(100);
      const list = floorYValues.get(agent.floor) ?? [];
      list.push(agent.position.y);
      floorYValues.set(agent.floor, list);
    }

    const f2Ys = floorYValues.get(2);
    const f3Ys = floorYValues.get(3);
    if (f2Ys && f2Ys.length > 0 && f3Ys && f3Ys.length > 0) {
      const avgF2 = f2Ys.reduce((a, b) => a + b, 0) / f2Ys.length;
      const avgF3 = f3Ys.reduce((a, b) => a + b, 0) / f3Ys.length;
      expect(avgF3).toBeGreaterThan(avgF2);
    }

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F5: Realistic Lighting, Shadows, PBR Materials & Props (5 tests)
  // =========================================================================

  test('renders rich multi-material color diversity across the 3D Office @tier1 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const png = await captureCanvasPng(page);
    const diversity = measurePngColorDiversity(png);
    expect(diversity.distinctBuckets).toBeGreaterThanOrEqual(12);

    errors.assertZeroErrors();
  });

  test('Day/Night lighting cycle toggle visibly transforms scene illumination @tier1 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const initialState = await waitForOfficeReady(page);

    const dayPng = await captureCanvasPng(page);
    await toggleDayNight(page);
    await page.waitForTimeout(450);

    const toggledState = await readOfficeState(page);
    const nightPng = await captureCanvasPng(page);

    if (
      initialState.dayNightMode !== undefined &&
      toggledState.dayNightMode !== undefined
    ) {
      expect(toggledState.dayNightMode).not.toBe(initialState.dayNightMode);
    }
    expect(measurePixelDiffPercent(dayPng, nightPng)).toBeGreaterThan(2);

    errors.assertZeroErrors();
  });

  test('Floor 1 Lobby, Cafeteria & Musholla display distinct lighting and props framing @tier1 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await switchFloor(page, 1);

    await jumpToZone(page, 'lobby');
    await page.waitForTimeout(400);
    const lobbyPng = await captureCanvasPng(page);

    await jumpToZone(page, 'cafeteria');
    await page.waitForTimeout(400);
    const cafePng = await captureCanvasPng(page);

    await jumpToZone(page, 'musholla');
    await page.waitForTimeout(400);
    const mushollaPng = await captureCanvasPng(page);

    expect(measurePngColorDiversity(lobbyPng).distinctBuckets).toBeGreaterThanOrEqual(8);
    expect(measurePngColorDiversity(cafePng).distinctBuckets).toBeGreaterThanOrEqual(8);
    expect(measurePngColorDiversity(mushollaPng).distinctBuckets).toBeGreaterThanOrEqual(8);
    expect(measurePixelDiffPercent(lobbyPng, mushollaPng)).toBeGreaterThan(2);

    errors.assertZeroErrors();
  });

  test('Floor 2 Meeting Rooms & Workspaces display distinct props and depth @tier1 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await switchFloor(page, 2);

    await jumpToZone(page, 'workspace');
    await page.waitForTimeout(400);
    const wsPng = await captureCanvasPng(page);

    await jumpToZone(page, 'meeting-rooms');
    await page.waitForTimeout(400);
    const mrPng = await captureCanvasPng(page);

    expect(measurePngColorDiversity(wsPng).distinctBuckets).toBeGreaterThanOrEqual(8);
    expect(measurePngColorDiversity(mrPng).distinctBuckets).toBeGreaterThanOrEqual(8);
    expect(measurePixelDiffPercent(wsPng, mrPng)).toBeGreaterThan(1);

    errors.assertZeroErrors();
  });

  test('Floor 3 Relaxation Lounge & Wellness Gym render distinct equipment visuals @tier1 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await switchFloor(page, 3);

    await jumpToZone(page, 'relaxation');
    await page.waitForTimeout(400);
    const relaxPng = await captureCanvasPng(page);

    await jumpToZone(page, 'gym');
    await page.waitForTimeout(400);
    const gymPng = await captureCanvasPng(page);

    expect(measurePngColorDiversity(relaxPng).distinctBuckets).toBeGreaterThanOrEqual(8);
    expect(measurePngColorDiversity(gymPng).distinctBuckets).toBeGreaterThanOrEqual(8);
    expect(measurePixelDiffPercent(relaxPng, gymPng)).toBeGreaterThan(1);

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F6: Dossier, Search, Census & WebGL Lifecycle Hygiene (5 tests)
  // =========================================================================

  test('displays all 24 canonical agent names with zero legacy name drifts @tier1 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);

    const driftSet = new Set<string>(LEGACY_DRIFT_NAMES);
    const aliasSet = new Set<string>(FORBIDDEN_LEGACY_ALIAS_DRIFTS);
    const pageText = await page.locator('body').innerText();

    for (const canonical of CANONICAL_AGENTS) {
      const diagAgent = state.agents.find((a) => a.id === canonical.id)!;
      if (diagAgent.name) {
        expect(diagAgent.name).toBe(canonical.name);
        expect(driftSet.has(diagAgent.name)).toBe(false);
      }
      expect(pageText).toContain(canonical.name);
    }

    for (const forbidden of aliasSet) {
      expect(pageText).not.toContain(forbidden);
    }

    errors.assertZeroErrors();
  });

  test('Agent Search filters roster by canonical name and restores on clear @tier1 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await searchAgents(page, 'Saskia Wardhani');
    await page.waitForTimeout(200);
    const filteredText = await page.locator('body').innerText();
    expect(filteredText).toContain('Ir. Saskia Wardhani, CISA, CISSP');

    await searchAgents(page, '');
    await page.waitForTimeout(200);
    const restoredText = await page.locator('body').innerText();
    expect(restoredText).toContain('Rizco Renova');
    expect(restoredText).toContain('Maya Safitri, S.Psi., CHRP');

    errors.assertZeroErrors();
  });

  test('opening an Agent Dossier displays canonical role, division, and activity @tier1 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await openAgentDossier(page, 21);
    await page.waitForTimeout(250);

    const state = await readOfficeState(page);
    if (state.selectedAgentId !== undefined && state.selectedAgentId !== null) {
      expect(state.selectedAgentId).toBe(21);
    }

    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Dr. Gibran Al-Farabi, Ph.D.');

    errors.assertZeroErrors();
  });

  test('Division Census accurately accounts for all 6 divisions totaling 24 agents @tier1 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);

    let total = 0;
    for (const div of CANONICAL_DIVISIONS) {
      const agentsInDiv = state.agents.filter((a) => a.divisionId === div.id);
      expect(agentsInDiv).toHaveLength(div.agentIds.length);
      total += agentsInDiv.length;
    }
    expect(total).toBe(24);

    errors.assertZeroErrors();
  });

  test('handles viewport resize cleanly without losing WebGL context or HUD @tier1 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await page.setViewportSize({ width: 1024, height: 640 });
    await page.waitForTimeout(350);
    const glSmall = await assertWebGLCanvasActive(page);
    expect(glSmall.hasWebGLContext).toBe(true);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(350);
    const glLarge = await assertWebGLCanvasActive(page);
    expect(glLarge.hasWebGLContext).toBe(true);

    errors.assertZeroErrors();
  });
});

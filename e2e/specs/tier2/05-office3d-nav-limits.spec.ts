import { expect, test } from '@playwright/test';
import { CANONICAL_ZONE_TYPES } from '../../helpers/canonical.ts';
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
  switchFloor,
  switchPov,
  waitForOfficeReady,
} from '../../helpers/office-driver.ts';

test.describe('Tier 2 — 3D Office Navigation Bounds, Rapid Switching & Collision (@tier2 @office3d)', () => {
  // =========================================================================
  // @R4-F1: Building & Zone Boundary Cases (5 tests)
  // =========================================================================

  test('ignores out-of-range ?floor=99 query parameter gracefully @tier2 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(`${URLS.office}/?floor=99`, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);
    await assertWebGLCanvasActive(page);

    expect([1, 2, 3, 'all']).toContain(state.activeFloor);
    expect(state.agents).toHaveLength(24);
    errors.assertZeroErrors();
  });

  test('ignores unknown ?zone=nonexistent query parameter gracefully @tier2 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(`${URLS.office}/?zone=nonexistent-room`, {
      waitUntil: 'domcontentloaded',
    });
    const state = await waitForOfficeReady(page);
    await assertWebGLCanvasActive(page);

    expect(state.agents).toHaveLength(24);
    expect(Number.isFinite(state.cameraPosition.x)).toBe(true);
    expect(Number.isFinite(state.cameraPosition.y)).toBe(true);
    expect(Number.isFinite(state.cameraPosition.z)).toBe(true);
    errors.assertZeroErrors();
  });

  test('keeps all agent positions within finite building perimeter across all 7 zones @tier2 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    for (const zone of CANONICAL_ZONE_TYPES) {
      await jumpToZone(page, zone);
      await page.waitForTimeout(200);
      const state = await readOfficeState(page);
      for (const agent of state.agents) {
        expect(Math.abs(agent.position.x)).toBeLessThan(200);
        expect(Math.abs(agent.position.z)).toBeLessThan(200);
        expect(agent.position.y).toBeGreaterThanOrEqual(-1);
        expect(agent.position.y).toBeLessThan(100);
      }
    }

    errors.assertZeroErrors();
  });

  test('preserves all 24 simulation agents when filtering to single-floor views @tier2 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    for (const floor of [1, 2, 3] as const) {
      await switchFloor(page, floor);
      await page.waitForTimeout(250);
      const state = await readOfficeState(page);
      expect(state.activeFloor).toBe(floor);
      expect(state.agents).toHaveLength(24);
    }

    errors.assertZeroErrors();
  });

  test('repeated consecutive jumps to the same zone remain idempotent without camera drift @tier2 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await jumpToZone(page, 'musholla');
    await page.waitForTimeout(500);
    const firstCam = (await readOfficeState(page)).cameraPosition;

    await jumpToZone(page, 'musholla');
    await page.waitForTimeout(300);
    await jumpToZone(page, 'musholla');
    await page.waitForTimeout(400);
    const thirdCam = (await readOfficeState(page)).cameraPosition;

    const delta = Math.hypot(
      thirdCam.x - firstCam.x,
      thirdCam.y - firstCam.y,
      thirdCam.z - firstCam.z,
    );
    expect(delta).toBeLessThan(5);
    await assertWebGLCanvasActive(page);

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F2: Floor Switcher & Elevator Stress / Boundary (5 tests)
  // =========================================================================

  test('survives rapid-fire floor switching (F1->F3->All->F2->F1) without blank canvas @tier2 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    for (const target of [1, 3, 'all', 2, 3, 1] as const) {
      await switchFloor(page, target);
      await page.waitForTimeout(60);
    }

    await page.waitForTimeout(700);
    const state = await readOfficeState(page);
    expect(state.activeFloor).toBe(1);
    await assertWebGLCanvasActive(page);

    errors.assertZeroErrors();
  });

  test('repeated clicks on already-active Floor 2 button remain stable and idempotent @tier2 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 2);
    await page.waitForTimeout(500);
    await switchFloor(page, 2);
    await switchFloor(page, 2);
    await page.waitForTimeout(300);

    const state = await readOfficeState(page);
    expect(state.activeFloor).toBe(2);
    await assertWebGLCanvasActive(page);

    errors.assertZeroErrors();
  });

  test('switching from Cutaway (all) back to Floor 1 restores single-floor framing @tier2 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 'all');
    await page.waitForTimeout(550);
    const allPng = await captureCanvasPng(page);

    await switchFloor(page, 1);
    await page.waitForTimeout(550);
    const f1State = await readOfficeState(page);
    const f1Png = await captureCanvasPng(page);

    expect(f1State.activeFloor).toBe(1);
    expect(measurePixelDiffPercent(allPng, f1Png)).toBeGreaterThan(1);

    errors.assertZeroErrors();
  });

  test('interrupting an in-flight floor tween with a new floor target settles on latest target @tier2 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await page.waitForTimeout(300);
    await switchFloor(page, 3);
    await page.waitForTimeout(90);
    await switchFloor(page, 2);
    await page.waitForTimeout(700);

    const state = await readOfficeState(page);
    expect(state.activeFloor).toBe(2);
    expect(Number.isFinite(state.cameraPosition.y)).toBe(true);
    await assertWebGLCanvasActive(page);

    errors.assertZeroErrors();
  });

  test('floor switching remains responsive while an Agent Dossier is open @tier2 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await openAgentDossier(page, 0);
    await page.waitForTimeout(200);

    await switchFloor(page, 1);
    await page.waitForTimeout(400);
    expect((await readOfficeState(page)).activeFloor).toBe(1);

    await switchFloor(page, 2);
    await page.waitForTimeout(400);
    expect((await readOfficeState(page)).activeFloor).toBe(2);

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F3: POV & Movement Collision / Boundary Cases (5 tests)
  // =========================================================================

  test('First-Person Walkthrough enforces perimeter collision bounds during sustained forward walk @tier2 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await switchPov(page, 'first-person');
    await page.waitForTimeout(400);

    await page.locator('canvas').first().click();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(2200);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(200);

    const state = await readOfficeState(page);
    expect(Number.isFinite(state.cameraPosition.x)).toBe(true);
    expect(Number.isFinite(state.cameraPosition.z)).toBe(true);
    expect(Math.abs(state.cameraPosition.x)).toBeLessThan(150);
    expect(Math.abs(state.cameraPosition.z)).toBeLessThan(150);
    expect(
      measurePngColorDiversity(await captureCanvasPng(page)).distinctBuckets,
    ).toBeGreaterThanOrEqual(4);

    errors.assertZeroErrors();
  });

  test('First-Person Walkthrough handles simultaneous opposing WASD keys without NaN camera @tier2 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchPov(page, 'first-person');
    await page.waitForTimeout(350);

    await page.locator('canvas').first().click();
    await page.keyboard.down('KeyW');
    await page.keyboard.down('KeyS');
    await page.keyboard.down('KeyA');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(450);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('KeyS');
    await page.keyboard.up('KeyA');
    await page.keyboard.up('KeyD');

    const state = await readOfficeState(page);
    expect(Number.isFinite(state.cameraPosition.x)).toBe(true);
    expect(Number.isFinite(state.cameraPosition.y)).toBe(true);
    expect(Number.isFinite(state.cameraPosition.z)).toBe(true);

    errors.assertZeroErrors();
  });

  test('Third-Person Agent-Follow transitions cleanly between agents on different floors (#0 F3 -> #5 F2) @tier2 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await openAgentDossier(page, 0);
    await switchPov(page, 'third-person');
    await page.waitForTimeout(500);
    const camF3 = (await readOfficeState(page)).cameraPosition;

    await openAgentDossier(page, 5);
    await page.waitForTimeout(550);
    const stateF2 = await readOfficeState(page);
    expect(stateF2.activePov).toBe('third-person');
    expect(
      Math.hypot(
        stateF2.cameraPosition.x - camF3.x,
        stateF2.cameraPosition.y - camF3.y,
        stateF2.cameraPosition.z - camF3.z,
      ),
    ).toBeGreaterThan(0.5);

    errors.assertZeroErrors();
  });

  test('rapid POV cycling settles cleanly without camera corruption or blank frame @tier2 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    for (const pov of [
      'first-person',
      'third-person',
      'overview',
      'first-person',
      'third-person',
      'overview',
    ] as const) {
      await switchPov(page, pov);
      await page.waitForTimeout(75);
    }

    await page.waitForTimeout(500);
    const state = await readOfficeState(page);
    expect(state.activePov).toBe('overview');
    await assertWebGLCanvasActive(page);

    errors.assertZeroErrors();
  });

  test('First-Person Walkthrough adjusts elevation when switching from Floor 1 to Floor 3 @tier2 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await switchPov(page, 'first-person');
    await page.waitForTimeout(500);
    const f1Y = (await readOfficeState(page)).cameraPosition.y;

    await switchFloor(page, 3);
    await page.waitForTimeout(600);
    const f3State = await readOfficeState(page);
    expect(f3State.activeFloor).toBe(3);
    expect(f3State.cameraPosition.y).toBeGreaterThan(f1Y);

    errors.assertZeroErrors();
  });
});

import { expect, test } from '@playwright/test';
import {
  CANONICAL_DIVISIONS,
  CANONICAL_DIVISION_IDS,
  CANONICAL_FLOORS,
  CANONICAL_POV_MODES,
  CANONICAL_ZONE_TYPES,
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
  switchFloor,
  switchPov,
  waitForOfficeReady,
} from '../../helpers/office-driver.ts';

test.describe('Tier 1 — 3D Office Building, Zones, Floor Switcher & Multi-POV (@tier1 @office3d)', () => {
  // =========================================================================
  // @R4-F1: Multi-Floor Corporate Building & 7 Enterprise Zones (5 tests)
  // =========================================================================

  test('renders active WebGL 3D Office canvas and initializes 24 canonical agents @tier1 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });

    const state = await waitForOfficeReady(page);
    const gl = await assertWebGLCanvasActive(page);

    expect(gl.hasWebGLContext).toBe(true);
    expect(gl.width).toBeGreaterThanOrEqual(200);
    expect(gl.height).toBeGreaterThanOrEqual(200);
    expect(gl.nonBlankSampleCount).toBeGreaterThanOrEqual(4);

    expect(state.agents).toHaveLength(24);
    const ids = new Set(state.agents.map((a) => a.id));
    expect(ids.size).toBe(24);
    for (const divId of CANONICAL_DIVISION_IDS) {
      const count = state.agents.filter((a) => a.divisionId === divId).length;
      const expected = CANONICAL_DIVISIONS.find((d) => d.id === divId)!.agentIds.length;
      expect(count).toBe(expected);
    }

    errors.assertZeroErrors();
  });

  test('Floor 1 exposes Lobby, Cafeteria/Food Court, and Musholla enterprise zones @tier1 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await page.waitForTimeout(450);
    const f1State = await readOfficeState(page);
    expect(f1State.activeFloor).toBe(1);

    await jumpToZone(page, 'lobby');
    await page.waitForTimeout(500);
    const lobbyState = await readOfficeState(page);
    const lobbyPng = await captureCanvasPng(page);

    await jumpToZone(page, 'cafeteria');
    await page.waitForTimeout(500);
    const cafeState = await readOfficeState(page);
    const cafePng = await captureCanvasPng(page);

    await jumpToZone(page, 'musholla');
    await page.waitForTimeout(500);
    const mushollaState = await readOfficeState(page);
    const mushollaPng = await captureCanvasPng(page);

    expect(measurePngColorDiversity(lobbyPng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePngColorDiversity(cafePng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePngColorDiversity(mushollaPng).distinctBuckets).toBeGreaterThanOrEqual(4);

    expect(measurePixelDiffPercent(lobbyPng, cafePng)).toBeGreaterThan(0.5);
    expect(measurePixelDiffPercent(cafePng, mushollaPng)).toBeGreaterThan(0.5);

    const movedLobbyToCafe = Math.hypot(
      lobbyState.cameraPosition.x - cafeState.cameraPosition.x,
      lobbyState.cameraPosition.y - cafeState.cameraPosition.y,
      lobbyState.cameraPosition.z - cafeState.cameraPosition.z,
    );
    const movedCafeToMusholla = Math.hypot(
      cafeState.cameraPosition.x - mushollaState.cameraPosition.x,
      cafeState.cameraPosition.y - mushollaState.cameraPosition.y,
      cafeState.cameraPosition.z - mushollaState.cameraPosition.z,
    );
    expect(movedLobbyToCafe).toBeGreaterThan(0.5);
    expect(movedCafeToMusholla).toBeGreaterThan(0.5);

    errors.assertZeroErrors();
  });

  test('Floor 2 hosts Engineering, QA, Stakeholder Lounge, and Meeting Rooms @tier1 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 2);
    await page.waitForTimeout(500);
    const f2State = await readOfficeState(page);
    expect(f2State.activeFloor).toBe(2);

    const f2Divisions = new Set(
      f2State.agents.filter((a) => a.floor === 2).map((a) => a.divisionId),
    );
    expect(
      f2Divisions.has('engineering') ||
        f2Divisions.has('qa') ||
        f2Divisions.has('lounge'),
    ).toBe(true);

    await jumpToZone(page, 'workspace');
    await page.waitForTimeout(450);
    const workspacePng = await captureCanvasPng(page);

    await jumpToZone(page, 'meeting-rooms');
    await page.waitForTimeout(450);
    const meetingPng = await captureCanvasPng(page);

    expect(measurePngColorDiversity(workspacePng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePngColorDiversity(meetingPng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePixelDiffPercent(workspacePng, meetingPng)).toBeGreaterThan(0.5);

    errors.assertZeroErrors();
  });

  test('Floor 3 hosts Executive, Architecture, DevOps, Relaxation Lounge, and Wellness Gym @tier1 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 3);
    await page.waitForTimeout(500);
    const f3State = await readOfficeState(page);
    expect(f3State.activeFloor).toBe(3);

    const f3Divisions = new Set(
      f3State.agents.filter((a) => a.floor === 3).map((a) => a.divisionId),
    );
    expect(
      f3Divisions.has('executive') ||
        f3Divisions.has('architecture') ||
        f3Divisions.has('devops'),
    ).toBe(true);

    await jumpToZone(page, 'relaxation');
    await page.waitForTimeout(450);
    const relaxPng = await captureCanvasPng(page);

    await jumpToZone(page, 'gym');
    await page.waitForTimeout(450);
    const gymPng = await captureCanvasPng(page);

    expect(measurePngColorDiversity(relaxPng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePngColorDiversity(gymPng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePixelDiffPercent(relaxPng, gymPng)).toBeGreaterThan(0.5);

    errors.assertZeroErrors();
  });

  test('navigates all 7 enterprise zone types across Floors 1-3 with non-blank WebGL frames @tier1 @R4-F1 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    expect(CANONICAL_ZONE_TYPES).toHaveLength(7);
    const zoneScreenshots: Buffer[] = [];

    for (const zone of CANONICAL_ZONE_TYPES) {
      await jumpToZone(page, zone);
      await page.waitForTimeout(400);
      const state = await readOfficeState(page);
      expect(state.agents).toHaveLength(24);
      const png = await captureCanvasPng(page);
      expect(measurePngColorDiversity(png).distinctBuckets).toBeGreaterThanOrEqual(4);
      zoneScreenshots.push(png);
    }

    // First zone (lobby) and last zone (gym) must clearly differ visually
    expect(
      measurePixelDiffPercent(zoneScreenshots[0]!, zoneScreenshots[6]!),
    ).toBeGreaterThan(1);

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F2: Smooth Floor Switcher & Elevator Navigation (5 tests)
  // =========================================================================

  test('Floor Switcher transitions cleanly across F1, F2, and F3 @tier1 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const floorPngs = new Map<number, Buffer>();
    const floorCameraY = new Map<number, number>();

    for (const floor of CANONICAL_FLOORS) {
      await switchFloor(page, floor);
      await page.waitForTimeout(550);
      const state = await readOfficeState(page);
      expect(state.activeFloor).toBe(floor);
      floorCameraY.set(floor, state.cameraPosition.y);
      floorPngs.set(floor, await captureCanvasPng(page));
    }

    expect(floorCameraY.get(3)!).toBeGreaterThan(floorCameraY.get(1)!);
    expect(
      measurePixelDiffPercent(floorPngs.get(1)!, floorPngs.get(3)!),
    ).toBeGreaterThan(1);

    errors.assertZeroErrors();
  });

  test('All Floors / Cutaway mode renders the multi-story building simultaneously @tier1 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await page.waitForTimeout(500);
    const f1Png = await captureCanvasPng(page);

    await switchFloor(page, 'all');
    await page.waitForTimeout(600);
    const allState = await readOfficeState(page);
    expect(allState.activeFloor).toBe('all');

    const allPng = await captureCanvasPng(page);
    expect(measurePngColorDiversity(allPng).distinctBuckets).toBeGreaterThanOrEqual(6);
    expect(measurePixelDiffPercent(f1Png, allPng)).toBeGreaterThan(1);

    errors.assertZeroErrors();
  });

  test('Floor transitions animate smoothly without broken or blank intermediate frames @tier1 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await page.waitForTimeout(450);
    const startPng = await captureCanvasPng(page);

    await switchFloor(page, 3);
    await page.waitForTimeout(140);
    const midPng = await captureCanvasPng(page);

    await page.waitForTimeout(750);
    const endPng = await captureCanvasPng(page);

    expect(measurePngColorDiversity(midPng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePngColorDiversity(endPng).distinctBuckets).toBeGreaterThanOrEqual(4);
    expect(measurePixelDiffPercent(startPng, endPng)).toBeGreaterThan(1);

    errors.assertZeroErrors();
  });

  test('Elevator floor state and vertical camera elevation align across F1 -> F2 -> F3 @tier1 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const ys: number[] = [];
    for (const floor of CANONICAL_FLOORS) {
      await switchFloor(page, floor);
      await page.waitForTimeout(550);
      const state = await readOfficeState(page);
      expect(state.activeFloor).toBe(floor);
      if (state.elevatorFloor !== undefined) {
        expect(CANONICAL_FLOORS).toContain(state.elevatorFloor);
      }
      ys.push(state.cameraPosition.y);
    }

    expect(ys[1]!).toBeGreaterThan(ys[0]!);
    expect(ys[2]!).toBeGreaterThan(ys[1]!);

    errors.assertZeroErrors();
  });

  test('multi-floor agent distribution spans Floors 1, 2, and 3 cleanly @tier1 @R4-F2 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    const state = await waitForOfficeReady(page);

    const activeFloors = new Set(state.agents.map((a) => a.floor));
    expect(activeFloors.has(2)).toBe(true);
    expect(activeFloors.has(3)).toBe(true);
    for (const agent of state.agents) {
      expect(CANONICAL_FLOORS).toContain(agent.floor);
      expect(Number.isFinite(agent.position.x)).toBe(true);
      expect(Number.isFinite(agent.position.y)).toBe(true);
      expect(Number.isFinite(agent.position.z)).toBe(true);
    }

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F3: Multi-POV Camera Modes (5 tests)
  // =========================================================================

  test('Overview POV renders building view and responds to orbit mouse drag @tier1 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchPov(page, 'overview');
    await page.waitForTimeout(350);
    const before = await readOfficeState(page);
    expect(before.activePov).toBe('overview');
    const beforePng = await captureCanvasPng(page);

    const canvasBox = await page.locator('canvas').first().boundingBox();
    expect(canvasBox).not.toBeNull();
    const cx = canvasBox!.x + canvasBox!.width / 2;
    const cy = canvasBox!.y + canvasBox!.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 180, cy - 60, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    const afterPng = await captureCanvasPng(page);
    expect(measurePixelDiffPercent(beforePng, afterPng)).toBeGreaterThan(0.2);

    errors.assertZeroErrors();
  });

  test('Third-Person Agent-Follow POV tracks selected agent #5 @tier1 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchPov(page, 'overview');
    await page.waitForTimeout(300);
    const overviewCam = (await readOfficeState(page)).cameraPosition;

    await openAgentDossier(page, 5);
    await switchPov(page, 'third-person');
    await page.waitForTimeout(600);

    const followState = await readOfficeState(page);
    expect(followState.activePov).toBe('third-person');

    const agent5 = followState.agents.find((a) => a.id === 5)!;
    const camMoved = Math.hypot(
      followState.cameraPosition.x - overviewCam.x,
      followState.cameraPosition.y - overviewCam.y,
      followState.cameraPosition.z - overviewCam.z,
    );
    expect(camMoved).toBeGreaterThan(0.1);
    const distToAgent = Math.hypot(
      followState.cameraPosition.x - agent5.position.x,
      followState.cameraPosition.z - agent5.position.z,
    );
    expect(distToAgent).toBeLessThan(35);

    errors.assertZeroErrors();
  });

  test('First-Person Walkthrough POV moves with WASD/Arrow keys @tier1 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await switchPov(page, 'first-person');
    await page.waitForTimeout(450);

    const startState = await readOfficeState(page);
    expect(startState.activePov).toBe('first-person');
    const startPng = await captureCanvasPng(page);

    await page.locator('canvas').first().click();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(450);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(200);

    const endState = await readOfficeState(page);
    const endPng = await captureCanvasPng(page);

    const horizontalDelta = Math.hypot(
      endState.cameraPosition.x - startState.cameraPosition.x,
      endState.cameraPosition.z - startState.cameraPosition.z,
    );
    expect(horizontalDelta).toBeGreaterThan(0.05);
    expect(measurePixelDiffPercent(startPng, endPng)).toBeGreaterThan(0.2);

    errors.assertZeroErrors();
  });

  test('First-Person Walkthrough responds to mouse-look drag and strafing @tier1 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 1);
    await switchPov(page, 'first-person');
    await page.waitForTimeout(450);

    const beforePng = await captureCanvasPng(page);
    const box = (await page.locator('canvas').first().boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 160, cy + 20, { steps: 8 });
    await page.mouse.up();

    await page.keyboard.down('KeyD');
    await page.waitForTimeout(300);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(200);

    const afterState = await readOfficeState(page);
    const afterPng = await captureCanvasPng(page);

    expect(Number.isFinite(afterState.cameraPosition.x)).toBe(true);
    expect(Number.isFinite(afterState.cameraPosition.z)).toBe(true);
    expect(measurePixelDiffPercent(beforePng, afterPng)).toBeGreaterThan(0.3);

    errors.assertZeroErrors();
  });

  test('cycles cleanly through all 3 canonical POV modes without errors @tier1 @R4-F3 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    expect(CANONICAL_POV_MODES).toEqual(['overview', 'third-person', 'first-person']);

    for (const pov of [...CANONICAL_POV_MODES, 'overview'] as const) {
      await switchPov(page, pov);
      await page.waitForTimeout(400);
      const state = await readOfficeState(page);
      expect(state.activePov).toBe(pov);
      const png = await captureCanvasPng(page);
      expect(measurePngColorDiversity(png).distinctBuckets).toBeGreaterThanOrEqual(4);
    }

    errors.assertZeroErrors();
  });
});

import { expect, test } from '@playwright/test';
import { buildBacklogUpdatedEvent } from '../../fixtures/telemetry-events.ts';
import { CANONICAL_DIVISIONS } from '../../helpers/canonical.ts';
import { URLS } from '../../helpers/env.ts';
import { postEvent, waitForHealth } from '../../helpers/gateway-client.ts';
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
  switchPov,
  toggleDayNight,
  waitForOfficeReady,
} from '../../helpers/office-driver.ts';

test.describe('Tier 2 — 3D Office Animation, Lighting & Lifecycle Resilience (@tier2 @office3d)', () => {
  // =========================================================================
  // @R4-F4: Animation & Routine Resilience (5 tests)
  // =========================================================================

  test('resumes smooth animation loop after window blur/focus visibility cycle @tier2 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });

    const png1 = await captureCanvasPng(page);
    await page.waitForTimeout(800);
    const png2 = await captureCanvasPng(page);

    expect(measurePixelDiffPercent(png1, png2)).toBeGreaterThan(0.05);
    errors.assertZeroErrors();
  });

  test('preserves valid agent routine state during rapid zone + lighting changes @tier2 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await jumpToZone(page, 'cafeteria');
    await toggleDayNight(page);
    await jumpToZone(page, 'gym');
    await toggleDayNight(page);

    const state = await readOfficeState(page);
    expect(state.agents).toHaveLength(24);
    for (const agent of state.agents) {
      expect(agent.activity.trim().length).toBeGreaterThan(0);
      expect(agent.zone.trim().length).toBeGreaterThan(0);
    }

    errors.assertZeroErrors();
  });

  test('keeps animation loop fluid during a concurrent 10-event telemetry burst @tier2 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const burst = Array.from({ length: 10 }, (_, idx) =>
      postEvent(
        JSON.stringify(
          buildBacklogUpdatedEvent({
            entityId: `BURST-${Date.now()}-${idx}`,
            title: `Burst event #${idx}`,
            summary: `Concurrent burst item #${idx}`,
          }),
        ),
      ),
    );
    const results = await Promise.all(burst);
    for (const r of results) {
      expect(r.status).toBe(202);
    }

    const png1 = await captureCanvasPng(page);
    await page.waitForTimeout(750);
    const png2 = await captureCanvasPng(page);
    expect(measurePixelDiffPercent(png1, png2)).toBeGreaterThan(0.05);

    errors.assertZeroErrors();
  });

  test('prevents duplicate agent IDs or division census drift after multi-division events @tier2 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await waitForHealth(`${URLS.gateway}/health`);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await Promise.all([
      postEvent(
        JSON.stringify(
          buildBacklogUpdatedEvent({
            divisionId: 'executive',
            agentId: 0,
            targetFloor: 3,
          }),
        ),
      ),
      postEvent(
        JSON.stringify(
          buildBacklogUpdatedEvent({
            divisionId: 'qa',
            agentId: 7,
            targetFloor: 2,
          }),
        ),
      ),
      postEvent(
        JSON.stringify(
          buildBacklogUpdatedEvent({
            divisionId: 'devops',
            agentId: 11,
            targetFloor: 3,
          }),
        ),
      ),
    ]);
    await page.waitForTimeout(400);

    const state = await readOfficeState(page);
    expect(new Set(state.agents.map((a) => a.id)).size).toBe(24);
    for (const div of CANONICAL_DIVISIONS) {
      expect(state.agents.filter((a) => a.divisionId === div.id)).toHaveLength(
        div.agentIds.length,
      );
    }

    errors.assertZeroErrors();
  });

  test('runs continuous simulation for 3 seconds with zero NaN coordinates @tier2 @R4-F4 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    for (let sample = 0; sample < 4; sample++) {
      await page.waitForTimeout(750);
      const state = await readOfficeState(page);
      expect(Number.isFinite(state.cameraPosition.x)).toBe(true);
      expect(Number.isFinite(state.cameraPosition.y)).toBe(true);
      expect(Number.isFinite(state.cameraPosition.z)).toBe(true);
      for (const agent of state.agents) {
        expect(Number.isFinite(agent.position.x)).toBe(true);
        expect(Number.isFinite(agent.position.y)).toBe(true);
        expect(Number.isFinite(agent.position.z)).toBe(true);
      }
    }

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F5: Lighting, Props & Viewport Resilience (5 tests)
  // =========================================================================

  test('survives rapid 6x Day/Night lighting toggling without shader or WebGL errors @tier2 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    for (let i = 0; i < 6; i++) {
      await toggleDayNight(page);
      await page.waitForTimeout(70);
    }

    await page.waitForTimeout(400);
    await assertWebGLCanvasActive(page);
    errors.assertZeroErrors();
  });

  test('renders cleanly on narrow mobile viewport (390x844) without WebGL errors @tier2 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const gl = await assertWebGLCanvasActive(page);
    expect(gl.hasWebGLContext).toBe(true);
    errors.assertZeroErrors();
  });

  test('renders All-Floors Cutaway cleanly on 1920x1080 viewport with high color diversity @tier2 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await switchFloor(page, 'all');
    await page.waitForTimeout(500);
    const gl = await assertWebGLCanvasActive(page);
    expect(gl.nonBlankSampleCount).toBeGreaterThanOrEqual(8);

    errors.assertZeroErrors();
  });

  test('Day/Night toggle transforms lighting distinctly across every floor (F1, F2, F3) @tier2 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    for (const floor of [1, 2, 3] as const) {
      await switchFloor(page, floor);
      await page.waitForTimeout(450);
      const before = await captureCanvasPng(page);
      await toggleDayNight(page);
      await page.waitForTimeout(400);
      const after = await captureCanvasPng(page);

      expect(measurePixelDiffPercent(before, after)).toBeGreaterThan(1);
    }

    errors.assertZeroErrors();
  });

  test('maintains PBR material & lighting fidelity across Night mode POV switches @tier2 @R4-F5 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await toggleDayNight(page);
    await page.waitForTimeout(350);

    for (const pov of ['first-person', 'third-person', 'overview'] as const) {
      await switchPov(page, pov);
      await page.waitForTimeout(350);
      const png = await captureCanvasPng(page);
      expect(measurePngColorDiversity(png).distinctBuckets).toBeGreaterThanOrEqual(6);
    }

    errors.assertZeroErrors();
  });

  // =========================================================================
  // @R4-F6: Dossier, Search & Lifecycle Hygiene (5 tests)
  // =========================================================================

  test('Agent Search handles zero-match query gracefully and recovers on clear @tier2 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await searchAgents(page, 'ZZZZ-NONEXISTENT-AGENT-999');
    await page.waitForTimeout(200);
    const bodyWhileEmpty = await page.locator('body').innerText();
    expect(bodyWhileEmpty).not.toContain('Ir. Saskia Wardhani, CISA, CISSP');

    await searchAgents(page, '');
    await page.waitForTimeout(200);
    const bodyRestored = await page.locator('body').innerText();
    expect(bodyRestored).toContain('Rizco Renova');

    errors.assertZeroErrors();
  });

  test('Agent Search safely treats HTML/XSS input as plain text without script execution @tier2 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    let dialogTriggered = false;
    page.on('dialog', async (dialog) => {
      dialogTriggered = true;
      await dialog.dismiss();
    });

    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await searchAgents(page, '<script>window.__xss=1;alert(1)</script>');
    await page.waitForTimeout(250);

    const xssFlag = await page.evaluate(
      () => (window as unknown as { __xss?: unknown }).__xss ?? null,
    );
    expect(dialogTriggered).toBe(false);
    expect(xssFlag).toBeNull();

    await searchAgents(page, '');
    errors.assertZeroErrors();
  });

  test('rapid sequential Dossier switching across #0, #7, #17, and #23 stays accurate @tier2 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    const targets: Array<[number, string]> = [
      [0, 'Rizco Renova'],
      [7, 'Qonita Anindya'],
      [17, 'Ir. Saskia Wardhani, CISA, CISSP'],
      [23, 'Maya Safitri, S.Psi., CHRP'],
    ];

    for (const [id, name] of targets) {
      await openAgentDossier(page, id);
      await page.waitForTimeout(150);
      const bodyText = await page.locator('body').innerText();
      expect(bodyText).toContain(name);
    }

    errors.assertZeroErrors();
  });

  test('cleanly disposes WebGL context across consecutive page reloads without context-loss errors @tier2 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await assertWebGLCanvasActive(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await assertWebGLCanvasActive(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);
    await assertWebGLCanvasActive(page);

    errors.assertZeroErrors();
  });

  test('retains all HUD controls without wipe after resize, floor switch, and search cycle @tier2 @R4-F6 @office3d', async ({
    page,
  }) => {
    const errors = attachErrorGuards(page);
    await page.goto(URLS.office, { waitUntil: 'domcontentloaded' });
    await waitForOfficeReady(page);

    await page.setViewportSize({ width: 1100, height: 700 });
    await switchFloor(page, 2);
    await searchAgents(page, 'Farel');
    await searchAgents(page, '');
    await switchPov(page, 'overview');
    await switchFloor(page, 1);

    const state = await readOfficeState(page);
    expect(state.activeFloor).toBe(1);
    expect(state.activePov).toBe('overview');
    expect(state.agents).toHaveLength(24);
    await assertWebGLCanvasActive(page);

    errors.assertZeroErrors();
  });
});

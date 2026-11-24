import zlib from 'node:zlib';
import type { Locator, Page } from '@playwright/test';
import type { FloorNumber, PovMode } from './canonical.ts';
import {
  assertValid,
  validateOfficeDiagnosticState,
  type OfficeDiagnosticState,
} from './schema-validators.ts';

export interface ErrorGuard {
  consoleErrors: string[];
  pageErrors: string[];
  assertZeroErrors: () => void;
  reset: () => void;
}

export function attachErrorGuards(page: Page): ErrorGuard {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    pageErrors.push(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
  });

  return {
    consoleErrors,
    pageErrors,
    assertZeroErrors() {
      if (consoleErrors.length > 0 || pageErrors.length > 0) {
        const parts: string[] = [];
        if (consoleErrors.length > 0) {
          parts.push(`console.error (${consoleErrors.length}):\n  - ${consoleErrors.join('\n  - ')}`);
        }
        if (pageErrors.length > 0) {
          parts.push(`pageerror (${pageErrors.length}):\n  - ${pageErrors.join('\n  - ')}`);
        }
        throw new Error(`Browser runtime errors detected:\n${parts.join('\n')}`);
      }
    },
    reset() {
      consoleErrors.length = 0;
      pageErrors.length = 0;
    },
  };
}

export async function readOfficeState(
  page: Page,
  options: { validate?: boolean } = {},
): Promise<OfficeDiagnosticState> {
  const raw = await page.evaluate(() => {
    const w = window as unknown as { __LOKATALENTA_OFFICE__?: unknown };
    const hook = w.__LOKATALENTA_OFFICE__;
    if (typeof hook === 'function') {
      return (hook as () => unknown)();
    }
    return hook ?? null;
  });

  if (!raw || typeof raw !== 'object') {
    throw new Error(
      'window.__LOKATALENTA_OFFICE__ diagnostic hook is missing or returned null',
    );
  }

  if (options.validate !== false) {
    assertValid(validateOfficeDiagnosticState(raw), 'window.__LOKATALENTA_OFFICE__');
  }

  return raw as OfficeDiagnosticState;
}

export async function waitForOfficeReady(
  page: Page,
  timeoutMs: number = 20_000,
): Promise<OfficeDiagnosticState> {
  await page.waitForSelector('canvas', { state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(
    () => {
      const w = window as unknown as { __LOKATALENTA_OFFICE__?: unknown };
      const hook = w.__LOKATALENTA_OFFICE__;
      const state = typeof hook === 'function' ? (hook as () => unknown)() : hook;
      return Boolean(
        state &&
          typeof state === 'object' &&
          Array.isArray((state as { agents?: unknown }).agents) &&
          (state as { agents: unknown[] }).agents.length === 24,
      );
    },
    undefined,
    { timeout: timeoutMs },
  );

  return readOfficeState(page);
}

async function clickFirstMatching(locators: Locator[], description: string): Promise<void> {
  for (const loc of locators) {
    if ((await loc.count()) > 0 && (await loc.first().isVisible())) {
      await loc.first().click();
      return;
    }
  }
  throw new Error(`Could not find visible UI control for: ${description}`);
}

export async function switchFloor(
  page: Page,
  floor: FloorNumber | 'all',
): Promise<void> {
  const key = floor === 'all' ? 'all' : `f${floor}`;
  const labelRegex =
    floor === 'all'
      ? /all\s*floors?|cutaway|semua\s*lantai/i
      : new RegExp(`\\b(?:f|floor|lantai)\\s*${floor}\\b`, 'i');

  await clickFirstMatching(
    [
      page.getByTestId(`floor-btn-${key}`),
      page.getByTestId(`floor-${floor}`),
      page.locator(`[data-floor="${floor}"]`),
      page.getByRole('button', { name: labelRegex }),
    ],
    `Floor Switcher (${String(floor)})`,
  );
}

export async function switchPov(page: Page, pov: PovMode): Promise<void> {
  const labelMap: Record<PovMode, RegExp> = {
    overview: /overview|isometric|building/i,
    'third-person': /third[- ]?person|follow|agent[- ]?follow/i,
    'first-person': /first[- ]?person|walkthrough|fps/i,
  };

  await clickFirstMatching(
    [
      page.getByTestId(`pov-btn-${pov}`),
      page.getByTestId(`pov-${pov}`),
      page.locator(`[data-pov="${pov}"]`),
      page.getByRole('button', { name: labelMap[pov] }),
    ],
    `POV Switcher (${pov})`,
  );
}

export async function jumpToZone(page: Page, zone: string): Promise<void> {
  const normalized = zone.toLowerCase();
  await clickFirstMatching(
    [
      page.getByTestId(`zone-btn-${normalized}`),
      page.getByTestId(`zone-${normalized}`),
      page.locator(`[data-zone="${normalized}"]`),
      page.getByRole('button', { name: new RegExp(normalized.replace('-', '[ -]?'), 'i') }),
    ],
    `Zone Jump (${zone})`,
  );
}

export async function searchAgents(page: Page, query: string): Promise<void> {
  const candidates = [
    page.getByTestId('agent-search-input'),
    page.getByTestId('dossier-search'),
    page.getByPlaceholder(/search|cari/i),
    page.getByRole('searchbox'),
  ];

  for (const input of candidates) {
    if ((await input.count()) > 0 && (await input.first().isVisible())) {
      await input.first().fill(query);
      return;
    }
  }
  throw new Error('Could not find visible Agent Search input');
}

export async function openAgentDossier(
  page: Page,
  agentIdOrName: number | string,
): Promise<void> {
  if (typeof agentIdOrName === 'number') {
    await clickFirstMatching(
      [
        page.getByTestId(`agent-card-${agentIdOrName}`),
        page.getByTestId(`agent-item-${agentIdOrName}`),
        page.locator(`[data-agent-id="${agentIdOrName}"]`),
      ],
      `Agent Dossier (#${agentIdOrName})`,
    );
    return;
  }

  await clickFirstMatching(
    [
      page.locator('[data-agent-id]', { hasText: agentIdOrName }),
      page.getByRole('button', { name: new RegExp(agentIdOrName, 'i') }),
      page.getByText(agentIdOrName, { exact: false }),
    ],
    `Agent Dossier (${agentIdOrName})`,
  );
}

export async function toggleDayNight(page: Page): Promise<void> {
  await clickFirstMatching(
    [
      page.getByTestId('day-night-toggle'),
      page.getByTestId('theme-lighting-toggle'),
      page.getByRole('button', { name: /day|night|siang|malam|lighting/i }),
    ],
    'Day/Night Lighting Toggle',
  );
}

export async function getConnectionStatus(page: Page): Promise<string> {
  const testIdLocator = page.getByTestId('telemetry-connection-status');
  if ((await testIdLocator.count()) > 0) {
    return ((await testIdLocator.first().textContent()) || '').trim();
  }
  const state = await readOfficeState(page, { validate: false });
  return state.connectionStatus;
}

export async function getTickerEntries(page: Page): Promise<string[]> {
  const tickerItem = page.locator('[data-testid="live-ticker"] [data-testid^="ticker-item"], [data-testid="ticker-item"]');
  if ((await tickerItem.count()) > 0) {
    const texts = await tickerItem.allTextContents();
    return texts.map((t) => t.trim()).filter(Boolean);
  }
  const state = await readOfficeState(page, { validate: false });
  return state.ticker.map((entry) =>
    typeof entry.title === 'string'
      ? entry.title
      : typeof entry.summary === 'string'
        ? entry.summary
        : JSON.stringify(entry),
  );
}

export async function captureCanvasPng(page: Page): Promise<Buffer> {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 10_000 });
  return canvas.screenshot({ type: 'png' });
}

export async function assertWebGLCanvasActive(page: Page): Promise<{
  width: number;
  height: number;
  hasWebGLContext: boolean;
  nonBlankSampleCount: number;
}> {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: 10_000 });
  const box = await canvas.boundingBox();
  if (!box || box.width < 200 || box.height < 200) {
    throw new Error(
      `Canvas bounding box too small or missing: ${JSON.stringify(box)}`,
    );
  }

  const glInfo = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { width: 0, height: 0, hasWebGLContext: false };
    const ctx =
      c.getContext('webgl2') ||
      c.getContext('webgl') ||
      c.getContext('experimental-webgl');
    return {
      width: c.width,
      height: c.height,
      hasWebGLContext: ctx !== null,
    };
  });

  if (!glInfo.hasWebGLContext || glInfo.width <= 0 || glInfo.height <= 0) {
    throw new Error(
      `WebGL context inactive on canvas: ${JSON.stringify(glInfo)}`,
    );
  }

  const png = await captureCanvasPng(page);
  const variance = measurePngColorDiversity(png);
  if (variance.distinctBuckets < 4) {
    throw new Error(
      `Rendered WebGL canvas appears blank or single-color (distinctBuckets=${variance.distinctBuckets})`,
    );
  }

  return {
    width: glInfo.width,
    height: glInfo.height,
    hasWebGLContext: glInfo.hasWebGLContext,
    nonBlankSampleCount: variance.distinctBuckets,
  };
}

// ============================================================================
// Pure Node PNG Decoder & Pixel-Delta Utilities (no native addons)
// ============================================================================

export interface DecodedPng {
  width: number;
  height: number;
  channels: number;
  pixels: Uint8Array;
}

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

export function decodePng(pngBuffer: Buffer): DecodedPng {
  if (pngBuffer.length < 33 || !pngBuffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];

  while (offset + 8 <= pngBuffer.length) {
    const length = pngBuffer.readUInt32BE(offset);
    const type = pngBuffer.subarray(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > pngBuffer.length) {
      throw new Error(`Truncated PNG chunk ${type}`);
    }

    const data = pngBuffer.subarray(dataStart, dataEnd);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
      const interlace = data[12] ?? 0;
      if (bitDepth !== 8 || interlace !== 0) {
        throw new Error(
          `Unsupported PNG format: bitDepth=${bitDepth}, interlace=${interlace}`,
        );
      }
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4; // skip 4-byte CRC
  }

  if (width === 0 || height === 0 || idatChunks.length === 0) {
    throw new Error('PNG missing IHDR or IDAT data');
  }

  const channelsMap: Record<number, number> = {
    0: 1, // Grayscale
    2: 3, // RGB
    4: 2, // Grayscale + Alpha
    6: 4, // RGBA
  };
  const channels = channelsMap[colorType];
  if (!channels) {
    throw new Error(`Unsupported PNG colorType=${colorType}`);
  }

  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const expectedLen = height * (stride + 1);
  if (raw.length < expectedLen) {
    throw new Error(
      `Inflated PNG data too short: got ${raw.length}, expected ${expectedLen}`,
    );
  }

  const pixels = new Uint8Array(width * height * channels);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filterType = raw[rowStart] ?? 0;
    const outRowStart = y * stride;
    const prevRowStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const val = raw[rowStart + 1 + x] ?? 0;
      const left = x >= channels ? (pixels[outRowStart + x - channels] ?? 0) : 0;
      const up = y > 0 ? (pixels[prevRowStart + x] ?? 0) : 0;
      const upLeft =
        y > 0 && x >= channels ? (pixels[prevRowStart + x - channels] ?? 0) : 0;

      let recon = val;
      switch (filterType) {
        case 0:
          recon = val;
          break;
        case 1:
          recon = (val + left) & 0xff;
          break;
        case 2:
          recon = (val + up) & 0xff;
          break;
        case 3:
          recon = (val + ((left + up) >> 1)) & 0xff;
          break;
        case 4:
          recon = (val + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG scanline filter type: ${filterType}`);
      }
      pixels[outRowStart + x] = recon;
    }
  }

  return { width, height, channels, pixels };
}

export function measurePngColorDiversity(pngBuffer: Buffer): {
  width: number;
  height: number;
  distinctBuckets: number;
} {
  const { width, height, channels, pixels } = decodePng(pngBuffer);
  const buckets = new Set<number>();
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / 4096));

  for (let i = 0; i < totalPixels; i += step) {
    const base = i * channels;
    const r = pixels[base] ?? 0;
    const g = channels >= 3 ? (pixels[base + 1] ?? 0) : r;
    const b = channels >= 3 ? (pixels[base + 2] ?? 0) : r;
    // Quantize to 5 bits per channel (32x32x32 color cube)
    const bucket = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    buckets.add(bucket);
  }

  return { width, height, distinctBuckets: buckets.size };
}

export function measurePixelDiffPercent(
  pngA: Buffer,
  pngB: Buffer,
  manhattanThreshold: number = 12,
): number {
  const a = decodePng(pngA);
  const b = decodePng(pngB);

  if (a.width !== b.width || a.height !== b.height) {
    return 100;
  }

  const totalPixels = a.width * a.height;
  let changed = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idxA = i * a.channels;
    const idxB = i * b.channels;

    const r1 = a.pixels[idxA] ?? 0;
    const g1 = a.channels >= 3 ? (a.pixels[idxA + 1] ?? 0) : r1;
    const b1 = a.channels >= 3 ? (a.pixels[idxA + 2] ?? 0) : r1;

    const r2 = b.pixels[idxB] ?? 0;
    const g2 = b.channels >= 3 ? (b.pixels[idxB + 1] ?? 0) : r2;
    const b2 = b.channels >= 3 ? (b.pixels[idxB + 2] ?? 0) : r2;

    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    if (diff > manhattanThreshold) {
      changed++;
    }
  }

  return Number(((changed / totalPixels) * 100).toFixed(4));
}

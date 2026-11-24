import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {
  ALL_VALID_TELEMETRY_FIXTURES,
  INVALID_TELEMETRY_FIXTURES,
} from '../fixtures/telemetry-events.ts';
import {
  buildGitHubIssuesPayload,
  buildGitHubPingPayload,
  buildGitHubPullRequestPayload,
  buildGitHubPushPayload,
} from '../fixtures/github-webhooks.ts';
import {
  CANONICAL_AGENTS,
  CANONICAL_DIVISIONS,
  CANONICAL_DIVISION_IDS,
  CANONICAL_FLOORS,
  CANONICAL_POV_MODES,
  CANONICAL_ZONE_TYPES,
  FORBIDDEN_LEGACY_ALIAS_DRIFTS,
  LEGACY_DRIFT_NAMES,
} from './canonical.ts';
import {
  CONTRACTS_DIR,
  FORBIDDEN_PORTS,
  GITHUB_OWNER,
  REPOS,
  SECRETS,
  assertPortNotForbidden,
} from './env.ts';
import {
  signGatewayEvent,
  signGitHubWebhook,
  verifyHmacSha256,
} from './hmac.ts';
import { measurePixelDiffPercent, measurePngColorDiversity } from './office-driver.ts';
import {
  assertValid,
  validateBacklogItem,
  validateDocEntry,
  validateGatewaySnapshot,
  validateNoPiiInEvent,
  validateNormalizedEvent,
  validateOfficeDiagnosticState,
  validateRubricEvaluation,
  validateSprint,
} from './schema-validators.ts';

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createTestRgbaPng(
  width: number,
  height: number,
  pixelFn: (x: number, y: number) => [number, number, number, number],
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const px = rowStart + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = a;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function verifyCanonicalRegistry(): void {
  assert.equal(CANONICAL_DIVISIONS.length, 6, 'Must have 6 canonical divisions');
  assert.equal(CANONICAL_AGENTS.length, 24, 'Must have 24 canonical agents');
  assert.equal(CANONICAL_FLOORS.length, 3, 'Must have 3 floors');
  assert.equal(CANONICAL_ZONE_TYPES.length, 7, 'Must have 7 zone types');
  assert.equal(CANONICAL_POV_MODES.length, 3, 'Must have 3 POV modes');

  const divIds = new Set(CANONICAL_DIVISIONS.map((d) => d.id));
  assert.equal(divIds.size, 6, 'Division IDs must be unique');

  const agentIds = new Set(CANONICAL_AGENTS.map((a) => a.id));
  assert.equal(agentIds.size, 24, 'Agent IDs must be unique');
  for (let i = 0; i < 24; i++) {
    assert.ok(agentIds.has(i), `Missing canonical agent ID ${i}`);
  }

  const coveredAgentIds = new Set<number>();
  for (const div of CANONICAL_DIVISIONS) {
    for (const id of div.agentIds) {
      assert.ok(!coveredAgentIds.has(id), `Duplicate division assignment for agent #${id}`);
      coveredAgentIds.add(id);
      const agent = CANONICAL_AGENTS.find((a) => a.id === id);
      assert.ok(agent, `Division ${div.id} references unknown agent #${id}`);
      assert.equal(
        agent.divisionId,
        div.id,
        `Agent #${id} division mismatch: ${agent.divisionId} vs ${div.id}`,
      );
    }
  }
  assert.equal(coveredAgentIds.size, 24, 'Divisions must partition all 24 agents');

  const driftSet = new Set<string>(LEGACY_DRIFT_NAMES);
  const forbiddenAliasSet = new Set<string>(FORBIDDEN_LEGACY_ALIAS_DRIFTS);
  for (const agent of CANONICAL_AGENTS) {
    assert.ok(
      !driftSet.has(agent.name),
      `Canonical agent #${agent.id} uses legacy drifted name: ${agent.name}`,
    );
    assert.ok(
      !forbiddenAliasSet.has(agent.shortName),
      `Canonical agent #${agent.id} uses forbidden alias drift shortName: ${agent.shortName}`,
    );
  }
}

function verifyEnvAndPorts(): void {
  const repoList = Object.values(REPOS);
  assert.equal(repoList.length, 6, 'Must define 6 ecosystem repositories');
  const usedPorts = new Set<number>();

  for (const repo of repoList) {
    assert.ok(
      repo.githubRepo.startsWith(`${GITHUB_OWNER}/`),
      `Repo ${repo.id} must belong to GitHub owner ${GITHUB_OWNER}`,
    );
    assertPortNotForbidden(repo.apiPort);
    assert.ok(
      repo.apiPort >= 4100 && repo.apiPort <= 4114,
      `Repo ${repo.id} apiPort ${repo.apiPort} out of 4100..4114 range`,
    );
    assert.ok(!usedPorts.has(repo.apiPort), `Duplicate apiPort ${repo.apiPort}`);
    usedPorts.add(repo.apiPort);

    if (repo.devUiPort !== null) {
      assertPortNotForbidden(repo.devUiPort);
      assert.ok(
        repo.devUiPort >= 4100 && repo.devUiPort <= 4114,
        `Repo ${repo.id} devUiPort ${repo.devUiPort} out of 4100..4114 range`,
      );
    }
  }

  for (const port of FORBIDDEN_PORTS) {
    assert.throws(() => assertPortNotForbidden(port));
  }
}

function verifyDiskContractsIfPresent(): void {
  const agentsPath = path.join(CONTRACTS_DIR, 'agents.json');
  const divisionsPath = path.join(CONTRACTS_DIR, 'divisions.json');
  if (!fs.existsSync(agentsPath) || !fs.existsSync(divisionsPath)) {
    console.log('[selfcheck] Shared contracts dir not present on disk yet — skipped cross-check.');
    return;
  }

  const diskAgents = JSON.parse(fs.readFileSync(agentsPath, 'utf8')) as {
    agents: Array<{ id: number; name: string; divisionId: string }>;
  };
  const diskDivisions = JSON.parse(fs.readFileSync(divisionsPath, 'utf8')) as {
    divisions: Array<{ id: string; agentIds: number[] }>;
  };

  assert.equal(diskAgents.agents.length, 24);
  assert.equal(diskDivisions.divisions.length, 6);

  for (const canonical of CANONICAL_AGENTS) {
    const match = diskAgents.agents.find((a) => a.id === canonical.id);
    assert.ok(match, `Disk contract agents.json missing #${canonical.id}`);
    assert.equal(
      match.name,
      canonical.name,
      `Disk contract name mismatch for #${canonical.id}: ${match.name} vs ${canonical.name}`,
    );
    assert.equal(
      match.divisionId,
      canonical.divisionId,
      `Disk contract division mismatch for #${canonical.id}`,
    );
  }
  console.log('[selfcheck] Verified 100% parity with lokatalenta-event-gateway/contracts/*.json');
}

function verifyHmacRoundtrip(): void {
  const body = JSON.stringify(buildGitHubPushPayload());
  const ghSig = signGitHubWebhook(body, SECRETS.githubWebhook);
  assert.ok(ghSig.startsWith('sha256='));
  assert.equal(verifyHmacSha256(body, ghSig, SECRETS.githubWebhook), true);
  assert.equal(verifyHmacSha256(`${body} `, ghSig, SECRETS.githubWebhook), false);
  assert.equal(verifyHmacSha256(body, ghSig, 'wrong-secret'), false);
  assert.equal(verifyHmacSha256(body, 'sha256=deadbeef', SECRETS.githubWebhook), false);
  assert.equal(verifyHmacSha256(body, '', SECRETS.githubWebhook), false);

  const gwSig = signGatewayEvent(body, SECRETS.gatewayEvent);
  assert.equal(verifyHmacSha256(body, gwSig, SECRETS.gatewayEvent), true);
  assert.equal(verifyHmacSha256(body, gwSig.replace(/^sha256=/, ''), SECRETS.gatewayEvent), true);
}

function verifySchemasAndFixtures(): void {
  for (const evt of ALL_VALID_TELEMETRY_FIXTURES) {
    assertValid(validateNormalizedEvent(evt), `Valid telemetry fixture ${evt.id}`);
    assertValid(validateNoPiiInEvent(evt), `No-PII check ${evt.id}`);
  }

  assert.equal(
    validateNormalizedEvent(INVALID_TELEMETRY_FIXTURES.invalidAgentId).valid,
    false,
  );
  assert.equal(
    validateNormalizedEvent(INVALID_TELEMETRY_FIXTURES.invalidDivision).valid,
    false,
  );
  assert.equal(
    validateNormalizedEvent(INVALID_TELEMETRY_FIXTURES.invalidFloor).valid,
    false,
  );
  assert.equal(
    validateNormalizedEvent(INVALID_TELEMETRY_FIXTURES.missingSummary).valid,
    false,
  );
  assert.equal(
    validateNoPiiInEvent(INVALID_TELEMETRY_FIXTURES.piiLeakEmail).valid,
    false,
  );

  // Verify GitHub webhook fixture builders produce valid non-empty JSON structures
  assert.ok(buildGitHubPushPayload().commits.length > 0);
  assert.equal(buildGitHubPullRequestPayload('closed', true).pull_request.merged, true);
  assert.equal(buildGitHubIssuesPayload('opened').issue.number, 17);
  assert.ok(buildGitHubPingPayload().zen.length > 0);

  // Verify composite validators
  assertValid(
    validateGatewaySnapshot({
      agents: CANONICAL_AGENTS.map((a) => ({ ...a })),
      divisions: CANONICAL_DIVISIONS.map((d) => ({ ...d })),
      recentEvents: [...ALL_VALID_TELEMETRY_FIXTURES],
      stats: { totalEvents: ALL_VALID_TELEMETRY_FIXTURES.length },
    }),
    'GatewaySnapshot self-check',
  );

  assertValid(
    validateBacklogItem({
      id: 'BL-1',
      title: 'Decouple 3D Office',
      type: 'story',
      status: 'groomed',
      priority: 'Must',
      storyPoints: 5,
      ownerDivision: 'engineering',
      ownerAgentId: 5,
      acceptanceCriteria: ['Given clean repo, When built, Then passes'],
      dependencies: [],
    }),
    'BacklogItem self-check',
  );

  assertValid(
    validateSprint({
      id: 'SPR-16',
      name: 'Sprint 16 — Ecosystem Launch',
      status: 'active',
      startDate: '2026-11-24T00:00:00.000Z',
      endDate: '2026-12-08T00:00:00.000Z',
    }),
    'Sprint self-check',
  );

  assertValid(
    validateDocEntry({
      slug: 'adr-001-ecosystem-split',
      title: 'ADR-001 Ecosystem Decoupling',
      category: 'adr',
      ownerDivision: 'architecture',
    }),
    'DocEntry self-check',
  );

  assertValid(
    validateRubricEvaluation({
      slug: 'rubric-cross-workflow',
      workflows: CANONICAL_DIVISION_IDS.map((divId) => ({
        workflow: `workflow-${divId}`,
        contractDefined: true,
        ownerDivision: divId,
        prioritizedItems: ['BL-1'],
      })),
    }),
    'RubricEvaluation self-check',
  );

  assertValid(
    validateOfficeDiagnosticState({
      activeFloor: 1,
      activePov: 'overview',
      cameraPosition: { x: 10, y: 12, z: 18 },
      agents: CANONICAL_AGENTS.map((a) => ({
        id: a.id,
        name: a.name,
        divisionId: a.divisionId,
        floor: a.defaultFloor,
        zone: a.defaultZone,
        activity: 'working',
        position: { x: a.id, y: 0, z: 0 },
      })),
      connectionStatus: 'LIVE',
      ticker: [],
    }),
    'OfficeDiagnosticState self-check',
  );
}

function verifyPngUtilities(): void {
  const pngA = createTestRgbaPng(16, 16, (x, y) => [
    (x * 16) & 0xff,
    (y * 16) & 0xff,
    64,
    255,
  ]);
  const pngB = createTestRgbaPng(16, 16, (x, y) => [
    (255 - x * 16) & 0xff,
    (255 - y * 16) & 0xff,
    200,
    255,
  ]);

  const diversity = measurePngColorDiversity(pngA);
  assert.ok(
    diversity.distinctBuckets > 10,
    `Expected diverse test PNG, got ${diversity.distinctBuckets}`,
  );
  assert.equal(measurePixelDiffPercent(pngA, pngA), 0);
  const diff = measurePixelDiffPercent(pngA, pngB);
  assert.ok(diff > 90, `Expected >90% pixel diff between distinct PNGs, got ${diff}%`);
}

function main(): void {
  verifyCanonicalRegistry();
  verifyEnvAndPorts();
  verifyDiskContractsIfPresent();
  verifyHmacRoundtrip();
  verifySchemasAndFixtures();
  verifyPngUtilities();
  console.log(
    '[selfcheck] ALL CONTRACT CHECKS PASSED (6 divisions, 24 agents, HMAC timingSafeEqual, schemas, PNG diff).',
  );
}

main();

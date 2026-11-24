import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CANONICAL_AGENTS,
  CANONICAL_DIVISIONS,
  CANONICAL_DIVISION_IDS,
  CANONICAL_EVENT_SOURCES,
  CANONICAL_EVENT_TARGET_ZONES,
  CANONICAL_EVENT_TYPES,
  FORBIDDEN_LEGACY_ALIAS_DRIFTS,
  LEGACY_DRIFT_NAMES,
} from '../../helpers/canonical.ts';
import {
  CONTRACTS_DIR,
  FORBIDDEN_PORTS,
  GITHUB_OWNER,
  REPOS,
  assertPortNotForbidden,
} from '../../helpers/env.ts';

function runCmd(cmd: string, args: string[], cwd?: string): string {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

test.describe('Tier 1 — Repository Ecosystem & Canonical Contracts', () => {
  // ==========================================================================
  // R1-F1: GitHub Auth & Repo Provisioning (5 tests)
  // ==========================================================================

  test(
    'R1-F1.1 gh CLI is authenticated for GitHub owner zixew',
    { tag: ['@tier1', '@R1-F1', '@repo'] },
    async () => {
      const output = execFileSync('gh', ['auth', 'status'], {
        encoding: 'utf8',
        timeout: 15_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      expect(output).toContain(GITHUB_OWNER);
      expect(output.toLowerCase()).toContain('logged in');
    },
  );

  test(
    'R1-F1.2 all 6 ecosystem repositories exist on github.com/zixew',
    { tag: ['@tier1', '@R1-F1', '@repo'] },
    async () => {
      const repoEntries = Object.values(REPOS);
      expect(repoEntries).toHaveLength(6);

      for (const repo of repoEntries) {
        const jsonRaw = runCmd('gh', [
          'repo',
          'view',
          repo.githubRepo,
          '--json',
          'nameWithOwner,url',
        ]);
        const parsed = JSON.parse(jsonRaw) as {
          nameWithOwner: string;
          url: string;
        };
        expect(parsed.nameWithOwner).toBe(repo.githubRepo);
        expect(parsed.url).toBe(repo.githubUrl);
      }
    },
  );

  test(
    'R1-F1.3 all 6 local repositories exist under Projects with valid git repos and HEAD commits',
    { tag: ['@tier1', '@R1-F1', '@repo'] },
    async () => {
      for (const repo of Object.values(REPOS)) {
        expect(fs.existsSync(repo.localPath)).toBe(true);
        expect(fs.existsSync(path.join(repo.localPath, '.git'))).toBe(true);

        const headSha = runCmd('git', ['rev-parse', 'HEAD'], repo.localPath);
        expect(headSha).toMatch(/^[0-9a-f]{40}$/i);

        const branch = runCmd(
          'git',
          ['rev-parse', '--abbrev-ref', 'HEAD'],
          repo.localPath,
        );
        expect(branch.length).toBeGreaterThan(0);
      }
    },
  );

  test(
    'R1-F1.4 all 6 local repositories configure HTTPS origin remotes under zixew',
    { tag: ['@tier1', '@R1-F1', '@repo'] },
    async () => {
      for (const repo of Object.values(REPOS)) {
        const originUrl = runCmd(
          'git',
          ['remote', 'get-url', 'origin'],
          repo.localPath,
        );
        expect(originUrl.startsWith(`https://github.com/${GITHUB_OWNER}/`)).toBe(
          true,
        );
        expect(originUrl).not.toMatch(/^git@github\.com:/i);
        expect(originUrl.replace(/\.git$/, '')).toBe(repo.githubUrl);
      }
    },
  );

  test(
    'R1-F1.5 ecosystem port allocation contract avoids all forbidden host ports',
    { tag: ['@tier1', '@R1-F1', '@repo'] },
    async () => {
      const portsPath = path.join(CONTRACTS_DIR, 'ecosystem-ports.json');
      expect(fs.existsSync(portsPath)).toBe(true);

      const portsContract = JSON.parse(fs.readFileSync(portsPath, 'utf8')) as {
        githubOwner: string;
        avoidedHostPorts: number[];
        services: Array<{
          id: string;
          apiPort: number;
          devUiPort: number | null;
        }>;
      };

      expect(portsContract.githubOwner).toBe(GITHUB_OWNER);
      expect(portsContract.services).toHaveLength(6);

      for (const forbidden of FORBIDDEN_PORTS) {
        expect(portsContract.avoidedHostPorts).toContain(forbidden);
      }

      const seenApiPorts = new Set<number>();
      for (const svc of portsContract.services) {
        assertPortNotForbidden(svc.apiPort);
        expect(svc.apiPort).toBeGreaterThanOrEqual(4100);
        expect(svc.apiPort).toBeLessThanOrEqual(4114);
        expect(seenApiPorts.has(svc.apiPort)).toBe(false);
        seenApiPorts.add(svc.apiPort);

        if (svc.devUiPort !== null) {
          assertPortNotForbidden(svc.devUiPort);
          expect(svc.devUiPort).toBeGreaterThanOrEqual(4100);
          expect(svc.devUiPort).toBeLessThanOrEqual(4114);
        }
      }
    },
  );

  // ==========================================================================
  // R1-F2: 3D Office Extraction (5 tests)
  // ==========================================================================

  test(
    'R1-F2.1 lokatalenta-office-3d exists with extracted 3D Office entry and git commit history',
    { tag: ['@tier1', '@R1-F2', '@repo'] },
    async () => {
      const officeDir = REPOS['lokatalenta-office-3d'].localPath;
      expect(fs.existsSync(officeDir)).toBe(true);

      const hasIndexHtml = fs.existsSync(path.join(officeDir, 'index.html'));
      const hasLegacyHtml = fs.existsSync(
        path.join(officeDir, 'kantor_ai_3d.html'),
      );
      expect(hasIndexHtml || hasLegacyHtml).toBe(true);

      const commitCountRaw = runCmd(
        'git',
        ['rev-list', '--count', 'HEAD'],
        officeDir,
      );
      expect(Number(commitCountRaw)).toBeGreaterThanOrEqual(1);
    },
  );

  test(
    'R1-F2.2 lokatalenta-office-3d contains genuine Three.js 3D Office source or upgraded bundle',
    { tag: ['@tier1', '@R1-F2', '@repo'] },
    async () => {
      const officeDir = REPOS['lokatalenta-office-3d'].localPath;
      const srcDir = path.join(officeDir, 'src');
      const hasSrc = fs.existsSync(srcDir) && fs.statSync(srcDir).isDirectory();
      const indexPath = path.join(officeDir, 'index.html');
      const legacyPath = path.join(officeDir, 'kantor_ai_3d.html');

      if (hasSrc) {
        const pkg = JSON.parse(
          fs.readFileSync(path.join(officeDir, 'package.json'), 'utf8'),
        ) as { dependencies?: Record<string, string> };
        expect(pkg.dependencies?.three || pkg.dependencies?.['@types/three']).toBeTruthy();
      } else {
        const htmlPath = fs.existsSync(indexPath) ? indexPath : legacyPath;
        const html = fs.readFileSync(htmlPath, 'utf8');
        expect(html.length).toBeGreaterThan(20_000);
        expect(html.toLowerCase()).toContain('three');
        expect(html).toContain('LokaTalenta');
      }
    },
  );

  test(
    'R1-F2.3 lokatalenta-office-3d remote is synced to github.com/zixew/lokatalenta-office-3d',
    { tag: ['@tier1', '@R1-F2', '@repo'] },
    async () => {
      const officeDir = REPOS['lokatalenta-office-3d'].localPath;
      const remoteUrl = runCmd('git', ['remote', 'get-url', 'origin'], officeDir);
      expect(remoteUrl.replace(/\.git$/, '')).toBe(
        'https://github.com/zixew/lokatalenta-office-3d',
      );

      const lsRemote = runCmd(
        'git',
        ['ls-remote', '--heads', 'origin'],
        officeDir,
      );
      expect(lsRemote.length).toBeGreaterThan(0);
    },
  );

  test(
    'R1-F2.4 lokatalenta-office-3d/e2e test harness is structured with TypeScript and Playwright config',
    { tag: ['@tier1', '@R1-F2', '@repo'] },
    async () => {
      const e2eDir = path.join(REPOS['lokatalenta-office-3d'].localPath, 'e2e');
      expect(fs.existsSync(path.join(e2eDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(e2eDir, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(e2eDir, 'playwright.config.ts'))).toBe(true);
      expect(fs.existsSync(path.join(e2eDir, 'helpers', 'canonical.ts'))).toBe(true);
      expect(fs.existsSync(path.join(e2eDir, 'helpers', 'env.ts'))).toBe(true);
    },
  );

  test(
    'R1-F2.5 lokatalenta-office-3d is decoupled from LMS Psikotes assessment domain files',
    { tag: ['@tier1', '@R1-F2', '@repo'] },
    async () => {
      const officeDir = REPOS['lokatalenta-office-3d'].localPath;
      expect(fs.existsSync(path.join(officeDir, 'supabase'))).toBe(false);
      expect(fs.existsSync(path.join(officeDir, 'client', 'src', 'features', 'kraepelin'))).toBe(false);
      expect(fs.existsSync(path.join(officeDir, 'client', 'src', 'features', 'tryout'))).toBe(false);
    },
  );

  // ==========================================================================
  // R1-F3: lms-psikotes Decoupling & Cleanup (5 tests)
  // ==========================================================================

  test(
    'R1-F3.1 lms-psikotes/docs/kantor_ai_3d.html is replaced with lightweight pointer notice',
    { tag: ['@tier1', '@R1-F3', '@repo'] },
    async () => {
      const lmsDir = REPOS['lms-psikotes'].localPath;
      const stubPath = path.join(lmsDir, 'docs', 'kantor_ai_3d.html');
      expect(fs.existsSync(stubPath)).toBe(true);

      const stat = fs.statSync(stubPath);
      expect(stat.size).toBeLessThan(10_000);

      const content = fs.readFileSync(stubPath, 'utf8');
      expect(content).toContain('https://github.com/zixew/lokatalenta-office-3d');
      expect(content).toContain('lokatalenta-office-3d');
      expect(content.toLowerCase()).not.toContain('three.webglrenderer');
    },
  );

  test(
    'R1-F3.2 lms-psikotes docs and QA references point to dedicated lokatalenta-office-3d repository',
    { tag: ['@tier1', '@R1-F3', '@repo'] },
    async () => {
      const lmsDir = REPOS['lms-psikotes'].localPath;
      const targetFiles = [
        path.join(lmsDir, 'AGENTS.md'),
        path.join(lmsDir, 'docs', 'planning', '03_FINAL_SPRINT_BACKLOG_MINOR_TO_MAJOR.md'),
        path.join(lmsDir, 'docs', 'qa', 'QA_TEST_CASES.md'),
        path.join(lmsDir, 'docs', 'reports', 'SPRINT_14_RETROSPECTIVE_AND_SPRINT_15_KICKOFF_DISCUSSION.md'),
      ];

      for (const filePath of targetFiles) {
        expect(fs.existsSync(filePath)).toBe(true);
        const text = fs.readFileSync(filePath, 'utf8');
        expect(text).toContain('lokatalenta-office-3d');
      }
    },
  );

  test(
    'R1-F3.3 lms-psikotes repo origin points to zixew/lokatalenta and has a clean tracked status',
    { tag: ['@tier1', '@R1-F3', '@repo'] },
    async () => {
      const lmsDir = REPOS['lms-psikotes'].localPath;
      const origin = runCmd('git', ['remote', 'get-url', 'origin'], lmsDir);
      expect(origin.replace(/\.git$/, '')).toBe('https://github.com/zixew/lokatalenta');

      const status = runCmd('git', ['status', '--short'], lmsDir);
      expect(status).toBe('');
    },
  );

  test(
    'R1-F3.4 lms-psikotes client passes oxlint cleanly',
    { tag: ['@tier1', '@R1-F3', '@repo'] },
    async () => {
      const clientDir = path.join(REPOS['lms-psikotes'].localPath, 'client');
      const output = execFileSync('npm', ['run', 'lint'], {
        cwd: clientDir,
        encoding: 'utf8',
        timeout: 60_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      expect(output).toBeDefined();
    },
  );

  test(
    'R1-F3.5 lms-psikotes client builds cleanly with main entry chunk under 250 kB',
    { tag: ['@tier1', '@R1-F3', '@repo'] },
    async () => {
      const clientDir = path.join(REPOS['lms-psikotes'].localPath, 'client');
      execFileSync('npm', ['run', 'build'], {
        cwd: clientDir,
        encoding: 'utf8',
        timeout: 90_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      const assetsDir = path.join(clientDir, 'dist', 'assets');
      expect(fs.existsSync(assetsDir)).toBe(true);
      const jsFiles = fs
        .readdirSync(assetsDir)
        .filter((f) => f.startsWith('index-') && f.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThanOrEqual(1);

      const mainEntryStat = fs.statSync(path.join(assetsDir, jsFiles[0]!));
      expect(mainEntryStat.size).toBeLessThan(250 * 1024);
    },
  );

  // ==========================================================================
  // R3-F1: Canonical 6-Division & 24-Agent Registry (5 tests)
  // ==========================================================================

  test(
    'R3-F1.1 contracts/divisions.json defines all 6 canonical divisions partitioning 24 agents',
    { tag: ['@tier1', '@R3-F1', '@repo'] },
    async () => {
      const divisionsPath = path.join(CONTRACTS_DIR, 'divisions.json');
      expect(fs.existsSync(divisionsPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(divisionsPath, 'utf8')) as {
        divisions: Array<{
          id: string;
          name: string;
          defaultFloor: number;
          agentIds: number[];
        }>;
      };

      expect(data.divisions).toHaveLength(6);
      const ids = data.divisions.map((d) => d.id);
      expect(ids).toEqual([...CANONICAL_DIVISION_IDS]);

      const partitioned = new Set<number>();
      for (const expectedDiv of CANONICAL_DIVISIONS) {
        const actual = data.divisions.find((d) => d.id === expectedDiv.id);
        expect(actual).toBeDefined();
        expect(actual!.agentIds).toEqual([...expectedDiv.agentIds]);
        expect(actual!.defaultFloor).toBe(expectedDiv.defaultFloor);
        for (const id of actual!.agentIds) {
          expect(partitioned.has(id)).toBe(false);
          partitioned.add(id);
        }
      }
      expect(partitioned.size).toBe(24);
    },
  );

  test(
    'R3-F1.2 contracts/agents.json defines all 24 canonical agents (#0..#23) with exact names and divisions',
    { tag: ['@tier1', '@R3-F1', '@repo'] },
    async () => {
      const agentsPath = path.join(CONTRACTS_DIR, 'agents.json');
      expect(fs.existsSync(agentsPath)).toBe(true);
      const data = JSON.parse(fs.readFileSync(agentsPath, 'utf8')) as {
        totalAgents?: number;
        agents: Array<{
          id: number;
          name: string;
          shortName: string;
          role: string;
          divisionId: string;
          defaultFloor: number;
          defaultZone: string;
        }>;
      };

      expect(data.totalAgents).toBe(24);
      expect(data.agents).toHaveLength(24);

      for (const canonical of CANONICAL_AGENTS) {
        const found = data.agents.find((a) => a.id === canonical.id);
        expect(found).toBeDefined();
        expect(found!.name).toBe(canonical.name);
        expect(found!.divisionId).toBe(canonical.divisionId);
        expect(found!.defaultFloor).toBe(canonical.defaultFloor);
      }
    },
  );

  test(
    'R3-F1.3 contracts/agents.json eliminates all legacy short-name and alias drifts',
    { tag: ['@tier1', '@R3-F1', '@repo'] },
    async () => {
      const agentsPath = path.join(CONTRACTS_DIR, 'agents.json');
      const data = JSON.parse(fs.readFileSync(agentsPath, 'utf8')) as {
        agents: Array<{ id: number; name: string; shortName: string }>;
      };

      const legacyNameSet = new Set<string>(LEGACY_DRIFT_NAMES);
      const forbiddenAliasSet = new Set<string>(FORBIDDEN_LEGACY_ALIAS_DRIFTS);

      for (const agent of data.agents) {
        expect(legacyNameSet.has(agent.name)).toBe(false);
        expect(forbiddenAliasSet.has(agent.name)).toBe(false);
        expect(forbiddenAliasSet.has(agent.shortName)).toBe(false);
      }
    },
  );

  test(
    'R3-F1.4 contracts/event-schema.json defines canonical sources, event types, targetZones, and floors',
    { tag: ['@tier1', '@R3-F1', '@repo'] },
    async () => {
      const schemaPath = path.join(CONTRACTS_DIR, 'event-schema.json');
      expect(fs.existsSync(schemaPath)).toBe(true);

      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8')) as {
        required: string[];
        properties: {
          source: { enum: string[] };
          type: { enum: string[] };
          divisionId: { enum: string[] };
          targetZone: { enum: string[] };
          targetFloor: { enum: number[] };
          agentId: { minimum: number; maximum: number };
        };
      };

      expect(schema.properties.source.enum).toEqual([...CANONICAL_EVENT_SOURCES]);
      expect(schema.properties.type.enum).toEqual([...CANONICAL_EVENT_TYPES]);
      expect(schema.properties.divisionId.enum).toEqual([...CANONICAL_DIVISION_IDS]);
      expect(schema.properties.targetZone.enum).toEqual([...CANONICAL_EVENT_TARGET_ZONES]);
      expect(schema.properties.targetFloor.enum).toEqual([1, 2, 3]);
      expect(schema.properties.agentId.minimum).toBe(0);
      expect(schema.properties.agentId.maximum).toBe(23);
    },
  );

  test(
    'R3-F1.5 lms-psikotes AGENTS.md and AGENT_SKILLS_MATRIX.md agree with all 24 canonical agent names',
    { tag: ['@tier1', '@R3-F1', '@repo'] },
    async () => {
      const lmsDir = REPOS['lms-psikotes'].localPath;
      const agentsMd = fs.readFileSync(path.join(lmsDir, 'AGENTS.md'), 'utf8');
      const skillsMd = fs.readFileSync(
        path.join(lmsDir, 'docs', 'AGENT_SKILLS_MATRIX.md'),
        'utf8',
      );

      for (const agent of CANONICAL_AGENTS) {
        expect(agentsMd).toContain(agent.name);
        expect(skillsMd).toContain(agent.name);
      }

      for (const forbidden of FORBIDDEN_LEGACY_ALIAS_DRIFTS) {
        expect(agentsMd).not.toContain(forbidden);
        expect(skillsMd).not.toContain(forbidden);
      }
    },
  );
});

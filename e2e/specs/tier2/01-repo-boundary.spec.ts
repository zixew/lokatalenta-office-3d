import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CANONICAL_AGENTS,
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
import { validateNormalizedEvent } from '../../helpers/schema-validators.ts';
import { buildBacklogUpdatedEvent } from '../../fixtures/telemetry-events.ts';

function runCmd(cmd: string, args: string[], cwd?: string): string {
  return execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout: 30_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

test.describe('Tier 2 — Repository & Contract Boundary / Negative Cases', () => {
  // ==========================================================================
  // R1-F1: Boundary & Negative Cases (5 tests)
  // ==========================================================================

  test(
    'R1-F1.B1 gh repo view fails cleanly with non-zero exit code on nonexistent zixew repository',
    { tag: ['@tier2', '@R1-F1', '@repo'] },
    async () => {
      let failed = false;
      try {
        execFileSync(
          'gh',
          ['repo', 'view', `${GITHUB_OWNER}/nonexistent-lokatalenta-e2e-check`],
          { encoding: 'utf8', timeout: 15_000, stdio: ['ignore', 'pipe', 'pipe'] },
        );
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
    },
  );

  test(
    'R1-F1.B2 assertPortNotForbidden throws explicitly for every forbidden host port',
    { tag: ['@tier2', '@R1-F1', '@repo'] },
    async () => {
      for (const port of FORBIDDEN_PORTS) {
        expect(() => assertPortNotForbidden(port)).toThrow(/FORBIDDEN_PORTS/);
      }
      expect(() => assertPortNotForbidden(4101)).not.toThrow();
    },
  );

  test(
    'R1-F1.B3 no ecosystem repository config or package.json binds any forbidden host port',
    { tag: ['@tier2', '@R1-F1', '@repo'] },
    async () => {
      const forbiddenPattern = new RegExp(
        `(?:localhost|127\\.0\\.0\\.1|PORT\\s*[:=]\\s*):?(?:${FORBIDDEN_PORTS.join('|')})\\b`,
      );
      for (const repo of Object.values(REPOS)) {
        const pkgPath = path.join(repo.localPath, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkgContent = fs.readFileSync(pkgPath, 'utf8');
          expect(forbiddenPattern.test(pkgContent)).toBe(false);
        }
        const envExample = path.join(repo.localPath, '.env.example');
        if (fs.existsSync(envExample)) {
          const envContent = fs.readFileSync(envExample, 'utf8');
          expect(forbiddenPattern.test(envContent)).toBe(false);
        }
      }
    },
  );

  test(
    'R1-F1.B4 no ecosystem repository tracks .env, private keys, or PEM secrets in git',
    { tag: ['@tier2', '@R1-F1', '@repo'] },
    async () => {
      for (const repo of Object.values(REPOS)) {
        const tracked = runCmd('git', ['ls-files'], repo.localPath).split(/\r?\n/);
        for (const file of tracked) {
          expect(file).not.toMatch(/(?:^|\/)\.env(?:\.local|\.production)?$/);
          expect(file).not.toMatch(/\.(?:pem|key|p12)$/i);
        }
      }
    },
  );

  test(
    'R1-F1.B5 no ecosystem repository configures SSH remotes or non-zixew GitHub owners',
    { tag: ['@tier2', '@R1-F1', '@repo'] },
    async () => {
      for (const repo of Object.values(REPOS)) {
        const remotes = runCmd('git', ['remote', '-v'], repo.localPath);
        expect(remotes).not.toContain('git@github.com:');
        expect(remotes).toContain(`github.com/${GITHUB_OWNER}/`);
      }
    },
  );

  // ==========================================================================
  // R1-F2: 3D Office Extraction Boundary Cases (5 tests)
  // ==========================================================================

  test(
    'R1-F2.B1 lokatalenta-office-3d does not leak Supabase credentials or LMS service role config',
    { tag: ['@tier2', '@R1-F2', '@repo'] },
    async () => {
      const officeDir = REPOS['lokatalenta-office-3d'].localPath;
      const tracked = runCmd('git', ['ls-files'], officeDir).split(/\r?\n/);
      for (const rel of tracked) {
        if (rel.startsWith('e2e/') || !/\.(ts|tsx|js|html|json|env.*)$/i.test(rel)) continue;
        const full = path.join(officeDir, rel);
        if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) continue;
        const content = fs.readFileSync(full, 'utf8');
        expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
        expect(content).not.toContain('VITE_SUPABASE_URL');
      }
    },
  );

  test(
    'R1-F2.B2 lokatalenta-office-3d has zero LMS Psikotes database migrations or test battery files',
    { tag: ['@tier2', '@R1-F2', '@repo'] },
    async () => {
      const officeDir = REPOS['lokatalenta-office-3d'].localPath;
      const tracked = runCmd('git', ['ls-files'], officeDir).split(/\r?\n/);
      for (const rel of tracked) {
        expect(rel).not.toMatch(/^supabase\/migrations\//);
        expect(rel).not.toMatch(/kraepelinEngine|typingEngine/i);
      }
    },
  );

  test(
    'R1-F2.B3 lokatalenta-office-3d does not track node_modules or playwright artifacts in git',
    { tag: ['@tier2', '@R1-F2', '@repo'] },
    async () => {
      const officeDir = REPOS['lokatalenta-office-3d'].localPath;
      const tracked = runCmd('git', ['ls-files'], officeDir).split(/\r?\n/);
      for (const rel of tracked) {
        expect(rel).not.toContain('node_modules/');
        expect(rel).not.toContain('playwright-report/');
        expect(rel).not.toContain('test-results/');
      }
    },
  );

  test(
    'R1-F2.B4 lokatalenta-office-3d REPOS config assigns distinct port 4105 outside forbidden ports',
    { tag: ['@tier2', '@R1-F2', '@repo'] },
    async () => {
      const officeRepo = REPOS['lokatalenta-office-3d'];
      expect(officeRepo.apiPort).toBe(4105);
      expect((FORBIDDEN_PORTS as readonly number[]).includes(officeRepo.apiPort)).toBe(false);
      for (const other of Object.values(REPOS)) {
        if (other.id !== 'lokatalenta-office-3d') {
          expect(other.apiPort).not.toBe(officeRepo.apiPort);
        }
      }
    },
  );

  test(
    'R1-F2.B5 lokatalenta-office-3d/e2e helpers never import source files from lms-psikotes',
    { tag: ['@tier2', '@R1-F2', '@repo'] },
    async () => {
      const helpersDir = path.join(REPOS['lokatalenta-office-3d'].localPath, 'e2e', 'helpers');
      for (const file of fs.readdirSync(helpersDir)) {
        if (!file.endsWith('.ts')) continue;
        const content = fs.readFileSync(path.join(helpersDir, file), 'utf8');
        expect(content).not.toMatch(/from\s+['"].*lms-psikotes/);
      }
    },
  );

  // ==========================================================================
  // R1-F3: lms-psikotes Decoupling Boundary Cases (5 tests)
  // ==========================================================================

  test(
    'R1-F3.B1 lms-psikotes/docs/kantor_ai_3d.html no longer contains WebGLRenderer or Three.js script tags',
    { tag: ['@tier2', '@R1-F3', '@repo'] },
    async () => {
      const stubPath = path.join(REPOS['lms-psikotes'].localPath, 'docs', 'kantor_ai_3d.html');
      const content = fs.readFileSync(stubPath, 'utf8');
      expect(content).not.toMatch(/three\.min\.js|unpkg\.com\/three|cdn\.jsdelivr\.net\/npm\/three/i);
      expect(content).not.toContain('WebGLRenderer');
      expect(content).not.toContain('requestAnimationFrame');
    },
  );

  test(
    'R1-F3.B2 lms-psikotes/docs/kantor_ai_3d.html contains zero legacy agent name drifts',
    { tag: ['@tier2', '@R1-F3', '@repo'] },
    async () => {
      const stubPath = path.join(REPOS['lms-psikotes'].localPath, 'docs', 'kantor_ai_3d.html');
      const content = fs.readFileSync(stubPath, 'utf8');
      for (const drift of LEGACY_DRIFT_NAMES) {
        expect(content).not.toContain(drift);
      }
      for (const forbidden of FORBIDDEN_LEGACY_ALIAS_DRIFTS) {
        expect(content).not.toContain(forbidden);
      }
    },
  );

  test(
    'R1-F3.B3 lms-psikotes/docs contains no orphaned large (>20KB) HTML monolith copies',
    { tag: ['@tier2', '@R1-F3', '@repo'] },
    async () => {
      const docsDir = path.join(REPOS['lms-psikotes'].localPath, 'docs');
      const walkHtml = (dir: string): string[] => {
        const hits: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            hits.push(...walkHtml(full));
          } else if (entry.name.endsWith('.html')) {
            hits.push(full);
          }
        }
        return hits;
      };
      const htmlFiles = walkHtml(docsDir);
      for (const file of htmlFiles) {
        expect(fs.statSync(file).size).toBeLessThan(20_000);
      }
    },
  );

  test(
    'R1-F3.B4 lms-psikotes/client/src does not embed or iframe docs/kantor_ai_3d.html',
    { tag: ['@tier2', '@R1-F3', '@repo'] },
    async () => {
      const clientSrc = path.join(REPOS['lms-psikotes'].localPath, 'client', 'src');
      const walkTs = (dir: string): string[] => {
        const files: string[] = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files.push(...walkTs(full));
          } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
            files.push(full);
          }
        }
        return files;
      };
      for (const file of walkTs(clientSrc)) {
        const text = fs.readFileSync(file, 'utf8');
        expect(text).not.toContain('kantor_ai_3d.html');
      }
    },
  );

  test(
    'R1-F3.B5 lms-psikotes/client Vitest suite passes cleanly after decoupling',
    { tag: ['@tier2', '@R1-F3', '@repo'] },
    async () => {
      const clientDir = path.join(REPOS['lms-psikotes'].localPath, 'client');
      const out = execFileSync('npm', ['run', 'test'], {
        cwd: clientDir,
        encoding: 'utf8',
        timeout: 90_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      expect(out.toLowerCase()).toContain('pass');
    },
  );

  // ==========================================================================
  // R3-F1: Canonical Registry Boundary Cases (5 tests)
  // ==========================================================================

  test(
    'R3-F1.B1 validateNormalizedEvent rejects out-of-range agentId values (-1, 24, 99, 1.5)',
    { tag: ['@tier2', '@R3-F1', '@repo'] },
    async () => {
      for (const badId of [-1, 24, 99, 1.5]) {
        const evt = buildBacklogUpdatedEvent({ agentId: badId });
        const res = validateNormalizedEvent(evt);
        expect(res.valid).toBe(false);
        expect(res.errors.join(' ')).toContain('agentId');
      }
    },
  );

  test(
    'R3-F1.B2 validateNormalizedEvent rejects non-canonical divisionId values',
    { tag: ['@tier2', '@R3-F1', '@repo'] },
    async () => {
      for (const badDiv of ['marketing', 'hr', '', 'exec', 'ops']) {
        const evt = {
          ...buildBacklogUpdatedEvent(),
          divisionId: badDiv,
        };
        const res = validateNormalizedEvent(evt);
        expect(res.valid).toBe(false);
        expect(res.errors.join(' ')).toContain('divisionId');
      }
    },
  );

  test(
    'R3-F1.B3 validateNormalizedEvent rejects invalid targetFloor and targetZone values',
    { tag: ['@tier2', '@R3-F1', '@repo'] },
    async () => {
      for (const badFloor of [0, 4, -1, 99]) {
        const res = validateNormalizedEvent({
          ...buildBacklogUpdatedEvent(),
          targetFloor: badFloor,
        });
        expect(res.valid).toBe(false);
      }

      for (const badZone of ['basement', 'rooftop', 'parking', '']) {
        const res = validateNormalizedEvent({
          ...buildBacklogUpdatedEvent(),
          targetZone: badZone,
        });
        expect(res.valid).toBe(false);
      }
    },
  );

  test(
    'R3-F1.B4 contracts/agents.json has zero duplicate IDs, names, or mismatched divisions',
    { tag: ['@tier2', '@R3-F1', '@repo'] },
    async () => {
      const agentsPath = path.join(CONTRACTS_DIR, 'agents.json');
      const data = JSON.parse(fs.readFileSync(agentsPath, 'utf8')) as {
        agents: Array<{ id: number; name: string; divisionId: string }>;
      };

      const seenIds = new Set<number>();
      const seenNames = new Set<string>();
      for (const agent of data.agents) {
        expect(seenIds.has(agent.id)).toBe(false);
        expect(seenNames.has(agent.name)).toBe(false);
        seenIds.add(agent.id);
        seenNames.add(agent.name);

        const canonical = CANONICAL_AGENTS.find((c) => c.id === agent.id);
        expect(canonical).toBeDefined();
        expect(agent.divisionId).toBe(canonical!.divisionId);
      }
    },
  );

  test(
    'R3-F1.B5 contracts JSON files contain zero forbidden legacy alias drifts',
    { tag: ['@tier2', '@R3-F1', '@repo'] },
    async () => {
      for (const file of ['agents.json', 'divisions.json']) {
        const content = fs.readFileSync(path.join(CONTRACTS_DIR, file), 'utf8');
        for (const forbidden of FORBIDDEN_LEGACY_ALIAS_DRIFTS) {
          expect(content).not.toContain(forbidden);
        }
      }
    },
  );
});

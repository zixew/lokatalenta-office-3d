import { GITHUB_OWNER } from '../helpers/env.ts';

export function buildGitHubPushPayload(overrides: Record<string, unknown> = {}) {
  const uniqueSha = `a1b2c3d4e5f60718293a4b5c6d7e8f90${Date.now().toString(16).slice(-8)}`;
  return {
    ref: 'refs/heads/dev',
    before: '0000000000000000000000000000000000000000',
    after: uniqueSha,
    repository: {
      id: 901001,
      name: 'lokatalenta-office-3d',
      full_name: `${GITHUB_OWNER}/lokatalenta-office-3d`,
      html_url: `https://github.com/${GITHUB_OWNER}/lokatalenta-office-3d`,
      private: false,
    },
    pusher: {
      name: 'farel-faza',
      email: 'telemetry-bot@lokatalenta.local',
    },
    sender: {
      login: 'zixew',
      id: 1001,
    },
    commits: [
      {
        id: uniqueSha,
        message: 'feat(office-3d): add elevator cab travel & floor 2 boardroom lighting',
        timestamp: new Date().toISOString(),
        author: {
          name: 'Farel Faza Nugraha',
          username: 'farel-faza',
        },
        added: ['src/zones/ElevatorBank.ts'],
        modified: ['src/floors/FloorManager.ts'],
        removed: [],
      },
    ],
    head_commit: {
      id: uniqueSha,
      message: 'feat(office-3d): add elevator cab travel & floor 2 boardroom lighting',
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

export function buildGitHubPullRequestPayload(
  action: 'opened' | 'synchronize' | 'closed' = 'opened',
  merged: boolean = false,
  overrides: Record<string, unknown> = {},
) {
  const prNumber = 42;
  return {
    action,
    number: prNumber,
    pull_request: {
      id: 420042,
      number: prNumber,
      state: action === 'closed' ? 'closed' : 'open',
      merged,
      title: 'feat(gateway): harden HMAC timingSafeEqual & SSE replay buffer',
      html_url: `https://github.com/${GITHUB_OWNER}/lokatalenta-event-gateway/pull/${prNumber}`,
      user: { login: 'bagas-bimo' },
      head: { ref: 'feat/hmac-sse-replay', sha: 'deadbeef1234567890abcdef1234567890abcdef' },
      base: { ref: 'main' },
      requested_reviewers: [{ login: 'qonita-anindya' }, { login: 'saskia-wardhani' }],
    },
    repository: {
      id: 901002,
      name: 'lokatalenta-event-gateway',
      full_name: `${GITHUB_OWNER}/lokatalenta-event-gateway`,
      html_url: `https://github.com/${GITHUB_OWNER}/lokatalenta-event-gateway`,
    },
    sender: { login: 'zixew' },
    ...overrides,
  };
}

export function buildGitHubIssuesPayload(
  action: 'opened' | 'labeled' | 'closed' = 'opened',
  overrides: Record<string, unknown> = {},
) {
  const issueNumber = 17;
  return {
    action,
    issue: {
      id: 170017,
      number: issueNumber,
      state: action === 'closed' ? 'closed' : 'open',
      title: 'Verify Musholla & Wellness Gym zone signage visibility in night mode',
      html_url: `https://github.com/${GITHUB_OWNER}/lokatalenta-office-3d/issues/${issueNumber}`,
      user: { login: 'qonita-anindya' },
      labels: [{ name: 'qa' }, { name: 'office-3d' }],
    },
    repository: {
      id: 901001,
      name: 'lokatalenta-office-3d',
      full_name: `${GITHUB_OWNER}/lokatalenta-office-3d`,
      html_url: `https://github.com/${GITHUB_OWNER}/lokatalenta-office-3d`,
    },
    sender: { login: 'qonita-anindya' },
    ...overrides,
  };
}

export function buildGitHubPingPayload() {
  return {
    zen: 'Keep it logically awesome.',
    hook_id: 777001,
    repository: {
      id: 901001,
      name: 'lokatalenta-office-3d',
      full_name: `${GITHUB_OWNER}/lokatalenta-office-3d`,
    },
    sender: { login: 'zixew' },
  };
}

export const MALFORMED_WEBHOOK_PAYLOADS = {
  invalidJsonString: '{"ref": "refs/heads/main", "broken": ',
  emptyObject: {},
  missingRepository: {
    ref: 'refs/heads/main',
    commits: [{ id: '1234', message: 'missing repo' }],
  },
  wrongTypeArray: '["not", "an", "object"]',
} as const;

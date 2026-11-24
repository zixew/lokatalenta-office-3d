import path from 'node:path';

export const PROJECTS_ROOT =
  process.env.LOKATALENTA_PROJECTS_ROOT || '/Users/a2299/Documents/Projects';

export const GITHUB_OWNER = 'zixew' as const;

export const FORBIDDEN_PORTS = [5000, 7000, 8089, 8091, 11301, 54321, 56211] as const;

export const CHROME_FALLBACK_PATH =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const WEBGL_LAUNCH_ARGS = [
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
  '--no-sandbox',
] as const;

export interface RepoConfig {
  id:
    | 'lms-psikotes'
    | 'lokatalenta-office-3d'
    | 'lokatalenta-event-gateway'
    | 'lokatalenta-docs'
    | 'lokatalenta-sprint-planner'
    | 'lokatalenta-backlog';
  name: string;
  localPath: string;
  githubRepo: string;
  githubUrl: string;
  apiPort: number;
  devUiPort: number | null;
  baseUrl: string;
  devUiUrl: string | null;
  healthPath: string;
}

export const REPOS: Record<RepoConfig['id'], RepoConfig> = {
  'lms-psikotes': {
    id: 'lms-psikotes',
    name: 'LokaTalenta Core LMS Psikotes',
    localPath: path.join(PROJECTS_ROOT, 'lms-psikotes'),
    githubRepo: `${GITHUB_OWNER}/lokatalenta`,
    githubUrl: `https://github.com/${GITHUB_OWNER}/lokatalenta`,
    apiPort: 4100,
    devUiPort: 4100,
    baseUrl: process.env.LMS_URL || 'http://localhost:4100',
    devUiUrl: process.env.LMS_URL || 'http://localhost:4100',
    healthPath: '/',
  },
  'lokatalenta-event-gateway': {
    id: 'lokatalenta-event-gateway',
    name: 'LokaTalenta Real-Time Event Gateway',
    localPath: path.join(PROJECTS_ROOT, 'lokatalenta-event-gateway'),
    githubRepo: `${GITHUB_OWNER}/lokatalenta-event-gateway`,
    githubUrl: `https://github.com/${GITHUB_OWNER}/lokatalenta-event-gateway`,
    apiPort: 4101,
    devUiPort: null,
    baseUrl: process.env.GATEWAY_URL || 'http://localhost:4101',
    devUiUrl: null,
    healthPath: '/health',
  },
  'lokatalenta-backlog': {
    id: 'lokatalenta-backlog',
    name: 'LokaTalenta Backlog & Grooming',
    localPath: path.join(PROJECTS_ROOT, 'lokatalenta-backlog'),
    githubRepo: `${GITHUB_OWNER}/lokatalenta-backlog`,
    githubUrl: `https://github.com/${GITHUB_OWNER}/lokatalenta-backlog`,
    apiPort: 4102,
    devUiPort: 4112,
    baseUrl: process.env.BACKLOG_API_URL || 'http://localhost:4102',
    devUiUrl: process.env.BACKLOG_UI_URL || 'http://localhost:4112',
    healthPath: '/api/health',
  },
  'lokatalenta-sprint-planner': {
    id: 'lokatalenta-sprint-planner',
    name: 'LokaTalenta Sprint Planner',
    localPath: path.join(PROJECTS_ROOT, 'lokatalenta-sprint-planner'),
    githubRepo: `${GITHUB_OWNER}/lokatalenta-sprint-planner`,
    githubUrl: `https://github.com/${GITHUB_OWNER}/lokatalenta-sprint-planner`,
    apiPort: 4103,
    devUiPort: 4113,
    baseUrl: process.env.SPRINT_API_URL || 'http://localhost:4103',
    devUiUrl: process.env.SPRINT_UI_URL || 'http://localhost:4113',
    healthPath: '/api/health',
  },
  'lokatalenta-docs': {
    id: 'lokatalenta-docs',
    name: 'LokaTalenta Documentation Hub',
    localPath: path.join(PROJECTS_ROOT, 'lokatalenta-docs'),
    githubRepo: `${GITHUB_OWNER}/lokatalenta-docs`,
    githubUrl: `https://github.com/${GITHUB_OWNER}/lokatalenta-docs`,
    apiPort: 4104,
    devUiPort: 4114,
    baseUrl: process.env.DOCS_API_URL || 'http://localhost:4104',
    devUiUrl: process.env.DOCS_UI_URL || 'http://localhost:4114',
    healthPath: '/api/health',
  },
  'lokatalenta-office-3d': {
    id: 'lokatalenta-office-3d',
    name: 'LokaTalenta 3D Office HQ',
    localPath: path.join(PROJECTS_ROOT, 'lokatalenta-office-3d'),
    githubRepo: `${GITHUB_OWNER}/lokatalenta-office-3d`,
    githubUrl: `https://github.com/${GITHUB_OWNER}/lokatalenta-office-3d`,
    apiPort: 4105,
    devUiPort: 4105,
    baseUrl: process.env.OFFICE_URL || 'http://localhost:4105',
    devUiUrl: process.env.OFFICE_URL || 'http://localhost:4105',
    healthPath: '/',
  },
};

export const URLS = {
  lms: REPOS['lms-psikotes'].baseUrl,
  gateway: REPOS['lokatalenta-event-gateway'].baseUrl,
  gatewayWs: process.env.GATEWAY_WS_URL || 'ws://localhost:4101/ws',
  gatewaySse: process.env.GATEWAY_SSE_URL || 'http://localhost:4101/events/stream',
  backlogApi: REPOS['lokatalenta-backlog'].baseUrl,
  backlogUi: REPOS['lokatalenta-backlog'].devUiUrl!,
  sprintApi: REPOS['lokatalenta-sprint-planner'].baseUrl,
  sprintUi: REPOS['lokatalenta-sprint-planner'].devUiUrl!,
  docsApi: REPOS['lokatalenta-docs'].baseUrl,
  docsUi: REPOS['lokatalenta-docs'].devUiUrl!,
  office: REPOS['lokatalenta-office-3d'].baseUrl,
} as const;

export const SECRETS = {
  githubWebhook:
    process.env.GITHUB_WEBHOOK_SECRET || 'lokatalenta-dev-webhook-secret',
  gatewayEvent:
    process.env.GATEWAY_EVENT_SECRET || 'lokatalenta-dev-event-secret',
} as const;

export const CONTRACTS_DIR = path.join(
  REPOS['lokatalenta-event-gateway'].localPath,
  'contracts',
);

export function assertPortNotForbidden(port: number): void {
  if ((FORBIDDEN_PORTS as readonly number[]).includes(port)) {
    throw new Error(`Port ${port} is in FORBIDDEN_PORTS (${FORBIDDEN_PORTS.join(', ')})`);
  }
}

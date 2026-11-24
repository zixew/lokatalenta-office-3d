import type { NormalizedEvent } from '../helpers/schema-validators.ts';

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function buildBacklogUpdatedEvent(
  overrides: Partial<NormalizedEvent> = {},
): NormalizedEvent {
  return {
    id: uniqueId('evt-bl'),
    timestamp: new Date().toISOString(),
    source: 'backlog',
    type: 'backlog.updated',
    divisionId: 'executive',
    agentId: 2, // Pranadipa Wicaksana (Product Owner)
    entityId: 'BL-101',
    title: 'Backlog item BL-101 groomed for Sprint 16',
    summary: 'Pranadipa Wicaksana prioritized Multi-Floor Office Telemetry Integration (8 SP).',
    targetZone: 'workspace',
    targetFloor: 3,
    severity: 'info',
    metadata: {
      action: 'groomed',
      storyPoints: 8,
      priority: 'Must',
    },
    ...overrides,
  };
}

export function buildSprintUpdatedEvent(
  overrides: Partial<NormalizedEvent> = {},
): NormalizedEvent {
  return {
    id: uniqueId('evt-spr'),
    timestamp: new Date().toISOString(),
    source: 'sprint-planner',
    type: 'sprint.updated',
    divisionId: 'engineering',
    agentId: 18, // Hendrawan Wicaksono, M.Kom.
    entityId: 'SPR-16',
    title: 'Sprint 16 capacity locked across 6 divisions',
    summary: 'Engineering & QA committed 42 SP into Sprint 16 with ceremony notes logged.',
    targetZone: 'boardroom',
    targetFloor: 2,
    severity: 'success',
    metadata: {
      sprintId: 'SPR-16',
      committedPoints: 42,
      activeDivisions: 6,
    },
    ...overrides,
  };
}

export function buildDocUpdatedEvent(
  overrides: Partial<NormalizedEvent> = {},
): NormalizedEvent {
  return {
    id: uniqueId('evt-doc'),
    timestamp: new Date().toISOString(),
    source: 'docs',
    type: 'doc.updated',
    divisionId: 'devops',
    agentId: 12, // Tara Wulandari
    entityId: 'ADR-002',
    title: 'ADR-002 Cross-App Event Gateway Contract updated',
    summary: 'Tara Wulandari published WebSocket & SSE replay sequence diagrams.',
    targetZone: 'workspace',
    targetFloor: 3,
    severity: 'info',
    metadata: {
      slug: 'adr-002-event-gateway',
      category: 'architecture',
    },
    ...overrides,
  };
}

/**
 * Strictly PII-anonymized LMS Psikotes candidate/platform telemetry event.
 * Never includes candidate name, email, phone, NIK, or raw PII.
 */
export function buildLmsActivityEvent(
  overrides: Partial<NormalizedEvent> = {},
): NormalizedEvent {
  return {
    id: uniqueId('evt-lms'),
    timestamp: new Date().toISOString(),
    source: 'lms-psikotes',
    type: 'lms.activity',
    divisionId: 'lounge',
    agentId: 23, // Maya Safitri, S.Psi., CHRP
    entityId: 'ASSESS-KRAEPELIN-7821',
    title: 'LMS Kraepelin assessment batch completed',
    summary: 'Anonymized cohort session #7821 completed Kraepelin battery (latency 142ms).',
    targetZone: 'lounge',
    targetFloor: 2,
    severity: 'success',
    metadata: {
      module: 'kraepelin',
      candidateRef: 'CAND-ANON-7821',
      durationMs: 142,
      telemetryMode: 'anonymized',
    },
    ...overrides,
  };
}

export function buildAgentTaskCompletedEvent(
  overrides: Partial<NormalizedEvent> = {},
): NormalizedEvent {
  return {
    id: uniqueId('evt-task'),
    timestamp: new Date().toISOString(),
    source: 'office-sim',
    type: 'agent.task.completed',
    divisionId: 'qa',
    agentId: 8, // Qaisar Al-Ghaffar
    entityId: 'QA-SUITE-256',
    title: 'Automated regression check completed by Qaisar Al-Ghaffar',
    summary: 'QA Automation Lead verified zero console errors across Floor 1-3 zones.',
    targetZone: 'workspace',
    targetFloor: 2,
    severity: 'success',
    metadata: {
      suite: 'tier1-smoke',
      passed: 110,
    },
    ...overrides,
  };
}

export const ALL_VALID_TELEMETRY_FIXTURES: readonly NormalizedEvent[] = [
  buildBacklogUpdatedEvent(),
  buildSprintUpdatedEvent(),
  buildDocUpdatedEvent(),
  buildLmsActivityEvent(),
  buildAgentTaskCompletedEvent(),
];

export const INVALID_TELEMETRY_FIXTURES = {
  invalidAgentId: {
    ...buildBacklogUpdatedEvent(),
    agentId: 99,
  },
  invalidDivision: {
    ...buildBacklogUpdatedEvent(),
    divisionId: 'marketing-unknown',
  },
  invalidFloor: {
    ...buildBacklogUpdatedEvent(),
    targetFloor: 99,
  },
  missingSummary: (() => {
    const evt = buildBacklogUpdatedEvent() as unknown as Record<string, unknown>;
    delete evt.summary;
    return evt;
  })(),
  piiLeakEmail: {
    ...buildLmsActivityEvent(),
    summary: 'Candidate budi.santoso@example.com finished test',
  },
} as const;

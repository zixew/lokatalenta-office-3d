import {
  CANONICAL_DIVISION_IDS,
  CANONICAL_EVENT_SEVERITIES,
  CANONICAL_EVENT_SOURCES,
  CANONICAL_EVENT_TARGET_ZONES,
  CANONICAL_EVENT_TYPES,
  CANONICAL_FLOORS,
  CANONICAL_POV_MODES,
  type DivisionId,
  type EventSeverity,
  type EventSource,
  type EventTargetZone,
  type EventType,
  type FloorNumber,
  type PovMode,
} from './canonical.ts';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface NormalizedEvent {
  id: string;
  timestamp: string;
  source: EventSource;
  type: EventType;
  divisionId: DivisionId;
  agentId: number;
  entityId: string | null;
  title: string;
  summary: string;
  targetZone: EventTargetZone;
  targetFloor: FloorNumber;
  severity: EventSeverity;
  metadata: Record<string, unknown>;
}

export interface GatewaySnapshot {
  agents: Array<Record<string, unknown>>;
  divisions: Array<Record<string, unknown>>;
  recentEvents: NormalizedEvent[];
  stats: Record<string, unknown>;
}

export interface BacklogItem {
  id: string;
  title: string;
  type: 'epic' | 'story' | 'task' | 'bug' | 'tech-debt';
  status: string;
  priority: string;
  storyPoints: number;
  ownerDivision: DivisionId;
  ownerAgentId: number;
  acceptanceCriteria: string | string[];
  dependencies: string[];
  [key: string]: unknown;
}

export interface Sprint {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  capacityByDivision?: Record<string, unknown>;
  items?: unknown[];
  ceremonyNotes?: unknown;
  [key: string]: unknown;
}

export interface DocEntry {
  slug: string;
  title: string;
  category: string;
  content?: string;
  ownerDivision?: DivisionId;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface RubricWorkflowEntry {
  workflow: string;
  contractDefined: boolean;
  ownerDivision: DivisionId;
  prioritizedItems: string[];
  status?: string;
  [key: string]: unknown;
}

export interface RubricEvaluation {
  id?: string;
  slug?: string;
  title?: string;
  workflows: RubricWorkflowEntry[];
  overallStatus?: string;
  [key: string]: unknown;
}

export interface OfficeAgentDiagnostic {
  id: number;
  name?: string;
  divisionId: DivisionId;
  floor: FloorNumber;
  zone: string;
  activity: string;
  position: { x: number; y: number; z: number };
}

export interface OfficeDiagnosticState {
  activeFloor: FloorNumber | 'all';
  activePov: PovMode;
  cameraPosition: { x: number; y: number; z: number };
  agents: OfficeAgentDiagnostic[];
  connectionStatus: string;
  ticker: Array<Record<string, unknown>>;
  selectedAgentId?: number | null;
  dayNightMode?: 'day' | 'night' | string;
  elevatorFloor?: FloorNumber;
}

const NORMALIZED_EVENT_KEYS = [
  'id',
  'timestamp',
  'source',
  'type',
  'divisionId',
  'agentId',
  'entityId',
  'title',
  'summary',
  'targetZone',
  'targetFloor',
  'severity',
  'metadata',
] as const;

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isFiniteVector3(val: unknown): val is { x: number; y: number; z: number } {
  return (
    isPlainObject(val) &&
    typeof val.x === 'number' &&
    Number.isFinite(val.x) &&
    typeof val.y === 'number' &&
    Number.isFinite(val.y) &&
    typeof val.z === 'number' &&
    Number.isFinite(val.z)
  );
}

function isNonEmptyString(val: unknown, maxLen?: number): val is string {
  return (
    typeof val === 'string' &&
    val.trim().length > 0 &&
    (maxLen === undefined || val.length <= maxLen)
  );
}

export function validateNormalizedEvent(
  input: unknown,
  options: { allowAdditionalProperties?: boolean } = {},
): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['Event must be a non-null plain object'] };
  }

  for (const key of NORMALIZED_EVENT_KEYS) {
    if (!(key in input)) {
      errors.push(`Missing required field: ${key}`);
    }
  }

  if (!options.allowAdditionalProperties) {
    const allowed = new Set<string>(NORMALIZED_EVENT_KEYS);
    for (const key of Object.keys(input)) {
      if (!allowed.has(key)) {
        errors.push(`Unexpected additional property: ${key}`);
      }
    }
  }

  if (!isNonEmptyString(input.id, 128)) {
    errors.push('id must be a non-empty string (<= 128 chars)');
  }

  if (typeof input.timestamp !== 'string' || Number.isNaN(Date.parse(input.timestamp))) {
    errors.push('timestamp must be a valid ISO-8601 date-time string');
  }

  if (!(CANONICAL_EVENT_SOURCES as readonly string[]).includes(String(input.source))) {
    errors.push(`Invalid source: ${String(input.source)}`);
  }

  if (!(CANONICAL_EVENT_TYPES as readonly string[]).includes(String(input.type))) {
    errors.push(`Invalid type: ${String(input.type)}`);
  }

  if (!(CANONICAL_DIVISION_IDS as readonly string[]).includes(String(input.divisionId))) {
    errors.push(`Invalid divisionId: ${String(input.divisionId)}`);
  }

  if (
    typeof input.agentId !== 'number' ||
    !Number.isInteger(input.agentId) ||
    input.agentId < 0 ||
    input.agentId > 23
  ) {
    errors.push(`agentId must be an integer 0..23, got: ${String(input.agentId)}`);
  }

  if (
    input.entityId !== null &&
    (typeof input.entityId !== 'string' || input.entityId.length > 128)
  ) {
    errors.push('entityId must be string (<= 128 chars) or null');
  }

  if (!isNonEmptyString(input.title, 160)) {
    errors.push('title must be a non-empty string (<= 160 chars)');
  }

  if (!isNonEmptyString(input.summary, 500)) {
    errors.push('summary must be a non-empty string (<= 500 chars)');
  }

  if (
    !(CANONICAL_EVENT_TARGET_ZONES as readonly string[]).includes(
      String(input.targetZone),
    )
  ) {
    errors.push(`Invalid targetZone: ${String(input.targetZone)}`);
  }

  if (
    typeof input.targetFloor !== 'number' ||
    !(CANONICAL_FLOORS as readonly number[]).includes(input.targetFloor)
  ) {
    errors.push(`targetFloor must be 1, 2, or 3, got: ${String(input.targetFloor)}`);
  }

  if (
    !(CANONICAL_EVENT_SEVERITIES as readonly string[]).includes(
      String(input.severity),
    )
  ) {
    errors.push(`Invalid severity: ${String(input.severity)}`);
  }

  if (!isPlainObject(input.metadata)) {
    errors.push('metadata must be a plain JSON object');
  }

  return { valid: errors.length === 0, errors };
}

export function validateNoPiiInEvent(event: unknown): ValidationResult {
  const errors: string[] = [];
  const serialized = JSON.stringify(event) || '';

  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const nikPattern = /\b\d{16}\b/;
  const phonePattern = /(?:\+62|08)\d{8,12}/;
  const forbiddenKeysPattern =
    /"(?:email|phone|nik|fullName|address|ktp|password|token)"\s*:/i;

  if (emailPattern.test(serialized)) {
    errors.push('Event payload appears to contain an email address (PII)');
  }
  if (nikPattern.test(serialized)) {
    errors.push('Event payload appears to contain a 16-digit NIK (PII)');
  }
  if (phonePattern.test(serialized)) {
    errors.push('Event payload appears to contain a phone number (PII)');
  }
  if (forbiddenKeysPattern.test(serialized)) {
    errors.push('Event payload contains a forbidden PII/secret key');
  }

  return { valid: errors.length === 0, errors };
}

export function validateGatewaySnapshot(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['Snapshot must be a plain object'] };
  }

  if (!Array.isArray(input.agents)) {
    errors.push('Snapshot.agents must be an array');
  } else if (input.agents.length !== 24) {
    errors.push(`Snapshot.agents must contain 24 agents, got ${input.agents.length}`);
  }

  if (!Array.isArray(input.divisions)) {
    errors.push('Snapshot.divisions must be an array');
  } else if (input.divisions.length !== 6) {
    errors.push(
      `Snapshot.divisions must contain 6 divisions, got ${input.divisions.length}`,
    );
  }

  if (!Array.isArray(input.recentEvents)) {
    errors.push('Snapshot.recentEvents must be an array');
  } else {
    input.recentEvents.forEach((evt, idx) => {
      const res = validateNormalizedEvent(evt);
      if (!res.valid) {
        errors.push(`recentEvents[${idx}]: ${res.errors.join('; ')}`);
      }
    });
  }

  if (!isPlainObject(input.stats)) {
    errors.push('Snapshot.stats must be a plain object');
  }

  return { valid: errors.length === 0, errors };
}

export function validateBacklogItem(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['BacklogItem must be a plain object'] };
  }

  if (!isNonEmptyString(input.id)) errors.push('BacklogItem.id is required');
  if (!isNonEmptyString(input.title)) errors.push('BacklogItem.title is required');

  const validTypes = ['epic', 'story', 'task', 'bug', 'tech-debt', 'tech_debt'];
  if (!validTypes.includes(String(input.type).toLowerCase())) {
    errors.push(`Invalid BacklogItem.type: ${String(input.type)}`);
  }

  if (!isNonEmptyString(input.status)) errors.push('BacklogItem.status is required');
  if (!isNonEmptyString(input.priority)) {
    errors.push('BacklogItem.priority is required');
  }

  if (
    typeof input.storyPoints !== 'number' ||
    !Number.isFinite(input.storyPoints) ||
    input.storyPoints < 0
  ) {
    errors.push('BacklogItem.storyPoints must be a non-negative number');
  }

  if (
    !(CANONICAL_DIVISION_IDS as readonly string[]).includes(
      String(input.ownerDivision),
    )
  ) {
    errors.push(`Invalid BacklogItem.ownerDivision: ${String(input.ownerDivision)}`);
  }

  if (
    typeof input.ownerAgentId !== 'number' ||
    !Number.isInteger(input.ownerAgentId) ||
    input.ownerAgentId < 0 ||
    input.ownerAgentId > 23
  ) {
    errors.push(
      `BacklogItem.ownerAgentId must be 0..23 integer, got ${String(input.ownerAgentId)}`,
    );
  }

  const ac = input.acceptanceCriteria;
  const acValid =
    (typeof ac === 'string' && ac.trim().length > 0) ||
    (Array.isArray(ac) && ac.length > 0 && ac.every((x) => isNonEmptyString(x)));
  if (!acValid) {
    errors.push('BacklogItem.acceptanceCriteria must be non-empty string or string[]');
  }

  if (!Array.isArray(input.dependencies)) {
    errors.push('BacklogItem.dependencies must be an array');
  }

  return { valid: errors.length === 0, errors };
}

export function validateSprint(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['Sprint must be a plain object'] };
  }

  if (!isNonEmptyString(input.id)) errors.push('Sprint.id is required');
  if (!isNonEmptyString(input.name)) errors.push('Sprint.name is required');
  if (!isNonEmptyString(input.status)) errors.push('Sprint.status is required');

  if (input.startDate !== undefined && Number.isNaN(Date.parse(String(input.startDate)))) {
    errors.push('Sprint.startDate must be valid ISO date when provided');
  }
  if (input.endDate !== undefined && Number.isNaN(Date.parse(String(input.endDate)))) {
    errors.push('Sprint.endDate must be valid ISO date when provided');
  }

  return { valid: errors.length === 0, errors };
}

export function validateDocEntry(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['DocEntry must be a plain object'] };
  }

  if (!isNonEmptyString(input.slug)) errors.push('DocEntry.slug is required');
  if (!isNonEmptyString(input.title)) errors.push('DocEntry.title is required');
  if (!isNonEmptyString(input.category)) errors.push('DocEntry.category is required');

  if (
    input.ownerDivision !== undefined &&
    !(CANONICAL_DIVISION_IDS as readonly string[]).includes(
      String(input.ownerDivision),
    )
  ) {
    errors.push(`Invalid DocEntry.ownerDivision: ${String(input.ownerDivision)}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateRubricEvaluation(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['RubricEvaluation must be a plain object'] };
  }

  const workflows = Array.isArray(input.workflows)
    ? input.workflows
    : Array.isArray(input.entries)
      ? input.entries
      : null;

  if (!workflows || workflows.length === 0) {
    errors.push('RubricEvaluation.workflows (or entries) must be a non-empty array');
  } else {
    workflows.forEach((wf, idx) => {
      if (!isPlainObject(wf)) {
        errors.push(`workflows[${idx}] must be an object`);
        return;
      }
      if (!isNonEmptyString(wf.workflow)) {
        errors.push(`workflows[${idx}].workflow is required`);
      }
      if (typeof wf.contractDefined !== 'boolean') {
        errors.push(`workflows[${idx}].contractDefined must be boolean`);
      }
      if (
        !(CANONICAL_DIVISION_IDS as readonly string[]).includes(
          String(wf.ownerDivision),
        )
      ) {
        errors.push(
          `workflows[${idx}].ownerDivision invalid: ${String(wf.ownerDivision)}`,
        );
      }
      if (!Array.isArray(wf.prioritizedItems) || wf.prioritizedItems.length === 0) {
        errors.push(`workflows[${idx}].prioritizedItems must be non-empty array`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateOfficeDiagnosticState(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { valid: false, errors: ['OfficeDiagnosticState must be a plain object'] };
  }

  const validFloor =
    input.activeFloor === 'all' ||
    (typeof input.activeFloor === 'number' &&
      (CANONICAL_FLOORS as readonly number[]).includes(input.activeFloor));
  if (!validFloor) {
    errors.push(`Invalid activeFloor: ${String(input.activeFloor)}`);
  }

  if (!(CANONICAL_POV_MODES as readonly string[]).includes(String(input.activePov))) {
    errors.push(`Invalid activePov: ${String(input.activePov)}`);
  }

  if (!isFiniteVector3(input.cameraPosition)) {
    errors.push('cameraPosition must have finite numeric x, y, z');
  }

  if (!Array.isArray(input.agents) || input.agents.length !== 24) {
    errors.push(
      `OfficeDiagnosticState.agents must have 24 entries, got ${Array.isArray(input.agents) ? input.agents.length : typeof input.agents}`,
    );
  } else {
    input.agents.forEach((agent, idx) => {
      if (!isPlainObject(agent)) {
        errors.push(`agents[${idx}] must be an object`);
        return;
      }
      if (
        typeof agent.id !== 'number' ||
        !Number.isInteger(agent.id) ||
        agent.id < 0 ||
        agent.id > 23
      ) {
        errors.push(`agents[${idx}].id invalid: ${String(agent.id)}`);
      }
      if (
        !(CANONICAL_DIVISION_IDS as readonly string[]).includes(
          String(agent.divisionId),
        )
      ) {
        errors.push(`agents[${idx}].divisionId invalid: ${String(agent.divisionId)}`);
      }
      if (
        typeof agent.floor !== 'number' ||
        !(CANONICAL_FLOORS as readonly number[]).includes(agent.floor)
      ) {
        errors.push(`agents[${idx}].floor invalid: ${String(agent.floor)}`);
      }
      if (!isNonEmptyString(agent.zone)) {
        errors.push(`agents[${idx}].zone must be non-empty string`);
      }
      if (!isNonEmptyString(agent.activity)) {
        errors.push(`agents[${idx}].activity must be non-empty string`);
      }
      if (!isFiniteVector3(agent.position)) {
        errors.push(`agents[${idx}].position must have finite numeric x, y, z`);
      }
    });
  }

  if (!isNonEmptyString(input.connectionStatus)) {
    errors.push('connectionStatus must be a non-empty string');
  }

  if (!Array.isArray(input.ticker)) {
    errors.push('ticker must be an array');
  }

  return { valid: errors.length === 0, errors };
}

export function assertValid(result: ValidationResult, label: string): void {
  if (!result.valid) {
    throw new Error(`${label} validation failed:\n - ${result.errors.join('\n - ')}`);
  }
}

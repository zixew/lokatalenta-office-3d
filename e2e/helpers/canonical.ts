export const CANONICAL_DIVISION_IDS = [
  'executive',
  'architecture',
  'engineering',
  'qa',
  'devops',
  'lounge',
] as const;

export type DivisionId = (typeof CANONICAL_DIVISION_IDS)[number];

export const CANONICAL_FLOORS = [1, 2, 3] as const;
export type FloorNumber = (typeof CANONICAL_FLOORS)[number];

export const CANONICAL_ZONE_TYPES = [
  'lobby',
  'cafeteria',
  'musholla',
  'workspace',
  'meeting-rooms',
  'relaxation',
  'gym',
] as const;

export type BuildingZoneType = (typeof CANONICAL_ZONE_TYPES)[number];

export const CANONICAL_EVENT_TARGET_ZONES = [
  'workspace',
  'boardroom',
  'cafeteria',
  'lobby',
  'lounge',
  'gym',
  'musholla',
] as const;

export type EventTargetZone = (typeof CANONICAL_EVENT_TARGET_ZONES)[number];

export const CANONICAL_POV_MODES = [
  'overview',
  'third-person',
  'first-person',
] as const;

export type PovMode = (typeof CANONICAL_POV_MODES)[number];

export const CANONICAL_EVENT_SOURCES = [
  'backlog',
  'sprint-planner',
  'docs',
  'lms-psikotes',
  'github',
  'office-sim',
] as const;

export type EventSource = (typeof CANONICAL_EVENT_SOURCES)[number];

export const CANONICAL_EVENT_TYPES = [
  'backlog.updated',
  'sprint.updated',
  'doc.updated',
  'lms.activity',
  'agent.task.completed',
  'github.commit',
  'github.pr',
  'github.issue',
] as const;

export type EventType = (typeof CANONICAL_EVENT_TYPES)[number];

export const CANONICAL_EVENT_SEVERITIES = [
  'info',
  'success',
  'warning',
  'alert',
] as const;

export type EventSeverity = (typeof CANONICAL_EVENT_SEVERITIES)[number];

export interface CanonicalDivision {
  id: DivisionId;
  name: string;
  shortName: string;
  color: string;
  defaultFloor: FloorNumber;
  defaultZone: EventTargetZone;
  agentIds: readonly number[];
}

export const CANONICAL_DIVISIONS: readonly CanonicalDivision[] = [
  {
    id: 'executive',
    name: 'Eksekutif & Tata Kelola Produk',
    shortName: '🏛️ Eksekutif & Manajemen (3)',
    color: '#3b82f6',
    defaultFloor: 3,
    defaultZone: 'workspace',
    agentIds: [0, 1, 2],
  },
  {
    id: 'architecture',
    name: 'Arsitektur Sistem & Inovasi AI',
    shortName: '📐 Arsitektur & AI (3)',
    color: '#8b5cf6',
    defaultFloor: 3,
    defaultZone: 'workspace',
    agentIds: [3, 4, 21],
  },
  {
    id: 'engineering',
    name: 'Studio Core Engineering & Product Craft',
    shortName: '💻 Core Engineering (5)',
    color: '#10b981',
    defaultFloor: 2,
    defaultZone: 'workspace',
    agentIds: [5, 6, 18, 19, 20],
  },
  {
    id: 'qa',
    name: 'Laboratorium Jaminan Kualitas & Otomasi',
    shortName: '🔬 QA & Testing Lab (4)',
    color: '#f59e0b',
    defaultFloor: 2,
    defaultZone: 'workspace',
    agentIds: [7, 8, 9, 10],
  },
  {
    id: 'devops',
    name: 'Pusat Operasional Cloud, DevOps & Keamanan Siber',
    shortName: '⚡ Security & DevOps (5)',
    color: '#06b6d4',
    defaultFloor: 3,
    defaultZone: 'workspace',
    agentIds: [11, 12, 16, 17, 22],
  },
  {
    id: 'lounge',
    name: 'Stakeholder & User Experience Lounge',
    shortName: '☕ Stakeholder Lounge (4)',
    color: '#ec4899',
    defaultFloor: 2,
    defaultZone: 'lounge',
    agentIds: [13, 14, 15, 23],
  },
] as const;

export interface CanonicalAgent {
  id: number;
  name: string;
  shortName: string;
  role: string;
  divisionId: DivisionId;
  defaultFloor: FloorNumber;
  defaultZone: EventTargetZone;
}

export const CANONICAL_AGENTS: readonly CanonicalAgent[] = [
  {
    id: 0,
    name: 'Rizco Renova',
    shortName: 'Rizco Renova',
    role: 'Team Leader & Release Sign-Off Authority',
    divisionId: 'executive',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 1,
    name: 'Bramantyo Daniswara',
    shortName: 'Bram Daniswara',
    role: 'Chief Commercial & Business Strategist',
    divisionId: 'executive',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 2,
    name: 'Pranadipa Wicaksana',
    shortName: 'Prana Wicaksana',
    role: 'Principal Product Owner & Backlog Arbiter',
    divisionId: 'executive',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 3,
    name: 'Satria Adhyasta',
    shortName: 'Satria Adhyasta',
    role: 'Lead System Analyst & Flow Architect',
    divisionId: 'architecture',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 4,
    name: 'Ir. Arkananta Dewantara',
    shortName: 'Arka Dewantara',
    role: 'Chief IT Solution Architect',
    divisionId: 'architecture',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 5,
    name: 'Farel Faza Nugraha',
    shortName: 'Faza Nugraha',
    role: 'Staff Frontend Engineer & UI Craft Lead',
    divisionId: 'engineering',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 6,
    name: 'Bagas Bimo Prasetyo',
    shortName: 'Bimo Prasetyo',
    role: 'Staff Backend Engineer & Database Lead',
    divisionId: 'engineering',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 7,
    name: 'Qonita Anindya',
    shortName: 'Qonita Anindya',
    role: 'Lead Manual & Exploratory QA Specialist',
    divisionId: 'qa',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 8,
    name: 'Qaisar Al-Ghaffar',
    shortName: 'Qash Al-Ghaffar',
    role: 'QA Automation & Integration Lead',
    divisionId: 'qa',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 9,
    name: 'Pandu Respati',
    shortName: 'Pandu Respati',
    role: 'Performance & Stress Test Specialist',
    divisionId: 'qa',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 10,
    name: 'Raditya Rama Kusuma',
    shortName: 'Rama Kusuma',
    role: 'Regression Gatekeeper & Matrix Master',
    divisionId: 'qa',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 11,
    name: 'Damar Deva Gunawan',
    shortName: 'Deva Gunawan',
    role: 'DevOps & Cloud Infrastructure Lead',
    divisionId: 'devops',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 12,
    name: 'Tara Wulandari',
    shortName: 'Tara Wulandari',
    role: 'Lead Technical Communicator & Documentarian',
    divisionId: 'devops',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 13,
    name: 'Surya Dimas Pratama',
    shortName: 'Dimas Pratama',
    role: 'Student & Candidate Experience Advocate',
    divisionId: 'lounge',
    defaultFloor: 2,
    defaultZone: 'lounge',
  },
  {
    id: 14,
    name: 'Ibu Triastuti Rahayu, M.Pd.',
    shortName: 'Bu Tias Rahayu',
    role: 'Curriculum Mentor & Educator Advocate',
    divisionId: 'lounge',
    defaultFloor: 2,
    defaultZone: 'lounge',
  },
  {
    id: 15,
    name: 'Agung Abimanyu Santoso',
    shortName: 'Agung Santoso',
    role: 'Governance & Platform Admin',
    divisionId: 'lounge',
    defaultFloor: 2,
    defaultZone: 'lounge',
  },
  {
    id: 16,
    name: 'Rendra Dananjaya',
    shortName: 'Rendra Dananjaya',
    role: 'Lead Penetration Tester & Red Team Specialist',
    divisionId: 'devops',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 17,
    name: 'Ir. Saskia Wardhani, CISA, CISSP',
    shortName: 'Saskia Wardhani',
    role: 'Principal IT Security & DevSecOps Compliance Lead',
    divisionId: 'devops',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 18,
    name: 'Hendrawan Wicaksono, M.Kom.',
    shortName: 'Hendra Wicaksono',
    role: 'Principal Frontend Architect & Clean Architecture Lead',
    divisionId: 'engineering',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 19,
    name: 'Dr. Ir. Danu Bratawidjaja, Ph.D.',
    shortName: 'Danu Bratawidjaja',
    role: 'Principal Backend Architect & Clean Architecture Lead',
    divisionId: 'engineering',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 20,
    name: 'Nadia Maharani, S.Ds.',
    shortName: 'Nadia Maharani',
    role: 'Lead UI/UX Product Designer & Design System Specialist',
    divisionId: 'engineering',
    defaultFloor: 2,
    defaultZone: 'workspace',
  },
  {
    id: 21,
    name: 'Dr. Gibran Al-Farabi, Ph.D.',
    shortName: 'Gibran Al-Farabi',
    role: 'Lead AI/ML Engineer & Speech-To-Text Specialist',
    divisionId: 'architecture',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 22,
    name: 'Reza Pratama, S.Kom.',
    shortName: 'Reza Pratama',
    role: 'Site Reliability Engineer & Real-Time Observability Lead',
    divisionId: 'devops',
    defaultFloor: 3,
    defaultZone: 'workspace',
  },
  {
    id: 23,
    name: 'Maya Safitri, S.Psi., CHRP',
    shortName: 'Maya Safitri',
    role: 'Corporate Recruiter & Talent Acquisition Advocate',
    divisionId: 'lounge',
    defaultFloor: 2,
    defaultZone: 'lounge',
  },
] as const;

/**
 * Legacy short-name & persona-name drifts from docs/kantor_ai_3d.html.
 * Canonical agent `name` fields MUST never match these drifted strings.
 */
export const LEGACY_DRIFT_NAMES = [
  'Bram Daniswara',
  'Prana Wicaksana',
  'Arya Adhyasta',
  'Arka Dewantara',
  'Faza Nugraha',
  'Bimo Prasetyo',
  'Qori Anindya',
  'Qash Al-Ghaffar',
  'Rama Kusuma',
  'Deva Gunawan',
  'Tari Wulandari',
  'Dimas Pratama',
  'Bu Tias Rahayu',
  'Agung Santoso',
  'Saskia Wardhani',
  'Hendra Wicaksono',
  'Danu Bratawidjaja',
  'Nadia Maharani',
  'Gibran Al-Farabi',
  'Reza Pratama',
  'Maya Safitri',
] as const;

/**
 * Legacy wrong character-name replacements (e.g. Arya -> Satria, Qori -> Qonita, Tari -> Tara)
 * that must never appear even as shortNames or display labels.
 */
export const FORBIDDEN_LEGACY_ALIAS_DRIFTS = [
  'Arya Adhyasta',
  'Qori Anindya',
  'Tari Wulandari',
] as const;

export function getAgentById(id: number): CanonicalAgent | undefined {
  return CANONICAL_AGENTS.find((a) => a.id === id);
}

export function getDivisionById(id: DivisionId): CanonicalDivision | undefined {
  return CANONICAL_DIVISIONS.find((d) => d.id === id);
}

export function getAgentsByDivision(divisionId: DivisionId): CanonicalAgent[] {
  return CANONICAL_AGENTS.filter((a) => a.divisionId === divisionId);
}

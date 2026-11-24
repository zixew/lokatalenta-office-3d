import type {
  AgentProfile,
  CollaborationPair,
  DivisionConfig,
  DivisionId,
  EventSeverity,
  EventSource,
  EventTargetZone,
  EventType,
  FloorNumber,
  NormalizedEvent,
  ResolvedEventDestination,
  ServiceContract,
  ZoneId,
} from '../types/office.ts';

export const CONTRACT_VERSION = '1.0.0' as const;
export const GITHUB_OWNER = 'zixew' as const;

export const AVOIDED_HOST_PORTS: readonly number[] = [
  5000, 7000, 8089, 8091, 11301, 54321, 56211,
] as const;

export function hexToThreeColor(hex: string): number {
  const normalized = hex.trim().replace(/^0x/i, '').replace(/^#/, '');
  const parsed = Number.parseInt(normalized, 16);
  return Number.isFinite(parsed) ? parsed : 0x3b82f6;
}

export const DIVISIONS: readonly DivisionConfig[] = [
  {
    id: 'executive',
    name: 'Eksekutif & Tata Kelola Produk',
    shortName: '🏛️ Eksekutif & Manajemen (3)',
    motto: 'Integritas Tanpa Kompromi, Nilai Bisnis Berkelanjutan',
    color: '#3b82f6',
    threeColor: 0x3b82f6,
    defaultFloor: 3,
    defaultZone: 'workspace',
    agentIds: [0, 1, 2],
  },
  {
    id: 'architecture',
    name: 'Arsitektur Sistem & Inovasi AI',
    shortName: '📐 Arsitektur & AI (3)',
    motto: 'Presisi Fondasi, Arsitektur Heksagonal, Kecerdasan Teruji',
    color: '#8b5cf6',
    threeColor: 0x8b5cf6,
    defaultFloor: 3,
    defaultZone: 'workspace',
    agentIds: [3, 4, 21],
  },
  {
    id: 'engineering',
    name: 'Studio Core Engineering & Product Craft',
    shortName: '💻 Core Engineering (5)',
    motto: 'Kode Bersih, Performa Tangguh, Anti-AI-Slop Visual System',
    color: '#10b981',
    threeColor: 0x10b981,
    defaultFloor: 2,
    defaultZone: 'workspace',
    agentIds: [5, 6, 18, 19, 20],
  },
  {
    id: 'qa',
    name: 'Laboratorium Jaminan Kualitas & Otomasi',
    shortName: '🔬 QA & Testing Lab (4)',
    motto: 'Nol Cacat Produksi, Validasi Ketat, Cakupan Uji 100%',
    color: '#f59e0b',
    threeColor: 0xf59e0b,
    defaultFloor: 2,
    defaultZone: 'workspace',
    agentIds: [7, 8, 9, 10],
  },
  {
    id: 'devops',
    name: 'Pusat Operasional Cloud, DevOps & Keamanan Siber',
    shortName: '⚡ Security & DevOps (5)',
    motto: 'Pertahanan Berlapis Zero Trust, Rilis Tanpa Henti, Kepatuhan UU PDP',
    color: '#06b6d4',
    threeColor: 0x06b6d4,
    defaultFloor: 3,
    defaultZone: 'workspace',
    agentIds: [11, 12, 16, 17, 22],
  },
  {
    id: 'lounge',
    name: 'Stakeholder & User Experience Lounge',
    shortName: '☕ Stakeholder Lounge (4)',
    motto: 'Suara Nyata Pengguna, Advokasi Inklusif, Dampak Bermakna',
    color: '#ec4899',
    threeColor: 0xec4899,
    defaultFloor: 2,
    defaultZone: 'lounge',
    agentIds: [13, 14, 15, 23],
  },
] as const;

export const DIVISION_BY_ID: Record<DivisionId, DivisionConfig> = {
  executive: DIVISIONS[0],
  architecture: DIVISIONS[1],
  engineering: DIVISIONS[2],
  qa: DIVISIONS[3],
  devops: DIVISIONS[4],
  lounge: DIVISIONS[5],
};

export const AGENTS: readonly AgentProfile[] = [
  {
    id: 0,
    name: 'Rizco Renova',
    shortName: 'Rizco Renova',
    role: 'Team Leader & Release Sign-Off Authority',
    divisionId: 'executive',
    category: 'lead',
    avatar: '👑',
    skills: {
      primary: [
        'Release Sign-Off Governance (99%)',
        'SDLC Gatekeeping & Traceability (98%)',
        'Risk Mitigation & Quality Gates (97%)',
        'Agile Multi-Division Orchestration (98%)',
      ],
      stack: [
        'GitFlow v2',
        'Vercel Enterprise CLI',
        'GitHub Actions CI',
        'Jira / Linear',
        'Markdown Spec',
        'KaTeX',
        'OpenPyXL',
      ],
    },
    methodology: [
      'Clean Architecture SDLC Enforcement',
      'Four Quality Gates Protocol',
      'Anti-AI-Slop Craftsmanship Standard',
    ],
    certifications: [
      'Chief Engineering Lead',
      'Certified Scrum Master (CSM)',
      'ISO/IEC 25010 Evaluator',
    ],
    avatarStyle: {
      hair: '#18181b',
      skin: '#fcd5b5',
      outfit: '#0f172a',
      hairStyle: 'slick',
      accessory: 'gold_pin',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 1,
    name: 'Bramantyo Daniswara',
    shortName: 'Bram Daniswara',
    role: 'Chief Commercial & Business Strategist',
    divisionId: 'executive',
    category: 'product',
    avatar: '💼',
    skills: {
      primary: [
        'Free-Access Community Growth (96%)',
        'Enterprise ATS Pipeline Sourcing (95%)',
        'Open Institutional Onboarding (94%)',
        'Adoption & Retention Modeling (95%)',
      ],
      stack: [
        'Open-Access Telemetry',
        'Mixpanel Analytics',
        'PostgreSQL BI Queries',
        'Google Analytics 4',
        'Community Funnel Sandbox',
      ],
    },
    methodology: [
      'Product-Led Growth (PLG)',
      'Open-Access Adoption Funnel',
      'Cohort Retention Analysis',
    ],
    certifications: [
      'Chief Community Growth Strategist',
      'Reforge Product-Led Growth',
      'Certified Product Executive',
    ],
    avatarStyle: {
      hair: '#1e1e1e',
      skin: '#f5d0b5',
      outfit: '#1e3a8a',
      hairStyle: 'slick',
      accessory: 'tie',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 2,
    name: 'Pranadipa Wicaksana',
    shortName: 'Prana Wicaksana',
    role: 'Principal Product Owner & Backlog Arbiter',
    divisionId: 'executive',
    category: 'product',
    avatar: '📋',
    skills: {
      primary: [
        'PRD & TRD Specification (96%)',
        'User Story & Acceptance Criteria Gatekeeping (97%)',
        'Backlog Arbiter & MoSCoW Prioritization (95%)',
        'Sprint Scope Negotiation (94%)',
      ],
      stack: [
        'Mermaid.js',
        'Figma Dev Mode',
        'Linear / Jira',
        'Notion Product Ops',
        'Canny / UserVoice',
      ],
    },
    methodology: [
      'Scrum & Kanban Hybrid',
      'Continuous Discovery Habits',
      'Behavior-Driven Acceptance (BDD)',
    ],
    certifications: [
      'Certified Scrum Product Owner (CSPO)',
      'Pragmatic Institute Certified (PMC-III)',
    ],
    avatarStyle: {
      hair: '#4a2e18',
      skin: '#fcd5b5',
      outfit: '#1d4ed8',
      hairStyle: 'parted',
      accessory: 'collar',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 3,
    name: 'Satria Adhyasta',
    shortName: 'Satria Adhyasta',
    role: 'Lead System Analyst & Flow Architect',
    divisionId: 'architecture',
    category: 'tech',
    avatar: '📐',
    skills: {
      primary: [
        'Psychometric State Machine Modeling (97%)',
        'Deep-Link Routing Protocols (96%)',
        'Multi-Tenant Isolation Analysis (95%)',
        'Entity-Relationship Architecture (96%)',
      ],
      stack: [
        'TypeScript AST',
        'XState',
        'Mermaid State & ERD Diagrams',
        'PostgreSQL EXPLAIN ANALYZE',
        'REST / RPC OpenAPI',
      ],
    },
    methodology: [
      'Domain-Driven Design (DDD)',
      'Statecharts Specification',
      'Event Storming',
    ],
    certifications: [
      'Certified Business Analysis Professional (CBAP)',
      'OMG-Certified UML Professional (OCUP-2)',
    ],
    avatarStyle: {
      hair: '#2b2b2b',
      skin: '#f3c8a8',
      outfit: '#6d28d9',
      glasses: true,
      hairStyle: 'neat',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 4,
    name: 'Ir. Arkananta Dewantara',
    shortName: 'Arka Dewantara',
    role: 'Chief IT Solution Architect',
    divisionId: 'architecture',
    category: 'tech',
    avatar: '🏛️',
    skills: {
      primary: [
        'Cloud-Native Solution Architecture (98%)',
        'Supabase Connection Pooling & RLS (97%)',
        'Sub-20ms Query Optimization (96%)',
        'High-Availability System Design (97%)',
      ],
      stack: [
        'Supabase / PostgreSQL 15',
        'PgBouncer',
        'Redis Cache',
        'Docker & Compose',
        'GraphQL / PostgREST',
      ],
    },
    methodology: [
      'Hexagonal Architecture (Ports & Adapters)',
      'CQRS & Read Replicas',
      'The Twelve-Factor App',
    ],
    certifications: [
      'TOGAF 9.2 Certified Architect',
      'AWS Solutions Architect Professional',
      'PostgreSQL Certified Specialist',
    ],
    avatarStyle: {
      hair: '#3d3d3d',
      skin: '#ebd0b0',
      outfit: '#4c1d95',
      glasses: true,
      hairStyle: 'pompadour',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 5,
    name: 'Farel Faza Nugraha',
    shortName: 'Faza Nugraha',
    role: 'Staff Frontend Engineer & UI Craft Lead',
    divisionId: 'engineering',
    category: 'tech',
    avatar: '💻',
    skills: {
      primary: [
        'Staff Frontend Engineering (98%)',
        'PWA iOS Standalone & Safe Area Engineering (97%)',
        'Anti-AI-Slop Visual System (98%)',
        'Radar 5D Interactive Canvas (96%)',
      ],
      stack: [
        'React 19',
        'TypeScript 5 Strict',
        'Vite',
        'Tailwind CSS 3',
        'Web Audio API',
        'HTML5 Canvas / SVG',
      ],
    },
    methodology: [
      'Clean Architecture UI (View / Hook Separation)',
      'Offline-First Service Workers',
      'Micro-Interactions Tactile Physics',
    ],
    certifications: [
      'Meta Certified Front-End Developer',
      'Google Mobile Web Specialist (MWS)',
    ],
    avatarStyle: {
      hair: '#1c1917',
      skin: '#fed7aa',
      outfit: '#059669',
      headphones: true,
      hairStyle: 'messy',
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 6,
    name: 'Bagas Bimo Prasetyo',
    shortName: 'Bimo Prasetyo',
    role: 'Staff Backend Engineer & Database Lead',
    divisionId: 'engineering',
    category: 'tech',
    avatar: '⚙️',
    skills: {
      primary: [
        'Staff Backend Engineering (97%)',
        'Idempotent SQL DDL & Migration Scripts (96%)',
        'Row-Level Security (RLS) Policy Crafting (97%)',
        'Row-Locking Concurrency Control (96%)',
      ],
      stack: [
        'Node.js 22 LTS',
        'Express.js',
        'PostgreSQL PL/pgSQL',
        'Supabase Client & Auth',
        'Zod Validation',
      ],
    },
    methodology: [
      'Hexagonal Ports & Adapters Implementation',
      'Optimistic / Pessimistic Locking',
      'Idempotent Migration Engineering',
    ],
    certifications: [
      'Oracle Certified Professional: Database',
      'Certified Node.js Application Developer (JSNAD)',
    ],
    avatarStyle: {
      hair: '#171717',
      skin: '#f5d0b5',
      outfit: '#065f46',
      hairStyle: 'fade',
      accessory: 'smartwatch',
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 7,
    name: 'Qonita Anindya',
    shortName: 'Qonita Anindya',
    role: 'Lead Manual & Exploratory QA Specialist',
    divisionId: 'qa',
    category: 'qa',
    avatar: '🧪',
    skills: {
      primary: [
        'Exploratory & Edge-Case Testing (95%)',
        'Cross-Browser & iOS Safari Validation (96%)',
        'Usability & Accessibility Heuristics (94%)',
        'Defect Isolation & Triage (95%)',
      ],
      stack: [
        'BrowserStack',
        'Charles Proxy / DevTools',
        'Screen Readers (VoiceOver/TalkBack)',
        'TestRail',
        'Playwright Inspector',
      ],
    },
    methodology: [
      'Context-Driven Testing',
      'Heuristic Evaluation (Nielsen-Molich)',
      'Boundary Value Analysis',
    ],
    certifications: [
      'ISTQB Certified Tester Foundation Level (CTFL)',
      'CPACC Accessibility Practitioner',
    ],
    avatarStyle: {
      hair: '#7c2d12',
      skin: '#fcd5b5',
      outfit: '#d97706',
      hairStyle: 'long',
      glasses: true,
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 8,
    name: 'Qaisar Al-Ghaffar',
    shortName: 'Qash Al-Ghaffar',
    role: 'QA Automation & Integration Lead',
    divisionId: 'qa',
    category: 'qa',
    avatar: '🤖',
    skills: {
      primary: [
        'Vitest Automation Engineering (98%)',
        'End-to-End Test Suite Orchestration (96%)',
        'CI Test Pipeline Integration (96%)',
        'Mocking Strategy & Deterministic Testing (97%)',
      ],
      stack: [
        'Vitest v4',
        'Playwright Test',
        'Testing Library / JSDOM',
        'GitHub Actions CI',
        'c8 / Istanbul Coverage',
      ],
    },
    methodology: [
      'Test-Driven Development (TDD)',
      'Testing Trophy Paradigm',
      'Flaky Test Elimination Engineering',
    ],
    certifications: [
      'ISTQB Advanced Level Test Automation Engineer (CTAL-TAE)',
      'Certified Selenium / Playwright Lead',
    ],
    avatarStyle: {
      hair: '#18181b',
      skin: '#f5d0b5',
      outfit: '#b45309',
      headphones: true,
      hairStyle: 'short',
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 9,
    name: 'Pandu Respati',
    shortName: 'Pandu Respati',
    role: 'Performance & Stress Test Specialist',
    divisionId: 'qa',
    category: 'qa',
    avatar: '⏱️',
    skills: {
      primary: [
        'Performance Benchmarking & Load Testing (96%)',
        'JavaScript Bundle Budget Auditing (< 250 kB) (98%)',
        'Memory Leak & Reflow Profiling (95%)',
        'Core Web Vitals Optimization (96%)',
      ],
      stack: [
        'Google Lighthouse CI',
        'Rollup Visualizer',
        'k6 Load Testing',
        'Chrome Performance Profiler',
        'Autocannon',
      ],
    },
    methodology: [
      'Performance Budgets Enforcement',
      'RAIL Performance Model',
      'Critical Rendering Path Optimization',
    ],
    certifications: [
      'Google Web Performance Specialist',
      'Certified LoadRunner Professional',
    ],
    avatarStyle: {
      hair: '#3f3f46',
      skin: '#fed7aa',
      outfit: '#92400e',
      hairStyle: 'spiky',
      accessory: 'bandana',
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 10,
    name: 'Raditya Rama Kusuma',
    shortName: 'Rama Kusuma',
    role: 'Regression Gatekeeper & Matrix Master',
    divisionId: 'qa',
    category: 'qa',
    avatar: '🔄',
    skills: {
      primary: [
        '112 QA Matrix Synchronization (98%)',
        'Zero-Regression Verification (97%)',
        'Backward Compatibility Auditing (96%)',
        'Multi-Tenant Test Data Provisioning (95%)',
      ],
      stack: [
        'OpenPyXL Excel Automation',
        'Markdown Spec Sync',
        'Supabase Seed CLI',
        'Jest/Vitest Snapshot Testing',
      ],
    },
    methodology: [
      'Risk-Based Regression Testing',
      'Traceability Matrix Engineering',
      'Defect Prevention SDLC',
    ],
    certifications: [
      'ISTQB Advanced Level Test Manager (CTAL-TM)',
      'ASQ Certified Software Quality Engineer',
    ],
    avatarStyle: {
      hair: '#27272a',
      skin: '#f5d0b5',
      outfit: '#78350f',
      glasses: true,
      hairStyle: 'bald',
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 11,
    name: 'Damar Deva Gunawan',
    shortName: 'Deva Gunawan',
    role: 'DevOps & Cloud Infrastructure Lead',
    divisionId: 'devops',
    category: 'ops',
    avatar: '🚀',
    skills: {
      primary: [
        'GitFlow v2 Release Management (98%)',
        'Zero-Downtime Vercel Deployment (97%)',
        'GitHub Actions CI/CD Pipeline (97%)',
        'Environment & Branch Protection (98%)',
      ],
      stack: [
        'Vercel CLI',
        'GitHub Actions',
        'Git CLI & Hooks',
        'Bash Automation',
        'Terraform (IaC)',
      ],
    },
    methodology: [
      'GitFlow v2 Governance',
      'Continuous Delivery / Progressive Rollout',
      'Infrastructure as Code (IaC)',
    ],
    certifications: [
      'Certified Kubernetes Administrator (CKA)',
      'HashiCorp Certified: Terraform Associate',
      'GitHub Actions Certified',
    ],
    avatarStyle: {
      hair: '#09090b',
      skin: '#f3c8a8',
      outfit: '#0891b2',
      headphones: true,
      hairStyle: 'beanie',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 12,
    name: 'Tara Wulandari',
    shortName: 'Tara Wulandari',
    role: 'Lead Technical Communicator & Documentarian',
    divisionId: 'devops',
    category: 'ops',
    avatar: '📝',
    skills: {
      primary: [
        'Technical Writing & Specification (97%)',
        'Architecture Decision Records (ADR) (96%)',
        'OpenAPI / Swagger Contract Specs (95%)',
        'Release Notes & Knowledge Base (97%)',
      ],
      stack: [
        'Mermaid.js',
        'Docusaurus',
        'Swagger / Postman',
        'GitBook',
        'Markdown / KaTeX',
      ],
    },
    methodology: [
      'Docs-as-Code Paradigm',
      'Information Architecture',
      'Style Guide Compliance (Google Developer Docs)',
    ],
    certifications: [
      'Certified Professional Technical Communicator (CPTC)',
      'IEEE Professional Member',
    ],
    avatarStyle: {
      hair: '#451a03',
      skin: '#fcd5b5',
      outfit: '#0e7490',
      glasses: true,
      hairStyle: 'ponytail',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 13,
    name: 'Surya Dimas Pratama',
    shortName: 'Dimas Pratama',
    role: 'Student & Candidate Experience Advocate',
    divisionId: 'lounge',
    category: 'pov',
    avatar: '🎓',
    skills: {
      primary: [
        'Candidate UX Advocacy (96%)',
        'Proctoring Usability & Stress Reduction (95%)',
        'Mobile-First Assessment Validation (97%)',
        'Psychological Safety in Testing (95%)',
      ],
      stack: [
        'iOS Safari 17+',
        'Android Chrome',
        'Webcam Proctoring UI',
        'Accessibility TalkBack',
        'Screen Recording',
      ],
    },
    methodology: [
      'User-Centered Design (UCD)',
      'Student Journey Mapping',
      'Empathy-Driven UX Evaluation',
    ],
    certifications: [
      'Student Body UX Ambassador',
      'NN/g Usability Testing Participant Certified',
    ],
    avatarStyle: {
      hair: '#1f2937',
      skin: '#f5d0b5',
      outfit: '#db2777',
      hairStyle: 'messy',
      accessory: 'hoodie',
    },
    defaultZone: 'lounge',
    defaultFloor: 2,
  },
  {
    id: 14,
    name: 'Ibu Triastuti Rahayu, M.Pd.',
    shortName: 'Bu Tias Rahayu',
    role: 'Curriculum Mentor & Educator Advocate',
    divisionId: 'lounge',
    category: 'pov',
    avatar: '👩‍🏫',
    skills: {
      primary: [
        'Pedagogical Curriculum & Rubric Design (97%)',
        'Question Bank Psychometrics (96%)',
        'STAR Rubric Behavioral Evaluation (97%)',
        'Teacher & Mentor Workflow Optimization (96%)',
      ],
      stack: [
        'Taxonomy Bloom Framework',
        'STAR Behavioral Matrix',
        'Question Bank Management',
        'LMS Grading Studio',
      ],
    },
    methodology: [
      'Constructive Alignment Pedagogy',
      'Item Response Theory (IRT)',
      'Classroom Cohort Analytics',
    ],
    certifications: [
      'Magister Pendidikan (M.Pd.)',
      'Certified Educational Assessment Specialist',
      'Master Assessor BNSP',
    ],
    avatarStyle: {
      hair: '#312e81',
      skin: '#fcd5b5',
      outfit: '#be185d',
      glasses: true,
      hairStyle: 'bun',
      accessory: 'scarf',
    },
    defaultZone: 'lounge',
    defaultFloor: 2,
  },
  {
    id: 15,
    name: 'Agung Abimanyu Santoso',
    shortName: 'Agung Santoso',
    role: 'Governance & Platform Admin',
    divisionId: 'lounge',
    category: 'pov',
    avatar: '🛡️',
    skills: {
      primary: [
        'Platform Multi-Tenant Governance (97%)',
        'Audit Trail & Forensic Logging (96%)',
        'Role-Based Access Control (RBAC) (98%)',
        'Emergency Killswitch & Ops Isolation (97%)',
      ],
      stack: [
        'Supabase Auth Logs',
        'PostgreSQL System Catalogs',
        'Admin Dashboard Portal',
        'CSV Export / Excel Audits',
      ],
    },
    methodology: [
      'Least Privilege Principle',
      'Separation of Duties (SoD)',
      'Enterprise Platform Governance',
    ],
    certifications: [
      'Certified Information Systems Auditor (CISA)',
      'ITIL 4 Foundation Enterprise Lead',
    ],
    avatarStyle: {
      hair: '#18181b',
      skin: '#f5d0b5',
      outfit: '#9d174d',
      hairStyle: 'parted',
      accessory: 'badge',
    },
    defaultZone: 'lounge',
    defaultFloor: 2,
  },
  {
    id: 16,
    name: 'Rendra Dananjaya',
    shortName: 'Rendra Dananjaya',
    role: 'Lead Penetration Tester & Red Team Specialist',
    divisionId: 'devops',
    category: 'sec',
    avatar: '🎯',
    skills: {
      primary: [
        'Lead Penetration Testing & Red Team (98%)',
        'Dynamic Application Security Testing (DAST) (97%)',
        'OWASP Top 10 Exploitation & Defense (98%)',
        'Parameter Tampering & Fuzzing (97%)',
      ],
      stack: [
        'Burp Suite Professional',
        'OWASP ZAP',
        'SQLmap',
        'Nmap',
        'ffuf / Gobuster',
        'Semgrep SAST',
      ],
    },
    methodology: [
      'OWASP Testing Guide (OTG v4)',
      'PTES Penetration Testing Standard',
      'Defensive Coding Guidelines',
    ],
    certifications: [
      'Offensive Security Certified Professional (OSCP)',
      'Certified Ethical Hacker (CEH Master)',
      'CRTP (Red Team)',
    ],
    avatarStyle: {
      hair: '#111827',
      skin: '#f5d0b5',
      outfit: '#991b1b',
      hairStyle: 'shaved',
      accessory: 'tactical_watch',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 17,
    name: 'Ir. Saskia Wardhani, CISA, CISSP',
    shortName: 'Saskia Wardhani',
    role: 'Principal IT Security & DevSecOps Compliance Lead',
    divisionId: 'devops',
    category: 'sec',
    avatar: '🔒',
    skills: {
      primary: [
        'Principal IT Security & Compliance (99%)',
        'PostgreSQL Row-Level Security (RLS) Audit (98%)',
        'UU PDP No. 27/2022 Compliance (98%)',
        'Content Security Policy (CSP) & Security Headers (97%)',
      ],
      stack: [
        'Supabase RLS Linter',
        'SonarQube Security',
        'Trivy Vulnerability Scanner',
        'SSL Labs',
        'CSP Evaluator',
      ],
    },
    methodology: [
      'Defense in Depth Architecture',
      'Zero Trust Network Architecture (ZTNA)',
      'ISO/IEC 27001 ISMS Standard',
    ],
    certifications: [
      'Certified Information Systems Security Professional (CISSP)',
      'Certified Information Systems Auditor (CISA)',
      'CIPP/A Data Privacy',
    ],
    avatarStyle: {
      hair: '#374151',
      skin: '#fcd5b5',
      outfit: '#7f1d1d',
      glasses: true,
      hairStyle: 'bob',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 18,
    name: 'Hendrawan Wicaksono, M.Kom.',
    shortName: 'Hendra Wicaksono',
    role: 'Principal Frontend Architect & Clean Architecture Lead',
    divisionId: 'engineering',
    category: 'tech',
    avatar: '🏛️',
    skills: {
      primary: [
        'Principal Frontend Architecture (99%)',
        'Clean Architecture Frontend (Ports/Adapters) (98%)',
        'Strict Bundle Budget Guardian (< 250 kB) (99%)',
        'Anti-AI-Slop Design System Enforcement (98%)',
      ],
      stack: [
        'React 19 Core',
        'TypeScript 5 Strict Engine',
        'Rollup / Vite AST Plugins',
        'Oxlint & ESLint AST',
        'Vitest',
      ],
    },
    methodology: [
      'Clean Architecture UI',
      'Dependency Inversion Principle (DIP)',
      'Atomic Design System Tokenization',
    ],
    certifications: [
      'Principal Software Engineer',
      'Meta Senior Frontend Architect',
      'W3C Web Standards Specialist',
    ],
    avatarStyle: {
      hair: '#1f2937',
      skin: '#f5d0b5',
      outfit: '#064e3b',
      glasses: true,
      hairStyle: 'slick',
      accessory: 'lanyard',
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 19,
    name: 'Dr. Ir. Danu Bratawidjaja, Ph.D.',
    shortName: 'Danu Bratawidjaja',
    role: 'Principal Backend Architect & Clean Architecture Lead',
    divisionId: 'engineering',
    category: 'tech',
    avatar: '⚡',
    skills: {
      primary: [
        'Principal Backend Architecture (99%)',
        'Hexagonal Architecture (Ports & Adapters) (99%)',
        'Sub-20ms PostgreSQL Query Tuning (98%)',
        'Idempotent Migration & RLS Shielding (98%)',
      ],
      stack: [
        'Node.js 22 Enterprise',
        'PostgreSQL 15 Enterprise Engine',
        'Supabase PL/pgSQL Engine',
        'PgBouncer',
        'Prisma / Knex',
      ],
    },
    methodology: [
      'Hexagonal Architecture (Alistair Cockburn)',
      'Domain-Driven Design (DDD)',
      'Zero-Downtime Database Migration',
    ],
    certifications: [
      'Principal Backend Architect',
      'Doctor of Philosophy in Distributed Systems (Ph.D.)',
      'AWS Certified Database Specialist',
    ],
    avatarStyle: {
      hair: '#374151',
      skin: '#f5d0b5',
      outfit: '#065f46',
      glasses: true,
      hairStyle: 'slick',
      accessory: 'lanyard',
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 20,
    name: 'Nadia Maharani, S.Ds.',
    shortName: 'Nadia Maharani',
    role: 'Lead UI/UX Product Designer & Design System Specialist',
    divisionId: 'engineering',
    category: 'design',
    avatar: '🎨',
    skills: {
      primary: [
        'Lead UI/UX Product Design (98%)',
        'Figma Design System Tokenization (97%)',
        'WCAG 2.1 AA Accessibility Standards (96%)',
        'Tactile Micro-Interactions & Physics (97%)',
      ],
      stack: [
        'Figma Professional / Variables',
        'Tailwind CSS',
        'Lucide Icons Craft',
        'Framer Motion / CSS Curves',
        'Stark Accessibility',
      ],
    },
    methodology: [
      'Anti-AI-Slop Craftsmanship (1px Crisp Borders)',
      'Design Tokens as Single Source of Truth',
      'Atomic Component Architecture',
    ],
    certifications: [
      'Sarjana Desain (S.Ds.)',
      'Nielsen Norman Group UX Master Certified (NN/g)',
      'Certified Accessibility Specialist (WAS)',
    ],
    avatarStyle: {
      hair: '#4c1d95',
      skin: '#fcd5b5',
      outfit: '#be123c',
      hairStyle: 'bun',
      glasses: true,
    },
    defaultZone: 'workspace',
    defaultFloor: 2,
  },
  {
    id: 21,
    name: 'Dr. Gibran Al-Farabi, Ph.D.',
    shortName: 'Gibran Al-Farabi',
    role: 'Lead AI/ML Engineer & Speech-To-Text Specialist',
    divisionId: 'architecture',
    category: 'tech',
    avatar: '🧠',
    skills: {
      primary: [
        'Lead AI/ML & Audio Model Engineering (98%)',
        'Lightweight Speech-To-Text (STT) Pipeline (97%)',
        'STAR Behavioral Rubric Quantization (96%)',
        'Edge Audio Signal Processing (96%)',
      ],
      stack: [
        'Whisper.wasm',
        'Web Audio API DSP',
        'ONNX Runtime Web',
        'TensorFlow.js',
        'Python NumPy/PyTorch',
      ],
    },
    methodology: [
      'Edge AI Quantization (INT8/4-bit)',
      'STAR Matrix Semantic Scoring',
      'Low-Latency Audio Streaming Pipeline',
    ],
    certifications: [
      'Doctor of Philosophy in Artificial Intelligence (Ph.D.)',
      'TensorFlow Certified Developer',
      'IEEE Audio & Speech Processing Member',
    ],
    avatarStyle: {
      hair: '#1f2937',
      skin: '#f3c8a8',
      outfit: '#5b21b6',
      glasses: true,
      hairStyle: 'beard',
      accessory: 'smartwatch',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 22,
    name: 'Reza Pratama, S.Kom.',
    shortName: 'Reza Pratama',
    role: 'Site Reliability Engineer & Real-Time Observability Lead',
    divisionId: 'devops',
    category: 'ops',
    avatar: '📊',
    skills: {
      primary: [
        'Site Reliability Engineering & Observability (98%)',
        'Prometheus & Grafana Metric Telemetry (97%)',
        'Write-Storm Debounce & Connection Pooling (97%)',
        'SLA 99.99% Reliability Management (98%)',
      ],
      stack: [
        'Prometheus',
        'Grafana Cloud',
        'OpenTelemetry (OTel)',
        'Sentry Error Tracking',
        'PgBouncer Metrics',
        'Vercel Analytics',
      ],
    },
    methodology: [
      'Google SRE Reliability Handbooks',
      'Error Budgets & SLO/SLI Architecture',
      'Chaos Engineering & Self-Healing',
    ],
    certifications: [
      'Google Professional Cloud DevOps Engineer',
      'Certified Prometheus Associate (PCA)',
      'Datadog / Grafana SRE Specialist',
    ],
    avatarStyle: {
      hair: '#18181b',
      skin: '#fed7aa',
      outfit: '#0369a1',
      headphones: true,
      hairStyle: 'short',
    },
    defaultZone: 'workspace',
    defaultFloor: 3,
  },
  {
    id: 23,
    name: 'Maya Safitri, S.Psi., CHRP',
    shortName: 'Maya Safitri',
    role: 'Corporate Recruiter & Talent Acquisition Advocate',
    divisionId: 'lounge',
    category: 'pov',
    avatar: '💼',
    skills: {
      primary: [
        'Enterprise Talent Acquisition Advocacy (97%)',
        'ATS Kanban Pipeline Usability (96%)',
        'Bulk CSV Candidate Ingestion (95%)',
        'Psychometric Radar & Talent Assessment (97%)',
      ],
      stack: [
        'Enterprise Recruiter Portal',
        'ATS Kanban Boards',
        'CSV / Excel Ingestion Engines',
        'Candidate Profile Visualizer',
        'DISC/MBTI Radar',
      ],
    },
    methodology: [
      'Evidence-Based HR Assessment',
      'Competency-Based Interviewing (STAR)',
      'Recruitment Funnel Velocity Optimization',
    ],
    certifications: [
      'Sarjana Psikologi (S.Psi.)',
      'Certified Human Resource Professional (CHRP)',
      'Licensed Psychometrics Administrator',
    ],
    avatarStyle: {
      hair: '#1f2937',
      skin: '#fcd5b5',
      outfit: '#9d174d',
      hairStyle: 'wavy',
      accessory: 'pearl_necklace',
    },
    defaultZone: 'lounge',
    defaultFloor: 2,
  },
] as const;

export const AGENT_BY_ID: ReadonlyMap<number, AgentProfile> = new Map(
  AGENTS.map((agent) => [agent.id, agent]),
);

export const COLLABORATION_PAIRS: readonly CollaborationPair[] = [
  {
    id: 0,
    initiator: 5,
    target: 18,
    dialogueInitiator:
      'Hendrawan, tolong review struktur Clean Architecture untuk PWA-01 iOS & bundle < 250kB',
    dialogueTarget:
      'Sudah dicek Farel, isolasi Web API dari Core Domain sudah rapi, siap merge!',
    taskDesc: 'Review Clean Architecture PWA-01 iOS bersama FE Principal',
  },
  {
    id: 1,
    initiator: 6,
    target: 20,
    dialogueInitiator:
      'Nadia, token Anti-AI-Slop V2 sudah terpasang di ATS Kanban drag-and-drop',
    dialogueTarget:
      'Keren Bagas! Kontras 1px border dan typography hierarchy-nya sangat clean',
    taskDesc: 'Validasi token visual Anti-AI-Slop V2 di ATS Kanban',
  },
  {
    id: 2,
    initiator: 19,
    target: 4,
    dialogueInitiator:
      'Pak Arka, benchmark idempotency key di RPC Supabase tembus 5.000 ops',
    dialogueTarget:
      'Bagus Danu, pastikan Zero Tech Debt & Hexagonal Ports tetap konsisten',
    taskDesc: 'Verifikasi Idempotency Key Supabase RPC bersama Chief Architect',
  },
  {
    id: 3,
    initiator: 8,
    target: 0,
    dialogueInitiator:
      'Pak Rizco, seluruh 163 test Vitest pass 100% dan zero regression di iOS Safari',
    dialogueTarget:
      'Excellent Qaisar, release gate Sprint 15 resmi di-sign off!',
    taskDesc: 'Pelaporan status 163/163 Vitest Pass kepada Team Leader',
  },
  {
    id: 4,
    initiator: 23,
    target: 1,
    dialogueInitiator:
      'Pak Bram, 14 corporate client sudah aktif menguji Recruiter Portal ATS',
    dialogueTarget:
      'Potensial ARR Rp 175jt/bulan, pipeline B2B sangat menjanjikan!',
    taskDesc: 'Diskusi traksi 14 corporate client Recruiter Portal bersama Business Lead',
  },
  {
    id: 5,
    initiator: 9,
    target: 3,
    dialogueInitiator:
      'Satria, stress test 5.000 ops Kraepelin tembus latensi 180ms',
    dialogueTarget:
      'Mantap Pandu, state machine DISC & MBTI sudah stabil di high-load',
    taskDesc: 'Analisis throughput latensi stress test 5.000 ops Kraepelin',
  },
] as const;

export const ECOSYSTEM_SERVICES: readonly ServiceContract[] = [
  {
    id: 'lms-psikotes',
    name: 'LokaTalenta Core LMS Psikotes',
    localPath: '/Users/a2299/Documents/Projects/lms-psikotes',
    githubRepo: 'zixew/lokatalenta',
    githubUrl: 'https://github.com/zixew/lokatalenta',
    apiPort: 4100,
    devUiPort: 4100,
    baseUrl: 'http://localhost:4100',
    healthPath: '/',
  },
  {
    id: 'lokatalenta-event-gateway',
    name: 'LokaTalenta Real-Time Event Gateway',
    localPath: '/Users/a2299/Documents/Projects/lokatalenta-event-gateway',
    githubRepo: 'zixew/lokatalenta-event-gateway',
    githubUrl: 'https://github.com/zixew/lokatalenta-event-gateway',
    apiPort: 4101,
    devUiPort: null,
    baseUrl: 'http://localhost:4101',
    wsUrl: 'ws://localhost:4101/ws',
    sseUrl: 'http://localhost:4101/events/stream',
    healthPath: '/health',
  },
  {
    id: 'lokatalenta-backlog',
    name: 'LokaTalenta Backlog & Grooming',
    localPath: '/Users/a2299/Documents/Projects/lokatalenta-backlog',
    githubRepo: 'zixew/lokatalenta-backlog',
    githubUrl: 'https://github.com/zixew/lokatalenta-backlog',
    apiPort: 4102,
    devUiPort: 4112,
    baseUrl: 'http://localhost:4102',
    devUiUrl: 'http://localhost:4112',
    healthPath: '/api/health',
  },
  {
    id: 'lokatalenta-sprint-planner',
    name: 'LokaTalenta Sprint Planner',
    localPath: '/Users/a2299/Documents/Projects/lokatalenta-sprint-planner',
    githubRepo: 'zixew/lokatalenta-sprint-planner',
    githubUrl: 'https://github.com/zixew/lokatalenta-sprint-planner',
    apiPort: 4103,
    devUiPort: 4113,
    baseUrl: 'http://localhost:4103',
    devUiUrl: 'http://localhost:4113',
    healthPath: '/api/health',
  },
  {
    id: 'lokatalenta-docs',
    name: 'LokaTalenta Documentation Hub',
    localPath: '/Users/a2299/Documents/Projects/lokatalenta-docs',
    githubRepo: 'zixew/lokatalenta-docs',
    githubUrl: 'https://github.com/zixew/lokatalenta-docs',
    apiPort: 4104,
    devUiPort: 4114,
    baseUrl: 'http://localhost:4104',
    devUiUrl: 'http://localhost:4114',
    healthPath: '/api/health',
  },
  {
    id: 'lokatalenta-office-3d',
    name: 'LokaTalenta 3D Office HQ',
    localPath: '/Users/a2299/Documents/Projects/lokatalenta-office-3d',
    githubRepo: 'zixew/lokatalenta-office-3d',
    githubUrl: 'https://github.com/zixew/lokatalenta-office-3d',
    apiPort: 4105,
    devUiPort: 4105,
    baseUrl: 'http://localhost:4105',
    devUiUrl: 'http://localhost:4105',
    healthPath: '/',
  },
] as const;

export const DEFAULT_GATEWAY_URLS = {
  baseUrl: 'http://localhost:4101',
  wsUrl: 'ws://localhost:4101/ws',
  sseUrl: 'http://localhost:4101/events/stream',
  snapshotUrl: 'http://localhost:4101/snapshot',
  eventsUrl: 'http://localhost:4101/events',
  healthUrl: 'http://localhost:4101/health',
} as const;

export interface GatewayEndpoints {
  readonly baseUrl: string;
  readonly wsUrl: string;
  readonly sseUrl: string;
  readonly snapshotUrl: string;
  readonly eventsUrl: string;
  readonly healthUrl: string;
}

export interface EcosystemServiceUrls {
  readonly lmsPsikotes: string;
  readonly eventGateway: string;
  readonly backlog: string;
  readonly sprintPlanner: string;
  readonly docs: string;
  readonly office3d: string;
}

export type EcosystemEnvLike = Readonly<Record<string, string | undefined>>;

function stripTrailingSlashes(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function readDefaultViteEnv(): EcosystemEnvLike {
  const metaEnv = (import.meta as unknown as { env?: EcosystemEnvLike })?.env;
  return metaEnv ?? {};
}

function readDefaultLocationSearch(): string {
  if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
    const loc = (globalThis as { location?: { search?: string } }).location;
    if (loc && typeof loc.search === 'string') {
      return loc.search;
    }
  }
  return '';
}

export function extractGatewayQueryOverride(locationSearch?: string): string | null {
  const rawSearch = locationSearch ?? readDefaultLocationSearch();
  if (!rawSearch) return null;
  try {
    const params = new URLSearchParams(rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch);
    const val = params.get('gateway');
    if (!val) return null;
    const cleaned = stripTrailingSlashes(val);
    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

export function deriveWsUrlFromHttp(httpBaseUrl: string): string {
  const clean = stripTrailingSlashes(httpBaseUrl);
  if (/^wss?:\/\//i.test(clean)) {
    return clean.endsWith('/ws') ? clean : `${clean}/ws`;
  }
  if (/^https:\/\//i.test(clean)) {
    return `${clean.replace(/^https:\/\//i, 'wss://')}/ws`;
  }
  if (/^http:\/\//i.test(clean)) {
    return `${clean.replace(/^http:\/\//i, 'ws://')}/ws`;
  }
  return `ws://${clean}/ws`;
}

export function resolveGatewayEndpoints(
  env?: EcosystemEnvLike,
  locationSearch?: string,
): GatewayEndpoints {
  const effectiveEnv = env ?? readDefaultViteEnv();
  const queryOverride = extractGatewayQueryOverride(locationSearch);

  const envBase = effectiveEnv.VITE_EVENT_GATEWAY_URL
    ? stripTrailingSlashes(effectiveEnv.VITE_EVENT_GATEWAY_URL)
    : DEFAULT_GATEWAY_URLS.baseUrl;

  const baseUrl = queryOverride ?? envBase;

  const wsUrl = queryOverride
    ? deriveWsUrlFromHttp(queryOverride)
    : effectiveEnv.VITE_EVENT_GATEWAY_WS_URL && effectiveEnv.VITE_EVENT_GATEWAY_WS_URL.trim().length > 0
      ? stripTrailingSlashes(effectiveEnv.VITE_EVENT_GATEWAY_WS_URL)
      : deriveWsUrlFromHttp(baseUrl);

  const sseUrl = queryOverride
    ? `${queryOverride}/events/stream`
    : effectiveEnv.VITE_EVENT_GATEWAY_SSE_URL && effectiveEnv.VITE_EVENT_GATEWAY_SSE_URL.trim().length > 0
      ? stripTrailingSlashes(effectiveEnv.VITE_EVENT_GATEWAY_SSE_URL)
      : `${baseUrl}/events/stream`;

  return {
    baseUrl,
    wsUrl,
    sseUrl,
    snapshotUrl: `${baseUrl}/snapshot`,
    eventsUrl: `${baseUrl}/events`,
    healthUrl: `${baseUrl}/health`,
  };
}

export function resolveEcosystemServiceUrls(
  env?: EcosystemEnvLike,
  locationSearch?: string,
): EcosystemServiceUrls {
  const effectiveEnv = env ?? readDefaultViteEnv();
  const gateway = resolveGatewayEndpoints(effectiveEnv, locationSearch);

  const pick = (key: string, fallback: string): string => {
    const val = effectiveEnv[key];
    return val && val.trim().length > 0 ? stripTrailingSlashes(val) : fallback;
  };

  return {
    lmsPsikotes: pick('VITE_LMS_URL', 'http://localhost:4100'),
    eventGateway: gateway.baseUrl,
    backlog: pick('VITE_BACKLOG_URL', 'http://localhost:4112'),
    sprintPlanner: pick('VITE_SPRINT_URL', 'http://localhost:4113'),
    docs: pick('VITE_DOCS_URL', 'http://localhost:4114'),
    office3d: pick('VITE_OFFICE_URL', 'http://localhost:4105'),
  };
}

export const EVENT_SOURCES: readonly EventSource[] = [
  'backlog',
  'sprint-planner',
  'docs',
  'lms-psikotes',
  'github',
  'office-sim',
] as const;

export const EVENT_TYPES: readonly EventType[] = [
  'backlog.updated',
  'sprint.updated',
  'doc.updated',
  'lms.activity',
  'agent.task.completed',
  'github.commit',
  'github.pr',
  'github.issue',
] as const;

export const EVENT_TARGET_ZONES: readonly EventTargetZone[] = [
  'workspace',
  'boardroom',
  'cafeteria',
  'lobby',
  'lounge',
  'gym',
  'musholla',
] as const;

export const EVENT_SEVERITIES: readonly EventSeverity[] = [
  'info',
  'success',
  'warning',
  'alert',
] as const;

const VALID_DIVISIONS = new Set<string>(DIVISIONS.map((d) => d.id));
const VALID_SOURCES = new Set<string>(EVENT_SOURCES);
const VALID_TYPES = new Set<string>(EVENT_TYPES);
const VALID_TARGET_ZONES = new Set<string>(EVENT_TARGET_ZONES);
const VALID_SEVERITIES = new Set<string>(EVENT_SEVERITIES);

export function clampAgentId(rawAgentId: unknown): number {
  const num = typeof rawAgentId === 'number' ? rawAgentId : Number(rawAgentId);
  if (!Number.isFinite(num)) return 0;
  const rounded = Math.trunc(num);
  if (rounded < 0 || rounded > 23) return 0;
  return rounded;
}

export function normalizeGatewayEvent(raw: unknown): NormalizedEvent {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const agentId = clampAgentId(input.agentId);
  const agent = AGENT_BY_ID.get(agentId) ?? AGENTS[0];

  const divisionId: DivisionId =
    typeof input.divisionId === 'string' && VALID_DIVISIONS.has(input.divisionId)
      ? (input.divisionId as DivisionId)
      : agent.divisionId;

  const division = DIVISION_BY_ID[divisionId];

  const source: EventSource =
    typeof input.source === 'string' && VALID_SOURCES.has(input.source)
      ? (input.source as EventSource)
      : 'office-sim';

  const type: EventType =
    typeof input.type === 'string' && VALID_TYPES.has(input.type)
      ? (input.type as EventType)
      : 'agent.task.completed';

  const targetZone: EventTargetZone =
    typeof input.targetZone === 'string' && VALID_TARGET_ZONES.has(input.targetZone)
      ? (input.targetZone as EventTargetZone)
      : division.defaultZone;

  const rawFloor = input.targetFloor;
  const targetFloor: FloorNumber =
    rawFloor === 1 || rawFloor === 2 || rawFloor === 3
      ? rawFloor
      : division.defaultFloor;

  const severity: EventSeverity =
    typeof input.severity === 'string' && VALID_SEVERITIES.has(input.severity)
      ? (input.severity as EventSeverity)
      : 'info';

  const id =
    typeof input.id === 'string' && input.id.trim().length > 0
      ? input.id.trim().slice(0, 128)
      : `evt-${Date.now()}-${agentId}`;

  const timestamp =
    typeof input.timestamp === 'string' && input.timestamp.trim().length > 0
      ? input.timestamp.trim()
      : new Date().toISOString();

  const entityId =
    typeof input.entityId === 'string' && input.entityId.length > 0
      ? input.entityId.slice(0, 128)
      : null;

  const title =
    typeof input.title === 'string' && input.title.trim().length > 0
      ? input.title.trim().slice(0, 160)
      : `${agent.shortName} • ${type}`;

  const summary =
    typeof input.summary === 'string' && input.summary.trim().length > 0
      ? input.summary.trim().slice(0, 500)
      : `${agent.name} aktif pada divisi ${division.shortName}`;

  const metadata =
    input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
      ? (input.metadata as Record<string, unknown>)
      : {};

  return {
    id,
    timestamp,
    source,
    type,
    divisionId,
    agentId,
    entityId,
    title,
    summary,
    targetZone,
    targetFloor,
    severity,
    metadata,
  };
}

export function resolveEventDestination(
  event: Pick<NormalizedEvent, 'targetZone' | 'targetFloor' | 'divisionId' | 'agentId' | 'metadata'>,
): ResolvedEventDestination {
  const agent = AGENT_BY_ID.get(clampAgentId(event.agentId)) ?? AGENTS[0];
  const divisionId: DivisionId = VALID_DIVISIONS.has(event.divisionId)
    ? event.divisionId
    : agent.divisionId;
  const division = DIVISION_BY_ID[divisionId];
  const roomId = typeof event.metadata?.roomId === 'string' ? event.metadata.roomId : '';

  switch (event.targetZone) {
    case 'workspace': {
      const zone: ZoneId = divisionId === 'lounge' ? 'lounge' : divisionId;
      return {
        zone,
        floor: division.defaultFloor,
        activity: 'working',
      };
    }
    case 'boardroom': {
      if (roomId === 'executive' || (event.targetFloor === 3 && divisionId === 'executive')) {
        return {
          zone: 'executive',
          floor: 3,
          activity: 'meeting',
        };
      }
      return {
        zone: 'meeting-rooms',
        floor: 2,
        activity: 'meeting',
      };
    }
    case 'lounge': {
      if (
        roomId === 'relaxation' ||
        (event.targetFloor === 3 && divisionId !== 'lounge')
      ) {
        return {
          zone: 'relaxation',
          floor: 3,
          activity: 'lounging',
        };
      }
      return {
        zone: 'lounge',
        floor: 2,
        activity: divisionId === 'lounge' ? 'working' : 'lounging',
      };
    }
    case 'cafeteria':
      return { zone: 'cafeteria', floor: 1, activity: 'dining' };
    case 'musholla':
      return { zone: 'musholla', floor: 1, activity: 'praying' };
    case 'lobby':
      return { zone: 'lobby', floor: 1, activity: 'walking' };
    case 'gym':
      return { zone: 'gym', floor: 3, activity: 'gym_workout' };
    default: {
      const fallbackZone: ZoneId = divisionId === 'lounge' ? 'lounge' : divisionId;
      return {
        zone: fallbackZone,
        floor: division.defaultFloor,
        activity: 'working',
      };
    }
  }
}

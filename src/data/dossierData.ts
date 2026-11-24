import { AGENTS } from './contracts.ts';
import type {
  AgentActivityState,
  AgentDossierData,
  AgentProfile,
  DivisionId,
  DivisionTargetItem,
  ZoneId,
} from '../types/office.ts';

export const TOUR_DELAY_MS = 60000 as const;

export const DIVISION_TARGETS: Record<DivisionId, readonly DivisionTargetItem[]> = {
  executive: [
    {
      code: 'GATE-01',
      text: 'Otorisasi Dokumen & Release Sign-Off (Rizco Renova)',
      status: 'APPROVED',
    },
    {
      code: 'FREE-01',
      text: 'Akses Gratis 100% Tanpa Paywall & Adopsi Komunitas (Bram)',
      status: 'ACTIVE',
    },
    {
      code: 'PRD-15',
      text: 'Finalisasi PRD ATS Kanban & PWA-01 iOS (Pranadipa)',
      status: 'LOCKED',
    },
    {
      code: 'SA-05',
      text: 'State Machine Scoring Psikometri DISC & MBTI (Satria)',
      status: 'IN_PROGRESS',
    },
  ],
  architecture: [
    {
      code: 'ARCH-04',
      text: 'Hexagonal Ports & Adapters Architecture (Ir. Arkananta)',
      status: 'ACTIVE',
    },
    {
      code: 'CODE-BE',
      text: 'Review Core Domain & RPC Idempotency (Dr. Danu)',
      status: 'APPROVED',
    },
    {
      code: 'AI-15A',
      text: 'Lightweight STT Speech & STAR NLP Model (Dr. Gibran)',
      status: 'IN_PROGRESS',
    },
    {
      code: 'EDGE-01',
      text: 'Supabase Edge Functions Serverless Runtime (Deno)',
      status: 'PLANNED',
    },
  ],
  engineering: [
    {
      code: 'CODE-FE',
      text: 'Clean Architecture FE Review Hendrawan (Bundle < 250kB)',
      status: 'APPROVED',
    },
    {
      code: 'PWA-01',
      text: 'iOS Standalone PWA & Safe Area Insets (Farel)',
      status: 'IN_PROGRESS',
    },
    {
      code: 'REC-06',
      text: 'ATS Kanban Pipeline & Drag-and-Drop (Farel/Bagas)',
      status: 'ACTIVE',
    },
    {
      code: 'DES-01',
      text: 'Anti-AI-Slop Design System Token V2 (Nadia Maharani)',
      status: 'VERIFIED',
    },
  ],
  qa: [
    {
      code: 'AUTO-15',
      text: '163/163 Vitest Pass 100% & Playwright E2E (Qaisar)',
      status: 'VERIFIED',
    },
    {
      code: 'QA-125',
      text: 'Matriks Uji 125 Kasus Uji ATS Kanban & PWA (Qonita)',
      status: 'ACTIVE',
    },
    {
      code: 'PERF-03',
      text: 'Stress 5.000 Ops < 250ms & Memory Budget (Pandu)',
      status: 'VERIFIED',
    },
    {
      code: 'REG-112',
      text: '112/112 Matriks Regresi Lintas Browser (Raditya)',
      status: 'VERIFIED',
    },
  ],
  devops: [
    {
      code: 'SEC-DAST',
      text: 'DAST BurpSuite Zero High Vulnerability (Rendra)',
      status: 'VERIFIED',
    },
    {
      code: 'PDP-27',
      text: 'Audit UU PDP No. 27/2022 Data Privacy (Saskia)',
      status: 'COMPLIANT',
    },
    {
      code: 'CI-CD',
      text: 'Automated Deploy Vercel dev/main & Healthcheck (Deva)',
      status: 'ACTIVE',
    },
    {
      code: 'SRE-SLA',
      text: 'High Availability Pool & SLA 99.98% (Reza Pratama)',
      status: 'ACTIVE',
    },
  ],
  lounge: [
    {
      code: 'UX-KRP',
      text: 'UI-15A Mobile Kraepelin Ergonomics (Surya Dimas)',
      status: 'ACTIVE',
    },
    {
      code: 'REC-ATS',
      text: 'Candidate 5D Radar Matrix Comparison (Maya Safitri)',
      status: 'ACTIVE',
    },
    {
      code: 'TCH-RUB',
      text: 'Rubrik Penilaian Tugas Cohort (Ibu Triastuti)',
      status: 'VERIFIED',
    },
    {
      code: 'ADM-GOV',
      text: 'Multi-Tenant Governance Console (Agung Santoso)',
      status: 'ACTIVE',
    },
  ],
} as const;

export const AGENT_DOSSIER_DATA: Record<number, AgentDossierData> = {
  0: {
    workload: 98,
    status: {
      label: 'Release Checker & Final Gatekeeper',
      tone: 'emerald',
      action:
        'Bertugas sebagai approval dan checker formal dari setiap dokumen (PRD, TRD, 112 Matriks QA, Laporan SIT/UAT, User Sign-Off) sebelum memberikan otorisasi rilis ke DevOps.',
      ticket: 'GATE-01 / LEAD-APPROVAL',
      file: 'AGENTS.md & docs/planning/04_BRANCHING_AND_RELEASE_STRATEGY.md',
      collaborators:
        'Damar Deva Gunawan (DevOps Lead), Hendrawan Wicaksono (Principal FE), Dr. Ir. Danu Bratawidjaja (Principal BE)',
      cleanArchReview:
        'Verifikasi kepatuhan SDLC komprehensif, kepatuhan bundle < 250 kB, dan otorisasi formal rilis tertulis.',
      opinion:
        'Disiplin SDLC dan ketertelusuran dokumen adalah fondasi integritas rilis. DevOps dilarang deploy tanpa otorisasi sign-off tertulis resmi dari Team Leader.',
      ac: [
        'Seluruh dokumen PRD, TRD, dan Release Notes telah diaudit dan konsisten 100%',
        'Matriks QA 112 skenario berstatus PASS tanpa kendala regresi atau celah keamanan',
        'Sesi demo interaktif pasca-UAT kepada user telah selesai dan User Sign-Off telah terbit',
        'Otorisasi formal Team Leader (LEAD-RELEASE-APPROVAL) diterbitkan ke DevOps sebelum rilis',
      ],
      codeSnippet: `// Team Leader Release Sign-Off Gatekeeper (Rizco Renova)
export interface ReleaseGovernanceSignOff {
  teamLeader: 'Rizco Renova';
  role: 'Engineering Team Lead & Release Checker';
  auditedArtifacts: {
    prdAndTrdSigned: boolean;
    qaMatrix112PassRate: 100;
    antiAiSlopCraftVerified: boolean;
    bundleBudgetUnder250kB: boolean;
    userAcceptanceDemoSigned: boolean;
  };
  devOpsDeployAuthorization: 'APPROVED_FOR_RELEASE_BRANCH';
  authorizedDevOpsLead: 'Damar Deva Gunawan';
  timestamp: string;
}`,
    },
    screen: {
      file: 'GATE_CHECK.ts',
      badge: 'LEAD SIGN-OFF',
      lines: [
        '// GATE_CHECK: RELEASE v3.1.0-rc1',
        '✔ PRD / TRD / 112 QA TESTS: PASS 100%',
        '✔ CLEAN ARCHITECTURE REVIEW: APPROVED',
        '✔ PWA-01 iOS STANDALONE: REGISTERED',
        '★ LEAD SIGN-OFF: RIZCO-AUTH-20261124',
        '➔ STATUS: AUTHORIZED FOR DEVOPS DEPLOY',
      ],
    },
  },
  1: {
    workload: 92,
    status: {
      label: 'Free-Access Growth Active',
      tone: 'emerald',
      action:
        'Mengawal adopsi gratis 100% tanpa paywall untuk kandidat, pendidik, dan Recruiter Portal, serta tata kelola kuota terbuka (fair-use) & kemitraan komunitas (FREE-01).',
      ticket: 'BL-42 / FREE-01',
      file: 'docs/BACKLOG_AND_ROADMAP_ANALYSIS.md',
      collaborators:
        'Pranadipa Wicaksana (Product Owner), Maya Safitri (Recruiter POV)',
      cleanArchReview:
        'Pemisahan domain community onboarding & fair-use quota dari core assessment engine; nol gerbang pembayaran atau paywall.',
      opinion:
        'HR enterprise dan komunitas membutuhkan akses terbuka yang bersih, tegas, dan padat informasi tanpa dekorasi gradien ungu murahan maupun paywall.',
      ac: [
        'Seluruh fitur asesmen, Radar 5D, dan Kraepelin 100% gratis tanpa paywall',
        'Kalkulasi dampak adopsi komunitas berbasis Radar 5D & Kraepelin terdokumentasi',
        'Keselarasan onboarding organisasi terbuka dengan regulasi mitra BUMN & kampus',
      ],
      codeSnippet: `// Open-Access Community & Fair-Use Quota Architecture (100% Free)
export const FREE_ACCESS_QUOTAS = {
  COMMUNITY: { invites: 50, priceIdr: 0, radar5D: true, kraepelin: true },
  CAMPUS:    { invites: 200, priceIdr: 0, customBranding: true, csvExport: true },
  PARTNER:   { invites: 1000, priceIdr: 0, dedicatedSLA: true, atsSync: true }
};`,
    },
    screen: {
      file: 'COMMUNITY_GROWTH.ts',
      badge: 'OPEN ADOPTION METRICS',
      lines: [
        '// COMMUNITY_ADOPTION_METRICS.ts',
        '* Partner Orgs: 14 Community & BUMN Active',
        '* Access Policy: 100% Free (Zero Paywall)',
        '* Candidate Sourcing Reach: +185% YoY',
        '* Fair-Use Quota: Multi-Tenant Active',
        '➔ Active Learners: 12.500+ Monthly Free',
      ],
    },
  },
  2: {
    workload: 94,
    status: {
      label: 'Sprint 15 Backlog Locked (57 SP)',
      tone: 'blue',
      action:
        'Memimpin perumusan Backlog Sprint 15 (Total 57 SP), menyetujui tiket PWA-01 iOS Standalone, pipeline ATS Kanban REC-06, serta mitigasi utang teknis DEBT-01 s/d DEBT-10.',
      ticket: 'PRD-15 / PWA-01',
      file: 'docs/planning/01_USER_STORIES_AND_PRD.md',
      collaborators:
        'Satria Adhyasta (Lead SA), Farel Faza (FE Lead), Nadia Maharani (UI/UX)',
      cleanArchReview:
        'Memastikan semua User Story memuat kriteria penerimaan terukur dan prasyarat test case QA sebelum sprint start.',
      opinion:
        'Kekuatan utama LokaTalenta adalah kepraktisan nyata dan efisiensi pengguna. Setiap klik harus bernilai edukatif dan objektif.',
      ac: [
        'Seluruh acceptance criteria BL-42 s.d. BL-46 terverifikasi lengkap',
        'Tiket PWA-01 iOS Standalone terdaftar resmi di master backlog Sprint 15',
        'Sprint Backlog v3.1.0 dikunci bersama Team Leader Rizco Renova',
      ],
      codeSnippet: `// Sprint 15 Backlog Definition
export const SPRINT_15_BACKLOG = {
  version: '3.1.0-minor',
  totalStoryPoints: 57,
  epicTheme: 'Enterprise ATS & iOS Standalone PWA',
  items: ['FIX-01', 'FIX-02', 'REC-06', 'PWA-01', 'ARC-05', 'UI-15A']
};`,
    },
    screen: {
      file: 'PRD_SPRINT_15.md',
      badge: 'EPIC 9 LOCKED',
      lines: [
        '// PRD_SPRINT_15.md • EPIC 9',
        '* REC-06: ATS Kanban Pipeline (8 SP)',
        '* PWA-01: iOS Safari Standalone (5 SP)',
        '* FIX-01/02: RPC PL/pgSQL Patches (5 SP)',
        '* ARC-05: Pluggable DISC/MBTI (8 SP)',
        '➔ Total Sprint Capacity: 57 SP (Locked)',
      ],
    },
  },
  3: {
    workload: 91,
    status: {
      label: 'DISC/MBTI State Machine Modeling',
      tone: 'purple',
      action:
        'Merancang sequence diagram dan state machine penilaian psikotes ipsatif Most/Least (DISC 24 butir) dan biner dikotomi (MBTI 16 tipe) untuk tiket ARC-05.',
      ticket: 'ARC-05 / SA-05',
      file: 'docs/planning/03_FINAL_SPRINT_BACKLOG_MINOR_TO_MAJOR.md',
      collaborators:
        'Ir. Arkananta (Chief Architect), Bagas Bimo (BE), Hendrawan (Principal FE)',
      cleanArchReview:
        'Memisahkan mesin kalkulasi norma psikometri ke domain core murni bebas dependensi framework atau database.',
      opinion:
        'Pemisahan domain kandidat umum vs kandidat undangan khusus korporat harus rigid dan terenkripsi aman di tingkat protokol.',
      ac: [
        'Format token invite: INV-[6 char alphanumeric] terenkripsi aman',
        'State machine Most/Least DISC memvalidasi 1 pilihan per kutub',
        'Algoritma transformasi skor mentah ke skor standar T-Score terverifikasi',
      ],
      codeSnippet: `// Psychometric Strategy State Machine
export interface PsychometricEngine {
  calculateDisc(answers: DiscAnswer[]): { D: number; I: number; S: number; C: number };
  calculateMbti(answers: MbtiAnswer[]): { type: string; dimensions: Record<string, number> };
}`,
    },
    screen: {
      file: 'Psychometrics.ts',
      badge: 'STATE MACHINE',
      lines: [
        '// PsychometricStrategy.ts',
        'export class DiscAssessmentStrategy {',
        '  computeMostLeast(answers: DiscInput[]) {',
        '    const raw = { D: 28, I: 24, S: 18, C: 30 };',
        '    return normalizeToTScore(raw);',
        '  }',
        '}',
      ],
    },
  },
  4: {
    workload: 95,
    status: {
      label: 'Hexagonal Ports & Adapters Isolation',
      tone: 'purple',
      action:
        'Menyusun blueprint arsitektur heksagonal (Hexagonal Architecture) untuk memisahkan domain quiz runner dari SDK cloud Supabase, serta arsitektur Deno Edge Functions.',
      ticket: 'ARC-04 / ARC-07',
      file: 'docs/architecture/HEXAGONAL_ARCHITECTURE_GUIDELINES.md',
      collaborators:
        'Dr. Ir. Danu Bratawidjaja (Principal BE), Hendrawan (Principal FE)',
      cleanArchReview:
        'Ports & Adapters pattern: Domain logic dilarang mengimpor library eksternal (zero 3rd party deps di domain).',
      opinion:
        'Skalabilitas arsitektur bergantung pada query terindeks rapi dan minimnya join kompleks pada operasi kritis seperti kuis real-time.',
      ac: [
        'Domain kuis terisolasi di folder client/src/core/domain/',
        'Inbound port dan outbound adapter terdefinisi menggunakan TypeScript interface murni',
        'Latensi eksekusi query verifikasi token di bawah 20 milidetik',
      ],
      codeSnippet: `// Hexagonal Architecture Ports & Adapters
export interface QuizRepositoryPort {
  saveAttempt(attempt: QuizAttemptEntity): Promise<void>;
  fetchQuestions(quizId: string): Promise<QuestionEntity[]>;
}`,
    },
    screen: {
      file: 'Hexagonal.arch',
      badge: 'PORTS & ADAPTERS',
      lines: [
        '// HexagonalPortsAdapters.ts',
        '[Domain Core] ➔ QuizScoringEngine',
        '[Inbound Port] ➔ AssessmentUseCase',
        '[Outbound Adapter] ➔ SupabaseRepository',
        '[Latency Target] 18ms (Target < 20ms)',
        '➔ DDL Idempotency: Verified across nodes',
      ],
    },
  },
  5: {
    workload: 97,
    status: {
      label: 'iOS Standalone PWA & ATS Kanban',
      tone: 'emerald',
      action:
        'Mengimplementasikan dukungan Standalone PWA untuk iPhone (PWA-01) dengan Safe Area insets, modal panduan A2HS Safari, serta drag-and-drop HTML5 native pada ATS Kanban.',
      ticket: 'PWA-01 / REC-06',
      file: 'client/src/features/pwa/IosPwaInstallPrompt.tsx & RecruiterPortalPage.tsx',
      collaborators:
        'Hendrawan Wicaksono (Principal FE), Nadia Maharani (UI/UX), Bagas Bimo (BE)',
      cleanArchReview:
        'Memisahkan view layer dari custom hooks (useIosPwa, useAtsPipeline); memastikan bundle chunk tetap < 250 kB.',
      opinion:
        'Pengguna iPhone layak menikmati pengalaman fullscreen tanpa terganggu bilah peramban Safari. Standar 1px border dan mikro-interaksi taktil adalah kunci kenyamanan.',
      ac: [
        'Meta tag apple-mobile-web-app-capable & safe area CSS terpasang di index.html',
        'Modal panduan visual Add to Home Screen muncul bagi pengguna Safari iOS',
        'Papan ATS Kanban mendukung drag-and-drop kartu pelamar dengan update status seketika',
        'Seluruh bundle JS chunk tetap berada di bawah batas ketat 250 kB',
      ],
      codeSnippet: `// iOS Safari Standalone PWA Guidance Modal
export const IosPwaInstallPrompt: React.FC = () => {
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = (navigator as any).standalone === true;
  if (!isIos || isStandalone) return null;
  return (
    <div className="fixed bottom-4 inset-x-4 glass-card p-4 rounded-xl border border-teal-500/40">
      <p className="text-xs text-white">Pasang LokaTalenta: Ketuk <strong>Bagikan</strong> lalu pilih <strong>Tambahkan ke Layar Utama</strong>.</p>
    </div>
  );
};`,
    },
    screen: {
      file: 'IosPwaInstall.tsx',
      badge: 'PWA-01 CODE',
      lines: [
        '// IosPwaInstallPrompt.tsx (PWA-01)',
        'export const IosPwaModal = () => {',
        '  const isStandalone = navigator.standalone;',
        '  return (',
        "    <div className='safe-area-pt'>",
        '      <p>Ketuk Bagikan ➔ Tambah ke Layar Utama</p>',
        '    </div>',
        '  );',
        '};',
      ],
    },
  },
  6: {
    workload: 93,
    status: {
      label: 'RPC Patch FIX-01 & FIX-02 Deployed',
      tone: 'emerald',
      action:
        'Menyelesaikan patch PL/pgSQL submit_quiz_attempt untuk penilaian short_answer otomatis (FIX-01) dan penyimpanan telemetri tab_switch_count di Supabase cloud (FIX-02).',
      ticket: 'FIX-01 / FIX-02',
      file: 'supabase/migrations/20261125210000_sprint15_rpc_telemetry_patch.sql',
      collaborators:
        'Dr. Ir. Danu Bratawidjaja (Principal BE), Farel Faza (FE), Qonita (QA)',
      cleanArchReview:
        'Fungsi database bersifat idempotent, mengeksekusi normalisasi regex spasi aman, dan dilengkapi RLS tenant check.',
      opinion:
        'Data integritas ujian tidak boleh hanya mengandalkan client localStorage; cloud database harus menjadi otoritas tunggal kebenaran telemetri.',
      ac: [
        'Jawaban isian singkat dinilai 100% pada database cloud Supabase dengan regex normalizer',
        'Telemetri kecurangan pindah tab tersimpan permanen di tabel quiz_attempts',
        'Waktu eksekusi RPC submit_quiz_attempt tetap di bawah 45ms pada uji beban',
      ],
      codeSnippet: `CREATE OR REPLACE FUNCTION submit_quiz_attempt(
  p_attempt_id UUID,
  p_tab_switch_count INT DEFAULT 0,
  p_focus_loss_events JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.quiz_attempts
  SET tab_switch_count = p_tab_switch_count,
      status = 'submitted',
      submitted_at = now()
  WHERE id = p_attempt_id;
  RETURN jsonb_build_object('success', true);
END;
$$;`,
    },
    screen: {
      file: 'submit_quiz.sql',
      badge: 'SQL PATCH FIX',
      lines: [
        '-- submit_quiz_attempt.sql (FIX-01/02)',
        'CREATE OR REPLACE FUNCTION submit_quiz_attempt(',
        '  p_attempt_id UUID,',
        '  p_tab_switch_count INT,',
        '  p_focus_loss_events JSONB',
        ') RETURNS JSONB AS $$',
        '  UPDATE public.quiz_attempts SET ...;',
      ],
    },
  },
  7: {
    workload: 90,
    status: {
      label: '125 QA Cases Matrix Verified',
      tone: 'amber',
      action:
        'Menjalankan verifikasi manual ekstensif untuk alur instalasi PWA di iOS Safari, pengerjaan kuis kustom co-branded, dan interaksi drag-and-drop ATS Kanban.',
      ticket: 'QA-125 / PWA-01',
      file: 'docs/qa/QA_TEST_CASES.md',
      collaborators: 'Qaisar Al-Ghaffar (Automation QA), Surya Dimas (Student POV)',
      cleanArchReview:
        'Seluruh kasus uji manual memiliki id unik yang tersinkronisasi 1:1 antara dokumen Markdown dan laporan rilis.',
      opinion:
        'Automated test sangat bagus, namun exploratory testing manusia adalah mata elang yang menemukan kejanggalan visual micro-interaction dan layout clipping.',
      ac: [
        'Kasus uji PWA-01 (iOS Standalone & Safe Area) tervalidasi di Safari iPhone',
        'Matriks QA melacak 125 skenario uji dengan 0 defect kritis',
        'Alur pengajuan banding retake exam (REC-07) terverifikasi fungsional',
      ],
      codeSnippet: `// Manual QA Checklist Matrix
| ID | Fitur | Perangkat | Status |
| PWA-01 | Standalone iOS Safari | iPhone 14 Pro (iOS 17) | PASS |
| REC-06 | ATS Kanban Drag-Drop | macOS Chrome & Safari | PASS |
| KRP-04 | Kraepelin Mobile Dialpad | Android Pixel & iPhone | PASS |`,
    },
    screen: {
      file: 'QA_MATRIX.md',
      badge: '125 TEST CASES',
      lines: [
        '// QA_TEST_CASES.md • SPRINT 15',
        '[PASS] REC-01: Radar 5D Talent Filter',
        '[PASS] REC-02: Co-Branding Invite URL',
        '[PASS] KRP-03: Kraepelin Mobile Dialpad',
        '[ACTIVE] PWA-01: iOS Safari Standalone',
        '➔ Total Verified Scenarios: 125 Active',
      ],
    },
  },
  8: {
    workload: 96,
    status: {
      label: 'Vitest 163/163 PASS & Playwright E2E',
      tone: 'emerald',
      action:
        'Menjaga 163 unit/integration test lulus 100% pada 27 test suite, serta memperluas suite Playwright E2E untuk menguji integrasi ATS pipeline dan auth flow.',
      ticket: 'AUTO-15 / E2E-04',
      file: 'client/src/__tests__/ & client/e2e/recruiterFlow.spec.ts',
      collaborators: 'Pandu Respati (Perf), Raditya Rama (Regression), Bagas Bimo (BE)',
      cleanArchReview:
        'Uji otomatis mengisolasi mock external network, menjamin kecepatan run suite di bawah 2.5 detik pada CI pipeline.',
      opinion:
        'Uji otomatis bukan formalitas, melainkan jaring pengaman utama yang memungkinkan refactoring arsitektur tanpa rasa takut.',
      ac: [
        '163/163 unit test di 27 suite lulus 100% tanpa flakiness',
        'Playwright test menguji alur login rekruter dan navigasi kandidat',
        'Pipeline Vitest terintegrasi otomatis di GitHub Actions CI',
      ],
      codeSnippet: `// Automated Test Suite Execution
$ vitest run
 Test Files  27 passed (27)
      Tests  163 passed (163)
   Duration  1.09s (transform 1.36s, setup 0ms, tests 1.40s)
 All test suites passed successfully.`,
    },
    screen: {
      file: 'VitestRunner.log',
      badge: '163/163 PASS',
      lines: [
        '$ vitest run --reporter=verbose',
        '✓ sprint14RecruiterFeatures (73 tests)',
        '✓ sprint13StressAndSecurity (10 tests)',
        '✓ qaComprehensiveFlows (7 tests)',
        'Test Files: 27 passed (27) [100%]',
        'Tests: 163 passed (163) • Time: 1.09s',
      ],
    },
  },
  9: {
    workload: 92,
    status: {
      label: 'Bundle < 250kB & Latency < 250ms Verified',
      tone: 'emerald',
      action:
        'Mengaudit ukuran chunk bundle JavaScript Vite (< 250 kB limit) dan mengeksekusi benchmark stress testing 5.000 operasi sanitasi dan kalkulasi rumus.',
      ticket: 'PERF-03 / PERF-04',
      file: 'client/src/__tests__/sprint13StressAndSecurity.test.ts',
      collaborators: 'Hendrawan Wicaksono (Principal FE), Farel Faza (FE)',
      cleanArchReview:
        'Memastikan dynamic import (React.lazy) diterapkan di seluruh rute halaman berat (/recruiter, /admin, /teacher).',
      opinion:
        'Aplikasi lambat adalah bug kritis. Setiap milidetik penundaan rendering mengurangi fokus dan kenyamanan peserta ujian psikotes.',
      ac: [
        'Seluruh chunk file build dist/assets/ berada di bawah batas 250 kB',
        'Latensi kalkulasi 5.000 operasi formula kuis di bawah 250 milidetik',
        'Core Web Vitals LCP < 1.2 detik dan CLS = 0 pada perangkat mobile',
      ],
      codeSnippet: `// Bundle Budget & Stress Performance Check
describe('Performance Budget Verification', () => {
  it('guarantees bundle chunks do not exceed 250 kB', () => {
    const mainChunkKb = 27.19;
    expect(mainChunkKb).toBeLessThan(250);
  });
});`,
    },
    screen: {
      file: 'BundleAudit.bench',
      badge: 'LATENCY < 250ms',
      lines: [
        '// PerformanceAudit.bench',
        '* Bundle JS: 27.19 kB (Limit: 250 kB)',
        '* Stress Test: 5,000 Ops < 250ms (PASS)',
        '* Web Vitals: LCP 1.1s | FID 12ms | CLS 0',
        '* Memory Leaks: 0 detected (Heap 32MB)',
        '➔ Status: All Performance Budgets Met',
      ],
    },
  },
  10: {
    workload: 89,
    status: {
      label: '112/112 Regression Matrix Zero Flaw',
      tone: 'emerald',
      action:
        'Menjaga matriks regresi 112 skenario dari Sprint 1 hingga Sprint 14 tetap 100% hijau, memverifikasi ketiadaan efek samping pada fitur lama saat fitur baru diintegrasikan.',
      ticket: 'REG-112',
      file: 'docs/qa/QA_TEST_CASES.md',
      collaborators:
        'Qonita Anindya (Manual QA), Qaisar Al-Ghaffar (Automation QA)',
      cleanArchReview:
        'Memastikan kompatibilitas mundur (backward-compatibility) pada API kontrak lama dan skema database.',
      opinion:
        'Fitur baru tidak ada artinya jika merusak alur kerja lama yang sudah diandalkan ribuan pengguna aktif.',
      ac: [
        '112 skenario regresi berstatus PASS tanpa deviasi',
        'Pengujian kompatibilitas lintas peramban (Chrome, Safari, Firefox, Edge)',
        'Verifikasi navigasi responsif pada resolusi 1280x800 dan 390x844',
      ],
      codeSnippet: `// Regression Gate Matrix Summary
export const REGRESSION_AUDIT_REPORT = {
  sprintsAudited: 'Sprint 1 through Sprint 14',
  totalMatrixScenarios: 112,
  passCount: 112,
  failCount: 0,
  regressionStatus: 'ZERO_REGRESSION_CONFIRMED'
};`,
    },
    screen: {
      file: 'Regression.matrix',
      badge: 'ZERO REGRESSION',
      lines: [
        '// RegressionSuite.matrix',
        '* Sprint 1 - 14 Suites: 112/112 PASS',
        '* Cross-Browser: Chrome, Safari, Firefox',
        '* Mobile Viewport: 390x844 (0 overflow)',
        '* Backward Compatibility: Confirmed',
        '➔ Regression Gate Status: 100% CLEAR',
      ],
    },
  },
  11: {
    workload: 95,
    status: {
      label: 'Automated CI/CD & Vercel Deploy Monitored',
      tone: 'emerald',
      action:
        'Mengelola pipeline CI/CD GitHub Actions, Vercel staging & production deploy, monitoring healthcheck, serta perbaikan konfigurasi Permissions-Policy (DEBT-04).',
      ticket: 'OPS-04 / DEBT-04',
      file: 'client/vercel.json & .github/workflows/deploy.yml',
      collaborators:
        'Rizco Renova (Team Lead), Reza Pratama (SRE), Ir. Saskia Wardhani (Security)',
      cleanArchReview:
        'Zero-downtime deployment, sanitasi environment variable, dan proteksi branch dev/main dengan mandatory PR check.',
      opinion:
        'DevOps bukan hanya menekan tombol deploy; ini tentang otomasi andal yang membuat seluruh tim dapat merilis kode dengan tenang.',
      ac: [
        'Pipeline GitHub Actions lint, test, build tereksekusi otomatis pada setiap push',
        'Header Permissions-Policy mengizinkan kamera dan mikrofon (camera=(self))',
        'Deploy Vercel branch dev dan main berstatus 200 OK tanpa error',
      ],
      codeSnippet: `// Vercel Security & Permissions Configuration
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(self)" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" }
      ]
    }
  ]
}`,
    },
    screen: {
      file: 'VercelDeploy.sh',
      badge: 'PROD 200 OK',
      lines: [
        '$ vercel deploy --prod --skip-domain',
        '✔ Building client bundle (< 250 kB)',
        '✔ Deploying to lokatalenta.vercel.app',
        '✔ Permissions-Policy: camera=(self)',
        '✔ Healthcheck: HTTP 200 OK (Latency 48ms)',
        '➔ CI/CD Status: Production Live & Stable',
      ],
    },
  },
  12: {
    workload: 88,
    status: {
      label: 'Single Source of Truth Docs Synchronized',
      tone: 'blue',
      action:
        'Menyelaraskan seluruh dokumen perencanaan (PRD, TRD, Sprint Backlog Minor to Major, dan QA Test Cases) sebagai Single Source of Truth bagi 24 personel tim.',
      ticket: 'DOCS-15',
      file: 'docs/planning/03_FINAL_SPRINT_BACKLOG_MINOR_TO_MAJOR.md',
      collaborators:
        'Rizco Renova (Team Lead), Pranadipa (PO), Satria Adhyasta (SA)',
      cleanArchReview:
        'Memastikan sinkronisasi terminologi, id backlog, kriteria penerimaan, dan diagram arsitektur di seluruh artefak Markdown.',
      opinion:
        'Dokumentasi yang presisi menghindarkan tim dari salah paham desain dan mempercepat onboarding anggota tim baru secara eksponensial.',
      ac: [
        'Dokumen backlog Sprint 15 memuat 57 SP dengan deskripsi tugas lengkap',
        'Spesifikasi PWA-01 dan Safe Area tercantum rapi di TRD dan PRD',
        'Laporan retrospektif Sprint 14 dan kickoff Sprint 15 tersimpan permanen',
      ],
      codeSnippet: `// Documentation Single Source of Truth Integrity
export const DOCS_REGISTRY = {
  prd: 'docs/planning/01_USER_STORIES_AND_PRD.md',
  trd: 'docs/planning/02_TRD_TECHNICAL_REQUIREMENTS.md',
  backlog: 'docs/planning/03_FINAL_SPRINT_BACKLOG_MINOR_TO_MAJOR.md',
  qaMatrix: 'docs/qa/QA_TEST_CASES.md'
};`,
    },
    screen: {
      file: 'DOCS_SYNC.md',
      badge: 'SSOT VERIFIED',
      lines: [
        '// 03_FINAL_SPRINT_BACKLOG.md',
        '# SPRINT 15 ACTIVE BACKLOG (57 SP)',
        '* PWA-01: iOS Standalone Support',
        '* REC-06: ATS Kanban Pipeline',
        '* Single Source of Truth: Synchronized',
        '➔ Lead Sign-Off: RIZCO-LEAD-AUTH-20261124',
      ],
    },
  },
  13: {
    workload: 86,
    status: {
      label: 'Mobile Ergonomics & PWA Review',
      tone: 'rose',
      action:
        'Menguji kenyamanan pengguna pada pengerjaan tes Kraepelin ponsel (UI-15A) dan memverifikasi pengalaman instalasi standalone PWA di iPhone tanpa membuka browser.',
      ticket: 'UI-15A / PWA-01',
      file: 'client/src/features/kraepelin/KraepelinPage.tsx',
      collaborators: 'Farel Faza (FE), Nadia Maharani (UI/UX)',
      cleanArchReview:
        'Memastikan touch target tombol angka dialpad >= 48px dan 0 lag input saat pengetikan berkecepatan tinggi.',
      opinion:
        'Sebagai kandidat, saya ingin ujian berjalan lancar di ponsel saya tanpa gangguan address bar Safari yang naik turun atau layout yang terpotong notch.',
      ac: [
        'Keypad 3x4 fixed di ponsel tidak memicu zoom atau scroll viewport (h-dvh)',
        'Aplikasi dapat dibuka langsung dari ikon Home Screen iPhone secara mandiri',
        'Co-branding badge perusahaan mitra tampil membanggakan di header ujian',
      ],
      codeSnippet: `// Candidate Mobile Viewport Locking
<div className="h-dvh w-screen overflow-hidden flex flex-col justify-between safe-area-pb">
  <ExamHeader title="Simulasi Kraepelin" />
  <KraepelinColumn activePair={currentPair} />
  <FixedTelephoneNumpad onInput={handleInput} />
</div>`,
    },
    screen: {
      file: 'CandidateExam.ui',
      badge: 'MOBILE KRAEPELIN',
      lines: [
        '// CandidateExamView.mobile',
        '* Viewport: h-dvh overflow-hidden',
        '* Dialpad 3x4: Active (0 latency delay)',
        '* iOS Standalone: Fullscreen without bar',
        '* Network Retry: Auto-buffered queue',
        '➔ Touch Targets: >= 48px Ergonomic',
      ],
    },
  },
  14: {
    workload: 87,
    status: {
      label: 'Curriculum & Rubric Aligned',
      tone: 'rose',
      action:
        'Menyelaraskan rubrik penilaian tugas kursus, soal kuis essay berskor otomatis, dan materi bank soal agar relevan dengan standar asesmen kompetensi industri.',
      ticket: 'POV-TCH-02',
      file: 'client/src/features/teacher/TeacherStudioPage.tsx',
      collaborators: 'Satria Adhyasta (SA), Bagas Bimo (BE)',
      cleanArchReview:
        'Memastikan isolasi data antar pengajar (mentor hanya dapat mengedit dan melihat progres cohort kelas miliknya).',
      opinion:
        'Pendidikan yang berdampak menghubungkan kurikulum akademik dengan keterampilan riil yang dicari oleh industri modern.',
      ac: [
        'Bank soal mendukung penilaian isian singkat dengan normalisasi spasi',
        'Mentor dapat menduplikasi paket kursus ke draft independen',
        'Rubrik penilaian STAR terpetakan pada kriteria kompetensi kerja',
      ],
      codeSnippet: `// Teacher Cohort Rubric & Item Analysis
export const RUBRIC_CRITERIA = {
  completeness: { weight: 0.4, title: 'Kelengkapan Jawaban' },
  accuracy:     { weight: 0.4, title: 'Ketepatan Logika & Konsep' },
  clarity:      { weight: 0.2, title: 'Kejelasan Penyampaian' }
};`,
    },
    screen: {
      file: 'TeacherCohort.ts',
      badge: 'COHORT STUDIO',
      lines: [
        '// TeacherCohortStudio.ts',
        '* Active Cohorts: 8 Professional Classes',
        '* Essay Grading: Auto-keyword regex (PASS)',
        '* Assignment Submissions: 94% reviewed',
        '* Item Analysis: Difficulty index p=0.72',
        '➔ Mentor Analytics: Real-time Synchronized',
      ],
    },
  },
  15: {
    workload: 90,
    status: {
      label: 'Multi-Tenant Governance Monitored',
      tone: 'purple',
      action:
        'Mengawasi tata kelola platform multi-tenant, audit log aktivitas mutasi admin, ekspor CSV pengguna dengan proteksi formula injection, dan penyiaran broadcast banner.',
      ticket: 'ADM-GOV / BL-44',
      file: 'client/src/features/admin/AdminPanelPage.tsx',
      collaborators: 'Ir. Saskia Wardhani (Security), Damar Deva (DevOps)',
      cleanArchReview:
        'Memastikan seluruh ekspor data CSV disanitasi dengan escape character untuk mencegah CSV formula injection.',
      opinion:
        'Kepercayaan enterprise dibangun di atas transparansi audit log dan ketegasan kontrol hak akses berbasis role.',
      ac: [
        'Audit log merekam mutasi role, pembuatan organisasi, dan pencabutan sertifikat',
        'Ekspor CSV aman dari injeksi formula (=, +, -, @)',
        'System broadcast banner dapat diaktifkan dan dinonaktifkan secara instan',
      ],
      codeSnippet: `// Admin CSV Formula Injection Sanitizer
export function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (/^[=+\\-@\\t\\r]/.test(str)) {
    return \`"'\${str.replace(/"/g, '""')}"\`;
  }
  return \`"\${str.replace(/"/g, '""')}"\`;
}`,
    },
    screen: {
      file: 'AdminAudit.log',
      badge: 'GOVERNANCE CONSOLE',
      lines: [
        '// AdminAuditGovernance.log',
        '* Multi-Tenant Orgs: Telkom, Astra, BCA',
        '* User Roles: 1,420 Students, 48 Mentors',
        '* System Broadcast: Active (v3.0.0 Notice)',
        '* CSV Data Export: Formula Sanitized (PASS)',
        '➔ Audit Log Retention: 90 Days Compliant',
      ],
    },
  },
  16: {
    workload: 94,
    status: {
      label: 'DAST & Sandbox Injection Pass',
      tone: 'emerald',
      action:
        'Mengeksekusi simulasi serangan injeksi DDL/DML, eksploitasi parameter RPC kuis publik (DEBT-07), dan uji bypass autentikasi token undangan rekruter.',
      ticket: 'SEC-DAST / DEBT-07',
      file: 'client/src/__tests__/securityAndPerf.test.ts',
      collaborators: 'Ir. Saskia Wardhani (Security Lead), Bagas Bimo (BE)',
      cleanArchReview:
        'Memvalidasi sanitasi input berbasis parameterized query dan sandbox SQL yang menolak DROP/ALTER/TRUNCATE.',
      opinion:
        'Keamanan bukan fitur pelengkap di akhir sprint; keamanan adalah dinding baja yang menjaga reputasi dan kedaulatan data pengguna.',
      ac: [
        'Query destruktif DDL/DML terblokir 100% pada interactive SQL Lab',
        'XSS payload ternetralisir aman di view layer tanpa eksekusi skrip',
        'RPC publik Supabase menerapkan isolasi tenant kedap kebocoran data',
      ],
      codeSnippet: `// Pentest Automated DAST Verification
describe('Security Vulnerability & DAST Penetration', () => {
  it('blocks DDL injection payloads completely', () => {
    const malicious = "DROP TABLE public.profiles; --";
    expect(isQuerySafe(malicious)).toBe(false);
  });
});`,
    },
    screen: {
      file: 'DAST_Audit.log',
      badge: '0 VULNERABILITIES',
      lines: [
        '// DAST_Security_Audit.log',
        '[+] Target: https://lokatalenta.app',
        '[+] SQLi Sandbox Payload: NEUTRALIZED',
        '[+] DDL Injection (DROP/ALTER): BLOCKED',
        '[+] XSS Script Injections: SANITIZED',
        '[+] High/Critical Vulnerabilities: 0 (PASS)',
      ],
    },
  },
  17: {
    workload: 96,
    status: {
      label: 'UU PDP 27/2022 & RLS Strict Compliant',
      tone: 'emerald',
      action:
        'Memastikan seluruh skema tabel cloud Supabase mematuhi prinsip enkripsi data pribadi sesuai UU Perlindungan Data Pribadi (UU PDP No. 27/2022) dan Row Level Security.',
      ticket: 'SEC-PDP / SEC-RLS',
      file: 'supabase/migrations/ & docs/compliance/UU_PDP_COMPLIANCE_MATRIX.md',
      collaborators:
        'Rizco Renova (Team Lead), Rendra Dananjaya (Pentester), Damar Deva (DevOps)',
      cleanArchReview:
        'Strict Row Level Security: Setiap tabel wajib mengaktifkan RLS dengan policy eksplisit per authenticated user role.',
      opinion:
        'Kepatuhan privasi data adalah hak asasi pengguna. Sistem enterprise sejati tidak boleh memiliki celah kebocoran data sekecil apapun.',
      ac: [
        'Tabel berisi data pribadi (profiles, attempts) memiliki RLS ketat',
        'Log audit mencatat akses data sensitif dengan timestamp terenkripsi',
        'Kebijakan retensi dan pembersihan data kandidat terotomasi (auto-purge)',
      ],
      codeSnippet: `// Row Level Security Enforcement
ALTER TABLE public.recruiter_shortlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recruiters can only view own shortlists"
ON public.recruiter_shortlists FOR ALL
TO authenticated
USING (recruiter_id = auth.uid());`,
    },
    screen: {
      file: 'UU_PDP_Compliance.audit',
      badge: 'PDP COMPLIANT',
      lines: [
        '// UU_PDP_Compliance.dashboard',
        '* UU No. 27/2022 (Data Privacy): COMPLIANT',
        '* Consent Manager: User opt-in logged',
        '* Auto-Purge Retention: 30 days active',
        '* Strict Tenant Isolation: Verified',
        '➔ Security Compliance Status: FULL PASS',
      ],
    },
  },
  18: {
    workload: 95,
    status: {
      label: 'Clean Architecture FE Code Review Approved',
      tone: 'emerald',
      action:
        'Memverifikasi kepatuhan Clean Architecture pada modul frontend: pemisahan view dari state presenter, zero direct Supabase calls di JSX, dan batasan chunk JS < 250 kB.',
      ticket: 'CODE-FE / CLEAN-ARCH',
      file: 'client/src/ & docs/architecture/CLEAN_ARCHITECTURE_FE.md',
      collaborators:
        'Farel Faza (FE Lead), Nadia Maharani (UI/UX), Pandu Respati (Perf)',
      cleanArchReview:
        'Clean Architecture Gate: Komponen UI hanya bertindak sebagai dumb presenter; seluruh mutasi ditangani useCases/hooks.',
      opinion:
        'Kode yang rapi dan terstruktur hexagonal membuat penambahan fitur baru seperti PWA dan ATS Kanban menjadi aman dan minim efek samping.',
      ac: [
        'Komponen UI bebas dari panggilan langsung supabase.from(...)',
        'Struktur folder tertata modular (features/, core/, shared/ui/)',
        'Batas anggaran bundle JS (250 kB) dipatuhi tanpa kompromi',
      ],
      codeSnippet: `// Clean Architecture Gate Review (Hendrawan Wicaksono)
export interface CleanArchitectureFeAudit {
  layerSeparation: 'DUMB_COMPONENTS_VS_HOOKS_VERIFIED';
  directSdkCallsInJsx: 0;
  designSystemTokensApplied: true;
  bundleChunkAudit: 'ALL_CHUNKS_UNDER_250KB';
  reviewSignOff: 'APPROVED';
}`,
    },
    screen: {
      file: 'CleanArchReview.fe',
      badge: 'FE PRINCIPAL OK',
      lines: [
        '// CleanArchitectureReview.fe.ts',
        '✔ View Layer ➔ 0 direct Supabase calls',
        '✔ State Hooks ➔ useQuizRunner() isolated',
        '✔ Bundle Check ➔ chunk size: 27.19 kB',
        '✔ Anti-AI-Slop ➔ 1px crisp borders',
        '[FE PRINCIPAL CODE REVIEW: APPROVED]',
      ],
    },
  },
  19: {
    workload: 96,
    status: {
      label: 'Hexagonal Backend Domain Review Approved',
      tone: 'emerald',
      action:
        'Mengaudit arsitektur backend, idempotency migrasi DDL PL/pgSQL, efisiensi composite index query (< 20ms), dan isolasi domain scoring kuis dari persistence layer.',
      ticket: 'CODE-BE / HEXAGONAL',
      file: 'supabase/migrations/ & docs/architecture/HEXAGONAL_ARCHITECTURE_BE.md',
      collaborators:
        'Bagas Bimo (BE), Ir. Arkananta (Chief Architect), Saskia Wardhani (Security)',
      cleanArchReview:
        'Hexagonal Gate: Domain scoring logic terisolasi murni; transaksi database menerapkan row-locking (FOR UPDATE) pada kuota.',
      opinion:
        'Arsitektur heksagonal membebaskan logika bisnis dari keterikatan database vendor. Kode domain murni dapat diuji terisolasi 100%.',
      ac: [
        'Fungsi scoring kuis tidak memiliki efek samping ke tabel eksternal',
        'Migrasi DDL bersifat idempotent dan lolos uji rollback',
        'Query multi-tenant terisolasi sempurna dengan latensi < 20ms',
      ],
      codeSnippet: `// Hexagonal Backend Review Gate (Dr. Danu Bratawidjaja)
export interface HexagonalBackendAudit {
  domainCorePurity: 'ZERO_EXTERNAL_DEPENDENCY';
  sqlMigrationsIdempotency: 'VERIFIED_SAFE';
  compositeIndexingTarget: '< 20ms';
  reviewSignOff: 'APPROVED';
}`,
    },
    screen: {
      file: 'HexagonalReview.be',
      badge: 'BE PRINCIPAL OK',
      lines: [
        '// HexagonalDomainReview.be.sql',
        '✔ PL/pgSQL Idempotency: Verified safe',
        '✔ Composite Index: (quiz_id, user_id)',
        '✔ RLS Strict Isolation: multi_tenant',
        '✔ Row Locking: FOR UPDATE on quota',
        '[BE PRINCIPAL CODE REVIEW: APPROVED]',
      ],
    },
  },
  20: {
    workload: 93,
    status: {
      label: 'iOS Standalone PWA & Design System V2',
      tone: 'rose',
      action:
        'Menyusun wireframe, rancangan standalone PWA iPhone (Dynamic Island & Safe Area insets), user flow panduan Add to Home Screen Safari, serta panduan Design System token Anti-AI-Slop WCAG 2.1 AA.',
      ticket: 'PWA-01 / DES-01',
      file: 'client/src/shared/ui/ & docs/planning/03_FINAL_SPRINT_BACKLOG_MINOR_TO_MAJOR.md',
      collaborators:
        'Farel Faza (FE Lead), Surya Dimas (Student POV), Hendrawan (Principal FE)',
      cleanArchReview:
        'Konsistensi token desain (border-zinc-200/800, kontras WCAG 2.1 AA minimal 4.5:1, radius kartu proporsional).',
      opinion:
        'Pengguna iPhone layak mendapatkan pengalaman seamless seperti aplikasi native. Tanpa bilah URL Safari, aplikasi terasa fokus, elegan, dan profesional.',
      ac: [
        'Spesifikasi PWA iPhone standalone (apple-mobile-web-app-capable & safe-area-insets) tercatat di backlog PWA-01',
        'User flow instalasi PWA iPhone (Add to Home Screen) di Safari memiliki instruksi visual jelas dan mudah dipahami',
        'Design system token (border-zinc-200/800, high contrast slate) diterapkan konsisten di seluruh modul',
        'Komponen form, tombol aksi, dan tabel data memiliki state hover/active/focus-visible yang tegas',
      ],
      codeSnippet: `// iOS Standalone PWA & Safe Area Design Tokens
export const IOS_PWA_DESIGN = {
  meta: { capable: 'yes', statusBarStyle: 'black-translucent', title: 'LokaTalenta' },
  safeArea: { top: 'env(safe-area-inset-top)', bottom: 'env(safe-area-inset-bottom)' },
  touchIcons: ['/apple-touch-icon-180x180.png', '/apple-touch-icon-152x152.png'],
  a2hsGuidance: { shareIcon: 'ios-share-sheet', actionText: 'Tambahkan ke Layar Utama' }
};`,
    },
    screen: {
      file: 'DESIGN_SYSTEM.fig',
      badge: 'FIGMA TOKEN V2',
      lines: [
        '// DESIGN_SYSTEM_V2.figma',
        '* Frame: iOS Standalone Viewport (390x844)',
        '* Safe Area: Dynamic Island top padding',
        '* Anti-AI-Slop: 1px contrast border',
        '* Accessibility: WCAG 2.1 AA (4.5:1)',
        '➔ Tokens: Fully Synchronized to Tailwind',
      ],
    },
  },
  21: {
    workload: 95,
    status: {
      label: 'Speech-To-Text & STAR Model Pipeline',
      tone: 'purple',
      action:
        'Merancang pipeline Speech-To-Text (STT) ringan, kuantisasi model audio wawancara kandidat, dan evaluasi rubrik STAR (Situation, Task, Action, Result) berbasis AI dengan target latensi rendah.',
      ticket: 'AI-15A / STT-PIPELINE',
      file: 'client/src/features/player/StarInterviewLab.tsx & docs/planning/02_TRD_TECHNICAL_REQUIREMENTS.md',
      collaborators:
        'Ir. Arkananta (Chief Architect), Satria Adhyasta (SA), Farel Faza (FE)',
      cleanArchReview:
        'Inferensi model AI dijalankan via WebAssembly atau streaming asinkron; bundle utama tetap di bawah 250 kB.',
      opinion:
        'Model AI pada aplikasi web tidak boleh membebani browser pengguna. Inferensi berat harus di-stream secara asinkron atau menggunakan lightweight WebAssembly model yang hemat memori.',
      ac: [
        'Pipeline audio STT mampu mentranskripsikan ucapan bahasa Indonesia dengan Word Error Rate (WER) < 12%',
        'Evaluasi rubrik STAR menghasilkan skor kuantitatif 1-5 beserta umpan balik kalimat spesifik',
        'Ukuran chunk komputasi AI di browser tidak melebihi anggaran bundle 250 kB (menggunakan lazy streaming)',
        'Deteksi jeda bicara (voice activity detection / VAD) berfungsi akurat tanpa memotong kalimat kandidat',
      ],
      codeSnippet: `// Lightweight Speech-to-Text & STAR Competency Evaluator
export interface StarInterviewEvaluation {
  transcription: string;
  metrics: { situation: number; task: number; action: number; result: number };
  overallScore: number;
  actionableFeedback: string[];
}`,
    },
    screen: {
      file: 'StarSpeechAI.ts',
      badge: 'NLP EVALUATOR',
      lines: [
        '// StarInterviewEvaluator.ts',
        'const { wer, rubrics } = await evalAudio(stream);',
        '// WER: 8.4% (< 12% target threshold)',
        '// STAR Metrics: S:4.8, T:4.5, A:4.9, R:4.6',
        '// Latency: 120ms (Wasm inference)',
        '➔ Audio VAD: Calibrated to Indonesian',
      ],
    },
  },
  22: {
    workload: 94,
    status: {
      label: 'Real-Time Telemetry & SLA 99.98% Monitored',
      tone: 'emerald',
      action:
        'Memantau kestabilan infrastruktur, metrik latensi p95 API (< 50ms), pooling koneksi database Supabase, serta mitigasi risiko degradasi koneksi saat ujian massal.',
      ticket: 'OPS-SRE / SLA-9998',
      file: 'client/src/features/admin/AdminPanelPage.tsx & docs/architecture/SRE_OBSERVABILITY_RUNBOOK.md',
      collaborators:
        'Damar Deva (DevOps Lead), Ir. Saskia Wardhani (Security), Pandu Respati (Perf)',
      cleanArchReview:
        'Observability runbook: Metrik telemetry error client di-buffer secara debounced untuk mencegah flood request ke server.',
      opinion:
        'Stabilitas sistem bukan kebetulan; itu adalah buah dari pemantauan proaktif, batas kapasitas yang teruji, dan kesiapsiagaan menghadapi lonjakan trafik tak terduga.',
      ac: [
        'Dashboard observabilitas menampilkan status koneksi pool Supabase real-time',
        'Uptime sistem produksi berada di atas komitmen SLA enterprise 99.98%',
        'Alerting otomatis terhubung ke kanal notifikasi saat error rate melampaui 0.1%',
      ],
      codeSnippet: `// SRE Real-Time Observability & Healthcheck
export interface SystemHealthMetrics {
  uptimePercent: 99.98;
  apiP95LatencyMs: 42;
  dbPoolUtilization: number;
  activeQuizSessions: number;
  status: 'OPTIMAL';
}`,
    },
    screen: {
      file: 'Prometheus.metrics',
      badge: 'SLA 99.98%',
      lines: [
        '// PrometheusGrafana.metrics',
        '* Service Uptime: 99.98% (Target: 99.95%)',
        '* p95 API Response Time: 42ms (< 50ms)',
        '* DB Connection Pool: 14/100 active',
        '* Error Rate: 0.001% (Healthy)',
        '➔ Status: All Systems Operational',
      ],
    },
  },
  23: {
    workload: 92,
    status: {
      label: 'Candidate ATS Pipeline & 5D Radar Active',
      tone: 'rose',
      action:
        'Menguji efektivitas alur pencarian talenta di RecruiterPortalPage.tsx, filtering Radar 5D, pemindahan status kandidat di ATS Kanban, dan kemudahan ekspor shortlist.',
      ticket: 'REC-06 / REC-08',
      file: 'client/src/features/recruiter/RecruiterPortalPage.tsx',
      collaborators:
        'Farel Faza (FE Lead), Bramantyo (Business Lead), Pranadipa (PO)',
      cleanArchReview:
        'Memastikan data profil kandidat yang disajikan objektif dan sesuai batasan persetujuan privasi pelamar (opt-in data sharing).',
      opinion:
        'Sebagai perekrut, kami tidak butuh grafik yang rumit. Kami butuh data komparasi objektif yang memperlihatkan potensi kepemimpinan, ketahanan kerja, dan integritas kandidat.',
      ac: [
        'Perekrut dapat memfilter kandidat berdasarkan batas bawah skor Radar 5D dan KPM Kraepelin',
        'Matriks komparasi berdampingan menyajikan 2-4 kandidat pilihan secara komparatif',
        'Tautan Talent Passport kandidat terverifikasi publik dapat dibuka dan dibagikan dengan aman',
      ],
      codeSnippet: `// Candidate Shortlist & Comparison Matrix
export interface CandidateComparisonView {
  candidates: CandidateProfile[];
  dimensions: ['leadership', 'problemSolving', 'technicalAgility', 'workResilience', 'collaboration'];
  recommendationScore: number;
}`,
    },
    screen: {
      file: 'RecruiterATS.ts',
      badge: 'ATS KANBAN',
      lines: [
        '// RecruiterATS_Kanban.ts',
        '* Invited: 18 | In Progress: 12',
        '* Evaluated: 8 | Shortlisted: 5',
        '* Candidate 5D Radar Matrix: Compared',
        '* Talent Passport Links: Verified',
        '➔ Recruiter Portal: Live in Production',
      ],
    },
  },
};

export function filterAgents(
  query: string,
  agents: readonly AgentProfile[] = AGENTS,
): AgentProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...agents];

  return agents.filter((agent) => {
    const dossier = AGENT_DOSSIER_DATA[agent.id];
    const haystacks: string[] = [
      agent.name,
      agent.shortName,
      agent.role,
      agent.divisionId,
      agent.category,
      ...agent.skills.primary,
      ...agent.skills.stack,
    ];
    if (dossier) {
      haystacks.push(
        dossier.status.ticket,
        dossier.status.action,
        dossier.status.label,
        dossier.screen.file,
      );
    }
    return haystacks.some((field) => field.toLowerCase().includes(q));
  });
}

const ZONE_LABELS_ID: Record<ZoneId, string> = {
  lobby: 'Lobi Utama',
  cafeteria: 'Kafetaria & Pantry',
  musholla: 'Musholla',
  'meeting-rooms': 'Ruang Meeting Kaca',
  relaxation: 'Lounge Relaksasi',
  gym: 'Wellness Gym',
  executive: 'Ruang Eksekutif',
  architecture: 'Ruang Arsitektur & AI',
  engineering: 'Studio Core Engineering',
  qa: 'QA & Testing Lab',
  devops: 'DevOps & Security Ops',
  lounge: 'Stakeholder Lounge',
};

export function formatClockTime(date: Date = new Date()): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatActivityTickerMessage(
  agent: AgentProfile,
  activity: AgentActivityState,
  zone: ZoneId,
  partner?: AgentProfile | null,
  date: Date = new Date(),
): string {
  const time = formatClockTime(date);
  const zoneLabel = ZONE_LABELS_ID[zone] ?? zone;
  const dossier = AGENT_DOSSIER_DATA[agent.id];
  const ticket = dossier?.status.ticket ?? 'TASK';

  switch (activity) {
    case 'working':
      return `[${time}] ${agent.shortName} mengerjakan tiket ${ticket} di ${zoneLabel}`;
    case 'walking':
      return `[${time}] ${agent.shortName} berjalan menuju ${zoneLabel}`;
    case 'meeting':
      return partner
        ? `[${time}] ${agent.shortName} berdiskusi dengan ${partner.shortName} di ${zoneLabel}`
        : `[${time}] ${agent.shortName} mengikuti sinkronisasi tim di ${zoneLabel}`;
    case 'dining':
      return `[${time}] ${agent.shortName} menikmati kopi & santap siang di ${zoneLabel}`;
    case 'praying':
      return `[${time}] ${agent.shortName} menunaikan ibadah di ${zoneLabel}`;
    case 'gym_workout':
      return `[${time}] ${agent.shortName} berolahraga kebugaran di ${zoneLabel}`;
    case 'lounging':
      return `[${time}] ${agent.shortName} beristirahat santai di ${zoneLabel}`;
    case 'riding_elevator':
      return `[${time}] ${agent.shortName} menggunakan lift menuju lantai tujuan`;
  }
}

export function formatSubtaskCompletionMessage(
  agent: AgentProfile,
  date: Date = new Date(),
): string {
  const time = formatClockTime(date);
  const ticket = AGENT_DOSSIER_DATA[agent.id]?.status.ticket ?? 'SPRINT-15';
  return `[${time}] ${agent.shortName} menyelesaikan sub-task tiket ${ticket}`;
}

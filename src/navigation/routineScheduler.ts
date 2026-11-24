import {
  AGENT_DESK_BY_ID,
  ZONE_BY_ID,
  ZONE_STATION_WAYPOINTS,
} from '../data/buildingLayout.ts';
import {
  AGENT_BY_ID,
  AGENTS,
  COLLABORATION_PAIRS,
  resolveEventDestination,
} from '../data/contracts.ts';
import { AGENT_DOSSIER_DATA } from '../data/dossierData.ts';
import type {
  AgentActivityState,
  NormalizedEvent,
  RoutineTarget,
  TelemetryOverride,
  ZoneId,
} from '../types/office.ts';

export const DEFAULT_TELEMETRY_OVERRIDE_TTL_MS = 30000;

function pickStation(zone: ZoneId, seed: number): string {
  const stations = ZONE_STATION_WAYPOINTS[zone];
  if (!stations || stations.length === 0) {
    return ZONE_BY_ID[zone].primaryWaypointId;
  }
  return stations[((seed % stations.length) + stations.length) % stations.length];
}

function deskTarget(
  agentId: number,
  slotLabel: string,
  taskSummary?: string,
): RoutineTarget {
  const agent = AGENT_BY_ID.get(agentId) ?? AGENTS[0];
  const desk = AGENT_DESK_BY_ID.get(agent.id);
  const zone: ZoneId = desk?.zone ?? (agent.divisionId === 'lounge' ? 'lounge' : agent.divisionId);
  const floor = desk?.floor ?? agent.defaultFloor;
  const waypointId = desk?.approachWaypointId ?? pickStation(zone, agent.id);
  const fallbackTask =
    AGENT_DOSSIER_DATA[agent.id]?.status.action ??
    `${agent.shortName} fokus pada pekerjaan utama`;

  return {
    agentId: agent.id,
    floor,
    zone,
    activity: 'working',
    waypointId,
    taskSummary: taskSummary ?? fallbackTask,
    partnerId: null,
    slotLabel,
  };
}

function zoneTarget(
  agentId: number,
  zone: ZoneId,
  activity: AgentActivityState,
  slotLabel: string,
  taskSummary: string,
  stationSeed: number = agentId,
  partnerId: number | null = null,
): RoutineTarget {
  const zoneDef = ZONE_BY_ID[zone];
  return {
    agentId,
    floor: zoneDef.floor,
    zone,
    activity,
    waypointId: pickStation(zone, stationSeed),
    taskSummary,
    partnerId,
    slotLabel,
  };
}

export function normalizeOfficeMinutes(rawMinutes: number): number {
  if (!Number.isFinite(rawMinutes)) return 540;
  const mod = rawMinutes % 1440;
  return mod < 0 ? mod + 1440 : mod;
}

export function getDailyRoutineTarget(
  agentId: number,
  officeMinutes: number,
): RoutineTarget {
  const agent = AGENT_BY_ID.get(agentId) ?? AGENTS[0];
  const mins = normalizeOfficeMinutes(officeMinutes);

  // 08:30 - 09:15 (510..555): Kedatangan di Lobi, Kopi Pagi di Kafeteria, atau Mulai di Meja
  if (mins >= 510 && mins < 555) {
    if (mins < 525 && agent.id % 4 === 0) {
      return zoneTarget(
        agent.id,
        'lobby',
        'walking',
        'arrival-lobby',
        'Tiba di Lobi Utama & tap kartu akses gedung',
      );
    }
    if (agent.id % 3 === 0) {
      return zoneTarget(
        agent.id,
        'cafeteria',
        'dining',
        'morning-coffee',
        'Menikmati espresso pagi di Kafeteria sebelum standup',
      );
    }
    return deskTarget(agent.id, 'morning-setup', 'Menyiapkan agenda harian & review PR pagi');
  }

  // 09:15 - 09:45 (555..585): Daily Standup per cluster lantai
  if (mins >= 555 && mins < 585) {
    if (
      agent.divisionId === 'executive' ||
      agent.divisionId === 'architecture' ||
      agent.divisionId === 'devops'
    ) {
      const execSeats = ['f3-exec-board-1', 'f3-exec-board-2'];
      return {
        agentId: agent.id,
        floor: 3,
        zone: 'executive',
        activity: 'meeting',
        waypointId: execSeats[agent.id % execSeats.length],
        taskSummary: 'Daily Standup Lantai 3 di Boardroom Eksekutif',
        partnerId: null,
        slotLabel: 'standup-f3',
      };
    }
    return zoneTarget(
      agent.id,
      'meeting-rooms',
      'meeting',
      'standup-f2',
      'Daily Standup Lantai 2 di Ruang Meeting Kaca',
    );
  }

  // 09:45 - 12:00 (585..720): Deep Work 1 & jendela kolaborasi berpasangan
  if (mins >= 585 && mins < 720) {
    const windowIdx = Math.floor((mins - 585) / 20);
    const activePair = COLLABORATION_PAIRS[windowIdx % COLLABORATION_PAIRS.length];
    if (
      activePair &&
      (activePair.initiator === agent.id || activePair.target === agent.id)
    ) {
      const partnerId =
        activePair.initiator === agent.id ? activePair.target : activePair.initiator;
      const partnerDesk = AGENT_DESK_BY_ID.get(activePair.target);
      if (partnerDesk) {
        return {
          agentId: agent.id,
          floor: partnerDesk.floor,
          zone: partnerDesk.zone,
          activity: 'meeting',
          waypointId: partnerDesk.approachWaypointId,
          taskSummary: activePair.taskDesc,
          partnerId,
          slotLabel: 'deep-work-collab-1',
        };
      }
    }
    return deskTarget(agent.id, 'deep-work-1');
  }

  // 12:00 - 13:00 (720..780): Istirahat Makan Siang & Sholat Dzuhur bergelombang
  if (mins >= 720 && mins < 780) {
    const isFirstWave = mins < 750;
    const isEven = agent.id % 2 === 0;
    if ((isFirstWave && isEven) || (!isFirstWave && !isEven)) {
      return zoneTarget(
        agent.id,
        'cafeteria',
        'dining',
        'lunch-wave',
        'Santap siang & diskusi santai di Kafeteria Food Court',
        agent.id + 1,
      );
    }
    if (agent.id % 3 === 1) {
      return zoneTarget(
        agent.id,
        'relaxation',
        'lounging',
        'noon-relax',
        'Istirahat siang sejenak di Break & Relaxation Lounge',
      );
    }
    return zoneTarget(
      agent.id,
      'musholla',
      'praying',
      'dzuhur-prayer',
      'Menunaikan sholat Dzuhur di Musholla Lantai 1',
    );
  }

  // 13:00 - 15:30 (780..930): Deep Work 2 & Sprint Demo / Design Review
  if (mins >= 780 && mins < 930) {
    if (mins >= 840 && mins < 885 && (agent.divisionId === 'lounge' || agent.id === 2 || agent.id === 5 || agent.id === 20)) {
      return zoneTarget(
        agent.id,
        'meeting-rooms',
        'meeting',
        'sprint-review-demo',
        'Demo & Review Sprint UX bersama Stakeholder di Ruang Meeting Kaca',
      );
    }
    return deskTarget(agent.id, 'deep-work-2');
  }

  // 15:30 - 16:00 (930..960): Rehat Sore (Kopi / Ashar / Lounge)
  if (mins >= 930 && mins < 960) {
    const mod = agent.id % 3;
    if (mod === 0) {
      return zoneTarget(
        agent.id,
        'cafeteria',
        'dining',
        'afternoon-coffee',
        'Rehat kopi sore di Espresso Bar Lantai 1',
      );
    }
    if (mod === 1) {
      return zoneTarget(
        agent.id,
        'musholla',
        'praying',
        'ashar-prayer',
        'Menunaikan sholat Ashar di Musholla Lantai 1',
      );
    }
    return zoneTarget(
      agent.id,
      'relaxation',
      'lounging',
      'afternoon-lounge',
      'Rehat sore di Sofa & Nap Pod Relaxation Lounge',
    );
  }

  // 16:00 - 17:15 (960..1035): Release Gate & QA/DevOps Sync
  if (mins >= 960 && mins < 1035) {
    if (agent.id === 0 || agent.id === 8 || agent.id === 11 || agent.id === 17) {
      return {
        agentId: agent.id,
        floor: 3,
        zone: 'executive',
        activity: 'meeting',
        waypointId: agent.id % 2 === 0 ? 'f3-exec-board-1' : 'f3-exec-board-2',
        taskSummary: 'Release Gate & Audit Kepatuhan Harian di Boardroom Eksekutif',
        partnerId: null,
        slotLabel: 'release-gate-sync',
      };
    }
    return deskTarget(agent.id, 'release-prep');
  }

  // 17:15 - 18:00 (1035..1080): Wellness Gym, Lounge & Wrap-up
  if (mins >= 1035 && mins < 1080) {
    if (agent.id % 4 === 0) {
      return zoneTarget(
        agent.id,
        'gym',
        'gym_workout',
        'evening-gym',
        'Latihan cardio treadmill & kebugaran sore di Wellness Gym',
      );
    }
    if (agent.id % 4 === 1) {
      return zoneTarget(
        agent.id,
        'relaxation',
        'lounging',
        'evening-relax',
        'Bersantai sore di Break & Relaxation Lounge',
      );
    }
    return deskTarget(agent.id, 'wrap-up', 'Menutup komit harian & merapikan catatan sprint');
  }

  // Di luar jam kerja (18:00 - 08:30): Simulasi aktivitas gedung tetap hidup lintas lantai
  if (agent.divisionId === 'devops') {
    return deskTarget(agent.id, 'night-oncall', 'Pemantauan SLA 99.98% & keamanan infrastruktur');
  }
  if (agent.id % 5 === 0) {
    return zoneTarget(
      agent.id,
      'gym',
      'gym_workout',
      'afterhours-gym',
      'Sesi olahraga malam di Wellness Gym Lantai 3',
    );
  }
  if (agent.id % 5 === 1) {
    return zoneTarget(
      agent.id,
      'cafeteria',
      'dining',
      'afterhours-cafe',
      'Ngopi santai & diskusi lembur di Kafeteria Lantai 1',
    );
  }
  if (agent.id % 5 === 2) {
    return zoneTarget(
      agent.id,
      'relaxation',
      'lounging',
      'afterhours-relax',
      'Membaca & relaksasi di Lounge Lantai 3',
    );
  }
  if (agent.id % 5 === 3) {
    return zoneTarget(
      agent.id,
      'musholla',
      'praying',
      'afterhours-musholla',
      'Ibadah tenang di Musholla Lantai 1',
    );
  }
  return deskTarget(agent.id, 'afterhours-sprint', 'Sesi sprint fokus & sinkronisasi real-time');
}

export function reconcileAgentSchedule(
  agentId: number,
  officeMinutes: number,
  override: TelemetryOverride | undefined,
  nowMs: number,
): RoutineTarget {
  if (override && override.agentId === agentId && override.expiresAtMs > nowMs) {
    return {
      agentId,
      floor: override.floor,
      zone: override.zone,
      activity: override.activity,
      waypointId: override.waypointId,
      taskSummary: override.taskSummary,
      partnerId: null,
      slotLabel: `telemetry:${override.eventId}`,
    };
  }
  return getDailyRoutineTarget(agentId, officeMinutes);
}

export function mapEventToOfficeTarget(
  event: NormalizedEvent,
  nowMs: number = Date.now(),
  ttlMs: number = DEFAULT_TELEMETRY_OVERRIDE_TTL_MS,
): TelemetryOverride {
  const dest = resolveEventDestination(event);
  const desk = AGENT_DESK_BY_ID.get(event.agentId);

  let waypointId: string;
  if (dest.activity === 'working' && desk && desk.zone === dest.zone) {
    waypointId = desk.approachWaypointId;
  } else {
    waypointId = pickStation(dest.zone, event.agentId);
  }

  return {
    agentId: event.agentId,
    floor: dest.floor,
    zone: dest.zone,
    activity: dest.activity,
    waypointId,
    taskSummary: event.summary || event.title,
    eventId: event.id,
    expiresAtMs: nowMs + Math.max(1000, ttlMs),
  };
}

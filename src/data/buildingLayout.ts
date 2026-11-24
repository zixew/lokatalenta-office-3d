import { AGENTS, DIVISION_BY_ID } from './contracts.ts';
import {
  FLOOR_HEIGHT,
  FLOOR_Y,
  type ColliderBox,
  type FloorNumber,
  type NavigationGraph,
  type RectXZ,
  type Vec3,
  type WaypointEdge,
  type WaypointNode,
  type ZoneDefinition,
  type ZoneId,
} from '../types/office.ts';

export const BUILDING_BOUNDS: RectXZ = {
  minX: -24,
  maxX: 24,
  minZ: -20,
  maxZ: 20,
};

export const WALKABLE_BOUNDS: RectXZ = {
  minX: -23.4,
  maxX: 23.4,
  minZ: -19.4,
  maxZ: 19.4,
};

export const ELEVATOR_SHAFT_BOUNDS: RectXZ = {
  minX: -2.0,
  maxX: 2.0,
  minZ: -2.0,
  maxZ: 2.0,
};

export interface AgentDeskAssignment {
  readonly agentId: number;
  readonly floor: FloorNumber;
  readonly zone: ZoneId;
  readonly deskPos: Vec3;
  readonly seatPos: Vec3;
  readonly approachWaypointId: string;
  readonly facingYaw: number;
}

export const ZONES: readonly ZoneDefinition[] = [
  // Floor 1 (y = 0)
  {
    id: 'lobby',
    floor: 1,
    label: 'Lobi Utama & Resepsionis',
    minX: -23.6,
    maxX: 23.6,
    minZ: 6.0,
    maxZ: 19.6,
    center: { x: 0, y: FLOOR_Y[1], z: 12.5 },
    cameraPos: { x: 0, y: FLOOR_Y[1] + 12, z: 27 },
    cameraTarget: { x: 0, y: FLOOR_Y[1] + 1.5, z: 11 },
    accentHex: '#38bdf8',
    threeColor: 0x38bdf8,
    primaryWaypointId: 'f1-lobby-center',
  },
  {
    id: 'cafeteria',
    floor: 1,
    label: 'Kafetaria, Food Court & Espresso Bar',
    minX: -23.6,
    maxX: -6.0,
    minZ: -19.6,
    maxZ: 2.0,
    center: { x: -14.8, y: FLOOR_Y[1], z: -8.8 },
    cameraPos: { x: -4, y: FLOOR_Y[1] + 12, z: 3 },
    cameraTarget: { x: -14.8, y: FLOOR_Y[1] + 1.2, z: -9 },
    accentHex: '#f59e0b',
    threeColor: 0xf59e0b,
    primaryWaypointId: 'f1-cafe-coffee',
  },
  {
    id: 'musholla',
    floor: 1,
    label: 'Musholla & Area Wudhu',
    minX: 6.0,
    maxX: 23.6,
    minZ: -19.6,
    maxZ: 2.0,
    center: { x: 14.8, y: FLOOR_Y[1], z: -8.8 },
    cameraPos: { x: 4, y: FLOOR_Y[1] + 12, z: 3 },
    cameraTarget: { x: 14.8, y: FLOOR_Y[1] + 1.2, z: -9 },
    accentHex: '#10b981',
    threeColor: 0x10b981,
    primaryWaypointId: 'f1-mush-pray-1',
  },

  // Floor 2 (y = 7)
  {
    id: 'engineering',
    floor: 2,
    label: 'Studio Core Engineering & Product Craft',
    minX: -23.6,
    maxX: -6.0,
    minZ: -19.6,
    maxZ: 2.0,
    center: { x: -14.8, y: FLOOR_Y[2], z: -8.8 },
    cameraPos: { x: -3, y: FLOOR_Y[2] + 12, z: 4 },
    cameraTarget: { x: -15, y: FLOOR_Y[2] + 1.2, z: -10 },
    accentHex: '#10b981',
    threeColor: 0x10b981,
    primaryWaypointId: 'f2-eng-hub',
  },
  {
    id: 'qa',
    floor: 2,
    label: 'Laboratorium QA & Otomasi Uji',
    minX: 6.0,
    maxX: 23.6,
    minZ: -19.6,
    maxZ: 2.0,
    center: { x: 14.8, y: FLOOR_Y[2], z: -8.8 },
    cameraPos: { x: 3, y: FLOOR_Y[2] + 12, z: 4 },
    cameraTarget: { x: 15, y: FLOOR_Y[2] + 1.2, z: -10 },
    accentHex: '#f59e0b',
    threeColor: 0xf59e0b,
    primaryWaypointId: 'f2-qa-hub',
  },
  {
    id: 'lounge',
    floor: 2,
    label: 'Stakeholder & UX Lounge',
    minX: -23.6,
    maxX: -6.0,
    minZ: 6.0,
    maxZ: 19.6,
    center: { x: -14.8, y: FLOOR_Y[2], z: 12.8 },
    cameraPos: { x: -3, y: FLOOR_Y[2] + 12, z: 25 },
    cameraTarget: { x: -15, y: FLOOR_Y[2] + 1.2, z: 12.5 },
    accentHex: '#ec4899',
    threeColor: 0xec4899,
    primaryWaypointId: 'f2-lounge-hub',
  },
  {
    id: 'meeting-rooms',
    floor: 2,
    label: 'Ruang Meeting Kaca & Boardroom',
    minX: 6.0,
    maxX: 23.6,
    minZ: 6.0,
    maxZ: 19.6,
    center: { x: 14.8, y: FLOOR_Y[2], z: 12.8 },
    cameraPos: { x: 4, y: FLOOR_Y[2] + 12, z: 25 },
    cameraTarget: { x: 14.8, y: FLOOR_Y[2] + 1.2, z: 12.5 },
    accentHex: '#6366f1',
    threeColor: 0x6366f1,
    primaryWaypointId: 'f2-meet-a-seat-1',
  },

  // Floor 3 (y = 14)
  {
    id: 'executive',
    floor: 3,
    label: 'Suite Eksekutif & Boardroom Pimpinan',
    minX: -23.6,
    maxX: -6.0,
    minZ: -19.6,
    maxZ: 2.0,
    center: { x: -14.8, y: FLOOR_Y[3], z: -8.8 },
    cameraPos: { x: -3, y: FLOOR_Y[3] + 12, z: 4 },
    cameraTarget: { x: -15, y: FLOOR_Y[3] + 1.2, z: -10 },
    accentHex: '#3b82f6',
    threeColor: 0x3b82f6,
    primaryWaypointId: 'f3-exec-board-1',
  },
  {
    id: 'architecture',
    floor: 3,
    label: 'Ruang Arsitektur Sistem & Pusat Riset AI',
    minX: 6.0,
    maxX: 23.6,
    minZ: -19.6,
    maxZ: 2.0,
    center: { x: 14.8, y: FLOOR_Y[3], z: -8.8 },
    cameraPos: { x: 3, y: FLOOR_Y[3] + 12, z: 4 },
    cameraTarget: { x: 15, y: FLOOR_Y[3] + 1.2, z: -10 },
    accentHex: '#8b5cf6',
    threeColor: 0x8b5cf6,
    primaryWaypointId: 'f3-arch-hub',
  },
  {
    id: 'devops',
    floor: 3,
    label: 'DevOps Command Center & Keamanan Siber',
    minX: -23.6,
    maxX: -6.0,
    minZ: 6.0,
    maxZ: 19.6,
    center: { x: -14.8, y: FLOOR_Y[3], z: 12.8 },
    cameraPos: { x: -3, y: FLOOR_Y[3] + 12, z: 25 },
    cameraTarget: { x: -15, y: FLOOR_Y[3] + 1.2, z: 12.5 },
    accentHex: '#06b6d4',
    threeColor: 0x06b6d4,
    primaryWaypointId: 'f3-devops-hub',
  },
  {
    id: 'relaxation',
    floor: 3,
    label: 'Break & Relaxation Lounge',
    minX: 6.0,
    maxX: 14.6,
    minZ: 6.0,
    maxZ: 19.6,
    center: { x: 10.3, y: FLOOR_Y[3], z: 12.8 },
    cameraPos: { x: 4, y: FLOOR_Y[3] + 11, z: 24 },
    cameraTarget: { x: 10.3, y: FLOOR_Y[3] + 1.2, z: 12.5 },
    accentHex: '#a855f7',
    threeColor: 0xa855f7,
    primaryWaypointId: 'f3-relax-hub',
  },
  {
    id: 'gym',
    floor: 3,
    label: 'Wellness & Fitness Gym',
    minX: 15.0,
    maxX: 23.6,
    minZ: 6.0,
    maxZ: 19.6,
    center: { x: 19.3, y: FLOOR_Y[3], z: 12.8 },
    cameraPos: { x: 25, y: FLOOR_Y[3] + 11, z: 24 },
    cameraTarget: { x: 19.3, y: FLOOR_Y[3] + 1.2, z: 13.5 },
    accentHex: '#14b8a6',
    threeColor: 0x14b8a6,
    primaryWaypointId: 'f3-gym-tm1',
  },
] as const;

export const ZONE_BY_ID: Record<ZoneId, ZoneDefinition> = Object.fromEntries(
  ZONES.map((z) => [z.id, z]),
) as Record<ZoneId, ZoneDefinition>;

interface DeskSeed {
  readonly agentId: number;
  readonly floor: FloorNumber;
  readonly zone: ZoneId;
  readonly x: number;
  readonly z: number;
  readonly approachX: number;
  readonly approachZ: number;
}

const DESK_SEEDS: readonly DeskSeed[] = [
  // Floor 3 — Executive (#0, #1, #2)
  { agentId: 0, floor: 3, zone: 'executive', x: -19.5, z: -14.5, approachX: -19.5, approachZ: -12.5 },
  { agentId: 1, floor: 3, zone: 'executive', x: -19.5, z: -9.5, approachX: -19.5, approachZ: -7.5 },
  { agentId: 2, floor: 3, zone: 'executive', x: -19.5, z: -4.5, approachX: -19.5, approachZ: -2.5 },

  // Floor 3 — Architecture (#3, #4, #21)
  { agentId: 3, floor: 3, zone: 'architecture', x: 10.5, z: -14.5, approachX: 10.5, approachZ: -12.5 },
  { agentId: 4, floor: 3, zone: 'architecture', x: 19.5, z: -14.5, approachX: 19.5, approachZ: -12.5 },
  { agentId: 21, floor: 3, zone: 'architecture', x: 15.0, z: -6.5, approachX: 15.0, approachZ: -4.5 },

  // Floor 2 — Engineering (#5, #6, #18, #19, #20)
  { agentId: 18, floor: 2, zone: 'engineering', x: -19.5, z: -15.5, approachX: -19.5, approachZ: -13.0 },
  { agentId: 20, floor: 2, zone: 'engineering', x: -15.0, z: -15.5, approachX: -15.0, approachZ: -13.2 },
  { agentId: 19, floor: 2, zone: 'engineering', x: -10.5, z: -15.5, approachX: -10.5, approachZ: -13.0 },
  { agentId: 5, floor: 2, zone: 'engineering', x: -19.5, z: -6.5, approachX: -19.5, approachZ: -4.5 },
  { agentId: 6, floor: 2, zone: 'engineering', x: -10.5, z: -6.5, approachX: -10.5, approachZ: -4.5 },

  // Floor 2 — QA (#7, #8, #9, #10)
  { agentId: 7, floor: 2, zone: 'qa', x: 10.5, z: -14.5, approachX: 10.5, approachZ: -12.5 },
  { agentId: 8, floor: 2, zone: 'qa', x: 19.5, z: -14.5, approachX: 19.5, approachZ: -12.5 },
  { agentId: 9, floor: 2, zone: 'qa', x: 10.5, z: -6.5, approachX: 10.5, approachZ: -4.5 },
  { agentId: 10, floor: 2, zone: 'qa', x: 19.5, z: -6.5, approachX: 19.5, approachZ: -4.5 },

  // Floor 3 — DevOps (#11, #12, #16, #17, #22)
  { agentId: 11, floor: 3, zone: 'devops', x: -18.5, z: 9.2, approachX: -18.5, approachZ: 11.2 },
  { agentId: 22, floor: 3, zone: 'devops', x: -10.5, z: 9.2, approachX: -10.5, approachZ: 11.2 },
  { agentId: 16, floor: 3, zone: 'devops', x: -18.5, z: 15.2, approachX: -18.5, approachZ: 17.2 },
  { agentId: 12, floor: 3, zone: 'devops', x: -14.5, z: 15.2, approachX: -14.5, approachZ: 17.2 },
  { agentId: 17, floor: 3, zone: 'devops', x: -10.5, z: 15.2, approachX: -10.5, approachZ: 17.2 },

  // Floor 2 — Lounge (#13, #14, #15, #23)
  { agentId: 13, floor: 2, zone: 'lounge', x: -19.5, z: 9.5, approachX: -19.5, approachZ: 11.5 },
  { agentId: 23, floor: 2, zone: 'lounge', x: -10.5, z: 9.5, approachX: -10.5, approachZ: 11.5 },
  { agentId: 14, floor: 2, zone: 'lounge', x: -19.5, z: 15.0, approachX: -19.5, approachZ: 17.0 },
  { agentId: 15, floor: 2, zone: 'lounge', x: -10.5, z: 15.0, approachX: -10.5, approachZ: 17.0 },
] as const;

export const AGENT_DESK_ASSIGNMENTS: readonly AgentDeskAssignment[] = DESK_SEEDS.map((d) => {
  const y = FLOOR_Y[d.floor];
  return {
    agentId: d.agentId,
    floor: d.floor,
    zone: d.zone,
    deskPos: { x: d.x, y, z: d.z },
    seatPos: { x: d.x, y, z: d.z + 0.65 },
    approachWaypointId: `f${d.floor}-desk-${d.agentId}`,
    facingYaw: Math.PI,
  };
}).sort((a, b) => a.agentId - b.agentId);

export const AGENT_DESK_BY_ID: ReadonlyMap<number, AgentDeskAssignment> = new Map(
  AGENT_DESK_ASSIGNMENTS.map((a) => [a.agentId, a]),
);

function box(
  id: string,
  floor: FloorNumber,
  kind: ColliderBox['kind'],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  height = 4.2,
  label?: string,
): ColliderBox {
  const y = FLOOR_Y[floor];
  return {
    id,
    floor,
    kind,
    minX,
    maxX,
    minY: y,
    maxY: y + height,
    minZ,
    maxZ,
    label,
  };
}

function buildFloorShellColliders(floor: FloorNumber): ColliderBox[] {
  const h = FLOOR_HEIGHT - 0.5;
  const list: ColliderBox[] = [
    // Perimeter walls
    box(`f${floor}-wall-n`, floor, 'wall', -24, 24, -20, -19.6, h, 'North Wall'),
    box(`f${floor}-wall-w`, floor, 'wall', -24, -23.6, -20, 20, h, 'West Wall'),
    box(`f${floor}-wall-e`, floor, 'wall', 23.6, 24, -20, 20, h, 'East Wall'),

    // Central Elevator Core (door open South x in [-1.2, 1.2], z = 2.0)
    box(`f${floor}-elev-n`, floor, 'elevator_wall', -2.0, 2.0, -2.0, -1.7, h, 'Elevator North'),
    box(`f${floor}-elev-w`, floor, 'elevator_wall', -2.0, -1.7, -2.0, 2.0, h, 'Elevator West'),
    box(`f${floor}-elev-e`, floor, 'elevator_wall', 1.7, 2.0, -2.0, 2.0, h, 'Elevator East'),
    box(`f${floor}-elev-sw`, floor, 'elevator_wall', -2.0, -1.2, 1.7, 2.0, h, 'Elevator Jamb SW'),
    box(`f${floor}-elev-se`, floor, 'elevator_wall', 1.2, 2.0, 1.7, 2.0, h, 'Elevator Jamb SE'),
  ];

  if (floor === 1) {
    // 6m main entrance opening at South x in [-3.0, 3.0]
    list.push(
      box(`f1-wall-s-w`, 1, 'wall', -24, -3.0, 19.6, 20, h, 'South Wall West'),
      box(`f1-wall-s-e`, 1, 'wall', 3.0, 24, 19.6, 20, h, 'South Wall East'),
    );
  } else {
    list.push(box(`f${floor}-wall-s`, floor, 'wall', -24, 24, 19.6, 20, h, 'South Wall'));
  }

  return list;
}

function buildDeskColliders(): ColliderBox[] {
  return DESK_SEEDS.map((d) =>
    box(
      `f${d.floor}-desk-col-${d.agentId}`,
      d.floor,
      'furniture',
      d.x - 1.15,
      d.x + 1.15,
      d.z - 0.58,
      d.z + 0.58,
      1.3,
      `Meja ${AGENTS[d.agentId]?.shortName ?? d.agentId}`,
    ),
  );
}

export const BUILDING_COLLIDERS: readonly ColliderBox[] = [
  ...buildFloorShellColliders(1),
  ...buildFloorShellColliders(2),
  ...buildFloorShellColliders(3),

  // Floor 1 partition walls & furniture
  // Cafeteria walls (door E at z=-10 [-11.5,-8.5], door S at x=-15 [-16.5,-13.5])
  box('f1-cafe-wall-e1', 1, 'wall', -6.15, -5.85, -19.6, -11.5, 4.2, 'Cafeteria Wall E1'),
  box('f1-cafe-wall-e2', 1, 'wall', -6.15, -5.85, -8.5, 2.15, 4.2, 'Cafeteria Wall E2'),
  box('f1-cafe-wall-s1', 1, 'wall', -23.6, -16.5, 1.85, 2.15, 4.2, 'Cafeteria Wall S1'),
  box('f1-cafe-wall-s2', 1, 'wall', -13.5, -5.85, 1.85, 2.15, 4.2, 'Cafeteria Wall S2'),
  // Cafeteria furniture
  box('f1-cafe-counter', 1, 'furniture', -20.5, -12.5, -17.5, -16.0, 1.2, 'Espresso Bar'),
  box('f1-cafe-table-1', 1, 'furniture', -17.5, -10.5, -12.0, -10.4, 0.9, 'Meja Makan 1'),
  box('f1-cafe-table-2', 1, 'furniture', -17.5, -10.5, -6.0, -4.4, 0.9, 'Meja Makan 2'),
  box('f1-cafe-vending', 1, 'furniture', -23.2, -21.6, -12.0, -8.0, 2.1, 'Vending Machine'),

  // Musholla walls (door W at z=-10 [-11.5,-8.5], door S at x=15 [13.5,16.5])
  box('f1-mush-wall-w1', 1, 'wall', 5.85, 6.15, -19.6, -11.5, 4.2, 'Musholla Wall W1'),
  box('f1-mush-wall-w2', 1, 'wall', 5.85, 6.15, -8.5, 2.15, 4.2, 'Musholla Wall W2'),
  box('f1-mush-wall-s1', 1, 'wall', 5.85, 13.5, 1.85, 2.15, 4.2, 'Musholla Wall S1'),
  box('f1-mush-wall-s2', 1, 'wall', 16.5, 23.6, 1.85, 2.15, 4.2, 'Musholla Wall S2'),
  // Musholla furniture
  box('f1-mush-wudhu-col', 1, 'furniture', 7.0, 13.0, -18.5, -17.0, 1.2, 'Area Wudhu'),
  box('f1-mush-shoerack', 1, 'furniture', 7.0, 8.2, -5.0, -1.0, 1.2, 'Rak Sepatu'),

  // Lobby furniture
  box('f1-lobby-rec-desk', 1, 'furniture', 7.5, 11.5, 14.8, 16.2, 1.2, 'Meja Resepsionis'),
  box('f1-lobby-sofa-w', 1, 'furniture', -19.5, -15.5, 12.0, 13.5, 0.9, 'Sofa Lobi Barat'),
  box('f1-lobby-sofa-e', 1, 'furniture', 15.5, 19.5, 12.0, 13.5, 0.9, 'Sofa Lobi Timur'),
  box('f1-lobby-turnstile-w', 1, 'furniture', -4.5, -2.5, 15.5, 16.2, 1.1, 'Turnstile Barat'),
  box('f1-lobby-turnstile-e', 1, 'furniture', 2.5, 4.5, 15.5, 16.2, 1.1, 'Turnstile Timur'),

  // Floor 2 partition walls
  // Engineering (door E z=-10 [-11.5,-8.5], door S x=-15 [-16.5,-13.5])
  box('f2-eng-wall-e1', 2, 'wall', -6.15, -5.85, -19.6, -11.5, 4.2, 'Eng Wall E1'),
  box('f2-eng-wall-e2', 2, 'wall', -6.15, -5.85, -8.5, 2.15, 4.2, 'Eng Wall E2'),
  box('f2-eng-wall-s1', 2, 'wall', -23.6, -16.5, 1.85, 2.15, 4.2, 'Eng Wall S1'),
  box('f2-eng-wall-s2', 2, 'wall', -13.5, -5.85, 1.85, 2.15, 4.2, 'Eng Wall S2'),

  // QA (door W z=-10 [-11.5,-8.5], door S x=15 [13.5,16.5])
  box('f2-qa-wall-w1', 2, 'wall', 5.85, 6.15, -19.6, -11.5, 4.2, 'QA Wall W1'),
  box('f2-qa-wall-w2', 2, 'wall', 5.85, 6.15, -8.5, 2.15, 4.2, 'QA Wall W2'),
  box('f2-qa-wall-s1', 2, 'wall', 5.85, 13.5, 1.85, 2.15, 4.2, 'QA Wall S1'),
  box('f2-qa-wall-s2', 2, 'wall', 16.5, 23.6, 1.85, 2.15, 4.2, 'QA Wall S2'),

  // Lounge (door N x=-15 [-16.5,-13.5], door E z=12 [10.5,13.5])
  box('f2-lounge-wall-n1', 2, 'wall', -23.6, -16.5, 5.85, 6.15, 4.2, 'Lounge Wall N1'),
  box('f2-lounge-wall-n2', 2, 'wall', -13.5, -5.85, 5.85, 6.15, 4.2, 'Lounge Wall N2'),
  box('f2-lounge-wall-e1', 2, 'wall', -6.15, -5.85, 5.85, 10.5, 4.2, 'Lounge Wall E1'),
  box('f2-lounge-wall-e2', 2, 'wall', -6.15, -5.85, 13.5, 19.6, 4.2, 'Lounge Wall E2'),

  // Meeting Rooms (Room A door N x=10.5 [9.0,12.0], door W z=12 [10.5,13.5]; Room B door N x=19.3 [17.8,20.8])
  box('f2-meet-wall-n1', 2, 'wall', 5.85, 9.0, 5.85, 6.15, 4.2, 'Meeting Wall N1'),
  box('f2-meet-wall-n2', 2, 'wall', 12.0, 17.8, 5.85, 6.15, 4.2, 'Meeting Wall N2'),
  box('f2-meet-wall-n3', 2, 'wall', 20.8, 23.6, 5.85, 6.15, 4.2, 'Meeting Wall N3'),
  box('f2-meet-wall-w1', 2, 'wall', 5.85, 6.15, 5.85, 10.5, 4.2, 'Meeting Wall W1'),
  box('f2-meet-wall-w2', 2, 'wall', 5.85, 6.15, 13.5, 19.6, 4.2, 'Meeting Wall W2'),
  box('f2-meet-divider-1', 2, 'wall', 14.6, 15.0, 6.15, 16.2, 4.2, 'Meeting Divider 1'),
  box('f2-meet-divider-2', 2, 'wall', 14.6, 15.0, 18.8, 19.6, 4.2, 'Meeting Divider 2'),
  // Meeting Room tables
  box('f2-meet-table-a', 2, 'furniture', 9.0, 12.0, 10.5, 15.5, 0.9, 'Meja Meeting A'),
  box('f2-meet-table-b', 2, 'furniture', 17.8, 20.8, 10.5, 15.5, 0.9, 'Meja Meeting B'),

  // Floor 3 partition walls & furniture
  // Executive (Exec West door S x=-19.5 [-21.0,-18.0]; Boardroom door S x=-10.3 [-11.8,-8.8], door E z=-10 [-11.5,-8.5]; Internal divider x=-14.85 door z=-10 [-11.5,-8.5])
  box('f3-exec-wall-e1', 3, 'wall', -6.15, -5.85, -19.6, -11.5, 4.2, 'Exec Wall E1'),
  box('f3-exec-wall-e2', 3, 'wall', -6.15, -5.85, -8.5, 2.15, 4.2, 'Exec Wall E2'),
  box('f3-exec-wall-s1', 3, 'wall', -23.6, -21.0, 1.85, 2.15, 4.2, 'Exec Wall S1'),
  box('f3-exec-wall-s2', 3, 'wall', -18.0, -11.8, 1.85, 2.15, 4.2, 'Exec Wall S2'),
  box('f3-exec-wall-s3', 3, 'wall', -8.8, -5.85, 1.85, 2.15, 4.2, 'Exec Wall S3'),
  box('f3-exec-div-n', 3, 'wall', -15.0, -14.7, -19.6, -11.5, 4.2, 'Exec Internal Divider N'),
  box('f3-exec-div-s', 3, 'wall', -15.0, -14.7, -8.5, 1.85, 4.2, 'Exec Internal Divider S'),
  box('f3-exec-board-table', 3, 'furniture', -11.8, -8.8, -13.5, -6.5, 0.9, 'Meja Boardroom Eksekutif'),

  // Architecture (door W z=-10 [-11.5,-8.5], door S x=15 [13.5,16.5])
  box('f3-arch-wall-w1', 3, 'wall', 5.85, 6.15, -19.6, -11.5, 4.2, 'Arch Wall W1'),
  box('f3-arch-wall-w2', 3, 'wall', 5.85, 6.15, -8.5, 2.15, 4.2, 'Arch Wall W2'),
  box('f3-arch-wall-s1', 3, 'wall', 5.85, 13.5, 1.85, 2.15, 4.2, 'Arch Wall S1'),
  box('f3-arch-wall-s2', 3, 'wall', 16.5, 23.6, 1.85, 2.15, 4.2, 'Arch Wall S2'),

  // DevOps (door N x=-15 [-16.5,-13.5], door E z=12 [10.5,13.5])
  box('f3-devops-wall-n1', 3, 'wall', -23.6, -16.5, 5.85, 6.15, 4.2, 'DevOps Wall N1'),
  box('f3-devops-wall-n2', 3, 'wall', -13.5, -5.85, 5.85, 6.15, 4.2, 'DevOps Wall N2'),
  box('f3-devops-wall-e1', 3, 'wall', -6.15, -5.85, 5.85, 10.5, 4.2, 'DevOps Wall E1'),
  box('f3-devops-wall-e2', 3, 'wall', -6.15, -5.85, 13.5, 19.6, 4.2, 'DevOps Wall E2'),
  box('f3-devops-racks', 3, 'furniture', -23.2, -21.8, 8.0, 17.5, 2.4, 'Server Racks'),

  // Relaxation & Gym (Relax door N x=10.5 [9.0,12.0], door W z=12 [10.5,13.5]; Gym door N x=19.3 [17.8,20.8])
  box('f3-rg-wall-n1', 3, 'wall', 5.85, 9.0, 5.85, 6.15, 4.2, 'Relax Wall N1'),
  box('f3-rg-wall-n2', 3, 'wall', 12.0, 17.8, 5.85, 6.15, 4.2, 'Relax-Gym Wall N2'),
  box('f3-rg-wall-n3', 3, 'wall', 20.8, 23.6, 5.85, 6.15, 4.2, 'Gym Wall N3'),
  box('f3-relax-wall-w1', 3, 'wall', 5.85, 6.15, 5.85, 10.5, 4.2, 'Relax Wall W1'),
  box('f3-relax-wall-w2', 3, 'wall', 5.85, 6.15, 13.5, 19.6, 4.2, 'Relax Wall W2'),
  box('f3-rg-divider', 3, 'wall', 14.6, 15.0, 6.15, 19.6, 4.2, 'Relax/Gym Divider'),
  // Relaxation furniture
  box('f3-relax-nappod', 3, 'furniture', 6.4, 8.0, 7.0, 9.2, 1.5, 'Nap Pod'),
  box('f3-relax-sofa-col', 3, 'furniture', 8.5, 12.5, 15.0, 16.2, 0.9, 'Sofa Relaksasi'),
  box('f3-relax-shelf', 3, 'furniture', 13.5, 14.4, 9.0, 16.0, 2.1, 'Rak Buku'),
  // Gym furniture
  box('f3-gym-tm1-col', 3, 'furniture', 16.5, 17.7, 11.5, 13.7, 1.4, 'Treadmill 1'),
  box('f3-gym-tm2-col', 3, 'furniture', 20.9, 22.1, 11.5, 13.7, 1.4, 'Treadmill 2'),
  box('f3-gym-weight-col', 3, 'furniture', 16.0, 22.6, 18.0, 19.2, 1.5, 'Weight Rack'),

  // All 24 agent desks
  ...buildDeskColliders(),
] as const;

function wp(
  id: string,
  floor: FloorNumber,
  x: number,
  z: number,
  zone: WaypointNode['zone'],
  kind: WaypointNode['kind'],
  agentId?: number,
): WaypointNode {
  return {
    id,
    floor,
    position: { x, y: FLOOR_Y[floor], z },
    zone,
    kind,
    ...(agentId !== undefined ? { agentId } : {}),
  };
}

function edge(
  from: string,
  to: string,
  kind: WaypointEdge['kind'] = 'walk',
  cost?: number,
): WaypointEdge {
  return cost !== undefined ? { from, to, kind, cost } : { from, to, kind };
}

function buildCorridorNodes(floor: FloorNumber): WaypointNode[] {
  return [
    wp(`f${floor}-elev-cab`, floor, 0, 0, 'elevator', 'elevator_cab'),
    wp(`f${floor}-elev-door`, floor, 0, 2.0, 'elevator', 'elevator_door'),
    wp(`f${floor}-elev-lobby`, floor, 0, 4.0, 'elevator', 'elevator_lobby'),
    wp(`f${floor}-cor-nw`, floor, -4, -4, 'corridor', 'corridor'),
    wp(`f${floor}-cor-ne`, floor, 4, -4, 'corridor', 'corridor'),
    wp(`f${floor}-cor-sw`, floor, -4, 4, 'corridor', 'corridor'),
    wp(`f${floor}-cor-se`, floor, 4, 4, 'corridor', 'corridor'),
    wp(`f${floor}-cor-n-w`, floor, -4, -10, 'corridor', 'corridor'),
    wp(`f${floor}-cor-n-e`, floor, 4, -10, 'corridor', 'corridor'),
    wp(`f${floor}-cor-s-w`, floor, -4, 12, 'corridor', 'corridor'),
    wp(`f${floor}-cor-s-e`, floor, 4, 12, 'corridor', 'corridor'),
    wp(`f${floor}-cor-w-far`, floor, -15, 4, 'corridor', 'corridor'),
    wp(`f${floor}-cor-e-far`, floor, 15, 4, 'corridor', 'corridor'),
  ];
}

function buildCorridorEdges(floor: FloorNumber): WaypointEdge[] {
  return [
    edge(`f${floor}-elev-cab`, `f${floor}-elev-door`, 'walk'),
    edge(`f${floor}-elev-door`, `f${floor}-elev-lobby`, 'walk'),
    edge(`f${floor}-elev-lobby`, `f${floor}-cor-sw`, 'walk'),
    edge(`f${floor}-elev-lobby`, `f${floor}-cor-se`, 'walk'),
    edge(`f${floor}-cor-nw`, `f${floor}-cor-ne`, 'walk'),
    edge(`f${floor}-cor-nw`, `f${floor}-cor-sw`, 'walk'),
    edge(`f${floor}-cor-ne`, `f${floor}-cor-se`, 'walk'),
    edge(`f${floor}-cor-sw`, `f${floor}-cor-se`, 'walk'),
    edge(`f${floor}-cor-nw`, `f${floor}-cor-n-w`, 'walk'),
    edge(`f${floor}-cor-ne`, `f${floor}-cor-n-e`, 'walk'),
    edge(`f${floor}-cor-n-w`, `f${floor}-cor-n-e`, 'walk'),
    edge(`f${floor}-cor-sw`, `f${floor}-cor-s-w`, 'walk'),
    edge(`f${floor}-cor-se`, `f${floor}-cor-s-e`, 'walk'),
    edge(`f${floor}-cor-s-w`, `f${floor}-cor-s-e`, 'walk'),
    edge(`f${floor}-cor-sw`, `f${floor}-cor-w-far`, 'walk'),
    edge(`f${floor}-cor-se`, `f${floor}-cor-e-far`, 'walk'),
  ];
}

const ALL_NODES: readonly WaypointNode[] = [
  ...buildCorridorNodes(1),
  ...buildCorridorNodes(2),
  ...buildCorridorNodes(3),

  // Floor 1 — Cafeteria
  wp('f1-cafe-door-e', 1, -6, -10, 'cafeteria', 'doorway'),
  wp('f1-cafe-door-s', 1, -15, 2, 'cafeteria', 'doorway'),
  wp('f1-cafe-hub', 1, -9.5, -10, 'cafeteria', 'corridor'),
  wp('f1-cafe-aisle-n', 1, -9.5, -14.5, 'cafeteria', 'corridor'),
  wp('f1-cafe-coffee', 1, -16.5, -14.5, 'cafeteria', 'station'),
  wp('f1-cafe-aisle-m', 1, -9.5, -8.8, 'cafeteria', 'corridor'),
  wp('f1-cafe-dine-1', 1, -14, -8.8, 'cafeteria', 'station'),
  wp('f1-cafe-aisle-s', 1, -9.5, -2.5, 'cafeteria', 'corridor'),
  wp('f1-cafe-dine-2', 1, -14, -2.5, 'cafeteria', 'station'),

  // Floor 1 — Musholla
  wp('f1-mush-door-w', 1, 6, -10, 'musholla', 'doorway'),
  wp('f1-mush-door-s', 1, 15, 2, 'musholla', 'doorway'),
  wp('f1-mush-hub', 1, 10.5, -10, 'musholla', 'corridor'),
  wp('f1-mush-wudhu', 1, 10.5, -15, 'musholla', 'station'),
  wp('f1-mush-pray-1', 1, 15, -10, 'musholla', 'station'),
  wp('f1-mush-pray-2', 1, 18, -6.5, 'musholla', 'station'),

  // Floor 1 — Lobby
  wp('f1-lobby-center', 1, 0, 10, 'lobby', 'station'),
  wp('f1-lobby-entrance', 1, 0, 17.5, 'lobby', 'station'),
  wp('f1-lobby-rec', 1, 9.5, 13.0, 'lobby', 'station'),
  wp('f1-lobby-wait-w', 1, -15, 9.5, 'lobby', 'station'),
  wp('f1-lobby-wait-e', 1, 14, 9.5, 'lobby', 'station'),

  // Floor 2 — Corridor extra connectors for Meeting Rooms
  wp('f2-cor-meet-a', 2, 10.5, 4, 'corridor', 'corridor'),
  wp('f2-cor-meet-b', 2, 19.3, 4, 'corridor', 'corridor'),

  // Floor 2 — Engineering
  wp('f2-eng-door-e', 2, -6, -10, 'engineering', 'doorway'),
  wp('f2-eng-door-s', 2, -15, 2, 'engineering', 'doorway'),
  wp('f2-eng-hub', 2, -15, -10, 'engineering', 'corridor'),
  wp('f2-eng-aisle-w', 2, -19.5, -10, 'engineering', 'corridor'),
  wp('f2-eng-aisle-e', 2, -10.5, -10, 'engineering', 'corridor'),
  wp('f2-eng-aisle-s', 2, -15, -4.5, 'engineering', 'corridor'),
  wp('f2-desk-18', 2, -19.5, -13.0, 'engineering', 'desk', 18),
  wp('f2-desk-20', 2, -15.0, -13.2, 'engineering', 'desk', 20),
  wp('f2-desk-19', 2, -10.5, -13.0, 'engineering', 'desk', 19),
  wp('f2-desk-5', 2, -19.5, -4.5, 'engineering', 'desk', 5),
  wp('f2-desk-6', 2, -10.5, -4.5, 'engineering', 'desk', 6),

  // Floor 2 — QA
  wp('f2-qa-door-w', 2, 6, -10, 'qa', 'doorway'),
  wp('f2-qa-door-s', 2, 15, 2, 'qa', 'doorway'),
  wp('f2-qa-hub', 2, 15, -10, 'qa', 'corridor'),
  wp('f2-qa-aisle-w', 2, 10.5, -10, 'qa', 'corridor'),
  wp('f2-qa-aisle-e', 2, 19.5, -10, 'qa', 'corridor'),
  wp('f2-qa-aisle-s', 2, 15, -4.5, 'qa', 'corridor'),
  wp('f2-desk-7', 2, 10.5, -12.5, 'qa', 'desk', 7),
  wp('f2-desk-8', 2, 19.5, -12.5, 'qa', 'desk', 8),
  wp('f2-desk-9', 2, 10.5, -4.5, 'qa', 'desk', 9),
  wp('f2-desk-10', 2, 19.5, -4.5, 'qa', 'desk', 10),

  // Floor 2 — Lounge
  wp('f2-lounge-door-n', 2, -15, 6, 'lounge', 'doorway'),
  wp('f2-lounge-door-e', 2, -6, 12, 'lounge', 'doorway'),
  wp('f2-lounge-hub', 2, -15, 11.5, 'lounge', 'corridor'),
  wp('f2-lounge-aisle-e', 2, -8.5, 12, 'lounge', 'corridor'),
  wp('f2-lounge-aisle-s', 2, -15, 17.0, 'lounge', 'corridor'),
  wp('f2-desk-13', 2, -19.5, 11.5, 'lounge', 'desk', 13),
  wp('f2-desk-23', 2, -10.5, 11.5, 'lounge', 'desk', 23),
  wp('f2-desk-14', 2, -19.5, 17.0, 'lounge', 'desk', 14),
  wp('f2-desk-15', 2, -10.5, 17.0, 'lounge', 'desk', 15),

  // Floor 2 — Meeting Rooms
  wp('f2-meet-a-door-n', 2, 10.5, 6, 'meeting-rooms', 'doorway'),
  wp('f2-meet-a-door-w', 2, 6, 12, 'meeting-rooms', 'doorway'),
  wp('f2-meet-a-top', 2, 10.5, 8.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-a-nw', 2, 7.6, 8.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-a-ne', 2, 13.3, 8.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-a-seat-1', 2, 7.6, 12, 'meeting-rooms', 'station'),
  wp('f2-meet-a-seat-2', 2, 13.3, 12, 'meeting-rooms', 'station'),
  wp('f2-meet-a-sw', 2, 7.6, 17.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-a-se', 2, 13.3, 17.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-b-door-n', 2, 19.3, 6, 'meeting-rooms', 'doorway'),
  wp('f2-meet-b-top', 2, 19.3, 8.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-b-nw', 2, 16.4, 8.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-b-ne', 2, 22.2, 8.5, 'meeting-rooms', 'corridor'),
  wp('f2-meet-b-seat-1', 2, 16.4, 12.5, 'meeting-rooms', 'station'),
  wp('f2-meet-b-seat-2', 2, 22.2, 12.5, 'meeting-rooms', 'station'),
  wp('f2-meet-b-sw', 2, 16.4, 17.5, 'meeting-rooms', 'corridor'),

  // Floor 3 — Corridor extra connectors
  wp('f3-cor-exec-w', 3, -19.5, 4, 'corridor', 'corridor'),
  wp('f3-cor-exec-b', 3, -10.3, 4, 'corridor', 'corridor'),
  wp('f3-cor-relax', 3, 10.5, 4, 'corridor', 'corridor'),
  wp('f3-cor-gym', 3, 19.3, 4, 'corridor', 'corridor'),

  // Floor 3 — Executive & Boardroom
  wp('f3-exec-door-s', 3, -19.5, 2, 'executive', 'doorway'),
  wp('f3-exec-board-door-s', 3, -10.3, 2, 'executive', 'doorway'),
  wp('f3-exec-door-e', 3, -6, -10, 'executive', 'doorway'),
  wp('f3-exec-door-int', 3, -14.85, -10, 'executive', 'doorway'),
  wp('f3-exec-aisle-n', 3, -16.8, -12.5, 'executive', 'corridor'),
  wp('f3-exec-aisle-m', 3, -16.8, -10.0, 'executive', 'corridor'),
  wp('f3-exec-aisle-s', 3, -16.8, -7.5, 'executive', 'corridor'),
  wp('f3-exec-aisle-ss', 3, -16.8, -2.5, 'executive', 'corridor'),
  wp('f3-desk-0', 3, -19.5, -12.5, 'executive', 'desk', 0),
  wp('f3-desk-1', 3, -19.5, -7.5, 'executive', 'desk', 1),
  wp('f3-desk-2', 3, -19.5, -2.5, 'executive', 'desk', 2),
  wp('f3-exec-board-1', 3, -13.2, -10, 'executive', 'station'),
  wp('f3-exec-board-2', 3, -7.4, -10, 'executive', 'station'),
  wp('f3-exec-board-sw', 3, -13.2, -4.5, 'executive', 'corridor'),
  wp('f3-exec-board-s', 3, -10.3, -4.5, 'executive', 'corridor'),
  wp('f3-exec-board-se', 3, -7.4, -4.5, 'executive', 'corridor'),

  // Floor 3 — Architecture
  wp('f3-arch-door-w', 3, 6, -10, 'architecture', 'doorway'),
  wp('f3-arch-door-s', 3, 15, 2, 'architecture', 'doorway'),
  wp('f3-arch-hub', 3, 15, -10, 'architecture', 'corridor'),
  wp('f3-arch-aisle-w', 3, 10.5, -10, 'architecture', 'corridor'),
  wp('f3-arch-aisle-e', 3, 19.5, -10, 'architecture', 'corridor'),
  wp('f3-arch-aisle-s', 3, 10.5, -4.5, 'architecture', 'corridor'),
  wp('f3-desk-3', 3, 10.5, -12.5, 'architecture', 'desk', 3),
  wp('f3-desk-4', 3, 19.5, -12.5, 'architecture', 'desk', 4),
  wp('f3-desk-21', 3, 15.0, -4.5, 'architecture', 'desk', 21),

  // Floor 3 — DevOps
  wp('f3-devops-door-n', 3, -15, 6, 'devops', 'doorway'),
  wp('f3-devops-door-e', 3, -6, 12, 'devops', 'doorway'),
  wp('f3-devops-hub', 3, -15, 11.2, 'devops', 'corridor'),
  wp('f3-devops-aisle-e', 3, -8.5, 12, 'devops', 'corridor'),
  wp('f3-devops-aisle-se', 3, -8.5, 17.2, 'devops', 'corridor'),
  wp('f3-desk-11', 3, -18.5, 11.2, 'devops', 'desk', 11),
  wp('f3-desk-22', 3, -10.5, 11.2, 'devops', 'desk', 22),
  wp('f3-desk-16', 3, -18.5, 17.2, 'devops', 'desk', 16),
  wp('f3-desk-12', 3, -14.5, 17.2, 'devops', 'desk', 12),
  wp('f3-desk-17', 3, -10.5, 17.2, 'devops', 'desk', 17),

  // Floor 3 — Relaxation
  wp('f3-relax-door-n', 3, 10.5, 6, 'relaxation', 'doorway'),
  wp('f3-relax-door-w', 3, 6, 12, 'relaxation', 'doorway'),
  wp('f3-relax-hub', 3, 10.5, 10.5, 'relaxation', 'station'),
  wp('f3-relax-sofa', 3, 7.5, 12, 'relaxation', 'station'),
  wp('f3-relax-sw', 3, 7.5, 17.8, 'relaxation', 'corridor'),
  wp('f3-relax-lounge', 3, 10.5, 17.8, 'relaxation', 'station'),

  // Floor 3 — Gym
  wp('f3-gym-door-n', 3, 19.3, 6, 'gym', 'doorway'),
  wp('f3-gym-hub', 3, 19.3, 9.5, 'gym', 'corridor'),
  wp('f3-gym-center', 3, 19.3, 14.8, 'gym', 'corridor'),
  wp('f3-gym-tm1', 3, 17.1, 14.8, 'gym', 'station'),
  wp('f3-gym-tm2', 3, 21.5, 14.8, 'gym', 'station'),
  wp('f3-gym-weights', 3, 19.3, 16.5, 'gym', 'station'),
];

const ALL_EDGES: readonly WaypointEdge[] = [
  ...buildCorridorEdges(1),
  ...buildCorridorEdges(2),
  ...buildCorridorEdges(3),

  // Inter-floor Elevator Shaft
  edge('f1-elev-cab', 'f2-elev-cab', 'elevator', 6),
  edge('f2-elev-cab', 'f3-elev-cab', 'elevator', 6),
  edge('f1-elev-cab', 'f3-elev-cab', 'elevator', 12),

  // Floor 1 — Cafeteria
  edge('f1-cor-n-w', 'f1-cafe-door-e', 'doorway'),
  edge('f1-cor-w-far', 'f1-cafe-door-s', 'doorway'),
  edge('f1-cafe-door-e', 'f1-cafe-hub', 'walk'),
  edge('f1-cafe-hub', 'f1-cafe-aisle-n', 'walk'),
  edge('f1-cafe-aisle-n', 'f1-cafe-coffee', 'walk'),
  edge('f1-cafe-hub', 'f1-cafe-aisle-m', 'walk'),
  edge('f1-cafe-aisle-m', 'f1-cafe-dine-1', 'walk'),
  edge('f1-cafe-aisle-m', 'f1-cafe-aisle-s', 'walk'),
  edge('f1-cafe-aisle-s', 'f1-cafe-dine-2', 'walk'),
  edge('f1-cafe-dine-2', 'f1-cafe-door-s', 'walk'),

  // Floor 1 — Musholla
  edge('f1-cor-n-e', 'f1-mush-door-w', 'doorway'),
  edge('f1-cor-e-far', 'f1-mush-door-s', 'doorway'),
  edge('f1-mush-door-w', 'f1-mush-hub', 'walk'),
  edge('f1-mush-hub', 'f1-mush-wudhu', 'walk'),
  edge('f1-mush-hub', 'f1-mush-pray-1', 'walk'),
  edge('f1-mush-pray-1', 'f1-mush-pray-2', 'walk'),
  edge('f1-mush-pray-1', 'f1-mush-door-s', 'walk'),

  // Floor 1 — Lobby
  edge('f1-elev-lobby', 'f1-lobby-center', 'walk'),
  edge('f1-cor-s-w', 'f1-lobby-center', 'walk'),
  edge('f1-cor-s-e', 'f1-lobby-center', 'walk'),
  edge('f1-lobby-center', 'f1-lobby-entrance', 'walk'),
  edge('f1-cor-w-far', 'f1-lobby-wait-w', 'walk'),
  edge('f1-lobby-wait-w', 'f1-cor-s-w', 'walk'),
  edge('f1-cor-e-far', 'f1-lobby-wait-e', 'walk'),
  edge('f1-lobby-wait-e', 'f1-cor-s-e', 'walk'),
  edge('f1-lobby-wait-e', 'f1-lobby-rec', 'walk'),
  edge('f1-cor-s-e', 'f1-lobby-rec', 'walk'),

  // Floor 2 — Corridor extra segments
  edge('f2-cor-se', 'f2-cor-meet-a', 'walk'),
  edge('f2-cor-meet-a', 'f2-cor-e-far', 'walk'),
  edge('f2-cor-e-far', 'f2-cor-meet-b', 'walk'),

  // Floor 2 — Engineering
  edge('f2-cor-n-w', 'f2-eng-door-e', 'doorway'),
  edge('f2-cor-w-far', 'f2-eng-door-s', 'doorway'),
  edge('f2-eng-door-e', 'f2-eng-hub', 'walk'),
  edge('f2-eng-hub', 'f2-eng-aisle-w', 'walk'),
  edge('f2-eng-hub', 'f2-eng-aisle-e', 'walk'),
  edge('f2-eng-hub', 'f2-desk-20', 'walk'),
  edge('f2-eng-hub', 'f2-eng-aisle-s', 'walk'),
  edge('f2-eng-aisle-w', 'f2-desk-18', 'walk'),
  edge('f2-eng-aisle-e', 'f2-desk-19', 'walk'),
  edge('f2-eng-aisle-s', 'f2-desk-5', 'walk'),
  edge('f2-eng-aisle-s', 'f2-desk-6', 'walk'),
  edge('f2-eng-aisle-s', 'f2-eng-door-s', 'walk'),

  // Floor 2 — QA
  edge('f2-cor-n-e', 'f2-qa-door-w', 'doorway'),
  edge('f2-cor-e-far', 'f2-qa-door-s', 'doorway'),
  edge('f2-qa-door-w', 'f2-qa-hub', 'walk'),
  edge('f2-qa-hub', 'f2-qa-aisle-w', 'walk'),
  edge('f2-qa-hub', 'f2-qa-aisle-e', 'walk'),
  edge('f2-qa-hub', 'f2-qa-aisle-s', 'walk'),
  edge('f2-qa-aisle-w', 'f2-desk-7', 'walk'),
  edge('f2-qa-aisle-e', 'f2-desk-8', 'walk'),
  edge('f2-qa-aisle-s', 'f2-desk-9', 'walk'),
  edge('f2-qa-aisle-s', 'f2-desk-10', 'walk'),
  edge('f2-qa-aisle-s', 'f2-qa-door-s', 'walk'),

  // Floor 2 — Lounge
  edge('f2-cor-w-far', 'f2-lounge-door-n', 'doorway'),
  edge('f2-cor-s-w', 'f2-lounge-door-e', 'doorway'),
  edge('f2-lounge-door-n', 'f2-lounge-hub', 'walk'),
  edge('f2-lounge-hub', 'f2-desk-13', 'walk'),
  edge('f2-lounge-hub', 'f2-desk-23', 'walk'),
  edge('f2-lounge-hub', 'f2-lounge-aisle-s', 'walk'),
  edge('f2-lounge-door-e', 'f2-lounge-aisle-e', 'walk'),
  edge('f2-lounge-aisle-e', 'f2-desk-23', 'walk'),
  edge('f2-lounge-aisle-s', 'f2-desk-14', 'walk'),
  edge('f2-lounge-aisle-s', 'f2-desk-15', 'walk'),

  // Floor 2 — Meeting Rooms
  edge('f2-cor-meet-a', 'f2-meet-a-door-n', 'doorway'),
  edge('f2-cor-s-e', 'f2-meet-a-door-w', 'doorway'),
  edge('f2-cor-meet-b', 'f2-meet-b-door-n', 'doorway'),
  edge('f2-meet-a-door-n', 'f2-meet-a-top', 'walk'),
  edge('f2-meet-a-top', 'f2-meet-a-nw', 'walk'),
  edge('f2-meet-a-top', 'f2-meet-a-ne', 'walk'),
  edge('f2-meet-a-nw', 'f2-meet-a-seat-1', 'walk'),
  edge('f2-meet-a-seat-1', 'f2-meet-a-door-w', 'walk'),
  edge('f2-meet-a-ne', 'f2-meet-a-seat-2', 'walk'),
  edge('f2-meet-a-seat-1', 'f2-meet-a-sw', 'walk'),
  edge('f2-meet-a-seat-2', 'f2-meet-a-se', 'walk'),
  edge('f2-meet-a-sw', 'f2-meet-a-se', 'walk'),
  edge('f2-meet-a-se', 'f2-meet-b-sw', 'doorway'),
  edge('f2-meet-b-door-n', 'f2-meet-b-top', 'walk'),
  edge('f2-meet-b-top', 'f2-meet-b-nw', 'walk'),
  edge('f2-meet-b-top', 'f2-meet-b-ne', 'walk'),
  edge('f2-meet-b-nw', 'f2-meet-b-seat-1', 'walk'),
  edge('f2-meet-b-ne', 'f2-meet-b-seat-2', 'walk'),
  edge('f2-meet-b-seat-1', 'f2-meet-b-sw', 'walk'),

  // Floor 3 — Corridor extra segments
  edge('f3-cor-w-far', 'f3-cor-exec-w', 'walk'),
  edge('f3-cor-w-far', 'f3-cor-exec-b', 'walk'),
  edge('f3-cor-exec-b', 'f3-cor-sw', 'walk'),
  edge('f3-cor-se', 'f3-cor-relax', 'walk'),
  edge('f3-cor-relax', 'f3-cor-e-far', 'walk'),
  edge('f3-cor-e-far', 'f3-cor-gym', 'walk'),

  // Floor 3 — Executive
  edge('f3-cor-exec-w', 'f3-exec-door-s', 'doorway'),
  edge('f3-cor-exec-b', 'f3-exec-board-door-s', 'doorway'),
  edge('f3-cor-n-w', 'f3-exec-door-e', 'doorway'),
  edge('f3-exec-door-s', 'f3-desk-2', 'walk'),
  edge('f3-desk-2', 'f3-exec-aisle-ss', 'walk'),
  edge('f3-exec-aisle-ss', 'f3-exec-aisle-s', 'walk'),
  edge('f3-exec-aisle-s', 'f3-desk-1', 'walk'),
  edge('f3-exec-aisle-s', 'f3-exec-aisle-m', 'walk'),
  edge('f3-exec-aisle-m', 'f3-exec-aisle-n', 'walk'),
  edge('f3-exec-aisle-n', 'f3-desk-0', 'walk'),
  edge('f3-exec-aisle-m', 'f3-exec-door-int', 'doorway'),
  edge('f3-exec-door-int', 'f3-exec-board-1', 'walk'),
  edge('f3-exec-door-e', 'f3-exec-board-2', 'walk'),
  edge('f3-exec-board-1', 'f3-exec-board-sw', 'walk'),
  edge('f3-exec-board-2', 'f3-exec-board-se', 'walk'),
  edge('f3-exec-board-sw', 'f3-exec-board-s', 'walk'),
  edge('f3-exec-board-se', 'f3-exec-board-s', 'walk'),
  edge('f3-exec-board-s', 'f3-exec-board-door-s', 'walk'),

  // Floor 3 — Architecture
  edge('f3-cor-n-e', 'f3-arch-door-w', 'doorway'),
  edge('f3-cor-e-far', 'f3-arch-door-s', 'doorway'),
  edge('f3-arch-door-w', 'f3-arch-hub', 'walk'),
  edge('f3-arch-hub', 'f3-arch-aisle-w', 'walk'),
  edge('f3-arch-hub', 'f3-arch-aisle-e', 'walk'),
  edge('f3-arch-aisle-w', 'f3-desk-3', 'walk'),
  edge('f3-arch-aisle-e', 'f3-desk-4', 'walk'),
  edge('f3-arch-aisle-w', 'f3-arch-aisle-s', 'walk'),
  edge('f3-arch-aisle-s', 'f3-desk-21', 'walk'),
  edge('f3-desk-21', 'f3-arch-door-s', 'walk'),

  // Floor 3 — DevOps
  edge('f3-cor-w-far', 'f3-devops-door-n', 'doorway'),
  edge('f3-cor-s-w', 'f3-devops-door-e', 'doorway'),
  edge('f3-devops-door-n', 'f3-devops-hub', 'walk'),
  edge('f3-devops-hub', 'f3-desk-11', 'walk'),
  edge('f3-devops-hub', 'f3-desk-22', 'walk'),
  edge('f3-devops-door-e', 'f3-devops-aisle-e', 'walk'),
  edge('f3-devops-aisle-e', 'f3-desk-22', 'walk'),
  edge('f3-devops-aisle-e', 'f3-devops-aisle-se', 'walk'),
  edge('f3-devops-aisle-se', 'f3-desk-17', 'walk'),
  edge('f3-desk-17', 'f3-desk-12', 'walk'),
  edge('f3-desk-12', 'f3-desk-16', 'walk'),

  // Floor 3 — Relaxation
  edge('f3-cor-relax', 'f3-relax-door-n', 'doorway'),
  edge('f3-cor-s-e', 'f3-relax-door-w', 'doorway'),
  edge('f3-relax-door-n', 'f3-relax-hub', 'walk'),
  edge('f3-relax-hub', 'f3-relax-sofa', 'walk'),
  edge('f3-relax-door-w', 'f3-relax-sofa', 'walk'),
  edge('f3-relax-sofa', 'f3-relax-sw', 'walk'),
  edge('f3-relax-sw', 'f3-relax-lounge', 'walk'),

  // Floor 3 — Gym
  edge('f3-cor-gym', 'f3-gym-door-n', 'doorway'),
  edge('f3-gym-door-n', 'f3-gym-hub', 'walk'),
  edge('f3-gym-hub', 'f3-gym-center', 'walk'),
  edge('f3-gym-center', 'f3-gym-tm1', 'walk'),
  edge('f3-gym-center', 'f3-gym-tm2', 'walk'),
  edge('f3-gym-center', 'f3-gym-weights', 'walk'),
];

export const WAYPOINT_GRAPH: NavigationGraph = {
  nodes: ALL_NODES,
  edges: ALL_EDGES,
};

export const WAYPOINT_BY_ID: ReadonlyMap<string, WaypointNode> = new Map(
  WAYPOINT_GRAPH.nodes.map((node) => [node.id, node]),
);

export const ZONE_STATION_WAYPOINTS: Record<ZoneId, readonly string[]> = {
  lobby: ['f1-lobby-center', 'f1-lobby-wait-w', 'f1-lobby-wait-e', 'f1-lobby-rec'],
  cafeteria: ['f1-cafe-coffee', 'f1-cafe-dine-1', 'f1-cafe-dine-2'],
  musholla: ['f1-mush-wudhu', 'f1-mush-pray-1', 'f1-mush-pray-2'],
  'meeting-rooms': [
    'f2-meet-a-seat-1',
    'f2-meet-a-seat-2',
    'f2-meet-b-seat-1',
    'f2-meet-b-seat-2',
  ],
  relaxation: ['f3-relax-hub', 'f3-relax-sofa', 'f3-relax-lounge'],
  gym: ['f3-gym-tm1', 'f3-gym-tm2', 'f3-gym-weights'],
  executive: ['f3-exec-board-1', 'f3-exec-board-2', 'f3-desk-0', 'f3-desk-1', 'f3-desk-2'],
  architecture: ['f3-desk-3', 'f3-desk-4', 'f3-desk-21'],
  engineering: ['f2-desk-5', 'f2-desk-6', 'f2-desk-18', 'f2-desk-19', 'f2-desk-20'],
  qa: ['f2-desk-7', 'f2-desk-8', 'f2-desk-9', 'f2-desk-10'],
  devops: ['f3-desk-11', 'f3-desk-12', 'f3-desk-16', 'f3-desk-17', 'f3-desk-22'],
  lounge: ['f2-desk-13', 'f2-desk-14', 'f2-desk-15', 'f2-desk-23'],
};

export function getDivisionZonesSummary() {
  return Object.values(DIVISION_BY_ID).map((d) => ({
    divisionId: d.id,
    floor: d.defaultFloor,
    zoneId: d.defaultZone === 'lounge' ? ('lounge' as ZoneId) : (d.id as ZoneId),
  }));
}

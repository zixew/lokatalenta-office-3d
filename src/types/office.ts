export type FloorNumber = 1 | 2 | 3;

export const FLOOR_Y: Record<FloorNumber, number> = {
  1: 0,
  2: 7,
  3: 14,
} as const;

export const FLOOR_HEIGHT = 7;

export type DivisionId =
  | 'executive'
  | 'architecture'
  | 'engineering'
  | 'qa'
  | 'devops'
  | 'lounge';

export type ZoneId =
  | 'lobby'
  | 'cafeteria'
  | 'musholla'
  | 'meeting-rooms'
  | 'relaxation'
  | 'gym'
  | 'executive'
  | 'architecture'
  | 'engineering'
  | 'qa'
  | 'devops'
  | 'lounge';

export type EventTargetZone =
  | 'workspace'
  | 'boardroom'
  | 'cafeteria'
  | 'lobby'
  | 'lounge'
  | 'gym'
  | 'musholla';

export type PovMode = 'overview' | 'third-person' | 'first-person';

export type LightingMode = 'day' | 'night';

export type TelemetryStatus = 'LIVE' | 'RECONNECTING' | 'SIMULATED';

export type AgentActivityState =
  | 'working'
  | 'walking'
  | 'meeting'
  | 'dining'
  | 'praying'
  | 'gym_workout'
  | 'lounging'
  | 'riding_elevator';

export type AgentCategory =
  | 'lead'
  | 'product'
  | 'tech'
  | 'qa'
  | 'ops'
  | 'pov'
  | 'sec'
  | 'design';

export type HairStyle =
  | 'slick'
  | 'parted'
  | 'neat'
  | 'pompadour'
  | 'messy'
  | 'fade'
  | 'long'
  | 'short'
  | 'spiky'
  | 'bald'
  | 'beanie'
  | 'ponytail'
  | 'bun'
  | 'shaved'
  | 'bob'
  | 'beard'
  | 'wavy';

export type AccessoryType =
  | 'gold_pin'
  | 'tie'
  | 'collar'
  | 'smartwatch'
  | 'bandana'
  | 'hoodie'
  | 'scarf'
  | 'badge'
  | 'tactical_watch'
  | 'lanyard'
  | 'pearl_necklace';

export type StatusTone = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose';

export interface AvatarStyle {
  readonly hair: string;
  readonly skin: string;
  readonly outfit: string;
  readonly hairStyle: HairStyle;
  readonly accessory?: AccessoryType;
  readonly glasses?: boolean;
  readonly headphones?: boolean;
}

export interface AgentSkills {
  readonly primary: readonly string[];
  readonly stack: readonly string[];
}

export interface DivisionConfig {
  readonly id: DivisionId;
  readonly name: string;
  readonly shortName: string;
  readonly motto: string;
  readonly color: string;
  readonly threeColor: number;
  readonly defaultFloor: FloorNumber;
  readonly defaultZone: 'workspace' | 'lounge';
  readonly agentIds: readonly number[];
}

export type DivisionContract = DivisionConfig;

export interface AgentProfile {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
  readonly role: string;
  readonly divisionId: DivisionId;
  readonly category: AgentCategory;
  readonly avatar: string;
  readonly skills: AgentSkills;
  readonly methodology: readonly string[];
  readonly certifications: readonly string[];
  readonly avatarStyle: AvatarStyle;
  readonly defaultZone: 'workspace' | 'lounge';
  readonly defaultFloor: FloorNumber;
}

export type AgentContract = AgentProfile;

export interface CollaborationPair {
  readonly id: number;
  readonly initiator: number;
  readonly target: number;
  readonly dialogueInitiator: string;
  readonly dialogueTarget: string;
  readonly taskDesc: string;
}

export interface ServiceContract {
  readonly id: string;
  readonly name: string;
  readonly localPath: string;
  readonly githubRepo: string;
  readonly githubUrl: string;
  readonly apiPort: number;
  readonly devUiPort: number | null;
  readonly baseUrl: string;
  readonly devUiUrl?: string;
  readonly wsUrl?: string;
  readonly sseUrl?: string;
  readonly healthPath: string;
}

export type EventSource =
  | 'backlog'
  | 'sprint-planner'
  | 'docs'
  | 'lms-psikotes'
  | 'github'
  | 'office-sim';

export type EventType =
  | 'backlog.updated'
  | 'sprint.updated'
  | 'doc.updated'
  | 'lms.activity'
  | 'agent.task.completed'
  | 'github.commit'
  | 'github.pr'
  | 'github.issue';

export type EventSeverity = 'info' | 'success' | 'warning' | 'alert';

export interface NormalizedEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly source: EventSource;
  readonly type: EventType;
  readonly divisionId: DivisionId;
  readonly agentId: number;
  readonly entityId: string | null;
  readonly title: string;
  readonly summary: string;
  readonly targetZone: EventTargetZone;
  readonly targetFloor: FloorNumber;
  readonly severity: EventSeverity;
  readonly metadata: Record<string, unknown>;
}

export type NormalizedTelemetryEvent = NormalizedEvent;

export interface ResolvedEventDestination {
  readonly zone: ZoneId;
  readonly floor: FloorNumber;
  readonly activity: AgentActivityState;
}

export interface GatewaySnapshot {
  readonly agents?: readonly Record<string, unknown>[];
  readonly divisions?: readonly Record<string, unknown>[];
  readonly recentEvents?: readonly NormalizedEvent[];
  readonly events?: readonly NormalizedEvent[];
  readonly stats?: Record<string, unknown>;
}

export interface TickerEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly title: string;
  readonly summary: string;
  readonly source: string;
  readonly divisionId: DivisionId;
  readonly agentId: number;
  readonly type?: EventType;
  readonly severity?: EventSeverity;
  readonly targetZone?: ZoneId;
  readonly targetFloor?: FloorNumber;
}

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface RectXZ {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export type ColliderKind = 'wall' | 'furniture' | 'elevator_wall';

export interface ColliderBox {
  readonly id: string;
  readonly floor: FloorNumber;
  readonly kind: ColliderKind;
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly label?: string;
}

export interface ZoneDefinition {
  readonly id: ZoneId;
  readonly floor: FloorNumber;
  readonly label: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly center: Vec3;
  readonly cameraPos: Vec3;
  readonly cameraTarget: Vec3;
  readonly accentHex: string;
  readonly threeColor: number;
  readonly primaryWaypointId: string;
}

export type ZoneBounds = ZoneDefinition;

export type WaypointKind =
  | 'corridor'
  | 'doorway'
  | 'elevator_lobby'
  | 'elevator_door'
  | 'elevator_cab'
  | 'desk'
  | 'station';

export interface WaypointNode {
  readonly id: string;
  readonly floor: FloorNumber;
  readonly position: Vec3;
  readonly zone: ZoneId | 'corridor' | 'elevator';
  readonly kind: WaypointKind;
  readonly agentId?: number;
}

export type WaypointEdgeKind = 'walk' | 'doorway' | 'elevator';

export interface WaypointEdge {
  readonly from: string;
  readonly to: string;
  readonly kind: WaypointEdgeKind;
  readonly cost?: number;
}

export interface NavigationGraph {
  readonly nodes: readonly WaypointNode[];
  readonly edges: readonly WaypointEdge[];
}

export type PathStepKind =
  | 'walk'
  | 'doorway'
  | 'elevator_board'
  | 'elevator_ride'
  | 'elevator_exit';

export interface PathWaypoint {
  readonly nodeId: string;
  readonly floor: FloorNumber;
  readonly position: Vec3;
  readonly stepKind: PathStepKind;
}

export interface PathResult {
  readonly reachable: boolean;
  readonly waypoints: readonly PathWaypoint[];
  readonly totalCost: number;
  readonly usesElevator: boolean;
}

export interface RoutineTarget {
  readonly agentId: number;
  readonly floor: FloorNumber;
  readonly zone: ZoneId;
  readonly activity: AgentActivityState;
  readonly waypointId: string;
  readonly taskSummary: string;
  readonly partnerId: number | null;
  readonly slotLabel: string;
}

export interface TelemetryOverride {
  readonly agentId: number;
  readonly floor: FloorNumber;
  readonly zone: ZoneId;
  readonly activity: AgentActivityState;
  readonly waypointId: string;
  readonly taskSummary: string;
  readonly eventId: string;
  readonly expiresAtMs: number;
}

export interface AgentScreenData {
  readonly file: string;
  readonly badge: string;
  readonly lines: readonly string[];
}

export interface AgentStatusDossier {
  readonly label: string;
  readonly tone: StatusTone;
  readonly action: string;
  readonly ticket: string;
  readonly file: string;
  readonly collaborators: string;
  readonly cleanArchReview: string;
  readonly opinion: string;
  readonly ac: readonly string[];
  readonly codeSnippet: string;
}

export interface AgentDossierData {
  readonly workload: number;
  readonly status: AgentStatusDossier;
  readonly screen: AgentScreenData;
}

export interface DivisionTargetItem {
  readonly code: string;
  readonly text: string;
  readonly status: string;
}

export interface DiagnosticSnapshot {
  readonly activeFloor: FloorNumber | 'all';
  readonly activePov: PovMode;
  readonly cameraPosition: Vec3;
  readonly cameraTarget: Vec3;
  readonly selectedAgentId: number | null;
  readonly telemetryStatus: TelemetryStatus;
  readonly recentTicker: readonly TickerEntry[];
  readonly agents: ReadonlyArray<{
    readonly id: number;
    readonly name: string;
    readonly divisionId: DivisionId;
    readonly floor: FloorNumber;
    readonly zone: ZoneId;
    readonly activity: AgentActivityState;
    readonly position: Vec3;
  }>;
  readonly zones: ReadonlyArray<{
    readonly id: ZoneId;
    readonly floor: FloorNumber;
    readonly label: string;
    readonly center: Vec3;
  }>;
  readonly elevatorFloor: FloorNumber;
  readonly elevatorState: 'idle' | 'doors_opening' | 'moving' | 'doors_closing';
  readonly lightingMode: LightingMode;
}

import { AGENTS, COLLABORATION_PAIRS, DIVISIONS } from './data/contracts.ts';
import { WAYPOINT_GRAPH, ZONES } from './data/buildingLayout.ts';
import { TelemetryClient } from './telemetry/telemetryClient.ts';

export function bootstrapOfficeFoundation(): {
  divisionsCount: number;
  agentsCount: number;
  collaborationPairsCount: number;
  zonesCount: number;
  waypointsCount: number;
} {
  return {
    divisionsCount: DIVISIONS.length,
    agentsCount: AGENTS.length,
    collaborationPairsCount: COLLABORATION_PAIRS.length,
    zonesCount: ZONES.length,
    waypointsCount: WAYPOINT_GRAPH.nodes.length,
  };
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('app');
  if (root) {
    const info = bootstrapOfficeFoundation();
    const client = new TelemetryClient({ enableSimulatedFallback: true });
    root.textContent = `LokaTalenta 3D Office Foundation (${info.divisionsCount} divisions, ${info.agentsCount} agents, ${info.zonesCount} zones, ${info.waypointsCount} waypoints) — Status: ${client.getSnapshot().status}`;
  }
}

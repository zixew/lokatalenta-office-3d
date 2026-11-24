import { BUILDING_COLLIDERS, WAYPOINT_GRAPH } from '../data/buildingLayout.ts';
import { segmentIntersectsAABB } from './collision.ts';
import type {
  ColliderBox,
  FloorNumber,
  NavigationGraph,
  PathResult,
  PathStepKind,
  PathWaypoint,
  Vec3,
  WaypointEdge,
  WaypointNode,
} from '../types/office.ts';

export interface AdjacencyEdge {
  readonly to: string;
  readonly kind: WaypointEdge['kind'];
  readonly cost: number;
}

export interface BuiltGraph {
  readonly nodeById: ReadonlyMap<string, WaypointNode>;
  readonly adjacency: ReadonlyMap<string, readonly AdjacencyEdge[]>;
}

function distanceXZ(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

export function buildAdjacency(graph: NavigationGraph): BuiltGraph {
  const nodeById = new Map<string, WaypointNode>();
  const adj = new Map<string, AdjacencyEdge[]>();

  for (const node of graph.nodes) {
    nodeById.set(node.id, node);
    adj.set(node.id, []);
  }

  for (const e of graph.edges) {
    const fromNode = nodeById.get(e.from);
    const toNode = nodeById.get(e.to);
    if (!fromNode || !toNode) continue;

    const computedCost =
      e.cost ??
      (e.kind === 'elevator'
        ? Math.max(6, Math.abs(fromNode.floor - toNode.floor) * 6)
        : distanceXZ(fromNode.position, toNode.position));

    adj.get(e.from)?.push({ to: e.to, kind: e.kind, cost: computedCost });
    adj.get(e.to)?.push({ to: e.from, kind: e.kind, cost: computedCost });
  }

  return { nodeById, adjacency: adj };
}

function segmentClearOfColliders(
  a: Vec3,
  b: Vec3,
  floor: FloorNumber,
  colliders: readonly ColliderBox[],
  padding = 0.15,
): boolean {
  for (const box of colliders) {
    if (box.floor !== floor) continue;
    if (segmentIntersectsAABB(a, b, box, padding)) {
      return false;
    }
  }
  return true;
}

export function findNearestWaypoint(
  pos: Vec3,
  floor: FloorNumber,
  graph: NavigationGraph = WAYPOINT_GRAPH,
  colliders: readonly ColliderBox[] = BUILDING_COLLIDERS,
): WaypointNode {
  const floorNodes = graph.nodes.filter((n) => n.floor === floor);
  if (floorNodes.length === 0) {
    throw new Error(`No waypoints defined for floor ${floor}`);
  }

  let bestClear: WaypointNode | null = null;
  let bestClearDist = Infinity;

  let bestAny: WaypointNode = floorNodes[0];
  let bestAnyDist = Infinity;

  for (const node of floorNodes) {
    const dist = distanceXZ(pos, node.position);
    if (dist < bestAnyDist) {
      bestAnyDist = dist;
      bestAny = node;
    }
    if (
      dist < bestClearDist &&
      segmentClearOfColliders(pos, node.position, floor, colliders, 0.1)
    ) {
      bestClearDist = dist;
      bestClear = node;
    }
  }

  return bestClear ?? bestAny;
}

function heuristic(a: WaypointNode, b: WaypointNode): number {
  return distanceXZ(a.position, b.position) + Math.abs(a.floor - b.floor) * 6;
}

function classifyStepKind(
  prevNode: WaypointNode | null,
  currNode: WaypointNode,
  edgeKind: WaypointEdge['kind'] | null,
): PathStepKind {
  if (edgeKind === 'elevator') {
    return 'elevator_ride';
  }
  if (currNode.kind === 'elevator_cab' && prevNode?.floor === currNode.floor) {
    return 'elevator_board';
  }
  if (
    prevNode?.kind === 'elevator_cab' &&
    currNode.kind === 'elevator_door' &&
    prevNode.floor === currNode.floor
  ) {
    return 'elevator_exit';
  }
  if (edgeKind === 'doorway' || currNode.kind === 'doorway') {
    return 'doorway';
  }
  return 'walk';
}

export function findPathByIds(
  startNodeId: string,
  goalNodeId: string,
  graph: NavigationGraph = WAYPOINT_GRAPH,
): PathResult {
  const built = buildAdjacency(graph);
  const startNode = built.nodeById.get(startNodeId);
  const goalNode = built.nodeById.get(goalNodeId);

  if (!startNode || !goalNode) {
    return { reachable: false, waypoints: [], totalCost: Infinity, usesElevator: false };
  }

  if (startNodeId === goalNodeId) {
    return {
      reachable: true,
      waypoints: [
        {
          nodeId: startNode.id,
          floor: startNode.floor,
          position: startNode.position,
          stepKind: 'walk',
        },
      ],
      totalCost: 0,
      usesElevator: false,
    };
  }

  const open = new Set<string>([startNodeId]);
  const cameFrom = new Map<string, { prevId: string; edgeKind: WaypointEdge['kind'] }>();
  const gScore = new Map<string, number>([[startNodeId, 0]]);
  const fScore = new Map<string, number>([[startNodeId, heuristic(startNode, goalNode)]]);

  while (open.size > 0) {
    let currentId: string | null = null;
    let lowestF = Infinity;

    for (const id of open) {
      const f = fScore.get(id) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        currentId = id;
      }
    }

    if (currentId === null) break;

    if (currentId === goalNodeId) {
      const nodeIds: string[] = [currentId];
      const edgeKinds: Array<WaypointEdge['kind'] | null> = [null];
      let trace = currentId;

      while (cameFrom.has(trace)) {
        const prev = cameFrom.get(trace)!;
        nodeIds.push(prev.prevId);
        edgeKinds[edgeKinds.length - 1] = prev.edgeKind;
        edgeKinds.push(null);
        trace = prev.prevId;
      }

      nodeIds.reverse();
      edgeKinds.reverse();

      const waypoints: PathWaypoint[] = [];
      let usesElevator = false;

      for (let i = 0; i < nodeIds.length; i++) {
        const node = built.nodeById.get(nodeIds[i])!;
        const prevNode = i > 0 ? built.nodeById.get(nodeIds[i - 1]) ?? null : null;
        const incomingEdgeKind = edgeKinds[i];
        const stepKind = classifyStepKind(prevNode, node, incomingEdgeKind);
        if (
          stepKind === 'elevator_board' ||
          stepKind === 'elevator_ride' ||
          stepKind === 'elevator_exit'
        ) {
          usesElevator = true;
        }
        waypoints.push({
          nodeId: node.id,
          floor: node.floor,
          position: node.position,
          stepKind,
        });
      }

      return {
        reachable: true,
        waypoints,
        totalCost: gScore.get(goalNodeId) ?? 0,
        usesElevator,
      };
    }

    open.delete(currentId);
    const currentG = gScore.get(currentId) ?? Infinity;
    const neighbors = built.adjacency.get(currentId) ?? [];

    for (const neighbor of neighbors) {
      const tentativeG = currentG + neighbor.cost;
      if (tentativeG < (gScore.get(neighbor.to) ?? Infinity)) {
        cameFrom.set(neighbor.to, { prevId: currentId, edgeKind: neighbor.kind });
        gScore.set(neighbor.to, tentativeG);
        const neighborNode = built.nodeById.get(neighbor.to)!;
        fScore.set(neighbor.to, tentativeG + heuristic(neighborNode, goalNode));
        open.add(neighbor.to);
      }
    }
  }

  return { reachable: false, waypoints: [], totalCost: Infinity, usesElevator: false };
}

export function findPath(
  startPos: Vec3,
  startFloor: FloorNumber,
  goalPos: Vec3,
  goalFloor: FloorNumber,
  graph: NavigationGraph = WAYPOINT_GRAPH,
  colliders: readonly ColliderBox[] = BUILDING_COLLIDERS,
): PathResult {
  const startNode = findNearestWaypoint(startPos, startFloor, graph, colliders);
  const goalNode = findNearestWaypoint(goalPos, goalFloor, graph, colliders);
  return findPathByIds(startNode.id, goalNode.id, graph);
}

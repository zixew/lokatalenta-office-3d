import { describe, expect, it } from 'vitest';
import {
  AGENT_DESK_ASSIGNMENTS,
  BUILDING_COLLIDERS,
  WAYPOINT_BY_ID,
  WAYPOINT_GRAPH,
  ZONES,
} from '../src/data/buildingLayout.ts';
import {
  clampPlayerPosition,
  isWalkable,
  resolveCollision,
  segmentIntersectsAABB,
} from '../src/navigation/collision.ts';
import { findPath, findPathByIds } from '../src/navigation/pathfinder.ts';
import { FLOOR_Y } from '../src/types/office.ts';

describe('Building Layout, Collision & Corridor+Elevator Pathfinder', () => {
  it('places every waypoint node in walkable space without overlapping any collider', () => {
    for (const node of WAYPOINT_GRAPH.nodes) {
      const ok = isWalkable(node.position, node.floor, BUILDING_COLLIDERS, 0.25);
      expect(ok, `Node ${node.id} on floor ${node.floor} collided`).toBe(true);
    }
  });

  it('guarantees zero same-floor edges intersect any collider (no wall/furniture clipping)', () => {
    for (const edge of WAYPOINT_GRAPH.edges) {
      const a = WAYPOINT_BY_ID.get(edge.from);
      const b = WAYPOINT_BY_ID.get(edge.to);
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      if (!a || !b) continue;
      if (edge.kind === 'elevator' || a.floor !== b.floor) continue;

      for (const box of BUILDING_COLLIDERS) {
        if (box.floor !== a.floor) continue;
        const hits = segmentIntersectsAABB(a.position, b.position, box, 0.15);
        expect(
          hits,
          `Edge ${edge.from} -> ${edge.to} on F${a.floor} intersects collider ${box.id}`,
        ).toBe(false);
      }
    }
  });

  it('connects 100% of nodes across all 3 floors and reaches all 12 zones from every agent desk', () => {
    const startId = WAYPOINT_GRAPH.nodes[0].id;
    for (const node of WAYPOINT_GRAPH.nodes) {
      const res = findPathByIds(startId, node.id, WAYPOINT_GRAPH);
      expect(res.reachable, `Node ${node.id} unreachable from ${startId}`).toBe(true);
    }

    for (const desk of AGENT_DESK_ASSIGNMENTS) {
      for (const zone of ZONES) {
        const res = findPath(
          desk.deskPos,
          desk.floor,
          zone.center,
          zone.floor,
          WAYPOINT_GRAPH,
          BUILDING_COLLIDERS,
        );
        expect(
          res.reachable,
          `Zone ${zone.id} unreachable from agent ${desk.agentId}`,
        ).toBe(true);
      }
    }
  });

  it('uses central elevator transitions when navigating between floors', () => {
    const f2ToF1 = findPathByIds('f2-desk-5', 'f1-cafe-coffee', WAYPOINT_GRAPH);
    expect(f2ToF1.reachable).toBe(true);
    expect(f2ToF1.usesElevator).toBe(true);
    expect(f2ToF1.waypoints.some((w) => w.nodeId === 'f2-elev-cab')).toBe(true);
    expect(f2ToF1.waypoints.some((w) => w.nodeId === 'f1-elev-cab')).toBe(true);
    expect(f2ToF1.waypoints.some((w) => w.stepKind === 'elevator_ride')).toBe(true);

    const f2ToF3 = findPathByIds('f2-desk-8', 'f3-gym-tm1', WAYPOINT_GRAPH);
    expect(f2ToF3.reachable).toBe(true);
    expect(f2ToF3.usesElevator).toBe(true);
    expect(f2ToF3.waypoints.some((w) => w.nodeId === 'f2-elev-cab')).toBe(true);
    expect(f2ToF3.waypoints.some((w) => w.nodeId === 'f3-elev-cab')).toBe(true);

    const sameFloor = findPathByIds('f2-desk-5', 'f2-desk-6', WAYPOINT_GRAPH);
    expect(sameFloor.reachable).toBe(true);
    expect(sameFloor.usesElevator).toBe(false);
  });

  it('prevents first-person wall tunneling and supports axis wall sliding + collision ejection', () => {
    // Near F2 Engineering East wall at x = -6.0, z = -15.0 (wall blocks x in [-6.15, -5.85])
    const prev = { x: -4.5, y: FLOOR_Y[2], z: -15.0 };
    const attemptedTunnel = { x: -7.5, y: FLOOR_Y[2], z: -14.0 };
    const clamped = clampPlayerPosition(prev, attemptedTunnel, 2, BUILDING_COLLIDERS, 0.45);
    expect(clamped.x).toBeGreaterThan(-5.85);
    expect(clamped.z).toBeCloseTo(-14.0, 2);

    // Overlapping inside desk #5 (-19.5, -6.5) should eject cleanly
    const overlapping = { x: -19.5, y: FLOOR_Y[2], z: -6.5 };
    const ejected = resolveCollision(overlapping, 2, BUILDING_COLLIDERS, 0.35);
    expect(isWalkable(ejected, 2, BUILDING_COLLIDERS, 0.34)).toBe(true);
  });
});

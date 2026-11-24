import { WALKABLE_BOUNDS } from '../data/buildingLayout.ts';
import type { ColliderBox, FloorNumber, RectXZ, Vec3 } from '../types/office.ts';

export function segmentIntersectsAABB(
  a: Vec3,
  b: Vec3,
  box: ColliderBox,
  padding = 0,
): boolean {
  const minSegY = Math.min(a.y, b.y);
  const maxSegY = Math.max(a.y, b.y);
  if (box.maxY + padding < minSegY || box.minY - padding > maxSegY) {
    return false;
  }

  const minX = box.minX - padding;
  const maxX = box.maxX + padding;
  const minZ = box.minZ - padding;
  const maxZ = box.maxZ + padding;

  const dx = b.x - a.x;
  const dz = b.z - a.z;

  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dz, dz];
  const q = [a.x - minX, maxX - a.x, a.z - minZ, maxZ - a.z];

  for (let i = 0; i < 4; i++) {
    const pi = p[i];
    const qi = q[i];
    if (Math.abs(pi) < 1e-9) {
      if (qi < 0) return false;
    } else {
      const r = qi / pi;
      if (pi < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }

  return t0 <= t1;
}

export function pointInsideBoxXZ(pos: Vec3, box: ColliderBox, radius = 0): boolean {
  return (
    pos.x >= box.minX - radius &&
    pos.x <= box.maxX + radius &&
    pos.z >= box.minZ - radius &&
    pos.z <= box.maxZ + radius
  );
}

export function clampToBoundsXZ(pos: Vec3, bounds: RectXZ = WALKABLE_BOUNDS): Vec3 {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
    y: pos.y,
    z: Math.max(bounds.minZ, Math.min(bounds.maxZ, pos.z)),
  };
}

export function isWalkable(
  pos: Vec3,
  floor: FloorNumber,
  colliders: readonly ColliderBox[],
  radius = 0.35,
  bounds: RectXZ = WALKABLE_BOUNDS,
): boolean {
  if (
    pos.x < bounds.minX ||
    pos.x > bounds.maxX ||
    pos.z < bounds.minZ ||
    pos.z > bounds.maxZ
  ) {
    return false;
  }

  for (const box of colliders) {
    if (box.floor !== floor) continue;
    if (pointInsideBoxXZ(pos, box, radius)) {
      return false;
    }
  }

  return true;
}

export function resolveCollision(
  pos: Vec3,
  floor: FloorNumber,
  colliders: readonly ColliderBox[],
  radius = 0.35,
  bounds: RectXZ = WALKABLE_BOUNDS,
): Vec3 {
  let current = clampToBoundsXZ(pos, bounds);

  for (let iter = 0; iter < 3; iter++) {
    let adjusted = false;
    for (const box of colliders) {
      if (box.floor !== floor) continue;
      const minX = box.minX - radius;
      const maxX = box.maxX + radius;
      const minZ = box.minZ - radius;
      const maxZ = box.maxZ + radius;

      if (
        current.x > minX &&
        current.x < maxX &&
        current.z > minZ &&
        current.z < maxZ
      ) {
        const penLeft = current.x - minX;
        const penRight = maxX - current.x;
        const penTop = current.z - minZ;
        const penBottom = maxZ - current.z;

        const minPen = Math.min(penLeft, penRight, penTop, penBottom);
        const eps = 1e-4;
        if (minPen === penLeft) {
          current = { ...current, x: minX - eps };
        } else if (minPen === penRight) {
          current = { ...current, x: maxX + eps };
        } else if (minPen === penTop) {
          current = { ...current, z: minZ - eps };
        } else {
          current = { ...current, z: maxZ + eps };
        }
        current = clampToBoundsXZ(current, bounds);
        adjusted = true;
      }
    }
    if (!adjusted) break;
  }

  return current;
}

function crossesBlockingWall(
  a: Vec3,
  b: Vec3,
  floor: FloorNumber,
  colliders: readonly ColliderBox[],
  padding: number,
): boolean {
  for (const box of colliders) {
    if (box.floor !== floor) continue;
    if (box.kind !== 'wall' && box.kind !== 'elevator_wall') continue;
    if (segmentIntersectsAABB(a, b, box, padding)) {
      return true;
    }
  }
  return false;
}

export function clampPlayerPosition(
  prevPos: Vec3,
  nextPos: Vec3,
  floor: FloorNumber,
  colliders: readonly ColliderBox[],
  radius = 0.45,
  bounds: RectXZ = WALKABLE_BOUNDS,
): Vec3 {
  const resolved = resolveCollision(nextPos, floor, colliders, radius, bounds);
  const segPad = radius * 0.5;

  if (!crossesBlockingWall(prevPos, resolved, floor, colliders, segPad)) {
    return resolved;
  }

  // Try X-only wall slide
  const slideX = resolveCollision(
    { x: nextPos.x, y: prevPos.y, z: prevPos.z },
    floor,
    colliders,
    radius,
    bounds,
  );
  if (
    !crossesBlockingWall(prevPos, slideX, floor, colliders, segPad) &&
    isWalkable(slideX, floor, colliders, radius * 0.85, bounds)
  ) {
    return slideX;
  }

  // Try Z-only wall slide
  const slideZ = resolveCollision(
    { x: prevPos.x, y: prevPos.y, z: nextPos.z },
    floor,
    colliders,
    radius,
    bounds,
  );
  if (
    !crossesBlockingWall(prevPos, slideZ, floor, colliders, segPad) &&
    isWalkable(slideZ, floor, colliders, radius * 0.85, bounds)
  ) {
    return slideZ;
  }

  return prevPos;
}

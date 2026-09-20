import type { Point } from '../core/dungeonTypes';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function gridToWorld(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
): { x: number; z: number } {
  return {
    x: x - (mapWidth - 1) / 2,
    z: y - (mapHeight - 1) / 2,
  };
}

export function pointInRoom(
  point: Point,
  room: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    point.x >= room.x &&
    point.x < room.x + room.width &&
    point.y >= room.y &&
    point.y < room.y + room.height
  );
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export type GridCell = 0 | 1 | 2 | 3;

export const CELL = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR: 3,
} as const satisfies Record<string, GridCell>;

export interface Point {
  x: number;
  y: number;
}

export interface Room {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  area: number;
}

export interface Corridor {
  id: number;
  fromRoom: number;
  toRoom: number;
  path: Point[];
  width: number;
  length: number;
}

export type DoorOrientation = 'horizontal' | 'vertical';

export interface Door {
  id: number;
  roomA: number;
  roomB: number;
  x: number;
  y: number;
  orientation: DoorOrientation;
}

export type PropType = 'torch' | 'chest' | 'pillar' | 'rubble' | 'cobweb' | 'moss';

export interface PropMetadata {
  brightness?: number;
  variant?: number;
  note?: string;
}

export interface DungeonProp {
  id: string;
  type: PropType;
  x: number;
  y: number;
  roomId?: number;
  rotation: number;
  scale: number;
  metadata: PropMetadata;
}

export interface DungeonStats {
  roomCount: number;
  corridorCount: number;
  doorCount: number;
  torchCount: number;
  chestCount: number;
  propCount: number;
  floorCellCount: number;
  wallCellCount: number;
  generationTimeMs: number;
}

export interface DungeonData {
  version: 1;
  seed: string;
  width: number;
  height: number;
  grid: GridCell[][];
  rooms: Room[];
  corridors: Corridor[];
  doors: Door[];
  props: DungeonProp[];
  stats: DungeonStats;
  generationTimeMs: number;
}

export interface DungeonDataOptions {
  width?: number;
  height?: number;
  targetRooms?: number;
}

export type SelectableKind = 'room' | 'door' | 'torch' | 'chest' | 'pillar' | 'prop';

export interface SelectionInfo {
  kind: SelectableKind;
  id: string;
  title: string;
  details: string[];
  center: { x: number; y: number; z: number };
  radius: number;
}

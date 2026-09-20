import { createSeededRandom, type SeededRandom } from './random';
import {
  CELL,
  type Corridor,
  type Door,
  type DoorOrientation,
  type DungeonData,
  type DungeonDataOptions,
  type DungeonProp,
  type GridCell,
  type Point,
  type PropType,
  type Room,
} from './dungeonTypes';
import { distance as pointDistance, pointInRoom } from '../utils/math';

interface RoomEdge {
  a: number;
  b: number;
  weight: number;
}

interface DoorCandidate {
  x: number;
  y: number;
  orientation: DoorOrientation;
}

const ROOM_PADDING = 3;
const CORRIDOR_WIDTH = 2;

function createGrid(width: number, height: number): GridCell[][] {
  return Array.from({ length: height }, () => Array<GridCell>(width).fill(CELL.EMPTY));
}

function roomOverlaps(candidate: Room, rooms: readonly Room[]): boolean {
  return rooms.some((room) => {
    const separated =
      candidate.x + candidate.width + ROOM_PADDING <= room.x ||
      room.x + room.width + ROOM_PADDING <= candidate.x ||
      candidate.y + candidate.height + ROOM_PADDING <= room.y ||
      room.y + room.height + ROOM_PADDING <= candidate.y;
    return !separated;
  });
}

/** Place room rectangles using rejection sampling so no rectangles overlap. */
function placeRooms(
  random: SeededRandom,
  width: number,
  height: number,
  targetCount: number,
): Room[] {
  const rooms: Room[] = [];
  const maxAttempts = targetCount * 18;
  const margin = 4;

  for (let attempt = 0; attempt < maxAttempts && rooms.length < targetCount; attempt += 1) {
    const roomWidth = random.int(5, 10);
    const roomHeight = random.int(5, 9);
    const x = random.int(margin, width - roomWidth - margin);
    const y = random.int(margin, height - roomHeight - margin);
    const candidate: Room = {
      id: rooms.length,
      x,
      y,
      width: roomWidth,
      height: roomHeight,
      centerX: x + Math.floor(roomWidth / 2),
      centerY: y + Math.floor(roomHeight / 2),
      area: roomWidth * roomHeight,
    };

    if (!roomOverlaps(candidate, rooms)) {
      rooms.push(candidate);
    }
  }

  rooms.sort((a, b) => a.y - b.y || a.x - b.x);
  return rooms.map((room, id) => ({ ...room, id }));
}

function makeEdges(rooms: readonly Room[]): RoomEdge[] {
  const edges: RoomEdge[] = [];
  for (let first = 0; first < rooms.length; first += 1) {
    const roomA = rooms[first];
    if (!roomA) continue;
    for (let second = first + 1; second < rooms.length; second += 1) {
      const roomB = rooms[second];
      if (!roomB) continue;
      edges.push({
        a: first,
        b: second,
        weight: pointDistance(
          { x: roomA.centerX, y: roomA.centerY },
          { x: roomB.centerX, y: roomB.centerY },
        ),
      });
    }
  }
  return edges;
}

/**
 * Prim's minimum spanning tree guarantees every room is reachable. A small
 * number of extra edges are then added to avoid a rigid tree-shaped dungeon.
 */
function connectRooms(
  rooms: readonly Room[],
  random: SeededRandom,
): Array<[number, number]> {
  if (rooms.length < 2) return [];

  const edges = makeEdges(rooms);
  const connected = new Set<number>([0]);
  const connections: Array<[number, number]> = [];
  const connectionKeys = new Set<string>();

  while (connected.size < rooms.length) {
    let best: RoomEdge | null = null;
    for (const edge of edges) {
      const aConnected = connected.has(edge.a);
      const bConnected = connected.has(edge.b);
      if (aConnected === bConnected) continue;
      if (!best || edge.weight < best.weight || (edge.weight === best.weight && edge.a < best.a)) {
        best = edge;
      }
    }

    if (!best) break;
    connected.add(best.a);
    connected.add(best.b);
    connections.push([best.a, best.b]);
    connectionKeys.add(`${best.a}-${best.b}`);
  }

  const extraEdges = random.shuffle(edges).filter((edge) => !connectionKeys.has(`${edge.a}-${edge.b}`));
  const extraCount = Math.min(extraEdges.length, Math.max(1, Math.floor(rooms.length * 0.18)));
  for (let index = 0; index < extraCount; index += 1) {
    const edge = extraEdges[index];
    if (!edge) continue;
    connections.push([edge.a, edge.b]);
  }

  return connections;
}

/** Build an orthogonal, one-bend corridor that is easy to validate and mesh. */
function buildPath(from: Point, to: Point, horizontalFirst: boolean): Point[] {
  const path: Point[] = [{ ...from }];
  let cursor = { ...from };

  const moveX = (): void => {
    const step = Math.sign(to.x - cursor.x);
    while (cursor.x !== to.x) {
      cursor = { x: cursor.x + step, y: cursor.y };
      path.push(cursor);
    }
  };

  const moveY = (): void => {
    const step = Math.sign(to.y - cursor.y);
    while (cursor.y !== to.y) {
      cursor = { x: cursor.x, y: cursor.y + step };
      path.push(cursor);
    }
  };

  if (horizontalFirst) {
    moveX();
    moveY();
  } else {
    moveY();
    moveX();
  }

  return path;
}

function carveCorridor(grid: GridCell[][], path: readonly Point[], width: number): void {
  for (let index = 0; index < path.length; index += 1) {
    const current = path[index];
    const previous = path[Math.max(0, index - 1)];
    const next = path[Math.min(path.length - 1, index + 1)];
    if (!current || !previous || !next) continue;

    const horizontalTravel = previous.y === next.y;
    for (let offset = 0; offset < width; offset += 1) {
      const x = current.x + (horizontalTravel ? 0 : offset);
      const y = current.y + (horizontalTravel ? offset : 0);
      if (grid[y]?.[x] !== undefined && grid[y]?.[x] !== CELL.WALL) {
        const row = grid[y];
        if (row) row[x] = CELL.FLOOR;
      }
    }
  }
}

function findExitDoor(path: readonly Point[], room: Room): DoorCandidate | null {
  for (let index = 1; index < path.length; index += 1) {
    const point = path[index];
    const previous = path[index - 1];
    if (!point || !previous) continue;
    if (!pointInRoom(point, room) && pointInRoom(previous, room)) {
      return {
        x: previous.x,
        y: previous.y,
        orientation: point.x !== previous.x ? 'vertical' : 'horizontal',
      };
    }
  }
  return null;
}

function findEntryDoor(path: readonly Point[], room: Room): DoorCandidate | null {
  for (let index = path.length - 2; index >= 0; index -= 1) {
    const point = path[index];
    const next = path[index + 1];
    if (!point || !next) continue;
    if (pointInRoom(point, room) && !pointInRoom(next, room)) {
      return {
        x: point.x,
        y: point.y,
        orientation: next.x !== point.x ? 'vertical' : 'horizontal',
      };
    }
  }
  return null;
}

/** Dilate walkable cells by one cell to create the stone wall shell. */
function computeWalls(grid: GridCell[][]): void {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const walls: Point[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (grid[y]?.[x] !== CELL.EMPTY) continue;
      const neighbors = [
        grid[y - 1]?.[x],
        grid[y + 1]?.[x],
        grid[y]?.[x - 1],
        grid[y]?.[x + 1],
      ];
      if (neighbors.some((cell) => cell === CELL.FLOOR || cell === CELL.DOOR)) {
        walls.push({ x, y });
      }
    }
  }

  for (const wall of walls) {
    const row = grid[wall.y];
    if (row) row[wall.x] = CELL.WALL;
  }
}

function addProp(
  props: DungeonProp[],
  occupied: Set<string>,
  roomId: number | undefined,
  type: PropType,
  x: number,
  y: number,
  random: SeededRandom,
  scaleMin: number,
  scaleMax: number,
): void {
  const key = `${x}:${y}`;
  if (occupied.has(key)) return;
  occupied.add(key);
  props.push({
    id: `${type}-${props.length}`,
    type,
    x,
    y,
    roomId,
    rotation: random.float(0, Math.PI * 2),
    scale: random.float(scaleMin, scaleMax),
    metadata: {
      variant: random.int(0, 3),
      brightness: type === 'torch' ? random.float(0.9, 1.25) : undefined,
    },
  });
}

function pointHasWallNeighbor(grid: GridCell[][], point: Point): boolean {
  return (
    grid[point.y - 1]?.[point.x] === CELL.WALL ||
    grid[point.y + 1]?.[point.x] === CELL.WALL ||
    grid[point.y]?.[point.x - 1] === CELL.WALL ||
    grid[point.y]?.[point.x + 1] === CELL.WALL
  );
}

function addRoomProps(
  grid: GridCell[][],
  rooms: readonly Room[],
  random: SeededRandom,
): DungeonProp[] {
  const props: DungeonProp[] = [];
  const occupied = new Set<string>();

  for (const room of rooms) {
    const wallCandidates: Point[] = [];
    for (let x = room.x + 1; x < room.x + room.width - 1; x += 1) {
      wallCandidates.push({ x, y: room.y }, { x, y: room.y + room.height - 1 });
    }
    for (let y = room.y + 1; y < room.y + room.height - 1; y += 1) {
      wallCandidates.push({ x: room.x, y }, { x: room.x + room.width - 1, y });
    }

    const validWallPoints = wallCandidates.filter(
      (point) =>
        grid[point.y]?.[point.x] === CELL.FLOOR && pointHasWallNeighbor(grid, point),
    );
    const desiredTorches = Math.min(3, Math.max(1, Math.floor(room.width / 4)));
    const torchPoints = random.shuffle(validWallPoints);

    for (let index = 0; index < Math.min(desiredTorches, torchPoints.length); index += 1) {
      const point = torchPoints[index];
      if (point) addProp(props, occupied, room.id, 'torch', point.x, point.y, random, 0.88, 1.12);
    }

    const roomLargeEnough = room.width >= 7 && room.height >= 6;
    if (random.bool(roomLargeEnough ? 0.72 : 0.42)) {
      const cornerCandidates = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.width - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.height - 2 },
        { x: room.x + room.width - 2, y: room.y + room.height - 2 },
      ];
      const chestPoint = random.pick(cornerCandidates);
      addProp(props, occupied, room.id, 'chest', chestPoint.x, chestPoint.y, random, 0.88, 1.08);
    }

    if (roomLargeEnough && random.bool(0.68)) {
      const center = { x: room.centerX, y: room.centerY };
      addProp(props, occupied, room.id, 'pillar', center.x, center.y, random, 0.88, 1.15);
    }
  }

  const floorCells: Point[] = [];
  for (let y = 0; y < grid.length; y += 1) {
    const row = grid[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === CELL.FLOOR && random.bool(0.12)) floorCells.push({ x, y });
    }
  }

  const shuffledCells = random.shuffle(floorCells);
  const decorationTarget = Math.min(70, Math.floor(shuffledCells.length * 0.08));
  for (let index = 0; index < decorationTarget; index += 1) {
    const point = shuffledCells[index];
    if (!point) continue;
    const roomId = rooms.find((room) => pointInRoom(point, room))?.id;
    const roll = random.next();
    const type: PropType = roll < 0.48 ? 'rubble' : roll < 0.76 ? 'moss' : 'cobweb';
    addProp(props, occupied, roomId, type, point.x, point.y, random, 0.55, 1.2);
  }

  return props;
}

export function generateDungeon(
  seed: string | number,
  options: DungeonDataOptions = {},
): DungeonData {
  const startedAt = performance.now();
  const normalizedSeed = String(seed);
  const random = createSeededRandom(normalizedSeed);
  const width = options.width ?? random.int(58, 72);
  const height = options.height ?? random.int(46, 62);
  const targetRooms = options.targetRooms ?? random.int(8, 12);
  const grid = createGrid(width, height);
  const rooms = placeRooms(random, width, height, targetRooms);
  const roomConnections = connectRooms(rooms, random);
  const corridors: Corridor[] = [];
  const doorCandidates: Array<{ candidate: DoorCandidate; roomA: number; roomB: number }> = [];

  for (let index = 0; index < roomConnections.length; index += 1) {
    const connection = roomConnections[index];
    if (!connection) continue;
    const roomA = rooms[connection[0]];
    const roomB = rooms[connection[1]];
    if (!roomA || !roomB) continue;

    const path = buildPath(
      { x: roomA.centerX, y: roomA.centerY },
      { x: roomB.centerX, y: roomB.centerY },
      random.bool(),
    );
    carveCorridor(grid, path, CORRIDOR_WIDTH);
    corridors.push({
      id: corridors.length,
      fromRoom: roomA.id,
      toRoom: roomB.id,
      path,
      width: CORRIDOR_WIDTH,
      length: path.length,
    });

    const exitDoor = findExitDoor(path, roomA);
    const entryDoor = findEntryDoor(path, roomB);
    if (exitDoor) doorCandidates.push({ candidate: exitDoor, roomA: roomA.id, roomB: roomB.id });
    if (entryDoor) doorCandidates.push({ candidate: entryDoor, roomA: roomA.id, roomB: roomB.id });
  }

  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      const row = grid[y];
      if (!row) continue;
      for (let x = room.x; x < room.x + room.width; x += 1) row[x] = CELL.FLOOR;
    }
  }

  const doorKeys = new Set<string>();
  const doors: Door[] = [];
  for (const item of doorCandidates) {
    const key = `${item.candidate.x}:${item.candidate.y}`;
    if (doorKeys.has(key)) continue;
    doorKeys.add(key);
    doors.push({
      id: doors.length,
      roomA: item.roomA,
      roomB: item.roomB,
      x: item.candidate.x,
      y: item.candidate.y,
      orientation: item.candidate.orientation,
    });
  }

  for (const door of doors) {
    const row = grid[door.y];
    if (row) row[door.x] = CELL.DOOR;
  }

  computeWalls(grid);
  const props = addRoomProps(grid, rooms, random);
  let floorCellCount = 0;
  let wallCellCount = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === CELL.FLOOR || cell === CELL.DOOR) floorCellCount += 1;
      if (cell === CELL.WALL) wallCellCount += 1;
    }
  }

  const generationTimeMs = Number((performance.now() - startedAt).toFixed(3));
  const torchCount = props.filter((prop) => prop.type === 'torch').length;
  const chestCount = props.filter((prop) => prop.type === 'chest').length;

  return {
    version: 1,
    seed: normalizedSeed,
    width,
    height,
    grid,
    rooms,
    corridors,
    doors,
    props,
    generationTimeMs,
    stats: {
      roomCount: rooms.length,
      corridorCount: corridors.length,
      doorCount: doors.length,
      torchCount,
      chestCount,
      propCount: props.length,
      floorCellCount,
      wallCellCount,
      generationTimeMs,
    },
  };
}

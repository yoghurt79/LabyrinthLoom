import {
  Box3,
  Box3Helper,
  BoxGeometry,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  PlaneGeometry,
  PointLight,
  Vector3,
  type Intersection,
  type Material,
} from 'three';
import { CELL, type DungeonData, type DungeonProp, type PropType, type Room, type SelectableKind } from '../core/dungeonTypes';
import { createDungeonMaterials, type DungeonMaterials } from './Materials';
import { gridToWorld } from '../utils/math';

export interface DungeonPickTarget {
  kind: SelectableKind;
  id: string;
  title: string;
  details: string[];
  center: Vector3;
  size: Vector3;
}
interface TorchAnimation {
  light: PointLight;
  baseIntensity: number;
  phase: number;
}

const FLOOR_Y = 0.09;
const WALL_HEIGHT = 3.45;
const CEILING_HEIGHT = 3.58;
const MAX_TORCH_LIGHTS = 6;
function createInstanced(
  geometry: BufferGeometry,
  material: Material,
  count: number,
  name: string,
): InstancedMesh {
  const mesh = new InstancedMesh(geometry, material, count);
  mesh.name = name;
  return mesh;
}

function configureShadow(mesh: Object3D, cast = true, receive = true): void {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
}

function disposeObject(root: Object3D): void {
  root.traverse((object) => {
    const geometry = (object as { geometry?: BufferGeometry }).geometry;
    if (geometry instanceof BufferGeometry) geometry.dispose();
  });
  root.removeFromParent();
}

export class DungeonBuilder {
  readonly root = new Group();
  readonly pickables: Object3D[] = [];
  readonly torchAnimations: TorchAnimation[] = [];

  private data: DungeonData | null = null;
  private materials: DungeonMaterials | null = null;
  private ceilingGroup: Group | null = null;
  private selectionHelper: Box3Helper | null = null;
  private pickMaterial: MeshBasicMaterial | null = null;
  private selectedTarget: DungeonPickTarget | null = null;
  private readonly dummy = new Object3D();
  private wireframeEnabled = false;

  constructor(scene: import('three').Scene) {
    this.root.name = 'Dungeon';
    scene.add(this.root);
  }

  build(data: DungeonData): void {
    this.clear();
    this.data = data;
    this.materials = createDungeonMaterials(data.seed, 4);
    this.buildArchitecture(data, this.materials);
    this.buildDoors(data, this.materials);
    this.buildProps(data, this.materials);
    this.buildRoomPickers(data);
    this.setWireframe(this.wireframeEnabled);
  }

  private clear(): void {
    for (const child of [...this.root.children]) disposeObject(child);
    this.pickables.length = 0;
    this.torchAnimations.length = 0;
    this.selectionHelper = null;
    this.selectedTarget = null;
    this.pickMaterial?.dispose();
    this.pickMaterial = null;
    this.data = null;
    if (this.materials) {
      for (const material of Object.values(this.materials)) {
        if (material instanceof MeshStandardMaterial) material.dispose();
      }
      for (const texture of this.materials.textures) texture.dispose();
      this.materials = null;
    }
  }

  private buildArchitecture(data: DungeonData, materials: DungeonMaterials): void {
    const floorCells: Array<{ x: number; y: number }> = [];
    const wallCells: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < data.height; y += 1) {
      const row = data.grid[y];
      if (!row) continue;
      for (let x = 0; x < data.width; x += 1) {
        const cell = row[x];
        if (cell === CELL.FLOOR || cell === CELL.DOOR) floorCells.push({ x, y });
        if (cell === CELL.WALL) wallCells.push({ x, y });
      }
    }

    const stage = new Mesh(
      new PlaneGeometry(data.width + 12, data.height + 12),
      materials.wallDark,
    );
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = -0.31;
    stage.receiveShadow = true;
    this.root.add(stage);

    const floorMesh = createInstanced(
      new BoxGeometry(1.04, 0.18, 1.04),
      materials.floor,
      floorCells.length,
      'InstancedFloors',
    );
    for (let index = 0; index < floorCells.length; index += 1) {
      const cell = floorCells[index];
      if (!cell) continue;
      const world = gridToWorld(cell.x, cell.y, data.width, data.height);
      this.dummy.position.set(world.x, FLOOR_Y, world.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      floorMesh.setMatrixAt(index, this.dummy.matrix);
    }
    floorMesh.instanceMatrix.needsUpdate = true;
    configureShadow(floorMesh, false, true);
    this.root.add(floorMesh);

    const wallMesh = createInstanced(
      new BoxGeometry(1.02, WALL_HEIGHT, 1.02),
      materials.wall,
      wallCells.length,
      'InstancedWalls',
    );
    for (let index = 0; index < wallCells.length; index += 1) {
      const cell = wallCells[index];
      if (!cell) continue;
      const world = gridToWorld(cell.x, cell.y, data.width, data.height);
      this.dummy.position.set(world.x, FLOOR_Y + WALL_HEIGHT / 2, world.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      wallMesh.setMatrixAt(index, this.dummy.matrix);
    }
    wallMesh.instanceMatrix.needsUpdate = true;
    configureShadow(wallMesh, true, true);
    this.root.add(wallMesh);

    const ceilingGroup = new Group();
    ceilingGroup.name = 'Ceiling';
    const ceilingMesh = createInstanced(
      new BoxGeometry(1.04, 0.22, 1.04),
      materials.wallDark,
      floorCells.length,
      'InstancedCeiling',
    );
    for (let index = 0; index < floorCells.length; index += 1) {
      const cell = floorCells[index];
      if (!cell) continue;
      const world = gridToWorld(cell.x, cell.y, data.width, data.height);
      this.dummy.position.set(world.x, CEILING_HEIGHT, world.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      ceilingMesh.setMatrixAt(index, this.dummy.matrix);
    }
    ceilingMesh.instanceMatrix.needsUpdate = true;
    configureShadow(ceilingMesh, false, true);
    ceilingGroup.add(ceilingMesh);
    this.root.add(ceilingGroup);
    this.ceilingGroup = ceilingGroup;
  }

  private buildDoors(data: DungeonData, materials: DungeonMaterials): void {
    if (data.doors.length === 0) return;
    const postMesh = createInstanced(
      new BoxGeometry(0.18, 2.8, 0.18),
      materials.doorFrame,
      data.doors.length * 2,
      'InstancedDoorPosts',
    );
    const beamMesh = createInstanced(
      new BoxGeometry(1.3, 0.18, 0.18),
      materials.doorFrame,
      data.doors.length,
      'InstancedDoorBeams',
    );
    const thresholdMesh = createInstanced(
      new BoxGeometry(1.08, 0.09, 1.08),
      materials.doorInset,
      data.doors.length,
      'InstancedDoorThresholds',
    );
    const postPicks: string[] = [];
    const beamPicks: string[] = [];
    let postIndex = 0;
    for (const door of data.doors) {
      const world = gridToWorld(door.x, door.y, data.width, data.height);
      const pickId = `door:${door.id}`;
      const vertical = door.orientation === 'vertical';
      const postOffsets = vertical
        ? [{ x: 0, z: -0.56 }, { x: 0, z: 0.56 }]
        : [{ x: -0.56, z: 0 }, { x: 0.56, z: 0 }];

      for (const offset of postOffsets) {
        this.dummy.position.set(world.x + offset.x, FLOOR_Y + 1.4, world.z + offset.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        postMesh.setMatrixAt(postIndex, this.dummy.matrix);
        postPicks[postIndex] = pickId;
        postIndex += 1;
      }

      const beamRotation = vertical ? Math.PI / 2 : 0;
      this.dummy.position.set(world.x, FLOOR_Y + 2.7, world.z);
      this.dummy.rotation.set(0, beamRotation, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      beamMesh.setMatrixAt(door.id, this.dummy.matrix);
      beamPicks[door.id] = pickId;

      this.dummy.position.set(world.x, FLOOR_Y + 0.025, world.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      thresholdMesh.setMatrixAt(door.id, this.dummy.matrix);
    }
    postMesh.instanceMatrix.needsUpdate = true;
    beamMesh.instanceMatrix.needsUpdate = true;
    thresholdMesh.instanceMatrix.needsUpdate = true;
    postMesh.userData.pickKind = 'door';
    postMesh.userData.pickIds = postPicks;
    beamMesh.userData.pickKind = 'door';
    beamMesh.userData.pickIds = beamPicks;
    configureShadow(postMesh);
    configureShadow(beamMesh);
    configureShadow(thresholdMesh, false, true);
    this.root.add(postMesh, beamMesh, thresholdMesh);
    this.pickables.push(postMesh, beamMesh);
  }
  private buildProps(data: DungeonData, materials: DungeonMaterials): void {
    const torches = data.props.filter((prop) => prop.type === 'torch');
    if (torches.length > 0) {
      const handleMesh = createInstanced(
        new CylinderGeometry(0.035, 0.055, 0.72, 8),
        materials.torchWood,
        torches.length,
        'InstancedTorches',
      );
      const flameMesh = createInstanced(
        new OctahedronGeometry(0.11, 0),
        materials.flame,
        torches.length,
        'InstancedFlames',
      );
      const torchPicks: string[] = [];

      for (let index = 0; index < torches.length; index += 1) {
        const torch = torches[index];
        if (!torch) continue;
        const placement = this.getTorchPlacement(torch, data);
        this.dummy.position.set(placement.x, FLOOR_Y + 1.42, placement.z);
        this.dummy.rotation.set(0.13, placement.yaw, 0);
        this.dummy.scale.setScalar(torch.scale);
        this.dummy.updateMatrix();
        handleMesh.setMatrixAt(index, this.dummy.matrix);
        torchPicks[index] = torch.id;

        this.dummy.position.set(placement.x, FLOOR_Y + 1.92, placement.z);
        this.dummy.rotation.set(0, placement.yaw, 0);
        this.dummy.scale.set(0.78 * torch.scale, 1.45 * torch.scale, 0.78 * torch.scale);
        this.dummy.updateMatrix();
        flameMesh.setMatrixAt(index, this.dummy.matrix);
      }
      handleMesh.instanceMatrix.needsUpdate = true;
      flameMesh.instanceMatrix.needsUpdate = true;
      handleMesh.userData.pickKind = 'torch';
      handleMesh.userData.pickIds = torchPicks;
      flameMesh.userData.pickKind = 'torch';
      flameMesh.userData.pickIds = torchPicks;
      configureShadow(handleMesh);
      configureShadow(flameMesh, false, false);
      this.root.add(handleMesh, flameMesh);
      this.pickables.push(handleMesh, flameMesh);

      const lightStep = Math.max(1, Math.ceil(torches.length / MAX_TORCH_LIGHTS));
      for (let index = 0; index < torches.length; index += lightStep) {
        const torch = torches[index];
        if (!torch) continue;
        const placement = this.getTorchPlacement(torch, data);
        const light = new PointLight(0xff9a4a, 24, 12, 2);
        light.position.set(placement.x, FLOOR_Y + 1.96, placement.z);
        this.root.add(light);
        this.torchAnimations.push({
          light,
          baseIntensity: 24 * (torch.metadata.brightness ?? 1),
          phase: torch.rotation,
        });
      }
    }

    const chests = data.props.filter((prop) => prop.type === 'chest');
    if (chests.length > 0) {
      const baseMesh = createInstanced(
        new BoxGeometry(0.78, 0.38, 0.56),
        materials.chestWood,
        chests.length,
        'InstancedChestBases',
      );
      const lidMesh = createInstanced(
        new BoxGeometry(0.82, 0.18, 0.6),
        materials.chestWood,
        chests.length,
        'InstancedChestLids',
      );
      const lockMesh = createInstanced(
        new BoxGeometry(0.16, 0.18, 0.08),
        materials.chestIron,
        chests.length,
        'InstancedChestLocks',
      );
      const chestPicks: string[] = [];

      for (let index = 0; index < chests.length; index += 1) {
        const chest = chests[index];
        if (!chest) continue;
        const world = gridToWorld(chest.x, chest.y, data.width, data.height);
        const yaw = chest.rotation;
        this.dummy.rotation.set(0, yaw, 0);
        this.dummy.scale.setScalar(chest.scale);

        this.dummy.position.set(world.x, FLOOR_Y + 0.2, world.z);
        this.dummy.updateMatrix();
        baseMesh.setMatrixAt(index, this.dummy.matrix);

        this.dummy.position.set(world.x, FLOOR_Y + 0.48, world.z);
        this.dummy.updateMatrix();
        lidMesh.setMatrixAt(index, this.dummy.matrix);

        this.dummy.position.set(
          world.x + Math.sin(yaw) * 0.31,
          FLOOR_Y + 0.31,
          world.z + Math.cos(yaw) * 0.31,
        );
        this.dummy.updateMatrix();
        lockMesh.setMatrixAt(index, this.dummy.matrix);
        chestPicks[index] = chest.id;
      }
      for (const mesh of [baseMesh, lidMesh, lockMesh]) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData.pickKind = 'chest';
        mesh.userData.pickIds = chestPicks;
        configureShadow(mesh);
      }
      this.root.add(baseMesh, lidMesh, lockMesh);
      this.pickables.push(baseMesh, lidMesh, lockMesh);
    }

    const pillars = data.props.filter((prop) => prop.type === 'pillar');
    if (pillars.length > 0) {
      const bodyMesh = createInstanced(
        new CylinderGeometry(0.27, 0.38, 3.08, 8),
        materials.pillar,
        pillars.length,
        'InstancedPillars',
      );
      const capMesh = createInstanced(
        new BoxGeometry(0.76, 0.18, 0.76),
        materials.wallDark,
        pillars.length,
        'InstancedPillarCaps',
      );
      const pillarPicks: string[] = [];

      for (let index = 0; index < pillars.length; index += 1) {
        const pillar = pillars[index];
        if (!pillar) continue;
        const world = gridToWorld(pillar.x, pillar.y, data.width, data.height);
        this.dummy.rotation.set(0, pillar.rotation, 0);
        this.dummy.scale.setScalar(pillar.scale);
        this.dummy.position.set(world.x, FLOOR_Y + 1.58, world.z);
        this.dummy.updateMatrix();
        bodyMesh.setMatrixAt(index, this.dummy.matrix);
        this.dummy.position.set(world.x, FLOOR_Y + 3.12, world.z);
        this.dummy.updateMatrix();
        capMesh.setMatrixAt(index, this.dummy.matrix);
        pillarPicks[index] = pillar.id;
      }

      for (const mesh of [bodyMesh, capMesh]) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData.pickKind = 'pillar';
        mesh.userData.pickIds = pillarPicks;
        configureShadow(mesh);
      }
      this.root.add(bodyMesh, capMesh);
      this.pickables.push(bodyMesh, capMesh);
    }

    const rubbleProps = data.props.filter((prop) => prop.type === 'rubble');
    if (rubbleProps.length > 0) {
      const rubbleMesh = createInstanced(
        new DodecahedronGeometry(0.2, 0),
        materials.rubble,
        rubbleProps.length,
        'InstancedRubble',
      );
      const rubblePicks: string[] = [];
      for (let index = 0; index < rubbleProps.length; index += 1) {
        const prop = rubbleProps[index];
        if (!prop) continue;
        const world = gridToWorld(prop.x, prop.y, data.width, data.height);
        this.dummy.position.set(world.x, FLOOR_Y + 0.14, world.z);
        this.dummy.rotation.set(prop.rotation, prop.rotation * 0.7, prop.rotation * 0.31);
        this.dummy.scale.setScalar(prop.scale);
        this.dummy.updateMatrix();
        rubbleMesh.setMatrixAt(index, this.dummy.matrix);
        rubblePicks[index] = prop.id;
      }
      rubbleMesh.instanceMatrix.needsUpdate = true;
      rubbleMesh.userData.pickKind = 'prop';
      rubbleMesh.userData.pickIds = rubblePicks;
      configureShadow(rubbleMesh);
      this.root.add(rubbleMesh);
      this.pickables.push(rubbleMesh);
    }

    const mossProps = data.props.filter((prop) => prop.type === 'moss');
    if (mossProps.length > 0) {
      const mossMesh = createInstanced(
        new BoxGeometry(0.52, 0.035, 0.24),
        materials.moss,
        mossProps.length,
        'InstancedMoss',
      );
      const mossPicks: string[] = [];
      for (let index = 0; index < mossProps.length; index += 1) {
        const prop = mossProps[index];
        if (!prop) continue;
        const world = gridToWorld(prop.x, prop.y, data.width, data.height);
        this.dummy.position.set(world.x, FLOOR_Y + 0.025, world.z);
        this.dummy.rotation.set(0, prop.rotation, 0);
        this.dummy.scale.set(prop.scale, 1, prop.scale);
        this.dummy.updateMatrix();
        mossMesh.setMatrixAt(index, this.dummy.matrix);
        mossPicks[index] = prop.id;
      }
      mossMesh.instanceMatrix.needsUpdate = true;
      mossMesh.userData.pickKind = 'prop';
      mossMesh.userData.pickIds = mossPicks;
      configureShadow(mossMesh, false, true);
      this.root.add(mossMesh);
      this.pickables.push(mossMesh);
    }

    const cobwebProps = data.props.filter((prop) => prop.type === 'cobweb');
    if (cobwebProps.length > 0) {
      const cobwebMesh = createInstanced(
        new PlaneGeometry(0.9, 1.05),
        materials.cobweb,
        cobwebProps.length,
        'InstancedCobwebs',
      );
      const cobwebPicks: string[] = [];
      for (let index = 0; index < cobwebProps.length; index += 1) {
        const prop = cobwebProps[index];
        if (!prop) continue;
        const world = gridToWorld(prop.x, prop.y, data.width, data.height);
        this.dummy.position.set(world.x, FLOOR_Y + 2.74, world.z);
        this.dummy.rotation.set(0, prop.rotation, prop.scale * 0.08);
        this.dummy.scale.setScalar(prop.scale);
        this.dummy.updateMatrix();
        cobwebMesh.setMatrixAt(index, this.dummy.matrix);
        cobwebPicks[index] = prop.id;
      }
      cobwebMesh.instanceMatrix.needsUpdate = true;
      cobwebMesh.userData.pickKind = 'prop';
      cobwebMesh.userData.pickIds = cobwebPicks;
      this.root.add(cobwebMesh);
      this.pickables.push(cobwebMesh);
    }
  }

  private buildRoomPickers(data: DungeonData): void {
    if (!this.pickMaterial) {
      this.pickMaterial = new MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
        colorWrite: false,
        side: DoubleSide,
      });
      this.pickMaterial.name = 'RoomPickerMaterial';
    }
    const material = this.pickMaterial;
    for (const room of data.rooms) {
      const world = gridToWorld(room.centerX, room.centerY, data.width, data.height);
      const picker = new Mesh(
        new BoxGeometry(room.width - 0.22, 0.12, room.height - 0.22),
        material,
      );
      picker.position.set(world.x, FLOOR_Y + 0.06, world.z);
      picker.userData.pickKind = 'room';
      picker.userData.pickId = `room:${room.id}`;
      this.root.add(picker);
      this.pickables.push(picker);
    }
  }

  private getTorchPlacement(
    torch: DungeonProp,
    data: DungeonData,
  ): { x: number; z: number; yaw: number } {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    const wallDirection = directions.find(
      (direction) => data.grid[torch.y + direction.y]?.[torch.x + direction.x] === CELL.WALL,
    );
    const offsetX = wallDirection ? -wallDirection.x * 0.36 : 0;
    const offsetY = wallDirection ? -wallDirection.y * 0.36 : 0;
    const world = gridToWorld(torch.x, torch.y, data.width, data.height);
    return {
      x: world.x + offsetX,
      z: world.z + offsetY,
      yaw: offsetX === 0 && offsetY === 0 ? torch.rotation : Math.atan2(offsetX, offsetY),
    };
  }

  resolveIntersection(hit: Intersection): DungeonPickTarget | null {
    const data = this.data;
    if (!data) return null;
    const kind = hit.object.userData.pickKind as SelectableKind | undefined;
    let pickId = hit.object.userData.pickId as string | undefined;
    if (hit.instanceId !== undefined) {
      const pickIds = hit.object.userData.pickIds as string[] | undefined;
      pickId = pickIds?.[hit.instanceId];
    }
    if (!kind || !pickId) return null;

    if (kind === 'room') {
      const roomId = Number(pickId.split(':')[1]);
      const room = data.rooms.find((item) => item.id === roomId);
      return room ? this.createRoomTarget(room, data) : null;
    }
    if (kind === 'door') {
      const doorId = Number(pickId.split(':')[1]);
      const door = data.doors.find((item) => item.id === doorId);
      if (!door) return null;
      const world = gridToWorld(door.x, door.y, data.width, data.height);
      return {
        kind: 'door',
        id: `door:${door.id}`,
        title: `门框 #${door.id + 1}`,
        details: [
          `连接：石室 ${door.roomA + 1} ↔ 石室 ${door.roomB + 1}`,
          `朝向：${door.orientation === 'vertical' ? '东西通道' : '南北通道'}`,
          `网格坐标：${door.x}, ${door.y}`,
        ],
        center: new Vector3(world.x, 1.45, world.z),
        size: new Vector3(1.35, 2.85, 1.35),
      };
    }

    const prop = data.props.find((item) => item.id === pickId);
    return prop ? this.createPropTarget(prop, data) : null;
  }

  getRoomTarget(roomId: number): DungeonPickTarget | null {
    const data = this.data;
    if (!data) return null;
    const room = data.rooms.find((item) => item.id === roomId);
    return room ? this.createRoomTarget(room, data) : null;
  }

  private createRoomTarget(room: Room, data: DungeonData): DungeonPickTarget {
    const world = gridToWorld(room.centerX, room.centerY, data.width, data.height);
    return {
      kind: 'room',
      id: `room:${room.id}`,
      title: `石室 #${room.id + 1}`,
      details: [
        `尺寸：${room.width} × ${room.height} 格`,
        `面积：${room.area} 格²`,
        `中心：${room.centerX}, ${room.centerY}`,
      ],
      center: new Vector3(world.x, 0.7, world.z),
      size: new Vector3(room.width, 2.7, room.height),
    };
  }

  private createPropTarget(prop: DungeonProp, data: DungeonData): DungeonPickTarget {
    const world = gridToWorld(prop.x, prop.y, data.width, data.height);
    const config: Record<PropType, { kind: SelectableKind; title: string; height: number; size: number }> = {
      torch: { kind: 'torch', title: '墙边火把', height: 1.2, size: 0.65 },
      chest: { kind: 'chest', title: '尘封宝箱', height: 0.55, size: 1.05 },
      pillar: { kind: 'pillar', title: '石柱', height: 1.7, size: 1.1 },
      rubble: { kind: 'prop', title: '碎石堆', height: 0.2, size: 0.55 },
      moss: { kind: 'prop', title: '青苔', height: 0.08, size: 0.65 },
      cobweb: { kind: 'prop', title: '蛛网', height: 2.7, size: 1.2 },
    };
    const item = config[prop.type];
    return {
      kind: item.kind,
      id: prop.id,
      title: `${item.title} · ${prop.id}`,
      details: [
        `网格坐标：${prop.x}, ${prop.y}`,
        `缩放：${prop.scale.toFixed(2)}`,
        prop.roomId === undefined ? '位置：走廊区域' : `所属：石室 #${prop.roomId + 1}`,
      ],
      center: new Vector3(world.x, item.height, world.z),
      size: new Vector3(item.size, item.height * 2, item.size),
    };
  }

  select(target: DungeonPickTarget | null): void {
    if (this.selectionHelper) {
      this.selectionHelper.geometry.dispose();
      const helperMaterial = this.selectionHelper.material as LineBasicMaterial;
      helperMaterial.dispose();
      this.selectionHelper.removeFromParent();
      this.selectionHelper = null;
    }
    this.selectedTarget = target;
    if (!target) return;

    const box = new Box3(
      target.center.clone().sub(target.size.clone().multiplyScalar(0.5)),
      target.center.clone().add(target.size.clone().multiplyScalar(0.5)),
    );
    this.selectionHelper = new Box3Helper(box, new Color('#79c6ff'));
    const helperMaterial = this.selectionHelper.material as LineBasicMaterial;
    helperMaterial.depthTest = false;
    helperMaterial.transparent = true;
    helperMaterial.opacity = 0.92;
    this.selectionHelper.renderOrder = 20;
    this.root.add(this.selectionHelper);
  }

  getSelectedTarget(): DungeonPickTarget | null {
    return this.selectedTarget;
  }

  update(elapsed: number): void {
    for (let index = 0; index < this.torchAnimations.length; index += 1) {
      const torch = this.torchAnimations[index];
      if (!torch) continue;
      const flicker =
        0.91 +
        Math.sin(elapsed * 10.7 + torch.phase) * 0.055 +
        Math.sin(elapsed * 23.1 + torch.phase * 1.7) * 0.035;
      torch.light.intensity = torch.baseIntensity * flicker;
    }
  }

  setCeilingVisible(visible: boolean): void {
    if (this.ceilingGroup) this.ceilingGroup.visible = visible;
  }

  setWireframe(enabled: boolean): void {
    this.wireframeEnabled = enabled;
    if (!this.materials) return;
    const values = Object.values(this.materials);
    for (const material of values) {
      if (material instanceof MeshStandardMaterial && material !== this.materials.selection) {
        material.wireframe = enabled;
      }
    }
  }

  dispose(): void {
    this.clear();
    this.root.removeFromParent();
  }
}








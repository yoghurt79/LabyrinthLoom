import { Color, DoubleSide, MeshStandardMaterial, type Texture } from 'three';
import { createCobwebTexture, createStoneTexture } from './ProceduralTextures';

export interface DungeonMaterials {
  floor: MeshStandardMaterial;
  wall: MeshStandardMaterial;
  wallDark: MeshStandardMaterial;
  pillar: MeshStandardMaterial;
  doorFrame: MeshStandardMaterial;
  doorInset: MeshStandardMaterial;
  torchWood: MeshStandardMaterial;
  flame: MeshStandardMaterial;
  chestWood: MeshStandardMaterial;
  chestIron: MeshStandardMaterial;
  rubble: MeshStandardMaterial;
  moss: MeshStandardMaterial;
  cobweb: MeshStandardMaterial;
  selection: MeshStandardMaterial;
  textures: Texture[];
}

export function createDungeonMaterials(
  seed: string | number,
  anisotropy: number,
): DungeonMaterials {
  const wallTexture = createStoneTexture(seed, 'wall');
  const floorTexture = createStoneTexture(seed, 'floor');
  const webTexture = createCobwebTexture(seed);
  wallTexture.anisotropy = anisotropy;
  floorTexture.anisotropy = anisotropy;
  webTexture.anisotropy = anisotropy;

  const floor = new MeshStandardMaterial({
    map: floorTexture,
    color: new Color('#8297b7'),
    side: DoubleSide,
    roughness: 0.96,
    metalness: 0,
  });
  const wall = new MeshStandardMaterial({
    map: wallTexture,
    color: new Color('#8497b2'),
    side: DoubleSide,
    roughness: 0.98,
    metalness: 0,
  });
  const wallDark = new MeshStandardMaterial({
    map: wallTexture,
    color: new Color('#3d5675'),
    side: DoubleSide,
    roughness: 1,
    metalness: 0,
  });
  const pillar = new MeshStandardMaterial({
    map: floorTexture,
    color: new Color('#758caa'),
    side: DoubleSide,
    roughness: 0.97,
    metalness: 0,
  });

  const doorFrame = new MeshStandardMaterial({
    color: new Color('#304762'),
    side: DoubleSide,
    roughness: 0.88,
    metalness: 0.04,
  });
  const doorInset = new MeshStandardMaterial({
    color: new Color('#1d3048'),
    side: DoubleSide,
    roughness: 0.94,
    metalness: 0,
  });
  const torchWood = new MeshStandardMaterial({
    color: new Color('#2b2938'),
    side: DoubleSide,
    roughness: 0.9,
    metalness: 0,
  });
  const flame = new MeshStandardMaterial({
    color: new Color('#ff7b24'),
    emissive: new Color('#ff4d10'),
    emissiveIntensity: 4.2,
    side: DoubleSide,
    roughness: 0.35,
    metalness: 0,
  });
  const chestWood = new MeshStandardMaterial({
    color: new Color('#31384c'),
    side: DoubleSide,
    roughness: 0.83,
    metalness: 0,
  });
  const chestIron = new MeshStandardMaterial({
    color: new Color('#334d68'),
    side: DoubleSide,
    roughness: 0.62,
    metalness: 0.42,
  });

  const rubble = new MeshStandardMaterial({
    map: floorTexture,
    color: new Color('#7e8ca3'),
    side: DoubleSide,
    roughness: 1,
    metalness: 0,
  });
  const moss = new MeshStandardMaterial({
    color: new Color('#326873'),
    side: DoubleSide,
    roughness: 1,
    metalness: 0,
  });
  const cobweb = new MeshStandardMaterial({
    map: webTexture,
    color: new Color('#c5e4ff'),
    transparent: true,
    opacity: 0.62,
    depthWrite: false,
    side: DoubleSide,
    roughness: 1,
    metalness: 0,
  });
  const selection = new MeshStandardMaterial({
    color: new Color('#79c6ff'),
    emissive: new Color('#287cc9'),
    emissiveIntensity: 1.6,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
  });

  return {
    floor,
    wall,
    wallDark,
    pillar,
    doorFrame,
    doorInset,
    torchWood,
    flame,
    chestWood,
    chestIron,
    rubble,
    moss,
    cobweb,
    selection,
    textures: [wallTexture, floorTexture, webTexture],
  };
}




import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  PointsMaterial,
  type Scene,
} from 'three';
import { createDustTexture } from './ProceduralTextures';
import { createSeededRandom } from '../core/random';

export class DustParticles {
  readonly points: Points<BufferGeometry, PointsMaterial>;
  private readonly baseY: Float32Array;
  private readonly phase: Float32Array;
  private readonly positions: Float32Array;
  private readonly map = createDustTexture();
  private frame = 0;

  constructor(scene: Scene, seed: string, mapWidth: number, mapHeight: number) {
    const random = createSeededRandom(`${seed}-dust`);
    const count = Math.min(500, Math.max(220, Math.floor((mapWidth * mapHeight) / 8)));
    this.positions = new Float32Array(count * 3);
    this.baseY = new Float32Array(count);
    this.phase = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      this.positions[offset] = random.float(-mapWidth / 2, mapWidth / 2);
      this.positions[offset + 1] = random.float(0.45, 5.2);
      this.positions[offset + 2] = random.float(-mapHeight / 2, mapHeight / 2);
      const y = this.positions[offset + 1];
      if (y !== undefined) this.baseY[index] = y;
      this.phase[index] = random.float(0, Math.PI * 2);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    const material = new PointsMaterial({
      color: new Color('#8fc7ff'),
      map: this.map,
      size: 0.062,
      transparent: true,
      opacity: 0.42,
      alphaTest: 0.02,
      depthWrite: false,
      blending: AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(elapsed: number, delta: number): void {
    this.frame = (this.frame + 1) % 2;
    if (this.frame !== 0) return;
    for (let index = 0; index < this.phase.length; index += 1) {
      const offset = index * 3;
      const current = this.positions[offset + 1];
      const base = this.baseY[index];
      const phase = this.phase[index];
      if (current === undefined || base === undefined || phase === undefined) continue;
      this.positions[offset] = (this.positions[offset] ?? 0) + delta * 0.055;
      this.positions[offset + 1] = base + Math.sin(elapsed * 0.24 + phase) * 0.22;
      if (this.positions[offset] > 38) this.positions[offset] = -38;
    }
    const position = this.points.geometry.getAttribute('position');
    position.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.map.dispose();
    this.points.removeFromParent();
  }
}




import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { createSeededRandom, hashSeed, type SeededRandom } from '../core/random';

function createCanvas(size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  return { canvas, context };
}

function paintNoise(
  context: CanvasRenderingContext2D,
  random: SeededRandom,
  size: number,
  amount: number,
): void {
  const image = context.getImageData(0, 0, size, size);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const noise = Math.floor(random.float(-amount, amount));
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    if (red !== undefined && green !== undefined && blue !== undefined) {
      data[index] = Math.max(0, Math.min(255, red + noise));
      data[index + 1] = Math.max(0, Math.min(255, green + noise));
      data[index + 2] = Math.max(0, Math.min(255, blue + noise));
    }
  }
  context.putImageData(image, 0, 0);
}

function addGrime(
  context: CanvasRenderingContext2D,
  random: SeededRandom,
  size: number,
  color: string,
): void {
  for (let index = 0; index < 28; index += 1) {
    const x = random.float(0, size);
    const y = random.float(0, size);
    const radius = random.float(size * 0.03, size * 0.17);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
): CanvasTexture {
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Worn masonry generated entirely from Canvas 2D operations. */
export function createStoneTexture(
  seed: string | number,
  variant: 'wall' | 'floor',
): CanvasTexture {
  const size = 256;
  const random = createSeededRandom(`${hashSeed(seed)}-${variant}-texture`);
  const { canvas, context } = createCanvas(size);
  context.fillStyle = variant === 'wall' ? '#52647f' : '#42536f';
  context.fillRect(0, 0, size, size);
  paintNoise(context, random, size, variant === 'wall' ? 18 : 14);

  const brickHeight = variant === 'wall' ? 34 : 64;
  const brickWidth = variant === 'wall' ? 66 : 64;
  context.lineWidth = 3;
  context.strokeStyle = variant === 'wall' ? 'rgba(13,21,37,.76)' : 'rgba(12,20,36,.7)';

  for (let row = 0, y = 0; y <= size; y += brickHeight, row += 1) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
    const offset = row % 2 === 0 ? 0 : -brickWidth / 2;
    for (let x = offset; x <= size; x += brickWidth) {
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x, y + brickHeight);
      context.stroke();
    }
  }

  addGrime(
    context,
    random,
    size,
    variant === 'wall' ? 'rgba(19,43,69,.3)' : 'rgba(21,48,75,.27)',
  );
  context.strokeStyle = 'rgba(198,225,255,.18)';
  context.lineWidth = 1;
  for (let index = 0; index < 36; index += 1) {
    const x = random.float(0, size);
    const y = random.float(0, size);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + random.float(-13, 13), y + random.float(4, 26));
    context.stroke();
  }

  return finalizeTexture(
    canvas,
    variant === 'wall' ? 1.1 : 1.35,
    variant === 'wall' ? 1.2 : 1.35,
  );
}

/** Soft radial particle sprite, generated without an external image. */
export function createDustTexture(): CanvasTexture {
  const { canvas, context } = createCanvas(64);
  const gradient = context.createRadialGradient(32, 32, 1, 32, 32, 30);
  gradient.addColorStop(0, 'rgba(210,232,255,.9)');
  gradient.addColorStop(0.25, 'rgba(133,188,255,.38)');
  gradient.addColorStop(1, 'rgba(62,113,190,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new CanvasTexture(canvas);
}

/** A small code-generated cobweb that can be used as a transparent decal. */
export function createCobwebTexture(seed: string | number): CanvasTexture {
  const size = 128;
  const random = createSeededRandom(`${hashSeed(seed)}-web`);
  const { canvas, context } = createCanvas(size);
  context.strokeStyle = 'rgba(197,224,255,.66)';
  context.lineWidth = 1.2;
  context.translate(size / 2, size / 2);

  for (let ray = 0; ray < 8; ray += 1) {
    const angle = (ray / 8) * Math.PI * 2 + random.float(-0.04, 0.04);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(Math.cos(angle) * 58, Math.sin(angle) * 58);
    context.stroke();
  }

  for (let ring = 1; ring <= 4; ring += 1) {
    context.beginPath();
    const radius = ring * 12.5 + random.float(-1.5, 1.5);
    for (let segment = 0; segment <= 32; segment += 1) {
      const angle = (segment / 32) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (segment === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}


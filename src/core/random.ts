/**
 * FNV-1a hash used to turn arbitrary user supplied seed strings into a
 * stable 32-bit integer. Unlike Math.random-based hashes this is identical
 * across browsers and sessions.
 */
export function hashSeed(seed: string | number): number {
  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Small, fast and deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeededRandom {
  next(): number;
  int(min: number, max: number): number;
  float(min: number, max: number): number;
  bool(probability?: number): boolean;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export function createSeededRandom(seed: string | number): SeededRandom {
  const next = mulberry32(hashSeed(seed));

  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    float(min, max) {
      return min + next() * (max - min);
    },
    bool(probability = 0.5) {
      return next() < probability;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new Error('Cannot pick from an empty array.');
      }
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) {
        throw new Error('Random pick produced an invalid index.');
      }
      return item;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(next() * (index + 1));
        const current = result[index];
        const swap = result[swapIndex];
        if (current !== undefined && swap !== undefined) {
          result[index] = swap;
          result[swapIndex] = current;
        }
      }
      return result;
    },
  };
}

export function createEphemeralSeed(): string {
  const timestamp = Date.now().toString(36);
  const entropy = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${timestamp}-${entropy}`;
}

/**
 * Seeded Random Number Generator (Mulberry32)
 * Deterministic PRNG for reproducible simulation runs
 */

export class RNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /**
   * Generate next random number between 0 and 1
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /**
   * Return true with given probability (0-1)
   */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Pick random element from array
   */
  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /**
   * Get current state for serialization
   */
  getState(): number {
    return this.state;
  }

  /**
   * Create a new RNG with saved state
   */
  static fromState(state: number): RNG {
    const rng = new RNG(0);
    rng.state = state;
    return rng;
  }
}

/**
 * Generate a seed from current timestamp
 */
export function generateSeed(): number {
  return Date.now() ^ (Math.random() * 0xffffffff);
}

import { describe, expect, it } from 'vitest';
import { assignCycle } from './assign-cycle.js';

describe('assignCycle', () => {
  it('builds the cycle produced by a zero random source', () => {
    expect(assignCycle(['a', 'b', 'c'], () => 0)).toEqual([
      { giver: 'b', receiver: 'c' },
      { giver: 'c', receiver: 'a' },
      { giver: 'a', receiver: 'b' },
    ]);
  });

  it('gives every person one receiver and never themselves', () => {
    const people = ['a', 'b', 'c', 'd', 'e'];

    for (let seed = 1; seed <= 5; seed += 1) {
      const pairs = assignCycle(people, lcg(seed));
      const givers = pairs.map((pair) => pair.giver);
      const receivers = pairs.map((pair) => pair.receiver);

      expect(new Set(givers)).toEqual(new Set(people));
      expect(new Set(receivers)).toEqual(new Set(people));
      expect(pairs.every((pair) => pair.giver !== pair.receiver)).toBe(true);
    }
  });
});

function lcg(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

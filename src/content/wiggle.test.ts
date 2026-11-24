import { describe, expect, it } from 'vitest';
import { countFlips, pushSample, type Sample } from './wiggle';

const path = (xs: number[], start = 0, step = 50): Sample[] =>
  xs.map((x, i) => ({ t: start + i * step, x }));

describe('countFlips', () => {
  it('counts back-and-forth direction changes', () => {
    // right, left, right, left, right → 4 flips
    const s = path([0, 20, 0, 20, 0, 20]);
    expect(countFlips(s, 250, 1000, 6)).toBe(4);
  });

  it('ignores small jitter below the minimum step', () => {
    const s = path([0, 3, 0, 3, 0, 3, 0]);
    expect(countFlips(s, 300, 1000, 6)).toBe(0);
  });

  it('a straight move is not a wiggle', () => {
    expect(countFlips(path([0, 10, 20, 30, 40]), 200, 1000, 6)).toBe(0);
  });

  it('only counts samples inside the time window', () => {
    const old = path([0, 20, 0, 20, 0], 0);
    const recent = path([0, 20], 5000);
    expect(countFlips([...old, ...recent], 5050, 1000, 6)).toBe(0);
  });

  it('handles empty input', () => {
    expect(countFlips([], 0, 1000, 6)).toBe(0);
  });
});

describe('pushSample', () => {
  it('keeps only the newest samples', () => {
    let s: Sample[] = [];
    for (let i = 0; i < 5; i++) s = pushSample(s, { t: i, x: i }, 3);
    expect(s.map((p) => p.t)).toEqual([2, 3, 4]);
  });
});

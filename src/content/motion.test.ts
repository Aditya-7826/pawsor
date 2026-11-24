import { describe, expect, it } from 'vitest';
import { clamp, clampToViewport, distance, easeFactor, followTarget, stepToward } from './motion';

describe('clamp', () => {
  it('limits to range and centres when the range is inverted', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(3, 10, 0)).toBe(5);
  });
});

describe('easeFactor', () => {
  it('is 0 for no time and approaches 1 for long times', () => {
    expect(easeFactor(4, 0)).toBe(0);
    expect(easeFactor(4, 10_000)).toBeCloseTo(1, 5);
  });

  it('is frame-rate independent', () => {
    const oneBigStep = easeFactor(4, 32);
    const small = easeFactor(4, 16);
    const twoSmallSteps = 1 - (1 - small) * (1 - small);
    expect(twoSmallSteps).toBeCloseTo(oneBigStep, 10);
  });
});

describe('stepToward', () => {
  it('moves toward the target without overshooting', () => {
    const next = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 16, 4, 10_000);
    expect(next.x).toBeGreaterThan(0);
    expect(next.x).toBeLessThan(100);
    expect(next.y).toBe(0);
  });

  it('respects the max speed', () => {
    const next = stepToward({ x: 0, y: 0 }, { x: 10_000, y: 0 }, 100, 50, 500);
    expect(next.x).toBeCloseTo(50, 5);
  });

  it('snaps when already at the target', () => {
    expect(stepToward({ x: 5, y: 5 }, { x: 5.01, y: 5 }, 16, 4, 500)).toEqual({ x: 5.01, y: 5 });
  });

  it('does not move when no time has passed', () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 0, 4, 500)).toEqual({ x: 0, y: 0 });
  });
});

describe('followTarget', () => {
  it('stops `stop` px short of the cursor on the dog side', () => {
    const t = followTarget({ x: 0, y: 0 }, { x: 200, y: 0 }, 40);
    expect(t).toEqual({ x: 160, y: 0 });
    expect(distance(t, { x: 200, y: 0 })).toBeCloseTo(40);
  });

  it('stays put when already close enough', () => {
    expect(followTarget({ x: 190, y: 0 }, { x: 200, y: 0 }, 40)).toEqual({ x: 190, y: 0 });
  });
});

describe('clampToViewport', () => {
  const vp = { width: 800, height: 600 };
  const size = { width: 64, height: 56 };

  it('keeps the whole sprite inside the viewport', () => {
    expect(clampToViewport({ x: -50, y: 900 }, vp, size, 4)).toEqual({ x: 36, y: 568 });
    expect(clampToViewport({ x: 900, y: -10 }, vp, size, 4)).toEqual({ x: 764, y: 32 });
  });

  it('centres the dog when the viewport is smaller than the dog', () => {
    expect(clampToViewport({ x: 0, y: 0 }, { width: 40, height: 40 }, size, 4)).toEqual({
      x: 20,
      y: 20,
    });
  });
});

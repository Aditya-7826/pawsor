/** Pure petting (wiggle) detection. No DOM. */

export interface Sample {
  /** Time of the pointer move. */
  t: number;
  /** Horizontal pointer position. */
  x: number;
}

/** Append a sample, keeping at most `max` (oldest dropped). Returns a new array. */
export function pushSample(samples: readonly Sample[], sample: Sample, max: number): Sample[] {
  const next = [...samples, sample];
  return next.length > max ? next.slice(next.length - max) : next;
}

/**
 * Count horizontal direction changes in the last `windowMs`. A change only counts after
 * the pointer travels at least `minStep` px the other way, so hand tremor is ignored.
 */
export function countFlips(
  samples: readonly Sample[],
  now: number,
  windowMs: number,
  minStep: number,
): number {
  const recent = samples.filter((s) => s.t <= now && now - s.t <= windowMs);
  const first = recent[0];
  if (!first) return 0;
  let dir: -1 | 0 | 1 = 0;
  let extreme = first.x;
  let flips = 0;
  for (const { x } of recent.slice(1)) {
    if (dir === 0) {
      if (x - extreme >= minStep) [dir, extreme] = [1, x];
      else if (extreme - x >= minStep) [dir, extreme] = [-1, x];
    } else if (dir === 1) {
      if (x > extreme) extreme = x;
      else if (extreme - x >= minStep) [dir, extreme, flips] = [-1, x, flips + 1];
    } else {
      if (x < extreme) extreme = x;
      else if (x - extreme >= minStep) [dir, extreme, flips] = [1, x, flips + 1];
    }
  }
  return flips;
}

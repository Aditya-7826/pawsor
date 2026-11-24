/** Pure movement math. No DOM. Positions are the dog's centre point. */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function clamp(value: number, min: number, max: number): number {
  if (max < min) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

/** Frame-rate independent lerp factor: the same easing at 30, 60 or 144 fps. */
export function easeFactor(ratePerSecond: number, dtMs: number): number {
  return 1 - Math.exp((-ratePerSecond * dtMs) / 1000);
}

/** Move `pos` toward `target` with exponential easing, never faster than `maxSpeed` px/s. */
export function stepToward(
  pos: Point,
  target: Point,
  dtMs: number,
  ratePerSecond: number,
  maxSpeed: number,
): Point {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) return { x: target.x, y: target.y };
  const eased = d * easeFactor(ratePerSecond, dtMs);
  const step = Math.min(eased, (maxSpeed * dtMs) / 1000, d);
  return { x: pos.x + (dx / d) * step, y: pos.y + (dy / d) * step };
}

/**
 * Where the dog should stand to be `stop` px from the cursor, approaching from the side
 * it is already on. If it is already that close, it stays where it is.
 */
export function followTarget(dog: Point, cursor: Point, stop: number): Point {
  const dx = dog.x - cursor.x;
  const dy = dog.y - cursor.y;
  const d = Math.hypot(dx, dy);
  if (d <= stop) return { x: dog.x, y: dog.y };
  return { x: cursor.x + (dx / d) * stop, y: cursor.y + (dy / d) * stop };
}

/** Keep a box of `size`, centred on `p`, inside the viewport with `pad` px to spare. */
export function clampToViewport(p: Point, viewport: Size, size: Size, pad: number): Point {
  const hw = size.width / 2 + pad;
  const hh = size.height / 2 + pad;
  return {
    x: clamp(p.x, hw, viewport.width - hw),
    y: clamp(p.y, hh, viewport.height - hh),
  };
}

export type Facing = 'left' | 'right';

/** The farther the cursor, the faster the dog runs, between `min` and `max` px/s. */
export function speedFor(distanceToTarget: number, gain: number, min: number, max: number): number {
  return clamp(distanceToTarget * gain, min, max);
}

/** Flip only when the horizontal intent is clearly past the dead zone. */
export function nextFacing(current: Facing, dx: number, deadZone: number): Facing {
  if (dx > deadZone) return 'right';
  if (dx < -deadZone) return 'left';
  return current;
}

/** Map speed (px/s) to a leg-cycle duration: faster running, quicker steps. */
export function trotDuration(
  speed: number,
  minSpeed: number,
  maxSpeed: number,
  slowS: number,
  fastS: number,
): number {
  const t = clamp((speed - minSpeed) / Math.max(maxSpeed - minSpeed, 1), 0, 1);
  return slowS + (fastS - slowS) * t;
}

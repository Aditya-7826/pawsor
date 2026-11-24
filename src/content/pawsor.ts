import {
  DOG_HEIGHT,
  DOG_WIDTH,
  EDGE_PADDING,
  FOLLOW_EASE,
  MAX_SPEED,
  START_OFFSET,
  STOP_DISTANCE,
} from './config';
import type { DogView } from './dog-view';
import type { Input } from './input';
import { createLoop, type Loop } from './loop';
import { clampToViewport, followTarget, stepToward, type Point, type Size } from './motion';

const DOG_SIZE: Size = { width: DOG_WIDTH, height: DOG_HEIGHT };

/** The controller: reads input, steps the dog, writes the view. */
export function createPawsor(view: DogView, input: Input, win: Window = window): Loop {
  const viewport = (): Size => ({ width: win.innerWidth, height: win.innerHeight });
  let pos: Point = clampToViewport(
    { x: START_OFFSET.x, y: win.innerHeight - START_OFFSET.y },
    viewport(),
    DOG_SIZE,
    EDGE_PADDING,
  );
  view.setPosition(pos);

  const tick = (dt: number): void => {
    // Reads first.
    const vp = viewport();
    const cursor = input.state.pointer;

    if (cursor) {
      const target = followTarget(pos, cursor, STOP_DISTANCE);
      pos = stepToward(pos, target, dt, FOLLOW_EASE, MAX_SPEED);
    }
    pos = clampToViewport(pos, vp, DOG_SIZE, EDGE_PADDING);

    // Then writes.
    view.setPosition(pos);
  };

  return createLoop(tick);
}

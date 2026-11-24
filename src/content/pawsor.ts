import {
  BLINK_MAX_MS,
  BLINK_MIN_MS,
  DOG_HEIGHT,
  DOG_WIDTH,
  EDGE_PADDING,
  FOLLOW_EASE,
  HEAD_TILT_MAX_DEG,
  LOOK_MAX_PX,
  MAX_SPEED,
  START_OFFSET,
  STOP_DISTANCE,
  TWITCH_MAX_MS,
  TWITCH_MIN_MS,
} from './config';
import type { DogView } from './dog-view';
import type { Input } from './input';
import { createLoop, type Loop } from './loop';
import {
  clamp,
  clampToViewport,
  distance,
  followTarget,
  stepToward,
  type Point,
  type Size,
} from './motion';
import { initialState, run, sense, type MachineState } from './state-machine';

const DOG_SIZE: Size = { width: DOG_WIDTH, height: DOG_HEIGHT };

const between = (min: number, max: number): number => min + Math.random() * (max - min);

/** The controller: reads input, senses events, runs the machine, moves and renders. */
export function createPawsor(view: DogView, input: Input, win: Window = window): Loop {
  const viewport = (): Size => ({ width: win.innerWidth, height: win.innerHeight });
  let pos: Point = clampToViewport(
    { x: START_OFFSET.x, y: win.innerHeight - START_OFFSET.y },
    viewport(),
    DOG_SIZE,
    EDGE_PADDING,
  );
  let machine: MachineState = initialState(performance.now());
  let nextBlinkAt = performance.now() + between(BLINK_MIN_MS, BLINK_MAX_MS);
  let nextTwitchAt = performance.now() + between(TWITCH_MIN_MS, TWITCH_MAX_MS);
  view.setPosition(pos);

  const tick = (dt: number, now: number): void => {
    // 1. Reads.
    const vp = viewport();
    const cursor = input.state.pointer;

    // 2. Sense and transition.
    const target = cursor
      ? clampToViewport(followTarget(pos, cursor, STOP_DISTANCE), vp, DOG_SIZE, EDGE_PADDING)
      : pos;
    machine = run(
      machine,
      sense(machine, {
        now,
        distanceToCursor: cursor ? distance(pos, cursor) : null,
        distanceToTarget: distance(pos, target),
        lastMoveAt: input.state.lastMoveAt,
      }),
    );

    // 3. Move.
    if (machine.name === 'follow') {
      pos = stepToward(pos, target, dt, FOLLOW_EASE, MAX_SPEED);
    }
    pos = clampToViewport(pos, vp, DOG_SIZE, EDGE_PADDING);

    // 4. Idle life.
    const idleLike = machine.name === 'idle' || machine.name === 'sit';
    if (now >= nextBlinkAt) {
      view.blink();
      nextBlinkAt = now + between(BLINK_MIN_MS, BLINK_MAX_MS);
    }
    if (now >= nextTwitchAt) {
      if (idleLike) view.twitch();
      nextTwitchAt = now + between(TWITCH_MIN_MS, TWITCH_MAX_MS);
    }
    if (cursor) {
      const dx = cursor.x - pos.x;
      const dy = cursor.y - pos.y;
      const d = Math.max(Math.hypot(dx, dy), 1);
      const look = idleLike ? LOOK_MAX_PX : 0;
      view.setLook(
        (dx / d) * look,
        (dy / d) * look,
        idleLike ? clamp((dy / d) * HEAD_TILT_MAX_DEG, -HEAD_TILT_MAX_DEG, HEAD_TILT_MAX_DEG) : 0,
      );
    }

    // 5. Writes.
    view.setState(machine.name);
    view.setPosition(pos);
  };

  return createLoop(tick);
}

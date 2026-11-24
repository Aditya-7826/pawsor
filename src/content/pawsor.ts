import {
  BLINK_MAX_MS,
  BLINK_MIN_MS,
  DOG_HEIGHT,
  DOG_WIDTH,
  EDGE_PADDING,
  FACE_CURSOR_MIN_DX,
  FACING_DEAD_ZONE,
  FOLLOW_EASE,
  HEAD_TILT_MAX_DEG,
  LOOK_MAX_PX,
  MAX_SPEED,
  MIN_SPEED,
  SPEED_GAIN,
  START_OFFSET,
  STOP_DISTANCE,
  TROT_FAST_S,
  TROT_SLOW_S,
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
  nextFacing,
  speedFor,
  stepToward,
  trotDuration,
  type Facing,
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
  let facing: Facing = 'right';
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
    const toTarget = distance(pos, target);
    machine = run(
      machine,
      sense(machine, {
        now,
        distanceToCursor: cursor ? distance(pos, cursor) : null,
        distanceToTarget: toTarget,
        lastMoveAt: input.state.lastMoveAt,
      }),
    );

    // 3. Move: farther away → faster; legs keep pace with the speed.
    if (machine.name === 'follow') {
      const speed = speedFor(toTarget, SPEED_GAIN, MIN_SPEED, MAX_SPEED);
      pos = stepToward(pos, target, dt, FOLLOW_EASE, speed);
      facing = nextFacing(facing, target.x - pos.x, FACING_DEAD_ZONE);
      view.setTrotSpeed(trotDuration(speed, MIN_SPEED, MAX_SPEED, TROT_SLOW_S, TROT_FAST_S));
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
      if (idleLike) facing = nextFacing(facing, dx, FACE_CURSOR_MIN_DX);
      const d = Math.max(Math.hypot(dx, dy), 1);
      const look = idleLike ? LOOK_MAX_PX : 0;
      // The SVG is mirrored when facing left, so mirror the look offset too.
      const mirror = facing === 'left' ? -1 : 1;
      view.setLook(
        (dx / d) * look * mirror,
        (dy / d) * look,
        idleLike ? clamp((dy / d) * HEAD_TILT_MAX_DEG, -HEAD_TILT_MAX_DEG, HEAD_TILT_MAX_DEG) : 0,
      );
    }

    // 5. Writes.
    view.setState(machine.name);
    view.setFacing(facing);
    view.setPosition(pos);
  };

  return createLoop(tick);
}

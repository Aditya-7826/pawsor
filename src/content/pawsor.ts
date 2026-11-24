import {
  ARRIVE_EPSILON,
  BLINK_MAX_MS,
  BLINK_MIN_MS,
  DOG_HEIGHT,
  DOG_WIDTH,
  EDGE_PADDING,
  FADE_MS,
  FACE_CURSOR_MIN_DX,
  FACING_DEAD_ZONE,
  FOLLOW_EASE,
  HEART_EVERY_MS,
  HEAD_TILT_MAX_DEG,
  LOOK_MAX_PX,
  MAX_SPEED,
  MIN_SPEED,
  PET_MARGIN,
  PERCH_SINK,
  SPEED_GAIN,
  START_OFFSET,
  STOP_DISTANCE,
  TROT_FAST_S,
  TROT_SLOW_S,
  TWITCH_MAX_MS,
  TWITCH_MIN_MS,
  WIGGLE_FLIPS,
  WIGGLE_MIN_STEP,
  WIGGLE_SAMPLES,
  WIGGLE_WINDOW_MS,
} from './config';
import type { Barker } from './audio';
import type { DogView } from './dog-view';
import type { Input } from './input';
import { createLoop, type Loop } from './loop';

export interface Pawsor extends Loop {
  setSound(on: boolean): void;
  /** prefers-reduced-motion: move by gentle fade instead of trotting. */
  setReducedMotion(on: boolean): void;
}
import {
  clamp,
  clampToViewport,
  distance,
  followTarget,
  nextFacing,
  perchPoint,
  speedFor,
  stepToward,
  trotDuration,
  type Facing,
  type Point,
  type Size,
} from './motion';
import { readSelectionLine } from './selection';
import { countFlips, pushSample, type Sample } from './wiggle';
import {
  initialState,
  isWaking,
  run,
  sense,
  type MachineState,
  type StateName,
} from './state-machine';

const DOG_SIZE: Size = { width: DOG_WIDTH, height: DOG_HEIGHT };

const between = (min: number, max: number): number => min + Math.random() * (max - min);

/** The controller: reads input, senses events, runs the machine, moves and renders. */
export function createPawsor(
  view: DogView,
  input: Input,
  barker: Barker | null,
  win: Window = window,
): Pawsor {
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
  let sound = false;
  let samples: Sample[] = [];
  let lastSampleAt = -Infinity;
  let lastWiggleAt = -Infinity;
  let nextHeartAt = 0;
  let barkedThisSession = false;
  let reducedMotion = false;
  let fadeStartedAt: number | null = null;
  let nextFadeAt = 0;
  view.setPosition(pos);

  const tick = (dt: number, now: number): void => {
    // 1. Reads.
    const vp = viewport();
    const cursor = input.state.pointer;
    // Only touch the selection API after a selectionchange said there might be one.
    const line = input.state.selectionActive ? readSelectionLine(win) : null;

    // Petting: sample horizontal pointer moves while the cursor is over the dog.
    const overDog =
      cursor !== null &&
      Math.abs(cursor.x - pos.x) <= DOG_WIDTH / 2 + PET_MARGIN &&
      Math.abs(cursor.y - pos.y) <= DOG_HEIGHT / 2 + PET_MARGIN;
    if (!overDog) {
      samples = [];
    } else if (input.state.lastMoveAt !== lastSampleAt) {
      lastSampleAt = input.state.lastMoveAt;
      samples = pushSample(samples, { t: lastSampleAt, x: cursor.x }, WIGGLE_SAMPLES);
    }
    const wiggling =
      overDog && countFlips(samples, now, WIGGLE_WINDOW_MS, WIGGLE_MIN_STEP) >= WIGGLE_FLIPS;
    if (wiggling) lastWiggleAt = now;

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
        lastInputAt: input.state.lastInputAt,
        clicks: input.state.clicks,
        hasSelection: line !== null,
        wiggling,
        lastWiggleAt,
      }),
    );

    // Petted: hearts while it lasts, one boop per session.
    if (machine.name === 'petted') {
      if (now >= nextHeartAt) {
        view.spawnHeart(pos);
        nextHeartAt = now + HEART_EVERY_MS;
      }
      if (sound && !barkedThisSession) {
        barker?.boop();
        barkedThisSession = true;
      }
    } else {
      barkedThisSession = false;
    }

    // 3. Move: farther away → faster; legs keep pace with the speed.
    let visual: StateName = machine.name;
    const goal =
      machine.name === 'follow'
        ? target
        : machine.name === 'perch' && line
          ? clampToViewport(perchPoint(line, DOG_HEIGHT, PERCH_SINK), vp, DOG_SIZE, EDGE_PADDING)
          : null;
    if (goal && reducedMotion) {
      // Gentle teleport: fade out, move, fade back in. No travel animation at all.
      const remaining = distance(pos, goal);
      if (fadeStartedAt === null && remaining > ARRIVE_EPSILON && now >= nextFadeAt) {
        fadeStartedAt = now;
        view.setFaded(true);
      } else if (fadeStartedAt !== null && now - fadeStartedAt >= FADE_MS) {
        facing = nextFacing(facing, goal.x - pos.x, FACING_DEAD_ZONE);
        pos = goal;
        fadeStartedAt = null;
        nextFadeAt = now + FADE_MS;
        view.setFaded(false);
      }
      if (machine.name === 'follow') visual = 'idle';
    } else if (goal) {
      const remaining = distance(pos, goal);
      const speed = speedFor(remaining, SPEED_GAIN, MIN_SPEED, MAX_SPEED);
      pos = stepToward(pos, goal, dt, FOLLOW_EASE, speed);
      facing = nextFacing(facing, goal.x - pos.x, FACING_DEAD_ZONE);
      view.setTrotSpeed(trotDuration(speed, MIN_SPEED, MAX_SPEED, TROT_SLOW_S, TROT_FAST_S));
      // Walking over to the text looks like a trot until the dog sits down on it.
      if (machine.name === 'perch' && remaining > ARRIVE_EPSILON) visual = 'follow';
    }
    if (!goal && fadeStartedAt !== null) {
      fadeStartedAt = null;
      view.setFaded(false);
    }
    pos = clampToViewport(pos, vp, DOG_SIZE, EDGE_PADDING);

    // 4. Idle life.
    const idleLike =
      visual === 'idle' || visual === 'sit' || visual === 'perch' || visual === 'petted';
    const asleep = machine.name === 'sleep';
    if (now >= nextBlinkAt) {
      if (!asleep) view.blink();
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
    view.setState(visual);
    view.setWaking(isWaking(machine, now));
    view.setFacing(facing);
    view.setPosition(pos);
  };

  const loop = createLoop(tick);
  return {
    ...loop,
    setSound(on) {
      sound = on;
    },
    setReducedMotion(on) {
      reducedMotion = on;
      if (!on && fadeStartedAt !== null) {
        fadeStartedAt = null;
        view.setFaded(false);
      }
    },
  };
}

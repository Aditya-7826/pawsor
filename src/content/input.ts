import type { Point } from './motion';

/** Latest input facts, written by DOM listeners and read once per frame. */
export interface InputState {
  /** Last known pointer position in viewport coordinates, null until first move. */
  pointer: Point | null;
  /** Time of the last pointer movement (performance.now() timebase). */
  lastMoveAt: number;
  /** Time of the last input of any kind. */
  lastInputAt: number;
}

export interface Input {
  state: InputState;
  dispose(): void;
}

export function createInput(
  win: Window = window,
  now: () => number = () => performance.now(),
): Input {
  const state: InputState = { pointer: null, lastMoveAt: now(), lastInputAt: now() };
  const controller = new AbortController();
  const opts: AddEventListenerOptions = {
    passive: true,
    capture: true,
    signal: controller.signal,
  };

  win.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      const t = now();
      state.pointer = { x: e.clientX, y: e.clientY };
      state.lastMoveAt = t;
      state.lastInputAt = t;
    },
    opts,
  );

  return { state, dispose: () => controller.abort() };
}

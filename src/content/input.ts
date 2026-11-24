import { CLICK_HISTORY } from './config';
import type { Point } from './motion';

/** Latest input facts, written by DOM listeners and read once per frame. */
export interface InputState {
  /** Last known pointer position in viewport coordinates, null until first move. */
  pointer: Point | null;
  /** Time of the last pointer movement (performance.now() timebase). */
  lastMoveAt: number;
  /** Time of the last input of any kind. */
  lastInputAt: number;
  /** Recent click (pointerdown) times, oldest first. */
  clicks: number[];
  /** The page may have a non-empty selection (cheap flag set on selectionchange). */
  selectionActive: boolean;
}

export interface Input {
  state: InputState;
  dispose(): void;
}

export function createInput(
  win: Window = window,
  now: () => number = () => performance.now(),
): Input {
  const state: InputState = {
    pointer: null,
    lastMoveAt: now(),
    lastInputAt: now(),
    clicks: [],
    selectionActive: false,
  };
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

  win.addEventListener(
    'pointerdown',
    () => {
      state.clicks.push(now());
      if (state.clicks.length > CLICK_HISTORY) state.clicks.shift();
    },
    opts,
  );

  // Any other activity keeps the dog awake. Listen only; never intercept.
  const touch = (): void => {
    state.lastInputAt = now();
  };
  for (const type of ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'] as const) {
    win.addEventListener(type, touch, opts);
  }

  win.document.addEventListener(
    'selectionchange',
    () => {
      const sel = win.getSelection();
      state.selectionActive = sel !== null && !sel.isCollapsed;
    },
    opts,
  );

  return { state, dispose: () => controller.abort() };
}

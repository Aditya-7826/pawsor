import { MAX_DT_MS } from './config';

export type TickFn = (dtMs: number, now: number) => void;

export interface Loop {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

export interface FrameApi {
  request(cb: FrameRequestCallback): number;
  cancel(id: number): void;
}

const browserFrames: FrameApi = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

/**
 * A requestAnimationFrame loop with clamped delta time. The first frame after start
 * gets dt = 0 so a resumed loop never jumps.
 */
export function createLoop(tick: TickFn, frames: FrameApi = browserFrames): Loop {
  let id: number | null = null;
  let last: number | null = null;

  const frame = (now: number): void => {
    const dt = last === null ? 0 : Math.min(Math.max(now - last, 0), MAX_DT_MS);
    last = now;
    id = frames.request(frame);
    tick(dt, now);
  };

  return {
    start() {
      if (id !== null) return;
      last = null;
      id = frames.request(frame);
    },
    stop() {
      if (id === null) return;
      frames.cancel(id);
      id = null;
      last = null;
    },
    isRunning: () => id !== null,
  };
}

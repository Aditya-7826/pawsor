import { describe, expect, it } from 'vitest';
import { createLoop } from './loop';

function fakeFrames() {
  let next = 1;
  const queue = new Map<number, FrameRequestCallback>();
  return {
    request(cb: FrameRequestCallback) {
      const id = next++;
      queue.set(id, cb);
      return id;
    },
    cancel(id: number) {
      queue.delete(id);
    },
    flush(now: number) {
      const cbs = [...queue.values()];
      queue.clear();
      cbs.forEach((cb) => cb(now));
    },
    get size() {
      return queue.size;
    },
  };
}

describe('createLoop', () => {
  it('starts with dt 0 and then passes elapsed time', () => {
    const frames = fakeFrames();
    const dts: number[] = [];
    const loop = createLoop((dt) => dts.push(dt), frames);
    loop.start();
    frames.flush(1000);
    frames.flush(1016);
    expect(dts).toEqual([0, 16]);
  });

  it('clamps long gaps so the dog never teleports', () => {
    const frames = fakeFrames();
    const dts: number[] = [];
    const loop = createLoop((dt) => dts.push(dt), frames);
    loop.start();
    frames.flush(0);
    frames.flush(5000);
    expect(dts[1]).toBe(50);
  });

  it('stops scheduling frames when stopped and resets dt on restart', () => {
    const frames = fakeFrames();
    const dts: number[] = [];
    const loop = createLoop((dt) => dts.push(dt), frames);
    loop.start();
    frames.flush(0);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
    expect(frames.size).toBe(0);
    loop.start();
    frames.flush(9000);
    expect(dts).toEqual([0, 0]);
  });

  it('ignores duplicate starts', () => {
    const frames = fakeFrames();
    const loop = createLoop(() => undefined, frames);
    loop.start();
    loop.start();
    expect(frames.size).toBe(1);
  });
});

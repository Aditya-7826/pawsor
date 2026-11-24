import { describe, expect, it, vi } from 'vitest';
import { createBarker } from './audio';

function fakeWindow(opts: { hasBeenActive?: boolean; audio?: boolean }) {
  const started: number[] = [];
  class FakeContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    createOscillator() {
      return {
        type: '',
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: (node: unknown) => node,
        start: (t: number) => started.push(t),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: (node: unknown) => node,
      };
    }
    resume() {
      return Promise.resolve();
    }
  }
  const win = {
    navigator:
      opts.hasBeenActive === undefined
        ? {}
        : { userActivation: { hasBeenActive: opts.hasBeenActive } },
    ...(opts.audio === false ? {} : { AudioContext: FakeContext }),
  } as unknown as Window;
  return { win, started };
}

describe('createBarker', () => {
  it('plays a two-note boop after a user gesture', () => {
    const { win, started } = fakeWindow({ hasBeenActive: true });
    createBarker(win).boop();
    expect(started).toHaveLength(2);
  });

  it('stays silent before any user gesture', () => {
    const { win, started } = fakeWindow({ hasBeenActive: false });
    createBarker(win).boop();
    expect(started).toHaveLength(0);
  });

  it('is silent and does not throw without Web Audio', () => {
    const { win } = fakeWindow({ hasBeenActive: true, audio: false });
    expect(() => createBarker(win).boop()).not.toThrow();
  });
});

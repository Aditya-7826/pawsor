import { describe, expect, it } from 'vitest';
import { createInput } from './input';

function setup() {
  let t = 0;
  const input = createInput(window, () => t);
  return {
    input,
    at: (ms: number): void => {
      t = ms;
    },
  };
}

describe('createInput', () => {
  it('tracks pointer position and movement time', () => {
    const { input, at } = setup();
    at(100);
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 20 }));
    expect(input.state.pointer).toEqual({ x: 10, y: 20 });
    expect(input.state.lastMoveAt).toBe(100);
    expect(input.state.lastInputAt).toBe(100);
    input.dispose();
  });

  it('treats clicks, keys, wheel, scroll and touch as activity but not movement', () => {
    const { input, at } = setup();
    const types = ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'];
    types.forEach((type, i) => {
      at(200 + i);
      window.dispatchEvent(new Event(type));
      expect(input.state.lastInputAt, type).toBe(200 + i);
    });
    expect(input.state.lastMoveAt).toBe(0);
    input.dispose();
  });

  it('never cancels page events', () => {
    const { input } = setup();
    const e = new Event('keydown', { cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    input.dispose();
  });

  it('stops listening after dispose', () => {
    const { input, at } = setup();
    input.dispose();
    at(500);
    window.dispatchEvent(new Event('keydown'));
    expect(input.state.lastInputAt).toBe(0);
  });
});

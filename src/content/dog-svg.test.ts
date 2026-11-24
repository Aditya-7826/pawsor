import { describe, expect, it } from 'vitest';
import { createDogSvg, DOG_PARTS } from './dog-svg';

describe('createDogSvg', () => {
  it('builds an svg that is hidden from assistive tech', () => {
    const svg = createDogSvg();
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.getAttribute('width')).toBe('64');
  });

  it('has a separate group for every animatable part', () => {
    const svg = createDogSvg();
    for (const part of DOG_PARTS) {
      const el = svg.querySelector(`[data-part="${part}"]`);
      expect(el, part).not.toBeNull();
      expect(el?.tagName.toLowerCase(), part).toBe('g');
    }
    expect(svg.querySelectorAll('.pawsor-leg')).toHaveLength(4);
  });

  it('has open, closed and happy eye variants', () => {
    const svg = createDogSvg();
    expect(svg.querySelector('.pawsor-eyes-open')).not.toBeNull();
    expect(svg.querySelector('.pawsor-eyes-closed')).not.toBeNull();
    expect(svg.querySelector('.pawsor-eyes-happy')).not.toBeNull();
  });

  it('returns a new element on every call', () => {
    expect(createDogSvg()).not.toBe(createDogSvg());
  });
});

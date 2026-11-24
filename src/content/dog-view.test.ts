import { describe, expect, it } from 'vitest';
import { createDogView } from './dog-view';

describe('createDogView', () => {
  it('puts the dog svg in the overlay', () => {
    const overlay = document.createElement('div');
    const view = createDogView(overlay);
    expect(overlay.firstElementChild).toBe(view.dog);
    expect(view.dog.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('positions the dog by its centre point', () => {
    const view = createDogView(document.createElement('div'));
    view.setPosition({ x: 132, y: 128 });
    expect(view.dog.style.transform).toMatch(/^translate3d\(100px, 100px, 0(px)?\)$/);
  });

  it('starts idle, facing right with the honey coat', () => {
    const { dog } = createDogView(document.createElement('div'));
    expect(dog.dataset['state']).toBe('idle');
    expect(dog.dataset['facing']).toBe('right');
    expect(dog.dataset['coat']).toBe('honey');
  });
});

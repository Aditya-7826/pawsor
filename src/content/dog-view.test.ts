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

describe('dog view state and look', () => {
  it('writes the behaviour state as a data attribute', () => {
    const view = createDogView(document.createElement('div'));
    view.setState('sit');
    expect(view.dog.dataset['state']).toBe('sit');
  });

  it('writes look offsets and head tilt as custom properties', () => {
    const view = createDogView(document.createElement('div'));
    view.setLook(1.25, -0.5, 4);
    expect(view.dog.style.getPropertyValue('--look-x')).toBe('1.3px');
    expect(view.dog.style.getPropertyValue('--look-y')).toBe('-0.5px');
    expect(view.dog.style.getPropertyValue('--head-tilt')).toBe('4.0deg');
  });
});

describe('dog view facing and trot', () => {
  it('writes facing and only updates trot speed on meaningful change', () => {
    const view = createDogView(document.createElement('div'));
    view.setFacing('left');
    expect(view.dog.dataset['facing']).toBe('left');
    view.setTrotSpeed(0.3);
    expect(view.dog.style.getPropertyValue('--trot-speed')).toBe('0.30s');
    view.setTrotSpeed(0.31);
    expect(view.dog.style.getPropertyValue('--trot-speed')).toBe('0.30s');
    view.setTrotSpeed(0.4);
    expect(view.dog.style.getPropertyValue('--trot-speed')).toBe('0.40s');
  });
});

describe('dog view sleep', () => {
  it('has a z z z bubble outside the mirrored wrapper', () => {
    const view = createDogView(document.createElement('div'));
    const zzz = view.dog.querySelector('.pawsor-zzz');
    expect(zzz?.textContent).toBe('zzz');
    expect(zzz?.closest('.pawsor-flip')).toBeNull();
  });

  it('toggles the waking flag', () => {
    const view = createDogView(document.createElement('div'));
    view.setWaking(true);
    expect('waking' in view.dog.dataset).toBe(true);
    view.setWaking(false);
    expect('waking' in view.dog.dataset).toBe(false);
  });
});

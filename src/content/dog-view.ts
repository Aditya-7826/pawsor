import { BLINK_MS, DOG_HEIGHT, DOG_WIDTH, TWITCH_MS } from './config';
import { createDogSvg } from './dog-svg';
import type { Facing, Point } from './motion';
import type { StateName } from './state-machine';

/**
 * Owns the dog element inside the overlay. Write-only: it never reads layout, so the
 * render loop can call it after all reads for the frame are done.
 * The dog's position is the centre of its 64×56 box.
 */
export interface DogView {
  dog: HTMLDivElement;
  setPosition(p: Point): void;
  setState(name: StateName): void;
  setFacing(facing: Facing): void;
  /** True during the wake-up stretch. */
  setWaking(waking: boolean): void;
  /** Leg-cycle duration in seconds. */
  setTrotSpeed(seconds: number): void;
  /** Eye offset in px and head tilt in degrees, in the dog's own (right-facing) frame. */
  setLook(x: number, y: number, tiltDeg: number): void;
  blink(): void;
  twitch(): void;
}

/** Add a class for `ms`, restarting the animation if it is already running. */
function pulseClass(el: HTMLElement, cls: string, ms: number): void {
  el.classList.remove(cls);
  // A frame gap restarts the CSS animation without forcing layout.
  requestAnimationFrame(() => {
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  });
}

export function createDogView(overlay: HTMLElement): DogView {
  const doc = overlay.ownerDocument;
  const dog = doc.createElement('div');
  dog.className = 'pawsor-dog';
  dog.dataset['state'] = 'idle';
  dog.dataset['facing'] = 'right';
  dog.dataset['coat'] = 'honey';

  const flip = doc.createElement('div');
  flip.className = 'pawsor-flip';
  flip.append(createDogSvg(doc));
  // Bubbles sit outside the flip wrapper so their text never mirrors.
  const zzz = doc.createElement('div');
  zzz.className = 'pawsor-bubble pawsor-zzz';
  for (const ch of ['z', 'z', 'z']) {
    const span = doc.createElement('span');
    span.textContent = ch;
    zzz.append(span);
  }
  const bang = doc.createElement('div');
  bang.className = 'pawsor-bubble pawsor-bang';
  bang.textContent = '!';
  dog.append(flip, zzz, bang);
  overlay.append(dog);

  let lastLook = '';
  let lastTrot = 0;

  return {
    dog,
    setPosition(p) {
      const x = Math.round((p.x - DOG_WIDTH / 2) * 10) / 10;
      const y = Math.round((p.y - DOG_HEIGHT / 2) * 10) / 10;
      dog.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },
    setState(name) {
      if (dog.dataset['state'] !== name) dog.dataset['state'] = name;
    },
    setWaking(waking) {
      if (waking === 'waking' in dog.dataset) return;
      if (waking) dog.dataset['waking'] = '';
      else delete dog.dataset['waking'];
    },
    setFacing(facing) {
      if (dog.dataset['facing'] !== facing) dog.dataset['facing'] = facing;
    },
    setTrotSpeed(seconds) {
      // Small changes would restart the animation for nothing.
      if (Math.abs(seconds - lastTrot) < 0.02) return;
      lastTrot = seconds;
      dog.style.setProperty('--trot-speed', `${seconds.toFixed(2)}s`);
    },
    setLook(x, y, tiltDeg) {
      const key = `${x.toFixed(1)}|${y.toFixed(1)}|${tiltDeg.toFixed(1)}`;
      if (key === lastLook) return;
      lastLook = key;
      dog.style.setProperty('--look-x', `${x.toFixed(1)}px`);
      dog.style.setProperty('--look-y', `${y.toFixed(1)}px`);
      dog.style.setProperty('--head-tilt', `${tiltDeg.toFixed(1)}deg`);
    },
    blink() {
      pulseClass(dog, 'is-blinking', BLINK_MS);
    },
    twitch() {
      pulseClass(dog, 'is-twitching', TWITCH_MS);
    },
  };
}

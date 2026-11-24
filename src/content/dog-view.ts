import { DOG_HEIGHT, DOG_WIDTH } from './config';
import { createDogSvg } from './dog-svg';

export interface Point {
  x: number;
  y: number;
}

/**
 * Owns the dog element inside the overlay. Write-only: it never reads layout, so the
 * render loop can call it after all reads for the frame are done.
 * The dog's position is the centre of its 64×56 box.
 */
export interface DogView {
  dog: HTMLDivElement;
  setPosition(p: Point): void;
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
  dog.append(flip);
  overlay.append(dog);

  return {
    dog,
    setPosition(p) {
      const x = Math.round((p.x - DOG_WIDTH / 2) * 10) / 10;
      const y = Math.round((p.y - DOG_HEIGHT / 2) * 10) / 10;
      dog.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },
  };
}

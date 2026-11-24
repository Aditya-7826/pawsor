import { beforeEach, describe, expect, it } from 'vitest';
import popupHtml from '../../popup.html?raw';
import { createChromeStore, SETTINGS_KEY, type Settings } from '../shared/settings';
import { createChromeFake, type ChromeFake } from '../test/chrome-fake';
import { initPopup } from './popup';

const flush = () => new Promise((r) => setTimeout(r, 0));

function mountMarkup(): void {
  const body = /<body>([\s\S]*)<\/body>/.exec(popupHtml)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/, '');
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stored = (fake: ChromeFake) => fake.data[SETTINGS_KEY] as Settings;

async function open(fake: ChromeFake, hostname: string | null = 'example.com') {
  await initPopup(document, {
    store: createChromeStore(fake.api),
    getHostname: () => Promise.resolve(hostname),
  });
}

beforeEach(() => {
  mountMarkup();
});

describe('popup', () => {
  it('is busy with disabled controls until settings load', () => {
    expect($('popup').getAttribute('aria-busy')).toBe('true');
    expect($<HTMLButtonElement>('show').disabled).toBe(true);
  });

  it('shows defaults: visible, honey, sound off', async () => {
    await open(createChromeFake());
    expect($('popup').getAttribute('aria-busy')).toBe('false');
    expect($('show').getAttribute('aria-checked')).toBe('true');
    expect($('sound').getAttribute('aria-checked')).toBe('false');
    const checked = document.querySelector('[role="radio"][aria-checked="true"]');
    expect(checked?.getAttribute('aria-label')).toBe('Honey coat');
  });

  it('every control has an accessible name', async () => {
    await open(createChromeFake());
    for (const id of ['show', 'sound', 'site']) {
      expect($(id).getAttribute('aria-labelledby'), id).toBeTruthy();
    }
    document.querySelectorAll('[role="radio"]').forEach((r) => {
      expect(r.getAttribute('aria-label')).toMatch(/coat$/);
    });
  });

  it('toggles show and sound and saves them', async () => {
    const fake = createChromeFake();
    await open(fake);
    $('show').click();
    $('sound').click();
    await flush();
    expect(stored(fake).visible).toBe(false);
    expect(stored(fake).sound).toBe(true);
    expect($('popup').hasAttribute('data-hidden-dog')).toBe(true);
  });

  it('picks a coat by click and by arrow keys (roving tabindex)', async () => {
    const fake = createChromeFake();
    await open(fake);
    const radios = [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    radios[1]?.click();
    await flush();
    expect(stored(fake).coat).toBe('cocoa');
    radios[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await flush();
    expect(stored(fake).coat).toBe('snow');
    expect(radios[2]?.tabIndex).toBe(0);
    expect(radios[0]?.tabIndex).toBe(-1);
    radios[2]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await flush();
    expect(stored(fake).coat).toBe('honey');
  });

  it('disables Pawsor on the current site only', async () => {
    const fake = createChromeFake();
    await open(fake, 'news.example.com');
    expect($('site-host').textContent).toBe('news.example.com');
    $('site').click();
    await flush();
    expect(stored(fake).disabledSites).toEqual(['news.example.com']);
    expect($('site').getAttribute('aria-checked')).toBe('true');
    $('site').click();
    await flush();
    expect(stored(fake).disabledSites).toEqual([]);
  });

  it('explains when Pawsor cannot run on the page', async () => {
    await open(createChromeFake(), null);
    expect($<HTMLButtonElement>('site').disabled).toBe(true);
    expect($('site-host').textContent).toBe("Pawsor can't visit this page");
  });

  it('shows a note and still works with defaults when storage fails', async () => {
    const fake = createChromeFake();
    fake.failNextGet = true;
    await open(fake);
    expect($('note').textContent).toBe("Settings couldn't be saved");
    expect($<HTMLButtonElement>('show').disabled).toBe(false);
  });

  it('reflects changes made elsewhere (e.g. the keyboard shortcut)', async () => {
    const fake = createChromeFake();
    await open(fake);
    await createChromeStore(fake.api).update((s) => ({ ...s, visible: false }));
    expect($('show').getAttribute('aria-checked')).toBe('false');
  });
});

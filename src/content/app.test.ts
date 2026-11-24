import { afterEach, describe, expect, it } from 'vitest';
import { HOSTNAME_REQUEST } from '../shared/messages';
import { createChromeStore, SETTINGS_KEY } from '../shared/settings';
import { createChromeFake } from '../test/chrome-fake';
import { startApp, type App } from './app';
import { HOST_TAG } from './config';

let app: App | null = null;

afterEach(() => {
  app?.teardown();
  app = null;
  document.body.innerHTML = '';
});

const hostEl = () => document.querySelector<HTMLElement>(HOST_TAG);

describe('startApp', () => {
  it('mounts with stored settings applied', async () => {
    const fake = createChromeFake({ [SETTINGS_KEY]: { coat: 'cocoa' } });
    app = await startApp(window, '', fake.api);
    expect(hostEl()).not.toBeNull();
    expect(app?.view.dog.dataset['coat']).toBe('cocoa');
    expect(app?.pawsor.isRunning()).toBe(true);
  });

  it('falls back to defaults when storage fails', async () => {
    const fake = createChromeFake();
    fake.failNextGet = true;
    app = await startApp(window, '', fake.api);
    expect(app?.view.dog.dataset['coat']).toBe('honey');
  });

  it('updates live when settings change and hides when turned off', async () => {
    const fake = createChromeFake();
    app = await startApp(window, '', fake.api);
    await createChromeStore(fake.api).update((s) => ({ ...s, coat: 'snow', visible: false }));
    expect(app?.view.dog.dataset['coat']).toBe('snow');
    expect(hostEl()?.style.getPropertyValue('display')).toBe('none');
    expect(app?.pawsor.isRunning()).toBe(false);
  });

  it('stays hidden on a disabled site', async () => {
    const fake = createChromeFake({ [SETTINGS_KEY]: { disabledSites: [location.hostname] } });
    app = await startApp(window, '', fake.api);
    expect(app?.pawsor.isRunning()).toBe(false);
    expect(hostEl()?.style.getPropertyValue('display')).toBe('none');
  });

  it('answers the popup with this page hostname', async () => {
    const fake = createChromeFake();
    app = await startApp(window, '', fake.api);
    let answer: unknown = null;
    fake.messageListeners.forEach((l) => l(HOSTNAME_REQUEST, {}, (r) => (answer = r)));
    expect(answer).toEqual({ hostname: location.hostname });
  });

  it('tears down cleanly', async () => {
    const fake = createChromeFake();
    app = await startApp(window, '', fake.api);
    app?.teardown();
    expect(hostEl()).toBeNull();
    expect(fake.messageListeners).toHaveLength(0);
    app = null;
  });
});

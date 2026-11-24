import { describe, expect, it, vi } from 'vitest';
import { createChromeFake } from '../test/chrome-fake';
import {
  createChromeStore,
  DEFAULT_SETTINGS,
  isDisabledOn,
  MAX_DISABLED_SITES,
  parseSettings,
  SETTINGS_KEY,
  shouldShow,
  withSiteDisabled,
} from './settings';

describe('parseSettings', () => {
  it('returns defaults for missing or corrupt data', () => {
    expect(parseSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ visible: 'yes', coat: 'purple', sound: 1, disabledSites: 'x' })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('sound is off by default', () => {
    expect(parseSettings({}).sound).toBe(false);
  });

  it('keeps valid values', () => {
    expect(
      parseSettings({ visible: false, coat: 'snow', sound: true, disabledSites: ['a.com'] }),
    ).toEqual({ visible: false, coat: 'snow', sound: true, disabledSites: ['a.com'] });
  });

  it('cleans the disabled-sites list: lowercase, de-duplicated, strings only', () => {
    expect(
      parseSettings({ disabledSites: ['A.com', 3, '', 'b.com', 'a.com'] }).disabledSites,
    ).toEqual(['b.com', 'a.com']);
  });

  it('caps the disabled-sites list, keeping the newest', () => {
    const sites = Array.from({ length: MAX_DISABLED_SITES + 5 }, (_, i) => `s${i}.com`);
    const parsed = parseSettings({ disabledSites: sites }).disabledSites;
    expect(parsed).toHaveLength(MAX_DISABLED_SITES);
    expect(parsed[0]).toBe('s5.com');
    expect(parsed.at(-1)).toBe(`s${MAX_DISABLED_SITES + 4}.com`);
  });
});

describe('per-site disable', () => {
  it('adds and removes a hostname', () => {
    const on = withSiteDisabled(DEFAULT_SETTINGS, 'News.Example.com', true);
    expect(isDisabledOn(on, 'news.example.com')).toBe(true);
    expect(isDisabledOn(on, 'example.com')).toBe(false);
    const off = withSiteDisabled(on, 'news.example.com', false);
    expect(off.disabledSites).toEqual([]);
  });

  it('never adds an empty hostname', () => {
    expect(withSiteDisabled(DEFAULT_SETTINGS, '', true).disabledSites).toEqual([]);
  });
});

describe('shouldShow', () => {
  it('needs visible, not disabled here, and not fullscreen', () => {
    const s = { ...DEFAULT_SETTINGS, disabledSites: ['a.com'] };
    expect(shouldShow(s, 'b.com', false)).toBe(true);
    expect(shouldShow(s, 'a.com', false)).toBe(false);
    expect(shouldShow(s, 'b.com', true)).toBe(false);
    expect(shouldShow({ ...s, visible: false }, 'b.com', false)).toBe(false);
  });
});

describe('createChromeStore', () => {
  it('loads defaults, updates and notifies subscribers', async () => {
    const fake = createChromeFake();
    const store = createChromeStore(fake.api);
    expect(await store.load()).toEqual(DEFAULT_SETTINGS);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    await store.update((s) => ({ ...s, coat: 'cocoa' }));
    expect(listener).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, coat: 'cocoa' });
    expect(fake.data[SETTINGS_KEY]).toEqual({ ...DEFAULT_SETTINGS, coat: 'cocoa' });
    unsubscribe();
    await store.update((s) => ({ ...s, coat: 'snow' }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applies concurrent updates one after another without losing any', async () => {
    const fake = createChromeFake();
    const store = createChromeStore(fake.api);
    await Promise.all([
      store.update((s) => ({ ...s, visible: false })),
      store.update((s) => ({ ...s, sound: true })),
      store.update((s) => ({ ...s, coat: 'snow' })),
    ]);
    expect(fake.data[SETTINGS_KEY]).toEqual({
      ...DEFAULT_SETTINGS,
      visible: false,
      sound: true,
      coat: 'snow',
    });
  });

  it('rejects when storage fails so callers can show a note', async () => {
    const fake = createChromeFake();
    fake.failNextGet = true;
    await expect(createChromeStore(fake.api).load()).rejects.toThrow('storage unavailable');
  });
});

/** Settings shared by the content script, popup and background. See ARCHITECTURE §5. */

export type Coat = 'honey' | 'cocoa' | 'snow';
export const COATS: readonly Coat[] = ['honey', 'cocoa', 'snow'];

export interface Settings {
  visible: boolean;
  coat: Coat;
  sound: boolean;
  disabledSites: string[];
}

export const SETTINGS_KEY = 'settings';
export const MAX_DISABLED_SITES = 200;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  visible: true,
  coat: 'honey',
  sound: false,
  disabledSites: [],
});

const isCoat = (v: unknown): v is Coat => typeof v === 'string' && COATS.includes(v as Coat);

export function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase();
}

/** De-duplicate and cap, keeping the most recently added hostnames. */
function cleanSites(sites: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (let i = sites.length - 1; i >= 0; i--) {
    const s = sites[i];
    if (typeof s !== 'string') continue;
    const host = normalizeHost(s);
    if (host === '' || seen.has(host)) continue;
    seen.add(host);
    out.unshift(host);
  }
  return out.slice(Math.max(out.length - MAX_DISABLED_SITES, 0));
}

/** Tolerant parse: anything missing or invalid falls back to the default. */
export function parseSettings(raw: unknown): Settings {
  const r = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    visible: typeof r['visible'] === 'boolean' ? r['visible'] : DEFAULT_SETTINGS.visible,
    coat: isCoat(r['coat']) ? r['coat'] : DEFAULT_SETTINGS.coat,
    sound: typeof r['sound'] === 'boolean' ? r['sound'] : DEFAULT_SETTINGS.sound,
    disabledSites: Array.isArray(r['disabledSites']) ? cleanSites(r['disabledSites']) : [],
  };
}

export function isDisabledOn(settings: Settings, hostname: string): boolean {
  return settings.disabledSites.includes(normalizeHost(hostname));
}

export function withSiteDisabled(
  settings: Settings,
  hostname: string,
  disabled: boolean,
): Settings {
  const host = normalizeHost(hostname);
  const others = settings.disabledSites.filter((s) => s !== host);
  return {
    ...settings,
    disabledSites: cleanSites(disabled && host !== '' ? [...others, host] : others),
  };
}

/** Should the dog be on screen on this page right now? */
export function shouldShow(settings: Settings, hostname: string, fullscreen: boolean): boolean {
  return settings.visible && !isDisabledOn(settings, hostname) && !fullscreen;
}

export interface SettingsStore {
  load(): Promise<Settings>;
  /** Merge `patch` into the stored settings and return the result. */
  update(change: (current: Settings) => Settings): Promise<Settings>;
  /** Called with the new settings whenever they change in any tab or the popup. */
  subscribe(listener: (s: Settings) => void): () => void;
}

/** chrome.storage.sync adapter. Errors surface as rejected promises; callers decide. */
export function createChromeStore(api: typeof chrome = chrome): SettingsStore {
  const load = async (): Promise<Settings> => {
    const got = await api.storage.sync.get(SETTINGS_KEY);
    return parseSettings(got[SETTINGS_KEY]);
  };
  // Updates are read-modify-write, so run them one at a time: two quick clicks must not
  // both read the same old value and overwrite each other.
  let queue: Promise<unknown> = Promise.resolve();
  return {
    load,
    update(change) {
      const run = async (): Promise<Settings> => {
        const next = parseSettings(change(await load()));
        await api.storage.sync.set({ [SETTINGS_KEY]: next });
        return next;
      };
      const result = queue.then(run, run);
      queue = result.catch(() => undefined);
      return result;
    },
    subscribe(listener) {
      const onChanged = (
        changes: Record<string, chrome.storage.StorageChange>,
        area: string,
      ): void => {
        const change = changes[SETTINGS_KEY];
        if (area === 'sync' && change) listener(parseSettings(change.newValue));
      };
      api.storage.onChanged.addListener(onChanged);
      return () => api.storage.onChanged.removeListener(onChanged);
    },
  };
}

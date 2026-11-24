import './popup.css';
import { HOSTNAME_REQUEST, isHostnameResponse } from '../shared/messages';
import {
  COATS,
  createChromeStore,
  DEFAULT_SETTINGS,
  isDisabledOn,
  withSiteDisabled,
  type Coat,
  type Settings,
  type SettingsStore,
} from '../shared/settings';

/** Popup UI. See docs/DESIGN_SYSTEM.md §2.5. */

export interface PopupDeps {
  store: SettingsStore;
  /** Hostname of the active tab, or null when Pawsor cannot run there. */
  getHostname(): Promise<string | null>;
}

const COAT_NAMES: Record<Coat, string> = { honey: 'Honey', cocoa: 'Cocoa', snow: 'Snow' };

/** A mini dog face that takes its colours from --coat custom properties. */
export function faceSvg(): string {
  return `<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false">
    <path d="M22 58 Q16 14 36 6 Q56 18 58 46 Z" fill="var(--coat-shade)"/>
    <path d="M106 58 Q112 14 92 6 Q72 18 70 46 Z" fill="var(--coat-shade)"/>
    <ellipse cx="64" cy="74" rx="50" ry="46" fill="var(--coat)" stroke="var(--coat-shade)" stroke-width="2"/>
    <path d="M50 30 Q64 24 78 30 Q70 46 64 62 Q58 46 50 30 Z" fill="var(--coat-light)"/>
    <ellipse cx="64" cy="92" rx="30" ry="22" fill="var(--coat-light)"/>
    <ellipse cx="30" cy="88" rx="9" ry="6" fill="#ff9eae"/>
    <ellipse cx="98" cy="88" rx="9" ry="6" fill="#ff9eae"/>
    <ellipse cx="42" cy="70" rx="10" ry="11.5" fill="#2b1d16"/>
    <ellipse cx="86" cy="70" rx="10" ry="11.5" fill="#2b1d16"/>
    <circle cx="38.5" cy="65.5" r="4" fill="#fff"/><circle cx="82.5" cy="65.5" r="4" fill="#fff"/>
    <ellipse cx="64" cy="84" rx="8" ry="6" fill="#3b2a20"/>
    <path d="M54 95 Q59 101 64 96 Q69 101 74 95" fill="none" stroke="#3b2a20" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

function must<T extends HTMLElement>(doc: Document, id: string): T {
  const el = doc.getElementById(id);
  if (!el) throw new Error(`Pawsor popup: missing #${id}`);
  return el as T;
}

export async function initPopup(doc: Document, deps: PopupDeps): Promise<void> {
  const root = must<HTMLElement>(doc, 'popup');
  const show = must<HTMLButtonElement>(doc, 'show');
  const sound = must<HTMLButtonElement>(doc, 'sound');
  const site = must<HTMLButtonElement>(doc, 'site');
  const siteHost = must<HTMLElement>(doc, 'site-host');
  const note = must<HTMLElement>(doc, 'note');
  const coatsEl = must<HTMLElement>(doc, 'coats');
  const mark = must<HTMLElement>(doc, 'mark');

  mark.innerHTML = faceSvg();
  mark.dataset['coat'] = 'honey';

  const coatButtons = COATS.map((coat) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'coat';
    b.dataset['coat'] = coat;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', `${COAT_NAMES[coat]} coat`);
    b.setAttribute('aria-checked', 'false');
    b.disabled = true;
    b.innerHTML = `${faceSvg()}<span>${COAT_NAMES[coat]}</span>`;
    coatsEl.append(b);
    return b;
  });

  let settings: Settings = { ...DEFAULT_SETTINGS };
  let hostname: string | null = null;

  const setNote = (text: string): void => {
    note.textContent = text;
  };

  const render = (): void => {
    show.setAttribute('aria-checked', String(settings.visible));
    sound.setAttribute('aria-checked', String(settings.sound));
    mark.dataset['coat'] = settings.coat;
    coatButtons.forEach((b) => {
      const checked = b.dataset['coat'] === settings.coat;
      b.setAttribute('aria-checked', String(checked));
      b.tabIndex = checked ? 0 : -1;
    });
    if (settings.visible) delete root.dataset['hiddenDog'];
    else root.dataset['hiddenDog'] = '';
    if (hostname) {
      site.setAttribute('aria-checked', String(isDisabledOn(settings, hostname)));
    }
  };

  const save = async (change: (s: Settings) => Settings): Promise<void> => {
    settings = change(settings);
    render();
    try {
      settings = await deps.store.update(change);
      setNote('');
    } catch {
      setNote("Settings couldn't be saved");
    }
    render();
  };

  // Loading → success or error.
  try {
    settings = await deps.store.load();
  } catch {
    setNote("Settings couldn't be saved");
  }
  hostname = await deps.getHostname().catch(() => null);

  show.disabled = false;
  sound.disabled = false;
  coatButtons.forEach((b) => (b.disabled = false));
  if (hostname) {
    siteHost.textContent = hostname;
    site.disabled = false;
  } else {
    siteHost.textContent = "Pawsor can't visit this page";
    site.disabled = true;
  }
  render();
  root.setAttribute('aria-busy', 'false');

  show.addEventListener('click', () => void save((s) => ({ ...s, visible: !s.visible })));
  sound.addEventListener('click', () => void save((s) => ({ ...s, sound: !s.sound })));
  site.addEventListener('click', () => {
    const host = hostname;
    if (!host) return;
    void save((s) => withSiteDisabled(s, host, !isDisabledOn(s, host)));
  });

  const pickCoat = (coat: Coat): void => {
    void save((s) => ({ ...s, coat }));
  };
  coatButtons.forEach((b, i) => {
    b.addEventListener('click', () => pickCoat(COATS[i] ?? 'honey'));
    b.addEventListener('keydown', (e: KeyboardEvent) => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      const next = (i + step + COATS.length) % COATS.length;
      coatButtons[next]?.focus();
      pickCoat(COATS[next] ?? 'honey');
    });
  });

  // Keep in sync with changes from the shortcut or another window.
  deps.store.subscribe((s) => {
    settings = s;
    render();
  });
}

function chromeDeps(): PopupDeps {
  return {
    store: createChromeStore(chrome),
    async getHostname() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) return null;
      // No reply means no content script: a page where browsers block extensions.
      const res: unknown = await chrome.tabs.sendMessage(tab.id, HOSTNAME_REQUEST);
      return isHostnameResponse(res) && res.hostname !== '' ? res.hostname : null;
    },
  };
}

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined') {
  void initPopup(document, chromeDeps());
}

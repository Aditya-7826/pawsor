import { isHostnameRequest } from '../shared/messages';
import { createChromeStore, DEFAULT_SETTINGS, shouldShow, type Settings } from '../shared/settings';
import { createBarker } from './audio';
import { REATTACH_CHECK_MS } from './config';
import { createDogView, type DogView } from './dog-view';
import { mountHost, type Host } from './host';
import { createInput } from './input';
import { createPawsor, type Pawsor } from './pawsor';

export interface App {
  host: Host;
  view: DogView;
  pawsor: Pawsor;
  /** Re-evaluate whether the dog should be shown (settings, site, fullscreen). */
  apply(settings: Settings): void;
  teardown(): void;
}

/** After an extension reload or update, chrome.* calls in an old content script throw. */
function contextValid(api: typeof chrome): boolean {
  try {
    return typeof api.runtime.id === 'string';
  } catch {
    return false;
  }
}

/**
 * Boot Pawsor on this page: read settings first (no flash of the wrong coat), mount the
 * Shadow DOM host, and keep in sync with storage. Returns null if nothing was mounted.
 */
export async function startApp(
  win: Window,
  css: string,
  api: typeof chrome = chrome,
): Promise<App | null> {
  const doc = win.document;
  if (!doc.body) return null;

  const store = createChromeStore(api);
  let settings: Settings;
  try {
    settings = await store.load();
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }

  const host = mountHost(doc, css);
  if (!host) return null;
  const view = createDogView(host.overlay);
  const input = createInput(win);
  const pawsor = createPawsor(view, input, createBarker(win), win);

  /** Show and run only when settings allow, not fullscreen, and the tab is visible. */
  const refresh = (): void => {
    const fullscreen = Boolean(doc.fullscreenElement);
    const show = shouldShow(settings, win.location.hostname, fullscreen);
    host.setHidden(!show);
    if (show && doc.visibilityState !== 'hidden') pawsor.start();
    else pawsor.stop();
  };

  const apply = (s: Settings): void => {
    settings = s;
    view.setCoat(s.coat);
    pawsor.setSound(s.sound);
    refresh();
  };

  const events = new AbortController();
  const opts = { signal: events.signal, passive: true };
  doc.addEventListener('fullscreenchange', refresh, opts);
  doc.addEventListener(
    'visibilitychange',
    () => {
      if (doc.visibilityState === 'visible') {
        // Coming back is activity: no instant nap just because the tab was in the background.
        const t = win.performance.now();
        input.state.lastInputAt = t;
        input.state.lastMoveAt = t;
      }
      refresh();
    },
    opts,
  );

  // Reduced motion, including changes while the page is open.
  const motionQuery =
    typeof win.matchMedia === 'function'
      ? win.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  if (motionQuery) {
    pawsor.setReducedMotion(motionQuery.matches);
    motionQuery.addEventListener('change', (e) => pawsor.setReducedMotion(e.matches), opts);
  }

  const onMessage = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ): undefined => {
    if (isHostnameRequest(message)) sendResponse({ hostname: win.location.hostname });
    return undefined;
  };

  let unsubscribe: () => void = () => undefined;
  let timer = 0;
  const teardown = (): void => {
    win.clearInterval(timer);
    events.abort();
    pawsor.stop();
    input.dispose();
    host.remove();
    try {
      unsubscribe();
      api.runtime.onMessage.removeListener(onMessage);
    } catch {
      // The context is already gone; nothing left to unhook.
    }
  };

  apply(settings);
  unsubscribe = store.subscribe(apply);
  api.runtime.onMessage.addListener(onMessage);
  timer = win.setInterval(() => {
    if (!contextValid(api)) {
      teardown();
      return;
    }
    host.ensureAttached();
  }, REATTACH_CHECK_MS);

  return { host, view, pawsor, apply, teardown };
}

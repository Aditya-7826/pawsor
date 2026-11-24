import { HOST_TAG } from './config';

/**
 * The host element and its closed Shadow Root. Everything Pawsor draws lives inside.
 * See docs/ARCHITECTURE.md §3 and KTD-2.
 */
export interface Host {
  host: HTMLElement;
  /** The overlay container inside the Shadow Root. */
  overlay: HTMLDivElement;
  root: ShadowRoot;
  /** Re-append the host if the page removed it. Returns true if it had to. */
  ensureAttached(): boolean;
  setHidden(hidden: boolean): void;
  remove(): void;
}

/**
 * Host styles, applied through the CSSOM: a `style` attribute would be blocked by a strict
 * page CSP, but `style.setProperty` is not.
 */
const HOST_STYLE: readonly (readonly [string, string])[] = [
  ['position', 'fixed'],
  ['inset', '0'],
  ['width', '100vw'],
  ['height', '100vh'],
  ['margin', '0'],
  ['padding', '0'],
  ['border', '0'],
  ['pointer-events', 'none'],
  ['z-index', '2147483647'],
  ['display', 'block'],
  ['contain', 'strict'],
  ['background', 'transparent'],
];

/** Adopt a stylesheet (not subject to page CSP); fall back to a <style> element. */
export function adoptStyles(root: ShadowRoot, css: string): 'adopted' | 'style' {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
    return 'adopted';
  } catch {
    const style = root.ownerDocument.createElement('style');
    style.textContent = css;
    root.prepend(style);
    return 'style';
  }
}

/** Mount the host at the end of <body>. Returns null when there is no body. */
export function mountHost(doc: Document, css: string): Host | null {
  const body = doc.body as HTMLElement | null;
  if (!body) return null;

  // A host left behind by an older copy of the script (e.g. after an extension update).
  doc.querySelectorAll(HOST_TAG).forEach((stale) => stale.remove());

  const host = doc.createElement(HOST_TAG);
  for (const [prop, value] of HOST_STYLE) host.style.setProperty(prop, value, 'important');
  host.setAttribute('aria-hidden', 'true');
  const root = host.attachShadow({ mode: 'closed' });
  adoptStyles(root, css);

  const overlay = doc.createElement('div');
  overlay.className = 'pawsor-overlay';
  root.append(overlay);
  body.append(host);

  return {
    host,
    overlay,
    root,
    ensureAttached() {
      if (host.isConnected) return false;
      const currentBody = doc.body as HTMLElement | null;
      if (!currentBody) return false;
      currentBody.append(host);
      return true;
    },
    setHidden(hidden) {
      if (hidden) host.style.setProperty('display', 'none', 'important');
      else host.style.setProperty('display', 'block', 'important');
    },
    remove() {
      host.remove();
    },
  };
}

type GuardedWindow = Window & { __pawsorInjected?: boolean };

/** Run `boot` at most once per window, even if the script is evaluated twice. */
export function injectOnce(win: Window, boot: () => void): boolean {
  const w = win as GuardedWindow;
  if (w.__pawsorInjected) return false;
  w.__pawsorInjected = true;
  boot();
  return true;
}

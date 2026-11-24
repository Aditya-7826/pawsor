import { afterEach, describe, expect, it, vi } from 'vitest';
import { HOST_TAG } from './config';
import { adoptStyles, injectOnce, mountHost } from './host';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mountHost', () => {
  it('appends one click-through host with a closed shadow root at the end of body', () => {
    document.body.innerHTML = '<p>page</p>';
    const h = mountHost(document, '.x{}');
    expect(h).not.toBeNull();
    expect(document.body.lastElementChild).toBe(h?.host);
    expect(h?.host.tagName.toLowerCase()).toBe(HOST_TAG);
    // Closed mode: the page cannot reach in.
    expect(h?.host.shadowRoot).toBeNull();
    const style = h?.host.style;
    expect(style?.getPropertyValue('pointer-events')).toBe('none');
    expect(style?.getPropertyPriority('pointer-events')).toBe('important');
    expect(style?.getPropertyValue('z-index')).toBe('2147483647');
    expect(style?.getPropertyValue('position')).toBe('fixed');
    expect(h?.root.querySelector('.pawsor-overlay')).toBe(h?.overlay);
  });

  it('returns null when the document has no body', () => {
    const doc = document.implementation.createDocument(null, 'svg', null);
    expect(mountHost(doc, '')).toBeNull();
  });

  it('replaces a stale host left by an older script', () => {
    document.body.append(document.createElement(HOST_TAG));
    mountHost(document, '');
    expect(document.querySelectorAll(HOST_TAG)).toHaveLength(1);
  });

  it('re-attaches when the page removes the host', () => {
    const h = mountHost(document, '');
    expect(h?.ensureAttached()).toBe(false);
    h?.host.remove();
    expect(h?.ensureAttached()).toBe(true);
    expect(h?.host.isConnected).toBe(true);
  });

  it('hides and shows the host', () => {
    const h = mountHost(document, '');
    h?.setHidden(true);
    expect(h?.host.style.getPropertyValue('display')).toBe('none');
    h?.setHidden(false);
    expect(h?.host.style.getPropertyValue('display')).toBe('block');
  });
});

describe('adoptStyles', () => {
  it('falls back to a <style> element when constructable sheets are unavailable', () => {
    const root = document.createElement('div').attachShadow({ mode: 'open' });
    const original = globalThis.CSSStyleSheet;
    vi.stubGlobal('CSSStyleSheet', undefined);
    try {
      expect(adoptStyles(root, '.a{color:red}')).toBe('style');
      expect(root.querySelector('style')?.textContent).toBe('.a{color:red}');
    } finally {
      vi.stubGlobal('CSSStyleSheet', original);
    }
  });
});

describe('injectOnce', () => {
  it('boots only once per window', () => {
    const win = {} as Window;
    const boot = vi.fn();
    expect(injectOnce(win, boot)).toBe(true);
    expect(injectOnce(win, boot)).toBe(false);
    expect(boot).toHaveBeenCalledTimes(1);
  });
});

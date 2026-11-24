/**
 * Content script entry. Built as one IIFE (dist/content.js) and run on every page at
 * document_idle. See docs/ARCHITECTURE.md §3.
 */
import { createBarker } from './audio';
import dogCss from './dog.css?inline';
import shadowCss from './shadow.css?inline';
import { REATTACH_CHECK_MS } from './config';
import { createDogView } from './dog-view';
import { injectOnce, mountHost } from './host';
import { createInput } from './input';
import { createPawsor } from './pawsor';

function boot(): void {
  const host = mountHost(document, `${shadowCss}\n${dogCss}`);
  if (!host) return;

  const view = createDogView(host.overlay);
  const input = createInput(window);
  createPawsor(view, input, createBarker(window), window).start();

  window.setInterval(() => host.ensureAttached(), REATTACH_CHECK_MS);
}

injectOnce(window, () => {
  try {
    boot();
  } catch {
    // Pawsor must never break the page it visits.
  }
});

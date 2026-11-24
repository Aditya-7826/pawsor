/**
 * Content script entry. Built as one IIFE (dist/content.js) and run on every page at
 * document_idle. See docs/ARCHITECTURE.md §3.
 */
import { startApp } from './app';
import dogCss from './dog.css?inline';
import { injectOnce } from './host';
import shadowCss from './shadow.css?inline';

injectOnce(window, () => {
  startApp(window, `${shadowCss}\n${dogCss}`).catch(() => {
    // Pawsor must never break the page it visits.
  });
});

import { createChromeStore } from '../shared/settings';

/**
 * Service worker. Commands are only delivered to extension contexts, so the Alt+Shift+P
 * toggle lives here and flips `visible` in storage; every tab updates via onChanged.
 * See ARCHITECTURE KTD-5.
 */
export const TOGGLE_COMMAND = 'toggle-pawsor';

export function registerCommands(api: typeof chrome): void {
  const store = createChromeStore(api);
  api.commands.onCommand.addListener((command: string) => {
    if (command !== TOGGLE_COMMAND) return;
    store.update((s) => ({ ...s, visible: !s.visible })).catch(() => undefined);
  });
}

if (typeof chrome !== 'undefined' && typeof chrome.commands !== 'undefined') {
  registerCommands(chrome);
}

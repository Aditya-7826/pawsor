import { describe, expect, it } from 'vitest';
import { SETTINGS_KEY } from '../shared/settings';
import { createChromeFake } from '../test/chrome-fake';
import { registerCommands, TOGGLE_COMMAND } from './background';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('background commands', () => {
  it('Alt+Shift+P toggles visibility in storage', async () => {
    const fake = createChromeFake();
    registerCommands(fake.api);
    fake.fireCommand(TOGGLE_COMMAND);
    await flush();
    expect((fake.data[SETTINGS_KEY] as { visible: boolean }).visible).toBe(false);
    fake.fireCommand(TOGGLE_COMMAND);
    await flush();
    expect((fake.data[SETTINGS_KEY] as { visible: boolean }).visible).toBe(true);
  });

  it('ignores other commands', async () => {
    const fake = createChromeFake();
    registerCommands(fake.api);
    fake.fireCommand('something-else');
    await flush();
    expect(fake.data[SETTINGS_KEY]).toBeUndefined();
  });
});

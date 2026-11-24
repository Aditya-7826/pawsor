/** A minimal in-memory `chrome` for tests: storage.sync, storage.onChanged, runtime, tabs. */

type ChangeListener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;
type MessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean | undefined;
type CommandListener = (command: string) => void;

export interface ChromeFake {
  api: typeof chrome;
  data: Record<string, unknown>;
  failNextGet: boolean;
  /** What the active tab's content script answers; null means no content script there. */
  tabResponse: unknown;
  messageListeners: MessageListener[];
  fireCommand(command: string): void;
}

export function createChromeFake(initial: Record<string, unknown> = {}): ChromeFake {
  const data: Record<string, unknown> = structuredClone(initial);
  const changeListeners = new Set<ChangeListener>();
  const commandListeners: CommandListener[] = [];
  const fake: ChromeFake = {
    data,
    failNextGet: false,
    tabResponse: null,
    messageListeners: [],
    fireCommand: (command) => commandListeners.forEach((l) => l(command)),
    api: undefined as unknown as typeof chrome,
  };

  const api = {
    runtime: {
      id: 'pawsor-test',
      onMessage: {
        addListener: (l: MessageListener) => fake.messageListeners.push(l),
        removeListener: (l: MessageListener) => {
          fake.messageListeners = fake.messageListeners.filter((x) => x !== l);
        },
      },
    },
    storage: {
      sync: {
        get: (key: string) => {
          if (fake.failNextGet) {
            fake.failNextGet = false;
            return Promise.reject(new Error('storage unavailable'));
          }
          return Promise.resolve(key in data ? { [key]: structuredClone(data[key]) } : {});
        },
        set: (items: Record<string, unknown>) => {
          const changes: Record<string, chrome.storage.StorageChange> = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: data[k], newValue: structuredClone(v) };
            data[k] = structuredClone(v);
          }
          changeListeners.forEach((l) => l(changes, 'sync'));
          return Promise.resolve();
        },
      },
      onChanged: {
        addListener: (l: ChangeListener) => changeListeners.add(l),
        removeListener: (l: ChangeListener) => changeListeners.delete(l),
      },
    },
    tabs: {
      query: () => Promise.resolve([{ id: 7 }]),
      sendMessage: () =>
        fake.tabResponse === null
          ? Promise.reject(new Error('Could not establish connection.'))
          : Promise.resolve(fake.tabResponse),
    },
    commands: {
      onCommand: { addListener: (l: CommandListener) => commandListeners.push(l) },
    },
  };
  fake.api = api as unknown as typeof chrome;
  return fake;
}

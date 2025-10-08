const ACTIVE_KEY_STORAGE_KEY = 'sf.activeApiKey';
const HISTORY_STORAGE_KEY = 'sf.apiKeyHistory';
const HISTORY_LIMIT = 5;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryStore = new Map<string, string>();

const memoryStorage: StorageLike = {
  getItem(key: string) {
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  },
  setItem(key: string, value: string) {
    memoryStore.set(key, value);
  },
  removeItem(key: string) {
    memoryStore.delete(key);
  },
};

function getStorage(): StorageLike {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return memoryStorage;
}

function readHistory(storage: StorageLike): string[] {
  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function writeHistory(storage: StorageLike, history: string[]): void {
  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));
  } catch {
    // ignore storage quota errors
  }
}

export function getActiveApiKey(): string | null {
  const storage = getStorage();
  return storage.getItem(ACTIVE_KEY_STORAGE_KEY);
}

export function setActiveApiKey(key: string | null): void {
  const storage = getStorage();
  if (!key) {
    storage.removeItem(ACTIVE_KEY_STORAGE_KEY);
    return;
  }
  const normalized = key.trim();
  storage.setItem(ACTIVE_KEY_STORAGE_KEY, normalized);

  const history = readHistory(storage);
  const nextHistory = [normalized, ...history.filter((item) => item !== normalized)];
  writeHistory(storage, nextHistory);
}

export function clearActiveApiKey(): void {
  setActiveApiKey(null);
}

export function getApiKeyHistory(): string[] {
  const storage = getStorage();
  return readHistory(storage);
}

export function removeApiKeyFromHistory(key: string): void {
  const storage = getStorage();
  const history = readHistory(storage).filter((item) => item !== key);
  writeHistory(storage, history);
}

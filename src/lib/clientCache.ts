type CacheEntry<T> = { value: T; expires: number };

const memory = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const STORAGE_PREFIX = 'juxtcine:v2:';

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function normalizeKey(key: string) {
  return key.trim().toLowerCase();
}

function isHollow(value: unknown): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (
    Array.isArray(record.sections) &&
    record.sections.length === 0 &&
    Array.isArray(record.banner) &&
    record.banner.length === 0
  ) {
    return true;
  }
  if (Array.isArray(record.items) && record.items.length === 0) return true;
  return false;
}

export function readCache<T>(key: string): T | null {
  const k = normalizeKey(key);
  const hit = memory.get(k);
  if (hit && hit.expires > Date.now()) {
    if (isHollow(hit.value)) {
      memory.delete(k);
      return null;
    }
    return hit.value as T;
  }

  try {
    const store = storage();
    const raw = store?.getItem(STORAGE_PREFIX + k);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed.expires <= Date.now() || isHollow(parsed.value)) {
      store?.removeItem(STORAGE_PREFIX + k);
      return null;
    }
    memory.set(k, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, value: T, ttlMs: number) {
  if (isHollow(value)) return;
  const k = normalizeKey(key);
  const entry: CacheEntry<T> = { value, expires: Date.now() + ttlMs };
  memory.set(k, entry);
  try {
    storage()?.setItem(STORAGE_PREFIX + k, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

export function clearCache(prefix = '') {
  const needle = normalizeKey(prefix);
  for (const key of [...memory.keys()]) {
    if (!needle || key.startsWith(needle)) memory.delete(key);
  }
  try {
    const store = storage();
    if (!store) return;
    const remove: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key?.startsWith(STORAGE_PREFIX)) continue;
      const bare = key.slice(STORAGE_PREFIX.length);
      if (!needle || bare.startsWith(needle)) remove.push(key);
    }
    for (const key of remove) store.removeItem(key);
  } catch {
    /* private mode */
  }
}

export async function cachedFetch<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = readCache<T>(key);
  if (cached !== null) return cached;

  const k = normalizeKey(key);
  const pending = inflight.get(k);
  if (pending) return pending as Promise<T>;

  const promise = fetcher()
    .then((value) => {
      writeCache(k, value, ttlMs);
      return value;
    })
    .finally(() => {
      inflight.delete(k);
    });

  inflight.set(k, promise);
  return promise;
}

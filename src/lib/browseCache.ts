import type { MediaItem } from '../types';

export interface BrowseRow {
  title: string;
  items: MediaItem[];
  seeAllTo?: string;
}

interface BrowseSnapshot {
  banner: MediaItem[];
  rows: BrowseRow[];
  savedAt: number;
}

const memory = new Map<string, BrowseSnapshot>();
const KEY_PREFIX = 'juxtcine:browse:';
const MAX_AGE_MS = 30 * 60 * 1000;

export function browseCacheKey(tab: string, genre = '') {
  return genre ? `${tab}:${genre}` : tab;
}

export function getBrowseCache(key: string): BrowseSnapshot | null {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.savedAt < MAX_AGE_MS) return hit;

  try {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrowseSnapshot;
    if (!parsed?.rows || Date.now() - parsed.savedAt >= MAX_AGE_MS) return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function setBrowseCache(key: string, banner: MediaItem[], rows: BrowseRow[]) {
  const snapshot: BrowseSnapshot = { banner, rows, savedAt: Date.now() };
  memory.set(key, snapshot);
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
}

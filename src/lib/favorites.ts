import type { MediaItem } from '../types';

export interface FavoriteItem {
  id: string;
  slug: string;
  title: string;
  poster: string;
  type?: string;
  year?: number | null;
  addedAt: number;
}

const KEY = 'juxtcine:favorites';
const MAX_FAVORITES = 300;

const listeners = new Set<() => void>();
let snapshot: FavoriteItem[] = [];
let hydrated = false;

function sanitize(value: unknown): FavoriteItem[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const list: FavoriteItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<FavoriteItem>;
    const slug = typeof entry.slug === 'string' ? entry.slug : typeof entry.id === 'string' ? entry.id : '';
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    list.push({
      id: typeof entry.id === 'string' ? entry.id : slug,
      slug,
      title: typeof entry.title === 'string' ? entry.title : slug,
      poster: typeof entry.poster === 'string' ? entry.poster : '',
      type: typeof entry.type === 'string' ? entry.type : undefined,
      year: typeof entry.year === 'number' ? entry.year : null,
      addedAt: Number(entry.addedAt) || 0,
    });
  }
  return list.sort((a, b) => b.addedAt - a.addedAt);
}

function ensureHydrated() {
  if (hydrated) return;
  hydrated = true;
  try {
    snapshot = sanitize(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    snapshot = [];
  }
}

function commit(next: FavoriteItem[]) {
  snapshot = next.slice(0, MAX_FAVORITES);
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
  for (const listener of listeners) listener();
}

export function listFavorites(): FavoriteItem[] {
  ensureHydrated();
  return snapshot;
}

export function isFavorite(slug: string) {
  ensureHydrated();
  return snapshot.some((item) => item.slug === slug);
}

export function subscribeFavorites(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toMediaItem(item: FavoriteItem): MediaItem {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    poster: item.poster,
    type: item.type || 'movie',
    rating: null,
    year: item.year ?? null,
  };
}

export function addFavorite(item: Pick<MediaItem, 'id' | 'slug' | 'title' | 'poster' | 'type' | 'year'>) {
  ensureHydrated();
  if (!item?.slug || isFavorite(item.slug)) return;
  commit([
    {
      id: item.id || item.slug,
      slug: item.slug,
      title: item.title,
      poster: item.poster,
      type: item.type,
      year: item.year ?? null,
      addedAt: Date.now(),
    },
    ...snapshot,
  ]);
}

export function removeFavorite(slug: string) {
  ensureHydrated();
  if (!snapshot.some((item) => item.slug === slug)) return;
  commit(snapshot.filter((item) => item.slug !== slug));
}

export function toggleFavorite(item: Pick<MediaItem, 'id' | 'slug' | 'title' | 'poster' | 'type' | 'year'>) {
  if (isFavorite(item.slug)) {
    removeFavorite(item.slug);
    return false;
  }
  addFavorite(item);
  return true;
}

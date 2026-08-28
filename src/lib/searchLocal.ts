import type { MediaItem } from '../types';
import { listCachedCatalog } from './browseCache';
import { listFavorites } from './favorites';
import { listHistory } from './history';

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function asMedia(item: {
  id?: string;
  slug: string;
  title: string;
  poster?: string;
  type?: string;
  year?: number | null;
}): MediaItem {
  return {
    id: item.id || item.slug,
    slug: item.slug,
    title: item.title,
    poster: item.poster || '',
    type: item.type || 'movie',
    rating: null,
    year: item.year ?? null,
  };
}

function collectPool(): MediaItem[] {
  const seen = new Set<string>();
  const items: MediaItem[] = [];

  function add(item?: MediaItem | null) {
    if (!item?.slug || seen.has(item.slug)) return;
    seen.add(item.slug);
    items.push(item);
  }

  for (const item of listCachedCatalog()) add(item);
  for (const entry of listHistory()) {
    add(asMedia({ slug: entry.slug, title: entry.title, poster: entry.poster, type: entry.type }));
  }
  for (const fav of listFavorites()) {
    add(asMedia(fav));
  }
  return items;
}

function scoreTitle(title: string, query: string) {
  const t = fold(title);
  const q = fold(query);
  if (!q || !t) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 920;
  const words = t.split(' ');
  if (words.some((word) => word.startsWith(q))) return 860;
  if (t.includes(` ${q} `) || t.endsWith(` ${q}`)) return 780;
  if (t.includes(q)) return 720;

  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return 240;
  }

  if (q.length >= 3) {
    for (const word of words) {
      if (Math.abs(word.length - q.length) > 2) continue;
      if (word.slice(0, 3) === q.slice(0, 3)) return 380;
    }
  }
  return 0;
}

function unique(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.slug || seen.has(item.slug)) return false;
    seen.add(item.slug);
    return true;
  });
}

export function searchLocal(query: string) {
  const q = query.trim();
  const pool = collectPool();
  if (!q) {
    return { matches: pool.slice(0, 36), similar: [] as MediaItem[] };
  }

  const ranked = pool
    .map((item) => ({ item, score: scoreTitle(item.title, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'fr'));

  const matches = ranked.filter((entry) => entry.score >= 380).map((entry) => entry.item);
  const similar = ranked
    .filter((entry) => entry.score > 0 && entry.score < 380)
    .map((entry) => entry.item);

  if (similar.length < 8) {
    const prefix = fold(q).slice(0, 2);
    for (const item of pool) {
      if (matches.some((hit) => hit.slug === item.slug)) continue;
      if (similar.some((hit) => hit.slug === item.slug)) continue;
      if (prefix && fold(item.title).startsWith(prefix)) similar.push(item);
      if (similar.length >= 16) break;
    }
  }

  return { matches: unique(matches), similar: unique(similar).slice(0, 16) };
}

export function mergeSearchResults(apiItems: MediaItem[], query: string) {
  const local = searchLocal(query);
  const matches = unique([...apiItems, ...local.matches]);
  const similar = local.similar
    .filter((item) => !matches.some((hit) => hit.slug === item.slug))
    .slice(0, 12);
  if (!matches.length && similar.length) {
    return { matches: similar, similar: similar.slice(0, 12) };
  }
  return { matches, similar };
}

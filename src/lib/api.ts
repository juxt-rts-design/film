import type {
  CaptionTrack,
  CatalogPage,
  CatalogSection,
  EpisodeInfo,
  HomeData,
  MediaDetail,
  MediaItem,
  MediaType,
  SearchPage,
} from '../types';
import { cachedFetch, readCache, writeCache } from './clientCache';
import { enqueuePrefetch } from './prefetchQueue';

const TTL = {
  home: 5 * 60 * 1000,
  catalog: 8 * 60 * 1000,
  search: 8 * 60 * 1000,
  detail: 20 * 60 * 1000,
};

const prefetchKeys = new Set<string>();

type Json = Record<string, unknown>;

export const PLAYER_ORDER = ['vidzy', 'uqload', 'voe', 'filmoon'];
export const PLAYER_LABELS: Record<string, string> = {
  vidzy: 'Vidzy',
  uqload: 'Uqload',
  voe: 'Voe',
  filmoon: 'Filmoon',
};
export const VERSION_ORDER = ['vff', 'vf', 'tf', 'default', 'vostfr', 'vo'];
export const VERSION_LABELS: Record<string, string> = {
  vff: 'TRUEFRENCH',
  vf: 'VF',
  tf: 'TRUEFRENCH',
  default: 'VF',
  vfq: 'VF',
  vostfr: 'VOSTFR',
  vo: 'VO',
};

function asRecord(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function request<T>(url: string, noCache = false): Promise<T> {
  const response = await fetch(url, {
    cache: noCache ? 'no-store' : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = str(asRecord(data).error || asRecord(data).message, `Erreur ${response.status}`);
    throw new Error(message);
  }
  return data as T;
}

function inferType(title: string, hint = ''): MediaType {
  const blob = `${hint} ${title}`.toLowerCase();
  if (blob.includes('serie') || blob.includes('saison')) return 'tv';
  if (blob.includes('anime')) return 'tv';
  return 'movie';
}

export function parseSeasonNumber(...parts: Array<string | number | null | undefined>): number {
  for (const part of parts) {
    if (typeof part === 'number' && Number.isFinite(part) && part >= 1) {
      return Math.floor(part);
    }
    if (typeof part !== 'string' || !part.trim()) continue;
    const match =
      part.match(/saison\s*(\d{1,2})/i) ||
      part.match(/season\s*(\d{1,2})/i) ||
      part.match(/\bS(?:E)?[\s._-]*0?(\d{1,2})\b/i);
    if (!match) continue;
    const value = Number(match[1]);
    if (value >= 1) return value;
  }
  return 1;
}

function mapItem(raw: unknown, hint = ''): MediaItem | null {
  const item = asRecord(raw);
  const id = str(item.id || item.newsId);
  const title = str(item.title);
  if (!id && !title) return null;
  const score = num(item.score || item.rating);
  return {
    id: id || title,
    title: title || 'Sans titre',
    slug: id || title,
    type: inferType(title, hint || str(item.type)),
    poster: str(item.poster),
    rating: score && score > 0 ? score : null,
    year: num(item.year),
    quality: str(item.quality) || undefined,
    version: str(item.version) || undefined,
    description: str(item.description) || undefined,
  };
}

function mapItems(raw: unknown, hint = ''): MediaItem[] {
  return asArray(raw).map((entry) => mapItem(entry, hint)).filter((item): item is MediaItem => Boolean(item));
}

export function posterUrl(url?: string) {
  return url || '/placeholder.svg';
}

const UNSAFE_EMBED =
  /aliexpress|kokoflix|kakaflix|doodstream|\bdood\.|dsvplay|fsvid|fstream|propeller|exoclick|adsterra|popads|tokyo_go|osaka_go|doubleclick|googlesyndication/i;

export function isSafeEmbed(url: string) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  return !UNSAFE_EMBED.test(url);
}

function youtubeUrl(id: string) {
  if (!id) return null;
  if (/^https?:\/\//i.test(id)) return id;
  return `https://www.youtube.com/embed/${id}`;
}

function cleanSynopsis(text: string) {
  return text.replace(/^Résumé du film[\s\S]*?\n\s*/i, '').trim();
}

export function getHome() {
  return cachedFetch('home', TTL.home, async () => {
    const data = await request<{ sections?: unknown[] }>('/api/fs-home');
    const sections = asArray(data.sections).map((entry) => {
      const section = asRecord(entry);
      const title = str(section.title, 'Catalogue');
      return {
        key: title.toLowerCase(),
        title,
        items: mapItems(section.items, title),
      };
    }).filter((section) => section.items.length > 0);
    return {
      banner: sections[0]?.items || [],
      sections,
    } satisfies HomeData;
  });
}

export function getCatalog(kind: 'films' | 'series' | 'animation' | 'genre', page = 1, genre = '') {
  return cachedFetch(`cat:${kind}:${genre}:${page}`, TTL.catalog, async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (kind === 'genre') {
      if (genre) params.set('genre', genre);
    } else if (kind === 'animation') {
      params.set('genre', 'animation');
    } else {
      params.set('category', kind);
      if (genre) params.set('genre', genre);
    }

    const data = await request<Json>(`/api/fs-home?${params}`);
    const items = mapItems(data.items, kind === 'series' ? 'serie' : kind);
    const totalPages = num(data.totalPages) || 1;
    return {
      page: num(data.currentPage) || page,
      perPage: items.length || 18,
      total: totalPages * (items.length || 18),
      items,
    } satisfies CatalogPage;
  });
}

export async function getCatalogMany(
  kind: 'films' | 'series' | 'animation' | 'genre',
  pages = 5,
  genre = '',
) {
  const batches = await Promise.all(
    Array.from({ length: pages }, (_, index) =>
      getCatalog(kind, index + 1, genre).catch(
        () =>
          ({
            page: index + 1,
            perPage: 0,
            total: 0,
            items: [],
          }) satisfies CatalogPage,
      ),
    ),
  );
  const seen = new Set<string>();
  const items: MediaItem[] = [];
  for (const batch of batches) {
    for (const item of batch.items) {
      if (!item.slug || seen.has(item.slug)) continue;
      seen.add(item.slug);
      items.push(item);
    }
  }
  return items;
}

export function search(query: string, page = 1) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return Promise.resolve({
      query: trimmed,
      page,
      total: 0,
      results: [],
    } satisfies SearchPage);
  }
  return cachedFetch(`search:${trimmed}:${page}`, TTL.search, async () => {
    const data = await request<Json>(`/api/fs-search?q=${encodeURIComponent(trimmed)}`);
    const results = mapItems(data.results || data.items);
    return {
      query: str(data.query, trimmed),
      page,
      total: results.length,
      results,
    } satisfies SearchPage;
  });
}

export async function searchSuggest(query: string) {
  try {
    const data = await search(query, 1);
    return { results: data.results.slice(0, 8) };
  } catch {
    return { results: [] };
  }
}

function versionLabel(value: string) {
  return VERSION_LABELS[value] || value.toUpperCase();
}

function collectVersionsFromPlayers(players: Json) {
  const versions = new Set<string>();
  Object.values(players).forEach((entry) => {
    const player = asRecord(entry);
    if (player.vff) versions.add('vff');
    if (player.vf || player.vfq || player.default) versions.add('vf');
    if (player.vostfr) versions.add('vostfr');
    if (player.vo) versions.add('vo');
  });
  return VERSION_ORDER.filter((value) => versions.has(value)).map((value) => ({
    value: value === 'default' ? 'vf' : value,
    label: versionLabel(value === 'default' ? 'vf' : value),
  }));
}

function mapDetail(data: Json): MediaDetail {
  const meta = asRecord(data.meta);
  const id = str(data.id);
  const title = str(meta.title || data.title, 'Sans titre');
  const type = str(data.type) === 'series' || Boolean(meta.isSeries) ? 'tv' : 'movie';
  const players = asRecord(data.players);
  const episodes = asRecord(data.episodes);
  const episodeInfoRaw = asRecord(data.episodeInfo);

  const episodeInfo: EpisodeInfo[] = Object.keys(episodeInfoRaw)
    .map((key) => {
      const info = asRecord(episodeInfoRaw[key]);
      return {
        episode: Number(key) || 0,
        title: str(info.title, `Épisode ${key}`),
        synopsis: str(info.synopsis),
        poster: str(info.poster),
      };
    })
    .filter((item) => item.episode > 0)
    .sort((a, b) => a.episode - b.episode);

  const episodeVersions = Object.keys(episodes);
  const versions =
    type === 'tv'
      ? VERSION_ORDER.filter((value) => episodeVersions.includes(value)).map((value) => ({
          value,
          label: versionLabel(value),
        }))
      : collectVersionsFromPlayers(players);

  const firstVersion = versions[0]?.value;
  const episodeMap = firstVersion ? asRecord(episodes[firstVersion]) : {};
  const playableEps = Object.keys(episodeMap).map(Number).filter(Boolean).sort((a, b) => a - b);
  const maxEp = playableEps.length ? playableEps[playableEps.length - 1] : episodeInfo.length;
  const seasonNum = parseSeasonNumber(
    num(meta.season ?? meta.currentSeason ?? data.season),
    title,
    str(meta.originalTitle),
  );
  const seasons = type === 'tv' && maxEp > 0 ? [{ season: seasonNum, maxEp }] : [];

  const actors = str(meta.actors)
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return {
    id,
    slug: id,
    title,
    originalTitle: str(meta.originalTitle, title),
    synopsis: cleanSynopsis(str(meta.description)),
    poster: str(meta.poster),
    banner: str(meta.backdrop || meta.poster),
    rating: num(meta.score),
    year: str(meta.year),
    releaseDate: str(meta.year),
    country: '',
    genres: asArray(meta.genres).map((genre) => str(genre)).filter(Boolean),
    type,
    seasons,
    versions,
    players: players as MediaDetail['players'],
    episodes: episodes as MediaDetail['episodes'],
    episodeInfo,
    directors: [],
    cast: actors.slice(0, 12),
    trailer: youtubeUrl(str(meta.trailer)),
    duration: str(meta.runtime),
    quality: str(meta.quality),
    hasResource: Object.keys(players).length > 0 || Object.keys(episodes).length > 0,
  };
}

export function getCachedDetail(slug: string) {
  return readCache<MediaDetail>(`detail:${slug}`);
}

export function getDetail(slug: string) {
  return cachedFetch(`detail:${slug}`, TTL.detail, async () => {
    try {
      const data = await request<Json>(`/api/fs-watch?id=${encodeURIComponent(slug)}`);
      const detail = mapDetail(data);
      if (!detail.id) throw new Error('Fiche introuvable');
      return detail;
    } catch (err) {
      if (/^\d+$/.test(slug)) throw err;
      const query = slug.replace(/-[A-Za-z0-9]{6,}$/, '').replace(/-/g, ' ').trim();
      if (!query) throw err;
      const found = await search(query);
      const hit =
        found.results.find((item) => item.title.toLowerCase().includes(query.toLowerCase())) ||
        found.results[0];
      if (!hit) throw err;
      const data = await request<Json>(`/api/fs-watch?id=${encodeURIComponent(hit.id)}`);
      const detail = mapDetail(data);
      if (!detail.id) throw err;
      return detail;
    }
  });
}

export function listEpisodeNumbers(detail: MediaDetail, version: string) {
  const fromPlayers = Object.keys(detail.episodes[version] || {})
    .map(Number)
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (fromPlayers.length) return fromPlayers;
  return detail.episodeInfo.map((item) => item.episode);
}

export function pickEmbed(detail: MediaDetail, version: string, episode: number, player = '') {
  const candidates: string[] = [];

  if (detail.type === 'tv') {
    const ep = detail.episodes[version]?.[String(episode)] || {};
    if (player && ep[player]) candidates.push(ep[player]);
    for (const key of PLAYER_ORDER) {
      if (ep[key]) candidates.push(ep[key]);
    }
    candidates.push(...Object.values(ep));
  } else {
    const sources = detail.players[player] || {};
    candidates.push(sources[version] || sources.default || sources.vfq || sources.vf || '');
    for (const key of PLAYER_ORDER) {
      const pack = detail.players[key] || {};
      candidates.push(pack[version] || pack.default || pack.vfq || pack.vf || '');
    }
  }

  const embed = candidates.find((url) => isSafeEmbed(url)) || '';
  return withAutoplay(embed);
}

export function withAutoplay(url: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('autoplay', '1');
    return parsed.toString();
  } catch {
    return url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
  }
}

export function listPlayers(detail: MediaDetail, version: string, episode: number) {
  if (detail.type === 'tv') {
    const ep = detail.episodes[version]?.[String(episode)] || {};
    return PLAYER_ORDER.filter((key) => isSafeEmbed(ep[key] || '')).map((key) => ({
      key,
      label: PLAYER_LABELS[key] || key,
      url: ep[key],
    }));
  }
  return PLAYER_ORDER.filter((key) => {
    const pack = detail.players[key] || {};
    const url = pack[version] || pack.default || pack.vfq || pack.vf || '';
    return isSafeEmbed(url);
  }).map((key) => {
    const pack = detail.players[key] || {};
    return {
      key,
      label: PLAYER_LABELS[key] || key,
      url: pack[version] || pack.default || '',
    };
  });
}

export function embedReferer(embedUrl: string) {
  try {
    return new URL(embedUrl).origin + '/';
  } catch {
    return 'https://open-otaku.me/';
  }
}

export function toPlayableUrl(url: string, referer = 'https://open-otaku.me/') {
  if (!url) return '';
  if (url.startsWith('/')) return url;
  const params = new URLSearchParams({ url, referer });
  return `/proxy?${params}`;
}

export function getCaptions(): Promise<CaptionTrack[]> {
  return Promise.resolve([]);
}

export function prefetchDetail(slug: string) {
  const key = `prefetch:detail:${slug}`;
  if (!slug || prefetchKeys.has(key)) return;
  prefetchKeys.add(key);
  enqueuePrefetch(async () => {
    await getDetail(slug);
  });
}

export function cacheDetail(detail: MediaDetail) {
  writeCache(`detail:${detail.slug}`, detail, TTL.detail);
}

export function mediaPath(item: Pick<MediaItem, 'slug'>) {
  return `/movie/${encodeURIComponent(item.slug)}`;
}

export function watchPath(slug: string, se?: number, ep?: number, ver?: string, t?: number) {
  const params = new URLSearchParams();
  if (se) params.set('se', String(se));
  if (ep) params.set('ep', String(ep));
  if (ver) params.set('ver', ver);
  if (t && t > 0) params.set('t', String(Math.floor(t)));
  const query = params.toString();
  return `/watch/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`;
}

export function findSectionItems(sections: CatalogSection[], genreId: string) {
  return sections.find((s) => {
    const id = s.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return id === genreId;
  });
}

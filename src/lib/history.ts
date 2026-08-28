import { watchPath } from './api';

export interface HistoryEntry {
  slug: string;
  title: string;
  poster: string;
  type: string;
  episode: number;
  version: string;
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: number;
}

export interface RecordProgressInput {
  slug: string;
  title: string;
  poster: string;
  type?: string;
  episode: number;
  version: string;
  position: number;
  duration: number;
}

const KEY = 'juxtcine:history';
const MAX_ENTRIES = 60;
const MIN_TRACKED_SECONDS = 15;
const COMPLETED_RATIO = 0.95;
const PERSIST_DELAY_MS = 4000;

const listeners = new Set<() => void>();
let snapshot: HistoryEntry[] = [];
let hydrated = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function sanitize(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const list: HistoryEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const entry = raw as Partial<HistoryEntry>;
    const slug = typeof entry.slug === 'string' ? entry.slug : '';
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    list.push({
      slug,
      title: typeof entry.title === 'string' ? entry.title : slug,
      poster: typeof entry.poster === 'string' ? entry.poster : '',
      type: typeof entry.type === 'string' ? entry.type : 'movie',
      episode: Math.max(1, Number(entry.episode) || 1),
      version: typeof entry.version === 'string' ? entry.version : 'vf',
      position: Math.max(0, Number(entry.position) || 0),
      duration: Math.max(0, Number(entry.duration) || 0),
      completed: Boolean(entry.completed),
      updatedAt: Number(entry.updatedAt) || 0,
    });
  }
  return list.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_ENTRIES);
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

function persistNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* quota */
  }
}

function schedulePersist() {
  if (saveTimer) return;
  saveTimer = setTimeout(persistNow, PERSIST_DELAY_MS);
}

function commit(next: HistoryEntry[], immediate: boolean) {
  snapshot = next.slice(0, MAX_ENTRIES);
  if (immediate) persistNow();
  else schedulePersist();
  for (const listener of listeners) listener();
}

export function listHistory(): HistoryEntry[] {
  ensureHydrated();
  return snapshot;
}

export function isResumable(entry: HistoryEntry) {
  return !entry.completed && entry.position >= MIN_TRACKED_SECONDS;
}

export function getHistory(slug: string) {
  ensureHydrated();
  return snapshot.find((entry) => entry.slug === slug);
}

export function subscribeHistory(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function recordProgress(input: RecordProgressInput) {
  ensureHydrated();
  const position = Math.max(0, Math.floor(input.position));
  const duration = Math.max(0, Math.floor(input.duration));
  if (!input.slug || position < MIN_TRACKED_SECONDS) return;

  const completed = duration > 0 && position / duration >= COMPLETED_RATIO;
  const previous = snapshot.find((entry) => entry.slug === input.slug);
  const next: HistoryEntry = {
    slug: input.slug,
    title: input.title || previous?.title || input.slug,
    poster: input.poster || previous?.poster || '',
    type: input.type || previous?.type || 'movie',
    episode: input.episode,
    version: input.version || previous?.version || 'vf',
    position,
    duration,
    completed,
    updatedAt: Date.now(),
  };

  commit(
    [next, ...snapshot.filter((entry) => entry.slug !== input.slug)],
    completed,
  );
}

export function markCompleted(slug: string) {
  ensureHydrated();
  const entry = snapshot.find((item) => item.slug === slug);
  if (!entry || entry.completed) return;
  commit(
    [
      { ...entry, completed: true, position: entry.duration || entry.position, updatedAt: Date.now() },
      ...snapshot.filter((item) => item.slug !== slug),
    ],
    true,
  );
}

export function removeHistory(slug: string) {
  ensureHydrated();
  if (!snapshot.some((entry) => entry.slug === slug)) return;
  commit(
    snapshot.filter((entry) => entry.slug !== slug),
    true,
  );
}

export function clearHistory() {
  ensureHydrated();
  if (!snapshot.length) return;
  commit([], true);
}

export function flushHistory() {
  if (saveTimer) persistNow();
}

export function resumeRatio(entry: HistoryEntry) {
  if (!entry.duration) return Math.min(0.85, entry.position / 2700);
  return Math.min(1, Math.max(0, entry.position / entry.duration));
}

export function formatRemaining(entry: HistoryEntry) {
  if (!entry.duration) return '';
  const left = Math.max(0, entry.duration - entry.position);
  const minutes = Math.round(left / 60);
  if (minutes < 1) return 'Bientôt fini';
  return `${minutes} min restantes`;
}

export function resumePath(entry: HistoryEntry) {
  const t = entry.completed ? 0 : entry.position;
  return watchPath(entry.slug, 1, entry.episode, entry.version, t);
}

export function playPath(slug: string) {
  const entry = getHistory(slug);
  if (entry && isResumable(entry)) return resumePath(entry);
  return watchPath(slug);
}

export function parseDuration(value?: string) {
  if (!value) return 0;
  const hours = Number(value.match(/(\d+)\s*h/i)?.[1] || 0);
  const minutes = Number(value.match(/(\d+)\s*min/i)?.[1] || 0);
  if (hours || minutes) return hours * 3600 + minutes * 60;
  const asNumber = Number(value);
  return Number.isFinite(asNumber) && asNumber > 30 ? asNumber : 0;
}

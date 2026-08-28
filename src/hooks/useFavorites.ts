import { useCallback, useSyncExternalStore } from 'react';
import { isFavorite, listFavorites, subscribeFavorites } from '../lib/favorites';

export function useFavorites() {
  return useSyncExternalStore(subscribeFavorites, listFavorites, listFavorites);
}

export function useIsFavorite(slug: string) {
  const getSnapshot = useCallback(() => isFavorite(slug), [slug]);
  return useSyncExternalStore(subscribeFavorites, getSnapshot, getSnapshot);
}

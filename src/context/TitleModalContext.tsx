import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import TitleModal from '../components/TitleModal';
import { prefetchDetail } from '../lib/api';
import type { MediaItem } from '../types';

export type TitleRef = Pick<MediaItem, 'slug'> & Partial<MediaItem>;

interface TitleModalContextValue {
  openInfo: (item: TitleRef) => void;
  closeInfo: () => void;
}

const TitleModalContext = createContext<TitleModalContextValue | null>(null);

export function TitleModalProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<TitleRef | null>(null);

  const openInfo = useCallback((next: TitleRef) => {
    if (!next.slug) return;
    prefetchDetail(next.slug);
    setItem(next);
  }, []);

  const closeInfo = useCallback(() => setItem(null), []);

  const value = useMemo(() => ({ openInfo, closeInfo }), [openInfo, closeInfo]);

  return (
    <TitleModalContext.Provider value={value}>
      {children}
      {item ? <TitleModal item={item} onClose={closeInfo} /> : null}
    </TitleModalContext.Provider>
  );
}

export function useTitleModal() {
  const ctx = useContext(TitleModalContext);
  if (!ctx) {
    return {
      openInfo: (_item: TitleRef) => {},
      closeInfo: () => {},
    };
  }
  return ctx;
}

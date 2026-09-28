import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { scrollToTop } from '../lib/scroll';

/** Remonte uniquement au changement de page — pas à chaque `?q=` / onglet / épisode. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    if (pathname.startsWith('/watch')) return;
    scrollToTop();
  }, [pathname]);

  return null;
}

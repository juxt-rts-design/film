/** Seuil UI mobile (barre du bas, fiche, etc.) — desktop inchangé au-dessus. */
export const MOBILE_UI_QUERY = '(max-width: 767px)';

export function isMobileUi(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_UI_QUERY).matches;
}

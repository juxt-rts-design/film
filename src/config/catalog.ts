export type ContentTab = 'accueil' | 'films' | 'series' | 'animation' | 'genres';

export interface NavSection {
  id: ContentTab;
  label: string;
  endpoint?: 'films' | 'series' | 'animation';
  description: string;
}

export const CONTENT_SECTIONS: NavSection[] = [
  {
    id: 'accueil',
    label: 'Accueil',
    description: 'À la une et sélections du moment',
  },
  {
    id: 'films',
    label: 'Films',
    endpoint: 'films',
    description: 'Longs métrages recommandés',
  },
  {
    id: 'series',
    label: 'Séries',
    endpoint: 'series',
    description: 'Séries TV populaires',
  },
  {
    id: 'animation',
    label: 'Animation',
    endpoint: 'animation',
    description: 'Animation & dessins animés',
  },
  {
    id: 'genres',
    label: 'Genres',
    description: 'Parcourir par univers',
  },
];

export const FS_GENRES = [
  { id: 'action', label: 'Action' },
  { id: 'aventure', label: 'Aventure' },
  { id: 'animation', label: 'Animation' },
  { id: 'comedie', label: 'Comédie' },
  { id: 'drame', label: 'Drame' },
  { id: 'horreur', label: 'Horreur' },
  { id: 'fantastique', label: 'Fantastique' },
  { id: 'science-fiction', label: 'Science-fiction' },
  { id: 'thriller', label: 'Thriller' },
  { id: 'policier', label: 'Policier' },
  { id: 'romance', label: 'Romance' },
  { id: 'guerre', label: 'Guerre' },
  { id: 'western', label: 'Western' },
  { id: 'historique', label: 'Historique' },
  { id: 'biopic', label: 'Biopic' },
  { id: 'documentaire', label: 'Documentaire' },
];

export const SECTION_LABELS: Record<string, string> = {
  'Nouveautés Films': 'Nouveautés films',
  'Nouveautés Séries': 'Nouveautés séries',
  'Ajouts de la Commu': 'Ajouts de la commu',
  'BOX OFFICE': 'Box-office',
};

export function translateSection(title: string) {
  return SECTION_LABELS[title] || title.trim();
}

export function getSectionById(id: ContentTab): NavSection {
  return CONTENT_SECTIONS.find((s) => s.id === id) || CONTENT_SECTIONS[0];
}

export function sectionToGenreId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

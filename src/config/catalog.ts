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

export const CATALOG_ROW_TITLES: Record<string, string[]> = {
  films: ['Films du moment', 'À l’affiche', 'Encore plus de films', 'À découvrir', 'Catalogue films'],
  series: ['Séries du moment', 'À ne pas manquer', 'Encore plus de séries', 'À découvrir', 'Catalogue séries'],
  animation: ['Animation du moment', 'Pour tous les âges', 'Encore plus', 'Catalogue animation'],
};

export const CATALOG_GENRE_ROWS: Record<string, { id: string; label: string }[]> = {
  films: [
    { id: 'action', label: 'Action' },
    { id: 'comedie', label: 'Comédie' },
    { id: 'thriller', label: 'Thriller' },
    { id: 'horreur', label: 'Horreur' },
    { id: 'science-fiction', label: 'Science-fiction' },
    { id: 'drame', label: 'Drame' },
  ],
  series: [
    { id: 'drame', label: 'Séries dramatiques' },
    { id: 'comedie', label: 'Séries comiques' },
    { id: 'thriller', label: 'Thrillers' },
    { id: 'policier', label: 'Policier' },
    { id: 'action', label: 'Action' },
    { id: 'science-fiction', label: 'Science-fiction' },
  ],
  animation: [],
};

export function chunkItems<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

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

export function homeSeeAllTo(title: string) {
  const text = title.toLowerCase();
  if (text.includes('série') || text.includes('serie')) return '/?tab=series';
  if (text.includes('anim')) return '/?tab=animation';
  if (text.includes('film') || text.includes('box')) return '/?tab=films';
  const genre = FS_GENRES.find(
    (entry) => text.includes(entry.label.toLowerCase()) || text.includes(entry.id),
  );
  if (genre) return `/?tab=genres&genre=${genre.id}`;
  return '/?tab=films';
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

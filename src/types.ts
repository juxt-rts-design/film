export type MediaType = 'movie' | 'tv' | string;

export interface MediaItem {
  id: string;
  title: string;
  slug: string;
  type: MediaType;
  poster: string;
  rating: number | null;
  year: number | null;
  quality?: string;
  version?: string;
  description?: string;
}

export interface CatalogSection {
  key: string;
  title: string;
  items: MediaItem[];
}

export interface HomeData {
  banner: MediaItem[];
  sections: CatalogSection[];
}

export interface CatalogPage {
  page: number;
  perPage: number;
  total: number;
  items: MediaItem[];
}

export interface SearchPage {
  query: string;
  page: number;
  total: number;
  results: MediaItem[];
}

export interface SeasonInfo {
  season: number;
  maxEp: number;
}

export interface EpisodeInfo {
  episode: number;
  title: string;
  synopsis: string;
  poster: string;
}

export interface PlayerSource {
  key: string;
  label: string;
  url: string;
}

export interface MediaDetail {
  id: string;
  slug: string;
  title: string;
  originalTitle: string;
  synopsis: string;
  poster: string;
  banner: string;
  rating: number | null;
  year: string;
  releaseDate: string;
  country: string;
  genres: string[];
  type: MediaType;
  seasons: SeasonInfo[];
  versions: { value: string; label: string }[];
  players: Record<string, Record<string, string>>;
  episodes: Record<string, Record<string, Record<string, string>>>;
  episodeInfo: EpisodeInfo[];
  directors: string[];
  cast: string[];
  trailer: string | null;
  duration: string;
  quality: string;
  hasResource: boolean;
}

export interface StreamInfo {
  url: string;
  type: 'hls' | 'mp4';
  quality?: string;
  embedUrl?: string;
}

export interface CaptionTrack {
  url: string;
  label: string;
  language: string;
  default?: boolean;
}

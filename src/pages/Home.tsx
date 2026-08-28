import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ContinueRow from '../components/ContinueRow';
import GenreBar from '../components/GenreBar';
import HeroBanner from '../components/HeroBanner';
import MediaRow from '../components/MediaRow';
import {
  CATALOG_GENRE_ROWS,
  CATALOG_ROW_TITLES,
  FS_GENRES,
  chunkItems,
  getSectionById,
  homeSeeAllTo,
  translateSection,
  type ContentTab,
} from '../config/catalog';
import { getCatalogMany, getHome } from '../lib/api';
import type { MediaItem } from '../types';

const GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7';

const CATALOG_PAGES = 8;
const ROW_SIZE = 24;

interface BrowseRow {
  title: string;
  items: MediaItem[];
  seeAllTo?: string;
}

function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}

function rowsFromItems(items: MediaItem[], titles: string[], seeAllTo?: string): BrowseRow[] {
  return chunkItems(items, ROW_SIZE)
    .filter((chunk) => chunk.length > 0)
    .map((chunk, index) => ({
      title: titles[index] || titles[titles.length - 1] || 'Encore plus',
      items: chunk,
      seeAllTo,
    }));
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const activeTab = (params.get('tab') as ContentTab) || 'accueil';
  const activeGenre = params.get('genre');

  const [banner, setBanner] = useState<MediaItem[]>([]);
  const [browseRows, setBrowseRows] = useState<BrowseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastTabRef = useRef(activeTab);

  const setTab = useCallback(
    (tab: ContentTab) => {
      const next = new URLSearchParams();
      if (tab !== 'accueil') next.set('tab', tab);
      setParams(next);
    },
    [setParams],
  );

  const setGenre = useCallback(
    (genreId: string | null) => {
      const next = new URLSearchParams();
      next.set('tab', 'genres');
      if (genreId) next.set('genre', genreId);
      setParams(next);
    },
    [setParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const sameTab = lastTabRef.current === activeTab;
      if (!sameTab) {
        setBrowseRows([]);
        setBanner([]);
        setLoading(true);
      } else if (!browseRows.length) {
        setLoading(true);
      }
      setError(null);

      try {
        if (activeTab === 'accueil') {
          const [home, films, series, animation] = await Promise.all([
            getHome(),
            getCatalogMany('films', 5),
            getCatalogMany('series', 5),
            getCatalogMany('animation', 3),
          ]);
          if (cancelled) return;

          const rows: BrowseRow[] = [
            ...home.sections.map((section) => ({
              title: translateSection(section.title),
              items: section.items,
              seeAllTo: homeSeeAllTo(section.title),
            })),
            ...rowsFromItems(films, ['Films populaires', 'Encore plus de films'], '/?tab=films'),
            ...rowsFromItems(series, ['Séries populaires', 'Encore plus de séries'], '/?tab=series'),
            ...rowsFromItems(animation, ['Animation'], '/?tab=animation'),
          ].filter((row) => row.items.length > 0);

          setBanner(home.banner.length ? home.banner : films.slice(0, 8));
          setBrowseRows(rows);
          setLoading(false);
          lastTabRef.current = activeTab;

          const genreRows = await Promise.all(
            FS_GENRES.map((genre) =>
              getCatalogMany('genre', 2, genre.id).then((items) => ({
                title: genre.label,
                items,
                seeAllTo: `/?tab=genres&genre=${genre.id}`,
              })),
            ),
          );
          if (cancelled) return;
          setBrowseRows((current) => [
            ...current,
            ...genreRows.filter((row) => row.items.length > 5),
          ]);
          return;
        }

        if (activeTab === 'genres') {
          const genreId = activeGenre || 'action';
          const items = await getCatalogMany('genre', CATALOG_PAGES, genreId);
          if (cancelled) return;
          const label = FS_GENRES.find((genre) => genre.id === genreId)?.label || 'Genre';
          setBanner(items.slice(0, 8));
          setBrowseRows(
            rowsFromItems(items, [label, `Encore plus · ${label}`, `Catalogue ${label}`], `/?tab=genres&genre=${genreId}`),
          );
        } else {
          const section = getSectionById(activeTab);
          if (!section.endpoint) {
            setBrowseRows([]);
            setLoading(false);
            return;
          }
          const genreRows = CATALOG_GENRE_ROWS[section.endpoint] || [];
          const titles = CATALOG_ROW_TITLES[section.endpoint] || [section.label];
          const seeAllTo = `/?tab=${section.id}`;
          const [mainItems, ...genrePages] = await Promise.all([
            getCatalogMany(section.endpoint, CATALOG_PAGES),
            ...genreRows.map((genre) =>
              getCatalogMany('genre', 3, genre.id).then((items) => ({
                title: genre.label,
                items:
                  section.endpoint === 'series'
                    ? items.filter((item) => item.type === 'tv')
                    : section.endpoint === 'films'
                      ? items.filter((item) => item.type === 'movie')
                      : items,
                seeAllTo: `/?tab=genres&genre=${genre.id}`,
              })),
            ),
          ]);
          if (cancelled) return;
          const seen = new Set(mainItems.map((item) => item.slug));
          const extra = genrePages
            .map((row) => ({
              ...row,
              items: row.items.filter((item) => item.slug && !seen.has(item.slug)),
            }))
            .filter((row) => row.items.length > 4);
          setBanner(mainItems.slice(0, 8));
          setBrowseRows([...rowsFromItems(mainItems, titles, seeAllTo), ...extra]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur');
      } finally {
        if (!cancelled) {
          lastTabRef.current = activeTab;
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, activeGenre]);

  const section = getSectionById(activeTab);
  const heroItems = banner.length ? banner : browseRows[0]?.items.slice(0, 8) || [];

  return (
    <div className="home nf-browse">
      {loading && !heroItems.length ? (
        <div className="skeleton-hero" />
      ) : heroItems.length ? (
        <HeroBanner items={heroItems} tag={section.label} />
      ) : null}

      {activeTab === 'genres' && (
        <div className="home-controls px-4 sm:px-6">
          <GenreBar
            genres={FS_GENRES}
            activeGenre={activeGenre || 'action'}
            onSelect={(id) => {
              if (!id) setTab('accueil');
              else setGenre(id);
            }}
          />
        </div>
      )}

      {error && <div className="page-error">{error}</div>}

      {activeTab === 'accueil' && <ContinueRow />}

      {loading && !browseRows.length ? (
        <section className="section max-w-[1440px] mx-auto px-4 py-7 sm:px-6">
          <SkeletonGrid />
        </section>
      ) : (
        browseRows.map((row, index) => (
          <MediaRow
            key={`${activeTab}-${row.title}-${index}`}
            title={row.title}
            items={row.items}
            seeAllTo={row.seeAllTo}
          />
        ))
      )}
    </div>
  );
}

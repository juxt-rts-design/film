import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import GenreBar from '../components/GenreBar';
import HeroBanner from '../components/HeroBanner';
import MediaCard from '../components/MediaCard';
import MediaRow from '../components/MediaRow';
import Pagination, { totalPagesFromCount } from '../components/Pagination';
import SectionTabs from '../components/SectionTabs';
import {
  FS_GENRES,
  getSectionById,
  translateSection,
  type ContentTab,
} from '../config/catalog';
import { getCatalog, getHome } from '../lib/api';
import type { CatalogSection, MediaItem } from '../types';

const GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7';

function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div className={GRID_CLASS}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}

export default function Home() {
  const [params, setParams] = useSearchParams();
  const activeTab = (params.get('tab') as ContentTab) || 'accueil';
  const activeGenre = params.get('genre');
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [banner, setBanner] = useState<MediaItem[]>([]);
  const [sections, setSections] = useState<CatalogSection[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(24);
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
      const next = new URLSearchParams(params);
      next.set('tab', 'genres');
      next.delete('page');
      if (genreId) next.set('genre', genreId);
      else next.delete('genre');
      setParams(next);
    },
    [params, setParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const next = new URLSearchParams(params);
      next.set('page', String(nextPage));
      setParams(next);
    },
    [params, setParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const sameTab = lastTabRef.current === activeTab;
      const hasHome = activeTab === 'accueil' && sections.length > 0;
      const hasCatalog = activeTab !== 'accueil' && items.length > 0;
      if (!(sameTab && (hasHome || hasCatalog))) setLoading(true);
      setError(null);

      try {
        if (activeTab === 'accueil') {
          const home = await getHome();
          if (cancelled) return;
          setBanner(home.banner);
          setSections(home.sections);
          setItems([]);
        } else if (activeTab === 'genres') {
          const data = await getCatalog('genre', page, activeGenre || 'action');
          if (cancelled) return;
          setItems(data.items);
          setTotal(data.total);
          setPerPage(data.perPage);
          setBanner(data.items.slice(0, 8));
          setSections([]);
        } else {
          const section = getSectionById(activeTab);
          if (!section.endpoint) return;
          const data = await getCatalog(section.endpoint, page);
          if (cancelled) return;
          setItems(data.items);
          setTotal(data.total);
          setPerPage(data.perPage);
          setBanner(data.items.slice(0, 8));
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
  }, [activeTab, activeGenre, page]);

  const genres = FS_GENRES;
  const activeGenreLabel = FS_GENRES.find((genre) => genre.id === (activeGenre || 'action'))?.label;
  const section = getSectionById(activeTab);
  const catalogPages = Math.min(40, totalPagesFromCount(Math.max(total, items.length), perPage || 24));
  const heroItems = banner.length ? banner : items.slice(0, 8);

  return (
    <div className="home">
      {loading && activeTab === 'accueil' ? (
        <div className="skeleton-hero" />
      ) : heroItems.length ? (
        <HeroBanner items={heroItems} tag={section.label} />
      ) : null}

      <div className="home-controls px-4 sm:px-6">
        <SectionTabs active={activeTab} onChange={setTab} />
        {activeTab === 'genres' && (
          <GenreBar
            genres={genres}
            activeGenre={activeGenre || 'action'}
            onSelect={(id) => {
              if (!id) setTab('accueil');
              else setGenre(id);
            }}
          />
        )}
      </div>

      {error && <div className="page-error">{error}</div>}

      {activeTab === 'accueil' && !loading && (
        <>
          {sections.map((row) => (
            <MediaRow
              key={row.title}
              title={translateSection(row.title)}
              items={row.items}
            />
          ))}
        </>
      )}

      {activeTab === 'genres' && (
        <section className="section max-w-[1440px] mx-auto px-4 py-7 sm:px-6 md:py-10">
          <div className="section-head">
            <h2>{activeGenreLabel || 'Explorer par genre'}</h2>
            <span className="section-desc">{items.length} titres</span>
          </div>
          {loading ? (
            <SkeletonGrid />
          ) : (
            <>
              <div className={GRID_CLASS}>
                {items.map((item) => (
                  <MediaCard key={`${item.id}-${item.slug}`} item={item} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={catalogPages}
                onPageChange={setPage}
                className="mt-8"
              />
            </>
          )}
        </section>
      )}

      {(activeTab === 'films' || activeTab === 'series' || activeTab === 'animation') && (
        <section className="section max-w-[1440px] mx-auto px-4 py-7 sm:px-6 md:py-10">
          <div className="section-head">
            <h2>{section.label}</h2>
            <span className="section-desc">{section.description}</span>
          </div>
          {loading ? (
            <SkeletonGrid />
          ) : (
            <>
              <div className={GRID_CLASS}>
                {items.map((item) => (
                  <MediaCard key={`${item.id}-${item.slug}`} item={item} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={catalogPages}
                onPageChange={setPage}
                className="mt-8"
              />
            </>
          )}
        </section>
      )}

      {loading && activeTab === 'accueil' && (
        <section className="section max-w-[1440px] mx-auto px-4 py-7 sm:px-6">
          <SkeletonGrid count={8} />
        </section>
      )}
    </div>
  );
}

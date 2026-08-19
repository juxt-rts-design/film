import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchAutocomplete from '../components/SearchAutocomplete';
import MediaCard from '../components/MediaCard';
import Pagination, { totalPagesFromCount } from '../components/Pagination';
import { search } from '../lib/api';
import type { MediaItem } from '../types';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get('q') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.min(40, totalPagesFromCount(total || results.length, 24)),
    [total, results.length],
  );

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!initialQuery.trim()) return;

    setLoading(true);
    setError(null);
    search(initialQuery, page)
      .then((data) => {
        setResults(data.results);
        setTotal(data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [initialQuery, page]);

  function runSearch(term: string) {
    if (term.trim()) {
      setParams({ q: term.trim(), page: '1' });
    }
  }

  function changePage(next: number) {
    setParams({ q: initialQuery, page: String(next) });
  }

  return (
    <div className="search-page mx-auto max-w-[1440px] px-4 pb-12 pt-4 sm:px-6 md:pb-16 md:pt-6">
      <div className="search-header mb-6 md:mb-8">
        <h1 className="font-display mb-2 text-xl font-extrabold sm:text-2xl md:text-3xl">
          Recherche Juxt-Ciné
        </h1>
        <p className="mb-4 text-sm text-juxt-muted sm:mb-5 sm:text-base">
          Films, séries et animation
        </p>
        <SearchAutocomplete
          value={query}
          onChange={setQuery}
          variant="page"
          autoFocus
          placeholder="Prison Break, Batman, Wednesday..."
          onSearch={runSearch}
        />
      </div>

      {loading && !results.length && <div className="page-loading">Recherche…</div>}
      {error && <div className="page-error">{error}</div>}

      {initialQuery && (results.length > 0 || !loading) && (
        <p className="results-count mb-4 text-sm text-juxt-muted">
          Page {page} — {results.length} résultat{results.length !== 1 ? 's' : ''} pour « {initialQuery} »
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {results.map((item, index) => (
          <MediaCard key={`${item.id}-${item.slug}-${index}`} item={item} />
        ))}
      </div>

      {!loading && initialQuery && results.length === 0 && !error && (
        <p className="empty-state">Aucun résultat trouvé.</p>
      )}

      {!loading && results.length > 0 && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={changePage}
          className="mt-8 md:mt-10"
        />
      )}
    </div>
  );
}

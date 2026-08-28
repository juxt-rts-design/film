import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchAutocomplete from '../components/SearchAutocomplete';
import MediaCard from '../components/MediaCard';
import { search } from '../lib/api';
import type { MediaItem } from '../types';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const trimmed = initialQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    search(trimmed)
      .then((data) => {
        setResults(data.results);
      })
      .catch(() => {
        setResults([]);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, [initialQuery]);

  function runSearch(term: string) {
    if (term.trim().length >= 2) {
      setParams({ q: term.trim() });
    }
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

      {initialQuery.trim().length === 1 && (
        <p className="empty-state">Tapez au moins 2 lettres pour lancer la recherche.</p>
      )}

      {initialQuery.trim().length >= 2 && (results.length > 0 || !loading) && (
        <p className="results-count mb-4 text-sm text-juxt-muted">
          {results.length} résultat{results.length !== 1 ? 's' : ''} pour « {initialQuery} »
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {results.map((item, index) => (
          <MediaCard key={`${item.id}-${item.slug}-${index}`} item={item} />
        ))}
      </div>

      {!loading && initialQuery.trim().length >= 2 && results.length === 0 && !error && (
        <p className="empty-state">Aucun résultat trouvé.</p>
      )}
    </div>
  );
}

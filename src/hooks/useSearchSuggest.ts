import { useEffect, useRef, useState } from 'react';
import { searchSuggest } from '../lib/api';
import type { MediaItem } from '../types';

const DEBOUNCE_MS = 160;
const MIN_CHARS = 2;

export function useSearchSuggest(query: string) {
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);

      searchSuggest(trimmed)
        .then((data) => {
          if (id !== requestId.current) return;
          setResults(data.results);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setResults([]);
          setError(null);
        })
        .finally(() => {
          if (id !== requestId.current) return;
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  return { results, loading, error, hasQuery: query.trim().length >= MIN_CHARS };
}

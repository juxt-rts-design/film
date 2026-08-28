import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchSuggest } from '../hooks/useSearchSuggest';
import { prefetchDetail, posterUrl } from '../lib/api';
import { playPath } from '../lib/history';
import type { MediaItem } from '../types';
import { IconSearch } from './NavIcons';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variant?: 'navbar' | 'page';
  autoFocus?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  onPick?: () => void;
  onSearch?: (query: string) => void;
}

export default function SearchAutocomplete({
  value,
  onChange,
  placeholder = 'Titres, genres…',
  className = '',
  variant = 'navbar',
  autoFocus = false,
  collapsed = false,
  onToggle,
  onPick,
  onSearch,
}: Props) {
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const { results, loading, error, hasQuery } = useSearchSuggest(value);
  const showPanel = open && hasQuery;

  useEffect(() => {
    setHighlight(-1);
  }, [value, results]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) closePanel();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function closePanel() {
    setOpen(false);
    setHighlight(-1);
  }

  function goSearch(term = value.trim()) {
    if (term.length < 2) return;
    closePanel();
    onPick?.();
    if (onSearch) {
      onSearch(term);
      return;
    }
    navigate(`/search?q=${encodeURIComponent(term)}`);
  }

  function goMedia(item: MediaItem) {
    closePanel();
    onPick?.();
    if (item.slug && item.slug !== item.title) {
      prefetchDetail(item.slug);
      navigate(playPath(item.slug));
      return;
    }
    goSearch(item.title);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (highlight >= 0 && results[highlight]) {
      goMedia(results[highlight]);
      return;
    }
    goSearch();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showPanel && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

    if (e.key === 'Escape') {
      closePanel();
      return;
    }

    if (!showPanel || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      goMedia(results[highlight]);
    }
  }

  useEffect(() => {
    if (!collapsed && variant === 'navbar') {
      inputRef.current?.focus();
    }
  }, [collapsed, variant]);

  const formClass =
    variant === 'navbar'
      ? 'search-autocomplete__form search-autocomplete__form--navbar'
      : 'search-autocomplete__form search-autocomplete__form--page';

  if (variant === 'navbar' && collapsed) {
    return (
      <div className={`search-autocomplete search-autocomplete--navbar ${className}`.trim()}>
        <button type="button" className="nf-nav__icon" aria-label="Rechercher" onClick={onToggle}>
          <IconSearch className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`search-autocomplete search-autocomplete--${variant} ${className}`.trim()}
    >
      <form onSubmit={onSubmit} className={formClass} role="search">
        <div className="search-autocomplete__field">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={placeholder}
            value={value}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (hasQuery) setOpen(true);
            }}
            onKeyDown={onKeyDown}
          />
          <button type="submit" aria-label="Rechercher" className="search-autocomplete__submit">
            <IconSearch className="h-[18px] w-[18px]" />
          </button>
        </div>
        {variant === 'page' && (
          <button type="submit" className="btn-primary search-autocomplete__page-btn">
            Rechercher
          </button>
        )}
      </form>

      {showPanel && (
        <div className="search-suggest" id={listId} role="listbox">
          {loading && <p className="search-suggest-status">Recherche en cours…</p>}
          {error && !loading && (
            <p className="search-suggest-status search-suggest-status--error">{error}</p>
          )}

          {!loading && !error && results.length === 0 && (
            <p className="search-suggest-status">Aucun résultat pour « {value.trim()} »</p>
          )}

          {results.map((item, index) => (
            <button
              key={`${item.id}-${item.slug}-${index}`}
              type="button"
              role="option"
              aria-selected={highlight === index}
              className={`search-suggest-item ${highlight === index ? 'search-suggest-item--active' : ''}`}
              onMouseEnter={() => {
                setHighlight(index);
                prefetchDetail(item.slug);
              }}
              onFocus={() => prefetchDetail(item.slug)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => goMedia(item)}
            >
              <img src={posterUrl(item.poster)} alt="" loading="lazy" />
              <span className="search-suggest-item__text">
                <strong>{item.title}</strong>
                <small>
                  {[
                    item.type === 'tv' ? 'Série' : 'Film',
                    item.year,
                    item.version,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

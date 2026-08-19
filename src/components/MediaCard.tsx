import { Link } from 'react-router-dom';
import type { MediaItem } from '../types';
import { mediaPath, posterUrl, prefetchDetail } from '../lib/api';

interface Props {
  item: MediaItem;
  className?: string;
}

function typeLabel(type?: string) {
  if (type === 'tv') return 'Série';
  if (type === 'movie') return 'Film';
  return type || '';
}

export default function MediaCard({ item, className = '' }: Props) {
  return (
    <Link
      to={mediaPath(item)}
      className={`anime-card ${className}`.trim()}
      onMouseEnter={() => prefetchDetail(item.slug)}
      onFocus={() => prefetchDetail(item.slug)}
    >
      <div className="anime-card-poster">
        <img
          src={posterUrl(item.poster)}
          alt={item.title}
          loading="lazy"
          decoding="async"
        />
        <div className="anime-card-overlay" />
        {(item.quality || item.type) && (
          <span className="anime-card-badge">{item.quality || typeLabel(item.type)}</span>
        )}
        {item.rating ? <span className="anime-card-rating">★ {item.rating.toFixed(1)}</span> : null}
      </div>
      <div className="anime-card-info">
        <h3>{item.title}</h3>
        {item.year && <span className="anime-card-year">{item.year}</span>}
      </div>
    </Link>
  );
}

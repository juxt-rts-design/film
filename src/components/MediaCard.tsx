import { Link } from 'react-router-dom';
import type { MouseEvent } from 'react';
import type { MediaItem } from '../types';
import { prefetchDetail, posterUrl } from '../lib/api';
import { isMobileUi } from '../lib/mobile';
import { playPath, resumeRatio } from '../lib/history';
import { useHistory } from '../hooks/useHistory';
import { useTitleModal } from '../context/TitleModalContext';
import FavoriteButton from './FavoriteButton';
import { IconPlay } from './NavIcons';

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
  const { openInfo } = useTitleModal();
  const historyList = useHistory();
  const history = historyList.find((entry) => entry.slug === item.slug);
  const ratio = history ? resumeRatio(history) : 0;
  const to = playPath(item.slug);

  function warm() {
    prefetchDetail(item.slug);
  }

  function onInfoClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isMobileUi()) return;
    openInfo(item);
  }

  return (
    <article className={`anime-card ${className}`.trim()}>
      <div className="anime-card-poster-wrap">
        <Link
          to={to}
          className="anime-card-hit"
          onPointerDown={warm}
          onMouseEnter={warm}
          onFocus={warm}
          aria-label={`Lire ${item.title}`}
        >
          <div className="anime-card-poster">
            <img src={posterUrl(item.poster)} alt="" loading="lazy" decoding="async" />
            <div className="anime-card-overlay">
              <span className="play-chip">
                <IconPlay className="play-chip__icon" />
              </span>
            </div>
            {(item.quality || item.type) && (
              <span className="anime-card-badge">{item.quality || typeLabel(item.type)}</span>
            )}
            {history?.completed ? <span className="watched-badge">Vu</span> : null}
            {ratio > 0 && !history?.completed ? (
              <span className="progress-track" aria-hidden>
                <span className="progress-track__bar" style={{ width: `${Math.max(4, ratio * 100)}%` }} />
              </span>
            ) : null}
          </div>
        </Link>

        <div className="media-card__dock">
          <Link
            to={to}
            className="media-card__btn media-card__btn--play"
            onPointerDown={warm}
            aria-label="Lecture"
          >
            <IconPlay className="media-card__play-icon" />
          </Link>
          <FavoriteButton item={item} className="fav-btn--plus media-card__btn" />
          <button
            type="button"
            className="media-card__btn media-card__btn--info"
            aria-label={`Infos ${item.title}`}
            onClick={onInfoClick}
          >
            i
          </button>
        </div>
      </div>

      <Link to={to} className="anime-card-info" onPointerDown={warm} onMouseEnter={warm}>
        <h3>{item.title}</h3>
        <span className="anime-card-year">
          {[typeLabel(item.type), item.year].filter(Boolean).join(' · ')}
        </span>
      </Link>
    </article>
  );
}

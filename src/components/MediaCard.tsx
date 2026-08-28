import { useNavigate } from 'react-router-dom';
import type { MediaItem } from '../types';
import { prefetchDetail, posterUrl } from '../lib/api';
import { playPath, resumeRatio } from '../lib/history';
import { useHistory } from '../hooks/useHistory';
import { useTitleModal } from '../context/TitleModalContext';
import FavoriteButton from './FavoriteButton';

interface Props {
  item: MediaItem;
  className?: string;
  toWatch?: boolean;
}

function typeLabel(type?: string) {
  if (type === 'tv') return 'Série';
  if (type === 'movie') return 'Film';
  return type || '';
}

export default function MediaCard({ item, className = '' }: Props) {
  const navigate = useNavigate();
  const { openInfo } = useTitleModal();
  const historyList = useHistory();
  const history = historyList.find((entry) => entry.slug === item.slug);
  const ratio = history ? resumeRatio(history) : 0;

  function play() {
    prefetchDetail(item.slug);
    navigate(playPath(item.slug));
  }

  return (
    <article className={`anime-card ${className}`.trim()}>
      <div className="anime-card-poster-wrap">
        <button
          type="button"
          className="anime-card-hit"
          onClick={play}
          onMouseEnter={() => prefetchDetail(item.slug)}
          onFocus={() => prefetchDetail(item.slug)}
          aria-label={`Lire ${item.title}`}
        >
          <div className="anime-card-poster">
            <img src={posterUrl(item.poster)} alt="" loading="lazy" decoding="async" />
            <div className="anime-card-overlay">
              <span className="play-chip">▶</span>
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
        </button>

        <div className="media-card__dock">
          <button type="button" className="media-card__btn media-card__btn--play" onClick={play} aria-label="Lecture">
            ▶
          </button>
          <FavoriteButton item={item} className="fav-btn--plus media-card__btn" />
          <button
            type="button"
            className="media-card__btn media-card__btn--info"
            aria-label={`Infos ${item.title}`}
            onClick={() => openInfo(item)}
          >
            i
          </button>
        </div>
      </div>

      <div className="anime-card-info">
        <h3>{item.title}</h3>
        <span className="anime-card-year">
          {[typeLabel(item.type), item.year].filter(Boolean).join(' · ')}
        </span>
      </div>
    </article>
  );
}

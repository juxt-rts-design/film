import { Link } from 'react-router-dom';
import type { MediaDetail } from '../types';
import { listEpisodeNumbers, posterUrl, watchPath } from '../lib/api';
import { getHistory, isResumable, resumePath } from '../lib/history';
import FavoriteButton from './FavoriteButton';

interface Props {
  detail: MediaDetail;
}

export default function MediaOverview({ detail }: Props) {
  const version = detail.versions[0]?.value;
  const firstEp = listEpisodeNumbers(detail, version || 'vf')[0] || 1;
  const history = getHistory(detail.slug);
  const resumable = history ? isResumable(history) : false;
  const playTo = resumable && history ? resumePath(history) : watchPath(detail.slug, 1, firstEp, version);

  return (
    <section className="anime-overview">
      <h2 className="overview-label">Fiche</h2>

      {detail.banner || detail.poster ? (
        <div className="overview-banner">
          <img
            src={posterUrl(detail.banner || detail.poster)}
            alt={detail.title}
            className="overview-banner-img"
          />
        </div>
      ) : null}

      <h1 className="overview-title">{detail.title}</h1>
      {detail.originalTitle && detail.originalTitle !== detail.title && (
        <p className="overview-subtitle">{detail.originalTitle}</p>
      )}

      <div className="overview-meta">
        {detail.type && (
          <span className="meta-pill accent">{detail.type === 'tv' ? 'Série' : 'Film'}</span>
        )}
        {detail.year && <span className="meta-pill">{detail.year}</span>}
        {detail.quality && <span className="meta-pill">{detail.quality}</span>}
        {detail.duration && <span className="meta-pill">{detail.duration}</span>}
        {detail.versions[0] && <span className="meta-pill">{detail.versions[0].label}</span>}
      </div>

      <div className="info-grid">
        <div className="info-col">
          {detail.type === 'tv' && (
            <div className="info-item">
              <span>Épisodes</span>
              <strong>{listEpisodeNumbers(detail, version || 'vf').length || detail.episodeInfo.length}</strong>
            </div>
          )}
          {detail.quality && (
            <div className="info-item">
              <span>Qualité</span>
              <strong>{detail.quality}</strong>
            </div>
          )}
        </div>
        <div className="info-col">
          {detail.releaseDate && (
            <div className="info-item">
              <span>Sortie</span>
              <strong>{detail.releaseDate}</strong>
            </div>
          )}
          {detail.hasResource && (
            <div className="info-item">
              <span>Disponible</span>
              <strong>Oui</strong>
            </div>
          )}
        </div>
      </div>

      <div className="overview-actions">
        <Link to={playTo} className="btn-primary">
          {resumable ? 'Reprendre' : 'Lecture'}
        </Link>
        <FavoriteButton
          item={{
            id: detail.id,
            slug: detail.slug,
            title: detail.title,
            poster: detail.poster,
            type: detail.type,
            year: Number(detail.year) || null,
          }}
          className="fav-btn--lg"
        />
      </div>

      {detail.synopsis && (
        <div className="overview-block" style={{ marginTop: 20 }}>
          <h3>Synopsis</h3>
          <p>{detail.synopsis}</p>
        </div>
      )}

      {detail.genres.length > 0 && (
        <div className="genres-block">
          <h3>Genres</h3>
          <div className="overview-genres">
            {detail.genres.map((g) => (
              <span key={g} className="genre-tag">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {(detail.originalTitle || detail.cast.length > 0) && (
        <div className="overview-details">
          {detail.originalTitle && (
            <div className="detail-row">
              <span>Titre original</span>
              <strong>{detail.originalTitle}</strong>
            </div>
          )}
          {detail.cast.length > 0 && (
            <div className="detail-row">
              <span>Casting</span>
              <strong>{detail.cast.slice(0, 8).join(', ')}</strong>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

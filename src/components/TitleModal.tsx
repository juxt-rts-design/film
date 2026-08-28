import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TitleRef } from '../context/TitleModalContext';
import { getCachedDetail, getDetail, listEpisodeNumbers, parseSeasonNumber, posterUrl, watchPath } from '../lib/api';
import { getHistory, isResumable, resumePath } from '../lib/history';
import type { MediaDetail } from '../types';
import FavoriteButton from './FavoriteButton';

interface Props {
  item: TitleRef;
  onClose: () => void;
}

export default function TitleModal({ item, onClose }: Props) {
  const navigate = useNavigate();
  const cached = getCachedDetail(item.slug);
  const [detail, setDetail] = useState<MediaDetail | null>(cached);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState(() =>
    parseSeasonNumber(item.title, cached?.title, cached?.seasons[0]?.season),
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const hit = getCachedDetail(item.slug);
    if (hit) setDetail(hit);
    getDetail(item.slug)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setSeason(parseSeasonNumber(data.title, item.title, data.seasons[0]?.season));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Impossible de charger la fiche');
      });
    return () => {
      cancelled = true;
    };
  }, [item.slug]);

  const version = detail?.versions[0]?.value || 'vf';
  const episodeKeys = useMemo(
    () => (detail ? listEpisodeNumbers(detail, version) : []),
    [detail, version],
  );
  const history = detail ? getHistory(detail.slug) : undefined;
  const resumable = history ? isResumable(history) : false;
  const playTo =
    resumable && history
      ? resumePath(history)
      : watchPath(detail?.slug || item.slug, season, episodeKeys[0] || 1, version);

  const title = detail?.title || item.title || 'Chargement…';
  const poster = detail?.banner || detail?.poster || item.poster || '';
  const isSeries = (detail?.type || item.type) === 'tv';

  function play(ep?: number) {
    onClose();
    if (ep) {
      navigate(watchPath(detail?.slug || item.slug, season, ep, version));
      return;
    }
    navigate(playTo);
  }

  return (
    <div className="nf-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="nf-modal__backdrop" aria-label="Fermer" onClick={onClose} />
      <div className="nf-modal__sheet">
        <button type="button" className="nf-modal__close" aria-label="Fermer" onClick={onClose}>
          ×
        </button>

        <div className="nf-modal__hero">
          {poster ? <img src={posterUrl(poster)} alt="" /> : <div className="nf-modal__hero-fallback" />}
          <div className="nf-modal__hero-shade" />
          <div className="nf-modal__hero-content">
            <h1>{title}</h1>
            <div className="nf-modal__actions">
              <button type="button" className="nf-btn nf-btn--play" onClick={() => play()}>
                ▶ {resumable ? 'Reprendre' : 'Lecture'}
              </button>
              {detail ? (
                <FavoriteButton
                  item={{
                    id: detail.id,
                    slug: detail.slug,
                    title: detail.title,
                    poster: detail.poster,
                    type: detail.type,
                    year: Number(detail.year) || null,
                  }}
                  className="fav-btn--lg fav-btn--plus"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="nf-modal__body">
          {error ? <p className="page-error">{error}</p> : null}
          {!detail && !error ? <p className="nf-modal__loading">Chargement de la fiche…</p> : null}

          {detail ? (
            <>
              <div className="nf-modal__grid">
                <div>
                  <p className="nf-modal__meta">
                    {[
                      detail.year,
                      isSeries
                        ? `${episodeKeys.length || detail.episodeInfo.length} épisode${(episodeKeys.length || detail.episodeInfo.length) > 1 ? 's' : ''}`
                        : detail.duration,
                      detail.quality,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {detail.synopsis ? <p className="nf-modal__synopsis">{detail.synopsis}</p> : null}
                </div>
                <aside className="nf-modal__side">
                  {detail.cast.length > 0 && (
                    <p>
                      <span>Distribution :</span> {detail.cast.slice(0, 6).join(', ')}
                    </p>
                  )}
                  {detail.genres.length > 0 && (
                    <p>
                      <span>Genres :</span> {detail.genres.join(', ')}
                    </p>
                  )}
                  <p>
                    <span>Type :</span> {isSeries ? 'Série' : 'Film'}
                    {detail.versions[0] ? ` · ${detail.versions[0].label}` : ''}
                  </p>
                </aside>
              </div>

              {isSeries && episodeKeys.length > 0 && (
                <section className="nf-modal__episodes">
                  <div className="nf-modal__episodes-head">
                    <h2>Épisodes</h2>
                    {detail.seasons.length > 1 ? (
                      <label className="nf-modal__season">
                        <span className="sr-only">Saison</span>
                        <select value={season} onChange={(e) => setSeason(Number(e.target.value))}>
                          {detail.seasons.map((entry) => (
                            <option key={entry.season} value={entry.season}>
                              Saison {entry.season}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className="nf-modal__season-label">Saison {season}</span>
                    )}
                  </div>
                  <ul>
                    {episodeKeys.map((ep) => {
                      const info = detail.episodeInfo.find((entry) => entry.episode === ep);
                      const current = history?.episode === ep;
                      return (
                        <li key={ep}>
                          <button
                            type="button"
                            className={`nf-ep ${current ? 'is-current' : ''}`}
                            onClick={() => play(ep)}
                          >
                            <span className="nf-ep__num">{ep}</span>
                            <span className="nf-ep__thumb">
                              <img src={posterUrl(info?.poster || detail.poster)} alt="" />
                              <span className="nf-ep__play">▶</span>
                            </span>
                            <span className="nf-ep__text">
                              <strong>{info?.title || `Épisode ${ep}`}</strong>
                              {info?.synopsis ? <small>{info.synopsis}</small> : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

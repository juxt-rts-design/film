import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import {
  getCachedDetail,
  getDetail,
  listEpisodeNumbers,
  listPlayers,
  pickEmbed,
} from '../lib/api';
import type { MediaDetail } from '../types';

export default function Watch() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const requestedEp = Number(params.get('ep') || 0);
  const requestedVer = params.get('ver') || '';
  const requestedPlayer = params.get('player') || '';

  const [detail, setDetail] = useState<MediaDetail | null>(() => getCachedDetail(slug));
  const [pageLoading, setPageLoading] = useState(!getCachedDetail(slug));
  const [error, setError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState('');

  const isSeries = detail?.type === 'tv';
  const version = requestedVer || detail?.versions[0]?.value || 'vf';
  const episodeKeys = useMemo(
    () => (detail ? listEpisodeNumbers(detail, version) : []),
    [detail, version],
  );
  const episode = episodeKeys.includes(requestedEp) ? requestedEp : episodeKeys[0] || 1;
  const players = useMemo(
    () => (detail ? listPlayers(detail, version, episode) : []),
    [detail, version, episode],
  );
  const player = players.some((item) => item.key === requestedPlayer)
    ? requestedPlayer
    : players[0]?.key || '';

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const cached = getCachedDetail(slug);
    if (cached) setDetail(cached);

    let cancelled = false;
    if (!cached) setPageLoading(true);

    getDetail(slug)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur');
      })
      .finally(() => {
        if (!cancelled) setPageLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const loadStream = useCallback(() => {
    if (!detail) return;
    const embed = pickEmbed(detail, version, episode, player);
    setEmbedUrl(embed);
    setStreamError(embed ? null : 'Aucun lecteur pour cet épisode.');
  }, [detail, version, episode, player]);

  useEffect(() => {
    loadStream();
  }, [loadStream]);

  function updateParams(nextEp = episode, nextVer = version, nextPlayer = player) {
    const next = new URLSearchParams(params);
    next.set('se', '1');
    next.set('ep', String(nextEp));
    next.set('ver', nextVer);
    if (nextPlayer) next.set('player', nextPlayer);
    setParams(next, { replace: true });
  }

  const currentIndex = episodeKeys.indexOf(episode);

  if (pageLoading && !detail) {
    return (
      <div className="watch-play-page">
        <div className="skeleton-player" />
      </div>
    );
  }

  if (error || !detail) return <div className="page-error">{error || 'Introuvable'}</div>;

  const episodeMeta = detail.episodeInfo.find((item) => item.episode === episode);

  return (
    <div className="watch-play-page">
      <header className="watch-bar">
        <div className="watch-bar__meta">
          <h1>{detail.title}</h1>
          <p>
            {isSeries
              ? `Saison 1 · Épisode ${episode}${episodeMeta?.title ? ` — ${episodeMeta.title}` : ''}`
              : [detail.quality, detail.year].filter(Boolean).join(' · ') || 'Film'}
          </p>
        </div>
        <Link to={`/movie/${encodeURIComponent(detail.slug)}`} className="watch-bar__fiche">
          Fiche
        </Link>
      </header>

      <div className="sama-video-wrap">
        {streamError ? (
          <div className="player-empty player-empty--warn">
            <p>{streamError}</p>
            <button type="button" className="sama-link-btn" onClick={loadStream}>
              Réessayer
            </button>
          </div>
        ) : (
          <VideoPlayer src="" embedUrl={embedUrl} title={detail.title} autoPlay />
        )}
      </div>

      <div className="sama-select-row">
        {detail.versions.length > 0 && (
          <label className="sama-select-wrap">
            <span className="sr-only">Version</span>
            <select
              className="sama-select"
              value={version}
              onChange={(e) => updateParams(isSeries ? 1 : episode, e.target.value, '')}
            >
              {detail.versions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {isSeries && (
          <label className="sama-select-wrap">
            <span className="sr-only">Épisode</span>
            <select
              className="sama-select"
              value={episode}
              onChange={(e) => updateParams(Number(e.target.value), version, player)}
            >
              {episodeKeys.map((ep) => (
                <option key={ep} value={ep}>
                  Épisode {ep}
                </option>
              ))}
            </select>
          </label>
        )}
        {players.length > 0 && (
          <label className="sama-select-wrap">
            <span className="sr-only">Lecteur</span>
            <select
              className="sama-select"
              value={player}
              onChange={(e) => updateParams(episode, version, e.target.value)}
            >
              {players.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {isSeries && (
        <div className="sama-ep-nav">
          <button
            type="button"
            className="sama-nav-btn"
            disabled={currentIndex <= 0}
            onClick={() => updateParams(episodeKeys[currentIndex - 1], version, player)}
          >
            Précédent
          </button>
          <button type="button" className="sama-nav-btn sama-nav-btn--center" disabled>
            Épisode {episode}
          </button>
          <button
            type="button"
            className="sama-nav-btn"
            disabled={currentIndex < 0 || currentIndex >= episodeKeys.length - 1}
            onClick={() => updateParams(episodeKeys[currentIndex + 1], version, player)}
          >
            Suivant
          </button>
        </div>
      )}

      {isSeries && (
        <section className="sama-episodes">
          <h2 className="overview-label">Épisodes</h2>
          <div className="episodes-grid">
            {episodeKeys.map((ep) => {
              const info = detail.episodeInfo.find((item) => item.episode === ep);
              return (
                <button
                  key={ep}
                  type="button"
                  className={`episode-btn ${ep === episode ? 'active' : ''}`}
                  onClick={() => updateParams(ep, version, player)}
                >
                  <span className="ep-num">Ép. {ep}</span>
                  <span className="ep-title">{info?.title || detail.title}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

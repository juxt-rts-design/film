import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import {
  getCachedDetail,
  getDetail,
  listEpisodeNumbers,
  listPlayers,
  parseSeasonNumber,
  pickEmbed,
  posterUrl,
} from '../lib/api';
import {
  flushHistory,
  getHistory,
  parseDuration,
  recordProgress,
} from '../lib/history';
import type { MediaDetail } from '../types';

export default function Watch() {
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const requestedEp = Number(params.get('ep') || 0);
  const requestedVer = params.get('ver') || '';
  const requestedPlayer = params.get('player') || '';
  const requestedT = Number(params.get('t') || 0);

  const [detail, setDetail] = useState<MediaDetail | null>(() => getCachedDetail(slug));
  const [pageLoading, setPageLoading] = useState(!getCachedDetail(slug));
  const [error, setError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState('');
  const [showEpisodes, setShowEpisodes] = useState(false);

  const isSeries = detail?.type === 'tv';
  const seasonNum = detail
    ? parseSeasonNumber(detail.title, detail.seasons[0]?.season)
    : Number(params.get('se') || 0) || 1;
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
  const saved = slug ? getHistory(slug) : undefined;
  const startAt =
    requestedT || (saved && saved.episode === episode && !saved.completed ? saved.position : 0);
  const posRef = useRef(startAt);
  const currentIndex = episodeKeys.indexOf(episode);
  const episodeMeta = detail?.episodeInfo.find((item) => item.episode === episode);

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

  useEffect(() => {
    posRef.current = startAt;
  }, [slug, episode, startAt]);

  useEffect(() => {
    if (!detail) return;

    const save = (position: number, duration = 0) => {
      recordProgress({
        slug: detail.slug,
        title: detail.title,
        poster: detail.poster || detail.banner,
        type: detail.type,
        episode,
        version,
        position,
        duration: duration || parseDuration(detail.duration),
      });
    };

    const tick = window.setInterval(() => {
      posRef.current += 5;
      save(posRef.current);
    }, 5000);

    const onLeave = () => {
      save(posRef.current);
      flushHistory();
    };

    window.addEventListener('pagehide', onLeave);
    const onVis = () => {
      if (document.hidden) onLeave();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(tick);
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('visibilitychange', onVis);
      onLeave();
    };
  }, [detail, episode, version]);

  function updateParams(nextEp = episode, nextVer = version, nextPlayer = player) {
    const next = new URLSearchParams(params);
    next.set('se', String(seasonNum));
    next.set('ep', String(nextEp));
    next.set('ver', nextVer);
    if (nextPlayer) next.set('player', nextPlayer);
    next.delete('t');
    setParams(next, { replace: true });
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  }

  if (pageLoading && !detail) {
    return (
      <div className="nf-watch">
        <div className="skeleton-player" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="nf-watch nf-watch--error">
        <button type="button" className="nf-watch__back" onClick={goBack}>
          ←
        </button>
        <p className="page-error">{error || 'Introuvable'}</p>
      </div>
    );
  }

  return (
    <div className="nf-watch">
      <div className="nf-watch__stage">
        {streamError ? (
          <div className="player-empty player-empty--warn">
            <p>{streamError}</p>
            <button type="button" className="sama-link-btn" onClick={loadStream}>
              Réessayer
            </button>
          </div>
        ) : (
          <VideoPlayer
            src=""
            embedUrl={embedUrl}
            title={detail.title}
            autoPlay
            startAt={startAt}
            onProgress={(position, duration) => {
              posRef.current = position;
              recordProgress({
                slug: detail.slug,
                title: detail.title,
                poster: detail.poster || detail.banner,
                type: detail.type,
                episode,
                version,
                position,
                duration: duration || parseDuration(detail.duration),
              });
            }}
          />
        )}
      </div>

      <header className="nf-watch__top">
        <button type="button" className="nf-watch__back" onClick={goBack} aria-label="Retour">
          ←
        </button>
        <div className="nf-watch__heading">
          <strong>{detail.title}</strong>
          <span>
            {isSeries
              ? `S${seasonNum} · E${episode}${episodeMeta?.title ? ` · ${episodeMeta.title}` : ''}`
              : [detail.quality, detail.year].filter(Boolean).join(' · ') || 'Film'}
          </span>
        </div>
      </header>

      <footer className="nf-watch__bar">
        <div className="nf-watch__dock">
          {isSeries && (
            <>
              <button
                type="button"
                className="nf-watch__ctl"
                disabled={currentIndex <= 0}
                onClick={() => updateParams(episodeKeys[currentIndex - 1], version, player)}
              >
                ‹ Préc.
              </button>
              <button
                type="button"
                className="nf-watch__ctl"
                disabled={currentIndex < 0 || currentIndex >= episodeKeys.length - 1}
                onClick={() => updateParams(episodeKeys[currentIndex + 1], version, player)}
              >
                Suiv. ›
              </button>
              <button
                type="button"
                className={`nf-watch__ctl ${showEpisodes ? 'is-on' : ''}`}
                onClick={() => setShowEpisodes((open) => !open)}
              >
                Épisodes
              </button>
            </>
          )}
          {players.length > 0 && (
            <label className="nf-watch__select">
              <span className="sr-only">Lecteur</span>
              <select value={player} onChange={(e) => updateParams(episode, version, e.target.value)}>
                {players.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {detail.versions.length > 0 && (
            <label className="nf-watch__select">
              <span className="sr-only">Version</span>
              <select
                value={version}
                onChange={(e) => updateParams(isSeries ? episodeKeys[0] || 1 : episode, e.target.value, '')}
              >
                {detail.versions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </footer>

      {isSeries && showEpisodes && (
        <aside className="nf-watch__panel">
          <div className="nf-watch__panel-head">
            <button type="button" onClick={() => setShowEpisodes(false)}>
              ← Saison {seasonNum}
            </button>
          </div>
          <ul>
            {episodeKeys.map((ep) => {
              const info = detail.episodeInfo.find((entry) => entry.episode === ep);
              const active = ep === episode;
              return (
                <li key={ep}>
                  <button
                    type="button"
                    className={`nf-watch__ep ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      updateParams(ep, version, player);
                      setShowEpisodes(false);
                    }}
                  >
                    <span className="nf-watch__ep-num">{ep}</span>
                    <span className="nf-watch__ep-body">
                      <strong>
                        {info?.title || `Épisode ${ep}`}
                        {active ? ' · Lecture en cours' : ''}
                      </strong>
                      {active && info?.synopsis ? <small>{info.synopsis}</small> : null}
                    </span>
                    {active && (info?.poster || detail.poster) ? (
                      <img src={posterUrl(info?.poster || detail.poster)} alt="" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      )}
    </div>
  );
}

import { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MediaOverview from '../components/MediaOverview';
import { getCachedDetail, getDetail, listEpisodeNumbers, watchPath } from '../lib/api';
import type { MediaDetail } from '../types';

export default function MovieDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<MediaDetail | null>(() => getCachedDetail(slug));
  const [loading, setLoading] = useState(!getCachedDetail(slug));
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const cached = getCachedDetail(slug);
    setDetail(cached);
    setLoading(!cached);
    setError(null);

    let cancelled = false;
    getDetail(slug)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur de chargement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading && !detail) {
    return (
      <div className="watch-layout mx-auto max-w-[1200px] px-4 py-6 sm:px-6 md:py-8">
        <div className="skeleton-info" />
      </div>
    );
  }

  if (error || !detail) return <div className="page-error">{error || 'Introuvable'}</div>;

  const version = detail.versions[0]?.value;
  const episodeKeys = listEpisodeNumbers(detail, version || 'vf');

  return (
    <div className="watch-layout mx-auto max-w-[1200px] px-4 py-6 sm:px-6 md:py-8">
      <MediaOverview detail={detail} />

      {detail.versions.length > 1 && (
        <section className="seasons-section">
          <h2 className="overview-label">Versions audio</h2>
          <div className="dub-row">
            {detail.versions.map((item) => (
              <button
                key={item.value}
                type="button"
                className="genre-chip"
                onClick={() => navigate(watchPath(detail.slug, 1, episodeKeys[0] || 1, item.value))}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {episodeKeys.length > 0 && detail.type === 'tv' && (
        <section className="seasons-section">
          <h2 className="overview-label">Épisodes — {episodeKeys.length} disponible{episodeKeys.length > 1 ? 's' : ''}</h2>
          <p className="season-hint">Épisodes disponibles</p>
          <div className="episodes-grid">
            {episodeKeys.map((ep) => {
              const info = detail.episodeInfo.find((item) => item.episode === ep);
              return (
                <button
                  key={ep}
                  type="button"
                  className="episode-btn"
                  onClick={() => navigate(watchPath(detail.slug, 1, ep, version))}
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

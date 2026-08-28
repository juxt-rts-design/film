import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { MediaItem } from '../types';
import { prefetchDetail, posterUrl, watchPath } from '../lib/api';
import { getHistory, isResumable, resumePath } from '../lib/history';
import { useTitleModal } from '../context/TitleModalContext';

interface Props {
  items: MediaItem[];
  tag?: string;
}

export default function HeroBanner({ items, tag = 'À la une' }: Props) {
  const { openInfo } = useTitleModal();
  const [index, setIndex] = useState(0);
  const slides = items.slice(0, 8);
  const current = slides[index] || slides[0];
  const history = current ? getHistory(current.slug) : undefined;
  const resumable = history ? isResumable(history) : false;

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!current) return <div className="skeleton-hero" />;

  const playTo = resumable && history ? resumePath(history) : watchPath(current.slug);

  return (
    <section className="nf-hero">
      <div
        className="nf-hero__art"
        style={{ backgroundImage: `url(${posterUrl(current.poster)})` }}
      />
      <div className="nf-hero__shade" />
      <div className="nf-hero__content">
        <span className="nf-hero__tag">{tag}</span>
        <h1>{current.title}</h1>
        <p className="nf-hero__meta">
          {[
            current.type === 'tv' ? 'Série' : 'Film',
            current.year,
            current.quality,
            current.rating ? `★ ${current.rating.toFixed(1)}` : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {current.description ? <p className="nf-hero__desc">{current.description}</p> : null}
        <div className="nf-hero__actions">
          <Link
            to={playTo}
            className="nf-btn nf-btn--play"
            onMouseEnter={() => prefetchDetail(current.slug)}
          >
            ▶ {resumable ? 'Reprendre' : 'Lecture'}
          </Link>
          <button type="button" className="nf-btn nf-btn--info" onClick={() => openInfo(current)}>
            ℹ Plus d’infos
          </button>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="nf-hero__dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id + slide.slug}
              type="button"
              className={`hero-dot ${i === index ? 'active' : ''}`}
              aria-label={`À la une ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

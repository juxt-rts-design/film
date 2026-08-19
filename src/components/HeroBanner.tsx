import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { MediaItem } from '../types';
import { prefetchDetail, posterUrl, watchPath } from '../lib/api';

interface Props {
  items: MediaItem[];
  tag?: string;
}

export default function HeroBanner({ items, tag = 'À la une' }: Props) {
  const [index, setIndex] = useState(0);
  const slides = items.slice(0, 8);
  const current = slides[index] || slides[0];

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!current) return <div className="skeleton-hero" />;

  return (
    <section
      className="hero hero-carousel relative min-h-[280px] bg-cover bg-center sm:min-h-[340px] md:min-h-[420px]"
      style={{ backgroundImage: `url(${posterUrl(current.poster)})` }}
    >
      <div className="hero-overlay" />
      <div className="hero-content px-4 py-10 sm:px-8 sm:py-14 md:px-12">
        <span className="hero-tag">{tag}</span>
        <h1 className="max-w-3xl text-2xl font-bold sm:text-3xl md:text-4xl lg:text-[2.75rem]">
          {current.title}
        </h1>
        <p className="hero-rating">
          {current.rating ? `★ ${current.rating.toFixed(1)}` : ''}
          {current.year ? `${current.rating ? ' · ' : ''}${current.year}` : ''}
        </p>
        <Link
          to={watchPath(current.slug)}
          className="btn-primary"
          onMouseEnter={() => prefetchDetail(current.slug)}
          onFocus={() => prefetchDetail(current.slug)}
        >
          Regarder
        </Link>
      </div>
      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.id + slide.slug}
              type="button"
              className={`hero-dot ${i === index ? 'active' : ''}`}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

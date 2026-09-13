import type { MediaDetail } from '../types';

interface Props {
  detail: MediaDetail;
}

/** Infos sous le lecteur (logique app mobile Film). */
export default function MediaOverview({ detail }: Props) {
  const showOriginal = Boolean(detail.originalTitle) && detail.originalTitle !== detail.title;

  return (
    <section className="media-overview">
      {showOriginal ? (
        <p className="media-overview__original">Titre original : {detail.originalTitle}</p>
      ) : null}

      {detail.synopsis ? (
        <div className={`media-overview__block ${showOriginal ? 'media-overview__block--spaced' : ''}`}>
          <h2 className="media-overview__label">Synopsis</h2>
          <p className="media-overview__text">{detail.synopsis}</p>
        </div>
      ) : null}

      {detail.genres.length > 0 ? (
        <div className="media-overview__genres">
          {detail.genres.map((genre) => (
            <span key={genre} className="media-overview__genre">
              {genre}
            </span>
          ))}
        </div>
      ) : null}

      {detail.cast.length > 0 ? (
        <div className="media-overview__block media-overview__block--spaced">
          <h2 className="media-overview__label">Casting</h2>
          <p className="media-overview__text">{detail.cast.join(', ')}</p>
        </div>
      ) : null}
    </section>
  );
}

import { Link } from 'react-router-dom';
import type { MediaItem } from '../types';
import MediaCard from './MediaCard';

interface Props {
  title: string;
  description?: string;
  items: MediaItem[];
  seeAllTo?: string;
}

export default function MediaRow({ title, description, items, seeAllTo }: Props) {
  if (!items.length) return null;

  return (
    <section className="nf-row">
      <div className="nf-row__head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {seeAllTo ? (
          <Link to={seeAllTo} className="nf-row__all">
            Voir plus
          </Link>
        ) : null}
      </div>
      <div className="media-row-scroller">
        {items.map((item) => (
          <div className="media-row-item" key={`${item.id}-${item.slug}`}>
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

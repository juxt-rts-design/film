import type { MediaItem } from '../types';
import MediaCard from './MediaCard';

interface Props {
  title: string;
  description?: string;
  items: MediaItem[];
}

export default function MediaRow({ title, description, items }: Props) {
  if (!items.length) return null;

  return (
    <section className="section media-row max-w-[1440px] mx-auto px-4 py-7 sm:px-6 md:py-8">
      <div className="section-head">
        <h2>{title}</h2>
        {description && <span className="section-desc">{description}</span>}
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

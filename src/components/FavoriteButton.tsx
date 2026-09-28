import { toggleFavorite } from '../lib/favorites';
import { useIsFavorite } from '../hooks/useFavorites';
import type { MediaItem } from '../types';
import { IconCheck, IconHeart } from './NavIcons';

interface Props {
  item: Pick<MediaItem, 'id' | 'slug' | 'title' | 'poster' | 'type' | 'year'>;
  className?: string;
}

export default function FavoriteButton({ item, className = '' }: Props) {
  const active = useIsFavorite(item.slug);

  return (
    <button
      type="button"
      className={`fav-btn ${active ? 'is-on' : ''} ${className}`.trim()}
      aria-pressed={active}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(item);
      }}
    >
      {className.includes('fav-btn--plus') ? (
        active ? <IconCheck className="fav-btn__svg" /> : <span className="fav-btn__plus">+</span>
      ) : (
        <IconHeart className={`fav-btn__svg ${active ? 'is-filled' : ''}`} />
      )}
    </button>
  );
}

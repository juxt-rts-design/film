import { useFavorites } from '../hooks/useFavorites';
import { toMediaItem } from '../lib/favorites';
import MediaRow from './MediaRow';

export default function FavoritesRow() {
  const favorites = useFavorites();
  if (!favorites.length) return null;

  return (
    <MediaRow
      title="Ma liste"
      description={`${favorites.length} titre${favorites.length > 1 ? 's' : ''} enregistré${favorites.length > 1 ? 's' : ''}`}
      items={favorites.map(toMediaItem)}
      seeAllTo="/liste"
    />
  );
}

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TitleModal from '../components/TitleModal';
import { getCachedDetail } from '../lib/api';

export default function MovieDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const cached = getCachedDetail(slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <div className="title-modal-page">
      <TitleModal
        item={{
          id: cached?.id || slug,
          slug,
          title: cached?.title || '',
          poster: cached?.poster || '',
          type: cached?.type || 'movie',
        }}
        onClose={() => navigate('/')}
      />
    </div>
  );
}

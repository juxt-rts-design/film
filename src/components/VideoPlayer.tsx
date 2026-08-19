import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface Props {
  src: string;
  embedUrl?: string;
  title: string;
  loading?: boolean;
  isHls?: boolean;
  autoPlay?: boolean;
  onError?: () => void;
}

function tryPlay(video: HTMLVideoElement) {
  void video.play().catch(() => {});
}

export default function VideoPlayer({
  src,
  embedUrl,
  title,
  loading,
  isHls = false,
  autoPlay = true,
  onError,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);
  const [iframeReady, setIframeReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  onErrorRef.current = onError;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || loading || !src) return;

    setReady(false);
    setError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const fail = (message: string) => {
      setError(message);
      onErrorRef.current?.();
    };

    const onReady = () => {
      setReady(true);
      if (autoPlay) tryPlay(video);
    };

    const useHls = isHls || src.includes('.m3u8');

    if (useHls && Hls.isSupported()) {
      let retries = 0;
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 60,
        startLevel: -1,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retries < 2) {
          retries += 1;
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retries < 2) {
          retries += 1;
          hls.recoverMediaError();
          return;
        }
        fail('Impossible de lire ce flux.');
      });
      hlsRef.current = hls;
    } else if (useHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', onReady, { once: true });
      video.addEventListener('error', () => fail('Impossible de lire ce flux.'), { once: true });
    } else {
      video.src = src;
      video.addEventListener('canplay', onReady, { once: true });
      video.addEventListener('error', () => fail('Impossible de lire cette vidéo.'), { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.removeAttribute('src');
      video.load();
    };
  }, [src, loading, isHls, autoPlay]);

  useEffect(() => {
    setIframeReady(false);
    if (!embedUrl) return;
    const timer = window.setTimeout(() => setIframeReady(true), 2200);
    return () => window.clearTimeout(timer);
  }, [embedUrl]);

  if (loading) {
    return (
      <div className="player-empty player-loading-state">
        <div className="spinner" />
      </div>
    );
  }

  if (!src && embedUrl) {
    return (
      <div className="player-wrapper embed-player">
        {!iframeReady && (
          <div className="player-buffer">
            <div className="spinner" />
          </div>
        )}
        <iframe
          key={embedUrl}
          src={embedUrl}
          title={title}
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-modals"
          onLoad={() => setIframeReady(true)}
        />
      </div>
    );
  }

  if (!src) {
    return (
      <div className="player-empty player-empty--warn">
        <p>Aucune source disponible pour le moment.</p>
        <span>Change de lecteur ou réessaie plus tard.</span>
      </div>
    );
  }

  return (
    <div className="player-wrapper">
      {!ready && !error && (
        <div className="player-buffer">
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="player-empty player-empty--warn player-error-overlay">
          <p>{error}</p>
        </div>
      )}

      <video
        ref={videoRef}
        title={title}
        controls
        autoPlay={autoPlay}
        muted={autoPlay}
        playsInline
        controlsList="nodownload noremoteplayback"
        className={`native-player ${ready ? 'ready' : ''}`}
      />
    </div>
  );
}

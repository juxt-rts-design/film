import { useEffect, useRef, useState } from 'react';
import { probeEmbed, startDownload } from '../lib/downloads';

type State = 'idle' | 'preparing' | 'started' | 'error';

interface Props {
  /** Lecteurs candidats, par ordre de préférence. */
  embeds: string[];
  fileName: string;
  label?: string;
  /** Rendu compact : icône seule (dock desktop, liste d'épisodes). */
  compact?: boolean;
  className?: string;
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v10" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

export default function DownloadButton({
  embeds,
  fileName,
  label = 'Télécharger',
  compact = false,
  className = '',
}: Props) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');
  const timerRef = useRef(0);
  const available = embeds.filter(Boolean);
  const key = available.join('|');

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  useEffect(() => {
    setState('idle');
    setMessage('');
  }, [key]);

  async function run() {
    if (!available.length || state === 'preparing') return;

    window.clearTimeout(timerRef.current);
    setState('preparing');
    setMessage('');

    try {
      const probe = await probeEmbed(available);
      startDownload(available, fileName);
      setState('started');
      setMessage(
        probe.type === 'hls'
          ? 'Conversion en cours — le fichier arrive dans tes téléchargements.'
          : 'Téléchargement lancé.',
      );
      timerRef.current = window.setTimeout(() => setState('idle'), 8000);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Téléchargement impossible');
      timerRef.current = window.setTimeout(() => setState('idle'), 8000);
    }
  }

  const busy = state === 'preparing';
  const text = busy ? 'Préparation…' : state === 'started' ? 'Lancé' : label;

  if (compact) {
    return (
      <button
        type="button"
        className={`dl-btn dl-btn--compact is-${state} ${className}`.trim()}
        onClick={() => void run()}
        disabled={!available.length || busy}
        aria-label={busy ? 'Préparation du téléchargement' : label}
        title={message || label}
      >
        <IconDownload className="dl-btn__icon" />
      </button>
    );
  }

  return (
    <div className={`dl-block ${className}`.trim()}>
      <button
        type="button"
        className={`dl-btn dl-btn--block is-${state}`}
        onClick={() => void run()}
        disabled={!available.length || busy}
      >
        <IconDownload className="dl-btn__icon" />
        <span>{text}</span>
      </button>
      {message ? (
        <p className={`dl-note ${state === 'error' ? 'dl-note--error' : ''}`} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

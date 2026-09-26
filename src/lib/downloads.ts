/**
 * Téléchargement d'un épisode / film.
 * Le serveur résout l'embed puis renvoie un mp4 en pièce jointe : c'est le
 * gestionnaire de téléchargement du navigateur qui prend le relais (PC comme mobile).
 */

export interface StreamProbe {
  type: 'hls' | 'mp4';
  player: string;
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || `Erreur ${response.status}`;
  } catch {
    return `Erreur ${response.status}`;
  }
}

function embedParams(embeds: string[]) {
  const params = new URLSearchParams();
  for (const embed of embeds) {
    if (embed) params.append('embed', embed);
  }
  return params;
}

/** Vérifie que le flux est récupérable avant de lancer le téléchargement. */
export async function probeEmbed(embeds: string[]): Promise<StreamProbe> {
  const response = await fetch(`/stream?${embedParams(embeds)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as StreamProbe;
}

export function downloadEndpoint(embeds: string[], fileName: string) {
  const params = embedParams(embeds);
  params.set('name', fileName);
  return `/download?${params}`;
}

interface NameInput {
  title: string;
  isSeries: boolean;
  season?: number;
  episode?: number;
  version?: string;
  year?: string | number | null;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function downloadFileName({ title, isSeries, season, episode, version, year }: NameInput) {
  const clean = (title || 'Video').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  const tag = version ? ` (${version})` : '';

  if (isSeries && episode) {
    return `${clean} - S${pad(season || 1)}E${pad(episode)}${tag}.mp4`;
  }
  return `${clean}${year ? ` (${year})` : ''}${tag}.mp4`;
}

/** Déclenche le téléchargement sans quitter la page. */
export function startDownload(embeds: string[], fileName: string) {
  const link = document.createElement('a');
  link.href = downloadEndpoint(embeds, fileName);
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

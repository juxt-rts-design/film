/**
 * Résolution d'un lien embed (Vidzy, Uqload, Voe, Filmoon…) vers le flux direct
 * mp4/m3u8. Sert uniquement au téléchargement : la lecture continue d'utiliser
 * l'iframe embed, inchangée.
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const CACHE_TTL_MS = 30 * 60 * 1000;
const PLACEHOLDER_HINTS = ['/troll/', 'fstream', 'fsvid.lol/troll'];

const cache = new Map();

function readCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value) {
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

function isPlaceholderStream(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return PLACEHOLDER_HINTS.some((hint) => lower.includes(hint));
}

/** Déchiffre l'URL HLS obfusquée des pages embed Vidzy. */
function decryptVidzy(encrypted, hostname) {
  let hostSum = 0;
  for (let i = 0; i < hostname.length; i++) {
    hostSum = (hostSum + hostname.charCodeAt(i)) & 255;
  }

  const binary = Buffer.from(encrypted, 'base64').toString('binary');
  const reversed = binary.split('').reverse().join('');
  let result = '';

  for (let i = 0; i < reversed.length; i++) {
    const key = (0x3d + i * 89 + hostSum) & 255;
    result += String.fromCharCode(reversed.charCodeAt(i) ^ key);
  }

  return /^https?:\/\//i.test(result) ? result : null;
}

function extractVidzyStream(html, embedUrl) {
  const hostname = new URL(embedUrl).hostname;

  const encrypted = html.match(/\}\)\("([A-Za-z0-9+/=]{80,})"\)/);
  if (encrypted?.[1]) {
    const decrypted = decryptVidzy(encrypted[1], hostname);
    if (decrypted && !isPlaceholderStream(decrypted)) return decrypted;
  }

  const urls = html.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/gi) || [];
  for (const url of urls) {
    if (!isPlaceholderStream(url)) return url;
  }

  return null;
}

/** Dépaquette le JS « p,a,c,k,e,d » (Uqload & co) pour lire les sources. */
function unpackPacked(html) {
  const match = html.match(
    /eval\(function\(p,a,c,k,e,d\)\{[\s\S]*?\}\('([\s\S]*?)',(\d+),(\d+),'([\s\S]*?)'\.split\('\|'\)/,
  );
  if (!match) return null;

  const radix = Number(match[2]);
  const count = Number(match[3]);
  const keys = match[4].split('|');
  let payload = match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');

  for (let i = count - 1; i >= 0; i--) {
    if (!keys[i]) continue;
    payload = payload.replace(new RegExp(`\\b${i.toString(radix)}\\b`, 'g'), keys[i]);
  }

  return payload;
}

function extractPackedStream(html) {
  const unpacked = unpackPacked(html);
  if (!unpacked) return null;

  const direct = unpacked.match(/https?:\/\/[^\s"'\\]+\.(?:mp4|m3u8)[^\s"'\\]*/i);
  return direct?.[0] && !isPlaceholderStream(direct[0]) ? direct[0] : null;
}

const PLAYER_EXTRACTORS = {
  vidzy: (html, embedUrl) => extractVidzyStream(html, embedUrl) || extractPackedStream(html),
  uqload: (html) => extractPackedStream(html),
  voe: (html) => extractPackedStream(html),
  filmoon: (html) => extractPackedStream(html),
  premium: (html) => extractPackedStream(html),
};

const GENERIC_PATTERNS = [
  /file:\s*["'](https?:\/\/[^"']+)["']/i,
  /hlsUrl\s*[:=]\s*["'](https?:\/\/[^"']+)["']/i,
  /source\s+src=["'](https?:\/\/[^"']+)["']/i,
  /sources:\s*\[\s*\{\s*(?:file|src):\s*["'](https?:\/\/[^"']+)["']/i,
  /"(https?:\/\/[^"']+\.m3u8[^"']*)"/i,
  /"(https?:\/\/[^"']+\.mp4[^"']*)"/i,
];

export function detectPlayer(embedUrl) {
  try {
    const host = new URL(embedUrl).hostname;
    if (host.includes('vidzy')) return 'vidzy';
    if (host.includes('lulu')) return 'luluvid';
    if (host.includes('uqload')) return 'uqload';
    if (host.includes('voe')) return 'voe';
    if (host.includes('filmoon')) return 'filmoon';
    if (host.includes('netu') || host.includes('waaw')) return 'netu';
    return 'premium';
  } catch {
    return 'premium';
  }
}

function extractStreamUrl(html, embedUrl, player) {
  const specific = PLAYER_EXTRACTORS[player];
  if (specific) {
    const url = specific(html, embedUrl);
    if (url) return url;
  }

  for (const pattern of GENERIC_PATTERNS) {
    const url = html.match(pattern)?.[1]?.replace(/\\\//g, '/');
    if (url && !isPlaceholderStream(url) && !url.includes('facebook') && !url.includes('google')) {
      return url;
    }
  }

  return null;
}

function refererFor(embedUrl) {
  try {
    return new URL(embedUrl).origin + '/';
  } catch {
    return 'https://open-otaku.me/';
  }
}

/** Voe & co renvoient une page vide qui redirige en JS vers le vrai domaine. */
function jsRedirectTarget(html) {
  const match = html.match(/(?:window\.)?location(?:\.href)?\s*=\s*['"](https?:\/\/[^'"]+)['"]/);
  const target = match?.[1];
  if (!target) return null;
  return /^https?:\/\//i.test(target) && html.length < 4000 ? target : null;
}

async function fetchEmbedPage(embedUrl, hops = 2) {
  let current = embedUrl;

  for (let hop = 0; hop <= hops; hop++) {
    const response = await fetch(current, {
      headers: {
        'User-Agent': USER_AGENT,
        Referer: refererFor(current),
        Accept: 'text/html,application/xhtml+xml,*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) throw new Error(`Embed inaccessible (${response.status})`);

    const html = await response.text();
    const next = hop < hops ? jsRedirectTarget(html) : null;
    if (!next || next === current) return { html, pageUrl: current };
    current = next;
  }

  throw new Error('Trop de redirections');
}

export async function resolveEmbedStream(embedUrl) {
  if (!embedUrl || !/^https?:\/\//i.test(embedUrl)) {
    throw new Error('URL embed invalide');
  }

  const player = detectPlayer(embedUrl);
  const key = `stream:${player}:${embedUrl}`;
  const hit = readCache(key);
  if (hit) return hit;

  const { html, pageUrl } = await fetchEmbedPage(embedUrl);
  const url = extractStreamUrl(html, pageUrl, player);

  if (!url || isPlaceholderStream(url)) {
    throw new Error('Flux direct introuvable pour ce lecteur');
  }

  const stream = {
    url,
    type: url.includes('.m3u8') ? 'hls' : 'mp4',
    player,
    referer: refererFor(pageUrl),
  };

  writeCache(key, stream);
  return stream;
}

/** Essaie les lecteurs dans l'ordre : le premier qui répond gagne. */
export async function resolveFirstEmbed(embedUrls) {
  const errors = [];

  for (const embed of embedUrls) {
    try {
      return await resolveEmbedStream(embed);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(errors[0] || 'Aucun lecteur téléchargeable pour cet épisode');
}

export { USER_AGENT };

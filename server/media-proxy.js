const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DEFAULT_REFERER = 'https://www.aoneroom.com/';

function isPrivateHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local')) return true;
  if (host === '::1' || host.startsWith('127.') || host.startsWith('10.')) return true;
  if (host.startsWith('192.168.') || host.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

function isAllowedUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (isPrivateHost(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function absUrl(value, base) {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

function proxyPath(url, referer) {
  const params = new URLSearchParams({ url, referer });
  return `/proxy?${params}`;
}

function rewriteM3u8(body, targetUrl, referer) {
  const base = targetUrl.includes('/') ? targetUrl.slice(0, targetUrl.lastIndexOf('/') + 1) : targetUrl;

  return body
    .split('\n')
    .map((line) => {
      if (line.includes('URI="')) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
          const absolute = absUrl(uri, base);
          return isAllowedUrl(absolute) ? `URI="${proxyPath(absolute, referer)}"` : `URI="${uri}"`;
        });
      }

      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;

      const absolute = absUrl(trimmed, base);
      return isAllowedUrl(absolute) ? proxyPath(absolute, referer) : line;
    })
    .join('\n');
}

async function handleProxy(req, res) {
  const parsed = new URL(req.url || '/', 'http://localhost');
  if (parsed.pathname !== '/proxy') return false;

  const targetUrl = parsed.searchParams.get('url') || '';
  const referer = parsed.searchParams.get('referer') || DEFAULT_REFERER;

  if (!isAllowedUrl(targetUrl)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'URL proxy invalide' }));
    return true;
  }

  const headers = {
    'User-Agent': USER_AGENT,
    Referer: referer,
    Origin: (() => {
      try {
        return new URL(referer).origin;
      } catch {
        return 'https://www.aoneroom.com';
      }
    })(),
    Accept: '*/*',
  };

  if (req.headers.range) headers.Range = req.headers.range;

  try {
    const upstream = await fetch(targetUrl, { headers, redirect: 'follow' });
    const contentType = upstream.headers.get('content-type') || '';
    const isPlaylist =
      targetUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('x-mpegURL');

    res.statusCode = upstream.status;

    if (isPlaylist) {
      const body = rewriteM3u8(await upstream.text(), targetUrl, referer);
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'no-store');
      res.end(body);
      return true;
    }

    const passHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];
    for (const name of passHeaders) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.setHeader('Cache-Control', 'no-store');

    if (!upstream.body) {
      res.end();
      return true;
    }

    const { Readable } = await import('node:stream');
    Readable.fromWeb(upstream.body).pipe(res);
    return true;
  } catch (error) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy error' }));
    return true;
  }
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/** Nom de fichier sûr pour l'en-tête Content-Disposition. */
function safeFileName(raw) {
  const base = String(raw || 'video')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f/\\?%*:|"<>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/\.+$/, '');
  const name = base || 'video';
  return name.toLowerCase().endsWith('.mp4') ? name : `${name}.mp4`;
}

function setAttachmentHeaders(res, fileName) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

/** Liste des embeds candidats : le premier qui résout est utilisé. */
function embedCandidates(parsed) {
  return parsed.searchParams.getAll('embed').filter((url) => isAllowedUrl(url));
}

/** Résout l'embed sans télécharger : permet d'afficher une erreur claire côté UI. */
async function handleStreamProbe(req, res) {
  const parsed = new URL(req.url || '/', 'http://localhost');
  if (parsed.pathname !== '/stream') return false;

  const embeds = embedCandidates(parsed);
  if (!embeds.length) {
    sendJson(res, 400, { error: 'URL embed invalide' });
    return true;
  }

  try {
    const { resolveFirstEmbed } = await import('./stream-resolver.js');
    const stream = await resolveFirstEmbed(embeds);
    sendJson(res, 200, { type: stream.type, player: stream.player });
  } catch (error) {
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : 'Flux introuvable',
    });
  }
  return true;
}

/** mp4 direct : on relaie le flux en pièce jointe (Range conservé → reprise possible). */
async function streamMp4Download(stream, fileName, req, res) {
  const headers = {
    'User-Agent': USER_AGENT,
    Referer: stream.referer,
    Accept: '*/*',
  };
  try {
    headers.Origin = new URL(stream.referer).origin;
  } catch {
    /* referer non parsable : on laisse sans Origin */
  }
  if (req.headers.range) headers.Range = req.headers.range;

  const upstream = await fetch(stream.url, { headers, redirect: 'follow' });
  if (!upstream.ok && upstream.status !== 206) {
    throw new Error(`Source indisponible (${upstream.status})`);
  }

  res.statusCode = upstream.status;
  setAttachmentHeaders(res, fileName);
  res.setHeader('Content-Type', 'video/mp4');
  for (const name of ['content-length', 'content-range', 'accept-ranges']) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  const { Readable } = await import('node:stream');
  const body = Readable.fromWeb(upstream.body);
  res.on('close', () => body.destroy());
  body.pipe(res);
}

/** HLS : ffmpeg remuxe les segments en un seul mp4 streamé au navigateur. */
async function streamHlsDownload(stream, fileName, res) {
  const { spawn } = await import('node:child_process');

  const args = [
    '-nostdin',
    '-loglevel',
    'error',
    '-user_agent',
    USER_AGENT,
    '-headers',
    `Referer: ${stream.referer}\r\n`,
    '-protocol_whitelist',
    'file,http,https,tcp,tls,crypto',
    '-i',
    stream.url,
    '-map',
    '0:v:0?',
    '-map',
    '0:a?',
    '-c:v',
    'copy',
    // Ré-encodage audio : le HLS sort de l'AAC brut (ADTS) que le conteneur mp4 refuse.
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-movflags',
    'frag_keyframe+empty_moov+default_base_moof',
    '-f',
    'mp4',
    'pipe:1',
  ];

  const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let failed = false;
  let stderr = '';
  proc.stderr.on('data', (chunk) => {
    stderr = (stderr + chunk.toString()).slice(-2000);
  });

  proc.on('error', (error) => {
    failed = true;
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const missing = error && error.code === 'ENOENT';
    sendJson(res, missing ? 501 : 502, {
      error: missing
        ? 'ffmpeg est requis pour télécharger ce lecteur (flux HLS).'
        : 'Conversion du flux impossible',
    });
  });

  proc.on('close', (code) => {
    if (failed) return;
    if (code !== 0 && !res.headersSent) {
      sendJson(res, 502, { error: stderr.trim() || 'Conversion du flux interrompue' });
      return;
    }
    res.end();
  });

  res.on('close', () => {
    if (!proc.killed) proc.kill('SIGKILL');
  });

  setAttachmentHeaders(res, fileName);
  res.setHeader('Content-Type', 'video/mp4');
  proc.stdout.pipe(res, { end: false });
}

async function handleDownload(req, res) {
  const parsed = new URL(req.url || '/', 'http://localhost');
  if (parsed.pathname !== '/download') return false;

  const embeds = embedCandidates(parsed);
  const fileName = safeFileName(parsed.searchParams.get('name'));

  if (!embeds.length) {
    sendJson(res, 400, { error: 'URL embed invalide' });
    return true;
  }

  try {
    const { resolveFirstEmbed } = await import('./stream-resolver.js');
    const stream = await resolveFirstEmbed(embeds);

    if (!isAllowedUrl(stream.url)) {
      sendJson(res, 502, { error: 'Flux non autorisé' });
      return true;
    }

    if (stream.type === 'hls') {
      await streamHlsDownload(stream, fileName, res);
    } else {
      await streamMp4Download(stream, fileName, req, res);
    }
  } catch (error) {
    if (res.headersSent) {
      res.destroy();
      return true;
    }
    sendJson(res, 502, {
      error: error instanceof Error ? error.message : 'Téléchargement impossible',
    });
  }
  return true;
}

export function mediaProxyPlugin() {
  const middleware = async (req, res, next) => {
    const handled =
      (await handleProxy(req, res)) ||
      (await handleStreamProbe(req, res)) ||
      (await handleDownload(req, res));
    if (!handled) next();
  };

  return {
    name: 'media-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

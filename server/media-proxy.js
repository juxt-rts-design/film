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

export function mediaProxyPlugin() {
  const middleware = async (req, res, next) => {
    const handled = await handleProxy(req, res);
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

/**
 * Service média autonome (production).
 *
 * En prod le site est servi en statique (dist/ derrière nginx) : le plugin Vite
 * n'existe plus, donc /proxy, /stream et /download doivent être servis par ce
 * petit serveur, auquel nginx relaie ces trois chemins.
 *
 *   node server/standalone.js        # écoute 127.0.0.1:5175
 *   MEDIA_PORT=6000 node server/standalone.js
 */
import http from 'node:http';
import { mediaMiddleware } from './media-proxy.js';

const port = Number(process.env.MEDIA_PORT || 5175);
const host = process.env.MEDIA_HOST || '127.0.0.1';

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/media-health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  mediaMiddleware(req, res, () => {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Route inconnue' }));
  }).catch((error) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur serveur' }));
  });
});

// Un téléchargement HLS peut durer plusieurs minutes : pas de coupure côté serveur.
server.requestTimeout = 0;
server.headersTimeout = 60_000;
server.keepAliveTimeout = 72_000;

server.listen(port, host, () => {
  console.log(`[juxt-cine] service média sur http://${host}:${port}`);
});

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { guardInspect } from './lib/guardUi';
import './styles/index.css';

if (import.meta.env.PROD) {
  guardInspect();
}

const ALLOWED_EXTERNAL =
  /(?:^|\.)(wa\.me|whatsapp\.com|t\.me|telegram\.org|telegram\.me)$/i;

function isAllowedUrl(raw?: string | URL) {
  const href = String(raw || '').trim();
  if (!href || href === 'about:blank') return false;
  try {
    const url = new URL(href, window.location.href);
    if (url.origin === window.location.origin) return true;
    return ALLOWED_EXTERNAL.test(url.hostname);
  } catch {
    return false;
  }
}

const nativeOpen = window.open.bind(window);
window.open = ((url?: string | URL, target?: string, features?: string) => {
  if (!isAllowedUrl(url)) return null;
  return nativeOpen(url as string, target, features);
}) as typeof window.open;

document.addEventListener(
  'click',
  (event) => {
    const link = (event.target as Element | null)?.closest?.('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('/')) return;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (!isAllowedUrl(href)) {
      event.preventDefault();
      event.stopPropagation();
    }
  },
  true,
);

// PWA : uniquement en build prod (évite un SW qui sert d’anciens bundles cassés en dev)
if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

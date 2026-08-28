import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

const BLOCKED_NAV =
  /aliexpress|doubleclick|googlesyndication|exoclick|propellerads|adskeeper|taboola|outbrain|criteo|popads|adsterra/i;

const nativeOpen = window.open.bind(window);
window.open = ((url?: string | URL, target?: string, features?: string) => {
  const href = String(url || '');
  if (href && BLOCKED_NAV.test(href)) return null;
  return nativeOpen(url as string, target, features);
}) as typeof window.open;

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

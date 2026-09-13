import { useEffect, useState } from 'react';

const DISMISS_KEY = 'juxt-cine-pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

/** Propose l’installation PWA (Chrome/Brave/Edge + guide Safari iOS). */
export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
      setIosHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    if (isIos()) {
      const timer = window.setTimeout(() => {
        if (!isStandalone()) {
          setIosHint(true);
          setVisible(true);
        }
      }, 4500);
      return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  if (!visible) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="pwa-banner" role="dialog" aria-label="Installer Juxt-Ciné">
      <div className="pwa-banner__body">
        <img src="/icons/icon-192.png" alt="" className="pwa-banner__icon" width={40} height={40} />
        <div className="pwa-banner__text">
          <strong>Installer Juxt-Ciné</strong>
          {iosHint ? (
            <p>
              Sur Safari : touche <em>Partager</em> puis <em>Sur l’écran d’accueil</em>.
            </p>
          ) : (
            <p>Ajoute l’app à ton écran d’accueil pour un accès rapide.</p>
          )}
        </div>
      </div>
      <div className="pwa-banner__actions">
        {!iosHint && deferred ? (
          <button type="button" className="pwa-banner__install" onClick={() => void install()}>
            Installer
          </button>
        ) : null}
        <button type="button" className="pwa-banner__dismiss" onClick={dismiss}>
          Plus tard
        </button>
      </div>
    </div>
  );
}

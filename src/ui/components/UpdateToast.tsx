// PWA update toast (SPEC §11). The service worker is registered with registerType 'prompt': when a new
// version has downloaded, this asks the player to refresh, and nothing reloads until they tap Refresh
// (a Real game is saved after every action, but a Practice game would be lost). The first time the app
// is ready to work offline, a short info message says so.
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import '../styles/update-toast.css';
import { useT } from '../useT';

const OFFLINE_READY_MS = 3000;

export function UpdateToast() {
  const t = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (!offlineReady) return;
    const handle = setTimeout(() => setOfflineReady(false), OFFLINE_READY_MS);
    return () => clearTimeout(handle);
  }, [offlineReady, setOfflineReady]);

  if (needRefresh) {
    return (
      <div className="update-toast" role="alert">
        <p className="update-toast__text">{t('pwa.updateReady')}</p>
        <div className="update-toast__actions">
          <button type="button" className="update-toast__btn" onClick={() => setNeedRefresh(false)}>
            {t('pwa.dismiss')}
          </button>
          <button
            type="button"
            className="update-toast__btn update-toast__btn--primary"
            onClick={() => {
              // vite-plugin-pwa only reloads for updates it classes as its own; an update found
              // later in a long session counts as "external". Reload on any controller change.
              navigator.serviceWorker?.addEventListener(
                'controllerchange',
                () => window.location.reload(),
                { once: true },
              );
              void updateServiceWorker(true);
            }}
          >
            {t('pwa.refresh')}
          </button>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className="update-toast update-toast--info" role="status">
        <p className="update-toast__text">{t('pwa.offlineReady')}</p>
      </div>
    );
  }

  return null;
}

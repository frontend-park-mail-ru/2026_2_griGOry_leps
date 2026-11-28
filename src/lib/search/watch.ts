import { refreshSearchSettings } from './settings';

export const SEARCH_SETTINGS_POLL_MS = 30_000;

export function watchSearchSettings(): () => void {
    const refresh = () => {
        if (document.visibilityState === 'visible') void refreshSearchSettings();
    };
    const timer = setInterval(refresh, SEARCH_SETTINGS_POLL_MS);
    document.addEventListener('visibilitychange', refresh);

    return () => {
        clearInterval(timer);
        document.removeEventListener('visibilitychange', refresh);
    };
}

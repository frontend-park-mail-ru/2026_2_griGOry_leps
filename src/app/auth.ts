import { logout } from '@/lib/api';
import { clearUser } from '@/store';
import { logWarn } from '@/lib/logger';
import { navigate } from '@/router/router';

export async function handleLogout(): Promise<void> {
    try {
        await logout();
    } catch (err) {
        logWarn('Не удалось выйти:', err);
        throw err;
    }
    clearUser();
    navigate('/');
}

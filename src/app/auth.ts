import { logout } from '@/lib/api';
import { clearUser } from '@/lib/user';
import { logWarn } from '@/lib/core';
import { navigate } from 'goget-router';

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

import { ApiError, checkResetToken, getMe, type Profile, type User } from '@/lib/api';
import { setUser } from '@/store';
import { logWarn } from '@/lib/logger';
import type { ResetPasswordProps } from '@/pages/reset-password-page/reset-password-page';

export async function loadCurrentUser(): Promise<User | null> {
    try {
        const user = await getMe();
        if (user) setUser(user);
        return user;
    } catch (err) {
        logWarn('Не удалось получить текущего пользователя:', err);
        return null;
    }
}

export async function loadProfile(): Promise<Profile> {
    const profile = await getMe();
    if (!profile) throw new Error('Пользователь не авторизован');
    setUser(profile);
    return profile;
}

export async function loadResetPassword(): Promise<ResetPasswordProps> {
    const token = new URLSearchParams(location.search).get('token') ?? '';
    if (!token) return { token, email: null };

    try {
        return { token, email: await checkResetToken(token) };
    } catch (err) {
        if (err instanceof ApiError && err.status === 400) return { token, email: null };
        throw err;
    }
}

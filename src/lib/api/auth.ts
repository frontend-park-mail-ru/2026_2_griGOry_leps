import { ensureOk, json } from './errors';
import { resetCsrfToken } from './csrf';
import { request } from './request';
import { jsonBody, query } from './utils';
import type { Profile } from './profile';
import type { User } from './types';

export interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    phone: string;
}

/** null, если не авторизован */
export async function getMe(): Promise<Profile | null> {
    const response = await request('/me');

    if (response.status >= 400 && response.status < 500) {
        return null;
    }

    return json(response);
}

export async function login({ login, password }: { login: string; password: string }): Promise<User> {
    const response = await request('/login', { method: 'POST', ...jsonBody({ login, password }) });
    const user = await json<User>(response);
    resetCsrfToken();
    return user;
}

export async function register({ email, password, first_name, phone }: RegisterData): Promise<User> {
    const response = await request('/register', {
        method: 'POST',
        ...jsonBody({ email, password, first_name, phone }),
    });
    const user = await json<User>(response);
    resetCsrfToken();
    return user;
}

export async function logout(): Promise<void> {
    const response = await request('/logout', { method: 'POST' });
    await ensureOk(response);
    resetCsrfToken();
}

export async function requestPasswordReset(login: string): Promise<void> {
    const response = await request('/password/forgot', { method: 'POST', ...jsonBody({ login }) });
    await ensureOk(response);
}

export async function checkResetToken(token: string): Promise<string> {
    const { email } = await json<{ email: string }>(await request(`/password/reset${query({ token })}`));
    return email;
}

export interface VerifyEmailResult {
    email: string;
    changed: boolean;
}

export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
    return json(await request('/email/verify', { method: 'POST', ...jsonBody({ token }) }));
}

export async function resendVerification(): Promise<string> {
    const { email } = await json<{ email: string }>(await request('/email/verify/resend', { method: 'POST' }));
    return email;
}

export async function resendVerificationByLink(token: string): Promise<string> {
    const { email } = await json<{ email: string }>(
        await request('/email/verify/resend-by-link', { method: 'POST', ...jsonBody({ token }) }),
    );
    return email;
}

export async function resetPassword(token: string, password: string): Promise<void> {
    const response = await request('/password/reset', { method: 'POST', ...jsonBody({ token, password }) });
    await ensureOk(response);
    resetCsrfToken();
}

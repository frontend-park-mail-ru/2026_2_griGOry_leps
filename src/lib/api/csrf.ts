import { json, readErrorBody } from './errors';
import { send } from './utils';

export const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_ERROR = 'invalid csrf token';

/** Токен для изменяющих запросов. Привязан к сессии, поэтому сбрасывается при входе и выходе */
let csrfToken: string | null = null;
let csrfLoading: Promise<string> | null = null;

/** Забыть CSRF-токен: следующий изменяющий запрос получит новый */
export function resetCsrfToken(): void {
    csrfToken = null;
}

/**
 * Запрашивает CSRF-токен. Параллельные запросы ждут один и тот же ответ.
 * Если бэк ещё не умеет CSRF (404), запросы уходят без токена.
 */
export async function getCsrfToken(): Promise<string> {
    if (csrfToken !== null) return csrfToken;

    csrfLoading ??= (async () => {
        const response = await send('/csrf', { method: 'GET' });
        if (response.status === 404) return '';

        const { csrf_token: token } = await json<{ csrf_token: string }>(response);
        return token;
    })().finally(() => {
        csrfLoading = null;
    });

    csrfToken = await csrfLoading;
    return csrfToken;
}

/** Бэк отверг запрос из-за неверного или устаревшего токена */
export async function isCsrfRejected(response: Response): Promise<boolean> {
    if (response.status !== 403) return false;
    return (await readErrorBody(response)).error === CSRF_ERROR;
}

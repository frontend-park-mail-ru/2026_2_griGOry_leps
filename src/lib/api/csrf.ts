import { json, readErrorBody } from './errors';
import { send } from './utils';

export const CSRF_HEADER = 'X-CSRF-Token';
const CSRF_ERROR = 'invalid csrf token';

/** Токен для изменяющих запросов. Привязан к сессии, поэтому сбрасывается при входе и выходе */
let csrfToken: string | null = null;
let csrfLoading: Promise<string> | null = null;
/** Растёт при каждом сбросе: загрузка, начатая до сброса, не сохранит устаревший токен */
let csrfVersion = 0;

/** Забыть CSRF-токен: следующий изменяющий запрос получит новый */
export function resetCsrfToken(): void {
    csrfToken = null;
    csrfLoading = null;
    csrfVersion++;
}

/**
 * Запрашивает токен у бэка и кеширует его, если за время запроса не было сброса.
 * Если бэк ещё не умеет CSRF (404), запросы уходят без токена.
 */
async function loadCsrfToken(): Promise<string> {
    const version = csrfVersion;
    const response = await send('/csrf', { method: 'GET' });
    const token = response.status === 404
        ? ''
        : (await json<{ csrf_token: string }>(response)).csrf_token;

    if (version === csrfVersion) csrfToken = token;
    return token;
}

/** Токен из кеша или новый. Параллельные запросы ждут одну загрузку */
export function getCsrfToken(): Promise<string> {
    if (csrfToken !== null) return Promise.resolve(csrfToken);

    if (!csrfLoading) {
        const loading = loadCsrfToken().finally(() => {
            if (csrfLoading === loading) csrfLoading = null;
        });
        csrfLoading = loading;
    }
    return csrfLoading;
}

/** Бэк отверг запрос из-за неверного или устаревшего токена */
export async function isCsrfRejected(response: Response): Promise<boolean> {
    if (response.status !== 403) return false;
    return (await readErrorBody(response)).error === CSRF_ERROR;
}

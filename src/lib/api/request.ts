import { CSRF_HEADER, getCsrfToken, isCsrfRejected, resetCsrfToken } from './csrf';
import { send, type RequestOptions } from './utils';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Базовый запрос к API: cookie, таймаут, JSON-заголовок для строкового тела.
 * К POST/PUT/PATCH/DELETE добавляет CSRF-токен; если бэк его отверг
 * (например, токен истёк), берёт новый и повторяет запрос один раз.
 * Бросает ApiError только при сетевой ошибке или таймауте, HTTP-статус проверяет вызывающий.
 * @param options параметры fetch и timeout в мс (0 — без таймаута)
 */
export async function request(endpoint: string, options: RequestOptions = {}): Promise<Response> {
    const method = (options.method ?? 'GET').toUpperCase();
    const headers = new Headers(options.headers);

    if (typeof options.body === 'string' && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    if (!UNSAFE_METHODS.has(method)) {
        return send(endpoint, { ...options, headers });
    }

    const sendWithToken = async () => {
        const token = await getCsrfToken();
        if (token) headers.set(CSRF_HEADER, token);
        else headers.delete(CSRF_HEADER);
        return send(endpoint, { ...options, headers });
    };

    const response = await sendWithToken();
    if (!(await isCsrfRejected(response))) return response;

    resetCsrfToken();
    return sendWithToken();
}

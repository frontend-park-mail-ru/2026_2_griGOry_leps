import { ApiError } from './errors';

export const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
export const DEFAULT_TIMEOUT_MS = 10000;
export const UPLOAD_TIMEOUT_MS = 60000;

export type RequestOptions = RequestInit & { timeout?: number };

/**
 * Один запрос без CSRF и повторов: cookie и таймаут.
 * Бросает ApiError только при сетевой ошибке или таймауте.
 */
export async function send(endpoint: string, { timeout = DEFAULT_TIMEOUT_MS, ...options }: RequestOptions): Promise<Response> {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = timeout > 0
        ? setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeout)
        : null;

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            credentials: 'include',
            signal: controller.signal,
        });
        const body = await response.text();
        return new Response(body || null, response);
    } catch {
        throw timedOut
            ? new ApiError(0, { timeout: true })
            : new ApiError(0, { network: true });
    } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
    }
}

/** Query-строка без пустых параметров */
export function query(params: object = {}): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
    const str = search.toString();
    return str ? `?${str}` : '';
}

export function jsonBody(data: unknown): RequestOptions {
    return { body: JSON.stringify(data) };
}

/** multipart с полем file, таймаут больше обычного */
export function fileBody(file: Blob): RequestOptions {
    const form = new FormData();
    form.append('file', file);
    return { body: form, timeout: UPLOAD_TIMEOUT_MS };
}

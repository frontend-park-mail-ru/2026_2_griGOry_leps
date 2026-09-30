import { mockCategories, mockPromos, mockProducts } from './data.js';
import { logWarn } from '@/lib/logger.js';

const BASE_URL = '/api';
const TIMEOUT_MS = 5000;
const USE_MOCKS = import.meta.env.DEV;

export class ApiError extends Error {
    constructor(status, { network = false } = {}) {
        super(network ? 'Network error' : `HTTP ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.network = network;
    }
}

export async function request(endpoint, options = {}) {
    const headers = new Headers(options.headers);

    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        return await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
            signal: controller.signal,
        });
    } catch {
        throw new ApiError(0, { network: true });
    } finally {
        clearTimeout(timeoutId);
    }
}

function assertOk(response) {
    if (!response.ok) {
        throw new ApiError(response.status);
    }
}

function toArray(data, key) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (key && Array.isArray(data[key])) return data[key];
        if (Array.isArray(data.data)) return data.data;
    }
    return [];
}

/**
 * Возвращает результат loader().
 * При ошибке:
 *   - 4xx → [] (данных нет — не подменяем)
 *   - 5xx/network/timeout → mock (в dev) или [] (в prod)
 * Пустой массив — валидный ответ, fallback НЕ подставляется.
 */
async function withFallback(loader, fallback) {
    try {
        return await loader();
    } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
            return [];
        }

        if (USE_MOCKS) {
            logWarn('API недоступен, показываю моки:', err);
            return fallback;
        }

        logWarn('API недоступен:', err);
        return [];
    }
}

// ... getMe, login, register, logout — без изменений ...

export function getCategories() {
    return withFallback(
        async () => {
            const res = await request('/categories');
            assertOk(res);
            return toArray(await res.json(), 'categories');
        },
        mockCategories
    );
}

export function getPromos() {
    return withFallback(
        async () => {
            const res = await request('/promos');
            assertOk(res);
            return toArray(await res.json(), 'promos');
        },
        mockPromos
    );
}

export function getProducts() {
    return withFallback(
        async () => {
            const res = await request('/products');
            assertOk(res);
            return toArray(await res.json(), 'products');
        },
        mockProducts
    );
}

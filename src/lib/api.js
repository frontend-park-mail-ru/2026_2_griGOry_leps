import { mockCategories, mockPromos, mockProducts } from './data.js';

const API_BASE = '/api';

async function request(path, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch(API_BASE + path, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...options.headers },
            signal: controller.signal,
            ...options,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw Object.assign(new Error(data.error || 'Ошибка запроса'), {
                status: res.status,
                data,
            });
        }
        return data;
    } finally {
        clearTimeout(timeoutId);
    }
}

function toArray(data, key) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data[key])) return data[key];
    if (data && Array.isArray(data.data)) return data.data;
    return [];
}

/**
 * @template T
 * @param {() => Promise<T[]>} loader
 * @param {T[]} fallback
 * @returns {Promise<T[]>}
 */
async function withFallback(loader, fallback) {
    try {
        const data = await loader();
        return data.length > 0 ? data : fallback;
    } catch {
        return fallback;
    }
}

export const api = {
    categories: () => withFallback(
        async () => toArray(await request('/categories'), 'categories'),
        mockCategories
    ),

    promos: () => withFallback(
        async () => toArray(await request('/promos'), 'promos'),
        mockPromos
    ),

    products: () => withFallback(
        async () => toArray(await request('/products'), 'products'),
        mockProducts
    ),

    me: () => request('/me').catch(() => null),
};
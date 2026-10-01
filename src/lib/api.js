import { mockCategories, mockPromos, mockProducts } from '@/lib/data.js';
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

export async function getMe() {
    const response = await request('/me');

    if (response.status >= 400 && response.status < 500) {
        return null;
    }

    assertOk(response);
    return response.json();
}

export async function login({ login, password }) {
    const response = await request('/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
    });

    assertOk(response);
    return response.json();
}

export async function register(data) {
    const response = await request('/register', {
        method: 'POST',
        body: JSON.stringify({
            email: data.email,
            password: data.password,
            first_name: data.first_name,
            nickname: data.nickname,
            phone: data.phone,
        }),
    });

    assertOk(response);
    return response.json();
}

export async function logout() {
    const response = await request('/logout', { method: 'POST' });
    assertOk(response);
}

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

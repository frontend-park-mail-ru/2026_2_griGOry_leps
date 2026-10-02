import { mockCategories, mockPromos } from './data.js';
import { logWarn } from '@/lib/logger.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const TIMEOUT_MS = 5000;

export class ApiError extends Error {
    constructor(status, { network = false, field = '' } = {}) {
        super(network ? 'Network error' : `HTTP ${status}`);
        this.name = 'ApiError';
        this.status = status;
        this.network = network;
        this.field = field;
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

async function assertOkWithField(response) {
    if (response.ok) return;

    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, { field: body?.field ?? '' });
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

    await assertOkWithField(response);
    return response.json();
}

export async function register({ email, password, first_name, nickname, phone }) {
    const response = await request('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, first_name, nickname, phone }),
    });

    await assertOkWithField(response);
    return response.json();
}

export async function logout() {
    const response = await request('/logout', { method: 'POST' });
    assertOk(response);
}

function toArray(data, key) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        if (key && Array.isArray(data[key])) return data[key];
        if (Array.isArray(data.data)) return data.data;
    }
    return [];
}


async function withEmptyOnError(loader) {
    try {
        return await loader();
    } catch (err) {
        logWarn('API недоступен:', err);
        return [];
    }
}

export function getCategories() {
    return Promise.resolve(mockCategories);
}

export function getPromos() {
    return Promise.resolve(mockPromos);
}

export function getProducts() {
    return withEmptyOnError(
        async () => {
            const res = await request('/ads');
            assertOk(res);
            return toArray(await res.json(), 'items');
        }
    );
}

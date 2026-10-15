import { mockCategories, mockPromos, type Category, type Promo } from './data';
import { logWarn } from '@/lib/logger';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const DEFAULT_TIMEOUT_MS = 10000;

export interface User {
    id: number;
    email: string;
    first_name: string;
    phone: string;
}

export interface Listing {
    id: number;
    title: string;
    /** Цена в рублях строкой, например "15000.00" */
    price: string;
    city: string;
    has_delivery: boolean;
    image_url: string | null;
    created_at: string;
}

export interface ApiErrorOptions {
    network?: boolean;
    timeout?: boolean;
    field?: string;
}

export class ApiError extends Error {
    /** HTTP-статус, 0 при сетевой ошибке */
    status: number;
    network: boolean;
    timeout: boolean;
    /** Поле формы, к которому бэк отнёс ошибку */
    field: string;

    constructor(status: number, { network = false, timeout = false, field = '' }: ApiErrorOptions = {}) {
        let message = `HTTP ${status}`;
        if (timeout) message = 'Timeout';
        else if (network) message = 'Network error';

        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.network = network;
        this.timeout = timeout;
        this.field = field;
    }
}

export type RequestOptions = RequestInit & { timeout?: number };

/**
 * Бросает ApiError только при сетевой ошибке или таймауте, HTTP-статус проверяет вызывающий.
 * @param options параметры fetch и timeout в мс (0 — без таймаута)
 */
export async function request(
    endpoint: string,
    { timeout = DEFAULT_TIMEOUT_MS, ...options }: RequestOptions = {},
): Promise<Response> {
    const headers = new Headers(options.headers);

    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

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
            headers,
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

function assertOk(response: Response): void {
    if (!response.ok) {
        throw new ApiError(response.status);
    }
}

async function assertOkWithField(response: Response): Promise<void> {
    if (response.ok) return;

    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, { field: body?.field ?? '' });
}

/** null, если не авторизован */
export async function getMe(): Promise<User | null> {
    const response = await request('/me');

    if (response.status >= 400 && response.status < 500) {
        return null;
    }

    assertOk(response);
    return response.json();
}

export async function login({ login, password }: { login: string; password: string }): Promise<User> {
    const response = await request('/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
    });

    await assertOkWithField(response);
    return response.json();
}

export interface RegisterData {
    email: string;
    password: string;
    first_name: string;
    phone: string;
}

export async function register({ email, password, first_name, phone }: RegisterData): Promise<User> {
    const response = await request('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, first_name, phone }),
    });

    await assertOkWithField(response);
    return response.json();
}

export async function logout(): Promise<void> {
    const response = await request('/logout', { method: 'POST' });
    assertOk(response);
}

function toArray<T>(data: unknown, key: string): T[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        const obj = data as Record<string, unknown>;
        if (Array.isArray(obj[key])) return obj[key];
        if (Array.isArray(obj.data)) return obj.data;
    }
    return [];
}

async function withEmptyOnError<T>(loader: () => Promise<T[]>): Promise<T[]> {
    try {
        return await loader();
    } catch (err) {
        logWarn('API недоступен:', err);
        return [];
    }
}

/** Пока из data.ts: ручки на бэке нет */
export function getCategories(): Promise<Category[]> {
    return Promise.resolve(mockCategories);
}

export function getPromos(): Promise<Promo[]> {
    return Promise.resolve(mockPromos);
}

/** При ошибке пустой список, чтобы главная не падала */
export function getProducts(): Promise<Listing[]> {
    return withEmptyOnError(
        async () => {
            const res = await request('/listings');
            assertOk(res);
            return toArray<Listing>(await res.json(), 'items');
        }
    );
}

/**
 * @module api
 * @description Запросы к бэкенду. Адрес берётся из VITE_API_URL,
 * все запросы идут с cookie сессии и обрываются по таймауту.
 */

import { mockCategories, mockPromos } from './data.js';
import { logWarn } from '@/lib/logger.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';
const DEFAULT_TIMEOUT_MS = 10000;

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string} first_name
 * @property {string} nickname
 * @property {string} phone
 */

/**
 * @typedef {Object} Listing
 * @property {number} id
 * @property {string} title
 * @property {string} price Цена в рублях строкой, например "15000.00"
 * @property {string} city
 * @property {boolean} has_delivery
 * @property {(string|null)} image_url
 * @property {string} created_at
 */

/**
 * Ошибка запроса к API.
 * @property {number} status HTTP-статус, 0 при сетевой ошибке
 * @property {boolean} network Не удалось достучаться до сервера
 * @property {boolean} timeout Сервер не ответил за отведённое время
 * @property {string} field Поле формы, к которому относится ошибка
 */
export class ApiError extends Error {
    constructor(status, { network = false, timeout = false, field = '' } = {}) {
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

/**
 * Базовый запрос к API: JSON-заголовок, cookie, таймаут.
 * @param {string} endpoint Путь без префикса, например "/me"
 * @param {RequestInit & { timeout?: number }} [options] timeout — в мс,
 *     по умолчанию DEFAULT_TIMEOUT_MS; 0 — без таймаута (для долгих запросов)
 * @returns {Promise<Response>}
 * @throws {ApiError} При сетевой ошибке (network) или таймауте (timeout)
 */
export async function request(endpoint, { timeout = DEFAULT_TIMEOUT_MS, ...options } = {}) {
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
        return await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
            signal: controller.signal,
        });
    } catch {
        throw timedOut
            ? new ApiError(0, { timeout: true })
            : new ApiError(0, { network: true });
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

/**
 * Текущий пользователь по cookie сессии.
 * @returns {Promise<(User|null)>} null, если пользователь не авторизован
 */
export async function getMe() {
    const response = await request('/me');

    if (response.status >= 400 && response.status < 500) {
        return null;
    }

    assertOk(response);
    return response.json();
}

/**
 * Вход по email или телефону.
 * @param {{ login: string, password: string }} data
 * @returns {Promise<User>}
 * @throws {ApiError} 401 при неверном логине или пароле
 */
export async function login({ login, password }) {
    const response = await request('/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
    });

    await assertOkWithField(response);
    return response.json();
}

/**
 * Регистрация. После успеха бэк сразу ставит cookie сессии.
 * @param {{ email: string, password: string, first_name: string, nickname: string, phone: string }} data
 * @returns {Promise<User>}
 * @throws {ApiError} 400 или 409, в field указано поле с ошибкой
 */
export async function register({ email, password, first_name, nickname, phone }) {
    const response = await request('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, first_name, nickname, phone }),
    });

    await assertOkWithField(response);
    return response.json();
}

/**
 * Выход: бэк удаляет сессию и cookie.
 * @returns {Promise<void>}
 */
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

/**
 * Категории для главной и каталога. Пока берутся из data.js, ручки на бэке нет.
 * @returns {Promise<Array<Object>>}
 */
export function getCategories() {
    return Promise.resolve(mockCategories);
}

/**
 * Промо-баннеры главной, статичные.
 * @returns {Promise<Array<Object>>}
 */
export function getPromos() {
    return Promise.resolve(mockPromos);
}

/**
 * Лента объявлений. При ошибке возвращает пустой массив, чтобы страница не падала.
 * @returns {Promise<Listing[]>}
 */
export function getProducts() {
    return withEmptyOnError(
        async () => {
            const res = await request('/listings');
            assertOk(res);
            return toArray(await res.json(), 'items');
        }
    );
}

/**
 * @module api
 * @description Клиент бэкенда GO&GET. Авторизация построена на cookie-сессии
 * `session_id` (httpOnly), поэтому все запросы идут с `credentials: 'include'`.
 */

/**
 * Пользователь, схема `User` из openapi.yaml бэкенда (поля в snake_case).
 * @typedef {Object} User
 * @property {number} id Идентификатор
 * @property {string} email Email
 * @property {string} first_name Имя
 * @property {string} nickname Публичный никнейм
 * @property {string} phone Телефон в формате `+79001234567`
 */

/** Базовый префикс всех запросов к бэкенду. */
const BASE_URL = '/api';

/**
 * Ошибка обращения к API.
 * `network === true` — запрос не дошёл до сервера (нет сети, сервер недоступен),
 * в этом случае `status` равен 0.
 * @extends Error
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP-статус ответа или 0 при сетевой ошибке
   * @param {Object} [options]
   * @param {boolean} [options.network=false] запрос не дошёл до сервера
   */
  constructor(status, { network = false } = {}) {
    super(network ? 'Network error' : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.network = network;
  }
}

/**
 * Выполняет запрос к API с куками сессии.
 * @param {string} endpoint путь относительно BASE_URL, например '/login'
 * @param {RequestInit} [options] параметры fetch
 * @returns {Promise<Response>}
 * @throws {ApiError} при сетевой ошибке (status = 0, network = true)
 */
export async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    return await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, { network: true });
  }
}

/**
 * Бросает ApiError, если ответ неуспешный.
 * @param {Response} response
 * @throws {ApiError}
 */
function assertOk(response) {
  if (!response.ok) {
    throw new ApiError(response.status);
  }
}

/**
 * Возвращает текущего пользователя или null, если сессии нет.
 * @returns {Promise<(User|null)>} пользователь или null при любой 4xx
 * @throws {ApiError} при сетевой ошибке или 5xx
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
 * Вход по email или телефону. Cookie сессии ставит бэкенд.
 * @param {{ login: string, password: string }} credentials
 * @returns {Promise<User>} пользователь
 * @throws {ApiError} 401 при неверном логине или пароле, status 0 при сетевой ошибке
 */
export async function login({ login, password }) {
  const response = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });

  assertOk(response);
  return response.json();
}

/**
 * Регистрация. Бэкенд сразу создаёт сессию и ставит cookie,
 * поэтому повторный вызов login() после регистрации не нужен.
 * @param {{ email: string, password: string, first_name: string, nickname: string, phone: string }} data
 * @returns {Promise<User>} созданный пользователь
 * @throws {ApiError}
 */
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

/**
 * Завершает текущую сессию.
 * @returns {Promise<void>}
 * @throws {ApiError} при сетевой ошибке или неуспешном ответе
 */
export async function logout() {
  const response = await request('/logout', { method: 'POST' });

  assertOk(response);
}
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

/**
 * Ошибка обращения к API.
 * `network === true` — запрос не дошёл до сервера (нет сети, сервер недоступен),
 * в этом случае `status` равен 0.
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP-статус ответа или 0 при сетевой ошибке
   * @param {{ network?: boolean }} [options]
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
 * @param {RequestInit} [options]
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
 * @returns {Promise<object | null>}
 * @throws {ApiError}
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
 * @returns {Promise<object>} пользователь
 * @throws {ApiError}
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
 * @returns {Promise<object>} созданный пользователь
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
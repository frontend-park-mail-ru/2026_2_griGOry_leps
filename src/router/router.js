/**
 * @module router/router
 * @description SPA-роутер на History API. Поддерживает защищённые маршруты:
 * гостей с них перенаправляет на `/login` после первичной проверки сессии.
 */

import { getUser } from '../store.js';

/**
 * @typedef {Object} Route
 * @property {function(): void} handler функция, рисующая страницу
 * @property {boolean} isProtected требует ли маршрут авторизации
 */

/**
 * @typedef {Object} RouteOptions
 * @property {boolean} [protected] если true — гостей редиректит на /login
 */

/** @type {Record<string, Route>} */
const routes = {};

/** @type {Promise<void>} */
let authReady = Promise.resolve();

/**
 * Задаёт промис первичной проверки сессии. Защищённые маршруты
 * дожидаются его, прежде чем решать, пускать ли пользователя.
 * @param {Promise<void>} promise
 * @returns {void}
 */
export function setAuthReady(promise) {
  authReady = promise;
}

/**
 * Регистрирует маршрут.
 * @param {string} path путь, например '/about'
 * @param {function(): void} handler функция, рисующая страницу
 * @param {RouteOptions} [options]
 * @returns {void}
 */
export function registerRoute(path, handler, options = {}) {
  routes[path] = {
    handler,
    isProtected: options.protected ?? false,
  };
}

/**
 * Проверяет, попадает ли путь под защищённый маршрут
 * (сам маршрут или любой вложенный путь).
 * @param {string} pathname
 * @returns {boolean}
 */
function isProtectedPath(pathname) {
  return Object.entries(routes).some(([routePath, config]) => {
    if (!config.isProtected) return false;
    const escaped = routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped}(/.*)?$`).test(pathname);
  });
}

/**
 * Переходит на путь, добавляя запись в историю браузера.
 * @param {string} path
 * @returns {void}
 */
export function navigate(path) {
  history.pushState({}, '', path);
  resolveRoute();
}

/**
 * Переходит на путь, заменяя текущую запись в истории
 * (кнопка «Назад» не вернёт на прежний адрес).
 * @param {string} path
 * @returns {void}
 */
export function redirect(path) {
  history.replaceState({}, '', path);
  resolveRoute();
}

/**
 * Находит обработчик для текущего адреса и вызывает его.
 * Для защищённых маршрутов ждёт проверки сессии и при отсутствии
 * пользователя перенаправляет на /login. Неизвестные пути идут на /404.
 * @returns {Promise<void>}
 */
export async function resolveRoute() {
  const path = location.pathname;
  const config = routes[path] ?? routes['/404'];

  if (isProtectedPath(path)) {
    await authReady;
    if (!getUser()) {
      redirect('/login');
      return;
    }
  }

  config?.handler();
}

/**
 * Подписывается на клики по ссылкам `a[data-link]` и на кнопки
 * «Назад»/«Вперёд», затем отрисовывает текущий маршрут.
 * @returns {void}
 */
export function initRouter() {
  document.body.addEventListener('click', (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const link = target.closest('a[data-link]');
    if (link instanceof HTMLAnchorElement) {
      e.preventDefault();
      navigate(link.getAttribute('href') ?? '/');
    }
  });

  window.addEventListener('popstate', resolveRoute);
  resolveRoute();
}
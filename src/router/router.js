import { getUser } from '../store.js';

/** @typedef {() => void} RouteHandler */

/** @type {Record<string, RouteHandler>} */
const routes = {};

// Маршруты, которые требуют авторизации.
const protectedRoutes = ['/favorites', '/profile'];

/**
 * Регистрирует новый маршрут
 * @param {string} path
 * @param {RouteHandler} handler
 */
export function registerRoute(path, handler) {
  routes[path] = handler;
}

/** 
 * Переходит по указанному пути без перезагрузки
 * @param {string} path 
 */
export function navigate(path) {
  history.pushState({}, "", path);
  resolveRoute();
}

/**
 * Определяет текущий маршрут и вызывает его обработчик
 */
export function resolveRoute() {
  const path = location.pathname;
  if (protectedRoutes.includes(path) && !getUser()) {
    console.warn(`[Router] Доступ к ${path} запрещен. Перенаправление на /login`);
    navigate('/login');
    return;
  }
  const handler = routes[path] ?? routes["/404"];
  handler?.();
}

/**
 * Инициализирует роутер: слушает клики по ссылкам и переходы назад/вперед
 */
export function initRouter() {
  document.body.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    const link = target.closest("a[data-link]");
    
    if (link instanceof HTMLAnchorElement) {
      e.preventDefault();
      navigate(link.getAttribute("href") ?? "/");
    }
  });

  window.addEventListener("popstate", resolveRoute);
  resolveRoute();
}
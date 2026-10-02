import { logError } from '@/lib/logger.js';

/** @typedef {(params: Record<string, string>) => void | Promise<void>} RouteHandler */
/** @typedef {{ pattern: RegExp, keys: string[], handler: RouteHandler, requireAuth?: boolean }} Route */

/** @type {Route[]} */
const routes = [];

/** @type {RouteHandler | null} */
let notFoundHandler = null;

/**
 * Проверка «залогинен ли пользователь».
 * Устанавливается через setAuthCheck() из main.js.
 * @type {() => boolean}
 */
let isAuthenticated = () => false;

/**
 * Разрешает или запрещает доступ к защищённым маршрутам.
 * @param {() => boolean} fn
 */
export function setAuthCheck(fn) {
    isAuthenticated = fn;
}

/**
 * Регистрирует маршрут.
 * @param {string} path — например, "/category/:slug"
 * @param {RouteHandler} handler
 * @param {{ requireAuth?: boolean }} [options]
 */
export function registerRoute(path, handler, options = {}) {
    const keys = [];
    const pattern = new RegExp(
        '^' +
            path
                .replace(/\/:([^/]+)/g, (_, key) => {
                    keys.push(key);
                    return '/([^/]+)';
                })
                .replace(/\//g, '\\/') +
            '$'
    );

    routes.push({
        pattern,
        keys,
        handler,
        requireAuth: options.requireAuth === true,
    });
}

/**
 * Обработчик для неизвестных маршрутов.
 * @param {RouteHandler} handler
 */
export function registerNotFound(handler) {
    notFoundHandler = handler;
}

/**
 * Переход на новый URL с записью в историю.
 * @param {string} path
 */
export function navigate(path) {
    history.pushState({}, '', path);
    resolveRoute();
}

/**
 * Переход на новый URL БЕЗ записи в историю.
 * Используется для редиректов (login → /, 404 → /404).
 * @param {string} path
 */
export function redirect(path) {
    history.replaceState({}, '', path);
    resolveRoute();
}

/**
 * Резолвит текущий URL и вызывает нужный обработчик.
 */
export function resolveRoute() {
    const path = location.pathname;

    for (const route of routes) {
        const match = path.match(route.pattern);
        if (!match) continue;

        // Защищённый маршрут и пользователь не залогинен
        if (route.requireAuth && !isAuthenticated()) {
            redirect('/login');
            return;
        }

        const params = {};
        route.keys.forEach((key, i) => {
            params[key] = decodeURIComponent(match[i + 1]);
        });

        Promise.resolve(route.handler(params)).catch((err) => {
                logError('Ошибка роута', path, err);
        });
        return;
    }

    Promise.resolve(notFoundHandler?.()).catch((err) => {
        logError('Ошибка 404-роута', path, err);
    });
}

export function initRouter() {
    document.body.addEventListener('click', (e) => {
        const target = /** @type {HTMLElement} */ (e.target);
        const link = target.closest('a[data-link]');
        if (link instanceof HTMLAnchorElement) {
            e.preventDefault();
            const href = link.getAttribute('href') ?? '/';
            navigate(href);
        }
    });

    window.addEventListener('popstate', resolveRoute);
    resolveRoute();
}

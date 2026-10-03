import { logError } from '@/lib/logger.js';

/** @typedef {(params: Record<string, string>) => void | Promise<void>} RouteHandler */
/** @typedef {{ pattern: RegExp, keys: string[], handler: RouteHandler, requireAuth?: boolean, guestOnly?: boolean }} Route */

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
 * @param {{ requireAuth?: boolean, guestOnly?: boolean }} [options]
 *   requireAuth — только для авторизованных, guestOnly — только для гостей
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
        guestOnly: options.guestOnly === true,
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
    window.scrollTo(0, 0);
    resolveRoute();
}

/**
 * Переход на новый URL БЕЗ записи в историю.
 * Используется для редиректов (login → /, 404 → /404).
 * @param {string} path
 */
export function redirect(path) {
    history.replaceState({}, '', path);
    window.scrollTo(0, 0);
    resolveRoute();
}

/**
 * Куда нужно перенаправить пользователя, если маршрут ему недоступен.
 * @param {Route} route
 * @returns {string | null}
 */
function getGuardRedirect(route) {
    if (route.requireAuth && !isAuthenticated()) return '/login';
    if (route.guestOnly && isAuthenticated()) return '/';
    return null;
}

/**
 * @param {string} path
 * @returns {{ route: Route, match: RegExpMatchArray } | null}
 */
function findRoute(path) {
    for (const route of routes) {
        const match = path.match(route.pattern);
        if (match) return { route, match };
    }
    return null;
}

/**
 * @param {string} path
 */
function renderNotFound(path) {
    Promise.resolve(notFoundHandler?.()).catch((err) => {
        logError('Ошибка 404-роута', path, err);
    });
}

/**
 * Резолвит текущий URL и вызывает нужный обработчик.
 */
export function resolveRoute() {
    const path = location.pathname;
    const found = findRoute(path);

    if (!found) {
        renderNotFound(path);
        return;
    }

    const { route, match } = found;

    const guardRedirect = getGuardRedirect(route);
    if (guardRedirect) {
        redirect(guardRedirect);
        return;
    }

    const params = {};
    try {
        route.keys.forEach((key, i) => {
            params[key] = decodeURIComponent(match[i + 1]);
        });
    } catch {
        // Некорректная последовательность в URL, например /category/asd%
        renderNotFound(path);
        return;
    }

    Promise.resolve(route.handler(params)).catch((err) => {
        logError('Ошибка роута', path, err);
    });
}

/**
 * Повторно проверяет доступ к текущей странице. Вызывается, когда статус
 * авторизации стал известен уже после первого рендера (например, после getMe).
 */
export function recheckGuards() {
    const found = findRoute(location.pathname);
    if (found && getGuardRedirect(found.route)) resolveRoute();
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

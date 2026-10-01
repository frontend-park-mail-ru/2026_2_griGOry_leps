import { logError } from '@/lib/logger.js';

/** @typedef {(params: Record<string, string>) => void | Promise<void>} RouteHandler */
/** @typedef {{ pattern: RegExp, keys: string[], handler: RouteHandler, requireAuth?: boolean }} Route */

/** @type {Route[]} */
const routes = [];

/** @type {RouteHandler | null} */
let notFoundHandler = null;

let isAuthenticated = () => false;

export function setAuthCheck(fn) {
    isAuthenticated = fn;
}

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

export function registerNotFound(handler) {
    notFoundHandler = handler;
}

export function navigate(path) {
    history.pushState({}, '', path);
    resolveRoute();
}

export function redirect(path) {
    history.replaceState({}, '', path);
    resolveRoute();
}

export function resolveRoute() {
    const path = location.pathname;

    for (const route of routes) {
        const match = path.match(route.pattern);
        if (!match) continue;

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

/** @typedef {(params: Record<string, string>) => void | Promise<void>} RouteHandler */

/** @type {{ pattern: RegExp, keys: string[], handler: RouteHandler }[]} */
const routes = [];

let notFoundHandler = null;

export function registerRoute(path, handler) {
    const keys = [];
    const pattern = new RegExp(
        '^' + path
            .replace(/\/:([^/]+)/g, (_, key) => {
                keys.push(key);
                return '/([^/]+)';
            })
            .replace(/\//g, '\\/') + '$'
    );
    routes.push({ pattern, keys, handler });
}

export function registerNotFound(handler) {
    notFoundHandler = handler;
}

export function navigate(path) {
    history.pushState({}, '', path);
    resolveRoute();
}

export function resolveRoute() {
    const path = location.pathname;

    for (const { pattern, keys, handler } of routes) {
        const match = path.match(pattern);
        if (match) {
            const params = {};
            keys.forEach((key, i) => {
                params[key] = decodeURIComponent(match[i + 1]);
            });
            Promise.resolve(handler(params)).catch((err) => {
                console.error('Ошибка роута', path, err);
            });
            return;
        }
    }

    Promise.resolve(notFoundHandler?.()).catch((err) => {
        console.error('Ошибка 404-роута', path, err);
    });
}

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
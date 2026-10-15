import { logError } from '@/lib/logger';

export type RouteParams = Record<string, string>;
export type RouteHandler = (params: RouteParams) => void | Promise<void>;

export interface Route {
    pattern: RegExp;
    keys: string[];
    handler: RouteHandler;
    requireAuth: boolean;
    guestOnly: boolean;
}

export interface RouteOptions {
    requireAuth?: boolean;
    guestOnly?: boolean;
}

const routes: Route[] = [];

let notFoundHandler: RouteHandler | null = null;

/** Задаётся из main.ts через setAuthCheck() */
let isAuthenticated = (): boolean => false;

export function setAuthCheck(fn: () => boolean): void {
    isAuthenticated = fn;
}

/** path вида "/category/:slug", slug придёт в params обработчика */
export function registerRoute(path: string, handler: RouteHandler, options: RouteOptions = {}): void {
    const keys: string[] = [];
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

export function registerNotFound(handler: RouteHandler): void {
    notFoundHandler = handler;
}

export function navigate(path: string): void {
    history.pushState({}, '', path);
    window.scrollTo(0, 0);
    resolveRoute();
}

/** Как navigate, но без записи в историю — для редиректов */
export function redirect(path: string): void {
    history.replaceState({}, '', path);
    window.scrollTo(0, 0);
    resolveRoute();
}

function getGuardRedirect(route: Route): string | null {
    if (route.requireAuth && !isAuthenticated()) return '/login';
    if (route.guestOnly && isAuthenticated()) return '/';
    return null;
}

function findRoute(path: string): { route: Route; match: RegExpMatchArray } | null {
    for (const route of routes) {
        const match = path.match(route.pattern);
        if (match) return { route, match };
    }
    return null;
}

function renderNotFound(path: string): void {
    Promise.resolve(notFoundHandler?.({})).catch((err) => {
        logError('Ошибка 404-роута', path, err);
    });
}

export function resolveRoute(): void {
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

    const params: RouteParams = {};
    try {
        route.keys.forEach((key, i) => {
            params[key] = decodeURIComponent(match[i + 1]);
        });
    } catch {
        renderNotFound(path);
        return;
    }

    Promise.resolve(route.handler(params)).catch((err) => {
        logError('Ошибка роута', path, err);
    });
}

/** Для случая, когда пользователь стал известен уже после первого рендера */
export function recheckGuards(): void {
    const found = findRoute(location.pathname);
    if (found && getGuardRedirect(found.route)) resolveRoute();
}

/** Перехватывает клики по ссылкам с data-link и кнопки браузера «назад/вперёд» */
export function initRouter(): void {
    document.body.addEventListener('click', (e) => {
        if (!(e.target instanceof Element)) return;
        const link = e.target.closest('a[data-link]');
        if (link instanceof HTMLAnchorElement) {
            e.preventDefault();
            const href = link.getAttribute('href') ?? '/';
            navigate(href);
        }
    });

    window.addEventListener('popstate', resolveRoute);
    resolveRoute();
}

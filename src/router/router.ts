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

/** Адрес входа с возвратом на текущую страницу */
export function loginUrl(): string {
    const back = location.pathname + location.search;
    return back === '/' ? '/login' : `/login?next=${encodeURIComponent(back)}`;
}

export function goToLogin(): void {
    navigate(loginUrl());
}

/** Куда вернуться после входа. Принимаем только свои пути, иначе ?next=//evil.com увёл бы на чужой сайт */
export function nextPath(): string {
    const next = new URLSearchParams(location.search).get('next') ?? '';
    return /^\/(?![/\\])/.test(next) ? next : '/';
}

function getGuardRedirect(route: Route): string | null {
    if (route.requireAuth && !isAuthenticated()) return loginUrl();
    if (route.guestOnly && isAuthenticated()) return nextPath();
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
    if (path.length > 1 && path.endsWith('/')) {
        redirect(path.replace(/\/+$/, '') + location.search);
        return;
    }

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

function handleLinkClick(e: MouseEvent): void {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!(e.target instanceof Element)) return;

    const link = e.target.closest('a[data-link]');
    if (!(link instanceof HTMLAnchorElement)) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download')) return;

    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin) return;

    e.preventDefault();
    const path = url.pathname + url.search + url.hash;
    if (path === location.pathname + location.search + location.hash) redirect(path);
    else navigate(path);
}

/** Перехватывает клики по ссылкам с data-link и кнопки браузера «назад/вперёд» */
export function initRouter(): void {
    document.body.addEventListener('click', handleLinkClick);
    window.addEventListener('popstate', resolveRoute);
    resolveRoute();
}

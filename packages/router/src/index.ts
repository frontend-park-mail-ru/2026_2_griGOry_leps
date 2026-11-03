export type RouteParams = Record<string, string>;
export type RouteHandler = (params: RouteParams) => void | Promise<void>;

export interface Route {
    pattern: RegExp;
    keys: string[];
    handler: RouteHandler;
    requireAuth: boolean;
    guestOnly: boolean;
}

export interface ScrollState {
    scrollY: number;
    scrollers: Record<string, number>;
}

export interface RouteOptions {
    requireAuth?: boolean;
    guestOnly?: boolean;
}

export type ErrorHandler = (...args: unknown[]) => void;

const routes: Route[] = [];

let handleError: ErrorHandler = () => {};

let loginPath = '/login';

let notFoundHandler: RouteHandler | null = null;

/** Задаётся через setAuthCheck() */
let isAuthenticated = (): boolean => false;

export function setAuthCheck(fn: () => boolean): void {
    isAuthenticated = fn;
}

export function setErrorHandler(fn: ErrorHandler): void {
    handleError = fn;
}

export function setLoginPath(path: string): void {
    loginPath = path;
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

function scrollElements(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[data-scroll-key]')];
}

function saveScroll(): void {
    const scrollers: Record<string, number> = {};
    scrollElements().forEach((el) => {
        scrollers[el.dataset.scrollKey!] = el.scrollLeft;
    });
    history.replaceState({ ...history.state, scrollY: window.scrollY, scrollers }, '');
}

async function restoreScroll(): Promise<void> {
    const state = history.state as Partial<ScrollState> | null;
    const href = location.href;
    await resolveRoute();
    if (location.href !== href) return;

    window.scrollTo({ top: state?.scrollY ?? 0, behavior: 'instant' });
    const scrollers = state?.scrollers ?? {};
    scrollElements().forEach((el) => {
        const left = scrollers[el.dataset.scrollKey!];
        if (left !== undefined) el.scrollLeft = left;
    });
}

export function navigate(path: string): void {
    saveScroll();
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

export function loginUrl(): string {
    const back = location.pathname + location.search;
    return back === '/' ? loginPath : `${loginPath}?next=${encodeURIComponent(back)}`;
}

export function goToLogin(): void {
    navigate(loginUrl());
}

export function nextPath(): string {
    const next = new URLSearchParams(location.search).get('next') ?? '';
    if (!/^\/(?![/\\])/.test(next)) return '/';
    const url = new URL(next, location.origin);
    return url.origin === location.origin ? url.pathname + url.search + url.hash : '/';
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

function renderNotFound(path: string): Promise<void> {
    return Promise.resolve(notFoundHandler?.({})).catch((err) => {
        handleError('Ошибка 404-роута', path, err);
    });
}

export function resolveRoute(): Promise<void> {
    const path = location.pathname;
    const clean = path.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1');
    if (clean !== path) {
        redirect(clean + location.search);
        return Promise.resolve();
    }

    const found = findRoute(path);

    if (!found) return renderNotFound(path);

    const { route, match } = found;

    const guardRedirect = getGuardRedirect(route);
    if (guardRedirect) {
        redirect(guardRedirect);
        return Promise.resolve();
    }

    const params: RouteParams = {};
    try {
        route.keys.forEach((key, i) => {
            params[key] = decodeURIComponent(match[i + 1]);
        });
    } catch {
        return renderNotFound(path);
    }

    return Promise.resolve(route.handler(params)).catch((err) => {
        handleError('Ошибка роута', path, err);
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
    history.scrollRestoration = 'manual';
    window.addEventListener('popstate', () => void restoreScroll());
    resolveRoute();
}

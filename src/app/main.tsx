import { render } from '@/vdom';
import './styles/style.scss';

import { Header } from '@/components/header/header';
import { Footer } from '@/components/footer/footer';
import { PageError } from '@/components/page-error/page-error';
import { Toast } from '@/components/toast/toast';
import {
    registerRoute,
    registerNotFound,
    setAuthCheck,
    initRouter,
    type RouteParams,
    type RouteOptions,
} from '@/router/router';
import { ApiError } from '@/lib/api';
import { getUser, subscribe } from '@/store';
import { logError, logWarn } from '@/lib/logger';
import { getToast, subscribeToast } from '@/lib/toast';
import { loadCurrentUser } from '@/app/loaders/user';
import { getCartCount, refreshCartCount, subscribeCartCount } from '@/lib/cart';
import type { PageView, Page } from '@/app/page';
import { handleLogout } from '@/app/auth';
import { registerRoutes } from '@/app/routes';

const app = document.getElementById('app')!;

let currentPage: PageView | null = null;
let navigationId = 0;

function toastView() {
    const toast = getToast();
    return toast ? <Toast key={toast.id} type={toast.type} message={toast.message} action={toast.action} /> : null;
}

function renderApp() {
    app.dataset.layout = currentPage?.layout ?? 'main';
    app.dataset.tone = currentPage?.tone ?? 'white';

    const page = currentPage?.view() ?? null;
    if (currentPage && page && typeof page === 'object' && !Array.isArray(page))
        page.key = currentPage.name;

    render(app, [
        <Header user={getUser()} cartCount={getCartCount()} onLogout={handleLogout} />,
        <main id="page">{page}</main>,
        <Footer />,
        toastView(),
    ]);
}

function route<T = undefined>(
    path: string | null,
    { name, layout = 'main', tone = 'white', load, view }: Page<T>,
    options?: RouteOptions,
) {
    const handler = async (params: RouteParams = {}) => {
        const id = ++navigationId;
        const key = [name, ...Object.values(params), location.search].join(':');

        let data = undefined as T;
        try {
            if (load) data = await load(params);
        } catch (err) {
            logError(`Не удалось загрузить страницу ${path ?? '404'}:`, err);
            if (id !== navigationId) return;

            const network = err instanceof ApiError && err.network;

            currentPage = { name: `${key}-error`, layout, tone, view: () => <PageError network={network} onRetry={() => handler(params)} /> };
            renderApp();
            return;
        }
        if (id !== navigationId) return;

        currentPage = { name: key, layout, tone, view: () => view(data, params) };
        renderApp();
    };

    if (path === null) registerNotFound(handler);
    else registerRoute(path, handler, options);
}

async function start() {
    render(app, <div class="app-loader" aria-label="Загрузка" />);

    setAuthCheck(() => getUser() !== null);
    await loadCurrentUser();
    subscribe(renderApp);
    subscribe((user) => void refreshCartCount(Boolean(user)));
    subscribeToast(renderApp);
    subscribeCartCount(renderApp);
    void refreshCartCount(Boolean(getUser()));

    registerRoutes(route);
    initRouter();
}

if (app) void start();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/serv_work.js').catch((error) => {
        logWarn('Не удалось зарегистрировать service worker:', error);
    });
}

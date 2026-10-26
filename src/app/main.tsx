import { render, type Child } from '@/vdom';
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
    navigate,
    type RouteParams,
    type RouteOptions,
} from '@/router/router';
import {
    ApiError, getCategories, getCategoryTree, getListing, getListings, getMe, getPromos, getProducts, logout,
    type AdCard, type Listing, type User,
} from '@/lib/api';
import { getUser, setUser, clearUser, subscribe } from '@/store';
import { logError, logWarn } from '@/lib/logger';
import { getToast, subscribeToast } from '@/lib/toast';

import { HomePage, type HomeData } from '@/pages/home-page/home-page';
import { CategoriesPage } from '@/pages/categories-page/categories-page';
import { CategoryPage } from '@/pages/category-page/category-page';
import { LoginPage } from '@/pages/login-page/login-page';
import { RegisterPage } from '@/pages/register-page/register-page';
import { TermsPage } from '@/pages/terms-page/terms-page';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page';
import { ListingPage } from '@/pages/listing-page/listing-page';
import { ListingFormPage } from '@/pages/listing-form-page/listing-form-page';

export type Layout = 'main' | 'auth';

export type Tone = 'white' | 'gray';

export interface PageView {
    name: string;
    layout: Layout;
    tone: Tone;
    view: () => Child;
}

export interface Page<T> {
    name: string;
    layout?: Layout;
    tone?: Tone;
    load?: (params: RouteParams) => Promise<T>;
    view: (data: T, params: RouteParams) => Child;
}

const app = document.getElementById('app')!;

let currentPage: PageView | null = null;
let navigationId = 0;

function toastView() {
    const toast = getToast();
    return toast ? <Toast key={toast.id} type={toast.type} message={toast.message} /> : null;
}

function renderApp() {
    app.dataset.layout = currentPage?.layout ?? 'main';
    app.dataset.tone = currentPage?.tone ?? 'white';

    const page = currentPage?.view() ?? null;
    if (currentPage && page && typeof page === 'object' && !Array.isArray(page))
        page.key = currentPage.name;

    render(app, [
        <Header user={getUser()} onLogout={handleLogout} />,
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
        const key = [name, ...Object.values(params)].join(':');

        let data = undefined as T;
        try {
            if (load) data = await load(params);
        } catch (err) {
            logError(`Не удалось загрузить страницу ${path ?? '404'}:`, err);
            if (id !== navigationId) return;

            const network = err instanceof ApiError && err.network

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

async function handleLogout(): Promise<void> {
    try {
        await logout();
    } catch (err) {
        logWarn('Не удалось выйти:', err);
        throw err;
    }
    clearUser();
    navigate('/');
}

async function loadCurrentUser(): Promise<User | null> {
    try {
        const user = await getMe();
        if (user) setUser(user);
        return user;
    } catch (err) {
        logWarn('Не удалось получить текущего пользователя:', err);
        return null;
    }
}

async function loadHome(): Promise<HomeData> {
    const [categories, promos, products] = await Promise.all([
        getCategories(),
        getPromos(),
        getProducts(),
    ]);
    return { categories, promos, products };
}

async function loadListing(id: string): Promise<Listing | null> {
    if (!/^\d+$/.test(id)) return null;
    try {
        return await getListing(Number(id));
    } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
    }
}

async function loadSimilar(listing: Listing): Promise<AdCard[]> {
    if (!listing.category || listing.is_owner) return [];
    try {
        const { items } = await getListings({ category_id: listing.category.id, limit: 7 });
        return items.filter((item) => item.id !== listing.id).slice(0, 6);
    } catch (err) {
        logWarn('Не удалось загрузить похожие объявления:', err);
        return [];
    }
}

async function start() {
    render(app, <div class="app-loader" aria-label="Загрузка" />);

    setAuthCheck(() => getUser() !== null);
    await loadCurrentUser();
    subscribe(renderApp);
    subscribeToast(renderApp);

    route('/', {
        name: 'home',
        load: loadHome,
        view: (data) => <HomePage {...data} user={getUser()} />,
    });
    route('/categories', {
        name: 'categories',
        load: async () => ({ categories: await getCategories() }),
        view: ({ categories }) => <CategoriesPage categories={categories} />,
    });
    route('/category/:slug', {
        name: 'category',
        view: (_, { slug }) => <CategoryPage slug={slug} />,
    });
    route('/listing/new', {
        name: 'listing-new',
        tone: 'gray',
        load: async () => ({ categories: await getCategoryTree() }),
        view: ({ categories }) => <ListingFormPage categories={categories} />,
    }, { requireAuth: true });
    route('/listing/:id/edit', {
        name: 'listing-edit',
        tone: 'gray',
        load: async ({ id }) => {
            const [listing, categories] = await Promise.all([loadListing(id), getCategoryTree()]);
            return { listing: listing?.is_owner && listing.status !== 'sold' ? listing : null, categories };
        },
        view: ({ listing, categories }) => (listing
            ? <ListingFormPage listing={listing} categories={categories} />
            : <NotFoundPage />),
    }, { requireAuth: true });
    route('/listing/:id', {
        name: 'listing',
        tone: 'gray',
        load: async ({ id }) => {
            const listing = await loadListing(id);
            return { listing, similar: listing ? await loadSimilar(listing) : [] };
        },
        view: ({ listing, similar }) => (listing
            ? <ListingPage listing={listing} similar={similar} user={getUser()} />
            : <NotFoundPage />),
    });
    route('/login', { name: 'login', layout: 'auth', view: () => <LoginPage /> }, { guestOnly: true });
    route('/register', { name: 'register', layout: 'auth', view: () => <RegisterPage /> }, { guestOnly: true });
    route('/terms', { name: 'terms', view: () => <TermsPage /> });
    route(null, { name: 'not-found', view: () => <NotFoundPage /> });

    initRouter();
}

if (app) void start();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/serv_work.js').catch((error) => {
        logWarn('Не удалось зарегистрировать service worker:', error);
    });
}

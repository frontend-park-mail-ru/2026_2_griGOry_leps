import { render, type Child } from '@/vdom';
import './styles/style.scss';

import { Header } from '@/components/header/header';
import { Footer } from '@/components/footer/footer';
import { PageError } from '@/components/page-error/page-error';
import {
    registerRoute,
    registerNotFound,
    setAuthCheck,
    initRouter,
    navigate,
    type RouteParams,
    type RouteOptions,
} from '@/router/router';
import { getMe, getCategories, getPromos, getProducts, logout, type Profile, type User } from '@/lib/api';
import { getUser, setUser, clearUser, subscribe } from '@/store';
import { logError, logWarn } from '@/lib/logger';

import { HomePage, type HomeData } from '@/pages/home-page/home-page';
import { CategoriesPage } from '@/pages/categories-page/categories-page';
import { CategoryPage } from '@/pages/category-page/category-page';
import { LoginPage } from '@/pages/login-page/login-page';
import { RegisterPage } from '@/pages/register-page/register-page';
import { TermsPage } from '@/pages/terms-page/terms-page';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page';
import { MyListingsPage, type MyListingsTab } from '@/pages/my-listings-page/my-listings-page';
import { ProfileEditPage } from '@/pages/profile-edit-page/profile-edit-page';
import { AddressesPage } from '@/pages/addresses-page/addresses-page';
import { SellerPage, type SellerTab } from '@/pages/seller-page/seller-page';

export type Layout = 'main' | 'auth';

export interface PageView {
    /** При смене name страница создаётся заново, а не сравнивается со старой */
    name: string;
    layout: Layout;
    view: () => Child;
}

export interface Page<T> {
    name: string;
    layout?: Layout;
    /** Грузится до показа страницы; если упадёт, вместо страницы будет PageError */
    load?: (params: RouteParams) => Promise<T>;
    view: (data: T, params: RouteParams) => Child;
}

const app = document.getElementById('app')!;

let currentPage: PageView | null = null;

/** Чтобы медленный ответ старой страницы не перерисовал новую */
let navigationId = 0;

function renderApp() {
    app.dataset.layout = currentPage?.layout ?? 'main';

    const page = currentPage?.view() ?? null;
    if (currentPage && page && typeof page === 'object' && !Array.isArray(page)) page.key = currentPage.name;

    render(app, [
        <Header user={getUser()} onLogout={handleLogout} />,
        <main id="page">{page}</main>,
        <Footer />,
    ]);
}

/** path = null — страница 404 */
function route<T = undefined>(
    path: string | null,
    { name, layout = 'main', load, view }: Page<T>,
    options?: RouteOptions,
) {
    const handler = async (params: RouteParams = {}) => {
        const id = ++navigationId;

        let data = undefined as T;
        try {
            if (load) data = await load(params);
        } catch (err) {
            logError(`Не удалось загрузить страницу ${path ?? '404'}:`, err);
            if (id !== navigationId) return;

            currentPage = { name: `${name}-error`, layout, view: () => <PageError onRetry={() => handler(params)} /> };
            renderApp();
            return;
        }
        if (id !== navigationId) return;

        currentPage = { name, layout, view: () => view(data, params) };
        renderApp();
    };

    if (path === null) registerNotFound(handler);
    else registerRoute(path, handler, options);
}

/** Бросает ошибку дальше: её покажет меню в шапке */
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

/** null для гостя и когда бэк недоступен */
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

async function loadProfile(): Promise<Profile> {
    const profile = await getMe();
    if (!profile) throw new Error('Пользователь не авторизован');
    setUser(profile);
    return profile;
}

function sellerRoute(path: string, tab: SellerTab) {
    route(path, {
        name: 'seller',
        view: (_, { id }) => <SellerPage sellerId={Number(id)} tab={tab} authorized={getUser() !== null} />,
    });
}

function myListingsRoute(path: string, tab: MyListingsTab) {
    route(path, {
        name: 'my-listings',
        load: loadProfile,
        view: (profile) => <MyListingsPage tab={tab} profile={profile} onLogout={handleLogout} />,
    }, { requireAuth: true });
}

async function start() {
    render(app, <div class="app-loader" aria-label="Загрузка" />);

    setAuthCheck(() => getUser() !== null);
    await loadCurrentUser();
    subscribe(renderApp);

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
    route('/login', { name: 'login', layout: 'auth', view: () => <LoginPage /> }, { guestOnly: true });
    route('/register', { name: 'register', layout: 'auth', view: () => <RegisterPage /> }, { guestOnly: true });
    route('/terms', { name: 'terms', view: () => <TermsPage /> });
    myListingsRoute('/profile/listings', 'active');
    myListingsRoute('/profile/listings/closed', 'closed');
    myListingsRoute('/profile/listings/drafts', 'drafts');
    route('/profile/edit', {
        name: 'profile-edit',
        load: loadProfile,
        view: (profile) => <ProfileEditPage profile={profile} onLogout={handleLogout} />,
    }, { requireAuth: true });
    route('/profile/addresses', {
        name: 'profile-addresses',
        load: loadProfile,
        view: (profile) => <AddressesPage profile={profile} onLogout={handleLogout} />,
    }, { requireAuth: true });
    sellerRoute('/seller/:id', 'listings');
    sellerRoute('/seller/:id/reviews', 'reviews');
    route(null, { name: 'not-found', view: () => <NotFoundPage /> });

    initRouter();
}

if (app) void start();

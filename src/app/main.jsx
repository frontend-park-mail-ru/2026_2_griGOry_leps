/**
 * @module app
 * @description Точка входа: проверяет сессию, регистрирует маршруты и рисует приложение через VDOM.
 * Шапка, текущая страница и подвал — одно виртуальное дерево: при смене страницы
 * или пользователя перерисовывается только то, что изменилось.
 */

import { render } from '@/vdom/index.js';
import './styles/style.scss';

import { Header } from '@/components/header/header.jsx';
import { Footer } from '@/components/footer/footer.jsx';
import {
    registerRoute,
    registerNotFound,
    setAuthCheck,
    initRouter,
    navigate,
} from '@/router/router.js';
import { getMe, getCategories, getPromos, getProducts, logout } from '@/lib/api.js';
import { getUser, setUser, clearUser, subscribe } from '@/store.js';
import { logWarn } from '@/lib/logger.js';

import { HomePage } from '@/pages/home-page/home-page.jsx';
import { CategoriesPage } from '@/pages/categories-page/categories-page.jsx';
import { CategoryPage } from '@/pages/category-page/category-page.jsx';
import { LoginPage } from '@/pages/login-page/login-page.jsx';
import { RegisterPage } from '@/pages/register-page/register-page.jsx';
import { TermsPage } from '@/pages/terms-page/terms-page.jsx';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page.jsx';

/**
 * @typedef {Object} PageView
 * @property {string} name Имя маршрута: при его смене страница создаётся заново, а не сравнивается со старой
 * @property {('main'|'auth')} layout auth — без общей шапки и подвала
 * @property {function(): *} view Возвращает разметку страницы
 */

const app = document.getElementById('app');

/** @type {?PageView} */
let currentPage = null;

/** Номер последнего перехода: чтобы медленный ответ старой страницы не перерисовал новую */
let navigationId = 0;

/**
 * Рисует приложение целиком. VDOM сам сравнит с прошлым деревом и обновит только разницу.
 */
function renderApp() {
    app.dataset.layout = currentPage?.layout ?? 'main';

    const page = currentPage?.view() ?? null;
    if (page) page.key = currentPage.name;

    render(app, [
        <Header user={getUser()} onLogout={handleLogout} />,
        <main id="page">{page}</main>,
        <Footer />,
    ]);
}

/**
 * Регистрирует маршрут. Если у страницы есть загрузка данных, старая страница
 * остаётся на экране, пока данные не придут.
 * @param {string} path
 * @param {Object} page
 * @param {string} page.name
 * @param {('main'|'auth')} [page.layout]
 * @param {function(Object<string, string>): Promise<Object>} [page.load] Данные для страницы
 * @param {function(Object, Object<string, string>): *} page.view Разметка: (данные, параметры URL)
 * @param {Object} [options] Опции роутера (guestOnly, requireAuth)
 */
function route(path, { name, layout = 'main', load, view }, options) {
    const handler = async (params = {}) => {
        const id = ++navigationId;
        const data = load ? await load(params) : {};
        if (id !== navigationId) return;

        currentPage = { name, layout, view: () => view(data, params) };
        renderApp();
    };

    if (path === null) registerNotFound(handler);
    else registerRoute(path, handler, options);
}

async function handleLogout() {
    try {
        await logout();
        clearUser();
        navigate('/');
    } catch (err) {
        logWarn('Не удалось выйти:', err);
    }
}

/**
 * @returns {Promise<(module:api~User|null)>} null для гостя или если бэк недоступен
 */
async function loadCurrentUser() {
    try {
        const user = await getMe();
        if (user) setUser(user);
        return user;
    } catch (err) {
        logWarn('Не удалось получить текущего пользователя:', err);
        return null;
    }
}

async function loadHome() {
    const [categories, promos, products] = await Promise.all([
        getCategories(),
        getPromos(),
        getProducts(),
    ]);
    return { categories, promos, products };
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
    route(null, { name: 'not-found', view: () => <NotFoundPage /> });

    initRouter();
}

if (app) void start();

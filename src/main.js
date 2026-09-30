import './styles/style.scss';

import { Header } from '@/components/header/header.js';
import { Footer } from '@/components/footer/footer.js';
import { registerRoute, registerNotFound, setAuthCheck, initRouter } from '@/router/router.js';

import { getMe } from '@/lib/api.js';

import { HomePage } from '@/pages/home-page/home-page.js';
import { CategoriesPage } from '@/pages/categories-page/categories-page.js';
import { CategoryPage } from '@/pages/category-page/category-page.js';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page.js';

const app = document.getElementById('app');

if (app) {
    app.innerHTML = `
        ${Header({ isAuthenticated: false })}
        <main id="page"></main>
        ${Footer()}
    `;

    const page = document.getElementById('page');

    let currentUser = null;

    setAuthCheck(() => currentUser !== null);

    getMe().then((user) => {
        currentUser = user;
    });

    registerRoute('/',               () => HomePage(page));
    registerRoute('/categories',     () => CategoriesPage(page));
    registerRoute('/category/:slug', CategoryPage(page));

    registerRoute('/profile',        () => page.innerHTML = '<h1>Профиль</h1>', { requireAuth: true });
    registerRoute('/create',         () => page.innerHTML = '<h1>Создать</h1>', { requireAuth: true });

    registerNotFound(() => NotFoundPage(page));

    initRouter();
}

import './styles/style.scss';

import { Header } from '@/components/header/header.js';
import { Footer } from '@/components/footer/footer.js';
import { registerRoute, registerNotFound, initRouter } from '@/router/router.js';

import { HomePage } from '@/pages/home-page/home-page.js';
import { CategoriesPage } from '@/pages/categories-page/categories-page.js';
import { CategoryPage } from '@/pages/category-page/category-page.js';

const app = document.getElementById('app');

if (app) {
    app.innerHTML = `
        ${Header({ isAuthenticated: false })}
        <main id="page"></main>
        ${Footer()}
    `;

    const page = document.getElementById('page');

    registerRoute('/',               () => HomePage(page));
    registerRoute('/categories',     () => CategoriesPage(page));
    registerRoute('/category/:slug', CategoryPage(page));

    registerNotFound(() => page.innerHTML = `
        <div class="container" style="padding: 2rem 1.5rem;">
            <h1>404</h1>
            <a href="/" data-link>← На главную</a>
        </div>
    `);

    initRouter();
}

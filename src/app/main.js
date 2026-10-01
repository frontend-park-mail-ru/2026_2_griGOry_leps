import './styles/style.scss';

import { registerRoute, registerNotFound, setAuthReady, initRouter } from '@/router/router.js';
import { getMe } from '@/lib/api.js';
import { setUser } from '@/store.js';
import { logWarn } from '@/lib/logger.js';

import { HomePage } from '@/pages/home-page/home-page.js';
import { CategoriesPage } from '@/pages/categories-page/categories-page.js';
import { CategoryPage } from '@/pages/category-page/category-page.js';
import { NotFoundPage } from '@/pages/not-found-page/not-found-page.js';
import { LoginPage } from '@/pages/login-page/login-page.js';
import { RegisterPage } from '@/pages/register-page/register-page.js';
import { ForgotPasswordPage } from '@/pages/forgot-password-page/forgot-password-page.js';
import { ResetPasswordPage } from '@/pages/reset-password-page/reset-password-page.js';

/**
 * Проверяет сессию при загрузке. Любая ошибка (нет сети, 5xx)
 * трактуется как «пользователь не авторизован»: страница откроется как для гостя.
 * @returns {Promise<void>}
 */
async function initAuth() {
    try {
        const user = await getMe();
        if (user) setUser(user);
    } catch (err) {
        logWarn('Не удалось проверить сессию:', err);
    }
}

const app = document.getElementById('app');

if (app) {
    registerRoute('/', () => HomePage(app));
    registerRoute('/categories', () => CategoriesPage(app));
    registerRoute('/category/:slug', CategoryPage(app));

    registerRoute('/login', () => LoginPage(app));
    registerRoute('/register', () => RegisterPage(app));
    registerRoute('/forgot-password', () => ForgotPasswordPage(app));
    registerRoute('/reset-password', () => ResetPasswordPage(app));

    registerNotFound(() => NotFoundPage(app));

    setAuthReady(initAuth());
    initRouter();
}

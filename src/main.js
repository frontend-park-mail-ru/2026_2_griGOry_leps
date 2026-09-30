import { registerRoute, initRouter, setAuthReady } from './router/router.js';
import { renderHomePage } from './pages/home.js';
import { renderAboutPage } from './pages/about.js';
import { renderLoginPage } from './pages/login/login.js';
import { renderRegisterPage } from './pages/register/register.js';
import { renderForgotPasswordPage } from './pages/forgot-password/forgot-password.js';
import { renderResetPasswordPage } from './pages/reset-password/reset-password.js';
import { getMe } from './api.js';
import { setUser } from './store.js';

const app = document.getElementById('app');

/**
 * Проверяет сессию при загрузке. Любая ошибка (нет сети, 5xx)
 * трактуется как «пользователь не авторизован»: страница откроется как для гостя.
 * @returns {Promise<void>}
 */
async function initAuth() {
  try {
    const user = await getMe();
    if (user) setUser(user);
  } catch {
    // Сессию проверить не удалось — остаёмся гостем.
  }
}

if (app) {
  registerRoute('/', () => renderHomePage(app));
  registerRoute('/about', () => renderAboutPage(app));
  registerRoute('/login', () => renderLoginPage(app));
  registerRoute('/register', () => renderRegisterPage(app));
  registerRoute('/forgot-password', () => renderForgotPasswordPage(app));
  registerRoute('/reset-password', () => renderResetPasswordPage(app));

  registerRoute('/404', () => {
    app.innerHTML = '<p class="page-narrow">Страница не найдена</p>';
  });

  setAuthReady(initAuth());
  initRouter();
}
/**
 * Заглушка главной страницы — реальный контент появится в задачах
 * про регистрацию/авторизацию (GOS-24) и список объявлений (GOS-25).
 * @param {HTMLElement} root
 */
export function renderHomePage(root) {
  root.innerHTML = `
    <div class="page-narrow">
      <h1>GoGET</h1>
      <p>Главная страница. Переход без перезагрузки:</p>
      <a href="/about" data-link>О проекте</a>
      <a href="/login" data-link>Войти</a>
    </div>
  `;
}

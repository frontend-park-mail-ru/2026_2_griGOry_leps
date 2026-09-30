/**
 * Вторая заглушка — нужна только чтобы показать, что роутинг переключает
 * страницы без перезагрузки (адрес меняется, DOM обновляется).
 * @param {HTMLElement} root
 */
export function renderAboutPage(root) {
  root.innerHTML = `
    <div class="page-narrow">
      <h1>О проекте</h1>
      <p>Это вторая страница, адрес сменился без reload.</p>
      <a href="/" data-link>На главную</a>
    </div>
  `;
}

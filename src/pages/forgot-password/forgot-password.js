import { compileTemplate } from '../../core/template.js';
import { navigate } from '../../router/router.js';
import '../../components/auth-layout/auth-layout.js';
import '../../components/auth-card/auth-card.js';
import '../../components/auth-form/auth-form.js';
import { initFormFields } from '../../components/form-field/form-field.js';
import source from './forgot-password.hbs?raw';

const render = compileTemplate(source);

/**
 * Рисует первый шаг восстановления пароля (ввод email). Сейчас это только
 * вёрстка: запрос кода не отправляется, форма ведёт на следующий шаг.
 * @param {HTMLElement} root
 * @returns {void}
 */
export function renderForgotPasswordPage(root) {
  root.innerHTML = render();
  initFormFields(root);

  root.querySelector('#forgot-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    navigate('/reset-password');
  });
}

import { compileTemplate } from '../../core/template.js';
import '../../components/auth-layout/auth-layout.js';
import '../../components/auth-card/auth-card.js';
import '../../components/auth-form/auth-form.js';
import { initFormFields } from '../../components/form-field/form-field.js';
import { getPasswordRules } from '../../components/password-rules/password-rules.js';
import source from './reset-password.hbs?raw';

const render = compileTemplate(source);

// Заглушка до появления бэкенда восстановления: адрес придёт с первого шага.
const DEMO_EMAIL = 'ivan@mail.ru';

/**
 * Рисует второй шаг восстановления пароля (код и новый пароль). Сейчас это
 * только вёрстка: отправка формы и таймер повторной отправки не подключены.
 * @param {HTMLElement} root
 * @returns {void}
 */
export function renderResetPasswordPage(root) {
  root.innerHTML = render({
    subtitle: `Мы отправили код на ${DEMO_EMAIL}`,
    passwordRules: getPasswordRules(),
  });
  initFormFields(root);

  root.querySelector('#reset-form')?.addEventListener('submit', (e) => e.preventDefault());
}

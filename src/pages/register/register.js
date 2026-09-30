import { compileTemplate } from '../../core/template.js';
import '../../components/auth-layout/auth-layout.js';
import '../../components/auth-card/auth-card.js';
import '../../components/auth-form/auth-form.js';
import { getAuthTabs } from '../../components/tabs/tabs.js';
import { initFormFields } from '../../components/form-field/form-field.js';
import { getPasswordRules } from '../../components/password-rules/password-rules.js';
import source from './register.hbs?raw';

const render = compileTemplate(source);

/**
 * Рисует страницу регистрации. Сейчас это только вёрстка: отправка формы
 * и валидация появятся в задаче про регистрацию.
 * @param {HTMLElement} root
 * @returns {void}
 */
export function renderRegisterPage(root) {
  root.innerHTML = render({
    tabs: getAuthTabs('register'),
    passwordRules: getPasswordRules(),
  });
  initFormFields(root);

  root.querySelector('#register-form')?.addEventListener('submit', (e) => e.preventDefault());
}

import { registerComponent } from '../../core/template.js';
import '../password-rules/password-rules.js';
import source from './form-field.hbs?raw';
import './form-field.css';

export const renderFormField = registerComponent('form-field', source);

/**
 * Вешает переключатель «показать/скрыть пароль» на все поля внутри root.
 * @param {ParentNode} root
 * @returns {void}
 */
export function initFormFields(root) {
  root.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = button.closest('.form-field__control')?.querySelector('input');
      if (!input) return;

      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', show ? 'Скрыть пароль' : 'Показать пароль');
    });
  });
}

/**
 * Показывает или очищает ошибку поля `name`.
 * @param {ParentNode} root
 * @param {string} name атрибут name поля
 * @param {string} [message] пустое значение снимает ошибку
 * @returns {void}
 */
export function setFieldError(root, name, message = '') {
  const errorEl = root.querySelector(`[data-error-for="${name}"]`);
  const field = errorEl?.closest('.form-field');
  if (!errorEl || !field) return;

  errorEl.textContent = message;
  field.classList.toggle('form-field--error', Boolean(message));
  field.querySelector('input')?.setAttribute('aria-invalid', String(Boolean(message)));
}

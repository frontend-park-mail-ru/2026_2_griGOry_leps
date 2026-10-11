import template from './form-field.hbs';
import './form-field.scss';

export const FormField = (props) => template(props);

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
 * @param {ParentNode} root
 * @param {string} name
 * @param {string} [message] Текст под полем
 * @param {boolean} [invalid] Подсветить поле; можно без текста, если ошибка показана у соседнего
 */
export function setFieldError(root, name, message = '', invalid = Boolean(message)) {
    const errorEl = root.querySelector(`[data-error-for="${name}"]`);
    const field = errorEl?.closest('.form-field');
    if (!errorEl || !field) return;

    errorEl.textContent = message;
    field.classList.toggle('form-field--error', invalid);
    field.querySelector('input')?.setAttribute('aria-invalid', String(invalid));
}

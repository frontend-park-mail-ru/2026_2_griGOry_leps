import template from './auth-form.hbs';
import './auth-form.scss';

export const AuthForm = (props) => template(props);

/**
 * @param {ParentNode} form
 * @param {string} [message]
 */
export function setFormError(form, message = '') {
    const errorEl = form.querySelector('[data-form-error]');
    if (errorEl) errorEl.textContent = message;
}

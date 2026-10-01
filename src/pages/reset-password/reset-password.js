import template from './reset-password.hbs';
import './reset-password.scss';

import { FormField, initFormFields } from '@/components/form-field/form-field.js';
import { PasswordRules, getPasswordRules } from '@/components/password-rules/password-rules.js';

const DEMO_EMAIL = 'ivan@mail.ru';

export const ResetPasswordPage = (root) => {
    const rulesHtml = PasswordRules({ rules: getPasswordRules() });

    const fieldsHtml = [
        FormField({
            id: 'code-input',
            name: 'code',
            label: 'Код из письма',
            placeholder: '6 цифр',
            autocomplete: 'one-time-code',
            inputmode: 'numeric',
        }),
        FormField({
            id: 'password-input',
            name: 'password',
            label: 'Новый пароль',
            placeholder: 'Придумайте пароль',
            autocomplete: 'new-password',
            password: true,
            rulesHtml,
        }),
        FormField({
            id: 'password-repeat-input',
            name: 'passwordRepeat',
            label: 'Повторите пароль',
            placeholder: 'Ещё раз пароль',
            autocomplete: 'new-password',
            password: true,
        }),
    ].join('');

    root.innerHTML = template({
        email: DEMO_EMAIL,
        fieldsHtml,
    });

    initFormFields(root);

    root.querySelector('#reset-form')?.addEventListener('submit', (e) => e.preventDefault());
};

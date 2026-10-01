import template from './forgot-password.hbs';
import './forgot-password.scss';

import { FormField, initFormFields } from '@/components/form-field/form-field.js';
import { navigate } from '@/router/router.js';

export const ForgotPasswordPage = (root) => {
    root.innerHTML = template({
        fieldsHtml: FormField({
            id: 'email-input',
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'name@mail.ru',
            autocomplete: 'email',
        }),
    });

    initFormFields(root);

    root.querySelector('#forgot-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        navigate('/reset-password');
    });
};

import template from './register.hbs';
import './register.scss';

import { Tabs, getAuthTabs } from '@/components/tabs/tabs.js';
import { FormField, initFormFields } from '@/components/form-field/form-field.js';
import { PasswordRules, getPasswordRules } from '@/components/password-rules/password-rules.js';

export const RegisterPage = (root) => {
    const rulesHtml = PasswordRules({ rules: getPasswordRules() });

    const fieldsHtml = [
        FormField({ id: 'name-input', name: 'name', label: 'Имя', placeholder: 'Как к вам обращаться', autocomplete: 'given-name', hint: 'Видно только вам — в профиле' }),
        FormField({ id: 'nickname-input', name: 'nickname', label: 'Никнейм', placeholder: 'Например, ivan_bike', autocomplete: 'nickname', hint: 'Его увидят покупатели и продавцы' }),
        FormField({ id: 'phone-input', name: 'phone', label: 'Телефон', type: 'tel', placeholder: '+7 900 000-00-00', autocomplete: 'tel', hint: 'Покупатели смогут вам позвонить' }),
        FormField({ id: 'email-input', name: 'email', label: 'Email', type: 'email', placeholder: 'name@mail.ru', autocomplete: 'email', hint: 'Для связи, если скроете телефон' }),
        FormField({ id: 'password-input', name: 'password', label: 'Пароль', placeholder: 'Придумайте пароль', autocomplete: 'new-password', password: true, rulesHtml }),
        FormField({ id: 'password-repeat-input', name: 'passwordRepeat', label: 'Повторите пароль', placeholder: 'Ещё раз пароль', autocomplete: 'new-password', password: true }),
    ].join('');

    root.innerHTML = template({
        tabsHtml: Tabs({ items: getAuthTabs('register') }),
        fieldsHtml,
    });

    initFormFields(root);

    root.querySelector('#register-form')?.addEventListener('submit', (e) => e.preventDefault());
};

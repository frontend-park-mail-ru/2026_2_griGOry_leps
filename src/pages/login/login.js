import template from './login.hbs';
import './login.scss';

import { Tabs, getAuthTabs } from '@/components/tabs/tabs.js';
import { FormField, initFormFields, setFieldError } from '@/components/form-field/form-field.js';

import { login } from '@/lib/api.js';
import { setUser } from '@/store.js';
import { redirect } from '@/router/router.js';
import { logWarn } from '@/lib/logger.js';

export const LoginPage = (root) => {
    const fieldsHtml = [
        FormField({
            id: 'login-input',
            name: 'login',
            label: 'Телефон или email',
            placeholder: '+7 900 000-00-00',
            autocomplete: 'username',
        }),
        FormField({
            id: 'password-input',
            name: 'password',
            label: 'Пароль',
            placeholder: 'Введите пароль',
            autocomplete: 'current-password',
            password: true,
        }),
    ].join('');

    root.innerHTML = template({
        tabsHtml: Tabs({ items: getAuthTabs('login') }),
        fieldsHtml,
    });

    initFormFields(root);

    const form = root.querySelector('#login-form');
    const formError = root.querySelector('#form-error');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        formError.textContent = '';
        setFieldError(form, 'login', '');
        setFieldError(form, 'password', '');

        const data = new FormData(form);
        const loginValue = String(data.get('login') ?? '').trim();
        const password = String(data.get('password') ?? '');

        if (!loginValue) {
            setFieldError(form, 'login', 'Введите телефон или email');
            return;
        }
        if (!password) {
            setFieldError(form, 'password', 'Введите пароль');
            return;
        }

        submitButton.disabled = true;
        try {
            const user = await login({ login: loginValue, password });
            setUser(user);
            redirect('/');
        } catch (err) {
            logWarn('login error', err);
            formError.textContent = err?.status === 401
                ? 'Неверный логин или пароль'
                : 'Не удалось войти. Попробуйте ещё раз';
        } finally {
            submitButton.disabled = false;
        }
    });
};

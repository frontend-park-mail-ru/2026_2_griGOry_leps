import template from './login-page.hbs';
import './login-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header.js';
import { AuthCard } from '@/components/auth-card/auth-card.js';
import { AuthForm, setFormError } from '@/components/auth-form/auth-form.js';
import { Button } from '@/components/button/button.js';
import { FormField, initFormFields, setFieldError } from '@/components/form-field/form-field.js';
import { FormNote } from '@/components/form-note/form-note.js';
import { Tabs, getAuthTabs } from '@/components/tabs/tabs.js';

import { login } from '@/lib/api.js';
import { bindLiveValidation, showApiError } from '@/lib/form.js';
import { normalizeLogin, validateLogin, validateLoginPassword } from '@/lib/validators.js';
import { redirect } from '@/router/router.js';
import { setUser } from '@/store.js';

const FORM_ID = 'login-form';

export const LoginPage = (root) => {
    const fieldsHtml = [
        FormField({
            id: 'login-input',
            name: 'login',
            label: 'Телефон или email',
            placeholder: '+79000000000 или name@mail.ru',
            autocomplete: 'username',
        }),
        FormField({
            id: 'login-password-input',
            name: 'password',
            label: 'Пароль',
            placeholder: 'Введите пароль',
            autocomplete: 'current-password',
            password: true,
        }),
    ].join('');

    const cardHtml = AuthCard({
        title: 'Вход в GoGET',
        subtitle: 'Войдите, чтобы размещать объявления и писать продавцам',
        tabsHtml: Tabs({ items: getAuthTabs('login') }),
        contentHtml: AuthForm({
            id: FORM_ID,
            fieldsHtml,
            buttonHtml: Button({ type: 'submit', text: 'Войти', block: true }),
            noteHtml: FormNote({
                text: 'Нет аккаунта?',
                linkHref: '/register',
                linkText: 'Зарегистрироваться',
            }),
        }),
    });

    root.innerHTML = template({ headerHtml: AuthHeader(), cardHtml });

    initFormFields(root);

    const form = root.querySelector(`#${FORM_ID}`);
    const submitButton = form.querySelector('button[type="submit"]');

    let typedLogin = '';
    let shownLogin = '';

    const sanitizeLogin = (value) => {
        typedLogin = shownLogin && value.startsWith(shownLogin)
            ? typedLogin + value.slice(shownLogin.length)
            : value;
        shownLogin = normalizeLogin(typedLogin);
        return shownLogin;
    };

    const validation = bindLiveValidation(form, {
        login: {
            validate: validateLogin,
            sanitize: sanitizeLogin,
            normalize: normalizeLogin,
            required: 'Введите телефон или email',
        },
        password: { validate: validateLoginPassword, required: 'Введите пароль' },
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setFormError(form);

        const values = validation.validateAll();
        if (!values) return;

        submitButton.disabled = true;
        try {
            const user = await login({
                login: values.login.trim(),
                password: values.password,
            });
            setUser(user);
            redirect('/');
        } catch (err) {
            if (err?.status === 401) {
                setFieldError(form, 'password', 'Неверный логин или пароль');
                return;
            }

            showApiError(form, err, {
                fallback: 'Не удалось войти. Попробуйте ещё раз',
            });
        } finally {
            submitButton.disabled = false;
        }
    });
};

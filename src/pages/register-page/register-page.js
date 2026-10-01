import template from './register-page.hbs';
import './register-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header.js';
import { AuthCard } from '@/components/auth-card/auth-card.js';
import { AuthForm, setFormError } from '@/components/auth-form/auth-form.js';
import { Button } from '@/components/button/button.js';
import { FormField, initFormFields } from '@/components/form-field/form-field.js';
import { FormNote } from '@/components/form-note/form-note.js';
import { PasswordRules, updatePasswordRules } from '@/components/password-rules/password-rules.js';
import { Tabs, getAuthTabs } from '@/components/tabs/tabs.js';

import { register } from '@/lib/api.js';
import { bindLiveValidation, showApiError } from '@/lib/form.js';
import {
    checkPasswordRules,
    sanitizePhone,
    validateEmail,
    validateName,
    validateNickname,
    validatePassword,
    validatePasswordRepeat,
    validatePhone,
} from '@/lib/validators.js';
import { redirect } from '@/router/router.js';
import { setUser } from '@/store.js';

const FORM_ID = 'register-form';

export const RegisterPage = (root) => {
    const fieldsHtml = [
        FormField({
            id: 'first-name-input',
            name: 'first_name',
            label: 'Имя',
            placeholder: 'Как к вам обращаться',
            autocomplete: 'given-name',
            hint: 'Видно только вам — в профиле',
        }),
        FormField({
            id: 'nickname-input',
            name: 'nickname',
            label: 'Никнейм',
            placeholder: 'Например, ivan_bike',
            autocomplete: 'nickname',
            hint: 'Его увидят покупатели и продавцы',
        }),
        FormField({
            id: 'phone-input',
            name: 'phone',
            label: 'Телефон',
            type: 'tel',
            placeholder: '+79000000000',
            autocomplete: 'tel',
            inputmode: 'tel',
            hint: 'Покупатели смогут вам позвонить',
        }),
        FormField({
            id: 'email-input',
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'name@mail.ru',
            autocomplete: 'email',
            hint: 'Для связи, если скроете телефон',
        }),
        FormField({
            id: 'password-input',
            name: 'password',
            label: 'Пароль',
            placeholder: 'Придумайте пароль',
            autocomplete: 'new-password',
            password: true,
            rulesHtml: PasswordRules(),
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

    const cardHtml = AuthCard({
        title: 'Регистрация в GoGET',
        subtitle: 'Создайте аккаунт — это займёт меньше минуты',
        tabsHtml: Tabs({ items: getAuthTabs('register') }),
        contentHtml: AuthForm({
            id: FORM_ID,
            fieldsHtml,
            buttonHtml: Button({ type: 'submit', text: 'Зарегистрироваться', block: true }),
            noteHtml: FormNote({
                text: 'Нажимая «Зарегистрироваться», вы соглашаетесь с',
                linkHref: '/terms',
                linkText: 'условиями использования',
            }),
        }),
    });

    root.innerHTML = template({ headerHtml: AuthHeader(), cardHtml });

    initFormFields(root);

    const form = root.querySelector(`#${FORM_ID}`);
    const submitButton = form.querySelector('button[type="submit"]');

    // Выполненные требования подсвечиваются зелёным сразу при вводе,
    // невыполненные краснеют, как только в поле что-то введено.
    const renderPasswordRules = ({ password = '' }) => {
        const states = checkPasswordRules(password).map((isMet) => {
            if (isMet) return 'ok';
            return password ? 'fail' : 'neutral';
        });
        updatePasswordRules(form, states);
    };

    const validation = bindLiveValidation(
        form,
        {
            first_name: { validate: validateName },
            nickname: { validate: validateNickname },
            phone: { validate: validatePhone, sanitize: sanitizePhone },
            email: { validate: validateEmail },
            password: { validate: validatePassword },
            passwordRepeat: {
                validate: (value, values) => validatePasswordRepeat(value, values.password ?? ''),
            },
        },
        renderPasswordRules,
    );

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setFormError(form);

        const values = validation.validateAll();
        if (!values) return;

        submitButton.disabled = true;
        try {
            const user = await register({
                first_name: values.first_name.trim(),
                nickname: values.nickname,
                phone: values.phone,
                email: values.email.trim(),
                password: values.password,
            });
            setUser(user);
            redirect('/');
        } catch (err) {
            showApiError(form, err, {
                fallback: 'Не удалось зарегистрироваться. Попробуйте ещё раз',
                byStatus: { 409: 'Пользователь с такими данными уже существует' },
            });
        } finally {
            submitButton.disabled = false;
        }
    });
};

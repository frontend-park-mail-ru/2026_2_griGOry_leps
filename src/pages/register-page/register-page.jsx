import { Component } from '@/vdom/index.js';
import './register-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header.jsx';
import { AuthCard } from '@/components/auth-card/auth-card.jsx';
import { AuthForm } from '@/components/auth-form/auth-form.jsx';
import { Button } from '@/components/button/button.jsx';
import { FormField } from '@/components/form-field/form-field.jsx';
import { FormNote } from '@/components/form-note/form-note.jsx';
import { PasswordRules } from '@/components/password-rules/password-rules.jsx';
import { Tabs, getAuthTabs } from '@/components/tabs/tabs.jsx';

import { register } from '@/lib/api.js';
import { FormValidation, describeApiError } from '@/lib/form.js';
import {
    checkPasswordRules,
    sanitizePhone,
    validateEmail,
    validateName,
    validatePassword,
    validatePasswordRepeat,
    validatePhone,
} from '@/lib/validators.js';
import { redirect } from '@/router/router.js';
import { setUser } from '@/store.js';

const RULES = {
    first_name: { validate: validateName, required: 'Введите имя' },
    phone: { validate: validatePhone, sanitize: sanitizePhone, required: 'Введите телефон' },
    email: { validate: validateEmail, required: 'Введите email' },
    password: { validate: validatePassword, required: 'Введите пароль' },
    passwordRepeat: {
        required: 'Повторите пароль',
        validate: (value, values) => validatePasswordRepeat(value, values.password ?? ''),
    },
};

/**
 * Состояния требований к паролю. Обновляются сразу при вводе, без паузы.
 * @param {string} password
 * @returns {Array<'ok' | 'fail' | 'neutral'>}
 */
function getPasswordRuleStates(password) {
    return checkPasswordRules(password).map((isMet) => {
        if (isMet) return 'ok';
        return password ? 'fail' : 'neutral';
    });
}

/** Страница регистрации. */
export class RegisterPage extends Component {
    constructor(props) {
        super(props);

        this.validation = new FormValidation(RULES, () => this.syncValidation());
        this.state = {
            values: { ...this.validation.values },
            errors: {},
            formError: '',
            submitting: false,
        };
    }

    componentWillUnmount() {
        this.validation.destroy();
    }

    syncValidation() {
        this.setState({
            values: { ...this.validation.values },
            errors: { ...this.validation.errors },
        });
    }

    handleInput = (e) => {
        this.validation.input(e.target.name, e.target.value);
    };

    handleChange = (e) => {
        this.validation.change(e.target.name);
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        this.setState({ formError: '' });

        const values = this.validation.validateAll();
        if (!values) return;

        this.setState({ submitting: true });
        try {
            const user = await register({
                first_name: values.first_name.trim().replace(/ {2,}/g, ' '),
                phone: values.phone,
                email: values.email.trim(),
                password: values.password,
            });
            setUser(user);
            redirect('/');
        } catch (err) {
            const { field, message } = describeApiError(err, {
                fields: Object.keys(RULES),
                fallback: 'Не удалось зарегистрироваться. Попробуйте ещё раз',
                conflictMessages: {
                    email: 'Пользователь с таким Email уже существует',
                    phone: 'Этот номер уже зарегистрирован. Войдите или восстановите пароль',
                },
                byStatus: { 409: 'Пользователь с такими данными уже существует' },
            });
            if (field) this.validation.setError(field, message);
            else this.setState({ formError: message });
        } finally {
            this.setState({ submitting: false });
        }
    };

    /**
     * Общие пропсы поля: значение, ошибка и обработчики.
     * @param {string} name
     */
    fieldProps(name) {
        return {
            name,
            value: this.state.values[name],
            error: this.state.errors[name],
            onInput: this.handleInput,
            onChange: this.handleChange,
        };
    }

    render() {
        const { values, errors, formError, submitting } = this.state;
        // Пароли не совпали: текст ошибки под «Повторите пароль», а красная рамка у обоих полей
        const passwordMismatch = Boolean(errors.passwordRepeat) && Boolean(values.passwordRepeat);

        return (
            <div class="register-page">
                <AuthHeader />
                <div class="register-page__content">
                    <AuthCard title="Регистрация в GoGET" subtitle="Создайте аккаунт — это займёт меньше минуты">
                        <Tabs items={getAuthTabs('register')} />
                        <AuthForm
                            id="register-form"
                            error={formError}
                            onSubmit={this.handleSubmit}
                            footer={[
                                <Button type="submit" text="Зарегистрироваться" block disabled={submitting} />,
                                <FormNote
                                    text="Нажимая «Зарегистрироваться», вы соглашаетесь с"
                                    linkHref="/terms"
                                    linkText="условиями использования"
                                />,
                            ]}
                        >
                            <FormField
                                {...this.fieldProps('first_name')}
                                id="first-name-input"
                                label="Имя или никнейм"
                                placeholder="Например, Иван"
                                autocomplete="given-name"
                                hint="Его увидят покупатели и продавцы"
                            />
                            <FormField
                                {...this.fieldProps('phone')}
                                id="phone-input"
                                label="Телефон"
                                type="tel"
                                placeholder="+7 900 000-00-00"
                                autocomplete="tel"
                                inputmode="tel"
                                hint="Покупатели смогут вам позвонить"
                            />
                            <FormField
                                {...this.fieldProps('email')}
                                id="email-input"
                                label="Email"
                                type="email"
                                placeholder="name@mail.ru"
                                autocomplete="email"
                                hint="Для входа в аккаунт и связи с вами"
                            />
                            <FormField
                                {...this.fieldProps('password')}
                                id="password-input"
                                label="Пароль"
                                placeholder="Придумайте пароль"
                                autocomplete="new-password"
                                password
                                invalid={passwordMismatch}
                            >
                                <PasswordRules states={getPasswordRuleStates(values.password)} />
                            </FormField>
                            <FormField
                                {...this.fieldProps('passwordRepeat')}
                                id="password-repeat-input"
                                label="Повторите пароль"
                                placeholder="Ещё раз пароль"
                                autocomplete="new-password"
                                password
                            />
                        </AuthForm>
                    </AuthCard>
                </div>
            </div>
        );
    }
}

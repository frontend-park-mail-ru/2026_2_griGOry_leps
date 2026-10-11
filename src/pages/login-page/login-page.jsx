import { Component } from '@/vdom/index.js';
import './login-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header.jsx';
import { AuthCard } from '@/components/auth-card/auth-card.jsx';
import { AuthForm } from '@/components/auth-form/auth-form.jsx';
import { Button } from '@/components/button/button.jsx';
import { FormField } from '@/components/form-field/form-field.jsx';
import { FormNote } from '@/components/form-note/form-note.jsx';
import { Tabs, getAuthTabs } from '@/components/tabs/tabs.jsx';

import { login } from '@/lib/api.js';
import { FormValidation, describeApiError } from '@/lib/form.js';
import { normalizeLogin, validateLogin, validateLoginPassword } from '@/lib/validators.js';
import { redirect } from '@/router/router.js';
import { setUser } from '@/store.js';

/** Страница входа по телефону или email. */
export class LoginPage extends Component {
    constructor(props) {
        super(props);

        // То, что пользователь напечатал, и то, что показано в поле после форматирования телефона
        this.typedLogin = '';
        this.shownLogin = '';

        this.validation = new FormValidation({
            login: {
                validate: validateLogin,
                sanitize: (value) => this.sanitizeLogin(value),
                normalize: normalizeLogin,
                required: 'Введите телефон или email',
            },
            password: { validate: validateLoginPassword, required: 'Введите пароль' },
        }, () => this.syncValidation());

        this.state = {
            values: { ...this.validation.values },
            errors: {},
            // «Неверный логин или пароль»: текст под паролем, а рамка красная у обоих полей
            loginHighlighted: false,
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

    /**
     * @param {string} value
     * @returns {string}
     */
    sanitizeLogin(value) {
        this.typedLogin = this.shownLogin && value.startsWith(this.shownLogin)
            ? this.typedLogin + value.slice(this.shownLogin.length)
            : value;
        this.shownLogin = normalizeLogin(this.typedLogin);
        return this.shownLogin;
    }

    handleInput = (e) => {
        if (this.state.loginHighlighted) this.setState({ loginHighlighted: false });
        this.validation.input(e.target.name, e.target.value);
    };

    handleChange = (e) => {
        this.validation.change(e.target.name);
    };

    handleSubmit = async (e) => {
        e.preventDefault();
        this.setState({ formError: '', loginHighlighted: false });

        const values = this.validation.validateAll();
        if (!values) return;

        this.setState({ submitting: true });
        try {
            const user = await login({
                login: values.login.trim(),
                password: values.password,
            });
            setUser(user);
            redirect('/');
        } catch (err) {
            if (err?.status === 401) {
                this.setState({ loginHighlighted: true });
                this.validation.setError('password', 'Неверный логин или пароль');
                return;
            }

            const { field, message } = describeApiError(err, {
                fields: ['login', 'password'],
                fallback: 'Не удалось войти. Попробуйте ещё раз',
            });
            if (field) this.validation.setError(field, message);
            else this.setState({ formError: message });
        } finally {
            this.setState({ submitting: false });
        }
    };

    render() {
        const { values, errors, loginHighlighted, formError, submitting } = this.state;

        return (
            <div class="login-page">
                <AuthHeader />
                <div class="login-page__content">
                    <AuthCard
                        title="Вход в GoGET"
                        subtitle="Войдите, чтобы размещать объявления и писать продавцам"
                    >
                        <Tabs items={getAuthTabs('login')} />
                        <AuthForm
                            id="login-form"
                            error={formError}
                            onSubmit={this.handleSubmit}
                            footer={[
                                <Button type="submit" text="Войти" block disabled={submitting} />,
                                <FormNote text="Нет аккаунта?" linkHref="/register" linkText="Зарегистрироваться" />,
                            ]}
                        >
                            <FormField
                                id="login-input"
                                name="login"
                                label="Телефон или email"
                                placeholder="+7 900 000-00-00 или name@mail.ru"
                                autocomplete="username"
                                value={values.login}
                                error={errors.login}
                                invalid={loginHighlighted}
                                onInput={this.handleInput}
                                onChange={this.handleChange}
                            />
                            <FormField
                                id="login-password-input"
                                name="password"
                                label="Пароль"
                                placeholder="Введите пароль"
                                autocomplete="current-password"
                                password
                                value={values.password}
                                error={errors.password}
                                onInput={this.handleInput}
                                onChange={this.handleChange}
                            />
                        </AuthForm>
                    </AuthCard>
                </div>
            </div>
        );
    }
}

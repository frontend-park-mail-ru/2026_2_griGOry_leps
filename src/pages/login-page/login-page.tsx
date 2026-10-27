import { Component } from '@/vdom';
import './login-page.scss';

import { AuthHeader } from '@/components/auth-header/auth-header';
import { AuthCard } from '@/components/auth-card/auth-card';
import { AuthForm } from '@/components/auth-form/auth-form';
import { Button } from '@/components/button/button';
import { FormField } from '@/components/form-field/form-field';
import { FormNote } from '@/components/form-note/form-note';
import { Tabs, getAuthTabs } from '@/components/tabs/tabs';

import { ApiError, login } from '@/lib/api';
import { FormValidation, describeApiError, type FormValues } from '@/lib/form';
import { normalizeLogin, validateLogin, validateLoginPassword } from '@/lib/validators';
import { redirect } from '@/router/router';
import { setUser } from '@/store';

export interface LoginState {
    values: FormValues;
    errors: FormValues;
    /** При 401 текст под паролем, а красная рамка у обоих полей */
    loginHighlighted: boolean;
    formError: string;
    networkError: string;
    submitting: boolean;
}

export class LoginPage extends Component<object, LoginState> {
    // Напечатанное и показанное после форматирования телефона расходятся, храним оба
    typedLogin = '';
    shownLogin = '';
    validation: FormValidation;

    constructor(props: object) {
        super(props);

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
            loginHighlighted: false,
            formError: '',
            networkError: '',
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

    sanitizeLogin(value: string): string {
        this.typedLogin = this.shownLogin && value.startsWith(this.shownLogin)
            ? this.typedLogin + value.slice(this.shownLogin.length)
            : value;
        this.shownLogin = normalizeLogin(this.typedLogin);
        return this.shownLogin;
    }

    handleInput = (e: Event) => {
        const input = e.target as HTMLInputElement;
        if (this.state.loginHighlighted) this.setState({ loginHighlighted: false });
        this.validation.input(input.name, input.value);
    };

    handleChange = (e: Event) => {
        this.validation.change((e.target as HTMLInputElement).name);
    };

    handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        this.setState({ formError: '', networkError: '', loginHighlighted: false });

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
            if (err instanceof ApiError && err.status === 401) {
                this.setState({ loginHighlighted: true });
                this.validation.setError('password', 'Неверный логин или пароль');
                return;
            }

            const { field, message } = describeApiError(err, {
                fields: ['login', 'password'],
                fallback: 'Не удалось войти. Попробуйте ещё раз',
            });
            if (field) this.validation.setError(field, message);
            else if (err instanceof ApiError && err.network) this.setState({ networkError: message });
            else this.setState({ formError: message });
        } finally {
            this.setState({ submitting: false });
        }
    };

    render() {
        const { values, errors, loginHighlighted, formError, networkError, submitting } = this.state;

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
                                <p class="auth-form__error" role="alert">{networkError || null}</p>,
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
                            <a href="/forgot-password" data-link class="login-page__forgot">Забыли пароль?</a>
                        </AuthForm>
                    </AuthCard>
                </div>
            </div>
        );
    }
}
